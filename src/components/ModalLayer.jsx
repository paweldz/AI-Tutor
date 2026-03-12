import { MaterialsPanel } from "./MaterialsPanel.jsx";
import { MemoryManager } from "./MemoryManager.jsx";
import { SummaryModal } from "./SummaryModal.jsx";
import { Dashboard } from "./Dashboard.jsx";
import { SettingsModal } from "./SettingsModal.jsx";
import { TopicsPanel } from "./TopicsPanel.jsx";
import { QuickQuiz } from "./QuickQuiz.jsx";
import { QuizBuilder } from "./QuizBuilder.jsx";
import { saveProfile } from "../utils/storage.js";

export function StorageFullBanner({ onDismiss }) {
  return (
    <div style={{ background: "#d32f2f", color: "#fff", padding: "8px 16px", textAlign: "center", fontSize: 13, fontWeight: 600 }}>
      Your device storage is full — progress may not be saved. Try clearing old sessions in Memory Manager.{" "}
      <button onClick={onDismiss} style={{ background: "transparent", border: "1px solid #fff", color: "#fff", borderRadius: 4, marginLeft: 8, cursor: "pointer", fontSize: 12, padding: "2px 8px" }}>Dismiss</button>
    </div>
  );
}

export function ModalLayer({
  modal, setModal, active, subject, showSum, setShowSum,
  quizSubject, setQuizSubject, topicsFor, setTopicsFor,
  buildQuizFor, setBuildQuizFor,
  memory, setMemory, profile, setProfile, topicData,
  mats, setMats, curMats,
  updateProfile, studyTopic, gainXP, onQuizComplete,
  clearSubjectMem, clearAllMem,
}) {
  return (
    <>
      {modal === "mats" && active && (
        <MaterialsPanel
          subject={subject} mats={curMats}
          onAdd={f => setMats(prev => ({ ...prev, [active]: [...prev[active], ...f] }))}
          onRemove={id => setMats(prev => ({ ...prev, [active]: prev[active].filter(m => m.id !== id) }))}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "memory" && (
        <MemoryManager
          memory={memory} profile={profile}
          onClearSubject={sid => setMemory(prev => clearSubjectMem(prev, sid))}
          onClearAll={() => setMemory(clearAllMem())}
          onClose={() => setModal(null)}
          onImport={(p, m) => { saveProfile(p); setProfile(p); setMemory(m); setModal(null); }}
        />
      )}
      {modal === "dash" && <Dashboard memory={memory} mats={mats} profile={profile} onClose={() => setModal(null)} />}
      {modal === "settings" && <SettingsModal profile={profile} onSave={updateProfile} onClose={() => setModal(null)} />}
      {showSum && subject && <SummaryModal subject={subject} sessionData={showSum} onClose={() => setShowSum(null)} />}
      {quizSubject && <QuickQuiz subject={quizSubject} profile={profile} memory={memory} topicData={topicData} onClose={() => setQuizSubject(null)} onXP={gainXP} onQuizComplete={onQuizComplete} />}
      {topicsFor && <TopicsPanel subject={topicsFor} profile={profile} topicData={topicData} onStudy={topic => { studyTopic(topicsFor, topic); setTopicsFor(null); }} onClose={() => setTopicsFor(null)} />}
      {buildQuizFor && <QuizBuilder subject={buildQuizFor} profile={profile} onClose={() => setBuildQuizFor(null)} onXP={gainXP} onQuizComplete={onQuizComplete} />}
    </>
  );
}
