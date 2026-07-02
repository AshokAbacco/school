import React, { useState, useEffect, useRef } from "react";
import { FileText, Search, Calendar, Filter, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Clock, Monitor, CreditCard, User, LogIn, LogOut, Info, Download, ChevronDown } from "lucide-react";
import { downloadBiometricWideExcel } from "../../../utils/downloadBiometricWideExcel";

const API_URL = import.meta.env.VITE_API_URL;
const BASE    = `${API_URL}/api/biometric`;

const PERSON_TYPES = ["STUDENT","TEACHER","STAFF","ADMIN","FINANCE"];
const PT_LABEL = { STUDENT:"Student",TEACHER:"Teacher",STAFF:"Staff",ADMIN:"School Admin",FINANCE:"Finance Admin" };
const PT_COLOR = {
  STUDENT:{bg:"#EEF2FF",text:"#4338CA",border:"#C7D2FE"},
  TEACHER:{bg:"#F0FDF4",text:"#166534",border:"#86EFAC"},
  STAFF:  {bg:"#FFF7ED",text:"#9A3412",border:"#FED7AA"},
  ADMIN:  {bg:"#FDF4FF",text:"#7E22CE",border:"#E9D5FF"},
  FINANCE:{bg:"#FFF1F2",text:"#9F1239",border:"#FECDD3"},
};
const PAGE_SIZE = 20;

const getToken = () => { try{return JSON.parse(localStorage.getItem("auth"))?.token||null;}catch{return null;} };
const authHeaders = () => ({ "Content-Type":"application/json", Authorization:`Bearer ${getToken()}` });

async function apiFetch(url) {
  const res=await fetch(url,{headers:authHeaders()}); const json=await res.json();
  if(!res.ok) throw new Error(json.message||"Request failed"); return json;
}

function Spinner({size=16,color="#4F46E5"}) {
  return <span style={{ display:"inline-block",width:size,height:size,border:`2px solid ${color}30`,borderTop:`2px solid ${color}`,borderRadius:"50%",animation:"spin 0.7s linear infinite",flexShrink:0 }}/>;
}
function Badge({type}) {
  if(!type) return <span style={{ color:"#D1D5DB",fontSize:12 }}>—</span>;
  const c=PT_COLOR[type]||{bg:"#F3F4F6",text:"#374151",border:"#E5E7EB"};
  return <span style={{ background:c.bg,color:c.text,border:`1px solid ${c.border}`,padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:700,whiteSpace:"nowrap" }}>{PT_LABEL[type]||type}</span>;
}
function MappedPill({mapped}) {
  return <span style={{ display:"inline-flex",alignItems:"center",gap:4,background:mapped?"#F0FDF4":"#FFF7ED",color:mapped?"#166534":"#92400E",border:`1px solid ${mapped?"#86EFAC":"#FCD34D"}`,padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:700 }}>
    {mapped?<CheckCircle size={10}/>:<AlertTriangle size={10}/>}{mapped?"Mapped":"Unmapped"}
  </span>;
}

