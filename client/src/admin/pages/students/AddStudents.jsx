import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { User, Mail, Phone, MapPin, Upload, X, Loader2, AlertCircle, Lock, Heart, Users, BookOpen, CheckCircle, FileText, Plus, Trash2, Image as ImgIcon, File as FileIcon, Save, ArrowLeft, Eye, EyeOff, GraduationCap, Activity, ChevronRight, Shield, BadgeCheck } from "lucide-react";
import PageLayout from "../../components/PageLayout";

const API = import.meta.env.VITE_API_URL;
const tok = () => localStorage.getItem("token");
const auth = () => ({ Authorization: `Bearer ${tok()}` });
const toBlood = v => v ? v.toUpperCase().replace(/\+/g,"_PLUS").replace(/-/g,"_MINUS") : undefined;
const frBlood = v => v ? v.replace("_PLUS","+").replace("_MINUS","-") : "";
const fmtB = b => !b?"":b<1024?`${b} B`:b<1048576?`${(b/1024).toFixed(1)} KB`:`${(b/1048576).toFixed(1)} MB`;
const GRADES = ["Pre-K","Kindergarten","Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7","Grade 8","Grade 9","Grade 10","Grade 11","Grade 12"];
const CLASSES = ["Class A","Class B","Class C","Class D"];
const BLOODS = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
const FDOCS = [{ id:"AADHAR_CARD",label:"Aadhar Card / ID Proof",req:true },{ id:"BIRTH_CERTIFICATE",label:"Birth Certificate",req:true },{ id:"MARKSHEET",label:"Previous Marksheet",req:true },{ id:"TRANSFER_CERTIFICATE",label:"Transfer Certificate",req:false }];
const TABS = [{ id:"personal",label:"Personal Information",icon:User },{ id:"contact",label:"Contact Information",icon:MapPin },{ id:"login",label:"Login Credentials",icon:Lock },{ id:"academic",label:"Academic Information",icon:GraduationCap },{ id:"parent",label:"Parent / Guardian",icon:Users },{ id:"health",label:"Health Information",icon:Heart },{ id:"documents",label:"Documents",icon:FileText }];
const E0 = { fn:"",ln:"",dob:"",gender:"",email:"",phone:"",zip:"",addr:"",city:"",state:"",uname:"",lemail:"",pw:"",grade:"",cls:"",admDate:"",status:"ACTIVE",pNm:"",pPh:"",pEm:"",pOc:"",pRl:"",gNm:"",gPh:"",gEm:"",gOc:"",gRl:"",emg:"",blood:"",ht:"",wt:"",bmarks:"",cond:"",allg:"" };

export default function AddStudent({ onClose, closeModal, onSuccess }) {
  const { id: rid } = useParams();
  const navigate = useNavigate?.() ?? null;
  const isModal = !!(onClose || closeModal);
  const isEdit = !!rid;
  const doClose = isModal ? (onClose || closeModal) : () => navigate("/students");

  const [tab, setTab] = useState("personal");
  const [sid, setSid] = useState(rid || null);
  const [photo, setPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [showPw, setShowPw] = useState(false);
  const [ptab, setPtab] = useState("parent");
  const [fdocs, setFdocs] = useState(Object.fromEntries(FDOCS.map(d => [d.id, null])));
  const [xdocs, setXdocs] = useState([]);
  const [pcerts, setPcerts] = useState([]);
  const [docErr, setDocErr] = useState("");
  const [f, setF] = useState(E0);
  const photoRef = useRef(); const frefs = useRef({});
  const set = k => e => { setF(p => ({ ...p, [k]: e.target.value })); setErr(p => ({ ...p, [k]: "" })); };

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const r = await fetch(`${API}/api/students/${rid}`, { headers: auth() });
        const d = await r.json(); if (!r.ok) throw new Error(d.message);
        const s = d.student, pi = s.personalInfo || {};
        setF({ fn:pi.firstName||"",ln:pi.lastName||"",dob:pi.dateOfBirth?pi.dateOfBirth.slice(0,10):"",gender:pi.gender||"",email:s.email||"",phone:pi.phone||"",zip:pi.zipCode||"",addr:pi.address||"",city:pi.city||"",state:pi.state||"",uname:pi.studentUsername||"",lemail:s.email||"",pw:"",grade:pi.grade||"",cls:pi.className||"",admDate:pi.admissionDate?pi.admissionDate.slice(0,10):"",status:pi.status||"ACTIVE",pNm:pi.parentName||"",pPh:pi.parentPhone||"",pEm:pi.parentEmail||"",pOc:pi.parentOccupation||"",pRl:pi.parentRelation||"",gNm:pi.guardianName||"",gPh:pi.guardianPhone||"",gEm:pi.guardianEmail||"",gOc:pi.guardianOccupation||"",gRl:pi.guardianRelation||"",emg:pi.emergencyContact||"",blood:frBlood(pi.bloodGroup),ht:pi.height||"",wt:pi.weight||"",bmarks:pi.birthMarks||"",cond:pi.medicalConditions||"",allg:pi.allergies||"" });
        if (pi.profileImage) setPhotoUrl(pi.profileImage);
      } catch (e) { setErr({ _g: e.message }); }
      finally { setLoading(false); }
    })();
  }, [rid]);

  const validate = () => {
    const e = {};
    if (!f.fn.trim()) e.fn = "Required"; if (!f.ln.trim()) e.ln = "Required";
    if (!f.email.trim()) e.email = "Required"; else if (!/\S+@\S+\.\S+/.test(f.email)) e.email = "Invalid email";
    if (!f.phone.trim()) e.phone = "Required";
    if (!isEdit) { if (!f.pw.trim()) e.pw = "Required"; else if (f.pw.length < 6) e.pw = "Min 6 characters"; }
    setErr(e); return !Object.keys(e).length;
  };

  const saveCore = async () => {
    let id = sid;
    if (!isEdit) {
      const r = await fetch(`${API}/api/students/register`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ name:`${f.fn} ${f.ln}`.trim(), email:f.lemail||f.email, password:f.pw }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.message||"Registration failed");
      id = d.student?.id||d.id; if (!id) throw new Error("No ID returned");
      if (d.token) localStorage.setItem("token",d.token); setSid(id);
    }
    const fd = new FormData();
    const flds = { firstName:f.fn,lastName:f.ln,phone:f.phone,dateOfBirth:f.dob,gender:f.gender,zipCode:f.zip,address:f.addr,city:f.city,state:f.state,grade:f.grade,className:f.cls,admissionDate:f.admDate,status:f.status,parentName:f.pNm,parentPhone:f.pPh,parentEmail:f.pEm,parentOccupation:f.pOc,parentRelation:f.pRl,guardianName:f.gNm,guardianPhone:f.gPh,guardianEmail:f.gEm,guardianOccupation:f.gOc,guardianRelation:f.gRl,emergencyContact:f.emg,bloodGroup:toBlood(f.blood),height:f.ht,weight:f.wt,birthMarks:f.bmarks,medicalConditions:f.cond,allergies:f.allg };
    Object.entries(flds).forEach(([k,v]) => { if(v) fd.append(k,v); });
    if (photo) fd.append("profileImage",photo);
    const pr = await fetch(`${API}/api/students/${id}/personal-info`, { method:"POST",headers:auth(),body:fd });
    const pd = await pr.json(); if (!pr.ok) throw new Error(pd.message||"Save failed");
    return id;
  };

  const handleSave = async () => {
    if (!validate()) return; setBusy(true); setErr({});
    try { await saveCore(); if(onSuccess)onSuccess(); doClose(); }
    catch(e) { setErr({_g:e.message}); } finally { setBusy(false); }
  };

  const handleDocSave = async () => {
    setBusy(true); setDocErr("");
    try {
      let id = sid;
      if (!id) { if (!validate()) { setBusy(false); return; } id = await saveCore(); }
      const all = [];
      FDOCS.forEach(d => { if(fdocs[d.id]) all.push({file:fdocs[d.id],documentName:d.id,customLabel:null}); });
      xdocs.forEach(d => { if(d.file) all.push({file:d.file,documentName:"CUSTOM",customLabel:d.label||"Custom"}); });
      pcerts.forEach(d => { if(d.file) all.push({file:d.file,documentName:"PARENT_CERT",customLabel:d.label||"Parent Cert"}); });
      if (all.length > 0) {
        const fd = new FormData(), meta = [];
        all.forEach(({file,documentName,customLabel}) => { fd.append("files",file); meta.push({documentName,customLabel}); });
        fd.append("metadata",JSON.stringify(meta));
        const r = await fetch(`${API}/api/students/${id}/documents/bulk`,{method:"POST",headers:auth(),body:fd});
        const d = await r.json(); if(!r.ok) throw new Error(d.message||"Upload failed");
      }
      if(onSuccess)onSuccess(); doClose();
    } catch(e) { setDocErr(e.message); } finally { setBusy(false); }
  };

  const addExtra = () => setXdocs(p=>[...p,{id:Date.now(),label:"",file:null}]);
  const rmFixed = id => { setFdocs(p=>({...p,[id]:null})); if(frefs.current[id]) frefs.current[id].value=""; };

  const tabIdx = TABS.findIndex(t => t.id === tab);
  const isLast = tabIdx === TABS.length - 1;
  const totalUploads = Object.values(fdocs).filter(Boolean).length + xdocs.filter(d=>d.file).length;
  const ic = (e,i) => `w-full text-sm border rounded-lg py-2.5 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${i?"pl-9":"pl-3"} ${e?"border-red-400 bg-red-50/50":"border-gray-200 bg-white"}`;
  const sc = "w-full text-sm border border-gray-200 bg-white rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const tc = "w-full text-sm border border-gray-200 bg-white rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none";
  const lbl = (t,r) => <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">{t}{r&&<span className="text-red-500 ml-0.5">*</span>}</label>;
  const et = k => err[k] && <p className="flex items-center gap-1 text-xs text-red-500 mt-1"><AlertCircle size={11}/>{err[k]}</p>;
  const hn = t => <p className="text-[11px] text-gray-400 mt-1">{t}</p>;
  const SH = ({icon:I,title,color,desc}) => { const m={blue:"bg-blue-100 text-blue-600",purple:"bg-purple-100 text-purple-600",red:"bg-red-100 text-red-600",green:"bg-green-100 text-green-600",orange:"bg-orange-100 text-orange-600",pink:"bg-pink-100 text-pink-600",indigo:"bg-indigo-100 text-indigo-600"}[color]||"bg-blue-100 text-blue-600"; const [bg,tx]=m.split(" "); return <div className="flex items-center gap-3 pb-3 border-b border-gray-100 mb-3"><div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}><I size={16} className={tx}/></div><div><p className="font-bold text-gray-800 text-sm">{title}</p>{desc&&<p className="text-[11px] text-gray-400">{desc}</p>}</div></div>; };

  if (loading) return (
    <div className={isModal?"fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm":""}>
      <div className="bg-white rounded-2xl p-10 shadow-2xl w-full max-w-4xl space-y-3">{[...Array(5)].map((_,i)=><div key={i} className="h-9 bg-gray-100 rounded-lg animate-pulse"/>)}</div>
    </div>
  );

  const shell = (
    <div className="w-full bg-white rounded-2xl shadow-2xl flex flex-col" style={{maxWidth:isModal?"72rem":"100%"}}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div><h1 className="text-lg font-bold text-gray-900">{isEdit?`Edit Student — ${f.fn||"…"}`:"Add New Student"}</h1><p className="text-xs text-gray-400 mt-0.5">Fill in the details across all sections</p></div>
        <button onClick={doClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18}/></button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-100 bg-gray-50/40 px-4 pt-3 overflow-x-auto">
        <div className="flex gap-0.5 min-w-max">
          {TABS.map(({id,label:lbl2,icon:Icon})=>(
            <button key={id} onClick={()=>setTab(id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${tab===id?"border-blue-600 text-blue-700 bg-white shadow-sm":"border-transparent text-gray-500 hover:text-gray-700 hover:bg-white/60"}`}>
              <Icon size={14}/>{lbl2}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Preview sidebar */}
        <div className="w-52 shrink-0 border-r border-gray-100 bg-gray-50/30 p-4 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Profile Photo</p>
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md relative">
                {photoUrl?<img src={photoUrl} alt="" className="w-full h-full object-cover"/>:<User size={26} className="text-white/80"/>}
                {photoUrl&&<button onClick={()=>{setPhoto(null);setPhotoUrl(null);}} className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"><X size={9}/></button>}
              </div>
              <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>{const fl=e.target.files[0];if(fl){setPhoto(fl);setPhotoUrl(URL.createObjectURL(fl));}}}/>
              <button onClick={()=>photoRef.current?.click()} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-[11px] font-medium text-gray-600 hover:border-blue-300 hover:bg-gray-50 transition"><Upload size={11}/>{photoUrl?"Change":"Upload Photo"}</button>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 flex-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Preview</p>
            <div className="space-y-2.5">
              {[{l:"Name",v:[f.fn,f.ln].filter(Boolean).join(" ")||"—",I:User},{l:"Grade",v:f.grade||"—",I:GraduationCap},{l:"Class",v:f.cls||"—",I:BookOpen},{l:"Phone",v:f.phone||"—",I:Phone},{l:"Gender",v:f.gender||"—",I:User},{l:"DOB",v:f.dob||"—",I:BadgeCheck},{l:"Blood",v:f.blood||"—",I:Activity}].map(({l,v,I})=>(
                <div key={l} className="flex items-start gap-2"><I size={11} className="text-gray-400 mt-0.5 shrink-0"/><div className="min-w-0"><p className="text-[9px] text-gray-400 leading-none mb-0.5">{l}</p><p className="text-xs font-medium text-gray-700 truncate">{v}</p></div></div>
              ))}
            </div>
          </div>
          <div className={`rounded-xl px-3 py-2 text-center text-xs font-semibold ${f.status==="ACTIVE"?"bg-green-50 text-green-700 border border-green-100":"bg-gray-100 text-gray-500"}`}>{f.status||"ACTIVE"}</div>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{maxHeight:isModal?"62vh":"68vh"}}>
          {err._g&&<div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600"><AlertCircle size={15} className="shrink-0"/>{err._g}</div>}

          {tab==="personal"&&<><SH icon={User} title="Personal Information" color="blue" desc="Basic student identity"/>
            <div className="grid grid-cols-2 gap-4">
              <div>{lbl("First Name",true)}<input placeholder="First name" value={f.fn} onChange={set("fn")} className={ic(err.fn,false)}/>{et("fn")}</div>
              <div>{lbl("Last Name",true)}<input placeholder="Last name" value={f.ln} onChange={set("ln")} className={ic(err.ln,false)}/>{et("ln")}</div>
              <div>{lbl("Date of Birth")}<input type="date" value={f.dob} onChange={set("dob")} className={ic(false,false)}/></div>
              <div>{lbl("Gender")}<select value={f.gender} onChange={set("gender")} className={sc}><option value="">Select gender</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></div>
            </div></>}

          {tab==="contact"&&<><SH icon={MapPin} title="Contact Information" color="purple" desc="How to reach the student"/>
            <div>{lbl("Email",true)}<div className="relative"><Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="email" placeholder="student@school.com" value={f.email} onChange={set("email")} className={ic(err.email,true)}/></div>{et("email")}</div>
            <div className="grid grid-cols-2 gap-3">
              <div>{lbl("Phone",true)}<div className="relative"><Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="tel" placeholder="+91 98765-43210" value={f.phone} onChange={set("phone")} className={ic(err.phone,true)}/></div>{et("phone")}</div>
              <div>{lbl("Zip Code")}<input placeholder="Zip code" value={f.zip} onChange={set("zip")} className={ic(false,false)}/></div>
            </div>
            <div>{lbl("Street Address")}<input placeholder="Street address" value={f.addr} onChange={set("addr")} className={ic(false,false)}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div>{lbl("City")}<input placeholder="City" value={f.city} onChange={set("city")} className={ic(false,false)}/></div>
              <div>{lbl("State")}<input placeholder="State" value={f.state} onChange={set("state")} className={ic(false,false)}/></div>
            </div></>}

          {tab==="login"&&<><SH icon={Lock} title="Login Credentials" color="red" desc="Student portal access details"/>
            <div>{lbl("Student Username")}<div className="relative"><User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input placeholder="e.g. john.doe2025" value={f.uname} onChange={set("uname")} className={ic(false,true)}/></div>{hn("Used to log in to the portal")}</div>
            <div>{lbl("Student Login Email",true)}<div className="relative"><Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="email" placeholder="student@school.com" value={f.lemail||f.email} onChange={set("lemail")} className={ic(err.email,true)}/></div>{et("email")}</div>
            <div>{lbl(isEdit?"New Password (optional)":"Password",!isEdit)}
              <div className="relative"><Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input type={showPw?"text":"password"} placeholder={isEdit?"Leave blank to keep current":"Min. 6 characters"} value={f.pw} onChange={set("pw")} className={ic(err.pw,true)+" pr-10"}/>
                <button type="button" onClick={()=>setShowPw(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showPw?<EyeOff size={14}/>:<Eye size={14}/>}</button>
              </div>{et("pw")}{!err.pw&&hn(isEdit?"Leave blank to keep existing password":"Minimum 6 characters")}
            </div></>}

          {tab==="academic"&&<><SH icon={GraduationCap} title="Academic Information" color="green" desc="Grade, class and enrollment"/>
            <div className="grid grid-cols-2 gap-4">
              <div>{lbl("Grade")}<select value={f.grade} onChange={set("grade")} className={sc}><option value="">Select grade</option>{GRADES.map(g=><option key={g} value={g}>{g}</option>)}</select></div>
              <div>{lbl("Class")}<select value={f.cls} onChange={set("cls")} className={sc}><option value="">Select class</option>{CLASSES.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              <div>{lbl("Admission Date")}<input type="date" value={f.admDate} onChange={set("admDate")} className={ic(false,false)}/></div>
              <div>{lbl("Status")}<select value={f.status} onChange={set("status")} className={sc}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="SUSPENDED">Suspended</option><option value="GRADUATED">Graduated</option></select></div>
            </div></>}

          {tab==="parent"&&<><SH icon={Users} title="Parent / Guardian" color="orange" desc="Family contact and emergency info"/>
            <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
              {[{id:"parent",l:"Parent"},{id:"guardian",l:"Guardian"}].map(({id,l})=>(
                <button key={id} onClick={()=>setPtab(id)} className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${ptab===id?"bg-white shadow text-gray-800 border border-gray-200":"text-gray-500 hover:text-gray-700"}`}>{l}</button>
              ))}
            </div>
            {ptab==="parent"&&<>
              <div className="grid grid-cols-2 gap-3">
                <div>{lbl("Parent Full Name")}<div className="relative"><User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input placeholder="Parent name" value={f.pNm} onChange={set("pNm")} className={ic(false,true)}/></div></div>
                <div>{lbl("Relation")}<select value={f.pRl} onChange={set("pRl")} className={sc}><option value="">Select</option><option value="Father">Father</option><option value="Mother">Mother</option><option value="Other">Other</option></select></div>
                <div>{lbl("Parent Phone")}<div className="relative"><Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="tel" placeholder="+91 98765-43210" value={f.pPh} onChange={set("pPh")} className={ic(false,true)}/></div></div>
                <div>{lbl("Parent Email")}<div className="relative"><Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="email" placeholder="parent@example.com" value={f.pEm} onChange={set("pEm")} className={ic(false,true)}/></div></div>
                <div>{lbl("Occupation")}<input placeholder="e.g. Engineer" value={f.pOc} onChange={set("pOc")} className={ic(false,false)}/></div>
                <div>{lbl("Emergency Contact")}<div className="relative"><Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="tel" placeholder="Emergency number" value={f.emg} onChange={set("emg")} className={ic(false,true)}/></div></div>
              </div>
              <div className="rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">Parent Certificates <span className="font-normal text-orange-400">(Optional)</span></p>
                  <button onClick={()=>setPcerts(p=>[...p,{id:Date.now(),label:"",file:null}])} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition"><Plus size={11}/>Add</button>
                </div>
                {pcerts.length===0?<p className="text-xs text-gray-400 text-center py-2">No certificates added.</p>:(
                  <div className="space-y-2">{pcerts.map((c,i)=>(
                    <div key={c.id} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-orange-100">
                      <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</span>
                      <input value={c.label} onChange={e=>setPcerts(p=>p.map(d=>d.id===c.id?{...d,label:e.target.value}:d))} placeholder="Certificate name" className="flex-1 text-sm px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white min-w-0"/>
                      <label className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${c.file?"bg-green-50 border border-green-200 text-green-700":"bg-white border border-gray-200 text-gray-500 hover:border-orange-300"}`}>
                        {c.file?<><CheckCircle size={11}/>{c.file.name.slice(0,12)}</>:<><Upload size={11}/>Upload</>}
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e=>setPcerts(p=>p.map(d=>d.id===c.id?{...d,file:e.target.files[0]}:d))} className="hidden"/>
                      </label>
                      <button onClick={()=>setPcerts(p=>p.filter(d=>d.id!==c.id))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-gray-300 hover:text-red-500"><Trash2 size={12}/></button>
                    </div>
                  ))}</div>
                )}
              </div>
            </>}
            {ptab==="guardian"&&<div className="grid grid-cols-2 gap-3">
              <div>{lbl("Guardian Full Name")}<div className="relative"><Shield size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input placeholder="Guardian name" value={f.gNm} onChange={set("gNm")} className={ic(false,true)}/></div></div>
              <div>{lbl("Relation")}<select value={f.gRl} onChange={set("gRl")} className={sc}><option value="">Select</option><option value="Uncle">Uncle</option><option value="Aunt">Aunt</option><option value="Grandparent">Grandparent</option><option value="Sibling">Sibling</option><option value="Other">Other</option></select></div>
              <div>{lbl("Guardian Phone")}<div className="relative"><Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="tel" placeholder="+91 98765-43210" value={f.gPh} onChange={set("gPh")} className={ic(false,true)}/></div></div>
              <div>{lbl("Guardian Email")}<div className="relative"><Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input type="email" placeholder="guardian@example.com" value={f.gEm} onChange={set("gEm")} className={ic(false,true)}/></div></div>
              <div className="col-span-2">{lbl("Occupation")}<input placeholder="e.g. Doctor" value={f.gOc} onChange={set("gOc")} className={ic(false,false)}/></div>
            </div>}
          </>}

          {tab==="health"&&<><SH icon={Heart} title="Health Information" color="pink" desc="Medical and physical details"/>
            <div className="grid grid-cols-2 gap-4">
              <div>{lbl("Blood Group")}<select value={f.blood} onChange={set("blood")} className={sc}><option value="">Select blood group</option>{BLOODS.map(b=><option key={b} value={b}>{b}</option>)}</select></div>
              <div></div>
              <div>{lbl("Height (cm)")}<input type="number" placeholder="e.g. 145" value={f.ht} onChange={set("ht")} className={ic(false,false)}/></div>
              <div>{lbl("Weight (kg)")}<input type="number" placeholder="e.g. 40" value={f.wt} onChange={set("wt")} className={ic(false,false)}/></div>
              <div className="col-span-2">{lbl("Birth Marks / Moles")}<textarea rows={2} placeholder="e.g. Small mole on right cheek" value={f.bmarks} onChange={set("bmarks")} className={tc}/>{hn("Distinguishing marks for identification")}</div>
              <div className="col-span-2">{lbl("Medical Conditions")}<textarea rows={2} placeholder="e.g. Asthma, Diabetes" value={f.cond} onChange={set("cond")} className={tc}/></div>
              <div className="col-span-2">{lbl("Allergies")}<textarea rows={2} placeholder="e.g. Peanuts, Penicillin" value={f.allg} onChange={set("allg")} className={tc}/></div>
            </div></>}

          {tab==="documents"&&<><SH icon={FileText} title="Documents" color="indigo" desc="Upload official student documents"/>
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-amber-500 shrink-0"/>
              <p className="text-xs text-amber-700">Document upload is <strong>optional</strong>. You can save without uploading any files.</p>
            </div>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-indigo-50/60 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">Required Documents</p>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2.5 py-1 rounded-full">{Object.values(fdocs).filter(Boolean).length}/{FDOCS.length}</span>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                {FDOCS.map(doc=>{const file=fdocs[doc.id];return(
                  <div key={doc.id} className={`rounded-xl border-2 border-dashed transition-all ${file?"border-green-300 bg-green-50":"border-gray-200 hover:border-blue-300 hover:bg-blue-50/40"}`}>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" ref={el=>frefs.current[doc.id]=el} onChange={e=>setFdocs(p=>({...p,[doc.id]:e.target.files[0]}))} className="hidden" id={`fd-${doc.id}`}/>
                    {file?(
                      <div className="flex items-center gap-2 p-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-green-200 flex items-center justify-center shrink-0">{file.type?.startsWith("image/")?<ImgIcon size={14} className="text-blue-500"/>:<FileIcon size={14} className="text-orange-500"/>}</div>
                        <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-gray-700">{doc.label}</p><p className="text-[10px] text-gray-400 truncate">{file.name}</p><span className="text-[10px] text-green-600 font-medium flex items-center gap-1"><CheckCircle size={9}/>Uploaded · {fmtB(file.size)}</span></div>
                        <button onClick={()=>rmFixed(doc.id)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-100 text-gray-300 hover:text-red-500"><Trash2 size={11}/></button>
                      </div>
                    ):(
                      <label htmlFor={`fd-${doc.id}`} className="flex flex-col items-center gap-1.5 p-4 cursor-pointer">
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center"><Upload size={14} className="text-gray-400"/></div>
                        <p className="text-xs font-semibold text-gray-700 text-center">{doc.label}{doc.req&&<span className="text-red-500 ml-1">*</span>}</p>
                        <p className="text-[11px] text-gray-400">PDF, JPG, PNG, DOC</p>
                      </label>
                    )}
                  </div>
                );})}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-amber-50/60 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">Additional Documents <span className="text-xs text-gray-400 font-normal">(Optional)</span></p>
                <button onClick={addExtra} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold hover:bg-amber-600 transition"><Plus size={11}/>Add</button>
              </div>
              <div className="p-4">
                {xdocs.length===0?<p className="text-xs text-gray-400 text-center py-4">No additional documents. Click "Add" to upload.</p>:(
                  <div className="space-y-2">{xdocs.map((doc,i)=>(
                    <div key={doc.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                      <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</span>
                      <input value={doc.label} onChange={e=>setXdocs(p=>p.map(d=>d.id===doc.id?{...d,label:e.target.value}:d))} placeholder="Document name" className="flex-1 text-sm px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-0"/>
                      <label className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${doc.file?"bg-green-50 border border-green-200 text-green-700":"bg-white border border-gray-200 text-gray-500 hover:border-blue-300"}`}>
                        {doc.file?<><CheckCircle size={11}/>{doc.file.name.length>12?doc.file.name.slice(0,12)+"…":doc.file.name}</>:<><Upload size={11}/>Upload</>}
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e=>setXdocs(p=>p.map(d=>d.id===doc.id?{...d,file:e.target.files[0]}:d))} className="hidden"/>
                      </label>
                      <button onClick={()=>setXdocs(p=>p.filter(d=>d.id!==doc.id))} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-gray-300 hover:text-red-500"><Trash2 size={12}/></button>
                    </div>
                  ))}</div>
                )}
              </div>
            </div>
            {docErr&&<div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600"><AlertCircle size={15} className="shrink-0"/>{docErr}</div>}
          </>}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
        <button onClick={doClose} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition text-sm font-medium text-gray-500"><X size={14}/>Cancel</button>
        <div className="flex items-center gap-3">
          {!isLast&&<button onClick={()=>setTab(TABS[tabIdx+1].id)} className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl shadow-sm transition-all">Next<ChevronRight size={15}/></button>}
          {isLast?(
            <button onClick={handleDocSave} disabled={busy} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm transition-all">
              {busy?<Loader2 size={15} className="animate-spin"/>:<Save size={15}/>}
              {busy?"Saving…":totalUploads>0?`Save with Documents (${totalUploads})`:"Save Student"}
            </button>
          ):(
            <button onClick={handleSave} disabled={busy} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm transition-all">
              {busy?<Loader2 size={15} className="animate-spin"/>:<Save size={15}/>}{busy?"Saving…":isEdit?"Save Changes":"Save Student"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (isModal) return <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-6 px-4">{shell}</div>;
  return <PageLayout><div className="p-4 md:p-6"><div className="flex items-center gap-3 mb-6"><button onClick={doClose} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 font-medium"><ArrowLeft size={16}/>Back to Students</button></div>{shell}</div></PageLayout>;
}
