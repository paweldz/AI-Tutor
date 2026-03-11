import { stopSpeaking } from "../utils/speech.js";

export function Header({
  profile, active, subject, curMats, examMode, voiceMode, convoMode,
  msgs, sumLoading, autoSumming, dbConnected, totalMem, voiceCfg, micSupported,
  setModal, setExamMode, setBuildQuizFor, setVoiceMode, setConvoMode,
  genSummary, setActive, switchUser, startMicRef, stopMic
}) {
  return (
    <div style={{ padding: "12px 22px", display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.88)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.07)", position: "sticky", top: 0, zIndex: 100 }}>
      {active && <button onClick={() => setActive(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#666", padding: "4px 8px", borderRadius: 8 }} aria-label="Back">{"\u2190"}</button>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase" }}>{profile.name} {"\u00b7"} {profile.year} {"\u00b7"} {profile.tier}{autoSumming ? " \u00b7 saving memory..." : ""}</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#1a1a2e", fontFamily: "'Playfair Display',serif", lineHeight: 1.2 }}>{active ? subject.emoji + " " + subject.tutor.name : "Your Tutor Hub by Korona Lab \u00ae"}</div>
      </div>
      {active && (
        <div style={{ display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn" onClick={() => setModal("mats")} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: curMats.length ? subject.color : "rgba(0,0,0,0.07)", color: curMats.length ? "#fff" : "#666", fontSize: 11, fontWeight: 700 }}>{"\ud83d\udcce"} {curMats.length ? curMats.length + " File" + (curMats.length > 1 ? "s" : "") : "Materials"}</button>
          <button className="btn" onClick={() => setExamMode(e => !e)} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: examMode ? subject.color : "rgba(0,0,0,0.07)", color: examMode ? "#fff" : "#666", fontSize: 11, fontWeight: 700 }}>{"\ud83d\udcdd"} {examMode ? "Exam ON" : "Exam"}</button>
          <button className="btn" onClick={() => setBuildQuizFor(subject)} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: "rgba(0,0,0,0.07)", color: "#666", fontSize: 11, fontWeight: 700 }}>{"\ud83d\udee0\ufe0f"} Quiz</button>
          {voiceCfg && <button className="btn" onClick={() => { setVoiceMode(v => { if (v) { stopSpeaking(); setConvoMode(false); } return !v; }); }} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: voiceMode ? "#dc2626" : "rgba(0,0,0,0.07)", color: voiceMode ? "#fff" : "#666", fontSize: 11, fontWeight: 700 }}>{voiceMode ? "\ud83d\udd0a Voice ON" : "\ud83c\udf99\ufe0f Voice"}</button>}
          {voiceMode && voiceCfg && micSupported && <button className="btn" onClick={() => { setConvoMode(v => { if (!v) { stopSpeaking(); setTimeout(() => startMicRef.current(), 200); } else { stopMic(); } return !v; }); }} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: convoMode ? "#059669" : "rgba(0,0,0,0.07)", color: convoMode ? "#fff" : "#666", fontSize: 11, fontWeight: 700, animation: convoMode ? "mp 2s ease infinite" : "none" }}>{convoMode ? "\ud83d\udd04 Conversation" : "\ud83d\udde3\ufe0f Converse"}</button>}
          <button className="btn" onClick={genSummary} disabled={sumLoading || msgs.length < 3} style={{ padding: "5px 10px", borderRadius: 20, border: "none", cursor: "pointer", background: msgs.length >= 3 ? subject.color : "rgba(0,0,0,0.07)", color: msgs.length >= 3 ? "#fff" : "#aaa", fontSize: 11, fontWeight: 700, opacity: sumLoading ? .6 : 1 }}>{sumLoading ? "Saving..." : "\ud83d\udccb Summary"}</button>
        </div>
      )}
      <div style={{ display: "flex", gap: 5 }}>
        {dbConnected && <div style={{ padding: "6px 10px", borderRadius: 20, background: "#1a1a2e", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>{"\u2601\ufe0f"} Synced</div>}
        <button className="btn" onClick={() => setModal("settings")} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\u2699\ufe0f"}</button>
        <button className="btn" onClick={() => setModal("memory")} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\ud83e\udde0"}{totalMem > 0 ? " " + totalMem : ""}</button>
        <button className="btn" onClick={() => setModal("dash")} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\ud83d\udc68\u200d\ud83d\udc67"}</button>
        <button className="btn" onClick={switchUser} style={{ padding: "6px 10px", borderRadius: 20, border: "2px solid rgba(0,0,0,0.1)", background: "transparent", color: "#444", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{"\ud83d\udc64"}</button>
      </div>
    </div>
  );
}
