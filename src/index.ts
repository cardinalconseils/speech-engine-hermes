import { createServer } from "http";
import { loadConfig } from "./config.js";
import { createWebSocketServer } from "./websocket.js";

async function main() {
  const config = loadConfig();

  // Create HTTP server (used for WebSocket upgrade + health checks)
  const httpServer = createServer((req, res) => {
    // Health check endpoint
    if (req.url === "/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", timestamp: Date.now() }));
      return;
    }

    // Everything else: 404
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  });

  // Attach WebSocket server
  const wsServer = createWebSocketServer(httpServer, config);

  // Start listening
  httpServer.listen(config.ws.port, config.ws.host, () => {
    console.log(`[server] Speech Engine WebSocket server running on ws://${config.ws.host}:${config.ws.port}`);
    console.log(`[server] Health check: http://${config.ws.host}:${config.ws.port}/health`);
    console.log(`[server] Default model: ${config.defaultModel}`);
    console.log(`[server] Origin whitelist: ${config.originWhitelist.join(", ") || "(none — all origins allowed)"}`);
  });

  // Graceful shutdown
  function shutdown(signal: string) {
    console.log(`\n[server] Received ${signal}, shutting down...`);
    wsServer.close();
    httpServer.close(() => {
      console.log("[server] Server closed");
      process.exit(0);
    });
    // Force exit after 5s if graceful close hangs
    setTimeout(() => {
      console.error("[server] Forced shutdown after timeout");
      process.exit(1);
    }, 5000);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("[server] Fatal error:", err);
  process.exit(1);
});