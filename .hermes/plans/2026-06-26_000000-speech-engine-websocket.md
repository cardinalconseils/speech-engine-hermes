# Implementation Plan: Speech Engine WebSocket Server

**Date:** 2026-06-26
**Rubric:** `.hermes/rubrics/2026-06-26-speech-engine-websocket.md`

## Architecture

```
Client (WebSocket) ←→ Server (ws) ←→ OpenRouter (OpenAI-compatible streaming)
```

- **server/src/websocket.ts** — WebSocket server, connection lifecycle, message routing
- **server/src/openrouter.ts** — OpenRouter API client, streaming chat completions
- **server/src/session.ts** — Per-connection session state, message history
- **server/src/protocol.ts** — Message types, validation, serialization
- **server/src/index.ts** — Entry point, server bootstrap
- **server/src/config.ts** — Environment config, defaults

## Protocol

### Client → Server
```typescript
{ type: "chat", messages: [{ role, content }], model?: string }
{ type: "ping" }
```

### Server → Client
```typescript
{ type: "token", content: "partial" }
{ type: "done", sessionId: string, usage?: { prompt_tokens, completion_tokens } }
{ type: "error", code: string, message: string }
{ type: "pong" }
{ type: "connected", sessionId: string }
```

## Tasks

### Task 1: Project scaffold + config
- tsconfig.json (already done)
- package.json scripts (build, dev, test)
- .env.example + config.ts
- .gitignore

### Task 2: Protocol types + message validation
- `src/protocol.ts`: TypeScript types, Zod schemas for validation
- Parse incoming messages, validate structure
- Serialize outgoing messages

### Task 3: OpenRouter client
- `src/openrouter.ts`: Streaming chat completions via OpenAI SDK
- Error handling: rate limits, auth errors, model errors
- Stream abort support (AbortController)

### Task 4: Session management
- `src/session.ts`: Per-connection state
- Message history per session
- Session ID generation (uuid)

### Task 5: WebSocket server
- `src/websocket.ts`: Connection handling
- Ping/pong heartbeat (30s interval)
- Message routing: chat → OpenRouter, ping → pong
- Malformed message handling (error to client, no crash)
- Client disconnect → abort active stream
- Connection cleanup on close

### Task 6: Entry point + server bootstrap
- `src/index.ts`: Start server on configurable port
- Graceful shutdown (SIGTERM/SIGINT)
- Health check HTTP endpoint (for downstream task)

### Task 7: Tests
- Unit tests: protocol validation, message parsing
- Integration tests: WebSocket connect/disconnect, ping/pong
- Integration tests: LLM streaming (with mock OpenRouter)
- Error handling tests: malformed JSON, invalid messages

## Verification

Each task verified by:
1. TypeScript compilation (no errors)
2. Unit/integration tests pass
3. For integration: manual test with wscat or test script