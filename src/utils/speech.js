/* ═══════════════════════════════════════════════════════════════════
   SPEECH SERVICE — OpenAI TTS + Whisper for voice subjects
   ═══════════════════════════════════════════════════════════════════ */

export const HAS_MEDIA_RECORDER = typeof window !== "undefined" && !!window.MediaRecorder;
let _currentAudio = null;

export async function speakText(text, voiceCfg, onEnd) {
  if (!text) return;
  stopSpeaking();
  try {
    const r = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 4096), voice: voiceCfg?.ttsVoice || "nova" }),
    });
    if (!r.ok) { console.error("TTS error:", r.status); if (onEnd) onEnd(); return; }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    _currentAudio = audio;
    audio.onended = () => { _currentAudio = null; URL.revokeObjectURL(url); if (onEnd) onEnd(); };
    audio.onerror = () => { _currentAudio = null; URL.revokeObjectURL(url); if (onEnd) onEnd(); };
    audio.play().catch(() => { if (onEnd) onEnd(); });
  } catch (e) { console.error("TTS failed:", e); if (onEnd) onEnd(); }
}

export function stopSpeaking() {
  if (_currentAudio) {
    _currentAudio.pause();
    _currentAudio.currentTime = 0;
    if (_currentAudio.src) try { URL.revokeObjectURL(_currentAudio.src); } catch {}
    _currentAudio.onended = null;
    _currentAudio.onerror = null;
    _currentAudio = null;
  }
}
