import { z } from "zod";

// ── Client → Server messages ──────────────────────────────────────

export const ClientChatMessageSchema = z.object({
  type: z.literal("chat"),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1),
      })
    )
    .min(1)
    .max(200),
  model: z.string().optional(),
});

export const ClientPingMessageSchema = z.object({
  type: z.literal("ping"),
});

export const ClientMessageSchema = z.discriminatedUnion("type", [
  ClientChatMessageSchema,
  ClientPingMessageSchema,
]);

export type ClientChatMessage = z.infer<typeof ClientChatMessageSchema>;
export type ClientPingMessage = z.infer<typeof ClientPingMessageSchema>;
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

// ── Server → Client messages ──────────────────────────────────────

export interface ServerConnectedMessage {
  type: "connected";
  sessionId: string;
}

export interface ServerTokenMessage {
  type: "token";
  content: string;
}

export interface ServerDoneMessage {
  type: "done";
  sessionId: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
  };
}

export interface ServerErrorMessage {
  type: "error";
  code: string;
  message: string;
  retryAfterMs?: number;
}

export interface ServerPongMessage {
  type: "pong";
}

export type ServerMessage =
  | ServerConnectedMessage
  | ServerTokenMessage
  | ServerDoneMessage
  | ServerErrorMessage
  | ServerPongMessage;

// ── Helpers ───────────────────────────────────────────────────────

export function parseClientMessage(raw: unknown): ClientMessage | null {
  const result = ClientMessageSchema.safeParse(raw);
  if (result.success) return result.data;
  return null;
}

export function serializeServerMessage(msg: ServerMessage): string {
  return JSON.stringify(msg);
}

export function formatValidationError(raw: unknown): string {
  const result = ClientMessageSchema.safeParse(raw);
  if (result.success) return "";
  return result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
}