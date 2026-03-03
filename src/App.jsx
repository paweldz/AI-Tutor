import { useState, useRef, useEffect } from "react";

const BOARDS = ["AQA","Edexcel","OCR","WJEC","Eduqas"];
const YEARS = ["Year 10","Year 11"];
const TIERS = ["Foundation","Higher"];
const SUBJECT_STEPS = [{tutorId:"spanish",label:"Spanish",emoji:"🇪🇸"},{tutorId:"science",label:"Science",emoji:"🔬"},{tutorId:"math",label:"Maths",emoji:"📐"},{tutorId:"english",label:"English",emoji:"📚"}];

const T = {
 spanish:{ id:"spanish", name:"Señora López", subject:"Spanish", emoji:"🇪🇸", color:"#b5451b", grad:"linear-gradient(135deg,#b5451b,#e8603a)", bg:"#fdf6f3", desc:"Conversation, grammar & vocabulary" },
 science:{ id:"science", name:"Dr. Patel", subject:"Science", emoji:"🔬", color:"#1a6b3c", grad:"linear-gradient(135deg,#1a6b3c,#27ae60)", bg:"#f3fdf6", desc:"Biology, Chemistry & Physics" },
 math: { id:"math", name:"Mr. Chen", subject:"Maths", emoji:"📐", color:"#1a3a7a", grad:"linear-gradient(135deg,#1a3a7a,#2980b9)", bg:"#f3f6fd", desc:"Number, algebra, geometry & stats" },
 english:{ id:"english", name:"Ms. Williams", subject:"English", emoji:"📚", color:"#5b1a6b", grad:"linear-gradient(135deg,#5b1a6b,#8e44ad)", bg:"#faf3fd", desc:"Language & Literature" },
};

const MEM_KEY = "gcse_memory_v1";
const PROF_KEY = "gcse_profile_v1";
const KEY_KEY = "gcse_api_key";

function loadMemory() {
 try { return JSON.parse(localStorage.getItem(MEM_KEY) || "{}"); } catch { return {}; }
}
function saveMemory(mem) {
 try { localStorage.setItem(MEM_KEY, JSON.stringify(mem)); } catch {}
}
function loadProfile() {
 try { return JSON.parse(localStorage.getItem(PROF_KEY) || "null"); } catch { return null; }
}
function saveProfile(p) {
 try { localStorage.setItem(PROF_KEY, JSON.stringify(p)); } catch {}
}
function loadApiKey() {
 try { return localStorage.getItem(KEY_KEY) || ""; } catch { return ""; }
}
function saveApiKey(k) {
 try { localStorage.setItem(KEY_KEY, k); } catch {}
}

function exportMemory(memory, profile) {
 const lines = [`GCSE Tutor Hub — Memory Export`, `Student: ${profile?.name || "Unknown"} | ${profile?.year} | ${profile?.tier}`, `Exported: ${new Date().toLocaleDateString("en-GB")}`, ""];
 for (const [tid, summaries] of Object.entries(memory)) {
 if (!summaries?.length) continue;
 lines.push(`\n${"=".repeat(50)}\n${T[tid]?.subject || tid} — ${summaries.length} session${summaries.length>1?"s":""}\n${"=".repeat(50)}`);
 summaries.forEach((s,i) => lines.push(`\n[Session ${i+1} — ${s.date}]\n${s.text}`));
 }
 const blob = new Blob([lines.join("\n")], {type:"text/plain"});
 const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
 a.download = `gcse-tutor-memory-${new Date().toISOString().slice(0,10)}.txt`; a.click();
}

const SB_URL_KEY = 'gcse_sb_url';
const SB_AKEY = 'gcse_sb_anonkey';
function loadSbCreds() {
 try { return { url:localStorage.getItem(SB_URL_KEY)||'', key:localStorage.getItem(SB_AKEY)||'' }; }
 catch { return {url:'',key:''}; }
}
function saveSbCreds(url, key) {
 try { localStorage.setItem(SB_URL_KEY,url); localStorage.setItem(SB_AKEY,key); } catch {}
}
async function dbSave(sbUrl, sbKey, studentName, subject, date, summary) {
 if (!sbUrl||!sbKey) return false;
 try {
 const r = await fetch(sbUrl+'/rest/v1/tutor_memory', {method:'POST', headers:{'Content-Type':'application/json','apikey':sbKey,'Authorization':'Bearer '+sbKey,'Prefer':'return=minimal'}, body:JSON.stringify({student_name:studentName,subject,session_date:date,summary})});
 return r.ok;
 } catch { return false; }
}
async function dbLoad(sbUrl, sbKey, studentName) {
 if (!sbUrl||!sbKey) return null;
 try {
 const r = await fetch(sbUrl+'/rest/v1/tutor_memory?student_name=eq.'+encodeURIComponent(studentName)+'&order=created_at.asc', {headers:{'apikey':sbKey,'Authorization':'Bearer '+sbKey}});
 if (!r.ok) return null;
 const rows = await r.json();
 const mem = {};
 for (const row of rows) { if (!mem[row.subject]) mem[row.subject]=[]; mem[row.subject].push({date:row.session_date,text:row.summary}); }
 return mem;
 } catch { return null; }
}
function SupabaseSettings({ onClose, onSave, initialUrl, initialKey }) {
 const [sbUrl, setSbUrl] = useState(initialUrl||'https://jmkiuwlvpuqprvlklftu.supabase.co');
 const [sbKey, setSbKey] = useState(initialKey||'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impta2l1d2x2cHVxcHJ2bGtsZnR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MTgxNzYsImV4cCI6MjA4ODA5NDE3Nn0.qzXBIUMyV7shNguZ2awZnB8a6-__HbiCtG7HpAdZZ9w');
 const [testing, setTesting] = useState(false);
 const [status, setStatus] = useState(null);
 async function testAndSave() {
 if (!sbUrl.trim()||!sbKey.trim()) return;
 setTesting(true); setStatus(null);
 try {
 const r = await fetch(sbUrl.trim()+'/rest/v1/tutor_memory?limit=1',{headers:{'apikey':sbKey.trim(),'Authorization':'Bearer '+sbKey.trim()}});
 if (r.ok||r.status===406) { saveSbCreds(sbUrl.trim(),sbKey.trim()); onSave(sbUrl.trim(),sbKey.trim()); setStatus('success'); }
 else { const d = await r.json().catch(()=>({})); setStatus('error:HTTP '+r.status+' - '+(d.message||d.hint||'check credentials')); }
 } catch(e) { setStatus('error:'+e.message); } finally { setTesting(false); }
 }
 return (
 <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(6px)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
 <div style={{background:'#fff',borderRadius:24,width:'100%',maxWidth:520,boxShadow:'0 24px 80px rgba(0,0,0,0.35)'}}>
 <div style={{background:'linear-gradient(135deg,#1a1a2e,#302b63)',borderRadius:'24px 24px 0 0',padding:'18px 22px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
 <div><div style={{color:'rgba(255,255,255,0.5)',fontSize:11}}>CLOUD DATABASE</div><div style={{color:'#fff',fontSize:18,fontWeight:'700'}}>Supabase Settings</div></div>
 <button onClick={onClose} style={{background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',borderRadius:8,padding:'6px 12px',cursor:'pointer'}}>Close</button>
 </div>
 <div style={{padding:24}}>
 <div style={{marginBottom:16}}><div style={{fontSize:12,fontWeight:'700',color:'#555',marginBottom:6}}>Project URL</div><input value={sbUrl} onChange={e=>setSbUrl(e.target.value)} style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'2px solid #e0e0e0',fontSize:13,fontFamily:'monospace',outline:'none'}}/></div>
 <div style={{marginBottom:20}}><div style={{fontSize:12,fontWeight:'700',color:'#555',marginBottom:6}}>Anon Public Key</div><textarea value={sbKey} onChange={e=>setSbKey(e.target.value)} rows={3} style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'2px solid #e0e0e0',fontSize:12,fontFamily:'monospace',outline:'none',resize:'vertical'}}/></div>
 {status==='success'&&<div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:10,padding:'10px 14px',color:'#16a34a',fontSize:13,marginBottom:16,fontWeight:'600'}}>Connected - memory now syncs to Supabase</div>}
 {status&&status.startsWith('error:')&&<div style={{background:'#fff5f5',border:'1px solid #fca5a5',borderRadius:10,padding:'10px 14px',color:'#dc2626',fontSize:13,marginBottom:16}}>{status.slice(6)}</div>}
 <div style={{display:'flex',gap:10}}>
 <button onClick={onClose} style={{flex:1,padding:12,borderRadius:10,border:'2px solid #e0e0e0',background:'transparent',color:'#666',fontWeight:'700',cursor:'pointer',fontSize:13}}>Cancel</button>
 <button onClick={testAndSave} disabled={!sbUrl.trim()||!sbKey.trim()||testing} style={{flex:2,padding:12,borderRadius:10,border:'none',background:'#1a1a2e',color:'#fff',fontWeight:'700',cursor:'pointer',fontSize:13}}>{testing?'Testing...':'Save & Test Connection'}</button>
 </div>
 <div style={{marginTop:12,fontSize:11,color:'#aaa',lineHeight:1.6}}>Credentials stored in localStorage. Anon key is safe - controlled by Supabase RLS.</div>
 </div>
 </div>
 </div>
 );
}

const SUMMARY_PROMPT = `Write a session summary with these sections:
📅 SESSION SUMMARY | Date: [today] | Subject: [subject]
✅ TOPICS COVERED: [list]
💪 STRENGTHS: [specific examples]
⚠️ NEEDS WORK: [specific gaps]
📊 CONFIDENCE: [Topic: X%]
📝 NEXT SESSION: [3 priorities]
💬 TUTOR NOTES: [2 sentences on learning style]`;

function buildSysPrompt(tid, profile, summaries, mats) {
 const { name, year, examBoards, tier } = profile;
 const board = examBoards?.[tid] || "not confirmed";
 const boardNote = board === "not confirmed" ? "Exam board unknown — cover content broadly across major boards. Gently encourage student to find out." : "";
 const matBlock = mats?.length ? `\n\nTEACHER MATERIALS (${mats.length} file${mats.length>1?"s":""}): ${mats.map(m=>m.name).join(", ")}. Use as primary reference. Base test prep on these.` : "";

 let historyBlock = "";
 if (summaries?.length) {
 const recent = summaries.slice(-4);
 historyBlock = `\n\nPAST SESSIONS (most recent ${recent.length}):\n` +
 recent.map((s,i) => `[${s.date}]: ${s.text.slice(0,400)}`).join("\n---\n") +
 `\n\nAvoid re-teaching mastered topics, prioritise weak areas.`;
 }

 const base = `You are ${T[tid].name}, GCSE ${T[tid].subject} tutor.
STUDENT: ${name} | ${year} | ${tier} | Board: ${board}
${boardNote}${historyBlock}${matBlock}
EMOTIONAL AWARENESS: If frustrated/short → slow down, validate, use analogies. If confident → push harder. Never make student feel stupid.
EXAM PRACTICE: On past paper questions → student attempts first → mark (X/Y marks because...) → explain mark scheme → model answer.
TRACKING: Track topics/confidence/errors. On "how am I doing?" give honest assessment with confidence % per topic.`;

 const specific = {
 spanish: `\nSPANISH: Mix English/Spanish, increase Spanish as confidence grows. Correct gently ("¡Casi! Correct form: [X] because [reason]"). End each exchange with a question/challenge. ${board==="AQA"?"AQA: 3 themes, 4 skills.":board==="Edexcel"?"Edexcel: translation + photo card.":board==="OCR"?"OCR: spontaneous speaking focus.":""} ${tier==="Higher"?"Higher: subjunctive, complex tenses.":"Foundation: present/past/future, core vocab."}`,
 science: `\nSCIENCE: Use analogies. Flag exam technique ("6-mark answer needs 6 points"). Show every calc step. ${board==="AQA"?"AQA: required practicals, ~30% maths, Trilogy or Triple.":board==="Edexcel"?"Edexcel: Core Practicals examined.":board==="OCR"?"OCR: Gateway or 21C spec.":""} ${tier==="Higher"?"Higher: complex maths, mechanisms, organic chem.":"Foundation: concepts over derivation."}`,
 math: `\nMATHS: Show every step. When wrong ask "where did it go wrong?" first. Offer multiple methods. Flag: units, sig figs. Scaffold: trivial→easy→medium→hard. ${board==="Edexcel"?"Edexcel: 3 papers (1 non-calc).":board==="AQA"?"AQA: multi-step context problems.":""} ${tier==="Higher"?"Higher: quadratics, circle theorems, vectors, surds, functions, iteration.":"Foundation: arithmetic, algebra, geometry, probability."}`,
 english: `\nENGLISH: Push for the 'so what' on every technique. Mark writing: score + reasons + one improvement. Build vocab: connotation, juxtaposition, semantic field. ${board==="AQA"?"AQA: P1 fiction+creative, P2 non-fiction+viewpoint, AO1-AO6.":board==="Edexcel"?"Edexcel: personal response emphasis.":board==="OCR"?"OCR: audience/purpose central.":""} Literature: link to context for top marks.`,
 };
 return base + specific[tid];
}

function buildApiMsgs(mats, convMsgs) {
 const media = mats.filter(m => m.isImg || m.isPdf);
 if (!media.length) return convMsgs;
 return [
 { role:"user", content:[...media.map(m=>({type:m.isPdf?"document":"image",source:{type:"base64",media_type:m.mediaType,data:m.base64}})),{type:"text",text:"These are my teacher's materials. Acknowledge receipt."}] },
 { role:"assistant", content:"Got your teacher's materials — ready to help you study from them. Shall I quiz you, summarise them, or help prepare for a test?" },
 ...convMsgs
 ];
}

const MAX_MB = 8;
const ACCEPT = {"image/jpeg":1,"image/png":1,"image/gif":1,"image/webp":1,"application/pdf":1,"text/plain":1};

async function processFiles(files, onAdd, onError) {
 const results = [];
 for (const f of Array.from(files)) {
 if (!ACCEPT[f.type]) { onError(`"${f.name}": unsupported type`); continue; }
 if (f.size > MAX_MB*1024*1024) { onError(`"${f.name}": too large (max ${MAX_MB}MB)`); continue; }
 const isImg=f.type.startsWith("image/"), isPdf=f.type==="application/pdf", isText=f.type.startsWith("text/");
 let base64=null, textContent=null;
 try {
 if (isText) textContent = await f.text();
 else base64 = await new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result.split(",")[1]); r.onerror=()=>rej(); r.readAsDataURL(f); });
 results.push({ id:Date.now()+Math.random(), name:f.name, type:isImg?"image":isPdf?"pdf":"text", mediaType:f.type, isImg,isPdf,isText, base64,textContent, size:f.size, uploadedAt:new Date().toLocaleDateString("en-GB"), preview:isImg?`data:${f.type};base64,${base64}`:null });
 } catch { onError(`Failed to process "${f.name}"`); }
 }
 if (results.length) onAdd(results);
}

function ApiKeyScreen({ onDone }) {
 const [key, setKey] = useState("");
 const [err, setErr] = useState(null);
 function verify() {
 const k = key.trim();
 if (!k.startsWith("sk-ant-")) { setErr("Key should start with 'sk-ant-' — check you copied it in full"); return; }
 onDone(k);
 }

 return (
 <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Georgia',serif"}}>
 <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Source+Sans+3:wght@400;600;700&display=swap');*{box-sizing:border-box}.hb:hover{transform:translateY(-2px)}`}</style>
 <div style={{width:"100%",maxWidth:480}}>
 <div style={{background:"rgba(255,255,255,0.06)",backdropFilter:"blur(20px)",borderRadius:24,border:"1px solid rgba(255,255,255,0.12)",padding:"40px 36px"}}>
 <div style={{fontSize:40,marginBottom:16,textAlign:"center"}}>🔑</div>
 <div style={{fontSize:11,color:"#f0c040",letterSpacing:"0.1em",marginBottom:6,fontFamily:"'Source Sans 3',sans-serif",textAlign:"center"}}>GCSE TUTOR HUB</div>
 <h2 style={{fontSize:26,color:"#fff",fontFamily:"'Playfair Display',serif",marginBottom:10,textAlign:"center"}}>Enter your API Key</h2>
 <p style={{color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:24,lineHeight:1.7,fontFamily:"'Source Sans 3',sans-serif",textAlign:"center"}}>
 Get a free key at <strong style={{color:"#f0c040"}}>console.anthropic.com</strong><br/>
 → API Keys → Create Key<br/>
 Add a small credit (£5 starts fine). Costs ~£3–8/month.
 </p>
 <input autoFocus value={key} onChange={e=>setKey(e.target.value)} onKeyDown={e=>e.key==="Enter"&&verify()} placeholder="sk-ant-api03-..." type="password"
 style={{width:"100%",padding:"14px 18px",borderRadius:12,border:`2px solid ${err?"#f87171":key?"#f0c040":"rgba(255,255,255,0.2)"}`,background:"rgba(255,255,255,0.08)",color:"#fff",fontSize:14,fontFamily:"monospace",outline:"none",marginBottom:err?8:20}}/>
 {err && <div style={{color:"#f87171",fontSize:12,marginBottom:16,lineHeight:1.5,fontFamily:"'Source Sans 3',sans-serif"}}>⚠️ {err}</div>}
 <button className="hb" onClick={verify} disabled={!key.trim()}
 style={{width:"100%",padding:14,borderRadius:12,border:"none",background:key.trim()?"#f0c040":"rgba(255,255,255,0.1)",color:key.trim()?"#1a1a2e":"rgba(255,255,255,0.3)",fontSize:15,fontWeight:"700",fontFamily:"'Source Sans 3',sans-serif",cursor:key.trim()?"pointer":"default",transition:"all .2s"}}>
 Continue →
 </button>
 <div style={{marginTop:16,padding:"12px 14px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)"}}>
 <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",fontFamily:"'Source Sans 3',sans-serif",lineHeight:1.7}}>
 🔒 Key stored in browser session only — never sent anywhere except Anthropic.<br/>
 💡 Set a spend limit in Console → Settings → Limits to cap costs.
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}

function Setup({ onDone }) {
 const [step, setStep] = useState(0);
 const [p, setP] = useState({ name:"", year:"", tier:"", examBoards:{spanish:"",science:"",math:"",english:""} });
 const steps = [
 {type:"text", field:"name", title:"What's your name?", sub:"Your tutors will use this throughout your sessions", ph:"Enter your first name..."},
 {type:"choice",field:"year", title:"Which year are you in?", sub:"Helps tutors prioritise the right content", opts:YEARS},
 {type:"choice",field:"tier", title:"Foundation or Higher tier?", sub:"Applies to Maths & Science — other subjects use one tier", opts:TIERS},
 ...SUBJECT_STEPS.map(s=>({type:"board",tid:s.tutorId,emoji:s.emoji,title:`${s.emoji} ${s.label} exam board?`,sub:"Skip if unsure — your tutor will cover all boards until you know."})),
 ];
 const cur=steps[step], isBoard=cur.type==="board", isLast=step===steps.length-1;
 const get=()=>isBoard?p.examBoards[cur.tid]:(p[cur.field]||"");
 const set=v=>isBoard?setP(x=>({...x,examBoards:{...x.examBoards,[cur.tid]:v}})):setP(x=>({...x,[cur.field]:v}));
 const ok=isBoard||get().trim().length>0;
 function next(){if(!ok)return;if(!isLast)setStep(s=>s+1);else onDone(p);}

 return (
 <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f0c29,#302b63,#24243e)",display:"flex",alignItems:"center",justifyContent:"center",padding:24,fontFamily:"'Georgia',serif"}}>
 <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Source+Sans+3:wght@400;600;700&display=swap');*{box-sizing:border-box}.so:hover{transform:scale(1.03)}.hb:hover{transform:translateY(-2px)}`}</style>
 <div style={{width:"100%",maxWidth:500}}>
 <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:40}}>
 {steps.map((_,i)=><div key={i} style={{width:i===step?28:8,height:8,borderRadius:4,background:i<=step?"#f0c040":"rgba(255,255,255,0.2)",transition:"all .3s"}}/>)}
 </div>
 <div style={{background:"rgba(255,255,255,0.06)",backdropFilter:"blur(20px)",borderRadius:24,border:"1px solid rgba(255,255,255,0.12)",padding:"40px 36px"}}>
 <div style={{fontSize:11,color:"#f0c040",letterSpacing:"0.1em",marginBottom:6,fontFamily:"'Source Sans 3',sans-serif"}}>SETUP {step+1}/{steps.length}{isBoard?" · optional":""}</div>
 <h2 style={{fontSize:28,color:"#fff",fontFamily:"'Playfair Display',serif",marginBottom:8}}>{cur.title}</h2>
 <p style={{color:"rgba(255,255,255,0.5)",fontSize:13,marginBottom:28,lineHeight:1.5,fontFamily:"'Source Sans 3',sans-serif"}}>{cur.sub}</p>
 {cur.type==="text"&&<input autoFocus value={get()} onChange={e=>set(e.target.value)} onKeyDown={e=>e.key==="Enter"&&next()} placeholder={cur.ph} style={{width:"100%",padding:"14px 18px",borderRadius:12,border:"2px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.08)",color:"#fff",fontSize:18,fontFamily:"'Source Sans 3',sans-serif",outline:"none",marginBottom:20}}/>}
 {(cur.type==="choice"||cur.type==="board")&&(
 <div style={{display:"grid",gridTemplateColumns:cur.type==="board"?"1fr 1fr 1fr":(cur.opts?.length>3?"1fr 1fr":"1fr"),gap:8,marginBottom:12}}>
 {(cur.opts||BOARDS).map(o=>(
 <div key={o} className="so" onClick={()=>set(get()===o?"":o)} style={{padding:"12px 14px",borderRadius:10,border:`2px solid ${get()===o?"#f0c040":"rgba(255,255,255,0.15)"}`,background:get()===o?"rgba(240,192,64,0.15)":"rgba(255,255,255,0.05)",color:get()===o?"#f0c040":"rgba(255,255,255,0.8)",fontSize:14,fontFamily:"'Source Sans 3',sans-serif",fontWeight:get()===o?"700":"400",cursor:"pointer",textAlign:"center",transition:"all .15s"}}>
 {o}
 </div>
 ))}
 </div>
 )}
 {isBoard&&<div style={{fontSize:12,color:"rgba(255,255,255,0.3)",marginBottom:16,fontFamily:"'Source Sans 3',sans-serif"}}>{get()?`Selected: ${get()} — click to deselect`:"Nothing selected — fine to skip"}</div>}
 <div style={{display:"flex",gap:8}}>
 {isBoard&&<button className="hb" onClick={next} style={{flex:1,padding:14,borderRadius:10,border:"2px solid rgba(255,255,255,0.2)",background:"transparent",color:"rgba(255,255,255,0.6)",fontSize:14,fontWeight:"700",fontFamily:"'Source Sans 3',sans-serif",cursor:"pointer",transition:"all .2s"}}>Skip</button>}
 <button className="hb" onClick={next} disabled={!ok} style={{flex:2,padding:14,borderRadius:10,border:"none",background:ok?"#f0c040":"rgba(255,255,255,0.1)",color:ok?"#1a1a2e":"rgba(255,255,255,0.3)",fontSize:15,fontWeight:"700",fontFamily:"'Source Sans 3',sans-serif",cursor:ok?"pointer":"default",transition:"all .2s"}}>
 {isLast?"Meet Your Tutors →":isBoard&&get()?`Save ${get()} →`:"Continue →"}
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}

function MaterialsPanel({ tutor, mats, onAdd, onRemove, onClose }) {
 const fileRef=useRef(null);
 const [err,setErr]=useState(null);
 const [drag,setDrag]=useState(false);

 return (
 <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(6px)",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
 <div style={{background:"#fff",borderRadius:24,width:"100%",maxWidth:560,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 80px rgba(0,0,0,0.35)"}}>
 <div style={{background:tutor.grad,borderRadius:"24px 24px 0 0",padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
 <div><div style={{color:"rgba(255,255,255,0.6)",fontSize:11,letterSpacing:"0.1em"}}>{tutor.emoji} {tutor.subject.toUpperCase()}</div><div style={{color:"#fff",fontSize:18,fontWeight:"700",fontFamily:"'Playfair Display',serif"}}>Teacher Materials</div></div>
 <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:13}}>✕ Close</button>
 </div>
 <div style={{overflowY:"auto",flex:1,padding:22}}>
 <div onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);processFiles(e.dataTransfer.files,onAdd,setErr)}} onClick={()=>fileRef.current?.click()}
 style={{border:`2px dashed ${drag?tutor.color:"#ddd"}`,borderRadius:14,padding:"28px 20px",textAlign:"center",cursor:"pointer",background:drag?tutor.color+"0a":"#fafafa",transition:"all .2s",marginBottom:16}}>
 <div style={{fontSize:32,marginBottom:8}}>📎</div>
 <div style={{fontWeight:"700",color:"#333",fontSize:15,marginBottom:4}}>Drop files here or click to browse</div>
 <div style={{color:"#999",fontSize:12,lineHeight:1.6}}>Photos of worksheets · Screenshots · PDFs · Text files (max {MAX_MB}MB)</div>
 <input ref={fileRef} type="file" multiple accept="image/*,application/pdf,text/plain" style={{display:"none"}} onChange={e=>processFiles(e.target.files,onAdd,setErr)}/>
 </div>
 {err&&<div style={{background:"#fff5f5",border:"1px solid #fca5a5",borderRadius:10,padding:"10px 14px",color:"#dc2626",fontSize:13,marginBottom:12}}>⚠️ {err}</div>}
 {mats.length===0
 ?<div style={{textAlign:"center",color:"#bbb",fontSize:14,padding:20}}>No materials yet. Upload files and your tutor will use them automatically.</div>
 :<>
 <div style={{fontSize:12,fontWeight:"700",color:"#888",letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:10}}>{mats.length} file{mats.length>1?"s":""} uploaded</div>
 {mats.map(m=>(
 <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:"1px solid #f0f0f0",marginBottom:6,background:"#fafafa"}}>
 {m.preview?<img src={m.preview} alt={m.name} style={{width:44,height:44,objectFit:"cover",borderRadius:8,flexShrink:0}}/>:<div style={{width:44,height:44,borderRadius:8,background:tutor.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{m.isPdf?"📄":m.isText?"📝":"📎"}</div>}
 <div style={{flex:1,minWidth:0}}><div style={{fontWeight:"600",fontSize:13,color:"#1a1a2e",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</div><div style={{fontSize:11,color:"#aaa"}}>{m.type.toUpperCase()} · {m.uploadedAt} · {(m.size/1024).toFixed(0)}KB</div></div>
 <button onClick={()=>onRemove(m.id)} style={{background:"none",border:"1px solid #eee",borderRadius:8,padding:"4px 8px",cursor:"pointer",color:"#999",fontSize:11}}>Remove</button>
 </div>
 ))}
 <div style={{marginTop:12,padding:"12px 14px",borderRadius:10,background:tutor.color+"10",border:`1px solid ${tutor.color}30`}}>
 <div style={{fontSize:12,color:tutor.color,fontWeight:"700",marginBottom:4}}>✅ Tutor has access to these materials</div>
 <div style={{fontSize:12,color:"#666",lineHeight:1.5}}>Try: <em>"Quiz me on this"</em>, <em>"Summarise my notes"</em>, <em>"Prepare me for my test"</em></div>
 </div>
 </>
 }
 </div>
 </div>
 </div>
 );
}

function MemoryManager({ memory, profile, onClearSubject, onClearAll, onClose }) {
 const totalSessions = Object.values(memory).reduce((acc,s)=>acc+(s?.length||0),0);

 return (
 <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",backdropFilter:"blur(6px)",zIndex:998,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
 <div style={{background:"#fff",borderRadius:24,width:"100%",maxWidth:560,maxHeight:"85vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 80px rgba(0,0,0,0.35)"}}>
 <div style={{background:"linear-gradient(135deg,#1a1a2e,#302b63)",borderRadius:"24px 24px 0 0",padding:"18px 22px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
 <div><div style={{color:"rgba(255,255,255,0.5)",fontSize:11,letterSpacing:"0.1em"}}>MEMORY MANAGER</div><div style={{color:"#fff",fontSize:18,fontWeight:"700",fontFamily:"'Playfair Display',serif"}}>{profile?.name}'s Memory</div></div>
 <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:13}}>✕ Close</button>
 </div>
 <div style={{overflowY:"auto",flex:1,padding:22}}>
 <div style={{padding:"14px 16px",borderRadius:12,background:"#f0f9ff",border:"1px solid #bae6fd",marginBottom:20}}>
 <div style={{fontSize:13,color:"#0369a1",fontWeight:"700",marginBottom:4}}>💾 {totalSessions} session{totalSessions!==1?"s":""} stored in browser memory</div>
 <div style={{fontSize:12,color:"#0284c7",lineHeight:1.6}}>Memory persists until you clear your browser cache. Export a backup regularly to be safe.</div>
 </div>

 {Object.values(T).map(t=>{
 const sums = memory[t.id]||[];
 return (
 <div key={t.id} style={{marginBottom:12,borderRadius:14,border:"1px solid #f0f0f0",overflow:"hidden"}}>
 <div style={{background:t.grad,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
 <div style={{color:"#fff",fontWeight:"700",fontSize:14}}>{t.emoji} {t.subject} — {sums.length} session{sums.length!==1?"s":""}</div>
 {sums.length>0&&<button onClick={()=>onClearSubject(t.id)} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",borderRadius:8,padding:"4px 10px",cursor:"pointer",fontSize:11}}>Clear</button>}
 </div>
 {sums.length>0?(
 <div style={{padding:"10px 14px",background:"#fafafa"}}>
 {sums.slice(-3).map((s,i)=>(
 <div key={i} style={{fontSize:12,color:"#666",padding:"6px 0",borderBottom:i<Math.min(sums.length,3)-1?"1px solid #f0f0f0":"none"}}>
 <strong>{s.date}</strong> — {s.text.split("\n").find(l=>l.includes("TOPICS")||l.includes("✅"))||s.text.slice(0,80)}
 </div>
 ))}
 {sums.length>3&&<div style={{fontSize:11,color:"#aaa",marginTop:6}}>+ {sums.length-3} earlier session{sums.length-3>1?"s":""}</div>}
 </div>
 ):(
 <div style={{padding:"12px 14px",color:"#bbb",fontSize:13}}>No sessions yet</div>
 )}
 </div>
 );
 })}

 <div style={{display:"flex",gap:10,marginTop:8}}>
 <button onClick={()=>exportMemory(memory,profile)} style={{flex:1,padding:"11px",borderRadius:10,border:"2px solid #1a3a7a",background:"transparent",color:"#1a3a7a",fontWeight:"700",cursor:"pointer",fontSize:13}}>
 📥 Export Backup
 </button>
 <button onClick={()=>{ if(window.confirm("Clear ALL memory for all subjects? This cannot be undone.")) onClearAll(); }} style={{flex:1,padding:"11px",borderRadius:10,border:"2px solid #dc2626",background:"transparent",color:"#dc2626",fontWeight:"700",cursor:"pointer",fontSize:13}}>
 🗑️ Clear All Memory
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}

function Dashboard({ sessions, memory, mats, profile, onClose }) {
 const allSums = Object.entries(memory).flatMap(([id,sums])=>(sums||[]).map(s=>({...s,tutor:T[id]}))).sort((a,b)=>new Date(b.date)-new Date(a.date));
 return (
 <div style={{position:"fixed",inset:0,background:"rgba(10,10,20,0.85)",backdropFilter:"blur(8px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
 <div style={{background:"#fff",borderRadius:24,width:"100%",maxWidth:760,maxHeight:"88vh",overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:"0 32px 80px rgba(0,0,0,0.4)"}}>
 <div style={{padding:"22px 26px",background:"linear-gradient(135deg,#1a1a2e,#302b63)",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
 <div>
 <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",letterSpacing:"0.1em",marginBottom:2}}>PARENT DASHBOARD</div>
 <div style={{color:"#fff",fontSize:20,fontFamily:"'Playfair Display',serif",fontWeight:"700"}}>{profile.name}'s Progress</div>
 <div style={{color:"rgba(255,255,255,0.45)",fontSize:12,marginTop:2}}>{profile.year} · {profile.tier} · {allSums.length} total sessions</div>
 </div>
 <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",borderRadius:10,padding:"7px 14px",cursor:"pointer",fontSize:13}}>✕ Close</button>
 </div>
 <div style={{overflowY:"auto",flex:1,padding:22}}>
 <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:22}}>
 {Object.values(T).map(t=>{
 const sums=memory[t.id]||[], sc=sums.length, ls=sums[sums.length-1], mc=(mats[t.id]||[]).length;
 return (
 <div key={t.id} style={{borderRadius:14,overflow:"hidden",border:"1px solid #eee"}}>
 <div style={{background:t.grad,padding:"14px 16px",color:"#fff"}}>
 <div style={{fontSize:26}}>{t.emoji}</div>
 <div style={{fontWeight:"700",fontSize:15,marginTop:4}}>{t.name}</div>
 <div style={{opacity:.65,fontSize:12}}>{t.subject}</div>
 </div>
 <div style={{padding:"12px 16px",background:"#fafafa"}}>
 <div style={{fontSize:12,color:t.color,fontWeight:"700",marginBottom:4}}>{sc===0?"No sessions yet":`${sc} session${sc>1?"s":""} in memory`}</div>
 {ls&&<div style={{fontSize:11,color:"#777",marginBottom:4}}>Last: {ls.date}</div>}
 {mc>0&&<div style={{fontSize:11,color:"#888"}}>📎 {mc} material{mc>1?"s":""} uploaded</div>}
 </div>
 </div>
 );
 })}
 </div>
 <div style={{fontFamily:"'Playfair Display',serif",fontSize:17,color:"#1a1a2e",marginBottom:14,fontWeight:"700"}}>All Session Summaries</div>
 {allSums.length===0
 ?<div style={{textAlign:"center",padding:28,background:"#f8f8f8",borderRadius:14,color:"#aaa",fontSize:14}}>No summaries yet. They'll appear here automatically after each session.</div>
 :allSums.map((s,i)=><div key={i} style={{marginBottom:10,borderRadius:12,overflow:"hidden",border:`1px solid ${s.tutor.color}33`}}><div style={{background:s.tutor.grad,padding:"9px 14px",color:"#fff",display:"flex",alignItems:"center",gap:8}}><span>{s.tutor.emoji}</span><span style={{fontWeight:"700",fontSize:13}}>{s.tutor.subject}</span><span style={{marginLeft:"auto",opacity:.7,fontSize:11}}>{s.date}</span></div><div style={{padding:"10px 14px",whiteSpace:"pre-wrap",fontSize:12,lineHeight:1.6,color:"#444",background:"#fafafa"}}>{s.text}</div></div>)
 }
 </div>
 </div>
 </div>
 );
}

export default function App() {
 const [apiKey, setApiKey] = useState(loadApiKey);
 const [sbCreds, setSbCreds] = useState(loadSbCreds);
 const [showSbSettings, setShowSbSettings] = useState(false);
 const [sbSynced, setSbSynced] = useState(false);
 const [profile, setProfile] = useState(loadProfile);
 const [memory, setMemory] = useState(loadMemory); // persisted per-subject summaries
 const [sessions,setSessions]= useState({}); // current-tab chat messages only
 const [mats, setMats] = useState({spanish:[],science:[],math:[],english:[]});
 const [active, setActive] = useState(null);
 const [showMats, setShowMats] = useState(false);
 const [showDash, setShowDash] = useState(false);
 const [showMemMgr, setShowMemMgr] = useState(false);
 const [showSum, setShowSum] = useState(null);
 const [examMode, setExamMode] = useState(false);
 const [input, setInput] = useState("");
 const [loading, setLoading] = useState(false);
 const [sumLoading, setSumLoading] = useState(false);
 const [autoSumming, setAutoSumming] = useState(false); // background auto-summary
 const bottomRef = useRef(null);
 const inputRef = useRef(null);

 const tutor = active ? T[active] : null;
 const sess = active ? (sessions[active]||{}) : {};
 const msgs = sess.messages || [];
 const curMats = active ? (mats[active]||[]) : [];
 const curMem = active ? (memory[active]||[]) : [];

 // Persist memory whenever it changes
 useEffect(()=>{ saveMemory(memory); }, [memory]);
 // Load from Supabase on startup
 useEffect(()=>{
 if (profile && sbCreds.url && sbCreds.key && !sbSynced) {
 setSbSynced(true);
 dbLoad(sbCreds.url, sbCreds.key, profile.name).then(m => { if (m && Object.keys(m).length>0) setMemory(m); });
 }
 }, [profile, sbCreds]);

 // Initialise session — inject memory automatically
 useEffect(()=>{
 if (!active||!profile) return;
 if (!sessions[active]) {
 const board = profile.examBoards?.[active];
 const pastSessions = memory[active]||[];
 const memNote = pastSessions.length
 ? `\n\n🧠 Memory loaded: ${pastSessions.length} past session${pastSessions.length>1?"s":""} — I remember your history and will pick up where we left off.`
 : "";
 const welcomes = {
 spanish:`¡Hola ${profile.name}! I'm Señora López.${board?` ${board} Spanish — perfect.`:""} ${memNote||""}\n\nWhat shall we work on? ¿Qué prefieres?`,
 science:`Hello ${profile.name}! I'm Dr. Patel.${board?` ${board} ${profile.tier}.`:""}${memNote||""}\n\nBiology, Chemistry or Physics today?`,
 math:`Hi ${profile.name}! I'm Mr. Chen.${board?` ${profile.tier} ${board}.`:""}${memNote||""}\n\nWhat are we working on?`,
 english:`Hello ${profile.name}! I'm Ms. Williams.${board?` ${board} Language & Literature.`:""}${memNote||""}\n\nWhere shall we start?`,
 };
 setSessions(p=>({...p,[active]:{messages:[{role:"assistant",content:welcomes[active]}]}}));
 }
 },[active,profile]);

 useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"})},[sessions,loading]);
 useEffect(()=>{ if(active) inputRef.current?.focus(); },[active]);

 // Auto-save summary when leaving a subject after enough messages
 function handleSetActive(newActive) {
 if (active && msgs.length >= 6 && !autoSumming) {
 autoSaveSummary(active, msgs, memory[active]||[]);
 }
 setActive(newActive);
 setExamMode(false);
 }

 async function autoSaveSummary(tid, messages, existingSummaries) {
 setAutoSumming(true);
 const sys = buildSysPrompt(tid, profile, existingSummaries, mats[tid]||[]);
 try {
 const r = await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:800,system:sys,messages:[...messages.map(m=>({role:m.role,content:m.content})),{role:"user",content:SUMMARY_PROMPT}]})});
 const d = await r.json();
 if (d.error) { setAutoSumming(false); return; }
 const txt = d.content.map(b=>b.text||"").join("");
 const today = new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
 const newEntry={date:today,text:txt};
 setMemory(prev=>{
 const updated = {...prev,[tid]:[...(prev[tid]||[]),newEntry]};
 saveMemory(updated);
 return updated;
 });
 dbSave(sbCreds.url, sbCreds.key, profile.name, tid, today, txt);
 } catch {} finally { setAutoSumming(false); }
 }

 async function send(override) {
 const text = override||input.trim();
 if (!text||loading) return;
 const userMsg={role:"user",content:text};
 const updated=[...msgs,userMsg];
 setSessions(p=>({...p,[active]:{...p[active],messages:updated}}));
 if (!override) setInput("");
 setLoading(true);
 const sys = (examMode?"EXAM PRACTICE MODE: student attempts first, then mark properly, show model answer.\n\n":"") + buildSysPrompt(active,profile,curMem,curMats);
 const textMats = curMats.filter(m=>m.isText);
 const fullSys = (textMats.length?`TEACHER MATERIALS:\n${textMats.map(m=>`[${m.name}]:\n${m.textContent}`).join("\n---\n")}\n\n---\n\n`:"") + sys;
 const apiMsgs = buildApiMsgs(curMats, updated.map(m=>({role:m.role,content:m.content})));
 try {
 let rawText = "";
 let status = 0;
 try {
 const r = await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,system:fullSys,messages:apiMsgs})});
 status = r.status;
 rawText = await r.text();
 } catch(fetchErr) {
 throw new Error(`Network error (${fetchErr.name}): ${fetchErr.message}`);
 }
 let d;
 try { d = JSON.parse(rawText); } catch {
 throw new Error(`HTTP ${status} — not valid JSON. Response: "${rawText.slice(0,300)}"`);
 }
 if (d.error) throw new Error(`API error ${d.error.type} (HTTP ${status}): ${d.error.message}`);
 if (!d.content) throw new Error(`Unexpected response shape (HTTP ${status}): ${JSON.stringify(d).slice(0,200)}`);
 const reply = d.content.map(b=>b.text||"").join("");
 setSessions(p=>({...p,[active]:{...p[active],messages:[...updated,{role:"assistant",content:reply}]}}));
 } catch(e) {
 setSessions(p=>({...p,[active]:{...p[active],messages:[...updated,{role:"assistant",content:`❌ ${e.message}`}]}}));
 } finally { setLoading(false); }
 }

 async function genSummary() {
 if (msgs.length<3||sumLoading) return;
 setSumLoading(true);
 const sys = buildSysPrompt(active,profile,curMem,curMats);
 try {
 const r = await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,system:sys,messages:[...msgs.map(m=>({role:m.role,content:m.content})),{role:"user",content:SUMMARY_PROMPT}]})});
 const d = await r.json();
 const txt = d.content.map(b=>b.text||"").join("");
 const today = new Date().toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"});
 const newSummary = {date:today,text:txt};
 setMemory(prev=>{ const u={...prev,[active]:[...(prev[active]||[]),newSummary]}; saveMemory(u); return u; });
 dbSave(sbCreds.url, sbCreds.key, profile.name, active, today, txt);
 setShowSum(txt);
 } catch(e){console.error(e);} finally { setSumLoading(false); }
 }

 function clearSubjectMemory(tid) { setMemory(p=>{const u={...p,[tid]:[]}; saveMemory(u); return u;}); }
 function clearAllMemory() { setMemory({}); saveMemory({}); setShowMemMgr(false); }

 if (!apiKey) return <ApiKeyScreen onDone={k=>{saveApiKey(k);setApiKey(k);}}/>;
 if (!profile) return <Setup onDone={p=>{saveProfile(p);setProfile(p);}}/>;

 const totalMem = Object.values(memory).reduce((a,s)=>a+(s?.length||0),0);
 const fonts = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Source+Sans+3:wght@400;600;700&display=swap');`;

 return (
 <div style={{minHeight:"100vh",background:active?tutor.bg:"#f5f4f0",fontFamily:"'Source Sans 3',sans-serif",transition:"background .4s"}}>
 <style>{`${fonts}*{box-sizing:border-box;margin:0;padding:0}@keyframes mi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes db{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-7px)}}@keyframes ci{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}textarea{outline:none}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#ddd;border-radius:3px}.btn{transition:all .2s}.btn:hover{opacity:.85}.card{transition:all .25s;cursor:pointer}.card:hover{transform:translateY(-4px)}`}</style>

 {showSbSettings&&<SupabaseSettings initialUrl={sbCreds.url} initialKey={sbCreds.key} onSave={(url,key)=>{setSbCreds({url,key});setSbSynced(false);}} onClose={()=>setShowSbSettings(false)}/>}
 {showMats&&active&&<MaterialsPanel tutor={tutor} mats={curMats} onAdd={f=>setMats(p=>({...p,[active]:[...p[active],...f]}))} onRemove={id=>setMats(p=>({...p,[active]:p[active].filter(m=>m.id!==id)}))} onClose={()=>setShowMats(false)}/>}
 {showDash&&<Dashboard sessions={sessions} memory={memory} mats={mats} profile={profile} onClose={()=>setShowDash(false)}/>}
 {showMemMgr&&<MemoryManager memory={memory} profile={profile} onClearSubject={clearSubjectMemory} onClearAll={clearAllMemory} onClose={()=>setShowMemMgr(false)}/>}

 {/* Summary modal */}
 {showSum&&(
 <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999,padding:20}}>
 <div style={{background:"#fff",borderRadius:20,maxWidth:580,width:"100%",maxHeight:"80vh",display:"flex",flexDirection:"column",boxShadow:"0 24px 60px rgba(0,0,0,0.3)"}}>
 <div style={{background:tutor.grad,borderRadius:"20px 20px 0 0",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
 <div><div style={{color:"rgba(255,255,255,0.7)",fontSize:11}}>SAVED TO MEMORY AUTOMATICALLY</div><div style={{color:"#fff",fontWeight:"700",fontSize:15}}>📋 Session Summary — {tutor.subject}</div></div>
 <button onClick={()=>setShowSum(null)} style={{background:"rgba(255,255,255,0.2)",border:"none",color:"#fff",borderRadius:8,padding:"5px 10px",cursor:"pointer"}}>✕</button>
 </div>
 <div style={{overflowY:"auto",padding:"16px 20px",flex:1}}>
 <pre style={{whiteSpace:"pre-wrap",fontFamily:"'Source Sans 3',sans-serif",fontSize:13,lineHeight:1.7,color:"#333"}}>{showSum}</pre>
 </div>
 <div style={{padding:"12px 20px",borderTop:"1px solid #eee",display:"flex",gap:8}}>
 <button onClick={()=>navigator.clipboard.writeText(showSum)} style={{flex:1,padding:10,borderRadius:10,border:`2px solid ${tutor.color}`,background:"transparent",color:tutor.color,fontWeight:"700",cursor:"pointer",fontSize:13}}>📋 Copy</button>
 <button onClick={()=>setShowSum(null)} style={{flex:1,padding:10,borderRadius:10,border:"none",background:tutor.color,color:"#fff",fontWeight:"700",cursor:"pointer",fontSize:13}}>✓ Done</button>
 </div>
 </div>
 </div>
 )}

 {/* Header */}
 <div style={{padding:"12px 22px",display:"flex",alignItems:"center",gap:10,background:"rgba(255,255,255,0.88)",backdropFilter:"blur(12px)",borderBottom:"1px solid rgba(0,0,0,0.07)",position:"sticky",top:0,zIndex:100}}>
 {active&&<button onClick={()=>handleSetActive(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:"#666",padding:"4px 8px",borderRadius:8}}>←</button>}
 <div style={{flex:1}}>
 <div style={{fontSize:10,color:"#aaa",letterSpacing:"0.08em",textTransform:"uppercase"}}>{profile.name} · {profile.year} · {profile.tier}{autoSumming?" · saving memory...":""}</div>
 <div style={{fontSize:17,fontWeight:"700",color:"#1a1a2e",fontFamily:"'Playfair Display',serif",lineHeight:1.2}}>{active?`${tutor.emoji} ${tutor.name}`:"Your Tutor Hub"}</div>
 </div>
 {active&&(
 <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
 <button className="btn" onClick={()=>setShowMats(true)} style={{padding:"5px 10px",borderRadius:20,border:"none",cursor:"pointer",background:curMats.length?tutor.color:"rgba(0,0,0,0.07)",color:curMats.length?"#fff":"#666",fontSize:11,fontWeight:"700"}}>
 📎 {curMats.length?`${curMats.length} File${curMats.length>1?"s":""}` :"Materials"}
 </button>
 <button className="btn" onClick={()=>setExamMode(e=>!e)} style={{padding:"5px 10px",borderRadius:20,border:"none",cursor:"pointer",background:examMode?tutor.color:"rgba(0,0,0,0.07)",color:examMode?"#fff":"#666",fontSize:11,fontWeight:"700"}}>
 📝 {examMode?"Exam ON":"Exam"}
 </button>
 <button className="btn" onClick={genSummary} disabled={sumLoading||msgs.length<3} style={{padding:"5px 10px",borderRadius:20,border:"none",cursor:"pointer",background:msgs.length>=3?tutor.color:"rgba(0,0,0,0.07)",color:msgs.length>=3?"#fff":"#aaa",fontSize:11,fontWeight:"700",opacity:sumLoading?.6:1}}>
 {sumLoading?"Saving...":"📋 Summary"}
 </button>
 </div>
 )}
 <div style={{display:"flex",gap:5}}>
 <button className='btn' onClick={()=>setShowSbSettings(true)} style={{padding:'6px 10px',borderRadius:20,border:'2px solid rgba(0,0,0,0.1)',background:sbCreds.url?'#1a1a2e':'transparent',color:sbCreds.url?'#fff':'#444',fontSize:11,fontWeight:'700',cursor:'pointer'}}>{sbCreds.url?'Connected':'Connect DB'}</button>
 <button className="btn" onClick={()=>setShowMemMgr(true)} style={{padding:"6px 10px",borderRadius:20,border:"2px solid rgba(0,0,0,0.1)",background:"transparent",color:"#444",fontSize:11,fontWeight:"700",cursor:"pointer",position:"relative"}}>
 🧠 Memory{totalMem>0?` (${totalMem})`:""}
 </button>
 <button className="btn" onClick={()=>setShowDash(true)} style={{padding:"6px 10px",borderRadius:20,border:"2px solid rgba(0,0,0,0.1)",background:"transparent",color:"#444",fontSize:11,fontWeight:"700",cursor:"pointer"}}>
 👨‍👧 Parent
 </button>
 </div>
 </div>

 {/* Home screen */}
 {!active?(
 <div style={{maxWidth:640,margin:"0 auto",padding:"44px 22px"}}>
 <h1 style={{fontSize:32,fontWeight:"900",fontFamily:"'Playfair Display',serif",color:"#1a1a2e",marginBottom:8}}>Hello, {profile.name}.<br/><span style={{color:"#888",fontWeight:"400"}}>Who's tutoring you today?</span></h1>
 <p style={{color:"#999",fontSize:13,marginBottom:28,lineHeight:1.6}}>{totalMem>0?`🧠 ${totalMem} session${totalMem>1?"s":""} in memory — your tutors remember your progress.`:"Your tutors adapt to you and remember your progress after each session."}</p>
 <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:28}}>
 {Object.values(T).map((t,i)=>{
 const sc=memory[t.id]?.length||0, mc=mats[t.id]?.length||0;
 return (
 <div key={t.id} className="card" onClick={()=>handleSetActive(t.id)} style={{borderRadius:18,overflow:"hidden",boxShadow:"0 4px 20px rgba(0,0,0,0.07)",animation:`ci .4s ease ${i*.08}s both`}}>
 <div style={{background:t.grad,padding:"20px 18px 16px"}}>
 <div style={{fontSize:32,marginBottom:6}}>{t.emoji}</div>
 <div style={{fontFamily:"'Playfair Display',serif",color:"#fff",fontSize:17,fontWeight:"700"}}>{t.name}</div>
 <div style={{color:"rgba(255,255,255,0.6)",fontSize:12,marginTop:2}}>{t.subject}</div>
 </div>
 <div style={{background:"#fff",padding:"10px 18px"}}>
 <div style={{fontSize:11,color:"#aaa",marginBottom:4}}>{t.desc}</div>
 <div style={{fontSize:12,color:t.color,fontWeight:"700"}}>{sc===0?"No sessions yet":`🧠 ${sc} session${sc>1?"s":""} remembered`}</div>
 {mc>0&&<div style={{fontSize:11,color:"#888",marginTop:2}}>📎 {mc} material{mc>1?"s":""} ready</div>}
 </div>
 </div>
 );
 })}
 </div>
 <div style={{background:"#fff",borderRadius:14,padding:"18px 20px",border:"1px solid #eee"}}>
 <div style={{fontSize:11,fontWeight:"700",letterSpacing:"0.08em",color:"#bbb",textTransform:"uppercase",marginBottom:10}}>💡 Tips</div>
 {[["Memory is automatic","Summaries save after each session and inject into the next automatically."],["Upload materials","Tap 📎 to upload worksheets or photos — tutor uses them directly."],["Test prep","Upload notes then ask 'Prepare me for my test'."],["Export backup","Tap 🧠 Memory → Export to save progress to a file."]].map(([t,d])=>(
 <div key={t} style={{display:"flex",gap:10,marginBottom:8}}>
 <div style={{fontWeight:"700",color:"#1a1a2e",fontSize:12,minWidth:150}}>{t}</div>
 <div style={{color:"#888",fontSize:12}}>{d}</div>
 </div>
 ))}
 </div>
 </div>
 ):(
 /* Chat */
 <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 61px)"}}>
 {examMode&&<div style={{background:tutor.color,color:"#fff",textAlign:"center",padding:"6px",fontSize:11,fontWeight:"700",letterSpacing:"0.04em"}}>📝 EXAM PRACTICE — Attempt the question first. Tutor will mark it properly.</div>}
 <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>
 <div style={{maxWidth:680,margin:"0 auto"}}>
 {msgs.map((m,i)=>(
 <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:10,animation:"mi .25s ease"}}>
 <div style={{maxWidth:"78%",padding:"11px 15px",borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:m.role==="user"?tutor.color:"#fff",color:m.role==="user"?"#fff":"#1a1a2e",fontSize:14,lineHeight:1.65,boxShadow:m.role==="user"?`0 4px 14px ${tutor.color}40`:"0 2px 10px rgba(0,0,0,0.07)",border:m.role==="user"?"none":"1px solid rgba(0,0,0,0.07)",whiteSpace:"pre-wrap"}}>
 {m.content}
 </div>
 </div>
 ))}
 {loading&&<div style={{display:"flex"}}><div style={{background:"#fff",borderRadius:18,padding:"10px 14px",boxShadow:"0 2px 10px rgba(0,0,0,0.07)"}}><div style={{display:"flex",gap:5}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:tutor.color,animation:`db 1.2s ease ${i*.2}s infinite`}}/>)}</div></div></div>}
 <div ref={bottomRef}/>
 </div>
 </div>
 {/* Quick prompts */}
 <div style={{padding:"0 22px 5px"}}>
 <div style={{maxWidth:680,margin:"0 auto",display:"flex",gap:6,overflowX:"auto",paddingBottom:2}}>
 {[examMode?"Here's my answer:":curMats.length?"Quiz me on my materials":"Can you quiz me?",curMats.length?"Prepare me for my test":"How am I doing?","How am I doing?",curMats.length?"Summarise my notes":"What should I focus on?"].filter((v,i,a)=>a.indexOf(v)===i).map(q=>(
 <button key={q} onClick={()=>send(q)} style={{padding:"5px 11px",borderRadius:20,border:`1.5px solid ${tutor.color}`,background:"transparent",color:tutor.color,cursor:"pointer",fontSize:11,fontWeight:"700",whiteSpace:"nowrap",transition:"all .15s"}}>
 {q}
 </button>
 ))}
 </div>
 </div>
 {/* Input */}
 <div style={{padding:"5px 22px 16px",background:"rgba(255,255,255,0.9)",backdropFilter:"blur(10px)",borderTop:"1px solid rgba(0,0,0,0.07)"}}>
 <div style={{maxWidth:680,margin:"0 auto",display:"flex",gap:8,alignItems:"flex-end"}}>
 <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} placeholder={examMode?"Paste your past paper question or attempt here...":`Message ${tutor.name}...`} rows={1}
 style={{flex:1,padding:"12px 15px",borderRadius:14,border:`2px solid ${input?tutor.color:"#e0e0e0"}`,resize:"none",fontSize:14,lineHeight:1.5,background:"#fff",maxHeight:120,overflow:"auto",transition:"border-color .2s"}}
 onInput={e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,120)+"px"}}/>
 <button onClick={()=>send()} disabled={!input.trim()||loading} style={{width:42,height:42,borderRadius:12,border:"none",flexShrink:0,background:input.trim()&&!loading?tutor.color:"#e8e8e8",color:input.trim()&&!loading?"#fff":"#bbb",fontSize:17,cursor:input.trim()&&!loading?"pointer":"default",transition:"all .2s"}}>↑</button>
 </div>
 <div style={{maxWidth:680,margin:"4px auto 0",fontSize:10,color:"#bbb",paddingLeft:2}}>Enter to send · Shift+Enter new line</div>
 </div>
 </div>
 )}
 </div>
 );
}
