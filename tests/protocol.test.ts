import { describe, it, expect } from "vitest";
import { parseClientMessage, formatValidationError } from "../src/protocol.js";

describe("parseClientMessage", () => {
  it("parses a valid chat message", () => {
    const result = parseClientMessage({
      type: "chat",
      messages: [{ role: "user", content: "Hello" }],
    });
    expect(result).not.toBeNull();
    expect(result?.type).toBe("chat");
    if (result?.type === "chat") {
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.content).toBe("Hello");
    }
  });

  it("parses a valid chat message with model override", () => {
    const result = parseClientMessage({
      type: "chat",
      messages: [{ role: "user", content: "Hello" }],
      model: "anthropic/claude-3.5-sonnet",
    });
    expect(result).not.toBeNull();
    if (result?.type === "chat") {
      expect(result.model).toBe("anthropic/claude-3.5-sonnet");
    }
  });

  it("parses a valid ping message", () => {
    const result = parseClientMessage({ type: "ping" });
    expect(result).not.toBeNull();
    expect(result?.type).toBe("ping");
  });

  it("rejects message with invalid type", () => {
    const result = parseClientMessage({ type: "unknown" });
    expect(result).toBeNull();
  });

  it("rejects message with no type", () => {
    const result = parseClientMessage({ foo: "bar" });
    expect(result).toBeNull();
  });

  it("rejects non-object input", () => {
    const result = parseClientMessage("just a string");
    expect(result).toBeNull();
  });

  it("rejects chat with empty messages array", () => {
    const result = parseClientMessage({ type: "chat", messages: [] });
    expect(result).toBeNull();
  });

  it("rejects chat with invalid role", () => {
    const result = parseClientMessage({
      type: "chat",
      messages: [{ role: "bot", content: "hi" }],
    });
    expect(result).toBeNull();
  });

  it("rejects chat with empty content", () => {
    const result = parseClientMessage({
      type: "chat",
      messages: [{ role: "user", content: "" }],
    });
    expect(result).toBeNull();
  });
});

describe("formatValidationError", () => {
  it("returns empty string for valid messages", () => {
    const result = formatValidationError({
      type: "chat",
      messages: [{ role: "user", content: "Hello" }],
    });
    expect(result).toBe("");
  });

  it("returns error string for invalid messages", () => {
    const result = formatValidationError({ type: "chat", messages: [] });
    expect(result).not.toBe("");
    expect(result).toContain("messages");
  });
});