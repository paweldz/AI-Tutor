import { MaterialsPanel } from "./MaterialsPanel.jsx";
import { MemoryManager } from "./MemoryManager.jsx";
import { SummaryModal } from "./SummaryModal.jsx";

import { SettingsModal } from "./SettingsModal.jsx";
import { TopicsPanel } from "./TopicsPanel.jsx";
import { QuickQuiz } from "./QuickQuiz.jsx";
import { QuizBuilder } from "./QuizBuilder.jsx";
import { TeacherNotes } from "./TeacherNotes.jsx";
import { SessionHistory } from "./SessionHistory.jsx";
import { StudentNotes } from "./StudentNotes.jsx";
export function ModalLayer({
  modal, setModal, active, subject, showSum, setShowSum,
  quizSubject, setQuizSubject, topicsFor, setTopicsFor,
  buildQuizFor, setBuildQuizFor,
  memory, setMemory, profile, setProfile, topicData, customTopics,
  mats, setMats, curMats,
  updateProfile, studyTopic, gainXP, onQuizComplete, onSaveCustomTopics,
  teacherNotes, onSaveTeacherNotes,
  studentNotes, onSaveStudentNotes,
  onSessionAction, onDeleteSession,
  clearSubjectMem, clearAllMem,
  events,
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
          onImport={(p, m) => { setProfile(p); setMemory(m); setModal(null); }}
        />
      )}
{modal === "settings" && <SettingsModal profile={profile} onSave={updateProfile} onClose={() => setModal(null)} onOpenMemory={() => setModal("memory")} />}
      {showSum && subject && <SummaryModal subject={subject} sessionData={showSum} onClose={() => setShowSum(null)} />}
      {quizSubject && <QuickQuiz subject={quizSubject} profile={profile} memory={memory} topicData={topicData} onClose={() => setQuizSubject(null)} onXP={gainXP} onQuizComplete={onQuizComplete} />}
      {topicsFor && <TopicsPanel subject={topicsFor} profile={profile} topicData={topicData} customTopics={customTopics} onStudy={topic => { studyTopic(topicsFor, topic); setTopicsFor(null); }} onClose={() => setTopicsFor(null)} onSaveCustomTopics={onSaveCustomTopics} />}
      {buildQuizFor && <QuizBuilder subject={buildQuizFor} profile={profile} onClose={() => setBuildQuizFor(null)} onXP={gainXP} onQuizComplete={onQuizComplete} />}
      {modal === "teacherNotes" && active && <TeacherNotes subject={subject} notes={teacherNotes} onSave={onSaveTeacherNotes} onClose={() => setModal(null)} />}
      {modal === "studentNotes" && active && <StudentNotes subject={subject} profile={profile} customTopics={customTopics} notes={studentNotes} onSave={onSaveStudentNotes} onClose={() => setModal(null)} />}
      {modal === "history" && active && <SessionHistory subject={subject} memory={memory} onAction={(type, data) => { onSessionAction(type, data); setModal(null); }} onDelete={onDeleteSession} onClose={() => setModal(null)} />}
    </>
  );
}
