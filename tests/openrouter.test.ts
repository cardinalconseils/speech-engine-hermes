import { describe, it, expect, vi, beforeEach } from "vitest";
import { OpenRouterClient } from "../src/openrouter.js";
import type { AppConfig } from "../src/config.js";

function createMockConfig(): AppConfig {
  return {
    openrouter: {
      apiKey: "sk-or-v1-test",
      baseUrl: "https://openrouter.ai/api/v1",
    },
    defaultModel: "openai/gpt-4.1-nano",
    ws: { port: 3001, host: "localhost" },
    originWhitelist: ["http://localhost:3000"],
    heartbeatIntervalMs: 30000,
    maxSessionMessages: 100,
  };
}

describe("OpenRouterClient", () => {
  let client: OpenRouterClient;
  let mockCreate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new OpenRouterClient(createMockConfig());
    mockCreate = vi.fn();
    (client as any).client.chat.completions.create = mockCreate;
  });

  it("uses default model when none specified", async () => {
    mockCreate.mockResolvedValue((async function* () {})());

    await client.streamChat(
      { messages: [{ role: "user", content: "Hello" }] },
      { onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() }
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "openai/gpt-4.1-nano",
        messages: [{ role: "user", content: "Hello" }],
        stream: true,
      }),
      expect.anything()
    );
  });

  it("overrides model when specified", async () => {
    mockCreate.mockResolvedValue((async function* () {})());

    await client.streamChat(
      { messages: [{ role: "user", content: "Hi" }], model: "anthropic/claude-sonnet-4" },
      { onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() }
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: "anthropic/claude-sonnet-4" }),
      expect.anything()
    );
  });

  it("streams tokens to onToken callback", async () => {
    const onToken = vi.fn();
    const onDone = vi.fn();

    mockCreate.mockResolvedValue(
      (async function* () {
        yield { choices: [{ delta: { content: "Hello" } }] };
        yield { choices: [{ delta: { content: " world" } }] };
        yield { choices: [{ delta: { content: "!" } }], usage: { prompt_tokens: 10, completion_tokens: 3 } };
      })()
    );

    await client.streamChat(
      { messages: [{ role: "user", content: "Hi" }] },
      { onToken, onDone, onError: vi.fn() }
    );

    expect(onToken).toHaveBeenCalledTimes(3);
    expect(onToken).toHaveBeenNthCalledWith(1, "Hello");
    expect(onToken).toHaveBeenNthCalledWith(2, " world");
    expect(onToken).toHaveBeenNthCalledWith(3, "!");
    expect(onDone).toHaveBeenCalledWith({ prompt_tokens: 10, completion_tokens: 3 });
  });

  it("handles empty delta chunks gracefully", async () => {
    const onToken = vi.fn();

    mockCreate.mockResolvedValue(
      (async function* () {
        yield { choices: [{ delta: {} }] };
        yield { choices: [{ delta: { content: "valid" } }] };
      })()
    );

    await client.streamChat(
      { messages: [{ role: "user", content: "Hi" }] },
      { onToken, onDone: vi.fn(), onError: vi.fn() }
    );

    expect(onToken).toHaveBeenCalledTimes(1);
    expect(onToken).toHaveBeenCalledWith("valid");
  });

  it("calls onError when create rejects with an error", async () => {
    const onError = vi.fn();
    mockCreate.mockRejectedValue(new Error("Something broke"));

    await client.streamChat(
      { messages: [{ role: "user", content: "Hi" }] },
      { onToken: vi.fn(), onDone: vi.fn(), onError }
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "internal_error" })
    );
  });

  it("returns an abort controller from streamChatWithAbort", () => {
    mockCreate.mockResolvedValue((async function* () {})());

    const controller = client.streamChatWithAbort(
      { messages: [{ role: "user", content: "Hi" }] },
      { onToken: vi.fn(), onDone: vi.fn(), onError: vi.fn() }
    );

    expect(controller).toBeInstanceOf(AbortController);
    controller.abort();
  });

  it("abort signal cancels the request", async () => {
    const onError = vi.fn();
    const controller = new AbortController();

    mockCreate.mockImplementation((_params: unknown, opts: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        opts.signal?.addEventListener("abort", () => {
          const err = new Error("aborted") as Error & { name: string };
          err.name = "AbortError";
          reject(err);
        });
        controller.abort();
      });
    });

    await client.streamChat(
      { messages: [{ role: "user", content: "Hi" }], signal: controller.signal },
      { onToken: vi.fn(), onDone: vi.fn(), onError }
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ code: "aborted" })
    );
  });
});