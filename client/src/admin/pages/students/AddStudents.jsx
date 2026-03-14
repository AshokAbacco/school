// admin/pages/students/AddStudents.jsx
import { useState, useRef, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Heart,
  Users,
  FileText,
  Save,
  ArrowLeft,
  Eye,
  EyeOff,
  GraduationCap,
  Shield,
  X,
  Loader2,
  AlertCircle,
  ChevronRight,
  BookOpen,
  Activity,
  BadgeCheck,
} from "lucide-react";
import PageLayout from "../../components/PageLayout";
import { getToken } from "../../../auth/storage";
import { COLORS, InputField } from "./components/FormFields";
import StudentFormSidebar from "./components/StudentFormSidebar";
import DocumentUploadSection from "./components/DocumentUploadSection";
import { useInstitutionConfig } from "../classes/hooks/useInstitutionConfig";

const API = import.meta.env.VITE_API_URL;
const auth = () => ({ Authorization: `Bearer ${getToken()}` });

const toBlood = (v) =>
  v
    ? v.toUpperCase().replace(/\+/g, "_PLUS").replace(/-/g, "_MINUS")
    : undefined;
const frBlood = (v) =>
  v ? v.replace("_PLUS", "+").replace("_MINUS", "-") : "";

const BLOODS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const MOTHER_TONGUES = [
  "Kannada",
  "Telugu",
  "Tamil",
  "Hindi",
  "English",
  "Urdu",
  "Marathi",
  "Malayalam",
  "Tulu",
  "Konkani",
  "Other",
];

const SCHOOL_BOARDS = [
  { value: "KSEEB", label: "KSEEB (Karnataka State Board)" },
  { value: "CBSE", label: "CBSE" },
  { value: "ICSE", label: "ICSE" },
  { value: "NIOS", label: "NIOS (National Open School)" },
  { value: "IB", label: "IB (International Baccalaureate)" },
  { value: "IGCSE", label: "IGCSE" },
  { value: "STATE", label: "Other State Board" },
  { value: "OTHER", label: "Other" },
];

const TABS = [
  { id: "personal", label: "Personal", icon: User },
  { id: "contact", label: "Contact", icon: MapPin },
  { id: "login", label: "Login", icon: Lock },
  { id: "academic", label: "Academic", icon: GraduationCap },
  { id: "parent", label: "Parent", icon: Users },
  { id: "health", label: "Health", icon: Heart },
  { id: "documents", label: "Documents", icon: FileText },
];

const E0 = {
  // Personal
  fn: "",
  ln: "",
  dob: "",
  gender: "",
  email: "",
  phone: "",
  zip: "",
  addr: "",
  city: "",
  state: "",
  // Login
  uname: "",
  lemail: "",
  pw: "",
  // Government / Identity
  aadhaarNumber: "",
  panNumber: "",
  satsNumber: "",
  nationality: "Indian",
  religion: "",
  casteCategory: "",
  // NEW Karnataka personal
  motherTongue: "",
  subcaste: "",
  domicileState: "Karnataka",
  annualIncome: "",
  physicallyChallenged: false,
  disabilityType: "",
  // Academic
  admissionNumber: "",
  classSectionId: "",
  academicYearId: "",
  rollNumber: "",
  externalId: "",
  admDate: "",
  status: "ACTIVE",
  // NEW Academic — previous institution
  prevSchool: "",
  prevBoard: "",
  udiseCode: "",
  lateralEntry: false,
  // Parent (Father / Mother)
  pNm: "",
  pPh: "",
  pEm: "",
  pOc: "",
  pRl: "FATHER",
  pLoginEmail: null,
  pLoginPw: "",
  mNm: "",
  mPh: "",
  mEm: "",
  mOc: "",
  mLoginEmail: null,
  mLoginPw: "",
  // Guardian
  gNm: "",
  gPh: "",
  gEm: "",
  gOc: "",
  gRl: "",
  emg: "",
  // Health
  blood: "",
  ht: "",
  wt: "",
  bmarks: "",
  cond: "",
  allg: "",
};

const sc = (extra = "") =>
  `w-full text-sm border rounded-xl py-2.5 pl-4 bg-white focus:outline-none focus:ring-2 transition-all ${extra}`;

