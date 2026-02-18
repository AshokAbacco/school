// src/admin/pages/classes/AddClass.jsx
import React, { useState } from "react";
import { X, Plus, Trash2, BookOpen, ChevronDown, ChevronUp } from "lucide-react";

const S = {
  overlay: { position:"fixed",inset:0,background:"rgba(15,23,42,0.55)",backdropFilter:"blur(3px)",zIndex:50,display:"flex",alignItems:"center",justifyContent:"center",padding:"16px" },
  modal: { background:"#fff",width:"100%",maxWidth:"560px",borderRadius:"16px",boxShadow:"0 20px 60px rgba(0,0,0,0.15)",maxHeight:"90vh",overflowY:"auto",fontFamily:"'Inter',system-ui,sans-serif" },
  header: { padding:"24px 24px 0",position:"sticky",top:0,background:"#fff",zIndex:2,borderRadius:"16px 16px 0 0" },
  iconBox: { width:40,height:40,background:"#4f46e5",borderRadius:"10px",display:"flex",alignItems:"center",justifyContent:"center" },
  label: { display:"block",fontSize:"12px",fontWeight:600,color:"#374151",marginBottom:"5px",textTransform:"uppercase",letterSpacing:"0.4px" },
  input: { width:"100%",padding:"9px 12px",border:"1.5px solid #e5e7eb",borderRadius:"8px",fontSize:"14px",outline:"none",fontFamily:"inherit",color:"#111827",boxSizing:"border-box",background:"#fff",transition:"border .15s,box-shadow .15s" },
  sectionCard: { border:"1.5px solid #e5e7eb",borderRadius:"12px",padding:"16px",marginBottom:"12px",background:"#fafafa",position:"relative" },
  sectionBadge: { display:"inline-flex",alignItems:"center",gap:"6px",background:"#eef2ff",color:"#4f46e5",borderRadius:"6px",padding:"4px 10px",fontSize:"13px",fontWeight:600 },
  addSecBtn: { display:"flex",alignItems:"center",gap:"8px",padding:"10px 16px",border:"1.5px dashed #6366f1",borderRadius:"10px",background:"#eef2ff",color:"#4f46e5",fontWeight:600,fontSize:"13px",cursor:"pointer",width:"100%",justifyContent:"center",boxSizing:"border-box" },
  cancelBtn: { padding:"9px 20px",border:"1.5px solid #e5e7eb",borderRadius:"8px",background:"#fff",color:"#374151",fontWeight:600,fontSize:"14px",cursor:"pointer",fontFamily:"inherit" },
  saveBtn: { padding:"9px 24px",background:"#4f46e5",border:"none",borderRadius:"8px",color:"#fff",fontWeight:700,fontSize:"14px",cursor:"pointer",fontFamily:"inherit" },
};

const emptySection = (i) => ({ name: String.fromCharCode(65 + i), room:"", teacher:"", capacity:"" });

