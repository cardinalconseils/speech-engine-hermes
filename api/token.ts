import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.SPEECH_ENGINE_ID;

  if (!agentId) {
    return res.status(500).json({ error: "SPEECH_ENGINE_ID not configured" });
  }
  if (!apiKey) {
    return res.status(500).json({ error: "ELEVENLABS_API_KEY not configured" });
  }

  try {
    const client = new ElevenLabsClient({ apiKey });

    const response = await client.conversationalAi.conversations.getWebrtcToken({
      agentId,
    });

    return res.status(200).json({ token: response.token });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: message });
  }
}