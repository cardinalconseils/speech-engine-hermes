"""
Speech Engine WebSocket server.

ElevenLabs handles STT + TTS. This server receives transcripts and streams
LLM responses back via session.send_response(). Uses OpenRouter for model
routing instead of a hardcoded OpenAI dependency.

Run: python server.py
Exposes: ws://localhost:3001/ws
"""

import asyncio
import os
import sys

from dotenv import load_dotenv
from elevenlabs import AsyncElevenLabs
from openai import AsyncOpenAI

load_dotenv()

SPEECH_ENGINE_ID = os.getenv("SPEECH_ENGINE_ID", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
# Default model — override with LLM_MODEL env var. Pick cheap/fast for dev.
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek/deepseek-v4-flash")
SYSTEM_PROMPT = os.getenv(
    "SYSTEM_PROMPT",
    "You are a helpful voice assistant. Keep responses concise and conversational. "
    "Speak in short sentences. Never use markdown or special characters.",
)

if not SPEECH_ENGINE_ID:
    print("ERROR: SPEECH_ENGINE_ID not set. Run create_engine.py first.")
    sys.exit(1)
if not OPENROUTER_API_KEY:
    print("ERROR: OPENROUTER_API_KEY not set.")
    sys.exit(1)
if not ELEVENLABS_API_KEY:
    print("ERROR: ELEVENLABS_API_KEY not set.")
    sys.exit(1)

# OpenRouter is OpenAI-compatible — same SDK, different base_url.
llm = AsyncOpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1",
)

elevenlabs = AsyncElevenLabs(api_key=ELEVENLABS_API_KEY)


def on_init(conversation_id: str, session) -> None:
    print(f"[init] conversation={conversation_id}")


async def on_transcript(transcript, session) -> None:
    """Receive full conversation history, stream LLM response back."""
    # transcript is a list of ConversationMessage(role, content)
    # role is "user" or "agent"
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in transcript:
        # ElevenLabs uses "agent" for assistant messages — map to OpenAI format
        role = "assistant" if msg.role == "agent" else msg.role
        messages.append({"role": role, "content": msg.content})

    try:
        stream = await llm.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            stream=True,
        )

        # send_response accepts async iterables. Build a simple generator
        # that yields text deltas from the OpenAI-compatible stream.
        async def response_generator():
            async for chunk in stream:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta

        await session.send_response(response_generator())
    except Exception as err:
        print(f"[error] LLM streaming failed: {err}")
        # Fallback: send a short error string so the user isn't left in silence
        await session.send_response("Sorry, I had trouble processing that.")


def on_close(session) -> None:
    print(f"[close] conversation={session.conversation_id}")


def on_error(err, session) -> None:
    print(f"[error] {err}")


async def main():
    engine = await elevenlabs.speech_engine.get(SPEECH_ENGINE_ID)
    print(f"Starting Speech Engine server on port 3001...")
    print(f"  Engine ID: {SPEECH_ENGINE_ID}")
    print(f"  LLM: {LLM_MODEL} via OpenRouter")
    print(f"  WebSocket: ws://localhost:3001/ws")
    await engine.serve(
        port=3001,
        path="/ws",
        debug=True,
        on_init=on_init,
        on_transcript=on_transcript,
        on_close=on_close,
        on_error=on_error,
    )


if __name__ == "__main__":
    asyncio.run(main())