export default function AddClass({ closeModal }) {
  const [className, setClassName] = useState("");
  const [classRoom, setClassRoom] = useState("");
  const [classTeacher, setClassTeacher] = useState("");
  const [classCapacity, setClassCapacity] = useState("");
  const [sections, setSections] = useState([]);
  const [collapsed, setCollapsed] = useState({});
  const hasSections = sections.length > 0;

  const addSection = () => setSections(prev => [...prev, emptySection(prev.length)]);
  const removeSection = (i) => setSections(s => s.filter((_, idx) => idx !== i));
  const updateSection = (i, key, val) => setSections(s => s.map((sec, idx) => idx===i ? {...sec,[key]:val} : sec));
  const toggleCollapse = (i) => setCollapsed(c => ({ ...c, [i]: !c[i] }));

  const onFocus = e => { e.target.style.borderColor="#6366f1"; e.target.style.boxShadow="0 0 0 3px rgba(99,102,241,0.1)"; };
  const onBlur  = e => { e.target.style.borderColor="#e5e7eb"; e.target.style.boxShadow="none"; };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = hasSections ? { className, sections } : { className, room:classRoom, teacher:classTeacher, capacity:classCapacity };
    console.log("New Class:", payload);
    closeModal();
  };

  const Row = ({ children }) => <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>{children}</div>;
  const Field = ({ label, children }) => <div><label style={S.label}>{label}</label>{children}</div>;

  return (
    <div style={S.overlay}>
      <div style={S.modal}>

        {/* HEADER */}
        <div style={S.header}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"18px" }}>
            <div style={{ display:"flex",alignItems:"center",gap:"12px" }}>
              <div style={S.iconBox}><BookOpen size={18} color="#fff"/></div>
              <div>
                <h2 style={{ margin:0,fontSize:"18px",fontWeight:700,color:"#111827" }}>Add New Class</h2>
                <p style={{ margin:0,fontSize:"12px",color:"#6b7280" }}>
                  {hasSections ? `${sections.length} section${sections.length>1?"s":""} added` : "Single class · add sections if needed"}
                </p>
              </div>
            </div>
            <button onClick={closeModal} style={{ border:"none",background:"#f3f4f6",borderRadius:"8px",padding:"7px",cursor:"pointer",display:"flex" }}>
              <X size={16} color="#6b7280"/>
            </button>
          </div>
          <div style={{ height:"1px",background:"#f3f4f6" }}/>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} style={{ padding:"20px 24px 24px" }}>

          {/* Class Name */}
          <Field label="Class Name">
            <input style={S.input} placeholder="e.g. Class 10, Class 8 ..." value={className}
              onChange={e=>setClassName(e.target.value)} onFocus={onFocus} onBlur={onBlur} required/>
          </Field>

          {/* ── SIMPLE MODE: no sections ── */}
          {!hasSections && (
            <div style={{ marginTop:"14px",padding:"16px",border:"1.5px solid #e5e7eb",borderRadius:"12px",background:"#fafafa" }}>
              <p style={{ margin:"0 0 12px",fontSize:"11px",fontWeight:600,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.5px" }}>Class Details</p>
              <Row>
                <Field label="Room Number">
                  <input style={S.input} placeholder="101" value={classRoom} onChange={e=>setClassRoom(e.target.value)} onFocus={onFocus} onBlur={onBlur}/>
                </Field>
                <Field label="Capacity">
                  <input style={S.input} type="number" placeholder="40" value={classCapacity} onChange={e=>setClassCapacity(e.target.value)} onFocus={onFocus} onBlur={onBlur}/>
                </Field>
              </Row>
              <div style={{ marginTop:"12px" }}>
                <Field label="Class Teacher">
                  <input style={S.input} placeholder="Teacher name" value={classTeacher} onChange={e=>setClassTeacher(e.target.value)} onFocus={onFocus} onBlur={onBlur}/>
                </Field>
              </div>
            </div>
          )}

          {/* ── SECTION CARDS ── */}
          {hasSections && (
            <div style={{ marginTop:"16px" }}>
              <p style={{ margin:"0 0 10px",fontSize:"11px",fontWeight:600,color:"#9ca3af",textTransform:"uppercase",letterSpacing:"0.5px" }}>Sections</p>
              {sections.map((sec, i) => (
                <div key={i} style={S.sectionCard}>
                  {/* Card header */}
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:collapsed[i]?0:"14px" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap" }}>
                      <span style={S.sectionBadge}>Section {sec.name||String.fromCharCode(65+i)}</span>
                      {sec.teacher && <span style={{ fontSize:"12px",color:"#6b7280" }}>{sec.teacher}</span>}
                      {sec.room && <span style={{ fontSize:"12px",color:"#9ca3af" }}>· Room {sec.room}</span>}
                    </div>
                    <div style={{ display:"flex",gap:"6px",flexShrink:0 }}>
                      <button type="button" onClick={()=>toggleCollapse(i)} style={{ border:"none",background:"#ede9fe",borderRadius:"6px",padding:"5px 8px",cursor:"pointer",display:"flex",color:"#6366f1" }}>
                        {collapsed[i] ? <ChevronDown size={15}/> : <ChevronUp size={15}/>}
                      </button>
                      <button type="button" onClick={()=>removeSection(i)} style={{ border:"none",background:"#fef2f2",borderRadius:"6px",padding:"5px 8px",cursor:"pointer",display:"flex" }}>
                        <Trash2 size={15} color="#ef4444"/>
                      </button>
                    </div>
                  </div>

                  {!collapsed[i] && (
                    <>
                      <Row>
                        <Field label="Section Name">
                          <input style={S.input} placeholder="A" value={sec.name} onChange={e=>updateSection(i,"name",e.target.value)} onFocus={onFocus} onBlur={onBlur}/>
                        </Field>
                        <Field label="Room Number">
                          <input style={S.input} placeholder="101" value={sec.room} onChange={e=>updateSection(i,"room",e.target.value)} onFocus={onFocus} onBlur={onBlur}/>
                        </Field>
                      </Row>
                      <div style={{ marginTop:"12px" }}>
                        <Row>
                          <Field label="Class Teacher">
                            <input style={S.input} placeholder="Teacher name" value={sec.teacher} onChange={e=>updateSection(i,"teacher",e.target.value)} onFocus={onFocus} onBlur={onBlur}/>
                          </Field>
                          <Field label="Capacity">
                            <input style={S.input} type="number" placeholder="40" value={sec.capacity} onChange={e=>updateSection(i,"capacity",e.target.value)} onFocus={onFocus} onBlur={onBlur}/>
                          </Field>
                        </Row>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ADD SECTION BUTTON */}
          <div style={{ marginTop:"14px" }}>
            <button type="button" onClick={addSection} style={S.addSecBtn}>
              <Plus size={16}/> Add Section
            </button>
          </div>

          {/* LIVE PREVIEW PILL */}
          {className && (
            <div style={{ marginTop:"14px",padding:"11px 16px",background:"#f0fdf4",border:"1.5px solid #bbf7d0",borderRadius:"10px",display:"flex",alignItems:"center",gap:"8px",flexWrap:"wrap" }}>
              <span style={{ fontSize:"13px",fontWeight:700,color:"#15803d" }}>{className}</span>
              {hasSections
                ? <span style={{ fontSize:"13px",color:"#16a34a" }}>— {sections.length} Section{sections.length>1?"s":""}: {sections.map(s=>s.name||"?").join(", ")}</span>
                : <span style={{ fontSize:"13px",color:"#16a34a" }}>— No sections (single class)</span>
              }
            </div>
          )}

          {/* ACTIONS */}
          <div style={{ display:"flex",justifyContent:"flex-end",gap:"10px",marginTop:"20px",paddingTop:"16px",borderTop:"1px solid #f3f4f6" }}>
            <button type="button" onClick={closeModal} style={S.cancelBtn}>Cancel</button>
            <button type="submit" style={S.saveBtn}>Save Class</button>
          </div>
        </form>
      </div>
    </div>
  );
}