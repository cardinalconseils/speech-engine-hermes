import OpenAI from "openai";
import type { AppConfig } from "./config.js";

export interface ChatParams {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  model?: string;
  signal?: AbortSignal;
}

export interface StreamCallbacks {
  onToken: (content: string) => void;
  onDone: (usage?: { prompt_tokens: number; completion_tokens: number }) => void;
  onError: (error: OpenRouterError) => void;
}

export interface OpenRouterError {
  code: string;
  message: string;
  retryAfterMs?: number;
  status?: number;
}

export class OpenRouterClient {
  private client: OpenAI;
  private defaultModel: string;

  constructor(config: AppConfig) {
    this.client = new OpenAI({
      apiKey: config.openrouter.apiKey,
      baseURL: config.openrouter.baseUrl,
    });
    this.defaultModel = config.defaultModel;
  }

  /** Stream a chat completion, calling onToken/onDone/onError */
  async streamChat(params: ChatParams, callbacks: StreamCallbacks): Promise<void> {
    try {
      const stream = await this.client.chat.completions.create(
        {
          model: params.model || this.defaultModel,
          messages: params.messages,
          stream: true,
        },
        {
          signal: params.signal,
        }
      );

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          callbacks.onToken(content);
        }

        // Capture usage from final chunk
        const usage = chunk.usage;
        if (usage) {
          callbacks.onDone({
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
          });
        }
      }

      // If no usage was reported in stream, signal done without usage
      callbacks.onDone();
    } catch (err: unknown) {
      callbacks.onError(normalizeError(err));
    }
  }

  /**
   * Start a streaming chat and return an abort controller.
   * The caller can call controller.abort() to cancel mid-stream.
   */
  streamChatWithAbort(
    params: ChatParams,
    callbacks: StreamCallbacks
  ): AbortController {
    const controller = new AbortController();
    const signal = controller.signal;

    // Merge the caller's signal if provided
    const mergedSignal = params.signal
      ? anySignal([params.signal, signal])
      : signal;

    this.streamChat({ ...params, signal: mergedSignal }, callbacks).catch(() => {
      // Already handled by onError callback
    });

    return controller;
  }
}

/** Normalize any error into a structured OpenRouterError */
function normalizeError(err: unknown): OpenRouterError {
  if (err instanceof OpenAI.APIError) {
    const retryAfterHeader = err.headers?.["retry-after"];
    const retryAfterMs = retryAfterHeader ? parseInt(retryAfterHeader, 10) * 1000 : undefined;

    if (err.status === 429) {
      const err429: OpenRouterError = {
        code: "rate_limited",
        message: "OpenRouter rate limit exceeded. Please retry.",
        status: 429,
      };
      if (retryAfterMs !== undefined) err429.retryAfterMs = retryAfterMs;
      return err429;
    }

    if (err.status === 401 || err.status === 403) {
      return {
        code: "auth_error",
        message: "Authentication failed. Check your API key.",
        status: err.status,
      };
    }

    return {
      code: "api_error",
      message: err.message || "OpenRouter API error",
      status: err.status || undefined,
    };
  }

  if (err instanceof Error) {
    // Check for abort
    if (err.name === "AbortError" || err.message.includes("abort")) {
      return {
        code: "aborted",
        message: "Request was cancelled",
      };
    }

    return {
      code: "internal_error",
      message: err.message,
    };
  }

  return {
    code: "unknown_error",
    message: "An unknown error occurred",
  };
}

/** Simple Promise.race-like signal merger */
function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener("abort", () => controller.abort(signal.reason), {
      once: true,
    });
  }
  return controller.signal;
}