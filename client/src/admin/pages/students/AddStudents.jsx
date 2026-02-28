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
const FDOCS = [
  { id: "AADHAR_CARD", label: "Aadhar Card / ID Proof", req: true },
  { id: "BIRTH_CERTIFICATE", label: "Birth Certificate", req: true },
  { id: "MARKSHEET", label: "Previous Marksheet", req: true },
  { id: "TRANSFER_CERTIFICATE", label: "Transfer Certificate", req: false },
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
  uname: "",
  lemail: "",
  pw: "",
  admissionNumber: "",
  classSectionId: "",
  academicYearId: "",
  rollNumber: "",
  externalId: "",
  admDate: "",
  status: "ACTIVE",
  pNm: "",
  pPh: "",
  pEm: "",
  pOc: "",
  pRl: "",
  pLoginEmail: null,
  pLoginPw: "",
  gNm: "",
  gPh: "",
  gEm: "",
  gOc: "",
  gRl: "",
  emg: "",
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

  // Institution config — drives which cascade dropdowns to show
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
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const [ptab, setPtab] = useState("parent");
  const [fdocs, setFdocs] = useState(
    Object.fromEntries(FDOCS.map((d) => [d.id, null])),
  );
  const [xdocs, setXdocs] = useState([]);
  const [pcerts, setPcerts] = useState([]);
  const [docErr, setDocErr] = useState("");
  const [f, setF] = useState(E0);

  // Dropdown data from API
  const [classSections, setClassSections] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // ── Cascade selection state ───────────────────────────────────────────────
  // SCHOOL: selectedGrade → selectedSection → classSectionId
  // PUC:    selectedGrade → selectedStreamId → selectedCombinationId → classSectionId
  // DEGREE: selectedCourseId → selectedBranchId → selectedSemester → selectedSection → classSectionId
  const [selectedGrade, setSelectedGrade] = useState("");
  const [selectedStreamId, setSelectedStreamId] = useState("");
  const [selectedCombinationId, setSelectedCombinationId] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedSectionLetter, setSelectedSectionLetter] = useState("");

  const photoRef = useRef();
  const frefs = useRef({});

  const set = (k) => (e) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    setErr((p) => ({ ...p, [k]: "" }));
  };

  // ── Fetch class sections and academic years ───────────────────────────────
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

  // ── Fetch student data on edit ────────────────────────────────────────────
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
          admissionNumber: s.admissionNumber || "",
          classSectionId: cs?.id || "",
          academicYearId: enroll?.academicYear?.id || "",
          rollNumber: enroll?.rollNumber || "",
          externalId: enroll?.externalId || "",
          admDate: pi.admissionDate ? pi.admissionDate.slice(0, 10) : "",
          status: pi.status || "ACTIVE",
          pNm: pi.parentName || "",
          pPh: pi.parentPhone || "",
          pEm: pi.parentEmail || "",
          pOc: "",
          pRl: "",
          pLoginEmail: null,
          pLoginPw: "",
          gNm: "",
          gPh: "",
          gEm: "",
          gOc: "",
          gRl: "",
          emg: pi.emergencyContact || "",
          blood: frBlood(pi.bloodGroup),
          ht: "",
          wt: "",
          bmarks: "",
          cond: pi.medicalConditions || "",
          allg: pi.allergies || "",
        });

        // Restore cascade state from existing enrollment
        if (cs) {
          if (schoolType === "SCHOOL") {
            // grade = "Grade 9", section = "A"
            const gradeNum = cs.grade?.replace("Grade ", "") || "";
            setSelectedGrade(gradeNum);
            setSelectedSectionLetter(cs.section || "");
          } else if (schoolType === "PUC") {
            setSelectedGrade(cs.grade || "");
            setSelectedStreamId(cs.streamId || "");
            setSelectedCombinationId(cs.combinationId || "");
          } else {
            // DEGREE / DIPLOMA / PG
            setSelectedCourseId(cs.courseId || "");
            setSelectedBranchId(cs.branchId || "");
            setSelectedSemester(cs.grade || ""); // grade holds "Semester 1"
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

  // ── Cascade derived data (all computed from classSections array) ──────────

  // SCHOOL: unique grade numbers sorted
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

  // SCHOOL: sections available for selected grade
  const schoolSections = useMemo(() => {
    if (schoolType !== "SCHOOL" || !selectedGrade) return [];
    return classSections.filter((cs) => cs.grade === `Grade ${selectedGrade}`);
  }, [classSections, schoolType, selectedGrade]);

  // PUC: unique grades
  const pucGrades = useMemo(() => {
    if (schoolType !== "PUC") return [];
    return [...new Set(classSections.map((cs) => cs.grade))].sort();
  }, [classSections, schoolType]);

  // PUC: unique streams for selected grade
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

  // PUC: combinations for selected stream
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

  // Does selected stream have combinations?
  const selectedStreamObj = useMemo(
    () => pucStreams.find((s) => s.id === selectedStreamId),
    [pucStreams, selectedStreamId],
  );
  const streamHasCombinations = selectedStreamObj?.hasCombinations ?? false;

  // DEGREE: unique courses
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

  // DEGREE: selected course object
  const selectedCourseObj = useMemo(
    () => degreeCourses.find((c) => c.id === selectedCourseId),
    [degreeCourses, selectedCourseId],
  );
  const courseHasBranches = selectedCourseObj?.hasBranches ?? false;

  // DEGREE: branches for selected course
  const degreeBranches = useMemo(() => {
    if (!showCourse || !selectedCourseId || !courseHasBranches) return [];
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
  }, [classSections, showCourse, selectedCourseId, courseHasBranches]);

  // DEGREE: semesters for selected course + branch
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

  // DEGREE: section letters for selected course + branch + semester
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

  // ── Auto-resolve classSectionId when cascade selections change ───────────
  useEffect(() => {
    if (schoolType === "SCHOOL") {
      if (!selectedGrade || !selectedSectionLetter) {
        setF((p) => ({ ...p, classSectionId: "" }));
        return;
      }
      const match = classSections.find(
        (cs) =>
          cs.grade === `Grade ${selectedGrade}` &&
          cs.section === selectedSectionLetter,
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
      // If only one section exists for this combo, auto-select it
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

  // Reset downstream cascade when upstream changes
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
      // FIX: admissionNumber now sent at registration time
      const r = await fetch(`${API}/api/students/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth() },
        body: JSON.stringify({
          name: `${f.fn} ${f.ln}`.trim(),
          email: f.lemail || f.email,
          password: f.pw,
          admissionNumber: f.admissionNumber, // FIX: included here
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
      firstName: f.fn,
      lastName: f.ln,
      phone: f.phone,
      dateOfBirth: f.dob,
      gender: f.gender,
      zipCode: f.zip,
      address: f.addr,
      city: f.city,
      state: f.state,
      admissionNumber: f.admissionNumber,
      classSectionId: f.classSectionId,
      academicYearId: f.academicYearId,
      rollNumber: f.rollNumber,
      externalId: f.externalId,
      admissionDate: f.admDate,
      status: f.status,
      parentName: f.pNm,
      parentPhone: f.pPh,
      parentEmail: f.pEm,
      emergencyContact: f.emg,
      bloodGroup: toBlood(f.blood),
      medicalConditions: f.cond,
      allergies: f.allg,
    };
    Object.entries(flds).forEach(([k, v]) => {
      if (v) fd.append(k, v);
    });
    if (photo) fd.append("profileImage", photo);

    const pr = await fetch(`${API}/api/students/${id}/personal-info`, {
      method: "POST",
      headers: auth(),
      body: fd,
    });
    const pd = await pr.json();
    if (!pr.ok) throw new Error(pd.message || "Save failed");

    if (f.pLoginEmail !== null && f.pLoginEmail?.trim() && f.pLoginPw?.trim()) {
      const plr = await fetch(`${API}/api/students/${id}/parent-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...auth() },
        body: JSON.stringify({
          name: f.pNm?.trim() || `Parent of ${f.fn} ${f.ln}`.trim(),
          email: f.pLoginEmail.trim(),
          password: f.pLoginPw,
          phone: f.pPh?.trim() || undefined,
          occupation: f.pOc?.trim() || undefined,
          relation: f.pRl || "GUARDIAN",
        }),
      });
      const pld = await plr.json();
      if (!plr.ok && plr.status !== 409)
        throw new Error(pld.message || "Parent login creation failed");
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
      const all = [];
      FDOCS.forEach((d) => {
        if (fdocs[d.id])
          all.push({
            file: fdocs[d.id],
            documentName: d.id,
            customLabel: null,
          });
      });
      xdocs.forEach((d) => {
        if (d.file)
          all.push({
            file: d.file,
            documentName: "CUSTOM",
            customLabel: d.label || "Custom",
          });
      });
      pcerts.forEach((d) => {
        if (d.file)
          all.push({
            file: d.file,
            documentName: "CUSTOM",
            customLabel: d.label || "Parent Cert",
          });
      });
      if (all.length > 0) {
        const fd = new FormData(),
          meta = [];
        all.forEach(({ file, documentName, customLabel }) => {
          fd.append("files", file);
          meta.push({ documentName, customLabel });
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
  const totalUploads =
    Object.values(fdocs).filter(Boolean).length +
    xdocs.filter((d) => d.file).length;

  // Sidebar preview data
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

  // ── Academic Tab — Cascading Section Picker ───────────────────────────────
  const renderAcademicCascade = () => {
    // ── SCHOOL: Grade (1-10) + Section (A, B, C…) ──────────────────────────
    if (schoolType === "SCHOOL") {
      return (
        <div className="space-y-4">
          {/* Step label */}
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

          <div className="grid grid-cols-2 gap-4">
            {/* Grade dropdown */}
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

            {/* Section dropdown — only shows sections that exist for selected grade */}
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

          {/* Resolved class section display */}
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

    // ── PUC: Grade + Stream + Combination ──────────────────────────────────
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

          <div className="grid grid-cols-2 gap-4">
            {/* Grade */}
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

            {/* Stream */}
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

          {/* Combination — only shown if stream has combinations */}
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

          {/* No combination badge for Arts-like streams */}
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

    // ── DEGREE / DIPLOMA / PG: Course → Branch → Semester → Section ────────
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

          <div className="grid grid-cols-2 gap-4">
            {/* Course */}
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

            {/* Branch — only shown if course has branches */}
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

          {/* Semester */}
          {selectedCourseId && (!courseHasBranches || selectedBranchId) && (
            <div className="grid grid-cols-2 gap-4">
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

              {/* Section letter — only shown if multiple sections per semester */}
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

    // Fallback: flat dropdown for OTHER / unknown types
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

  // ── Shell ─────────────────────────────────────────────────────────────────
  const shell = (
    <div
      className="w-full bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden relative"
      style={{
        maxWidth: isModal ? "75rem" : "100%",
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
        className="flex items-center justify-between px-6 py-4"
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
      <div className="flex flex-1 min-h-0">
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
          className="flex-1 overflow-y-auto p-6 space-y-5 pb-28"
          style={{ maxHeight: isModal ? "64vh" : "70vh" }}
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
            <div className="grid grid-cols-2 gap-5">
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
          )}

          {/* ═══ CONTACT ═══ */}
          {tab === "contact" && (
            <div className="space-y-5">
              <InputField
                label="Email Address *"
                icon={Mail}
                type="email"
                value={f.email}
                onChange={set("email")}
                error={err.email}
                placeholder="student@school.com"
              />
              <div className="grid grid-cols-2 gap-4">
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
              <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-5">
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
            <div className="space-y-5">
              <InputField
                label="Admission Number *"
                value={f.admissionNumber}
                onChange={set("admissionNumber")}
                error={err.admissionNumber}
                placeholder="e.g. ADM-2024-001"
                hint="Unique school admission ID — required"
              />

              {/* ── Cascading class picker — school-type aware ── */}
              <div
                className="rounded-xl p-4 space-y-4"
                style={{
                  background: COLORS.bgSoft,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                {renderAcademicCascade()}
              </div>

              {/* Academic Year */}
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

              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Roll Number"
                  value={f.rollNumber}
                  onChange={set("rollNumber")}
                  error={err.rollNumber}
                  placeholder="e.g. HS-2024-001"
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

              <div className="grid grid-cols-2 gap-4">
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
            </div>
          )}

          {/* ═══ PARENT ═══ */}
          {tab === "parent" && (
            <div className="space-y-5">
              <div
                className="flex gap-1 p-1 rounded-xl"
                style={{
                  background: COLORS.bgSoft,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                {[
                  { id: "parent", l: "Parent Information" },
                  { id: "guardian", l: "Guardian Information" },
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

              {ptab === "parent" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <InputField
                      label="Parent Full Name"
                      icon={User}
                      value={f.pNm}
                      onChange={set("pNm")}
                      placeholder="Parent name"
                    />
                    <StyledSelect
                      label="Relation"
                      value={f.pRl}
                      onChange={set("pRl")}
                    >
                      <option value="">Select</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Other">Other</option>
                    </StyledSelect>
                    <InputField
                      label="Parent Phone"
                      icon={Phone}
                      type="tel"
                      value={f.pPh}
                      onChange={set("pPh")}
                      placeholder="+91 98765-43210"
                    />
                    <InputField
                      label="Parent Email"
                      icon={Mail}
                      type="email"
                      value={f.pEm}
                      onChange={set("pEm")}
                      placeholder="parent@example.com"
                    />
                    <InputField
                      label="Occupation"
                      value={f.pOc}
                      onChange={set("pOc")}
                      placeholder="e.g. Engineer"
                    />
                    <InputField
                      label="Emergency Contact"
                      icon={Phone}
                      type="tel"
                      value={f.emg}
                      onChange={set("emg")}
                      placeholder="Emergency number"
                    />
                  </div>

                  {/* Parent Portal Login */}
                  <div
                    className="rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${COLORS.border}` }}
                  >
                    <div
                      className="flex items-center justify-between px-4 py-3"
                      style={{
                        background: COLORS.bgSoft,
                        borderBottom:
                          f.pLoginEmail !== null
                            ? `1px solid ${COLORS.border}`
                            : "none",
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
                          <p
                            className="text-xs font-bold"
                            style={{ color: COLORS.primary }}
                          >
                            Parent Portal Login
                          </p>
                          <p
                            className="text-[10px]"
                            style={{ color: COLORS.secondary }}
                          >
                            {f.pLoginEmail !== null
                              ? `Login set for ${f.pRl || "Guardian"}`
                              : "Optional · Skip now, add later"}
                          </p>
                        </div>
                      </div>
                      {f.pLoginEmail === null ? (
                        <button
                          type="button"
                          onClick={() =>
                            setF((p) => ({
                              ...p,
                              pLoginEmail: p.pEm || "",
                              pLoginPw: "",
                            }))
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
                            setF((p) => ({
                              ...p,
                              pLoginEmail: null,
                              pLoginPw: "",
                            }))
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
                    {f.pLoginEmail !== null && (
                      <div className="p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                          <InputField
                            label="Login Email"
                            icon={Mail}
                            type="email"
                            value={f.pLoginEmail}
                            onChange={set("pLoginEmail")}
                            placeholder="parent@example.com"
                          />
                          <div className="relative">
                            <InputField
                              label="Login Password"
                              type={showParentPw ? "text" : "password"}
                              icon={Lock}
                              value={f.pLoginPw}
                              onChange={set("pLoginPw")}
                              placeholder="Min. 6 characters"
                            />
                            <button
                              type="button"
                              onClick={() => setShowParentPw((v) => !v)}
                              className="absolute right-3.5 top-9"
                              style={{ color: COLORS.secondary }}
                            >
                              {showParentPw ? (
                                <EyeOff size={16} />
                              ) : (
                                <Eye size={16} />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Parent Certificates */}
                  <div
                    className="rounded-xl p-4"
                    style={{
                      border: `1px dashed ${COLORS.accent}`,
                      background: `${COLORS.light}18`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p
                        className="text-xs font-bold uppercase tracking-wide"
                        style={{ color: COLORS.primary }}
                      >
                        Parent Certificates{" "}
                        <span
                          className="font-normal"
                          style={{ color: COLORS.secondary }}
                        >
                          (Optional)
                        </span>
                      </p>
                      <button
                        onClick={() =>
                          setPcerts((p) => [
                            ...p,
                            { id: Date.now(), label: "", file: null },
                          ])
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                        style={{ background: COLORS.primary }}
                      >
                        + Add
                      </button>
                    </div>
                    {pcerts.length === 0 ? (
                      <p
                        className="text-xs text-center py-2"
                        style={{ color: COLORS.secondary }}
                      >
                        No certificates added.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {pcerts.map((c, i) => (
                          <div
                            key={c.id}
                            className="flex items-center gap-2 p-2.5 rounded-xl bg-white"
                            style={{ border: `1px solid ${COLORS.border}` }}
                          >
                            <span
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-white"
                              style={{ background: COLORS.secondary }}
                            >
                              {i + 1}
                            </span>
                            <input
                              value={c.label}
                              onChange={(e) =>
                                setPcerts((p) =>
                                  p.map((d) =>
                                    d.id === c.id
                                      ? { ...d, label: e.target.value }
                                      : d,
                                  ),
                                )
                              }
                              placeholder="Certificate name"
                              className="flex-1 text-sm px-2 py-1.5 rounded-lg focus:outline-none bg-gray-50 border border-gray-100 min-w-0"
                              style={{ color: COLORS.primary }}
                            />
                            <label
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                              style={{
                                border: `1px solid ${c.file ? "#86efac" : COLORS.border}`,
                                background: c.file ? "#f0fdf4" : "white",
                                color: c.file ? "#16a34a" : COLORS.secondary,
                              }}
                            >
                              {c.file
                                ? `✓ ${c.file.name.slice(0, 10)}…`
                                : "↑ Upload"}
                              <input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                onChange={(e) =>
                                  setPcerts((p) =>
                                    p.map((d) =>
                                      d.id === c.id
                                        ? { ...d, file: e.target.files[0] }
                                        : d,
                                    ),
                                  )
                                }
                                className="hidden"
                              />
                            </label>
                            <button
                              onClick={() =>
                                setPcerts((p) => p.filter((d) => d.id !== c.id))
                              }
                              className="w-6 h-6 flex items-center justify-center rounded text-red-400 hover:text-red-600"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {ptab === "guardian" && (
                <div className="grid grid-cols-2 gap-4">
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
                  <div className="col-span-2">
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
            <div className="grid grid-cols-2 gap-5">
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
              <div className="grid grid-cols-2 gap-3">
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
              </div>
              <div className="col-span-2">
                <StyledTextarea
                  label="Medical Conditions"
                  value={f.cond}
                  onChange={set("cond")}
                  placeholder="e.g. Asthma, Diabetes"
                />
              </div>
              <div className="col-span-2">
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
              <DocumentUploadSection
                fdocs={fdocs}
                setFdocs={setFdocs}
                xdocs={xdocs}
                setXdocs={setXdocs}
                frefs={frefs}
                FDOCS={FDOCS}
              />
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
        className="flex items-center justify-between px-6 py-4 rounded-b-2xl"
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
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-6 px-4">
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
