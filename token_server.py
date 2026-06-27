"""
Token endpoint for the browser client.

Returns a WebRTC conversation token so the React client can connect
to the Speech Engine without exposing the ElevenLabs API key.

Run: python token_server.py
Exposes: http://localhost:3002/api/token
"""

import os
import sys

from dotenv import load_dotenv
from flask import Flask, jsonify
from elevenlabs import ElevenLabs

load_dotenv()

SPEECH_ENGINE_ID = os.getenv("SPEECH_ENGINE_ID", "")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")

if not SPEECH_ENGINE_ID:
    print("ERROR: SPEECH_ENGINE_ID not set. Run create_engine.py first.")
    sys.exit(1)
if not ELEVENLABS_API_KEY:
    print("ERROR: ELEVENLABS_API_KEY not set.")
    sys.exit(1)

app = Flask(__name__)
elevenlabs = ElevenLabs(api_key=ELEVENLABS_API_KEY)


@app.route("/api/token")
def get_token():
    try:
        response = elevenlabs.conversational_ai.conversations.get_webrtc_token(
            agent_id=SPEECH_ENGINE_ID,
        )
        return jsonify(token=response.token)
    except Exception as err:
        return jsonify(error=str(err)), 500


if __name__ == "__main__":
    print(f"Token server on http://localhost:3002")
    print(f"  Engine ID: {SPEECH_ENGINE_ID}")
    app.run(port=3002)
