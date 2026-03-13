/**
 * /api/tts.js — OpenAI Text-to-Speech proxy
 * 
 * POST { text, voice? }
 * Returns: audio/mpeg binary stream
 * 
 * Requires OPENAI_API_KEY in Vercel environment variables.
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "OPENAI_API_KEY not configured in Vercel environment variables" });
  }

  const { text, voice } = req.body || {};
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "Missing 'text' in request body" });
  }

  // Cap text length to avoid huge bills
  const truncated = text.slice(0, 4096);

  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        voice: voice || "nova",
        input: truncated,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI TTS error:", response.status, err);
      return res.status(response.status).json({ error: `OpenAI TTS error: ${response.status}` });
    }

    // Stream the audio back to the client
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-cache");

    const buffer = Buffer.from(await response.arrayBuffer());
    return res.send(buffer);
  } catch (e) {
    console.error("TTS proxy error:", e);
    return res.status(500).json({ error: "Text-to-speech failed — please try again" });
  }
}
