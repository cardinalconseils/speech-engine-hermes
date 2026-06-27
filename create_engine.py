"""
Create a Speech Engine instance on ElevenLabs.

Run once after starting ngrok (or pointing to your public WebSocket URL).
Saves the engine_id to .env so server.py can pick it up.

Usage: python create_engine.py
"""

import asyncio
import os
import sys

from dotenv import load_dotenv
from elevenlabs import AsyncElevenLabs

load_dotenv()

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
WS_URL = os.getenv("WS_URL", "")

if not ELEVENLABS_API_KEY:
    print("ERROR: ELEVENLABS_API_KEY not set in .env")
    sys.exit(1)
if not WS_URL:
    print("ERROR: WS_URL not set in .env")
    print("Set it to your public WebSocket URL, e.g.:")
    print('  WS_URL="wss://abc123.ngrok.io/ws"')
    print("Or for local testing without ngrok:")
    print('  WS_URL="ws://localhost:3001/ws"')
    sys.exit(1)

# Make sure it uses wss:// or ws://
if not WS_URL.startswith("ws://") and not WS_URL.startswith("wss://"):
    WS_URL = f"wss://{WS_URL}"


async def main():
    elevenlabs = AsyncElevenLabs(api_key=ELEVENLABS_API_KEY)

    print(f"Creating Speech Engine with WS_URL: {WS_URL}")
    engine = await elevenlabs.speech_engine.create(
        name="Hermes Speech Engine",
        speech_engine={
            "ws_url": WS_URL,
        },
    )

    engine_id = engine.engine_id
    print(f"\nSpeech Engine created!")
    print(f"  Engine ID: {engine_id}")

    # Append to .env if not already there
    env_path = ".env"
    lines = []
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            lines = f.readlines()

    # Check if SPEECH_ENGINE_ID already exists
    found = False
    with open(env_path, "w") as f:
        for line in lines:
            if line.startswith("SPEECH_ENGINE_ID="):
                f.write(f"SPEECH_ENGINE_ID={engine_id}\n")
                found = True
            else:
                f.write(line)
        if not found:
            f.write(f"\nSPEECH_ENGINE_ID={engine_id}\n")

    print(f"  Saved to .env as SPEECH_ENGINE_ID")
    print(f"\nNow run: python server.py")


if __name__ == "__main__":
    asyncio.run(main())