export default function AddStudent({ onClose, closeModal, onSuccess }) {
  const { id: rid } = useParams();
  const navigate = useNavigate?.() ?? null;
  const isModal = !!(onClose || closeModal);
  const isEdit = !!rid;
  const doClose = isModal ? onClose || closeModal : () => navigate("/students");

  const { schoolType, showStream, showCourse, showBranch } =
    useInstitutionConfig();

  const [tab, setTab] = useState("personal");
  const [sid, setSid] = useState(rid || null);
  const [photo, setPhoto] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [err, setErr] = useState({});
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [showPw, setShowPw] = useState(false);
  const [showParentPw, setShowParentPw] = useState(false);
  const [showMotherPw, setShowMotherPw] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const [ptab, setPtab] = useState("father");

  // ── NEW: unified documents array ─────────────────────────────────────────
  // Each entry: { id, documentName, customLabel, file }
  const [docs, setDocs] = useState([]);

  const [docErr, setDocErr] = useState("");
  const [f, setF] = useState(E0);

  const [classSections, setClassSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // Cascade state
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedStreamId, setSelectedStreamId] = useState("");
  const [selectedCombinationId, setSelectedCombinationId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedSectionLetter, setSelectedSectionLetter] = useState("");

  const photoRef = useRef();

  const set = (k) => (e) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setErr((p) => ({ ...p, [k]: "" }));
  };

  const setToggle = (k) => (val) => setF((p) => ({ ...p, [k]: val }));

  // ── Fetch dropdowns ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingDropdowns(true);
      try {
        const [csRes, ayRes] = await Promise.all([
          fetch(`${API}/api/class-sections`, { headers: auth() }),
          fetch(`${API}/api/academic-years`, { headers: auth() }),
        ]);
        const [csData, ayData] = await Promise.all([
          csRes.json(),
          ayRes.json(),
        ]);
        setClassSections(csData.classSections || csData.data || []);
        setAcademicYears(ayData.academicYears || ayData.data || []);
      } catch {
        /* non-critical */
      } finally {
        setLoadingDropdowns(false);
      }
    })();
  }, []);

  // ── Load existing student on edit ─────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const r = await fetch(`${API}/api/students/${rid}`, {
          headers: auth(),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.message);
        const s = d.student,
          pi = s.personalInfo || {};
        const enroll = s.enrollments?.[0] || null;
        const cs = enroll?.classSection;

        // Restore parent links
        const fatherLink = s.parentLinks?.find((l) => l.relation === "FATHER");
        const motherLink = s.parentLinks?.find((l) => l.relation === "MOTHER");

        setF({
          fn: pi.firstName || "",
          ln: pi.lastName || "",
          dob: pi.dateOfBirth ? pi.dateOfBirth.slice(0, 10) : "",
          gender: pi.gender || "",
          email: s.email || "",
          phone: pi.phone || "",
          zip: pi.zipCode || "",
          addr: pi.address || "",
          city: pi.city || "",
          state: pi.state || "",
          uname: "",
          lemail: s.email || "",
          pw: "",
          admissionNumber: enroll?.admissionNumber || "",
          classSectionId: cs?.id || "",
          academicYearId: enroll?.academicYear?.id || "",
          rollNumber: enroll?.rollNumber || "",
          externalId: enroll?.externalId || "",
          admDate: enroll?.admissionDate
            ? enroll.admissionDate.slice(0, 10)
            : "",
          status: enroll?.status || "ACTIVE",
          // Identity
          aadhaarNumber: pi.aadhaarNumber || "",
          panNumber: pi.panNumber || "",
          satsNumber: pi.satsNumber || "",
          nationality: pi.nationality || "Indian",
          religion: pi.religion || "",
          casteCategory: pi.casteCategory || "",
          // Karnataka personal
          motherTongue: pi.motherTongue || "",
          subcaste: pi.subcaste || "",
          domicileState: pi.domicileState || "Karnataka",
          annualIncome: pi.annualIncome?.toString() || "",
          physicallyChallenged: pi.physicallyChallenged || false,
          disabilityType: pi.disabilityType || "",
          // Previous institution
          prevSchool: enroll?.previousSchoolName || "",
          prevBoard: enroll?.previousSchoolBoard || "",
          udiseCode: enroll?.udiseCode || "",
          lateralEntry: enroll?.lateralEntry || false,
          // Parent — Father
          pNm: fatherLink?.parent?.name || pi.parentName || "",
          pPh: fatherLink?.parent?.phone || pi.parentPhone || "",
          pEm: fatherLink?.parent?.email || pi.parentEmail || "",
          pOc: fatherLink?.parent?.occupation || "",
          pRl: "FATHER",
          pLoginEmail: null,
          pLoginPw: "",
          // Parent — Mother
          mNm: motherLink?.parent?.name || "",
          mPh: motherLink?.parent?.phone || "",
          mEm: motherLink?.parent?.email || "",
          mOc: motherLink?.parent?.occupation || "",
          mLoginEmail: null,
          mLoginPw: "",
          // Guardian
          gNm: "",
          gPh: "",
          gEm: "",
          gOc: "",
          gRl: "",
          emg: pi.emergencyContact || "",
          // Health
          blood: frBlood(pi.bloodGroup),
          ht: pi.heightCm?.toString() || "",
          wt: pi.weightKg?.toString() || "",
          bmarks: pi.identifyingMarks || "",
          cond: pi.medicalConditions || "",
          allg: pi.allergies || "",
        });

        // Restore cascade
        if (cs) {
          if (schoolType === "SCHOOL") {
            setSelectedGrade(cs.grade?.replace("Grade ", "") || "");
            setSelectedSectionLetter(cs.section || "");
          } else if (schoolType === "PUC") {
            setSelectedGrade(cs.grade || "");
            setSelectedStreamId(cs.streamId || "");
            setSelectedCombinationId(cs.combinationId || "");
          } else {
            setSelectedCourseId(cs.courseId || "");
            setSelectedBranchId(cs.branchId || "");
            setSelectedSemester(cs.grade || "");
            setSelectedSectionLetter(cs.section || "");
          }
        }

        if (pi.profileImage) setPhotoUrl(pi.profileImage);
      } catch (e) {
        setErr({ _g: e.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [rid]);

  // ── Cascade derived data ──────────────────────────────────────────────────
  const schoolGrades = useMemo(() => {
    if (schoolType !== "SCHOOL") return [];
    const nums = [
      ...new Set(
        classSections
          .map((cs) => {
            const m = cs.grade?.match(/\d+/);
            return m ? parseInt(m[0]) : null;
          })
          .filter(Boolean),
      ),
    ].sort((a, b) => a - b);
    return nums;
  }, [classSections, schoolType]);

  const schoolSections = useMemo(() => {
    if (schoolType !== "SCHOOL" || !selectedGrade) return [];
    return classSections.filter(
      (cs) =>
        cs.grade === `Grade ${selectedGrade}` || // stored as "Grade 1"
        cs.grade === String(selectedGrade) || // stored as "1"
        cs.grade === `${selectedGrade}`, // any other plain format
    );
  }, [classSections, schoolType, selectedGrade]);

  const pucGrades = useMemo(() => {
    if (schoolType !== "PUC") return [];
    return [...new Set(classSections.map((cs) => cs.grade))].sort();
  }, [classSections, schoolType]);

  const pucStreams = useMemo(() => {
    if (schoolType !== "PUC" || !selectedGrade) return [];
    const filtered = classSections.filter(
      (cs) => cs.grade === selectedGrade && cs.stream,
    );
    const seen = new Set();
    return filtered.reduce((acc, cs) => {
      if (cs.stream && !seen.has(cs.stream.id)) {
        seen.add(cs.stream.id);
        acc.push(cs.stream);
      }
      return acc;
    }, []);
  }, [classSections, schoolType, selectedGrade]);

  const pucCombinations = useMemo(() => {
    if (schoolType !== "PUC" || !selectedStreamId) return [];
    const filtered = classSections.filter(
      (cs) => cs.streamId === selectedStreamId && cs.combination,
    );
    const seen = new Set();
    return filtered.reduce((acc, cs) => {
      if (cs.combination && !seen.has(cs.combination.id)) {
        seen.add(cs.combination.id);
        acc.push(cs.combination);
      }
      return acc;
    }, []);
  }, [classSections, schoolType, selectedStreamId]);

  const selectedStreamObj = useMemo(
    () => pucStreams.find((s) => s.id === selectedStreamId),
    [pucStreams, selectedStreamId],
  );
  // Derived from actual data — true if this stream's sections actually have combinations
  const streamHasCombinations = pucCombinations.length > 0;

  const degreeCourses = useMemo(() => {
    if (!showCourse) return [];
    const seen = new Set();
    return classSections.reduce((acc, cs) => {
      if (cs.course && !seen.has(cs.course.id)) {
        seen.add(cs.course.id);
        acc.push(cs.course);
      }
      return acc;
    }, []);
  }, [classSections, showCourse]);

  const selectedCourseObj = useMemo(
    () => degreeCourses.find((c) => c.id === selectedCourseId),
    [degreeCourses, selectedCourseId],
  );
  // Use actual branch data presence, not just the hasBranches flag
  // This handles cases where hasBranches flag may be false but sections have branches
  const degreeBranches = useMemo(() => {
    if (!showCourse || !selectedCourseId) return [];
    const filtered = classSections.filter(
      (cs) => cs.courseId === selectedCourseId && cs.branch,
    );
    const seen = new Set();
    return filtered.reduce((acc, cs) => {
      if (cs.branch && !seen.has(cs.branch.id)) {
        seen.add(cs.branch.id);
        acc.push(cs.branch);
      }
      return acc;
    }, []);
  }, [classSections, showCourse, selectedCourseId]);

  // Derived from actual data — true if this course's sections actually have branches
  const courseHasBranches = degreeBranches.length > 0;

  const degreeSemesters = useMemo(() => {
    if (!showCourse || !selectedCourseId) return [];
    const filtered = classSections.filter((cs) => {
      if (cs.courseId !== selectedCourseId) return false;
      if (courseHasBranches && cs.branchId !== selectedBranchId) return false;
      return true;
    });
    const seen = new Set();
    return filtered
      .map((cs) => cs.grade)
      .filter((g) => {
        if (seen.has(g)) return false;
        seen.add(g);
        return true;
      })
      .sort((a, b) => {
        const na = parseInt(a),
          nb = parseInt(b);
        return isNaN(na) || isNaN(nb) ? a.localeCompare(b) : na - nb;
      });
  }, [
    classSections,
    showCourse,
    selectedCourseId,
    courseHasBranches,
    selectedBranchId,
  ]);

  const degreeSectionLetters = useMemo(() => {
    if (!showCourse || !selectedCourseId || !selectedSemester) return [];
    const filtered = classSections.filter((cs) => {
      if (cs.courseId !== selectedCourseId) return false;
      if (courseHasBranches && cs.branchId !== selectedBranchId) return false;
      if (cs.grade !== selectedSemester) return false;
      return true;
    });
    return filtered.map((cs) => ({
      id: cs.id,
      section: cs.section,
      name: cs.name,
    }));
  }, [
    classSections,
    showCourse,
    selectedCourseId,
    courseHasBranches,
    selectedBranchId,
    selectedSemester,
  ]);

  // ── Auto-resolve classSectionId ───────────────────────────────────────────
  useEffect(() => {
    if (schoolType === "SCHOOL") {
      if (!selectedGrade || !selectedSectionLetter) {
        setF((p) => ({ ...p, classSectionId: "" }));
        return;
      }
      const match = classSections.find(
        (cs) =>
          (cs.grade === `Grade ${selectedGrade}` ||
            cs.grade === String(selectedGrade) ||
            cs.grade === `${selectedGrade}`) &&
          (cs.section === selectedSectionLetter ||
            cs.id === selectedSectionLetter),
      );
      setF((p) => ({ ...p, classSectionId: match?.id || "" }));
    }
  }, [selectedGrade, selectedSectionLetter, classSections, schoolType]);

  useEffect(() => {
    if (schoolType === "PUC") {
      if (!selectedGrade || !selectedStreamId) {
        setF((p) => ({ ...p, classSectionId: "" }));
        return;
      }
      if (streamHasCombinations && !selectedCombinationId) {
        setF((p) => ({ ...p, classSectionId: "" }));
        return;
      }
      const match = classSections.find((cs) => {
        if (cs.grade !== selectedGrade) return false;
        if (cs.streamId !== selectedStreamId) return false;
        if (streamHasCombinations && cs.combinationId !== selectedCombinationId)
          return false;
        return true;
      });
      setF((p) => ({ ...p, classSectionId: match?.id || "" }));
    }
  }, [
    selectedGrade,
    selectedStreamId,
    selectedCombinationId,
    streamHasCombinations,
    classSections,
    schoolType,
  ]);

  useEffect(() => {
    if (showCourse) {
      if (!selectedCourseId || !selectedSemester) {
        setF((p) => ({ ...p, classSectionId: "" }));
        return;
      }
      if (courseHasBranches && !selectedBranchId) {
        setF((p) => ({ ...p, classSectionId: "" }));
        return;
      }
      if (degreeSectionLetters.length === 1) {
        setSelectedSectionLetter(degreeSectionLetters[0].section);
        setF((p) => ({ ...p, classSectionId: degreeSectionLetters[0].id }));
        return;
      }
      if (!selectedSectionLetter) {
        setF((p) => ({ ...p, classSectionId: "" }));
        return;
      }
      const match = degreeSectionLetters.find(
        (s) => s.section === selectedSectionLetter,
      );
      setF((p) => ({ ...p, classSectionId: match?.id || "" }));
    }
  }, [
    selectedCourseId,
    selectedBranchId,
    selectedSemester,
    selectedSectionLetter,
    courseHasBranches,
    degreeSectionLetters,
    showCourse,
  ]);

  const resetStream = () => {
    setSelectedStreamId("");
    setSelectedCombinationId("");
  };
  const resetCombination = () => setSelectedCombinationId("");
  const resetBranch = () => {
    setSelectedBranchId("");
    setSelectedSemester("");
    setSelectedSectionLetter("");
  };
  const resetSemester = () => {
    setSelectedSemester("");
    setSelectedSectionLetter("");
  };
  const resetSectionLetter = () => setSelectedSectionLetter("");

  // ── Validation ────────────────────────────────────────────────────────────
  const TAB_FIELD_MAP = {
    personal: ["fn", "ln", "dob", "gender"],
    contact: ["email", "phone", "addr", "city", "state", "zip"],
    login: ["pw", "lemail"],
    academic: [
      "admissionNumber",
      "classSectionId",
      "academicYearId",
      "admDate",
    ],
    parent: ["pNm", "pPh", "pEm"],
    health: ["blood"],
    documents: [],
  };

  const validate = () => {
    const e = {};
    if (!f.fn.trim()) e.fn = "First Name is required";
    if (!f.ln.trim()) e.ln = "Last Name is required";
    if (!f.email.trim()) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(f.email)) e.email = "Email is invalid";
    if (!f.phone.trim()) e.phone = "Phone is required";
    if (!isEdit) {
      if (!f.pw.trim()) e.pw = "Password is required";
      else if (f.pw.length < 6) e.pw = "Password must be at least 6 characters";
    }
    if (!f.admissionNumber.trim())
      e.admissionNumber = "Admission Number is required";

    const tabErrors = {};
    Object.entries(TAB_FIELD_MAP).forEach(([tabId, keys]) => {
      const errsInTab = keys.filter((k) => e[k]).map((k) => e[k]);
      if (errsInTab.length) tabErrors[tabId] = errsInTab;
    });
    e._tabErrors = tabErrors;
    setErr(e);
    return !Object.keys(e).filter((k) => k !== "_tabErrors").length;
  };

  const tabHasError = (tabId) =>
    !!(err._tabErrors && err._tabErrors[tabId]?.length);

  // ── Save core ─────────────────────────────────────────────────────────────
  const saveCore = async () => {
    let id = sid;
    if (!isEdit) {
      const r = await fetch(`${API}/api/students/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth() },
        body: JSON.stringify({
          name: `${f.fn} ${f.ln}`.trim(),
          email: f.lemail || f.email,
          password: f.pw,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.message || "Registration failed");
      id = d.student?.id || d.id;
      if (!id) throw new Error("No ID returned");
      setSid(id);
    }

    const fd = new FormData();
    const flds = {
      // Personal
      firstName: f.fn,
      lastName: f.ln,
      phone: f.phone,
      dateOfBirth: f.dob,
      gender: f.gender,
      zipCode: f.zip,
      address: f.addr,
      city: f.city,
      state: f.state,
      // Academic
      admissionNumber: f.admissionNumber,
      classSectionId: f.classSectionId,
      academicYearId: f.academicYearId,
      rollNumber: f.rollNumber,
      externalId: f.externalId,
      admissionDate: f.admDate,
      status: f.status,
      // Previous institution
      previousSchoolName: f.prevSchool,
      previousSchoolBoard: f.prevBoard,
      udiseCode: f.udiseCode,
      lateralEntry: f.lateralEntry,
      // Parent
      parentName: f.pNm,
      parentPhone: f.pPh,
      parentEmail: f.pEm,
      emergencyContact: f.emg,
      // Identity
      aadhaarNumber: f.aadhaarNumber,
      panNumber: f.panNumber,
      satsNumber: f.satsNumber,
      nationality: f.nationality,
      religion: f.religion,
      casteCategory: f.casteCategory,
      // Karnataka personal
      motherTongue: f.motherTongue,
      subcaste: f.subcaste,
      domicileState: f.domicileState,
      annualIncome: f.annualIncome,
      physicallyChallenged: f.physicallyChallenged,
      disabilityType: f.disabilityType,
      // Health
      bloodGroup: toBlood(f.blood),
      medicalConditions: f.cond,
      allergies: f.allg,
      heightCm: f.ht,
      weightKg: f.wt,
      identifyingMarks: f.bmarks,
    };
    Object.entries(flds).forEach(([k, v]) => {
      if (v !== undefined && v !== "" && v !== null) fd.append(k, v);
    });
    if (photo) fd.append("profileImage", photo);

    const pr = await fetch(`${API}/api/students/${id}/personal-info`, {
      method: "POST",
      headers: auth(),
      body: fd,
    });
    const pd = await pr.json();
    if (!pr.ok) throw new Error(pd.message || "Save failed");

    // Create Father login if provided
    if (f.pLoginEmail !== null && f.pLoginEmail?.trim() && f.pLoginPw?.trim()) {
      const plr = await fetch(`${API}/api/students/${id}/parent-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth() },
        body: JSON.stringify({
          name: f.pNm?.trim() || `Father of ${f.fn} ${f.ln}`.trim(),
          email: f.pLoginEmail.trim(),
          password: f.pLoginPw,
          phone: f.pPh?.trim() || undefined,
          occupation: f.pOc?.trim() || undefined,
          relation: "FATHER",
        }),
      });
      const pld = await plr.json();
      if (!plr.ok && plr.status !== 409)
        throw new Error(pld.message || "Father login creation failed");
    }

    // Create Mother login if provided
    if (f.mLoginEmail !== null && f.mLoginEmail?.trim() && f.mLoginPw?.trim()) {
      const mlr = await fetch(`${API}/api/students/${id}/parent-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth() },
        body: JSON.stringify({
          name: f.mNm?.trim() || `Mother of ${f.fn} ${f.ln}`.trim(),
          email: f.mLoginEmail.trim(),
          password: f.mLoginPw,
          phone: f.mPh?.trim() || undefined,
          occupation: f.mOc?.trim() || undefined,
          relation: "MOTHER",
        }),
      });
      const mld = await mlr.json();
      if (!mlr.ok && mlr.status !== 409)
        throw new Error(mld.message || "Mother login creation failed");
    }

    return id;
  };

  const handleSave = async () => {
    const valid = validate();
    if (!valid) {
      setTab("documents");
      return;
    }
    setBusy(true);
    setErr({});
    try {
      await saveCore();
      showToast(
        "success",
        isEdit
          ? "Student updated successfully!"
          : "Student created successfully!",
      );
      if (onSuccess) onSuccess();
      setTimeout(() => doClose(), 1200);
    } catch (e) {
      setErr({ _g: e.message });
      showToast("error", e.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const handleDocSave = async () => {
    setBusy(true);
    setDocErr("");
    try {
      let id = sid;
      if (!id) {
        const valid = validate();
        if (!valid) {
          setBusy(false);
          return;
        }
        id = await saveCore();
      }

      // ── NEW: unified docs array ───────────────────────────────────────────
      const toUpload = docs.filter((d) => d.file && d.documentName);

      if (toUpload.length > 0) {
        const fd = new FormData();
        const meta = [];
        toUpload.forEach(({ file, documentName, customLabel }) => {
          fd.append("files", file);
          meta.push({
            documentName,
            customLabel:
              documentName === "CUSTOM" ? customLabel || "Custom" : null,
          });
        });
        fd.append("metadata", JSON.stringify(meta));
        const r = await fetch(`${API}/api/students/${id}/documents/bulk`, {
          method: "POST",
          headers: auth(),
          body: fd,
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || "Upload failed");
      }

      showToast(
        "success",
        isEdit
          ? "Student updated successfully!"
          : "Student profile & documents saved!",
      );
      if (onSuccess) onSuccess();
      setTimeout(() => doClose(), 1200);
    } catch (e) {
      setDocErr(e.message);
      showToast("error", e.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const tabIdx = TABS.findIndex((t) => t.id === tab);
  const isLast = tabIdx === TABS.length - 1;
  const totalUploads = docs.filter((d) => d.file).length;

  const resolvedSection = classSections.find((s) => s.id === f.classSectionId);
  const resolvedYear = academicYears.find((y) => y.id === f.academicYearId);

  if (loading)
    return (
      <div
        className={
          isModal
            ? "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            : ""
        }
      >
        <div className="bg-white rounded-2xl p-10 shadow-2xl w-full max-w-4xl space-y-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-9 rounded-xl animate-pulse"
              style={{ background: `${COLORS.light}40` }}
            />
          ))}
        </div>
      </div>
    );

  const selStyle = {
    border: `1px solid ${COLORS.border}`,
    color: COLORS.primary,
  };

  const StyledSelect = ({
    label,
    value,
    onChange,
    children,
    error,
    disabled = false,
  }) => (
    <div className="space-y-1.5">
      {label && (
        <label
          className="text-xs font-bold ml-1"
          style={{ color: COLORS.secondary }}
        >
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={sc(
          error
            ? "border-red-400 bg-red-50/30"
            : disabled
              ? "opacity-50 cursor-not-allowed"
              : "",
        )}
        style={selStyle}
      >
        {children}
      </select>
      {error && (
        <p className="text-[10px] text-red-500 ml-1 font-medium">{error}</p>
      )}
    </div>
  );

  const StyledTextarea = ({ label, value, onChange, placeholder }) => (
    <div className="space-y-1.5">
      {label && (
        <label
          className="text-xs font-bold ml-1"
          style={{ color: COLORS.secondary }}
        >
          {label}
        </label>
      )}
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={2}
        className="w-full text-sm border rounded-xl px-4 py-2.5 bg-white resize-none focus:outline-none focus:ring-2 transition-all"
        style={{ borderColor: COLORS.border, color: COLORS.primary }}
      />
    </div>
  );

  // Toggle button for boolean fields
  const ToggleField = ({ label, value, onChange }) => (
    <div className="space-y-1.5">
      {label && (
        <label
          className="text-xs font-bold ml-1"
          style={{ color: COLORS.secondary }}
        >
          {label}
        </label>
      )}
      <div className="flex gap-2">
        {[
          { v: false, l: "No" },
          { v: true, l: "Yes" },
        ].map(({ v, l }) => (
          <button
            key={l}
            type="button"
            onClick={() => onChange(v)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all"
            style={{
              background: value === v ? COLORS.primary : "white",
              color: value === v ? "white" : COLORS.secondary,
              borderColor: value === v ? COLORS.primary : COLORS.border,
            }}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );

  // ── Academic cascade picker ───────────────────────────────────────────────
  const renderAcademicCascade = () => {
    if (schoolType === "SCHOOL") {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: COLORS.primary }}
            >
              1
            </div>
            <p
              className="text-xs font-bold"
              style={{ color: COLORS.secondary }}
            >
              Select Grade & Section
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StyledSelect
              label="Grade *"
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                setSelectedSectionLetter("");
              }}
            >
              <option value="">
                {loadingDropdowns ? "Loading…" : "Select grade"}
              </option>
              {schoolGrades.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </StyledSelect>
            <StyledSelect
              label="Section *"
              value={selectedSectionLetter}
              onChange={(e) => setSelectedSectionLetter(e.target.value)}
              disabled={!selectedGrade}
            >
              <option value="">
                {!selectedGrade
                  ? "Select grade first"
                  : schoolSections.length === 0
                    ? "No sections"
                    : "Select section"}
              </option>
              {schoolSections.map((cs) => (
                <option key={cs.id} value={cs.section}>
                  Section {cs.section}
                </option>
              ))}
            </StyledSelect>
          </div>
          {f.classSectionId && resolvedSection && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: "rgba(136,189,242,0.12)",
                color: COLORS.primary,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <BookOpen size={12} />
              Assigned:{" "}
              <span className="font-bold ml-1">{resolvedSection.name}</span>
            </div>
          )}
        </div>
      );
    }

    if (schoolType === "PUC") {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: COLORS.primary }}
            >
              1
            </div>
            <p
              className="text-xs font-bold"
              style={{ color: COLORS.secondary }}
            >
              Select Grade → Stream → Combination
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StyledSelect
              label="Grade *"
              value={selectedGrade}
              onChange={(e) => {
                setSelectedGrade(e.target.value);
                resetStream();
              }}
            >
              <option value="">
                {loadingDropdowns ? "Loading…" : "Select grade"}
              </option>
              {pucGrades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </StyledSelect>
            <StyledSelect
              label="Stream *"
              value={selectedStreamId}
              onChange={(e) => {
                setSelectedStreamId(e.target.value);
                resetCombination();
              }}
              disabled={!selectedGrade}
            >
              <option value="">
                {!selectedGrade ? "Select grade first" : "Select stream"}
              </option>
              {pucStreams.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </StyledSelect>
          </div>
          {selectedStreamId && streamHasCombinations && (
            <StyledSelect
              label="Combination *"
              value={selectedCombinationId}
              onChange={(e) => setSelectedCombinationId(e.target.value)}
            >
              <option value="">Select combination</option>
              {pucCombinations.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </StyledSelect>
          )}
          {selectedStreamId && !streamHasCombinations && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
              style={{
                background: "rgba(189,221,252,0.20)",
                color: COLORS.secondary,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              This stream has no subject combinations
            </div>
          )}
          {f.classSectionId && resolvedSection && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: "rgba(136,189,242,0.12)",
                color: COLORS.primary,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <BookOpen size={12} />
              Assigned:{" "}
              <span className="font-bold ml-1">{resolvedSection.name}</span>
            </div>
          )}
        </div>
      );
    }

    if (showCourse) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ background: COLORS.primary }}
            >
              1
            </div>
            <p
              className="text-xs font-bold"
              style={{ color: COLORS.secondary }}
            >
              Select Course{courseHasBranches ? " → Branch" : ""} → Semester →
              Section
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StyledSelect
              label="Course *"
              value={selectedCourseId}
              onChange={(e) => {
                setSelectedCourseId(e.target.value);
                resetBranch();
              }}
            >
              <option value="">
                {loadingDropdowns ? "Loading…" : "Select course"}
              </option>
              {degreeCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </StyledSelect>
            {selectedCourseId && courseHasBranches && (
              <StyledSelect
                label="Branch *"
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  resetSemester();
                }}
              >
                <option value="">Select branch</option>
                {degreeBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </StyledSelect>
            )}
          </div>
          {selectedCourseId && (!courseHasBranches || selectedBranchId) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StyledSelect
                label="Semester *"
                value={selectedSemester}
                onChange={(e) => {
                  setSelectedSemester(e.target.value);
                  resetSectionLetter();
                }}
              >
                <option value="">Select semester</option>
                {degreeSemesters.map((sem) => (
                  <option key={sem} value={sem}>
                    {sem}
                  </option>
                ))}
              </StyledSelect>
              {selectedSemester && degreeSectionLetters.length > 1 && (
                <StyledSelect
                  label="Section *"
                  value={selectedSectionLetter}
                  onChange={(e) => setSelectedSectionLetter(e.target.value)}
                >
                  <option value="">Select section</option>
                  {degreeSectionLetters.map((s) => (
                    <option key={s.id} value={s.section}>
                      Section {s.section}
                    </option>
                  ))}
                </StyledSelect>
              )}
            </div>
          )}
          {f.classSectionId && resolvedSection && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{
                background: "rgba(136,189,242,0.12)",
                color: COLORS.primary,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              <BookOpen size={12} />
              Assigned:{" "}
              <span className="font-bold ml-1">{resolvedSection.name}</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <StyledSelect
        label="Class / Section"
        value={f.classSectionId}
        onChange={set("classSectionId")}
      >
        <option value="">
          {loadingDropdowns ? "Loading…" : "Select class"}
        </option>
        {classSections.map((cs) => (
          <option key={cs.id} value={cs.id}>
            {cs.name}
          </option>
        ))}
      </StyledSelect>
    );
  };

  // ── Parent login card ─────────────────────────────────────────────────────
  const ParentLoginCard = ({
    emailKey,
    pwKey,
    nmKey,
    phKey,
    relation,
    showPwState,
    toggleShowPw,
  }) => (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${COLORS.border}` }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{
          background: COLORS.bgSoft,
          borderBottom:
            f[emailKey] !== null ? `1px solid ${COLORS.border}` : "none",
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: `${COLORS.accent}22` }}
          >
            <Lock size={13} style={{ color: COLORS.accent }} />
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: COLORS.primary }}>
              {relation} Portal Login
            </p>
            <p className="text-[10px]" style={{ color: COLORS.secondary }}>
              {f[emailKey] !== null
                ? `Login set for ${relation}`
                : "Optional · Skip now, add later"}
            </p>
          </div>
        </div>
        {f[emailKey] === null ? (
          <button
            type="button"
            onClick={() =>
              setF((p) => ({ ...p, [emailKey]: p[phKey] || "", [pwKey]: "" }))
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
            style={{ background: COLORS.primary }}
          >
            + Set Login
          </button>
        ) : (
          <button
            type="button"
            onClick={() =>
              setF((p) => ({ ...p, [emailKey]: null, [pwKey]: "" }))
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
            style={{
              border: `1px solid ${COLORS.border}`,
              color: COLORS.secondary,
              background: "white",
            }}
          >
            <X size={11} /> Remove
          </button>
        )}
      </div>
      {f[emailKey] !== null && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InputField
              label="Login Email"
              icon={Mail}
              type="email"
              value={f[emailKey]}
              onChange={set(emailKey)}
              placeholder="parent@example.com"
            />
            <div className="relative">
              <InputField
                label="Login Password"
                type={showPwState ? "text" : "password"}
                icon={Lock}
                value={f[pwKey]}
                onChange={set(pwKey)}
                placeholder="Min. 6 characters"
              />
              <button
                type="button"
                onClick={toggleShowPw}
                className="absolute right-3.5 top-9"
                style={{ color: COLORS.secondary }}
              >
                {showPwState ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Shell ─────────────────────────────────────────────────────────────────
  const shell = (
    <div
      className="w-full bg-white md:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative"
      style={{
        maxWidth: isModal ? "75rem" : "100%",
        minHeight: isModal ? "auto" : undefined,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      {/* Toast */}
      {toast && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold transition-all animate-in fade-in slide-in-from-top-2 duration-300"
          style={{
            background: toast.type === "success" ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${toast.type === "success" ? "#86efac" : "#fecaca"}`,
            color: toast.type === "success" ? "#15803d" : "#dc2626",
            minWidth: "280px",
            maxWidth: "420px",
          }}
        >
          <span className="text-lg">
            {toast.type === "success" ? "✓" : "✕"}
          </span>
          <span>{toast.msg}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-auto opacity-50 hover:opacity-100 transition-opacity"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 md:px-6 py-4"
        style={{
          background: COLORS.bgSoft,
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-xl bg-white"
            style={{ border: `1px solid ${COLORS.border}` }}
          >
            <User size={20} style={{ color: COLORS.primary }} />
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: COLORS.primary }}>
              {isEdit
                ? `Edit Student — ${f.fn || "…"}`
                : "Student Registration"}
            </h1>
            <p className="text-xs" style={{ color: COLORS.secondary }}>
              Fill in the details across all sections
            </p>
          </div>
        </div>
        <button
          onClick={doClose}
          className="p-2 rounded-lg hover:bg-white/60 transition-colors"
          style={{ color: COLORS.secondary }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        <StudentFormSidebar
          tabs={TABS}
          activeTab={tab}
          setTab={setTab}
          tabHasError={tabHasError}
          photoUrl={photoUrl}
          onPhotoClick={() => photoRef.current?.click()}
          studentName={[f.fn, f.ln].filter(Boolean).join(" ")}
          grade={resolvedSection?.grade || "—"}
          cls={resolvedSection?.name || "—"}
          phone={f.phone}
          gender={f.gender}
          dob={f.dob}
          blood={f.blood}
          status={f.status}
        />

        <input
          ref={photoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const fl = e.target.files[0];
            if (fl) {
              setPhoto(fl);
              setPhotoUrl(URL.createObjectURL(fl));
            }
          }}
        />

        <div
          className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 pb-24"
          style={{ maxHeight: isModal ? "75vh" : "80vh" }}
        >
          {/* Global error */}
          {err._g && (
            <div
              className="flex items-center gap-2 p-3 rounded-xl text-sm"
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#dc2626",
              }}
            >
              <AlertCircle size={15} className="shrink-0" /> {err._g}
            </div>
          )}

          {/* ═══ PERSONAL ═══ */}
          {tab === "personal" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="First Name *"
                  value={f.fn}
                  onChange={set("fn")}
                  error={err.fn}
                />
                <InputField
                  label="Last Name *"
                  value={f.ln}
                  onChange={set("ln")}
                  error={err.ln}
                />
                <InputField
                  label="Date of Birth"
                  type="date"
                  value={f.dob}
                  onChange={set("dob")}
                />
                <StyledSelect
                  label="Gender"
                  value={f.gender}
                  onChange={set("gender")}
                >
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </StyledSelect>
              </div>

              {/* Government ID section */}
              <div
                className="rounded-xl p-3 space-y-3"
                style={{
                  background: COLORS.bgSoft,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: COLORS.primary }}
                >
                  Government & Identity
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    label="Aadhaar Number"
                    value={f.aadhaarNumber}
                    onChange={set("aadhaarNumber")}
                    placeholder="12-digit Aadhaar"
                    maxLength={12}
                  />
                  <InputField
                    label="PAN Number"
                    value={f.panNumber}
                    onChange={set("panNumber")}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                  <InputField
                    label="SATS Number"
                    value={f.satsNumber}
                    onChange={set("satsNumber")}
                    placeholder="Karnataka Student ID"
                  />
                  <InputField
                    label="Nationality"
                    value={f.nationality}
                    onChange={set("nationality")}
                    placeholder="Indian"
                  />
                  <InputField
                    label="Religion"
                    value={f.religion}
                    onChange={set("religion")}
                    placeholder="Optional"
                  />
                  <StyledSelect
                    label="Caste Category"
                    value={f.casteCategory}
                    onChange={set("casteCategory")}
                  >
                    <option value="">Select category</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="OBC">OBC</option>
                    <option value="GM">GM (General)</option>
                    <option value="OTHER">Other</option>
                  </StyledSelect>
                  <InputField
                    label="Sub-Caste"
                    value={f.subcaste}
                    onChange={set("subcaste")}
                    placeholder="e.g. Lingayat, Vokkaliga"
                  />
                  <InputField
                    label="Domicile State"
                    value={f.domicileState}
                    onChange={set("domicileState")}
                    placeholder="Karnataka"
                  />
                </div>
              </div>

              {/* Karnataka-specific section */}
              <div
                className="rounded-xl p-3 space-y-3"
                style={{
                  background: COLORS.bgSoft,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: COLORS.primary }}
                >
                  Additional Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <StyledSelect
                    label="Mother Tongue"
                    value={f.motherTongue}
                    onChange={set("motherTongue")}
                  >
                    <option value="">Select mother tongue</option>
                    {MOTHER_TONGUES.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </StyledSelect>
                  <InputField
                    label="Annual Family Income (₹)"
                    type="number"
                    value={f.annualIncome}
                    onChange={set("annualIncome")}
                    placeholder="e.g. 250000"
                    hint="Required for fee waiver / scholarship"
                  />
                </div>
                <ToggleField
                  label="Physically Challenged"
                  value={f.physicallyChallenged}
                  onChange={setToggle("physicallyChallenged")}
                />
                {f.physicallyChallenged && (
                  <InputField
                    label="Disability Type"
                    value={f.disabilityType}
                    onChange={set("disabilityType")}
                    placeholder="e.g. Visual, Hearing, Locomotor"
                  />
                )}
              </div>
            </div>
          )}

          {/* ═══ CONTACT ═══ */}
          {tab === "contact" && (
            <div className="space-y-3">
              <InputField
                label="Email Address *"
                icon={Mail}
                type="email"
                value={f.email}
                onChange={set("email")}
                error={err.email}
                placeholder="student@school.com"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Phone Number *"
                  icon={Phone}
                  type="tel"
                  value={f.phone}
                  onChange={set("phone")}
                  error={err.phone}
                  placeholder="+91 98765-43210"
                />
                <InputField
                  label="Zip Code"
                  value={f.zip}
                  onChange={set("zip")}
                  placeholder="Zip code"
                />
              </div>
              <InputField
                label="Street Address"
                icon={MapPin}
                value={f.addr}
                onChange={set("addr")}
                placeholder="Street address"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="City"
                  value={f.city}
                  onChange={set("city")}
                  placeholder="City"
                />
                <InputField
                  label="State"
                  value={f.state}
                  onChange={set("state")}
                  placeholder="State"
                />
              </div>
            </div>
          )}

          {/* ═══ LOGIN ═══ */}
          {tab === "login" && (
            <div className="space-y-3">
              <InputField
                label={`Student Login Email${!isEdit ? " *" : ""}`}
                icon={Mail}
                type="email"
                value={f.lemail || f.email}
                onChange={set("lemail")}
                error={err.email}
                placeholder="student@school.com"
              />
              <div className="relative">
                <InputField
                  label={isEdit ? "New Password (optional)" : "Password *"}
                  type={showPw ? "text" : "password"}
                  icon={Lock}
                  value={f.pw}
                  onChange={set("pw")}
                  error={err.pw}
                  placeholder={
                    isEdit ? "Leave blank to keep current" : "Min. 6 characters"
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-9"
                  style={{ color: COLORS.secondary }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* ═══ ACADEMIC ═══ */}
          {tab === "academic" && (
            <div className="space-y-3">
              <InputField
                label="Admission Number *"
                value={f.admissionNumber}
                onChange={set("admissionNumber")}
                error={err.admissionNumber}
                placeholder="e.g. ADM-2024-001"
                hint="Unique school admission ID — required"
              />

              <div
                className="rounded-xl p-3 space-y-3"
                style={{
                  background: COLORS.bgSoft,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                {renderAcademicCascade()}
              </div>

              <StyledSelect
                label="Academic Year"
                value={f.academicYearId}
                onChange={set("academicYearId")}
              >
                <option value="">
                  {loadingDropdowns ? "Loading…" : "Select academic year"}
                </option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name}
                  </option>
                ))}
              </StyledSelect>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Roll Number"
                  value={f.rollNumber}
                  onChange={set("rollNumber")}
                  error={err.rollNumber}
                  placeholder="e.g. 01"
                  hint="Optional — assign later if not yet allocated"
                />
                <InputField
                  label="External ID"
                  value={f.externalId}
                  onChange={set("externalId")}
                  placeholder="Board roll no / university reg no"
                  hint="Optional — fill when board assigns it"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Admission Date"
                  type="date"
                  value={f.admDate}
                  onChange={set("admDate")}
                />
                <StyledSelect
                  label="Status"
                  value={f.status}
                  onChange={set("status")}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="GRADUATED">Graduated</option>
                </StyledSelect>
              </div>

              {/* Previous institution */}
              <div
                className="rounded-xl p-3 space-y-3"
                style={{
                  background: COLORS.bgSoft,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <p
                  className="text-xs font-bold uppercase tracking-wide"
                  style={{ color: COLORS.primary }}
                >
                  Previous Institution
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    label="Previous School / College Name"
                    value={f.prevSchool}
                    onChange={set("prevSchool")}
                    placeholder="e.g. St. Joseph's High School"
                  />
                  <StyledSelect
                    label="Previous Board / University"
                    value={f.prevBoard}
                    onChange={set("prevBoard")}
                  >
                    <option value="">Select board</option>
                    {SCHOOL_BOARDS.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </StyledSelect>
                  {schoolType === "SCHOOL" && (
                    <InputField
                      label="UDISE Code (Previous School)"
                      value={f.udiseCode}
                      onChange={set("udiseCode")}
                      placeholder="11-digit UDISE code"
                      hint="Karnataka govt schools require this"
                    />
                  )}
                  {(schoolType === "DIPLOMA" ||
                    schoolType === "DEGREE" ||
                    schoolType === "POSTGRADUATE") && (
                    <ToggleField
                      label="Lateral Entry Admission"
                      value={f.lateralEntry}
                      onChange={setToggle("lateralEntry")}
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══ PARENT ═══ */}
          {tab === "parent" && (
            <div className="space-y-3">
              <div
                className="flex gap-1 p-1 rounded-xl"
                style={{
                  background: COLORS.bgSoft,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                {[
                  { id: "father", l: "Father" },
                  { id: "mother", l: "Mother" },
                  { id: "guardian", l: "Guardian" },
                ].map(({ id, l }) => (
                  <button
                    key={id}
                    onClick={() => setPtab(id)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: ptab === id ? COLORS.primary : "transparent",
                      color: ptab === id ? "white" : COLORS.secondary,
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>

              {/* Father */}
              {ptab === "father" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                      label="Father's Full Name"
                      icon={User}
                      value={f.pNm}
                      onChange={set("pNm")}
                      placeholder="Father's name"
                    />
                    <InputField
                      label="Father's Phone"
                      icon={Phone}
                      type="tel"
                      value={f.pPh}
                      onChange={set("pPh")}
                      placeholder="+91 98765-43210"
                    />
                    <InputField
                      label="Father's Email"
                      icon={Mail}
                      type="email"
                      value={f.pEm}
                      onChange={set("pEm")}
                      placeholder="father@example.com"
                    />
                    <InputField
                      label="Occupation"
                      value={f.pOc}
                      onChange={set("pOc")}
                      placeholder="e.g. Engineer"
                    />
                    <div className="col-span-1 sm:col-span-2">
                      <InputField
                        label="Emergency Contact"
                        icon={Phone}
                        type="tel"
                        value={f.emg}
                        onChange={set("emg")}
                        placeholder="Emergency number"
                      />
                    </div>
                  </div>
                  <ParentLoginCard
                    emailKey="pLoginEmail"
                    pwKey="pLoginPw"
                    nmKey="pNm"
                    phKey="pEm"
                    relation="Father"
                    showPwState={showParentPw}
                    toggleShowPw={() => setShowParentPw((v) => !v)}
                  />
                </>
              )}

              {/* Mother */}
              {ptab === "mother" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField
                      label="Mother's Full Name"
                      icon={User}
                      value={f.mNm}
                      onChange={set("mNm")}
                      placeholder="Mother's name"
                    />
                    <InputField
                      label="Mother's Phone"
                      icon={Phone}
                      type="tel"
                      value={f.mPh}
                      onChange={set("mPh")}
                      placeholder="+91 98765-43210"
                    />
                    <InputField
                      label="Mother's Email"
                      icon={Mail}
                      type="email"
                      value={f.mEm}
                      onChange={set("mEm")}
                      placeholder="mother@example.com"
                    />
                    <InputField
                      label="Occupation"
                      value={f.mOc}
                      onChange={set("mOc")}
                      placeholder="e.g. Teacher"
                    />
                  </div>
                  <ParentLoginCard
                    emailKey="mLoginEmail"
                    pwKey="mLoginPw"
                    nmKey="mNm"
                    phKey="mEm"
                    relation="Mother"
                    showPwState={showMotherPw}
                    toggleShowPw={() => setShowMotherPw((v) => !v)}
                  />
                </>
              )}

              {/* Guardian */}
              {ptab === "guardian" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField
                    label="Guardian Full Name"
                    icon={Shield}
                    value={f.gNm}
                    onChange={set("gNm")}
                    placeholder="Guardian name"
                  />
                  <StyledSelect
                    label="Relation"
                    value={f.gRl}
                    onChange={set("gRl")}
                  >
                    <option value="">Select</option>
                    <option value="Uncle">Uncle</option>
                    <option value="Aunt">Aunt</option>
                    <option value="Grandparent">Grandparent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Other">Other</option>
                  </StyledSelect>
                  <InputField
                    label="Guardian Phone"
                    icon={Phone}
                    type="tel"
                    value={f.gPh}
                    onChange={set("gPh")}
                    placeholder="+91 98765-43210"
                  />
                  <InputField
                    label="Guardian Email"
                    icon={Mail}
                    type="email"
                    value={f.gEm}
                    onChange={set("gEm")}
                    placeholder="guardian@example.com"
                  />
                  <div className="col-span-1 sm:col-span-2">
                    <InputField
                      label="Occupation"
                      value={f.gOc}
                      onChange={set("gOc")}
                      placeholder="e.g. Doctor"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ HEALTH ═══ */}
          {tab === "health" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StyledSelect
                label="Blood Group"
                value={f.blood}
                onChange={set("blood")}
              >
                <option value="">Select blood group</option>
                {BLOODS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </StyledSelect>
              <div /> {/* spacer */}
              <InputField
                label="Height (cm)"
                type="number"
                value={f.ht}
                onChange={set("ht")}
                placeholder="e.g. 145"
              />
              <InputField
                label="Weight (kg)"
                type="number"
                value={f.wt}
                onChange={set("wt")}
                placeholder="e.g. 40"
              />
              <div className="col-span-1 sm:col-span-2">
                <InputField
                  label="Identifying Marks"
                  value={f.bmarks}
                  onChange={set("bmarks")}
                  placeholder="e.g. Birthmark on left arm"
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <StyledTextarea
                  label="Medical Conditions"
                  value={f.cond}
                  onChange={set("cond")}
                  placeholder="e.g. Asthma, Diabetes"
                />
              </div>
              <div className="col-span-1 sm:col-span-2">
                <StyledTextarea
                  label="Allergies"
                  value={f.allg}
                  onChange={set("allg")}
                  placeholder="e.g. Peanuts, Penicillin"
                />
              </div>
            </div>
          )}

          {/* ═══ DOCUMENTS ═══ */}
          {tab === "documents" && (
            <>
              {err._tabErrors && Object.keys(err._tabErrors).length > 0 && (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid #fecaca", background: "#fef2f2" }}
                >
                  <div
                    className="flex items-center gap-2 px-4 py-3"
                    style={{
                      borderBottom: "1px solid #fecaca",
                      background: "#fff5f5",
                    }}
                  >
                    <AlertCircle size={15} style={{ color: "#dc2626" }} />
                    <p
                      className="text-sm font-bold"
                      style={{ color: "#dc2626" }}
                    >
                      Please fix the following before saving
                    </p>
                  </div>
                  <div className="p-3 space-y-2">
                    {Object.entries(err._tabErrors).map(([tabId, errs]) => {
                      const tabLabel =
                        TABS.find((t) => t.id === tabId)?.label || tabId;
                      const TabIcon = TABS.find((t) => t.id === tabId)?.icon;
                      return (
                        <button
                          key={tabId}
                          onClick={() => setTab(tabId)}
                          className="w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all hover:bg-red-50"
                          style={{
                            border: "1px solid #fecaca",
                            background: "white",
                          }}
                        >
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: "#fee2e2" }}
                          >
                            {TabIcon && (
                              <TabIcon size={12} style={{ color: "#dc2626" }} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-xs font-bold"
                              style={{ color: "#dc2626" }}
                            >
                              {tabLabel} tab
                            </p>
                            {errs.map((msg, i) => (
                              <p
                                key={i}
                                className="text-[11px] mt-0.5"
                                style={{ color: "#ef4444" }}
                              >
                                · {msg}
                              </p>
                            ))}
                          </div>
                          <span
                            className="text-[10px] font-semibold mt-0.5"
                            style={{ color: "#dc2626" }}
                          >
                            Go fix →
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              <DocumentUploadSection docs={docs} setDocs={setDocs} />
              {docErr && (
                <div
                  className="flex items-center gap-2 p-3 rounded-xl text-sm"
                  style={{
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                  }}
                >
                  <AlertCircle size={15} className="shrink-0" /> {docErr}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between px-4 md:px-6 py-4 rounded-b-2xl"
        style={{
          background: COLORS.bgSoft,
          borderTop: `1px solid ${COLORS.border}`,
        }}
      >
        <button
          onClick={doClose}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/70"
          style={{
            border: `1px solid ${COLORS.border}`,
            color: COLORS.secondary,
          }}
        >
          <X size={14} /> Cancel
        </button>
        <div className="flex items-center gap-3">
          {!isLast && (
            <button
              onClick={() => setTab(TABS[tabIdx + 1].id)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-white/70"
              style={{
                border: `1px solid ${COLORS.border}`,
                color: COLORS.primary,
              }}
            >
              Next <ChevronRight size={15} />
            </button>
          )}
          {isLast ? (
            <button
              onClick={handleDocSave}
              disabled={busy}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: COLORS.primary }}
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {busy
                ? "Saving…"
                : totalUploads > 0
                  ? `Save with Documents (${totalUploads})`
                  : "Save Student"}
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={busy}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: COLORS.primary }}
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Save size={15} />
              )}
              {busy ? "Saving…" : isEdit ? "Save Changes" : "Save Student"}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (isModal)
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-0 md:py-6 px-0 md:px-4">
        {shell}
      </div>
    );

  return (
    <PageLayout>
      <div className="p-4 md:p-6">
        <div className="mb-6">
          <button
            onClick={doClose}
            className="flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: COLORS.secondary }}
          >
            <ArrowLeft size={16} /> Back to Students
          </button>
        </div>
        {shell}
      </div>
    </PageLayout>
  );
}