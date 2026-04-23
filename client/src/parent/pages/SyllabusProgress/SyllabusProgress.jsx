import React, { useEffect, useState } from "react";
import { getToken } from "../../../auth/storage";
import { BookOpen, CheckSquare, BarChart2, ArrowLeft } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

const C = {
  slate: "#6A89A7", mist: "#BDDDFC", sky: "#88BDF2", deep: "#384959",
  deepDark: "#243340", bg: "#EDF3FA", white: "#FFFFFF",
  border: "#C8DCF0", borderLight: "#DDE9F5", text: "#243340",
  textLight: "#6A89A7", green: "#22c55e", teal: "#1D9E75",
};

function getBarColor(pct) {
  if (pct === 100) return C.teal;
  if (pct >= 60) return C.sky;
  if (pct >= 30) return "#BA7517";
  return "#D85A30";
}

function initials(name = "") {
  return name.trim().split(/\s+/).map(w => w[0] ?? "").join("").toUpperCase().slice(0, 2) || "?";
}

function ChildSelector({ children, selectedId, onChange }) {
  if (!children || children.length <= 1) return null;
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <p style={{ margin: "0 0 10px", fontSize: "10px", fontWeight: 800, color: C.textLight, textTransform: "uppercase", letterSpacing: "0.10em" }}>
        Select Child
      </p>
      <div className="no-scrollbar" style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px", WebkitOverflowScrolling: "touch" }}>
        {children.map((child) => {
          const active = child.studentId === selectedId;
          return (
            <button key={child.studentId} onClick={() => onChange(child.studentId)} style={{
              flexShrink: 0, display: "flex", alignItems: "center", gap: "10px",
              padding: "8px 12px", borderRadius: "12px", cursor: "pointer", transition: "all 0.15s", outline: "none",
              border: active ? `1.5px solid ${C.sky}` : `1.5px solid ${C.borderLight}`,
              background: active ? `${C.sky}22` : C.white,
            }}>
              <div style={{
                width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0, fontSize: "11px", fontWeight: 900,
                background: active ? `linear-gradient(135deg, ${C.sky}, ${C.deep})` : `linear-gradient(135deg, ${C.mist}, ${C.borderLight})`,
                display: "flex", alignItems: "center", justifyContent: "center", color: active ? C.white : C.textLight,
              }}>
                {initials(child.name)}
              </div>
              <div style={{ textAlign: "left" }}>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: active ? 700 : 500, color: active ? C.deep : C.textLight, whiteSpace: "nowrap" }}>
                  {child.name}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatCards({ data }) {
  const totalSubjects = data.subjects?.length ?? 0;
  const completedSubjects = data.subjects?.filter(s => s.percentage === 100).length ?? 0;
  const overall = data.overall ?? {};
  const accentColor = getBarColor(overall.pct ?? 0);

  const cards = [
    { label: "TOTAL SUBJECTS", value: totalSubjects, sub: "this term", accent: C.sky, Icon: BookOpen },
    { label: "COMPLETED", value: completedSubjects, sub: `of ${totalSubjects}`, accent: C.teal, Icon: CheckSquare },
    { label: "OVERALL PROGRESS", value: `${overall.pct ?? 0}%`, sub: `${overall.completed ?? 0} chapters`, accent: accentColor, Icon: BarChart2 },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card) => (
        <div key={card.label} className="stat-card" style={{ borderTop: `3px solid ${card.accent}` }}>
          <div>
            <p className="stat-label">{card.label}</p>
            <p className="stat-value">{card.value}</p>
            <p className="stat-sub">{card.sub}</p>
          </div>
          <div className="stat-icon-wrapper" style={{ background: `${card.accent}15`, border: `1px solid ${card.accent}30` }}>
            <card.Icon size={20} color={card.accent} />
          </div>
        </div>
      ))}
    </div>
  );
}

