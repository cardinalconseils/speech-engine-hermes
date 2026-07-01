import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export const config = {
  runtime: "edge",
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.SPEECH_ENGINE_ID;

  if (!agentId) {
    return Response.json({ error: "SPEECH_ENGINE_ID not configured" }, { status: 500 });
  }
  if (!apiKey) {
    return Response.json({ error: "ELEVENLABS_API_KEY not configured" }, { status: 500 });
  }

  try {
    const client = new ElevenLabsClient({ apiKey });

    const response = await client.conversationalAi.conversations.getWebrtcToken({
      agentId,
    });

    return Response.json({ token: response.token });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}