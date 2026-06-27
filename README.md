# Speech Engine — Hermes

ElevenLabs Speech Engine with OpenRouter LLM routing. ElevenLabs handles STT + TTS, our server provides the LLM logic via WebSocket.

## Architecture

```
Browser (mic) → ElevenLabs (STT) → WebSocket server (LLM via OpenRouter) → ElevenLabs (TTS) → Browser (speaker)
```

## Setup

1. Copy `.env.example` to `.env` and fill in your keys
2. Install dependencies: `pip install -r requirements.txt`
3. Start the WebSocket server: `python server.py`
4. In another terminal, expose it: `ngrok http 3001`
5. Set `WS_URL` in `.env` to the ngrok WebSocket URL (e.g. `wss://abc123.ngrok.io/ws`)
6. Create the engine instance: `python create_engine.py`
7. Start the token server: `python token_server.py`
8. Open `client/index.html` in a browser (or serve with `python -m http.server 3003`)

## Files

| File | Purpose |
|------|---------|
| `server.py` | WebSocket server — receives transcripts, streams LLM responses |
| `create_engine.py` | Registers the Speech Engine with ElevenLabs |
| `token_server.py` | Flask endpoint that issues WebRTC tokens for the browser |
| `client/index.html` | Standalone HTML client with mic + speaker |
| `.env` | Keys and config (not committed) |

## Environment Variables

| Var | Required | Description |
|-----|----------|-------------|
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs API key |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `SPEECH_ENGINE_ID` | Yes | Filled by `create_engine.py` |
| `WS_URL` | Yes | Public WebSocket URL of your server |
| `LLM_MODEL` | No | OpenRouter model (default: `deepseek/deepseek-v4-flash`) |
| `SYSTEM_PROMPT` | No | LLM system prompt |

## Switching Models

Change `LLM_MODEL` in `.env` to any OpenRouter model:
- `anthropic/claude-sonnet-4` — best quality
- `google/gemini-2.5-flash` — fast and cheap
- `deepseek/deepseek-v4-flash` — default, cheapest
- `openai/gpt-4o` — OpenAI via OpenRouter

No code changes needed. The server streams any OpenAI-compatible chat completion.
