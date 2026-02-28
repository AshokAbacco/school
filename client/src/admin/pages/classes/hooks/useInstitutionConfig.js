//client\src\admin\pages\classes\hooks\useInstitutionConfig.js
// Core config layer — drives all dynamic UI per institution type
import { useMemo } from "react";
import { getUser } from "../../../../auth/storage";

// ── Config definitions per school type ───────────────────────────────────────

const CONFIGS = {
  SCHOOL: {
    gradeLabel: "Grade",
    gradesLabel: "Grades",
    sectionLabel: "Section",
    studentLabel: "Student",
    studentsLabel: "Students",

    gradeInputType: "number",
    gradePrefix: "Grade",
    gradeMin: 1,
    gradeMax: 10,
    gradeOptions: Array.from({ length: 10 }, (_, i) => ({
      value: `Grade ${i + 1}`,
      label: `Grade ${i + 1}`,
    })),

    showStream: false,
    showCourse: false,
    showBranch: false,
    sectionRequired: false,

    hasSkipGrade: true,
    hasReadmission: true,
    promotionLabel: "Promote Students",

    modules: [
      "classes",
      "students",
      "timetable",
      "attendance",
      "marks",
      "promotion",
      "readmission",
    ],
  },

  PUC: {
    gradeLabel: "Grade",
    gradesLabel: "Grades",
    sectionLabel: "Section",
    studentLabel: "Student",
    studentsLabel: "Students",

    gradeInputType: "select",
    gradePrefix: "Grade",
    gradeMin: 11,
    gradeMax: 12,
    gradeOptions: [
      { value: "Grade 11", label: "Grade 11" },
      { value: "Grade 12", label: "Grade 12" },
    ],

    showStream: true,
    streamLabel: "Stream",
    showCourse: false,
    showBranch: false,
    sectionRequired: false,

    hasSkipGrade: false,
    hasReadmission: false,
    promotionLabel: "Promote Students",

    modules: [
      "classes",
      "streams",
      "students",
      "timetable",
      "attendance",
      "marks",
      "promotion",
    ],
  },

  DIPLOMA: {
    gradeLabel: "Semester",
    gradesLabel: "Semesters",
    sectionLabel: "Section",
    studentLabel: "Student",
    studentsLabel: "Students",

    gradeInputType: "semester",
    gradePrefix: "Semester",
    gradeMin: 1,
    gradeMax: null,

    showStream: false,
    showCourse: true,
    courseLabel: "Course",
    showBranch: true,
    branchLabel: "Branch",
    sectionRequired: false,

    hasSkipGrade: false,
    hasReadmission: false,
    promotionLabel: "Promote Students",

    modules: [
      "classes",
      "courses",
      "students",
      "timetable",
      "attendance",
      "marks",
      "promotion",
    ],
  },

  DEGREE: {
    gradeLabel: "Semester",
    gradesLabel: "Semesters",
    sectionLabel: "Section",
    studentLabel: "Student",
    studentsLabel: "Students",

    gradeInputType: "semester",
    gradePrefix: "Semester",
    gradeMin: 1,
    gradeMax: null,

    showStream: false,
    showCourse: true,
    courseLabel: "Course",
    showBranch: true,
    branchLabel: "Branch / Specialization",
    sectionRequired: false,

    hasSkipGrade: false,
    hasReadmission: false,
    promotionLabel: "Promote Students",

    modules: [
      "classes",
      "courses",
      "students",
      "timetable",
      "attendance",
      "marks",
      "promotion",
    ],
  },

  POSTGRADUATE: {
    gradeLabel: "Semester",
    gradesLabel: "Semesters",
    sectionLabel: "Section",
    studentLabel: "Student",
    studentsLabel: "Students",

    gradeInputType: "semester",
    gradePrefix: "Semester",
    gradeMin: 1,
    gradeMax: null,

    showStream: false,
    showCourse: true,
    courseLabel: "Programme",
    showBranch: true,
    branchLabel: "Specialization",
    sectionRequired: false,

    hasSkipGrade: false,
    hasReadmission: false,
    promotionLabel: "Promote Students",

    modules: [
      "classes",
      "courses",
      "students",
      "timetable",
      "attendance",
      "marks",
      "promotion",
    ],
  },

  OTHER: {
    gradeLabel: "Class",
    gradesLabel: "Classes",
    sectionLabel: "Section",
    studentLabel: "Student",
    studentsLabel: "Students",
    gradeInputType: "text",
    gradePrefix: "",
    gradeMin: null,
    gradeMax: null,
    gradeOptions: [],
    showStream: false,
    showCourse: false,
    showBranch: false,
    sectionRequired: false,
    hasSkipGrade: false,
    hasReadmission: false,
    promotionLabel: "Promote Students",
    modules: ["classes", "students", "timetable", "attendance", "marks"],
  },
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useInstitutionConfig() {
  // getUser() reads directly from localStorage — no context needed
  const user = getUser();
  const schoolType = user?.school?.type || user?.schoolType || "SCHOOL";

  return useMemo(() => {
    const config = CONFIGS[schoolType] || CONFIGS.SCHOOL;
    return { ...config, schoolType };
  }, [schoolType]);
}

// ── Utility: generate semester options for a course ───────────────────────────
export function getSemesterOptions(totalSemesters) {
  return Array.from({ length: totalSemesters || 8 }, (_, i) => ({
    value: `Semester ${i + 1}`,
    label: `Semester ${i + 1}`,
  }));
}

// ── Export raw configs for non-hook usage (e.g. backend validation mirror) ───
export { CONFIGS };
