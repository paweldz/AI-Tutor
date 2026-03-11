import { useState, useRef, useEffect, useCallback } from "react";
import { HAS_MEDIA_RECORDER } from "../utils/speech.js";

/* Custom hook: record audio via MediaRecorder, transcribe via Whisper */
export function useSpeechRecognition(lang, onResult) {
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const cbRef = useRef(onResult);
  cbRef.current = onResult;

  const start = useCallback(() => {
    if (!HAS_MEDIA_RECORDER || listening || transcribing) return;

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus"
                     : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
                     : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4"
                     : "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];

        if (blob.size < 1000) {
          setTranscribing(false);
          return;
        }

        setTranscribing(true);
        try {
          const base64 = await new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result.split(",")[1]);
            reader.onerror = () => rej(new Error("Failed to read audio"));
            reader.readAsDataURL(blob);
          });

          const r = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: base64, mimeType: recorder.mimeType || "audio/webm", language: lang ? lang.split("-")[0] : undefined }),
          });

          if (!r.ok) {
            const err = await r.json().catch(() => ({}));
            console.error("Whisper error:", err);
            setTranscribing(false);
            return;
          }

          const { text } = await r.json();
          if (text && text.trim() && cbRef.current) {
            cbRef.current(text.trim(), true);
          }
        } catch (e) {
          console.error("Transcription failed:", e);
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start();
      setListening(true);
    }).catch(e => {
      console.error("Mic access denied:", e);
      setListening(false);
    });
  }, [listening, transcribing, lang]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
    setListening(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    if (recorderRef.current && recorderRef.current.state === "recording") try { recorderRef.current.stop(); } catch {}
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
  }, []);

  return { listening, transcribing, start, stop, supported: HAS_MEDIA_RECORDER };
}
