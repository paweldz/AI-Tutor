/**
 * /api/chat.js — Anthropic Claude API proxy
 *
 * POST { model, max_tokens, system, messages }
 * Returns: Anthropic API response JSON
 *
 * Requires ANTHROPIC_API_KEY in Vercel environment variables.
 */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY not configured in Vercel environment variables" });
  }

  const { model, max_tokens, system, messages } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Missing 'messages' in request body" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: model || "claude-sonnet-4-5-20250929",
        max_tokens: max_tokens || 1200,
        system: system || "",
        messages,
      }),
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch {
      // Anthropic sometimes returns non-JSON on 429/529
      data = { error: { type: "api_error", message: text.slice(0, 200) } };
    }

    // Pass through the status code so the client can detect 429, 529, etc.
    return res.status(response.status).json(data);
  } catch (e) {
    console.error("Anthropic proxy error:", e);
    return res.status(500).json({ error: { type: "proxy_error", message: "Failed to reach Anthropic — please try again" } });
  }
}

// Allow larger payloads for file-based messages (base64 images/PDFs)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};
