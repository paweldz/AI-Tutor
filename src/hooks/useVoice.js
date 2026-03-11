import { useState, useRef, useEffect, useCallback } from "react";
import { speakText, stopSpeaking } from "../utils/speech.js";
import { useSpeechRecognition } from "./useSpeechRecognition.js";

/**
 * Manages all voice-related state: TTS, STT, voice mode, conversation mode.
 * Returns everything App.jsx needs to wire up voice features.
 */
export function useVoice({ voiceCfg, msgs, active, sendRef, setInput }) {
  const [voiceMode, setVoiceMode] = useState(false);
  const [convoMode, setConvoMode] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const prevMsgCountRef = useRef(0);
  const convoRef = useRef(false);
  convoRef.current = convoMode;

  // Speech recognition hook — records audio, transcribes via Whisper
  const { listening, transcribing, start: startMic, stop: stopMic, supported: micSupported } = useSpeechRecognition(
    voiceCfg?.lang || "es-ES",
    useCallback((text) => {
      if (text.trim()) {
        setInput(text.trim());
        const t = text.trim();
        setTimeout(() => { setInput(""); if (sendRef.current) sendRef.current(t); }, 400);
      }
    }, [setInput, sendRef])
  );

  const startMicRef = useRef(startMic);
  startMicRef.current = startMic;

  // Auto-speak new assistant messages when voice mode is on
  useEffect(() => {
    if (!voiceMode || !voiceCfg || !msgs.length) return;
    if (msgs.length > prevMsgCountRef.current) {
      const last = msgs[msgs.length - 1];
      if (last.role === "assistant" && !last.content.startsWith("\u274c")) {
        setSpeaking(true);
        speakText(last.content, voiceCfg, () => {
          setSpeaking(false);
          if (convoRef.current) setTimeout(() => startMicRef.current(), 300);
        });
      }
    }
    prevMsgCountRef.current = msgs.length;
  }, [msgs.length, voiceMode, voiceCfg]);

  // Stop speaking when leaving a subject
  useEffect(() => { if (!active) { stopSpeaking(); setSpeaking(false); } }, [active]);

  // Turn off voice/convo mode when switching to a non-voice subject
  useEffect(() => { if (!voiceCfg) { setVoiceMode(false); setConvoMode(false); } }, [voiceCfg]);

  return {
    voiceMode, setVoiceMode,
    convoMode, setConvoMode,
    speaking, setSpeaking,
    listening, transcribing,
    startMic, stopMic, micSupported,
    startMicRef,
  };
}
