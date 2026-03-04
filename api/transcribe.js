/**
 * /api/transcribe.js — OpenAI Whisper speech-to-text proxy
 * 
 * POST { audio: "base64-encoded-audio", mimeType?: "audio/webm" }
 * Returns: { text: "transcribed text" }
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

  const { audio, mimeType } = req.body || {};
  if (!audio || typeof audio !== "string") {
    return res.status(400).json({ error: "Missing 'audio' (base64) in request body" });
  }

  try {
    // Decode base64 audio to Buffer
    const audioBuffer = Buffer.from(audio, "base64");

    if (audioBuffer.length < 100) {
      return res.status(400).json({ error: "Audio too short — try speaking for longer" });
    }

    // Determine file extension from mime type
    const mime = mimeType || "audio/webm";
    const ext = mime.includes("webm") ? "webm"
              : mime.includes("mp4") ? "mp4"
              : mime.includes("ogg") ? "ogg"
              : mime.includes("wav") ? "wav"
              : "webm";

    // Build multipart form data for OpenAI
    const blob = new Blob([audioBuffer], { type: mime });
    const file = new File([blob], `recording.${ext}`, { type: mime });

    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", "whisper-1");
    formData.append("language", "es"); // Hint: expect Spanish (also handles English mixed in)

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Whisper error:", response.status, err);
      return res.status(response.status).json({ error: `Whisper error: ${response.status}` });
    }

    const data = await response.json();
    return res.status(200).json({ text: data.text || "" });
  } catch (e) {
    console.error("Transcribe proxy error:", e);
    return res.status(500).json({ error: "Transcription failed: " + e.message });
  }
}

// Increase body size limit for audio payloads (default 1MB may be too small)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