function SubjectCard({ subject, isOpen, onToggle }) {
  const { subjectName, totalChapters, completedChapters, percentage, chapters, completedChapterIndices } = subject;
  const barColor = getBarColor(percentage);
  
  return (
    <div onClick={onToggle} className={`subj-card ${isOpen ? 'active' : ''}`} style={{
      border: isOpen ? `1.5px solid ${C.sky}` : `1.5px solid ${C.borderLight}`,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
        <div style={{ fontSize: "1rem", fontWeight: 700, color: C.text }}>{subjectName}</div>
        <span style={{ fontSize: "1rem", fontWeight: 800, color: barColor }}>{percentage}%</span>
      </div>
      
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: C.textLight, marginBottom: "10px" }}>
        <span>{completedChapters}/{totalChapters} chapters</span>
        <span style={{ fontWeight: 700, color: barColor }}>{percentage === 100 ? "COMPLETED" : "IN PROGRESS"}</span>
      </div>

      <div style={{ height: "8px", background: C.bg, borderRadius: "10px", overflow: "hidden" }}>
        <div style={{ width: `${percentage}%`, background: barColor, height: "100%", transition: "width 0.8s ease" }} />
      </div>
      
      {!isOpen && <div className="view-hint">Tap to view chapters</div>}

      {isOpen && chapters && (
        <div className="chapter-list">
          {chapters.map((ch, idx) => {
            const done = completedChapterIndices?.includes(idx);
            return (
              <div key={idx} className="chapter-item">
                <div className={`check-circle ${done ? 'done' : ''}`}>
                   {done && <CheckSquare size={12} color={C.teal} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: C.text }}>Ch {idx + 1}. {ch.name}</div>
                  <div style={{ fontSize: "11px", color: C.textLight }}>{done ? "Completed" : "Pending"}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SyllabusProgress() {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [openCardId, setOpenCardId] = useState(null);

  useEffect(() => { fetchChildren(); }, []);

  const fetchChildren = async () => {
    try {
      const res = await fetch(`${API}/api/parent/students`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const json = await res.json();
      const list = (json.data || []).map(s => ({ studentId: s.id, name: s.name, className: s.enrollment?.className ?? null }));
      setChildren(list);
      if (list.length > 0) setSelectedChild(list[0].studentId);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { if (selectedChild) fetchProgress(); }, [selectedChild]);

  const fetchProgress = async () => {
    try {
      setLoading(true); setOpenCardId(null);
      const res = await fetch(`${API}/api/parent/syllabus-progress?studentId=${selectedChild}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const json = await res.json();
      setData(json);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  if (loading || !data) return <div className="loader">Loading progress…</div>;

  const activeSubject = data.subjects?.find(s => s.subjectId === openCardId);

  return (
    <div className="page-container">
      <style>{`
        /* Global Reset to ensure padding doesn't break width */
        * { box-sizing: border-box; }

        .page-container { 
          min-height: 100vh; 
          background: ${C.bg}; 
          padding: 1rem; /* Base mobile padding */
          font-family: 'Inter', sans-serif; 
          width: 100%;
          overflow-x: hidden;
        }

        .stats-grid { 
          display: grid; 
          grid-template-columns: 1fr; 
          gap: 12px; 
          margin-bottom: 24px; 
          width: 100%;
        }

        .stat-card { 
          background: white; 
          padding: 16px; 
          border-radius: 14px; 
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.04); 
        }

        .subject-grid { 
          display: grid; 
          grid-template-columns: 1fr; /* Single column on mobile */
          gap: 16px; 
          width: 100%;
        }

        .subj-card { 
          background: white; 
          padding: 1.25rem; 
          border-radius: 16px; 
          cursor: pointer; 
          width: 100%; /* Ensure it fits the container */
          box-shadow: 0 4px 12px rgba(0,0,0,0.03); 
        }

        .stat-label { font-size: 9px; font-weight: 800; color: ${C.textLight}; margin: 0; text-transform: uppercase; }
        .stat-value { font-size: 22px; font-weight: 800; margin: 4px 0; color: ${C.text}; }
        .stat-sub { font-size: 11px; color: ${C.textLight}; margin: 0; }
        .stat-icon-wrapper { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
        
        .view-hint { margin-top: 12px; text-align: center; font-size: 11px; font-weight: 700; color: ${C.sky}; text-transform: uppercase; }
        
        .chapter-list { margin-top: 1rem; border-top: 1px solid ${C.borderLight}; padding-top: 1rem; }
        .chapter-item { display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
        .check-circle { width: 20px; height: 20px; border-radius: 50%; background: ${C.bg}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .check-circle.done { background: rgba(29,158,117,0.1); }
        
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .loader { padding: 50px; text-align: center; color: ${C.textLight}; font-weight: 600; }

        .fade-in { animation: fadeIn 0.3s ease-in; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* Desktop Adjustments */
        @media (min-width: 768px) {
          .page-container { padding: 2rem 3rem; }
          .stats-grid { grid-template-columns: repeat(3, 1fr); }
          .subject-grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
        }
      `}</style>

      {!openCardId ? (
        <div className="fade-in">
          <ChildSelector children={children} selectedId={selectedChild} onChange={setSelectedChild} />
          <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "4px", color: C.text }}>Syllabus Progress</h1>
          <p style={{ fontSize: "13px", color: C.textLight, marginBottom: "24px" }}>{data.student?.name} • {data.student?.class}</p>
          
          <StatCards data={data} />
          
          <div className="subject-grid">
            {data.subjects?.map(sub => (
              <SubjectCard key={sub.subjectId} subject={sub} isOpen={false} onToggle={() => setOpenCardId(sub.subjectId)} />
            ))}
          </div>
        </div>
      ) : (
        <div className="fade-in">
          <button onClick={() => setOpenCardId(null)} style={{ background: "none", border: "none", display: "flex", alignItems: "center", gap: "8px", color: C.sky, fontWeight: 700, cursor: "pointer", marginBottom: "20px", padding: 0 }}>
            <ArrowLeft size={20} /> Back to Overview
          </button>
          <div style={{ width: "100%", maxWidth: "600px", margin: "0 auto" }}>
            <SubjectCard subject={activeSubject} isOpen={true} onToggle={() => {}} />
          </div>
        </div>
      )}
    </div>
  );
}