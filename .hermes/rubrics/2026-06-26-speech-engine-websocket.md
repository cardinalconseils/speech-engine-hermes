# Rubric: Speech Engine WebSocket Server with OpenRouter LLM

**Date:** 2026-06-26
**Feature:** WebSocket server that accepts client connections, streams OpenRouter LLM responses, handles sessions
**Plan:** `.hermes/plans/2026-06-26-speech-engine-websocket.md`

## Pre-Mortem Failure Modes

> "It's 3 months later. This feature shipped and was a complete disaster. What went wrong?"

1. The WebSocket server crashed when a client sent malformed JSON, taking down all active connections
2. OpenRouter API returned a 429 rate limit error during peak usage, and the server just dropped the connection without retrying
3. WebSocket connections accumulated indefinitely because there was no heartbeat/ping-pong, causing the server to run out of file descriptors
4. The LLM streaming stopped mid-response when the client disconnected, but the server kept the OpenAI stream open, leaking memory
5. When OpenRouter returned an error (invalid API key, model not found), the server crashed with an unhandled exception instead of sending an error to the client
6. The server had no origin validation, and a malicious site opened thousands of WebSocket connections, exhausting the OpenRouter quota

## Definition of Done (inherited from project)

- [ ] No TypeScript / type errors
- [ ] Tests pass for all source files
- [ ] Security gate passes (no secrets, no SQL injection, no auth bypass)
- [ ] No debug code left behind (console.log only for structured logging)

## Feature-Specific Criteria (5, pass/fail)

### Criterion 1: Malformed message resilience
**Pre-mortem origin:** #1 — server crashed on malformed JSON, taking down all connections
**How to verify:** Send a non-JSON string over WebSocket, verify the server sends an error to that client only and another client is unaffected
**PASS when:** Error message sent to offending client; other connections remain open and functional
**FAIL when:** Server process crashes, or other clients are disconnected

### Criterion 2: OpenRouter error handling
**Pre-mortem origin:** #2, #5 — rate limiting and API errors crashed the server
**How to verify:** Use an invalid API key, trigger an error, verify structured error is sent over WebSocket
**PASS when:** Structured `{ type: "error", code: "...", message: "..." }` sent to client; server stays up
**FAIL when:** Server crashes, connection drops without error message, or error is unreadable

### Criterion 3: Connection lifecycle (ping/pong + cleanup)
**Pre-mortem origin:** #3 — connections leaked, file descriptors exhausted
**How to verify:** Open multiple connections, let them idle, check that ping/pong keeps them alive and dead connections are cleaned up
**PASS when:** Idle connections receive pings; stale connections are terminated; connection count drops after disconnect
**FAIL when:** Connections never cleaned up, server runs out of resources

### Criterion 4: Stream abort on client disconnect
**Pre-mortem origin:** #4 — LLM stream leaked memory on client disconnect
**How to verify:** Start a streaming LLM response, disconnect the client mid-stream, verify the OpenAI stream is aborted
**PASS when:** OpenAI stream is aborted within 1 second of client disconnect; no memory leak
**FAIL when:** OpenAI stream continues running after client disconnect

### Criterion 5: LLM streaming works end-to-end
**Pre-mortem origin:** Core functional requirement
**How to verify:** Connect a WebSocket client, send a chat message, receive streaming token events and a final done event
**PASS when:** Client receives multiple `{ type: "token" }` events followed by a `{ type: "done" }` event with the full response
**FAIL when:** No response, response not streamed, or connection hangs

## Human Approval

- [ ] Rubric reviewed and approved by human before implementation
- [ ] Criteria are specific enough to be tested by terminal-based WebSocket client
- [ ] Each criterion traces to a pre-mortem failure mode