// ─── Multi-select dropdown for Person Type (replaces the old single <select>) ─
function MultiSelectDropdown({ options, labels, selected, onChange, placeholder = "Select…" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const allSelected = selected.length === 0 || selected.length === options.length;
  const toggle = (opt) => {
    if (selected.includes(opt)) onChange(selected.filter((s) => s !== opt));
    else onChange([...selected, opt]);
  };
  const toggleAll = () => onChange(allSelected ? [] : [...options]);

  const summary = allSelected
    ? "All Types"
    : selected.length === 1
      ? (labels[selected[0]] || selected[0])
      : `${selected.length} types selected`;

  const inp = { width:"100%",padding:"8px 10px",border:"1.5px solid #E5E7EB",borderRadius:8,fontSize:13,color:"#111827",outline:"none",boxSizing:"border-box",background:"#FAFAFA" };

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        style={{ ...inp,display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",textAlign:"left" }}>
        <span>{summary}</span>
        <ChevronDown size={14} color="#6B7280" style={{ transform:open?"rotate(180deg)":"none",transition:"transform .15s",flexShrink:0 }}/>
      </button>
      {open && (
        <div style={{ position:"absolute",top:"calc(100% + 4px)",left:0,right:0,zIndex:20,background:"#fff",border:"1px solid #E5E7EB",borderRadius:8,boxShadow:"0 8px 24px rgba(0,0,0,0.12)",padding:6,maxHeight:240,overflowY:"auto" }}>
          <label style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 8px",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:700,color:"#374151",borderBottom:"1px solid #F3F4F6",marginBottom:4 }}>
            <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor:"pointer" }}/>
            All Types
          </label>
          {options.map((opt) => (
            <label key={opt} style={{ display:"flex",alignItems:"center",gap:8,padding:"7px 8px",borderRadius:6,cursor:"pointer",fontSize:13,color:"#111827" }}
              onMouseEnter={(e)=>e.currentTarget.style.background="#F9FAFB"} onMouseLeave={(e)=>e.currentTarget.style.background="transparent"}>
              <input type="checkbox" checked={allSelected || selected.includes(opt)} onChange={() => toggle(opt)} style={{ cursor:"pointer" }}/>
              {labels[opt] || opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Human-readable detail panel ─────────────────────────────────────────────
function PunchDetail({log}) {
  const raw = log.rawData||{};
  const enrollmentId = raw.enrollmentId||raw.EnrollmentId||raw.EnrollmentID||"—";
  const deviceSerial = raw.SerialNo||raw.serialNo||raw.SerialNumber||"—";
  const deviceName   = log.deviceName||raw.DeviceName||raw.deviceName||"—";
  const isMapped     = !!log.biometricUserMappingId;
  const punchTime    = log.punchDateTime ? new Date(log.punchDateTime).toLocaleString("en-IN",{timeZone:"Asia/Kolkata",weekday:"long",day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}) : "—";

  const modeInfo = {
    IN:  {label:"Entry (IN)",  Icon:LogIn,  bg:"#F0FDF4",color:"#166534",border:"#86EFAC"},
    OUT: {label:"Exit (OUT)",  Icon:LogOut, bg:"#FFF1F2",color:"#9F1239",border:"#FECDD3"},
  }[log.punchMode]||{label:log.punchMode||"—",Icon:Info,bg:"#F3F4F6",color:"#374151",border:"#E5E7EB"};

  const Field = ({Icon,label,value,mono=false,highlight=false}) => (
    <div style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"10px 13px",background:highlight?"#FFFBEB":"#fff",borderRadius:8,border:`1px solid ${highlight?"#FCD34D":"#E5E7EB"}` }}>
      <div style={{ marginTop:2,flexShrink:0 }}><Icon size={16} color={highlight?"#D97706":"#6B7280"}/></div>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:10,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:0.5,marginBottom:2 }}>{label}</div>
        <div style={{ fontSize:13,fontWeight:600,color:"#111827",fontFamily:mono?"monospace":"inherit",wordBreak:"break-all" }}>{value}</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding:"12px 0 4px" }}>
      {/* Status banner */}
      <div style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"10px 14px",borderRadius:8,marginBottom:12,background:isMapped?"#F0FDF4":"#FFFBEB",border:`1px solid ${isMapped?"#86EFAC":"#FCD34D"}` }}>
        {isMapped?<CheckCircle size={20} color="#166534"/>:<AlertTriangle size={20} color="#D97706"/>}
        <div>
          <div style={{ fontWeight:700,fontSize:14,color:isMapped?"#166534":"#92400E" }}>{isMapped?"Punch successfully identified":"Person not identified — card not mapped"}</div>
          <div style={{ fontSize:12,color:isMapped?"#15803D":"#B45309",marginTop:2 }}>
            {isMapped
              ? `This punch is linked to ${log.personName||"the person"} and will be counted in their attendance.`
              : `This punch was recorded from the device but card ${enrollmentId} has not been assigned to anyone. Go to Enrollment Mapping tab to assign it.`}
          </div>
        </div>
      </div>

      {/* Detail grid — 3 cols on desktop, 2 on mobile, 1 on small */}
      <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:8 }}>
        <Field Icon={Clock}       label="Date & Time"        value={punchTime}/>
        <Field Icon={User}        label="Person"             value={log.personName?`${log.personName}${log.personCode?` (${log.personCode})`:""}`:"Unknown — card not mapped"} highlight={!log.personName}/>
        <div style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"10px 13px",background:modeInfo.bg,borderRadius:8,border:`1px solid ${modeInfo.border}` }}>
          <modeInfo.Icon size={16} color={modeInfo.color} style={{ marginTop:2,flexShrink:0 }}/>
          <div><div style={{ fontSize:10,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:0.5,marginBottom:2 }}>Punch Type</div><div style={{ fontSize:13,fontWeight:700,color:modeInfo.color }}>{modeInfo.label}</div></div>
        </div>
        <Field Icon={CreditCard}  label="Card / Enrollment ID" value={enrollmentId} mono/>
        <Field Icon={Monitor}     label="Device"              value={deviceName!=="—"?`${deviceName}${log.deviceCode?` · Code ${log.deviceCode}`:""}`:  "—"}/>
        <Field Icon={FileText}    label="Device Serial No"    value={deviceSerial} mono/>
      </div>

      {!isMapped&&(
        <div style={{ marginTop:10,padding:"9px 13px",background:"#EEF2FF",borderRadius:8,border:"1px solid #C7D2FE",fontSize:13,color:"#4338CA",display:"flex",alignItems:"flex-start",gap:8 }}>
          <Info size={15} style={{ flexShrink:0,marginTop:1 }}/>
          <span><b>Action needed:</b> Go to <b>Enrollment Mapping</b> tab → assign card ID <code style={{ background:"#C7D2FE",padding:"1px 6px",borderRadius:4 }}>{enrollmentId}</code> to the correct person.</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const LogsTab = () => {
  const [schools,      setSchools]      = useState([]);
  const [filterSchool, setFilterSchool] = useState("");
  const today = new Date().toISOString().slice(0,10);
  const [fromDate,     setFromDate]     = useState(today);
  const [toDate,       setToDate]       = useState(today);
  const [filterTypes,  setFilterTypes]  = useState([]); // [] means "All Types"
  const [searchQ,      setSearchQ]      = useState("");
  const [logs,         setLogs]         = useState([]);
  const [totalCount,   setTotalCount]   = useState(0);
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [expandedRow,  setExpandedRow]  = useState(null);
  const [downloading,  setDownloading]  = useState(false);
  const [downloadErr,  setDownloadErr]  = useState("");

  useEffect(() => {
    apiFetch(`${BASE}/schools`).then((j)=>setSchools(j.data||[])).catch(()=>{});
  },[]);

  useEffect(() => { loadLogs(); },[filterSchool,fromDate,toDate,filterTypes,page]); // eslint-disable-line

  function loadLogs() {
    setLoading(true); setError("");
    const p=new URLSearchParams({page,limit:PAGE_SIZE});
    if(filterSchool) p.set("schoolId",filterSchool);
    if(fromDate)     p.set("from",fromDate);
    if(toDate)       p.set("to",toDate);
    if(filterTypes.length>0 && filterTypes.length<PERSON_TYPES.length) p.set("personType",filterTypes.join(","));
    console.log("Selected School:", filterSchool);
    console.log("Request URL:", `${BASE}/logs?${p.toString()}`);
    apiFetch(`${BASE}/attendance-logs?${p}`).then((j)=>{setLogs(j.data||[]);setTotalCount(j.meta?.total||0);}).catch((e)=>setError(e.message||"Failed")).finally(()=>setLoading(false));
  }

  const handleFC=(setter)=>(e)=>{setter(e.target.value);setPage(1);};
  const totalPages=Math.max(1,Math.ceil(totalCount/PAGE_SIZE));

  // Downloads the FULL dataset for the selected school + date range + person
  // type(s) — this hits /attendance-report, which has NO pagination at all
  // (unlike the on-screen table above, which is paginated for display only).
  // Selecting multiple types (e.g. Teacher + Staff) downloads all of them
  // together in one workbook.
  async function handleDownloadExcel() {
    setDownloadErr("");
    if (!filterSchool) {
      setDownloadErr("Please select a school before downloading.");
      return;
    }
    setDownloading(true);
    try {
      const typesToSend = filterTypes.length > 0 ? filterTypes : PERSON_TYPES; // [] => all types
      const p = new URLSearchParams({
        schoolId: filterSchool,
        from: fromDate,
        to: toDate,
        personTypes: typesToSend.join(","),
      });
      const j = await apiFetch(`${BASE}/attendance-report?${p}`);
      const schoolObj = schools.find((s) => s.id === filterSchool);
      downloadBiometricWideExcel(j.data || [], {
        schoolName: schoolObj?.name || "School",
        from: fromDate,
        to: toDate,
        personTypes: typesToSend,
      });
    } catch (e) {
      setDownloadErr(e.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  }


  // Client-side search filter on loaded page
  const displayedLogs = searchQ
    ? logs.filter((l)=>{
        const q=searchQ.toLowerCase();
        return (l.personName||"").toLowerCase().includes(q)
          || (l.personCode||"").toLowerCase().includes(q)
          || (l.deviceName||"").toLowerCase().includes(q);
      })
    : logs;

  const inp = { width:"100%",padding:"8px 10px",border:"1.5px solid #E5E7EB",borderRadius:8,fontSize:13,color:"#111827",outline:"none",boxSizing:"border-box",background:"#FAFAFA" };
  const sel = { ...inp,cursor:"pointer",appearance:"auto" };
  const lbl = { display:"block",fontSize:11,fontWeight:700,color:"#6B7280",textTransform:"uppercase",letterSpacing:0.6,marginBottom:5 };
  const card = { background:"#fff",borderRadius:12,border:"1px solid #E5E7EB",padding:"16px 18px",marginBottom:16 };
  const thS = { padding:"10px 13px",textAlign:"left",fontWeight:700,color:"#6B7280",fontSize:11,textTransform:"uppercase",letterSpacing:0.5,borderBottom:"2px solid #F3F4F6",whiteSpace:"nowrap",background:"#F9FAFB" };
  const tdS = { padding:"11px 13px",borderBottom:"1px solid #F3F4F6",verticalAlign:"middle" };

  return (
    <div style={{ fontFamily:"system-ui,-apple-system,sans-serif",color:"#111827" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}} @media(max-width:640px){.log-filter-grid{grid-template-columns:1fr 1fr!important} .log-table-wrap{font-size:12px!important}}`}</style>

      <div style={{ marginBottom:16 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}><FileText size={20} color="#4F46E5"/><h2 style={{ margin:0,fontSize:18,fontWeight:700 }}>Punch Logs</h2></div>
        <p style={{ margin:"4px 0 0",fontSize:13,color:"#6B7280" }}>Daily attendance summary — Entry and Exit time per person per day.</p>
      </div>

      {/* Filters */}
      <div style={card}>
        <div className="log-filter-grid" style={{ display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:"10px 14px",alignItems:"end" }}>
          <div>
            <label style={lbl}><span style={{ display:"flex",alignItems:"center",gap:4 }}><Filter size={10}/>School</span></label>
            <select style={sel} value={filterSchool} onChange={(e)=>{ setFilterSchool(e.target.value); setPage(1); }}>
              <option value="">All Schools</option>
              {schools.map((s)=><option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}><span style={{ display:"flex",alignItems:"center",gap:4 }}><Calendar size={10}/>From</span></label>
            <input type="date" style={inp} value={fromDate} onChange={handleFC(setFromDate)}/>
          </div>
          <div>
            <label style={lbl}><span style={{ display:"flex",alignItems:"center",gap:4 }}><Calendar size={10}/>To</span></label>
            <input type="date" style={inp} value={toDate} onChange={handleFC(setToDate)}/>
          </div>
          <div>
            <label style={lbl}>Person Type</label>
            <MultiSelectDropdown
              options={PERSON_TYPES}
              labels={PT_LABEL}
              selected={filterTypes}
              onChange={(vals)=>{ setFilterTypes(vals); setPage(1); }}
            />
          </div>
        </div>

        {/* Search + count row */}
        <div style={{ marginTop:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap" }}>
          <div style={{ fontSize:13,color:"#6B7280" }}>
            {loading?"Loading…":<><span style={{ fontWeight:700,color:"#111827" }}>{totalCount.toLocaleString("en-IN")}</span> attendance records found</>}
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" }}>
            <div style={{ position:"relative",minWidth:200,flex:"0 0 auto" }}>
              <Search size={14} color="#9CA3AF" style={{ position:"absolute",left:9,top:"50%",transform:"translateY(-50%)" }}/>
              <input style={{ ...inp,paddingLeft:30,width:"100%",fontSize:12 }} placeholder="Search person, device, card…" value={searchQ} onChange={(e)=>setSearchQ(e.target.value)}/>
            </div>
            <button onClick={handleDownloadExcel} disabled={downloading}
              title="Download full biometric report (all matching records, no pagination) for the selected person type(s)"
              style={{ display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:8,border:"none",background:downloading?"#A5B4FC":"#4F46E5",color:"#fff",fontWeight:700,fontSize:13,cursor:downloading?"not-allowed":"pointer",whiteSpace:"nowrap" }}>
              {downloading ? <Spinner size={14} color="#fff"/> : <Download size={14}/>}
              {downloading ? "Preparing…" : "Download Excel"}
            </button>
          </div>
        </div>
        {downloadErr && (
          <div style={{ marginTop:8,fontSize:12,color:"#9F1239",background:"#FFF1F2",border:"1px solid #FECDD3",borderRadius:8,padding:"7px 11px" }}>
            {downloadErr}
          </div>
        )}

      </div>

      {/* Info banner */}
      <div style={{ marginBottom:12,padding:"10px 14px",background:"#EEF2FF",border:"1px solid #C7D2FE",borderRadius:10,fontSize:12,color:"#3730A3",display:"flex",alignItems:"flex-start",gap:8 }}>
        <Info size={15} style={{ flexShrink:0,marginTop:1 }} color="#4F46E5"/>
        <span>Showing <b>Entry</b> and <b>Exit</b> times per person per day. Entry = earliest punch, Exit = latest punch. Device IN/OUT label is ignored.</span>
      </div>

      {/* Attendance summary table */}
      <div style={card}>
        <div className="log-table-wrap" style={{ overflowX:"auto",WebkitOverflowScrolling:"touch" }}>
          <table style={{ width:"100%",borderCollapse:"collapse",fontSize:13,minWidth:600 }}>
            <thead>
              <tr>{["Date","Person","Type","Entry Time","Exit Time","Duration","Punches","Device"].map((h)=><th key={h} style={thS}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={8} style={{ textAlign:"center",padding:"40px 0" }}><Spinner size={20}/></td></tr>
              : error   ? <tr><td colSpan={8} style={{ textAlign:"center",padding:"32px 0",color:"#EF4444" }}>{error}</td></tr>
              : displayedLogs.length===0 ? <tr><td colSpan={8} style={{ textAlign:"center",padding:"40px 0",color:"#9CA3AF",fontSize:13 }}>No records found.</td></tr>
              : displayedLogs.map((log,i)=>(
                <tr key={`${log.personId}|${log.date}`} style={{ background:i%2===0?"#fff":"#FAFAFA" }}>

                  {/* Date */}
                  <td style={{ ...tdS,whiteSpace:"nowrap" }}>
                    <div style={{ fontWeight:700,fontSize:13 }}>
                      {new Date(log.date+"T12:00:00+05:30").toLocaleDateString("en-IN",{ timeZone:"Asia/Kolkata",day:"2-digit",month:"short",year:"numeric" })}
                    </div>
                    <div style={{ fontSize:11,color:"#9CA3AF" }}>
                      {new Date(log.date+"T12:00:00+05:30").toLocaleDateString("en-IN",{ timeZone:"Asia/Kolkata",weekday:"short" })}
                    </div>
                  </td>

                  {/* Person */}
                  <td style={tdS}>
                    <div style={{ fontWeight:600,display:"flex",alignItems:"center",gap:5 }}><User size={12} color="#6B7280"/>{log.personName||"Unknown"}</div>
                    {log.personCode&&<div style={{ fontSize:11,color:"#9CA3AF" }}>{log.personCode}</div>}
                  </td>

                  {/* Type */}
                  <td style={tdS}><Badge type={log.personType}/></td>

                  {/* Entry Time — green dot */}
                  <td style={tdS}>
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <span style={{ width:8,height:8,borderRadius:"50%",background:"#22C55E",display:"inline-block",flexShrink:0 }}/>
                      <span style={{ fontWeight:700,fontSize:13,color:"#166534",fontFamily:"monospace" }}>{log.firstPunchFmt||"—"}</span>
                    </div>
                    <div style={{ fontSize:10,color:"#9CA3AF",marginLeft:14 }}>Entry</div>
                  </td>

                  {/* Exit Time — red dot or "Still In" pulse */}
                  <td style={tdS}>
                    {log.lastPunchFmt ? (
                      <>
                        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                          <span style={{ width:8,height:8,borderRadius:"50%",background:"#EF4444",display:"inline-block",flexShrink:0 }}/>
                          <span style={{ fontWeight:700,fontSize:13,color:"#9F1239",fontFamily:"monospace" }}>{log.lastPunchFmt}</span>
                        </div>
                        <div style={{ fontSize:10,color:"#9CA3AF",marginLeft:14 }}>Exit</div>
                      </>
                    ) : (
                      <span style={{ display:"inline-flex",alignItems:"center",gap:5,color:"#2563EB",fontWeight:600,fontSize:12 }}>
                        <span style={{ width:7,height:7,borderRadius:"50%",background:"#3B82F6",display:"inline-block",animation:"blink 1.2s infinite" }}/>
                        Still In
                      </span>
                    )}
                  </td>

                  {/* Duration */}
                  <td style={tdS}>
                    {log.workedFmt
                      ? <span style={{ fontWeight:600,color:"#374151" }}>{log.workedFmt}</span>
                      : <span style={{ color:"#D1D5DB" }}>—</span>}
                  </td>

                  {/* Punch count */}
                  <td style={{ ...tdS,textAlign:"center" }}>
                    <span style={{ background:"#EEF2FF",color:"#4338CA",padding:"2px 10px",borderRadius:99,fontSize:12,fontWeight:600 }}>{log.punchCount}</span>
                  </td>

                  {/* Device */}
                  <td style={tdS}>
                    <div style={{ fontSize:12,display:"flex",alignItems:"center",gap:4 }}><Monitor size={11} color="#9CA3AF"/>{log.deviceName||<span style={{ color:"#D1D5DB" }}>—</span>}</div>
                    {log.deviceCode&&<div style={{ fontSize:10,color:"#D1D5DB" }}>{log.deviceCode}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages>1&&(
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:14,flexWrap:"wrap",gap:10 }}>
            <span style={{ fontSize:13,color:"#6B7280" }}>
              Page <b>{page}</b> of <b>{totalPages}</b> &nbsp;·&nbsp; {totalCount.toLocaleString("en-IN")} records &nbsp;·&nbsp; {PAGE_SIZE} per page
            </span>
            <div style={{ display:"flex",gap:6,alignItems:"center" }}>
              <button onClick={()=>setPage((p)=>Math.max(1,p-1))} disabled={page===1}
                style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1px solid #E5E7EB",background:page===1?"#F9FAFB":"#fff",color:page===1?"#D1D5DB":"#374151",fontWeight:600,fontSize:13,cursor:page===1?"not-allowed":"pointer" }}>
                <ChevronLeft size={14}/> Prev
              </button>

              {/* Page number buttons */}
              {Array.from({length:Math.min(5,totalPages)},(_,i)=>{
                let p; const half=2;
                if(totalPages<=5) p=i+1;
                else if(page<=half+1) p=i+1;
                else if(page>=totalPages-half) p=totalPages-4+i;
                else p=page-half+i;
                return(
                  <button key={p} onClick={()=>setPage(p)}
                    style={{ width:32,height:32,borderRadius:7,border:"1px solid #E5E7EB",background:page===p?"#4F46E5":"#fff",color:page===p?"#fff":"#374151",fontWeight:600,fontSize:13,cursor:"pointer" }}>
                    {p}
                  </button>
                );
              })}

              <button onClick={()=>setPage((p)=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                style={{ display:"inline-flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:7,border:"1px solid #E5E7EB",background:page===totalPages?"#F9FAFB":"#fff",color:page===totalPages?"#D1D5DB":"#374151",fontWeight:600,fontSize:13,cursor:page===totalPages?"not-allowed":"pointer" }}>
                Next <ChevronRight size={14}/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsTab;