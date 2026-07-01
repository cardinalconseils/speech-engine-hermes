import { WebSocket } from "ws";

const ws = new WebSocket("ws://localhost:3001");

ws.on("open", () => {
  console.log("[client] Connected");
  // Send ping
  ws.send(JSON.stringify({ type: "ping" }));

  // Send chat
  setTimeout(() => {
    console.log("[client] Sending chat message...");
    ws.send(
      JSON.stringify({
        type: "chat",
        messages: [{ role: "user", content: "Say hello in exactly 5 words." }],
        model: "openai/gpt-4.1-nano",
      })
    );
  }, 200);
});

ws.on("message", (data) => {
  const msg = JSON.parse(data.toString());
  if (msg.type === "token") {
    process.stdout.write(msg.content);
  } else if (msg.type === "done") {
    console.log("\n[client] DONE - usage:", JSON.stringify(msg.usage));
    ws.close();
  } else if (msg.type === "error") {
    console.log("\n[client] ERROR:", msg.code, msg.message);
    ws.close();
  } else if (msg.type === "pong") {
    console.log("[client] PONG received");
  } else {
    console.log("[client] RECV:", msg.type);
  }
});

ws.on("close", () => {
  console.log("[client] Disconnected");
  process.exit(0);
});

ws.on("error", (err) => {
  console.error("[client] WS error:", err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log("[client] TIMEOUT");
  process.exit(1);
}, 30000);