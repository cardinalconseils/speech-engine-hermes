import { WebSocketServer, WebSocket } from "ws";
import type { Server as HttpServer } from "http";
import type { AppConfig } from "./config.js";
import { OpenRouterClient } from "./openrouter.js";
import { SessionManager } from "./session.js";
import {
  parseClientMessage,
  formatValidationError,
  serializeServerMessage,
} from "./protocol.js";
import type { ServerErrorMessage, ServerMessage } from "./protocol.js";

export function createWebSocketServer(httpServer: HttpServer, config: AppConfig) {
  const wss = new WebSocketServer({ noServer: true });
  const openrouter = new OpenRouterClient(config);
  const sessions = new SessionManager(config.maxSessionMessages);

  // Periodic idle cleanup (every 60s, remove sessions idle > 5 min)
  const cleanupTimer = setInterval(() => {
    const removed = sessions.cleanupIdle(5 * 60 * 1000);
    if (removed > 0) {
      console.log(`[ws] Cleaned up ${removed} idle sessions`);
    }
  }, 60000);

  // Heartbeat: ping all clients every heartbeatIntervalMs
  const heartbeatTimer = setInterval(() => {
    wss.clients.forEach((ws) => {
      const client = ws as AugmentedWebSocket;
      if (client.isAlive === false) {
        // Client didn't respond to last ping — terminate
        client.terminate();
        return;
      }
      client.isAlive = false;
      client.ping();
    });
  }, config.heartbeatIntervalMs);

  // Handle upgrade: validate origin, then establish WebSocket
  httpServer.on("upgrade", (request, socket, head) => {
    const origin = request.headers.origin;

    if (origin && config.originWhitelist.length > 0 && !config.originWhitelist.includes(origin)) {
      console.log(`[ws] Rejected connection from disallowed origin: ${origin}`);
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  // Handle new connections
  wss.on("connection", (ws: WebSocket) => {
    const client = ws as AugmentedWebSocket;
    client.isAlive = true;

    const session = sessions.create();
    client.sessionId = session.id;

    console.log(`[ws] New connection: session=${session.id} (total: ${sessions.count})`);

    // Send connected message
    sendToClient(ws, {
      type: "connected",
      sessionId: session.id,
    });

    // Respond to pong — mark client as alive
    ws.on("pong", () => {
      client.isAlive = true;
      sessions.touch(session.id);
    });

    // Handle incoming messages
    ws.on("message", (raw) => {
      handleMessage(ws, raw.toString(), session.id);
    });

    // Handle close
    ws.on("close", () => {
      console.log(`[ws] Disconnected: session=${session.id}`);
      sessions.remove(session.id);
    });

    // Handle errors
    ws.on("error", (err) => {
      console.error(`[ws] Error on session=${session.id}:`, err.message);
      sessions.remove(session.id);
    });
  });

  function handleMessage(ws: WebSocket, rawData: string, sessionId: string) {
    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawData);
    } catch {
      sendError(ws, "invalid_json", "Message is not valid JSON");
      return;
    }

    // Validate structure
    const message = parseClientMessage(parsed);
    if (!message) {
      const validationError = formatValidationError(parsed);
      sendError(ws, "invalid_message", `Invalid message format: ${validationError}`);
      return;
    }

    // Route by type
    switch (message.type) {
      case "ping":
        sendToClient(ws, { type: "pong" });
        sessions.touch(sessionId);
        break;

      case "chat":
        handleChat(ws, sessionId, message);
        break;
    }
  }

  function handleChat(
    ws: WebSocket,
    sessionId: string,
    message: { messages: Array<{ role: "user" | "assistant" | "system"; content: string }>; model?: string }
  ) {
    // Add user message to session history
    for (const msg of message.messages) {
      if (msg.role !== "system") {
        sessions.addMessage(sessionId, msg.role, msg.content);
      }
    }

    // Build full message array: system prompt + history + new message
    const session = sessions.get(sessionId);
    const historyMessages = session?.messages ?? [];
    
    // Use OpenRouter recommended header for app identification
    const controller = openrouter.streamChatWithAbort(
      {
        messages: historyMessages,
        model: message.model,
      },
      {
        onToken: (content) => {
          if (ws.readyState === WebSocket.OPEN) {
            sendToClient(ws, { type: "token", content });
          }
        },
        onDone: (usage) => {
          // Save assistant response to history
          // We don't have the full text easily — skip for now, downstream task can add
          sessions.setAbortController(sessionId, null);
          if (ws.readyState === WebSocket.OPEN) {
            sendToClient(ws, {
              type: "done",
              sessionId,
              usage,
            });
          }
        },
        onError: (err) => {
          sessions.setAbortController(sessionId, null);
          if (ws.readyState === WebSocket.OPEN) {
            sendError(ws, err.code, err.message, err.retryAfterMs);
          }
        },
      }
    );

    sessions.setAbortController(sessionId, controller);
  }

  function sendToClient(ws: WebSocket, msg: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(serializeServerMessage(msg));
    }
  }

  function sendError(ws: WebSocket, code: string, message: string, retryAfterMs?: number) {
    const err: ServerErrorMessage = { type: "error", code, message };
    if (retryAfterMs !== undefined) err.retryAfterMs = retryAfterMs;
    sendToClient(ws, err);
  }

  // Return a handle for graceful shutdown
  return {
    close: () => {
      clearInterval(cleanupTimer);
      clearInterval(heartbeatTimer);
      wss.close();
    },
    sessionCount: () => sessions.count,
  };
}

interface AugmentedWebSocket extends WebSocket {
  isAlive?: boolean;
  sessionId?: string;
}