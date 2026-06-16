import React, { useState, useEffect, useRef } from "react";
import { Users, Search, Monitor, CreditCard, CheckCircle, XCircle, ChevronRight, X, UserCheck, AlertCircle } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;
const BASE    = `${API_URL}/api/biometric`;

const PERSON_TYPES = ["STUDENT", "TEACHER", "STAFF", "ADMIN", "FINANCE"];
const PT_LABEL = { STUDENT:"Student", TEACHER:"Teacher", STAFF:"Staff", ADMIN:"School Admin", FINANCE:"Finance Admin" };
const PT_COLOR = {
  STUDENT: { bg:"#EEF2FF", text:"#4338CA", dot:"#6366F1", border:"#C7D2FE" },
  TEACHER: { bg:"#F0FDF4", text:"#166534", dot:"#22C55E", border:"#86EFAC" },
  STAFF:   { bg:"#FFF7ED", text:"#9A3412", dot:"#F97316", border:"#FED7AA" },
  ADMIN:   { bg:"#FDF4FF", text:"#7E22CE", dot:"#A855F7", border:"#E9D5FF" },
  FINANCE: { bg:"#FFF1F2", text:"#9F1239", dot:"#F43F5E", border:"#FECDD3" },
};

const getToken = () => { try { return JSON.parse(localStorage.getItem("auth"))?.token||null; } catch{return null;} };
const authHeaders = () => ({ "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` });

async function apiFetch(url) {
  const res=await fetch(url,{headers:authHeaders()}); const json=await res.json();
  if(!res.ok) throw new Error(json.message||"Request failed"); return json;
}
async function apiPost(url,body) {
  const res=await fetch(url,{method:"POST",headers:authHeaders(),body:JSON.stringify(body)}); const json=await res.json();
  if(!res.ok) throw new Error(json.message||"Request failed"); return json.data;
}
async function apiPatch(url) {
  const res=await fetch(url,{method:"PATCH",headers:authHeaders()}); const json=await res.json();
  if(!res.ok) throw new Error(json.message||"Request failed"); return json.data;
}

function Spinner({ size=16, color="#6366F1" }) {
  return <span style={{ display:"inline-block",width:size,height:size,border:`2px solid ${color}30`,borderTop:`2px solid ${color}`,borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0 }} />;
}
function Badge({ type }) {
  const c=PT_COLOR[type]||{bg:"#F3F4F6",text:"#374151",dot:"#9CA3AF",border:"#E5E7EB"};
  return <span style={{ background:c.bg,color:c.text,border:`1px solid ${c.border}`,display:"inline-flex",alignItems:"center",gap:4,padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:700,whiteSpace:"nowrap" }}><span style={{ width:6,height:6,borderRadius:"50%",background:c.dot,display:"inline-block",flexShrink:0 }} />{PT_LABEL[type]||type}</span>;
}
function StatusPill({ active }) {
  return <span style={{ display:"inline-flex",alignItems:"center",gap:4,background:active?"#F0FDF4":"#F9FAFB",color:active?"#166534":"#6B7280",border:`1px solid ${active?"#86EFAC":"#E5E7EB"}`,padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:700 }}>{active?<CheckCircle size={10}/>:<XCircle size={10}/>}{active?"Active":"Inactive"}</span>;
}

const MappingsTab = ({ isSuperAdmin=true, schoolId:fixedSchoolId=null, currentUserId=null }) => {
  const [schools,        setSchools]        = useState([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(fixedSchoolId||"");
  const [personType,     setPersonType]     = useState("STUDENT");
  // Student flow
  const [classes,         setClasses]        = useState([]);
  const [classesLoading,  setClassesLoading] = useState(false);
  const [selectedClass,   setSelectedClass]  = useState("");
  const [classStudents,   setClassStudents]  = useState([]);
  const [studentsLoading, setStudentsLoading]= useState(false);
  const [studentSearch,   setStudentSearch]  = useState("");
  const [selectedPerson,  setSelectedPerson] = useState(null);
  // Non-student search
  const [personSearch,   setPersonSearch]   = useState("");
  const [personResults,  setPersonResults]  = useState([]);
  const [personLoading,  setPersonLoading]  = useState(false);
  // Device + enrollment
  const [devices,        setDevices]        = useState([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [enrollmentId,   setEnrollmentId]   = useState("");
  const [submitting,     setSubmitting]     = useState(false);
  const [formError,      setFormError]      = useState("");
  const [formSuccess,    setFormSuccess]    = useState("");
  // Table
  const [mappings,     setMappings]     = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError,   setTableError]   = useState("");
  const [filterType,   setFilterType]   = useState("ALL");
  const [filterActive, setFilterActive] = useState("ALL");
  const [deactivating, setDeactivating] = useState(null);
  const searchTimer  = useRef(null);
  const isSearching  = useRef(false);

  useEffect(() => {
    if(!isSuperAdmin) return;
    setSchoolsLoading(true);
    apiFetch(`${BASE}/schools`)
      .then((j)=>setSchools(j.data||[]))
      .catch(()=>{})
      .finally(()=>setSchoolsLoading(false));
  },[isSuperAdmin]);

  useEffect(() => {
    if(!selectedSchool){ setDevices([]); setMappings([]); setClasses([]); return; }
    setDevicesLoading(true);
    apiFetch(`${BASE}/devices?schoolId=${selectedSchool}`)
      .then((j)=>setDevices(j.data||[]))
      .catch(()=>setDevices([]))
      .finally(()=>setDevicesLoading(false));
    loadMappings(selectedSchool, filterType, filterActive);
    // FIX: only reset person selection if user hasn't started searching
    if(!isSearching.current) resetPersonSelection();
  // eslint-disable-next-line
  },[selectedSchool]);

  useEffect(() => {
    if(personType!=="STUDENT"||!selectedSchool) return;
    setClassesLoading(true); setClasses([]); setSelectedClass([]); setClassStudents([]); setSelectedPerson(null);
    apiFetch(`${BASE}/classes?schoolId=${selectedSchool}`)
      .then((j)=>setClasses(j.data||[]))
      .catch(()=>setClasses([]))
      .finally(()=>setClassesLoading(false));
  },[personType,selectedSchool]);

  useEffect(() => {
    if(!selectedClass||personType!=="STUDENT") return;
    setStudentsLoading(true); setClassStudents([]); setSelectedPerson(null); setStudentSearch("");
    apiFetch(`${BASE}/persons?schoolId=${selectedSchool}&personType=STUDENT&classSectionId=${selectedClass}&q=`)
      .then((j)=>setClassStudents(j.data||[]))
      .catch(()=>setClassStudents([]))
      .finally(()=>setStudentsLoading(false));
  // eslint-disable-next-line
  },[selectedClass]);

  useEffect(() => {
    if(!selectedSchool) return;
    loadMappings(selectedSchool, filterType, filterActive);
  // eslint-disable-next-line
  },[filterType,filterActive]);

  // Non-student search effect: debounced, fires on personSearch / personType / selectedSchool change
  useEffect(() => {
    if (personType === "STUDENT" || !selectedSchool) return;

    // Cancel any in-flight debounce
    clearTimeout(searchTimer.current);

    searchTimer.current = setTimeout(() => {
      // Mark that a real search is running so resetPersonSelection won't stomp it
      isSearching.current = true;
      setPersonLoading(true);

      apiFetch(
        `${BASE}/persons?schoolId=${selectedSchool}&personType=${personType}&q=${encodeURIComponent(personSearch || "")}`
      )
        .then((j) => {
          const results = Array.isArray(j?.data)
            ? j.data
            : Array.isArray(j?.data?.data)
            ? j.data.data
            : [];

          setPersonResults(results);
        })
        .catch(() => {
          setPersonResults([]);
        })
        .finally(() => {
          setPersonLoading(false);
          isSearching.current = false;
        });
    }, 300);

    return () => clearTimeout(searchTimer.current);
  }, [personSearch, personType, selectedSchool]);

  // FIX: When personType changes, reset person selection BUT also clear
  //      stale results so the new type starts fresh. The search effect above
  //      will fire immediately after and re-populate.
  useEffect(() => {
    resetPersonSelection();
  // eslint-disable-next-line
  }, [personType]);

  function resetPersonSelection() {
    setSelectedPerson(null);
    setPersonSearch("");
    setPersonResults([]);
    setSelectedClass("");
    setClassStudents([]);
    setStudentSearch("");
    setEnrollmentId("");
    setSelectedDevice("");
    setFormError("");
    setFormSuccess("");
  }

  function loadMappings(schoolId, pType, activeFilter) {
    setTableLoading(true); setTableError("");
    const p=new URLSearchParams({schoolId});
    if(pType!=="ALL") p.set("personType",pType);
    if(activeFilter==="ACTIVE") p.set("isActive","true");
    if(activeFilter==="INACTIVE") p.set("isActive","false");
    apiFetch(`${BASE}/mappings?${p}`)
      .then((j)=>setMappings(j.data||[]))
      .catch((e)=>setTableError(e.message||"Failed"))
      .finally(()=>setTableLoading(false));
  }

  const canSubmit = selectedSchool && selectedPerson && enrollmentId.trim();

  async function handleAssign() {
    if(!canSubmit||submitting) return;
    setSubmitting(true); setFormError(""); setFormSuccess("");
    try {
      await apiPost(`${BASE}/mappings`,{
        schoolId:selectedSchool,
        personType,
        personId:selectedPerson.id,
        deviceId:selectedDevice||undefined,
        enrollmentId:enrollmentId.trim(),
        assignedById:currentUserId||undefined
      });
      setFormSuccess(`Enrollment ID "${enrollmentId.trim()}" assigned to ${selectedPerson.name}.`);
      setSelectedPerson(null); setEnrollmentId(""); setSelectedDevice("");
      loadMappings(selectedSchool, filterType, filterActive);
    } catch(e) {
      setFormError(e.message||"Assignment failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(mappingId) {
    if(deactivating) return; setDeactivating(mappingId);
    try {
      await apiPatch(`${BASE}/mappings/${mappingId}/deactivate`);
      setMappings((prev)=>prev.map((m)=>m.id===mappingId?{...m,isActive:false,deactivatedAt:new Date().toISOString()}:m));
    } catch(e) {
      alert(e.message||"Failed");
    } finally {
      setDeactivating(null);
    }
  }

  // IDs of persons who already have an active mapping — hide them from all lists
  const assignedPersonIds = new Set(
    mappings
      .filter((m) => m.isActive && m.personType === personType)
      .map((m) => m.studentId || m.teacherId || m.staffId || m.userId)
      .filter(Boolean)
  );

  const filteredStudents = classStudents.filter((s) => {
    if(assignedPersonIds.has(s.id)) return false;
    if(!studentSearch) return true;
    const q=studentSearch.toLowerCase();
    return s.name.toLowerCase().includes(q)||(s.code||"").toLowerCase().includes(q)||(s.rollNumber||"").toString().includes(q);
  });

  const filteredPersonResults = personResults.filter((p) => !assignedPersonIds.has(p.id));

  const inp = { width:"100%",padding:"9px 12px",border:"1.5px solid #E5E7EB",borderRadius:8,fontSize:14,color:"#111827",outline:"none",boxSizing:"border-box",background:"#FAFAFA" };
  const sel = { ...inp,cursor:"pointer",appearance:"auto" };
  const lbl = { display:"block",fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:0.6,marginBottom:6 };
  const card = { background:"#fff",borderRadius:12,border:"1px solid #E5E7EB",padding:"18px 20px",marginBottom:18 };
  const thS = { padding:"10px 14px",textAlign:"left",fontWeight:700,color:"#6B7280",fontSize:11,textTransform:"uppercase",letterSpacing:0.5,borderBottom:"2px solid #F3F4F6",whiteSpace:"nowrap",background:"#F9FAFB" };
  const tdS = { padding:"11px 14px",borderBottom:"1px solid #F3F4F6",verticalAlign:"middle" };

  const PersonChip = ({person}) => (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",background:"#F0FDF4",border:"1.5px solid #86EFAC",borderRadius:8 }}>
      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
        <div style={{ width:34,height:34,borderRadius:"50%",background:PT_COLOR[personType]?.bg,color:PT_COLOR[personType]?.text,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,flexShrink:0 }}>{person.name[0].toUpperCase()}</div>
        <div>
          <div style={{ fontWeight:700,fontSize:14 }}>{person.name}</div>
          <div style={{ fontSize:12,color:"#6B7280" }}>
            {person.code!=="—"&&<span>{person.code}</span>}
            {person.extra&&<span style={{ color:"#9CA3AF",marginLeft:6 }}>· {person.extra}</span>}
            {person.rollNumber&&<span style={{ color:"#9CA3AF",marginLeft:6 }}>· Roll: {person.rollNumber}</span>}
          </div>
        </div>
      </div>
      <button onClick={()=>setSelectedPerson(null)} style={{ background:"none",border:"none",cursor:"pointer",color:"#6B7280",padding:4,borderRadius:4 }}><X size={16}/></button>
    </div>
  );

  return (
    <div style={{ fontFamily:"system-ui,-apple-system,sans-serif",color:"#111827" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @media(max-width:640px){.map-grid{grid-template-columns:1fr!important} .map-table-wrap{font-size:12px!important}}`}</style>

      <div style={{ marginBottom:18 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}><UserCheck size={20} color="#4F46E5"/><h2 style={{ margin:0,fontSize:18,fontWeight:700 }}>Enrollment ID Assignment</h2></div>
        <p style={{ margin:"4px 0 0",fontSize:13,color:"#6B7280" }}>Assign biometric card / enrollment IDs to students, teachers, staff, and admins.</p>
      </div>

      {/* Form card */}
      <div style={card}>
        <div className="map-grid" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px 22px" }}>

          {/* School */}
          {isSuperAdmin && (
            <div style={{ gridColumn:"1/-1" }}>
              <label style={lbl}>School</label>
              <div style={{ position:"relative" }}>
                <select style={sel} value={selectedSchool} onChange={(e)=>{setSelectedSchool(e.target.value); resetPersonSelection();}} disabled={schoolsLoading}>
                  <option value="">{schoolsLoading?"Loading…":"— Select School —"}</option>
                  {schools.map((s)=><option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                </select>
                {schoolsLoading&&<span style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)" }}><Spinner size={14}/></span>}
              </div>
            </div>
          )}

          {/* Person type pills */}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}>Person Type</label>
            <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
              {PERSON_TYPES.map((pt)=>{
                const c=PT_COLOR[pt]; const active=personType===pt;
                return <button key={pt} onClick={()=>setPersonType(pt)} style={{ padding:"6px 14px",borderRadius:8,border:`2px solid ${active?c.dot:"#E5E7EB"}`,background:active?c.bg:"#fff",color:active?c.text:"#374151",fontWeight:active?700:500,fontSize:13,cursor:"pointer" }}>{PT_LABEL[pt]}</button>;
              })}
            </div>
          </div>

          {/* STUDENT: class → scrollable+searchable list */}
          {personType==="STUDENT" && (
            <>
              <div>
                <label style={lbl}>Class / Section</label>
                <div style={{ position:"relative" }}>
                  <select style={sel} value={selectedClass} onChange={(e)=>{setSelectedClass(e.target.value); setSelectedPerson(null);}} disabled={!selectedSchool||classesLoading}>
                    <option value="">{classesLoading?"Loading classes…":selectedSchool?"— Select Class —":"Select school first"}</option>
                    {classes.map((c)=><option key={c.id} value={c.id}>{c.name} ({c.studentCount} students)</option>)}
                  </select>
                  {classesLoading&&<span style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)" }}><Spinner size={14}/></span>}
                </div>
                {selectedSchool&&!classesLoading&&classes.length===0&&<p style={{ fontSize:11,color:"#F97316",marginTop:4,marginBottom:0 }}>No active classes found.</p>}
              </div>

              <div>
                <label style={lbl}>Device <span style={{ color:"#9CA3AF",fontWeight:400,textTransform:"none" }}>(optional)</span></label>
                <div style={{ position:"relative" }}>
                  <select style={sel} value={selectedDevice} onChange={(e)=>setSelectedDevice(e.target.value)} disabled={!selectedSchool||devicesLoading}>
                    <option value="">{devicesLoading?"Loading…":"— Select Device —"}</option>
                    {devices.map((d)=><option key={d.id} value={d.id}>{d.deviceName||"Unnamed"} ({d.deviceCode} · {d.serialNo})</option>)}
                  </select>
                  {devicesLoading&&<span style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)" }}><Spinner size={14}/></span>}
                </div>
              </div>

              {/* Student list with search + scroll */}
              <div style={{ gridColumn:"1/-1" }}>
                  <label style={lbl}>
                  <span style={{ display:"flex",alignItems:"center",gap:5 }}>
                    Student
                    {selectedClass&&classStudents.length>0&&<span style={{ fontWeight:400,textTransform:"none",color:"#9CA3AF",fontSize:11 }}>{filteredStudents.length} available of {classStudents.length}</span>}
                  </span>
                </label>

                {!selectedClass ? (
                  <div style={{ padding:"14px 16px",background:"#F9FAFB",border:"1.5px solid #E5E7EB",borderRadius:8,fontSize:13,color:"#9CA3AF",display:"flex",alignItems:"center",gap:8 }}>
                    <AlertCircle size={15}/> Select a class first to see students.
                  </div>
                ) : selectedPerson ? (
                  <PersonChip person={selectedPerson}/>
                ) : (
                  <div style={{ border:"1.5px solid #E5E7EB",borderRadius:8,overflow:"hidden" }}>
                    <div style={{ padding:"8px 12px",background:"#F9FAFB",borderBottom:"1px solid #E5E7EB",display:"flex",alignItems:"center",gap:8 }}>
                      <Search size={14} color="#9CA3AF"/>
                      <input style={{ border:"none",outline:"none",background:"transparent",fontSize:13,color:"#111827",width:"100%" }} placeholder="Search by name, code, roll no…" value={studentSearch} onChange={(e)=>setStudentSearch(e.target.value)} disabled={studentsLoading}/>
                      {studentSearch&&<button onClick={()=>setStudentSearch("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",padding:0,display:"flex" }}><X size={14}/></button>}
                    </div>
                    <div style={{ maxHeight:280,overflowY:"auto",WebkitOverflowScrolling:"touch" }}>
                      {studentsLoading ? (
                        <div style={{ padding:"20px",display:"flex",alignItems:"center",justifyContent:"center",gap:10,color:"#6B7280",fontSize:13 }}><Spinner size={14}/> Loading students…</div>
                      ) : filteredStudents.length===0 ? (
                        <div style={{ padding:"20px",textAlign:"center",color:"#9CA3AF",fontSize:13 }}>
                          {classStudents.length===0 ? "No active students in this class." : `No students match "${studentSearch}"`}
                        </div>
                      ) : filteredStudents.map((s,i)=>(
                        <div key={s.id} onClick={()=>setSelectedPerson(s)}
                          style={{ padding:"10px 14px",cursor:"pointer",borderBottom:i<filteredStudents.length-1?"1px solid #F3F4F6":"none",display:"flex",alignItems:"center",gap:12,transition:"background 0.1s" }}
                          onMouseEnter={(e)=>e.currentTarget.style.background="#F0FDF4"}
                          onMouseLeave={(e)=>e.currentTarget.style.background="transparent"}>
                          <div style={{ width:36,height:36,borderRadius:"50%",background:"#EEF2FF",color:"#4338CA",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,flexShrink:0 }}>{s.name[0].toUpperCase()}</div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontWeight:600,fontSize:14 }}>{s.name}</div>
                            <div style={{ fontSize:11,color:"#9CA3AF" }}>{s.code!=="—"&&<span>{s.code}</span>}{s.rollNumber&&<span style={{ marginLeft:6 }}>· Roll: {s.rollNumber}</span>}</div>
                          </div>
                          <span style={{ fontSize:12,color:"#9CA3AF",flexShrink:0,display:"flex",alignItems:"center",gap:4 }}>Select <ChevronRight size={13}/></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* NON-STUDENT: scrollable inline list (same style as students) */}
          {personType!=="STUDENT" && (
            <>
              <div style={{ gridColumn:"1/-1" }}>
                <label style={lbl}>
                  <span style={{ display:"flex",alignItems:"center",gap:5 }}>
                    {PT_LABEL[personType]}
                    {!selectedPerson && filteredPersonResults.length>0 && (
                      <span style={{ fontWeight:400,textTransform:"none",color:"#9CA3AF",fontSize:11 }}>{filteredPersonResults.length} available</span>
                    )}
                  </span>
                </label>

                {!selectedSchool ? (
                  <div style={{ padding:"14px 16px",background:"#F9FAFB",border:"1.5px solid #E5E7EB",borderRadius:8,fontSize:13,color:"#9CA3AF",display:"flex",alignItems:"center",gap:8 }}>
                    <AlertCircle size={15}/> Select a school first.
                  </div>
                ) : selectedPerson ? (
                  <PersonChip person={selectedPerson}/>
                ) : (
                  <div style={{ border:"1.5px solid #E5E7EB",borderRadius:8,overflow:"hidden" }}>
                    <div style={{ padding:"8px 12px",background:"#F9FAFB",borderBottom:"1px solid #E5E7EB",display:"flex",alignItems:"center",gap:8 }}>
                      <Search size={14} color="#9CA3AF"/>
                      <input
                        style={{ border:"none",outline:"none",background:"transparent",fontSize:13,color:"#111827",width:"100%" }}
                        placeholder={`Search ${PT_LABEL[personType].toLowerCase()} by name or code…`}
                        value={personSearch}
                        onChange={(e)=>setPersonSearch(e.target.value)}
                        disabled={!selectedSchool}
                      />
                      {personSearch && <button onClick={()=>setPersonSearch("")} style={{ background:"none",border:"none",cursor:"pointer",color:"#9CA3AF",padding:0,display:"flex" }}><X size={14}/></button>}
                      {personLoading && <Spinner size={14}/>}
                    </div>
                    <div style={{ maxHeight:280,overflowY:"auto",WebkitOverflowScrolling:"touch" }}>
                      {personLoading && filteredPersonResults.length===0 ? (
                        <div style={{ padding:"20px",display:"flex",alignItems:"center",justifyContent:"center",gap:10,color:"#6B7280",fontSize:13 }}><Spinner size={14}/> Loading…</div>
                      ) : filteredPersonResults.length===0 ? (
                        <div style={{ padding:"20px",textAlign:"center",color:"#9CA3AF",fontSize:13 }}>
                          {personSearch ? `No results for "${personSearch}"` : `No unassigned ${PT_LABEL[personType].toLowerCase()}s found.`}
                        </div>
                      ) : filteredPersonResults.map((p,i)=>(
                        <div key={p.id} onClick={()=>setSelectedPerson(p)}
                          style={{ padding:"10px 14px",cursor:"pointer",borderBottom:i<filteredPersonResults.length-1?"1px solid #F3F4F6":"none",display:"flex",alignItems:"center",gap:12,transition:"background 0.1s" }}
                          onMouseEnter={(e)=>e.currentTarget.style.background=PT_COLOR[personType]?.bg||"#F9FAFB"}
                          onMouseLeave={(e)=>e.currentTarget.style.background="transparent"}>
                          <div style={{ width:36,height:36,borderRadius:"50%",background:PT_COLOR[personType]?.bg,color:PT_COLOR[personType]?.text,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:14,flexShrink:0 }}>{p.name[0].toUpperCase()}</div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontWeight:600,fontSize:14 }}>{p.name}</div>
                            <div style={{ fontSize:11,color:"#9CA3AF" }}>{p.code!=="—"&&<span>{p.code}</span>}{p.extra&&<span style={{ marginLeft:6 }}>· {p.extra}</span>}</div>
                          </div>
                          <span style={{ fontSize:12,color:"#9CA3AF",flexShrink:0,display:"flex",alignItems:"center",gap:4 }}>Select <ChevronRight size={13}/></span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ gridColumn:"1/-1" }}>
                <label style={lbl}>Device <span style={{ color:"#9CA3AF",fontWeight:400,textTransform:"none" }}>(optional)</span></label>
                <div style={{ position:"relative" }}>
                  <select style={sel} value={selectedDevice} onChange={(e)=>setSelectedDevice(e.target.value)} disabled={!selectedSchool||devicesLoading}>
                    <option value="">{devicesLoading?"Loading…":"— Select Device —"}</option>
                    {devices.map((d)=><option key={d.id} value={d.id}>{d.deviceName||"Unnamed"} ({d.deviceCode} · {d.serialNo})</option>)}
                  </select>
                  {devicesLoading&&<span style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)" }}><Spinner size={14}/></span>}
                </div>
              </div>
            </>
          )}

          {/* Enrollment ID */}
          <div style={{ gridColumn:"1/-1" }}>
            <label style={lbl}><span style={{ display:"flex",alignItems:"center",gap:5 }}><CreditCard size={12}/> Enrollment / Card ID</span></label>
            <input style={{ ...inp,maxWidth:300,fontFamily:"monospace",fontSize:16,fontWeight:700,letterSpacing:1 }} placeholder="e.g. 1001" value={enrollmentId} onChange={(e)=>setEnrollmentId(e.target.value)}/>
            <p style={{ fontSize:11,color:"#9CA3AF",marginTop:4,marginBottom:0 }}>The card number programmed on the biometric device.</p>
          </div>
        </div>

        {/* Submit */}
        <div style={{ marginTop:18,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap" }}>
          <button onClick={handleAssign} disabled={!canSubmit||submitting}
            style={{ display:"flex",alignItems:"center",gap:7,padding:"10px 22px",background:canSubmit&&!submitting?"#4F46E5":"#C7D2FE",color:"#fff",border:"none",borderRadius:8,fontWeight:700,fontSize:14,cursor:canSubmit&&!submitting?"pointer":"not-allowed" }}>
            {submitting&&<Spinner size={14} color="#fff"/>}
            {submitting?"Assigning…":"Assign Enrollment ID"}
          </button>
          {formSuccess&&<div style={{ padding:"8px 14px",borderRadius:8,background:"#F0FDF4",color:"#166534",fontSize:13,fontWeight:500,border:"1px solid #86EFAC",display:"flex",alignItems:"center",gap:6 }}><CheckCircle size={14}/>{formSuccess}</div>}
          {formError&&  <div style={{ padding:"8px 14px",borderRadius:8,background:"#FFF1F2",color:"#9F1239", fontSize:13,fontWeight:500,border:"1px solid #FECDD3",display:"flex",alignItems:"center",gap:6 }}><AlertCircle size={14}/>{formError}</div>}
        </div>
      </div>

      {/* Mappings table */}
      <div style={card}>
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10 }}>
          <div>
            <h3 style={{ margin:0,fontSize:15,fontWeight:700 }}>Existing Mappings</h3>
            {selectedSchool&&schools.length>0&&<p style={{ margin:"2px 0 0",fontSize:12,color:"#6B7280" }}>{schools.find((s)=>s.id===selectedSchool)?.name||""}</p>}
          </div>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            <select style={{ ...sel,width:"auto",fontSize:13,padding:"6px 10px" }} value={filterType} onChange={(e)=>setFilterType(e.target.value)}>
              <option value="ALL">All Types</option>
              {PERSON_TYPES.map((pt)=><option key={pt} value={pt}>{PT_LABEL[pt]}</option>)}
            </select>
            <select style={{ ...sel,width:"auto",fontSize:13,padding:"6px 10px" }} value={filterActive} onChange={(e)=>setFilterActive(e.target.value)}>
              <option value="ALL">All Status</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>

        {!selectedSchool ? (
          <div style={{ textAlign:"center",padding:"40px 0",color:"#9CA3AF",fontSize:14 }}>Select a school to view mappings.</div>
        ) : (
          <div className="map-table-wrap" style={{ overflowX:"auto",WebkitOverflowScrolling:"touch" }}>
            <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:600 }}>
              <thead>
                <tr>{["Enrollment ID","Person","Type","Device","Assigned On","Punches","Status","Action"].map((h)=><th key={h} style={thS}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {tableLoading ? <tr><td colSpan={8} style={{ textAlign:"center",padding:"40px 0" }}><Spinner size={20}/></td></tr>
                : tableError  ? <tr><td colSpan={8} style={{ textAlign:"center",padding:"32px 0",color:"#EF4444" }}>{tableError}</td></tr>
                : mappings.length===0 ? <tr><td colSpan={8} style={{ textAlign:"center",padding:"40px 0",color:"#9CA3AF" }}>No mappings found.</td></tr>
                : mappings.map((m)=>(
                  <tr key={m.id} style={{ opacity:m.isActive?1:0.5 }}>
                    <td style={tdS}><code style={{ fontFamily:"monospace",fontWeight:700,fontSize:14 }}>{m.enrollmentId}</code></td>
                    <td style={tdS}><div style={{ fontWeight:600 }}>{m.personName}</div><div style={{ fontSize:11,color:"#9CA3AF" }}>{m.personCode}{m.personExtra?` · ${m.personExtra}`:""}</div></td>
                    <td style={tdS}><Badge type={m.personType}/></td>
                    <td style={tdS}><span style={{ fontSize:13 }}>{m.deviceName||<span style={{ color:"#D1D5DB" }}>—</span>}</span>{m.deviceCode&&<div style={{ fontSize:11,color:"#9CA3AF" }}>{m.deviceCode}</div>}</td>
                    <td style={{ ...tdS,color:"#6B7280",whiteSpace:"nowrap" }}>{m.assignedAt?new Date(m.assignedAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—"}</td>
                    <td style={{ ...tdS,textAlign:"center" }}><span style={{ background:"#EEF2FF",color:"#4338CA",padding:"2px 10px",borderRadius:99,fontSize:12,fontWeight:600 }}>{m.totalPunches??0}</span></td>
                    <td style={tdS}><StatusPill active={m.isActive}/></td>
                    <td style={tdS}>
                      {m.isActive&&(
                        <button onClick={()=>handleDeactivate(m.id)} disabled={deactivating===m.id}
                          style={{ display:"inline-flex",alignItems:"center",gap:5,padding:"5px 11px",background:"#FFF1F2",color:"#9F1239",border:"1px solid #FECDD3",borderRadius:6,fontWeight:600,fontSize:12,cursor:deactivating===m.id?"not-allowed":"pointer" }}>
                          {deactivating===m.id?<Spinner size={11} color="#9F1239"/>:<XCircle size={12}/>}
                          {deactivating===m.id?"…":"Deactivate"}
                        </button>
                      )}
                      {!m.isActive&&m.deactivatedAt&&<span style={{ fontSize:11,color:"#9CA3AF" }}>{new Date(m.deactivatedAt).toLocaleDateString("en-IN",{day:"2-digit",month:"short"})}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default MappingsTab;