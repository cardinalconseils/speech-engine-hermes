import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "http";
import { WebSocket } from "ws";
import { createWebSocketServer } from "../src/websocket.js";
import type { AppConfig } from "../src/config.js";

const TEST_PORT = 3099;
const TEST_HOST = "localhost";
const FAKE_API_KEY = "sk-or-test-key-1234";

function createTestConfig(): AppConfig {
  return {
    openrouter: {
      apiKey: FAKE_API_KEY,
      baseUrl: "https://openrouter.ai/api/v1",
    },
    defaultModel: "openai/gpt-4.1-nano",
    ws: { port: TEST_PORT, host: TEST_HOST },
    originWhitelist: [],
    heartbeatIntervalMs: 1000,
    maxSessionMessages: 20,
  };
}

function connect(): Promise<{ ws: WebSocket; sessionId: string }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://${TEST_HOST}:${TEST_PORT}`);
    const timeout = setTimeout(() => reject(new Error("Connection timeout")), 5000);

    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.type === "connected") {
        clearTimeout(timeout);
        resolve({ ws, sessionId: msg.sessionId });
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

describe("WebSocket Server (integration)", () => {
  let httpServer: ReturnType<typeof createServer>;
  let wsServer: ReturnType<typeof createWebSocketServer>;

  beforeAll(async () => {
    const config = createTestConfig();
    httpServer = createServer((_req, res) => {
      res.writeHead(200);
      res.end("ok");
    });
    wsServer = createWebSocketServer(httpServer, config);

    await new Promise<void>((resolve) => {
      httpServer.listen(TEST_PORT, TEST_HOST, resolve);
    });
  });

  afterAll(async () => {
    wsServer.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  it("accepts a WebSocket connection and sends connected message", async () => {
    const { ws, sessionId } = await connect();
    expect(sessionId).toBeTruthy();
    expect(sessionId).toMatch(/^[a-f0-9-]{36}$/);
    ws.close();
  });

  it("responds to ping with pong", async () => {
    const { ws } = await connect();

    const response = await new Promise<{ type: string }>((resolve) => {
      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "pong") resolve(msg);
      });
      ws.send(JSON.stringify({ type: "ping" }));
    });

    expect(response.type).toBe("pong");
    ws.close();
  });

  it("sends error for malformed JSON", async () => {
    const { ws } = await connect();

    const response = await new Promise<{ type: string; code: string }>((resolve) => {
      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "error") resolve(msg);
      });
      ws.send("this is not json {{{");
    });

    expect(response.type).toBe("error");
    expect(response.code).toBe("invalid_json");
    ws.close();
  });

  it("sends error for invalid message format", async () => {
    const { ws } = await connect();

    const response = await new Promise<{ type: string; code: string }>((resolve) => {
      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "error") resolve(msg);
      });
      ws.send(JSON.stringify({ type: "unknown_action", foo: "bar" }));
    });

    expect(response.type).toBe("error");
    expect(response.code).toBe("invalid_message");
    ws.close();
  });

  it("malformed message does not affect other connections", async () => {
    const { ws: ws1 } = await connect();
    const { ws: ws2 } = await connect();

    ws1.send("not json");

    const ws1Response = await new Promise<{ type: string }>((resolve) => {
      ws1.once("message", (raw) => {
        resolve(JSON.parse(raw.toString()));
      });
    });
    expect(ws1Response.type).toBe("error");

    const ws2Response = await new Promise<{ type: string }>((resolve) => {
      ws2.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "pong") resolve(msg);
      });
      ws2.send(JSON.stringify({ type: "ping" }));
    });
    expect(ws2Response.type).toBe("pong");

    ws1.close();
    ws2.close();
  });

  it("tracks session count", async () => {
    const { ws } = await connect();
    expect(wsServer.sessionCount()).toBeGreaterThanOrEqual(1);
    ws.close();
  });

  it("cleans up session on disconnect", async () => {
    const { ws } = await connect();
    const countBefore = wsServer.sessionCount();
    ws.close();
    await new Promise((r) => setTimeout(r, 100));
    expect(wsServer.sessionCount()).toBeLessThan(countBefore);
  });
});
