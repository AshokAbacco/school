import { prisma } from "../config/db.js";
// import XLSX from "xlsx";
import ExcelJS from "exceljs";
import { generateSignedUrl } from "../lib/r2.js";

const ok = (res, data) => res.json({ success: true, ...data });
const err = (res, msg, s = 400) =>
  res.status(s).json({ success: false, message: msg });

// ═══════════════════════════════════════════════════════════════
//  RESULT RULES — SINGLE SOURCE OF TRUTH
//  Used by: marks save (stored ResultSummary), results list, results
//  summary, report card (View / Preview / PDF / Print / Bulk download)
//  and the Excel export. Every screen gets its numbers from here.
//
//  1. Percentage = Total Obtained / Total Maximum × 100
//     Total Maximum = ALL subjects scheduled for the exam + class,
//     not only the subjects that have a marks record.
//  2. Absent subject  → 0 obtained, its max still counts.
//  3. Absent in EVERY subject → status "absent", grade "AB", no rank.
//  4. At least one attended subject (even 0 marks) → normal result:
//     percentage + grade + rank. No minimum percentage.
//  5. Overall grade depends ONLY on the overall percentage.
//     A failed / absent individual subject never forces "F".
//  6. No overall pass/fail override.
//  7. Rank: every student with a calculated result, by total desc,
//     then percentage desc. Ties share a rank (1, 2, 2, 4 …).
//  8. Pending (marks not entered yet) is NOT absent and NOT zero.
// ═══════════════════════════════════════════════════════════════

const GRADE_SCALE_FULL = [
  { min: 90, grade: "A+", label: "Outstanding" },
  { min: 80, grade: "A", label: "Excellent" },
  { min: 70, grade: "B", label: "Very Good" },
  { min: 60, grade: "C", label: "Good" },
  { min: 50, grade: "D", label: "Average" },
  { min: 0, grade: "F", label: "Below Average" },
];

const ABSENT_GRADE = { grade: "AB", label: "Absent" };
const PENDING_GRADE = { grade: "—", label: "—" };

/** Grade from a percentage. Uses lower bounds only, so 89.5% is "A", never a gap. */
function gradeFromPercentage(pct) {
  const p = Number(pct);
  if (pct === null || pct === undefined || Number.isNaN(p))
    return PENDING_GRADE;
  return (
    GRADE_SCALE_FULL.find((g) => p >= g.min) ??
    GRADE_SCALE_FULL[GRADE_SCALE_FULL.length - 1]
  );
}

function getGrade(pct) {
  return gradeFromPercentage(pct).grade;
}

// Kept for older call sites — same scale, same result.
function calcGradeFull(pct) {
  return gradeFromPercentage(pct);
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

function pctOf(obtained, max) {
  const m = Number(max || 0);
  if (m <= 0) return null;
  return round2((Number(obtained || 0) / m) * 100);
}

/**
 * State of one subject mark for one student:
 *   "absent"  → isAbsent = true
 *   "entered" → marksObtained is a number (0 included = attended)
 *   "pending" → no record, or a record with no marks and not absent
 */
function markState(row) {
  if (!row) return "pending";
  if (row.isAbsent) return "absent";
  if (
    row.marksObtained === null ||
    row.marksObtained === undefined ||
    row.marksObtained === ""
  )
    return "pending";
  return "entered";
}

// ─── Subject-level pass/fail (INFORMATIONAL ONLY) ──────────────────────────
// Used for subject status badges and subject-level export colouring.
// It NEVER changes the overall grade, overall status or rank.
const DEFAULT_PASS_PERCENT = 50;

function effectivePassingMarks(maxMarks, passingMarks) {
  if (
    passingMarks !== null &&
    passingMarks !== undefined &&
    Number(passingMarks) > 0
  )
    return Number(passingMarks);
  return (Number(maxMarks || 0) * DEFAULT_PASS_PERCENT) / 100;
}

/** Subject below its passing marks? Only for entered marks; absent/pending → false. */
function isSubjectFail({ isAbsent, marksObtained, maxMarks, passingMarks }) {
  if (isAbsent) return false;
  if (
    marksObtained === null ||
    marksObtained === undefined ||
    marksObtained === ""
  )
    return false;
  if (Number(maxMarks || 0) <= 0) return false;
  return Number(marksObtained) < effectivePassingMarks(maxMarks, passingMarks);
}

/** Same check for a marks row that includes `schedule { maxMarks, passingMarks }`. */
function isMarkRowFail(m) {
  return isSubjectFail({
    isAbsent: m.isAbsent,
    marksObtained: m.marksObtained,
    maxMarks: m.schedule?.maxMarks,
    passingMarks: m.schedule?.passingMarks,
  });
}

/**
 * Overall result for ONE student.
 * entries: one per configured subject schedule → [{ maxMarks, passingMarks, row }]
 *          (row = the student's marks record for that schedule, or null)
 */
function computeOverallResult(entries = []) {
  let totalObtained = 0;
  let totalMax = 0;
  let attended = 0;
  let absent = 0;
  let pending = 0;
  let failedSubjects = 0;

  for (const e of entries) {
    const max = Number(e.maxMarks || 0);
    totalMax += max;
    const state = markState(e.row);
    if (state === "entered") {
      attended++;
      totalObtained += Number(e.row.marksObtained);
      if (
        isSubjectFail({
          isAbsent: false,
          marksObtained: e.row.marksObtained,
          maxMarks: max,
          passingMarks: e.passingMarks,
        })
      )
        failedSubjects++;
    } else if (state === "absent") {
      absent++;
    } else {
      pending++;
    }
  }

  const subjectCount = entries.length;
  const base = {
    subjectCount,
    attendedSubjects: attended,
    absentSubjects: absent,
    pendingSubjects: pending,
    failedSubjects,
    hasSubjectFail: failedSubjects > 0,
    totalMax: round2(totalMax),
  };

  if (attended === 0) {
    // Absent in EVERY subject → AB, not ranked.
    if (subjectCount > 0 && absent === subjectCount) {
      return {
        ...base,
        status: "absent",
        isAbsent: true,
        isPending: false,
        isComplete: true,
        totalObtained: 0,
        percentage: null,
        grade: ABSENT_GRADE.grade,
        gradeLabel: ABSENT_GRADE.label,
        eligibleForRank: false,
      };
    }
    // Nothing attended and not all absent → no result yet.
    return {
      ...base,
      status: "pending",
      isAbsent: false,
      isPending: true,
      isComplete: false,
      totalObtained: null,
      percentage: null,
      grade: PENDING_GRADE.grade,
      gradeLabel: PENDING_GRADE.label,
      eligibleForRank: false,
    };
  }

  const percentage =
    totalMax > 0 ? round2((totalObtained / totalMax) * 100) : 0;
  const g = gradeFromPercentage(percentage);
  return {
    ...base,
    status: "calculated",
    isAbsent: false,
    isPending: false,
    isComplete: pending === 0,
    totalObtained: round2(totalObtained),
    percentage,
    grade: g.grade,
    gradeLabel: g.label,
    eligibleForRank: true,
  };
}

/**
 * Class rank. Every student with a calculated result is ranked; only
 * all-absent / pending students are excluded.
 * entries: [{ studentId, total, pct, eligible }]
 */
function rankStudents(entries) {
  const ranked = entries
    .filter((e) => e.eligible)
    .sort((a, b) =>
      b.total !== a.total ? b.total - a.total : (b.pct ?? 0) - (a.pct ?? 0),
    );

  const rankOf = new Map(entries.map((e) => [e.studentId, null]));
  let rank = 0;
  ranked.forEach((e, i) => {
    const prev = ranked[i - 1];
    if (!prev || e.total !== prev.total || e.pct !== prev.pct) rank = i + 1;
    rankOf.set(e.studentId, rank);
  });
  return { rankOf, rankedCount: ranked.length };
}

/**
 * Loads everything needed to calculate results for one class across one
 * or more exam groups (main exam, or main + sub exam).
 */
async function loadClassExamData(
  db,
  { assessmentGroupIds, classSectionId, academicYearId },
) {
  const groupIds = (assessmentGroupIds || []).filter(Boolean);
  const [schedules, enrollments] = await Promise.all([
    db.assessmentSchedule.findMany({
      where: {
        assessmentGroupId: { in: groupIds },
        classSectionId,
        deletedAt: null,
      },
      select: {
        id: true,
        assessmentGroupId: true,
        classSectionId: true,
        subjectId: true,
        maxMarks: true,
        passingMarks: true,
        examDate: true,
        subject: { select: { id: true, name: true, code: true } },
      },
    }),
    academicYearId
      ? db.studentEnrollment.findMany({
          where: { classSectionId, academicYearId },
          select: {
            studentId: true,
            rollNumber: true,
            status: true,
            student: { select: { id: true, name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  const scheduleIds = schedules.map((s) => s.id);
  const marks = scheduleIds.length
    ? await db.marks.findMany({
        where: { scheduleId: { in: scheduleIds }, deletedAt: null },
        select: {
          id: true,
          studentId: true,
          scheduleId: true,
          marksObtained: true,
          isAbsent: true,
          remarks: true,
          components: true,
        },
      })
    : [];

  return { schedules, enrollments, marks };
}

/**
 * Overall result + rank for every student in the class.
 * Students considered: ACTIVE enrollments ∪ anyone who has a marks record.
 * Returns Map<studentId, result & { rank, isRanked, rankedStudents }>
 */
function computeClassResults({ schedules, enrollments = [], marks }) {
  const byStudent = new Map();
  for (const m of marks) {
    if (!byStudent.has(m.studentId)) byStudent.set(m.studentId, new Map());
    byStudent.get(m.studentId).set(m.scheduleId, m);
  }

  const ids = new Set([
    ...enrollments.filter((e) => e.status === "ACTIVE").map((e) => e.studentId),
    ...byStudent.keys(),
  ]);

  const results = new Map();
  for (const sid of ids) {
    const rows = byStudent.get(sid);
    results.set(
      sid,
      computeOverallResult(
        schedules.map((sc) => ({
          maxMarks: sc.maxMarks,
          passingMarks: sc.passingMarks,
          row: rows?.get(sc.id) || null,
        })),
      ),
    );
  }

  const { rankOf, rankedCount } = rankStudents(
    [...results.entries()].map(([studentId, r]) => ({
      studentId,
      total: r.totalObtained ?? 0,
      pct: r.percentage,
      eligible: r.eligibleForRank,
    })),
  );

  for (const [sid, r] of results) {
    const rank = rankOf.get(sid) ?? null;
    r.rank = rank;
    r.isRanked = rank !== null;
    r.rankedStudents = rankedCount;
  }
  return results;
}

/** Values written to ResultSummary for one computed result. */
function storedSummaryData(r) {
  if (r.status === "absent") {
    return {
      totalMarks: 0,
      maxMarks: r.totalMax,
      percentage: null,
      grade: "AB",
    };
  }
  if (r.status === "pending") {
    return {
      totalMarks: null,
      maxMarks: r.totalMax,
      percentage: null,
      grade: null,
    };
  }
  return {
    totalMarks: r.totalObtained,
    maxMarks: r.totalMax,
    percentage: r.percentage,
    grade: r.grade,
  };
}

/**
 * Recalculates the stored ResultSummary rows for a class + exam from the
 * live marks, with the same rules as every screen. Pending students only
 * have an existing row cleared — no empty rows are created for them.
 */
async function recalcStoredSummaries(
  db,
  {
    assessmentGroupId,
    classSectionId,
    academicYearId,
    termId = null,
    studentIds = null,
  },
) {
  const data = await loadClassExamData(db, {
    assessmentGroupIds: [assessmentGroupId],
    classSectionId,
    academicYearId,
  });
  const results = computeClassResults(data);

  const targetIds = studentIds ? [...new Set(studentIds)] : [...results.keys()];
  if (!targetIds.length) return;

  const existing = await db.resultSummary.findMany({
    where: { academicYearId, assessmentGroupId, studentId: { in: targetIds } },
    select: { id: true, studentId: true },
  });
  const existingByStudent = new Map(existing.map((e) => [e.studentId, e.id]));

  await Promise.all(
    targetIds.map((sid) => {
      const r =
        results.get(sid) ||
        computeOverallResult(
          data.schedules.map((sc) => ({
            maxMarks: sc.maxMarks,
            passingMarks: sc.passingMarks,
            row: null,
          })),
        );
      const payload = storedSummaryData(r);
      const existingId = existingByStudent.get(sid);

      if (existingId) {
        return db.resultSummary.update({
          where: { id: existingId },
          data: payload,
        });
      }
      if (r.status === "pending") return null; // nothing entered yet → no row
      return db.resultSummary.create({
        data: {
          studentId: sid,
          academicYearId,
          termId: termId || null,
          assessmentGroupId,
          isPublished: false,
          ...payload,
        },
      });
    }),
  );
}

/** Summary object sent to the report card / preview / PDF. */
function toReportSummary(r, extra = {}) {
  return {
    totalObtained: r.status === "pending" ? 0 : r.totalObtained,
    totalMax: r.totalMax,
    percentage: r.percentage,
    grade: r.grade,
    gradeLabel: r.gradeLabel,
    resultStatus: r.status, // "calculated" | "absent" | "pending"
    isAbsent: r.isAbsent,
    isComplete: r.isComplete,
    attendedSubjects: r.attendedSubjects,
    absentSubjects: r.absentSubjects,
    pendingSubjects: r.pendingSubjects,
    // There is NO overall fail. Kept false so older UI code that reads
    // `hasFail` never overrides the grade. Subject info is below.
    hasFail: false,
    hasSubjectFail: r.hasSubjectFail,
    failedSubjectsCount: r.failedSubjects,
    rank: r.rank ?? null,
    isRanked: (r.rank ?? null) !== null,
    rankLabel: r.rank ? String(r.rank) : "Not Ranked",
    rankedStudents: r.rankedStudents ?? 0,
    ...extra,
  };
}

/** One subject row for a single (non-combined) report card. */
function buildSubjectResult(sc, row) {
  const state = markState(row);
  const obtained = state === "entered" ? Number(row.marksObtained) : null;
  const maxMarks = Number(sc.maxMarks || 0);
  const pct = state === "entered" ? pctOf(obtained, maxMarks) : null;
  const g =
    state === "absent"
      ? ABSENT_GRADE
      : state === "pending"
        ? PENDING_GRADE
        : gradeFromPercentage(pct);
  const failed =
    state === "entered" &&
    isSubjectFail({
      isAbsent: false,
      marksObtained: obtained,
      maxMarks,
      passingMarks: sc.passingMarks,
    });

  return {
    subjectId: sc.subject?.id ?? sc.subjectId,
    subjectName: sc.subject?.name ?? "Subject",
    subjectCode: sc.subject?.code ?? null,
    marksObtained: obtained,
    maxMarks,
    passingMarks: sc.passingMarks ?? null,
    percentage: pct,
    grade: g.grade,
    gradeLabel: g.label,
    // Subject-level only — never changes the overall grade.
    resultStatus:
      state === "absent"
        ? "absent"
        : state === "pending"
          ? "pending"
          : failed
            ? "fail"
            : "pass",
    isAbsent: state === "absent",
    isPending: state === "pending",
    remarks: row?.remarks ?? null,
    examDate: sc.examDate,
    components: row?.components ?? null,
  };
}

/** Sub-exam + main-exam subject pair below combined passing marks? Informational only. */
function isCombinedSubjectFail(mainSc, mainRow, subSc, subRow) {
  const mainEntered = markState(mainRow) === "entered";
  const subEntered = markState(subRow) === "entered";
  if (!mainEntered && !subEntered) return false;
  const obtained =
    (mainEntered ? Number(mainRow.marksObtained) : 0) +
    (subEntered ? Number(subRow.marksObtained) : 0);
  const passing =
    (mainSc ? effectivePassingMarks(mainSc.maxMarks, mainSc.passingMarks) : 0) +
    (subSc ? effectivePassingMarks(subSc.maxMarks, subSc.passingMarks) : 0);
  return obtained < passing;
}

async function getActiveYear(schoolId) {
  return prisma.academicYear.findFirst({
    where: { schoolId, isActive: true },
    select: { id: true, name: true },
  });
}

// ─── GET /api/results/meta ─────────────────────────────────────────────────
export async function getResultsMeta(req, res) {
  try {
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;
    const role = req.user?.role;
    if (!userId || !schoolId) return err(res, "Unauthorized", 401);

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    if (role === "ADMIN") {
      const [exams, schedules] = await Promise.all([
        prisma.assessmentGroup.findMany({
          where: { schoolId, academicYearId: activeYear.id, deletedAt: null },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            term: { select: { id: true, name: true } },
          },
        }),
        prisma.assessmentSchedule.findMany({
          where: {
            assessmentGroup: { academicYearId: activeYear.id, schoolId },
          },
          select: {
            classSection: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
          },
        }),
      ]);

      const classMap = new Map();
      const subjectMap = new Map();
      for (const s of schedules) {
        classMap.set(s.classSection.id, s.classSection.name);
        subjectMap.set(s.subject.id, s.subject.name);
      }

      return ok(res, {
        exams,
        classes: [...classMap.entries()].map(([id, name]) => ({ id, name })),
        subjects: [...subjectMap.entries()].map(([id, name]) => ({ id, name })),
      });
    }

    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacher) return err(res, "Teacher profile not found", 404);

    const [timetableEntries, extraClasses] = await Promise.all([
      prisma.timetableEntry.findMany({
        where: { teacherId: teacher.id, academicYearId: activeYear.id },
        select: { classSectionId: true, subjectId: true },
      }),
      prisma.extraClass.findMany({
        where: {
          teacherId: teacher.id,
          academicYearId: activeYear.id,
          schoolId,
          isActive: true,
        },
        select: { classSectionId: true },
      }),
    ]);

    const teacherClassIds = [
      ...new Set(
        [...timetableEntries, ...extraClasses]
          .map((e) => e.classSectionId)
          .filter(Boolean),
      ),
    ];
    const teacherSubjectIds = [
      ...new Set(timetableEntries.map((e) => e.subjectId).filter(Boolean)),
    ];

    const [exams, schedules] = await Promise.all([
      prisma.assessmentGroup.findMany({
        where: { schoolId, academicYearId: activeYear.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          term: { select: { id: true, name: true } },
        },
      }),
      prisma.assessmentSchedule.findMany({
        where: {
          classSectionId: { in: teacherClassIds },
          subjectId: { in: teacherSubjectIds },
          assessmentGroup: { academicYearId: activeYear.id, schoolId },
        },
        select: {
          classSection: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true } },
        },
      }),
    ]);

    const classMap = new Map();
    const subjectMap = new Map();
    for (const s of schedules) {
      classMap.set(s.classSection.id, s.classSection.name);
      subjectMap.set(s.subject.id, s.subject.name);
    }

    return ok(res, {
      exams,
      classes: [...classMap.entries()].map(([id, name]) => ({ id, name })),
      subjects: [...subjectMap.entries()].map(([id, name]) => ({ id, name })),
    });
  } catch (e) {
    console.error("[getResultsMeta]", e);
    return err(res, e.message, 500);
  }
}

// ─── GET /api/results/teacher/classes ─────────────────────────────────────
export async function getTeacherClasses(req, res) {
  try {
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;
    if (!userId || !schoolId) return err(res, "Unauthorized", 401);

    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacher) return err(res, "Teacher profile not found", 404);

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    const [entries, extras] = await Promise.all([
      prisma.timetableEntry.findMany({
        where: { teacherId: teacher.id, academicYearId: activeYear.id },
        select: {
          classSectionId: true,
          classSection: {
            select: { id: true, name: true, grade: true, section: true },
          },
        },
        distinct: ["classSectionId"],
      }),
      prisma.extraClass.findMany({
        where: {
          teacherId: teacher.id,
          academicYearId: activeYear.id,
          schoolId,
          isActive: true,
        },
        select: {
          classSectionId: true,
          classSection: {
            select: { id: true, name: true, grade: true, section: true },
          },
        },
        distinct: ["classSectionId"],
      }),
    ]);

    const seen = new Set();
    const classes = [...entries, ...extras]
      .map((e) => e.classSection)
      .filter((cs) => {
        if (seen.has(cs.id)) return false;
        seen.add(cs.id);
        return true;
      })
      .sort(
        (a, b) =>
          String(a.grade).localeCompare(String(b.grade), undefined, {
            numeric: true,
          }) || String(a.section).localeCompare(String(b.section)),
      );

    return ok(res, { classes });
  } catch (e) {
    console.error("[getTeacherClasses]", e);
    return err(res, e.message, 500);
  }
}

// ─── GET /api/results/teacher/classes/:classSectionId/subjects ────────────
export async function getTeacherSubjectsForClass(req, res) {
  try {
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;
    if (!userId || !schoolId) return err(res, "Unauthorized", 401);

    const { classSectionId } = req.params;
    const { assessmentGroupId } = req.query;

    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacher) return err(res, "Teacher profile not found", 404);

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    const timetableEntries = await prisma.timetableEntry.findMany({
      where: {
        teacherId: teacher.id,
        academicYearId: activeYear.id,
        classSectionId,
      },
      select: { subjectId: true },
      distinct: ["subjectId"],
    });
    const teacherSubjectIds = timetableEntries
      .map((e) => e.subjectId)
      .filter(Boolean);

    const schedules = await prisma.assessmentSchedule.findMany({
      where: {
        classSectionId,
        subjectId: { in: teacherSubjectIds },
        assessmentGroup: {
          academicYearId: activeYear.id,
          schoolId,
          ...(assessmentGroupId ? { id: assessmentGroupId } : {}),
        },
      },
      select: {
        id: true,
        maxMarks: true,
        passingMarks: true,
        examDate: true,
        subject: { select: { id: true, name: true, code: true } },
        assessmentGroup: { select: { id: true, name: true } },
      },
    });

    const subjectMap = new Map();
    for (const s of schedules) {
      if (!subjectMap.has(s.subject.id))
        subjectMap.set(s.subject.id, s.subject);
    }

    return ok(res, { subjects: [...subjectMap.values()], schedules });
  } catch (e) {
    console.error("[getTeacherSubjectsForClass]", e);
    return err(res, e.message, 500);
  }
}

// ─── GET /api/results/exams ────────────────────────────────────────────────
export async function getResultExamGroups(req, res) {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return err(res, "Unauthorized", 401);

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    const exams = await prisma.assessmentGroup.findMany({
      where: { schoolId, academicYearId: activeYear.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        weightage: true,
        isPublished: true,
        isLocked: true,
        termId: true,
        term: { select: { id: true, name: true } },
      },
    });

    return ok(res, { data: exams, academicYear: activeYear });
  } catch (e) {
    console.error("[getResultExamGroups]", e);
    return err(res, e.message, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
//  GET /api/results/sub-exams
//  Returns the "Assessment" term (auto-created if missing) and the
//  exam groups filed under it — these are selectable as "Sub Exam"
//  in the Upload Results modal and combined into the report card.
// ═══════════════════════════════════════════════════════════════
export async function getSubExamGroups(req, res) {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return err(res, "Unauthorized", 401);

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    // Find every term named "Assessment" (case/whitespace tolerant) — not
    // just the first one. Duplicate term rows with the same label can exist
    // (same class of bug as duplicate Subject/ClassSection rows seen
    // elsewhere), and exams filed under any of them are still Sub Exams.
    let assessmentTerms = await prisma.assessmentTerm.findMany({
      where: {
        schoolId,
        academicYearId: activeYear.id,
        deletedAt: null,
        name: { equals: "Assessment", mode: "insensitive" },
      },
    });
    if (!assessmentTerms.length) {
      const created = await prisma.assessmentTerm.create({
        data: { schoolId, academicYearId: activeYear.id, name: "Assessment" },
      });
      assessmentTerms = [created];
    }
    const termIds = assessmentTerms.map((t) => t.id);

    const subExams = await prisma.assessmentGroup.findMany({
      where: {
        schoolId,
        academicYearId: activeYear.id,
        termId: { in: termIds },
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        weightage: true,
        isPublished: true,
        isLocked: true,
      },
    });

    return ok(res, {
      term: assessmentTerms[0],
      terms: assessmentTerms,
      data: subExams,
    });
  } catch (e) {
    console.error("[getSubExamGroups]", e);
    return err(res, e.message, 500);
  }
}

// ─── GET /api/results/exams/:assessmentGroupId/schedules ──────────────────
export async function getSchedulesByAssessmentGroup(req, res) {
  try {
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;
    const role = req.user?.role;
    if (!userId || !schoolId) return err(res, "Unauthorized", 401);

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    if (role === "ADMIN") {
      const schedules = await prisma.assessmentSchedule.findMany({
        where: {
          assessmentGroupId: req.params.assessmentGroupId,
          classSection: { schoolId },
          deletedAt: null,
        },
        orderBy: [
          { classSection: { grade: "asc" } },
          { classSection: { section: "asc" } },
          { subject: { name: "asc" } },
        ],
        select: {
          id: true,
          classSectionId: true,
          subjectId: true,
          maxMarks: true,
          passingMarks: true,
          examDate: true,
          assessmentGroup: { select: { id: true, name: true, termId: true } },
          classSection: {
            select: { id: true, name: true, grade: true, section: true },
          },
          subject: { select: { id: true, name: true, code: true } },
        },
      });
      return ok(res, { data: schedules });
    }

    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacher) return err(res, "Teacher profile not found", 404);

    const timetableEntries = await prisma.timetableEntry.findMany({
      where: { teacherId: teacher.id, academicYearId: activeYear.id },
      select: { classSectionId: true, subjectId: true },
    });
    const teacherClassIds = [
      ...new Set(timetableEntries.map((e) => e.classSectionId).filter(Boolean)),
    ];
    const teacherSubjectIds = [
      ...new Set(timetableEntries.map((e) => e.subjectId).filter(Boolean)),
    ];

    const schedules = await prisma.assessmentSchedule.findMany({
      where: {
        assessmentGroupId: req.params.assessmentGroupId,
        classSectionId: { in: teacherClassIds },
        subjectId: { in: teacherSubjectIds },
        classSection: { schoolId },
        deletedAt: null,
      },
      orderBy: [
        { classSection: { grade: "asc" } },
        { classSection: { section: "asc" } },
        { subject: { name: "asc" } },
      ],
      select: {
        id: true,
        classSectionId: true,
        subjectId: true,
        maxMarks: true,
        passingMarks: true,
        examDate: true,
        assessmentGroup: { select: { id: true, name: true, termId: true } },
        classSection: {
          select: { id: true, name: true, grade: true, section: true },
        },
        subject: { select: { id: true, name: true, code: true } },
      },
    });

    return ok(res, { data: schedules });
  } catch (e) {
    console.error("[getSchedulesByAssessmentGroup]", e);
    return err(res, e.message, 500);
  }
}

// ─── Component (R&R / CW / PW / ST) helpers ───────────────────────────────
const COMPONENT_KEYS = ["rr", "cw", "pw", "st"];

function isBlank(v) {
  return v === null || v === undefined || String(v).trim() === "";
}

/** Normalises stored/submitted components → { rr, cw, pw, st } of number|null, or null if none. */
function normalizeComponents(c) {
  if (!c || typeof c !== "object") return null;
  const out = {};
  let any = false;
  for (const k of COMPONENT_KEYS) {
    const v = c[k];
    if (isBlank(v)) {
      out[k] = null;
    } else {
      const n = Number(v);
      out[k] = Number.isNaN(n) ? null : n;
      if (!Number.isNaN(n)) any = true;
    }
  }
  return any ? out : null;
}

/** Components in the shape the Edit screen inputs expect (strings, "" = blank). */
function componentsForEditor(c) {
  const n = normalizeComponents(c);
  if (!n) return null;
  const out = {};
  for (const k of COMPONENT_KEYS) out[k] = n[k] === null ? "" : String(n[k]);
  return out;
}

function componentsTotal(n) {
  return COMPONENT_KEYS.reduce((sum, k) => sum + (n?.[k] ?? 0), 0);
}

// ─── GET /api/results/schedule/:scheduleId/students ───────────────────────
// Edit screen loader. Returns every ACTIVE student of the class with any
// previously saved marks merged in by studentId:
//   marksObtained, isAbsent, remarks, components (R&R / CW / PW / ST)
// Students without a saved record come back blank (markStatus "pending") —
// never converted to 0 or absent. Opening this screen writes nothing.
export async function getStudentsForSchedule(req, res) {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return err(res, "Unauthorized", 401);

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    const [schedule, existingMarks] = await Promise.all([
      prisma.assessmentSchedule.findFirst({
        where: { id: req.params.scheduleId, classSection: { schoolId } },
        select: {
          id: true,
          classSectionId: true,
          maxMarks: true,
          passingMarks: true,
          examDate: true,
          assessmentGroupId: true,
          assessmentGroup: {
            select: {
              id: true,
              name: true,
              termId: true,
              term: { select: { id: true, name: true } },
            },
          },
          classSection: { select: { id: true, name: true } },
          subject: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.marks.findMany({
        where: { scheduleId: req.params.scheduleId, deletedAt: null },
        select: {
          id: true,
          studentId: true,
          marksObtained: true,
          isAbsent: true,
          remarks: true,
          components: true,
          updatedAt: true,
        },
      }),
    ]);

    if (!schedule) return err(res, "Schedule not found", 404);

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        classSectionId: schedule.classSectionId,
        academicYearId: activeYear.id,
        status: "ACTIVE",
      },
      orderBy: [{ rollNumber: "asc" }, { student: { name: "asc" } }],
      select: {
        rollNumber: true,
        admissionNumber: true,
        student: { select: { id: true, name: true, email: true } },
      },
    });

    // Match every saved marks record to its student.
    const marksMap = new Map(existingMarks.map((m) => [m.studentId, m]));

    let anyComponents = false;
    const students = enrollments.map(
      ({ student, rollNumber, admissionNumber }) => {
        const m = marksMap.get(student.id);
        const state = markState(m);
        const components = componentsForEditor(m?.components);
        if (components) anyComponents = true;
        return {
          studentId: student.id,
          studentName: student.name,
          email: student.email,
          rollNumber: rollNumber || "",
          admissionNumber: admissionNumber || "",
          marksId: m?.id || null,
          hasExistingMarks: !!m,
          // "entered" | "absent" | "pending"
          markStatus: state,
          // Real 0 stays 0; only a missing value is blank.
          marksObtained:
            m &&
            !m.isAbsent &&
            m.marksObtained !== null &&
            m.marksObtained !== undefined
              ? m.marksObtained
              : "",
          isAbsent: !!m?.isAbsent,
          remarks: m?.remarks || "",
          components,
          updatedAt: m?.updatedAt || null,
        };
      },
    );

    const savedCount = students.filter(
      (s) => s.markStatus !== "pending",
    ).length;

    return ok(res, {
      data: {
        schedule: {
          id: schedule.id,
          examId: schedule.assessmentGroup.id,
          examName: schedule.assessmentGroup.name,
          termId: schedule.assessmentGroup.term?.id || null,
          termName: schedule.assessmentGroup.term?.name || null,
          classSectionId: schedule.classSection.id,
          classSectionName: schedule.classSection.name,
          subjectName: schedule.subject.name,
          subjectCode: schedule.subject.code,
          maxMarks: schedule.maxMarks,
          passingMarks: schedule.passingMarks,
          examDate: schedule.examDate,
        },
        // "fa" when saved marks carry an R&R/CW/PW/ST breakdown
        format: anyComponents ? "fa" : "standard",
        savedCount,
        pendingCount: students.length - savedCount,
        students,
      },
    });
  } catch (e) {
    console.error("[getStudentsForSchedule]", e);
    return err(res, e.message, 500);
  }
}

// ─── POST /api/results/schedule/:scheduleId/marks ─────────────────────────
// Saves ONLY the submitted records, and only writes the ones that actually
// changed. Students not in the payload are never touched. Afterwards the
// stored ResultSummary for the class is recalculated with the shared rules.
//
// Per item: { studentId, marksObtained, isAbsent, remarks, components? }
//   components omitted  → existing breakdown kept as-is
//   components null     → breakdown cleared
//   components {rr,..}  → breakdown saved; its total becomes marksObtained
export async function saveMarksForSchedule(req, res) {
  try {
    const schoolId = req.user?.schoolId;
    const { scheduleId } = req.params;
    const { students } = req.body;

    if (!schoolId) return err(res, "Unauthorized", 401);
    if (!scheduleId) return err(res, "Schedule id required", 400);
    if (!Array.isArray(students) || !students.length)
      return err(res, "Students array required", 400);

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    const schedule = await prisma.assessmentSchedule.findFirst({
      where: { id: scheduleId, classSection: { schoolId } },
      select: {
        id: true,
        classSectionId: true,
        maxMarks: true,
        assessmentGroupId: true,
        assessmentGroup: { select: { id: true, termId: true } },
      },
    });
    if (!schedule) return err(res, "Schedule not found", 404);

    const validIds = await prisma.studentEnrollment.findMany({
      where: {
        classSectionId: schedule.classSectionId,
        academicYearId: activeYear.id,
        status: "ACTIVE",
      },
      select: { studentId: true },
    });
    const validSet = new Set(validIds.map((s) => s.studentId));
    const maxMarks = Number(schedule.maxMarks || 0);

    // ── 1. Validate + normalise every submitted item ──────────────────────
    const seen = new Set();
    const normalized = [];
    for (const item of students) {
      if (!item?.studentId || !validSet.has(item.studentId))
        return err(res, `Invalid student: ${item?.studentId}`, 400);
      if (seen.has(item.studentId))
        return err(res, `Duplicate student in request: ${item.studentId}`, 400);
      seen.add(item.studentId);

      const isAbsent = !!item.isAbsent;
      const hasComponentsKey = Object.prototype.hasOwnProperty.call(
        item,
        "components",
      );
      let components = hasComponentsKey
        ? normalizeComponents(item.components)
        : undefined;

      if (components) {
        for (const k of COMPONENT_KEYS) {
          if (components[k] !== null && components[k] < 0)
            return err(
              res,
              `Invalid ${k.toUpperCase()} marks for ${item.studentId}`,
              400,
            );
        }
      }

      let marksObtained = null;
      if (!isAbsent) {
        if (components) {
          marksObtained = componentsTotal(components);
        } else if (!isBlank(item.marksObtained)) {
          const v = Number(item.marksObtained);
          if (Number.isNaN(v) || v < 0)
            return err(res, `Invalid marks for ${item.studentId}`, 400);
          marksObtained = v;
        }
        if (marksObtained !== null && marksObtained > maxMarks)
          return err(
            res,
            `Marks exceed max (${maxMarks}) for ${item.studentId}`,
            400,
          );
      } else if (hasComponentsKey) {
        components = null; // absent → no breakdown
      }

      normalized.push({
        studentId: item.studentId,
        marksObtained,
        isAbsent,
        remarks:
          typeof item.remarks === "string" ? item.remarks.trim() || null : null,
        hasComponentsKey,
        components: components ?? null,
      });
    }

    // ── 2. Compare with what is already stored → write only real changes ──
    const existing = await prisma.marks.findMany({
      where: {
        scheduleId,
        studentId: { in: normalized.map((n) => n.studentId) },
      },
      select: {
        id: true,
        studentId: true,
        marksObtained: true,
        isAbsent: true,
        remarks: true,
        components: true,
        deletedAt: true,
      },
    });
    const existingByStudent = new Map(existing.map((m) => [m.studentId, m]));

    const writes = [];
    let unchanged = 0;
    for (const n of normalized) {
      const cur = existingByStudent.get(n.studentId);
      const data = {
        marksObtained: n.marksObtained,
        isAbsent: n.isAbsent,
        remarks: n.remarks,
        ...(n.hasComponentsKey ? { components: n.components } : {}),
      };

      if (!cur || cur.deletedAt) {
        // Nothing stored yet: a completely blank row stays pending — no record.
        const blank =
          !n.isAbsent &&
          n.marksObtained === null &&
          !n.remarks &&
          !n.components;
        if (blank) {
          unchanged++;
          continue;
        }
        writes.push({ studentId: n.studentId, data });
        continue;
      }

      const sameMarks =
        (cur.marksObtained ?? null) === (n.marksObtained ?? null) &&
        !!cur.isAbsent === n.isAbsent &&
        (cur.remarks || null) === (n.remarks || null);
      const sameComponents =
        !n.hasComponentsKey ||
        JSON.stringify(normalizeComponents(cur.components)) ===
          JSON.stringify(n.components);

      if (sameMarks && sameComponents) {
        unchanged++;
        continue;
      }
      writes.push({ studentId: n.studentId, data });
    }

    if (writes.length) {
      await prisma.$transaction(
        writes.map((w) =>
          prisma.marks.upsert({
            where: {
              scheduleId_studentId: { scheduleId, studentId: w.studentId },
            },
            update: { ...w.data, deletedAt: null },
            create: { scheduleId, studentId: w.studentId, ...w.data },
          }),
        ),
      );

      // ── 3. Recalculate the stored result summary (same rules as every screen)
      await recalcStoredSummaries(prisma, {
        assessmentGroupId: schedule.assessmentGroupId,
        classSectionId: schedule.classSectionId,
        academicYearId: activeYear.id,
        termId: schedule.assessmentGroup.termId,
        studentIds: writes.map((w) => w.studentId),
      });
    }

    return ok(res, {
      message: writes.length
        ? `Marks saved for ${writes.length} student${writes.length !== 1 ? "s" : ""}`
        : "No changes to save",
      savedCount: writes.length,
      unchangedCount: unchanged,
      savedStudentIds: writes.map((w) => w.studentId),
    });
  } catch (e) {
    console.error("[saveMarksForSchedule]", e);
    return err(res, e.message, 500);
  }
}

// ─── PUT /api/results/schedule/:scheduleId ────────────────────────────────
// Updates an existing exam schedule IN PLACE (used by the Edit Exam wizard)
// so its marks stay attached. Previously editing an exam deleted every
// schedule and re-created it, which detached / cascade-deleted saved marks.
function toTimeDate(datePart, hhmm) {
  if (!hhmm) return undefined;
  const clean = String(hhmm).trim().substring(0, 5);
  if (!/^\d{2}:\d{2}$/.test(clean)) return undefined;
  const d = String(datePart || "1970-01-01").substring(0, 10);
  return new Date(`${d}T${clean}:00.000Z`);
}

export async function updateSchedule(req, res) {
  try {
    const schoolId = req.user?.schoolId;
    const role = req.user?.role;
    if (!schoolId) return err(res, "Unauthorized", 401);
    if (role !== "ADMIN") return err(res, "Forbidden", 403);

    const { scheduleId } = req.params;
    const {
      maxMarks,
      passingMarks,
      examDate,
      startTime,
      endTime,
      subjectId,
      classSectionId,
    } = req.body || {};

    const schedule = await prisma.assessmentSchedule.findFirst({
      where: { id: scheduleId, classSection: { schoolId } },
      select: {
        id: true,
        classSectionId: true,
        subjectId: true,
        maxMarks: true,
        examDate: true,
        assessmentGroupId: true,
        assessmentGroup: { select: { academicYearId: true, termId: true } },
        _count: { select: { marks: { where: { deletedAt: null } } } },
      },
    });
    if (!schedule) return err(res, "Schedule not found", 404);

    const hasMarks = schedule._count.marks > 0;
    if (
      hasMarks &&
      ((subjectId && subjectId !== schedule.subjectId) ||
        (classSectionId && classSectionId !== schedule.classSectionId))
    ) {
      return err(
        res,
        "This schedule already has marks. Its class/subject cannot be changed — remove it and add a new schedule instead.",
        409,
      );
    }

    const data = {};
    if (maxMarks !== undefined && maxMarks !== "") {
      const v = Number(maxMarks);
      if (Number.isNaN(v) || v <= 0) return err(res, "Invalid max marks", 400);
      if (hasMarks) {
        const top = await prisma.marks.aggregate({
          where: { scheduleId, deletedAt: null, isAbsent: false },
          _max: { marksObtained: true },
        });
        const highest = top._max.marksObtained ?? 0;
        if (v < highest)
          return err(
            res,
            `Max marks can't be lower than an already-saved mark (${highest}).`,
            400,
          );
      }
      data.maxMarks = v;
    }
    if (passingMarks !== undefined) {
      data.passingMarks =
        passingMarks === "" || passingMarks === null
          ? null
          : Number(passingMarks) || 0;
    }
    if (examDate) data.examDate = new Date(String(examDate).substring(0, 10));
    const datePart =
      examDate || schedule.examDate?.toISOString?.().substring(0, 10);
    const st = toTimeDate(datePart, startTime);
    const et = toTimeDate(datePart, endTime);
    if (st) data.startTime = st;
    if (et) data.endTime = et;
    if (subjectId) data.subjectId = subjectId;
    if (classSectionId) data.classSectionId = classSectionId;

    const updated = await prisma.assessmentSchedule.update({
      where: { id: scheduleId },
      data,
    });

    // Max marks drive every percentage in the class → refresh stored summaries.
    if (
      data.maxMarks !== undefined &&
      data.maxMarks !== Number(schedule.maxMarks) &&
      hasMarks
    ) {
      await recalcStoredSummaries(prisma, {
        assessmentGroupId: schedule.assessmentGroupId,
        classSectionId: updated.classSectionId,
        academicYearId: schedule.assessmentGroup.academicYearId,
        termId: schedule.assessmentGroup.termId,
      });
    }

    return ok(res, { data: updated, message: "Schedule updated" });
  } catch (e) {
    console.error("[updateSchedule]", e);
    return err(res, e.message, 500);
  }
}

// ─── GET /api/results/list ─────────────────────────────────────────────────
export async function getResultsList(req, res) {
  try {
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;
    const role = req.user?.role;
    if (!userId || !schoolId) return err(res, "Unauthorized", 401);

    const {
      search = "",
      assessmentGroupId = "",
      classSectionId = "",
      subjectId = "",
    } = req.query;

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    let effectiveClassIds = null;
    let effectiveSubjectIds = null;

    if (role !== "ADMIN") {
      const teacher = await prisma.teacherProfile.findUnique({
        where: { userId },
      });
      if (!teacher) return err(res, "Teacher profile not found", 404);

      const timetableEntries = await prisma.timetableEntry.findMany({
        where: { teacherId: teacher.id, academicYearId: activeYear.id },
        select: { classSectionId: true, subjectId: true },
      });

      const teacherClassIds = [
        ...new Set(
          timetableEntries.map((e) => e.classSectionId).filter(Boolean),
        ),
      ];
      const teacherSubjectIds = [
        ...new Set(timetableEntries.map((e) => e.subjectId).filter(Boolean)),
      ];

      effectiveClassIds = classSectionId
        ? teacherClassIds.filter((id) => id === classSectionId)
        : teacherClassIds;
      effectiveSubjectIds = subjectId
        ? teacherSubjectIds.filter((id) => id === subjectId)
        : teacherSubjectIds;

      if (!effectiveClassIds.length || !effectiveSubjectIds.length) {
        return ok(res, { data: [] });
      }
    }

    const rows = await prisma.marks.findMany({
      where: {
        deletedAt: null,
        schedule: {
          deletedAt: null,
          ...(effectiveClassIds
            ? { classSectionId: { in: effectiveClassIds } }
            : classSectionId
              ? { classSectionId }
              : {}),
          ...(effectiveSubjectIds
            ? { subjectId: { in: effectiveSubjectIds } }
            : subjectId
              ? { subjectId }
              : {}),
          assessmentGroup: {
            schoolId,
            academicYearId: activeYear.id,
            ...(assessmentGroupId ? { id: assessmentGroupId } : {}),
          },
        },
        ...(search
          ? {
              OR: [
                {
                  student: { name: { contains: search, mode: "insensitive" } },
                },
                {
                  student: {
                    enrollments: {
                      some: {
                        academicYearId: activeYear.id,
                        rollNumber: { contains: search, mode: "insensitive" },
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        marksObtained: true,
        isAbsent: true,
        remarks: true,
        components: true,
        student: {
          select: {
            id: true,
            name: true,
            enrollments: {
              where: { academicYearId: activeYear.id },
              select: { rollNumber: true },
              take: 1,
            },
          },
        },
        schedule: {
          select: {
            maxMarks: true,
            passingMarks: true,
            examDate: true,
            subject: { select: { id: true, name: true } },
            classSection: { select: { id: true, name: true } },
            assessmentGroup: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Subject-level rows (one per marks record). Subject percentage/grade
    // are per subject; they never feed the overall grade.
    const data = rows.map((r) => {
      const state = markState(r); // "entered" | "absent" | "pending"
      const totalMarks = Number(r.schedule.maxMarks || 0);
      const marks = state === "entered" ? Number(r.marksObtained) : null;
      const percentage = state === "entered" ? pctOf(marks, totalMarks) : null;
      const failed = isMarkRowFail(r); // subject-level, informational
      return {
        id: r.id,
        studentId: r.student.id,
        studentName: r.student.name,
        rollNo: r.student.enrollments[0]?.rollNumber || "-",
        classSectionId: r.schedule.classSection.id,
        className: r.schedule.classSection.name,
        subjectId: r.schedule.subject.id,
        subject: r.schedule.subject.name,
        examId: r.schedule.assessmentGroup.id,
        exam: r.schedule.assessmentGroup.name,
        marks,
        totalMarks,
        percentage,
        passingMarks: r.schedule.passingMarks ?? null,
        grade:
          state === "absent"
            ? "AB"
            : state === "pending"
              ? "—"
              : getGrade(percentage),
        // "pass" | "fail" | "absent" | "pending" — SUBJECT-level only
        resultStatus:
          state === "absent"
            ? "absent"
            : state === "pending"
              ? "pending"
              : failed
                ? "fail"
                : "pass",
        hasFail: failed,
        isAbsent: state === "absent",
        isPending: state === "pending",
        remarks: r.remarks,
        components: r.components ?? null,
        date: r.schedule.examDate,
      };
    });

    return ok(res, { data });
  } catch (e) {
    console.error("[getResultsList]", e);
    return err(res, e.message, 500);
  }
}

// ─── GET /api/results/summary ──────────────────────────────────────────────
// One row per student per exam (per class), calculated LIVE from the marks
// with the shared rules — so it always matches the report card, PDF and
// Excel export. The stored ResultSummary row only supplies id/isPublished.
export async function getResultsSummary(req, res) {
  try {
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;
    if (!userId || !schoolId) return err(res, "Unauthorized", 401);

    const { classSectionId = "", assessmentGroupId = "" } = req.query;

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    // 1. Every configured subject schedule in scope (defines Total Maximum)
    const schedules = await prisma.assessmentSchedule.findMany({
      where: {
        deletedAt: null,
        ...(classSectionId ? { classSectionId } : {}),
        classSection: { schoolId },
        assessmentGroup: {
          schoolId,
          academicYearId: activeYear.id,
          deletedAt: null,
          ...(assessmentGroupId ? { id: assessmentGroupId } : {}),
        },
      },
      select: {
        id: true,
        assessmentGroupId: true,
        classSectionId: true,
        subjectId: true,
        maxMarks: true,
        passingMarks: true,
        assessmentGroup: {
          select: {
            id: true,
            name: true,
            term: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!schedules.length) return ok(res, { data: [] });

    const classIds = [...new Set(schedules.map((s) => s.classSectionId))];
    const groupIds = [...new Set(schedules.map((s) => s.assessmentGroupId))];

    // 2. Students, marks and stored summaries — three queries in total
    const [enrollments, marks, stored] = await Promise.all([
      prisma.studentEnrollment.findMany({
        where: {
          classSectionId: { in: classIds },
          academicYearId: activeYear.id,
        },
        select: {
          studentId: true,
          classSectionId: true,
          rollNumber: true,
          status: true,
          student: { select: { id: true, name: true } },
        },
      }),
      prisma.marks.findMany({
        where: {
          deletedAt: null,
          scheduleId: { in: schedules.map((s) => s.id) },
        },
        select: {
          id: true,
          studentId: true,
          scheduleId: true,
          marksObtained: true,
          isAbsent: true,
        },
      }),
      prisma.resultSummary.findMany({
        where: {
          academicYearId: activeYear.id,
          assessmentGroupId: { in: groupIds },
        },
        select: {
          id: true,
          studentId: true,
          assessmentGroupId: true,
          isPublished: true,
        },
      }),
    ]);

    const storedByKey = new Map(
      stored.map((s) => [`${s.studentId}|${s.assessmentGroupId}`, s]),
    );

    // Group by class + exam
    const pairs = new Map();
    for (const sc of schedules) {
      const key = `${sc.classSectionId}|${sc.assessmentGroupId}`;
      if (!pairs.has(key))
        pairs.set(key, {
          classSectionId: sc.classSectionId,
          group: sc.assessmentGroup,
          schedules: [],
        });
      pairs.get(key).schedules.push(sc);
    }
    const scheduleToPair = new Map();
    for (const [key, p] of pairs)
      for (const sc of p.schedules) scheduleToPair.set(sc.id, key);

    const marksByPair = new Map();
    for (const m of marks) {
      const key = scheduleToPair.get(m.scheduleId);
      if (!key) continue;
      if (!marksByPair.has(key)) marksByPair.set(key, []);
      marksByPair.get(key).push(m);
    }

    const enrollByClass = new Map();
    for (const e of enrollments) {
      if (!enrollByClass.has(e.classSectionId))
        enrollByClass.set(e.classSectionId, []);
      enrollByClass.get(e.classSectionId).push(e);
    }

    const data = [];
    for (const [key, p] of pairs) {
      const classEnrollments = enrollByClass.get(p.classSectionId) || [];
      const pairMarks = marksByPair.get(key) || [];
      if (!pairMarks.length) continue; // nothing entered for this class + exam yet

      const results = computeClassResults({
        schedules: p.schedules,
        enrollments: classEnrollments,
        marks: pairMarks,
      });
      const enrollByStudent = new Map(
        classEnrollments.map((e) => [e.studentId, e]),
      );

      for (const [sid, r] of results) {
        if (r.status === "pending") continue; // no marks entered for this student yet
        const enr = enrollByStudent.get(sid);
        const st = storedByKey.get(`${sid}|${p.group.id}`);
        data.push({
          id: st?.id || `${sid}|${p.group.id}`,
          studentId: sid,
          studentName: enr?.student?.name || "—",
          rollNo: enr?.rollNumber || "-",
          classSectionId: p.classSectionId,
          assessmentGroupId: p.group.id,
          examName: p.group.name,
          term: p.group.term,

          totalMarks: r.totalObtained,
          maxMarks: r.totalMax,
          percentage: r.percentage, // null when absent in every subject
          grade: r.grade, // from overall percentage only; "AB" when all absent
          gradeLabel: r.gradeLabel,

          resultStatus: r.status, // "calculated" | "absent"
          isAbsent: r.isAbsent,
          isComplete: r.isComplete,
          attendedSubjects: r.attendedSubjects,
          absentSubjects: r.absentSubjects,
          pendingSubjects: r.pendingSubjects,

          // No overall fail — subject info is informational only.
          hasFail: false,
          hasSubjectFail: r.hasSubjectFail,
          failedSubjectsCount: r.failedSubjects,

          rank: r.rank,
          isRanked: r.isRanked,
          rankedStudents: r.rankedStudents,

          isPublished: st?.isPublished ?? false,
        });
      }
    }

    return ok(res, { data });
  } catch (e) {
    console.error("[getResultsSummary]", e);
    return err(res, e.message, 500);
  }
}
// ─── DELETE /api/results/marks/:id ────────────────────────────────────────
export async function deleteMarkEntry(req, res) {
  try {
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;
    if (!userId || !schoolId) return err(res, "Unauthorized", 401);

    const teacher = await prisma.teacherProfile.findUnique({
      where: { userId },
    });
    if (!teacher) return err(res, "Teacher profile not found", 404);

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    const existing = await prisma.marks.findFirst({
      where: { id: req.params.id, schedule: { assessmentGroup: { schoolId } } },
      select: {
        id: true,
        studentId: true,
        schedule: {
          select: {
            classSectionId: true,
            subjectId: true,
            assessmentGroupId: true,
            assessmentGroup: { select: { termId: true } },
          },
        },
      },
    });
    if (!existing) return err(res, "Marks entry not found", 404);

    const assigned = await prisma.timetableEntry.findFirst({
      where: {
        teacherId: teacher.id,
        academicYearId: activeYear.id,
        classSectionId: existing.schedule.classSectionId,
        subjectId: existing.schedule.subjectId,
      },
    });
    if (!assigned) return err(res, "Not authorized to delete this entry", 403);

    await prisma.marks.delete({ where: { id: req.params.id } });

    // Keep the stored result summary in step with the remaining marks.
    await recalcStoredSummaries(prisma, {
      assessmentGroupId: existing.schedule.assessmentGroupId,
      classSectionId: existing.schedule.classSectionId,
      academicYearId: activeYear.id,
      termId: existing.schedule.assessmentGroup?.termId ?? null,
      studentIds: [existing.studentId],
    });

    return ok(res, { message: "Deleted successfully" });
  } catch (e) {
    console.error("[deleteMarkEntry]", e);
    return err(res, e.message, 500);
  }
}

// ─── GET /api/results/admin/overview ───────────────────────────────────────
// Admin-only. Powers the "Upload Exam Results" main page:
//   - 4 status cards (Total Classes, Total Students, Uploaded Results, Pending Results)
//   - class-wise breakdown (uploaded vs pending exam-schedules per class)
export async function getAdminUploadOverview(req, res) {
  try {
    const schoolId = req.user?.schoolId;
    const role = req.user?.role;
    if (!schoolId) return err(res, "Unauthorized", 401);
    if (role !== "ADMIN") return err(res, "Forbidden", 403);

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    const [classSections, schedules] = await Promise.all([
      prisma.classSection.findMany({
        where: { schoolId, deletedAt: null },
        orderBy: [{ grade: "asc" }, { section: "asc" }],
        select: {
          id: true,
          grade: true,
          section: true,
          name: true,
          _count: {
            select: {
              studentEnrollments: {
                where: { academicYearId: activeYear.id, status: "ACTIVE" },
              },
            },
          },
        },
      }),
      prisma.assessmentSchedule.findMany({
        where: {
          deletedAt: null,
          classSection: { schoolId },
          assessmentGroup: { academicYearId: activeYear.id, schoolId },
        },
        select: {
          id: true,
          classSectionId: true,
          assessmentGroupId: true,
          subject: { select: { id: true, name: true } },
          _count: { select: { marks: { where: { deletedAt: null } } } },
        },
      }),
    ]);

    const schedulesByClass = new Map();
    for (const s of schedules) {
      if (!schedulesByClass.has(s.classSectionId))
        schedulesByClass.set(s.classSectionId, []);
      schedulesByClass.get(s.classSectionId).push(s);
    }

    let uploadedResults = 0;
    let pendingResults = 0;

    const classWise = classSections.map((cs) => {
      const list = schedulesByClass.get(cs.id) || [];
      const uploaded = list.filter((s) => s._count.marks > 0).length;
      const pending = list.length - uploaded;
      uploadedResults += uploaded;
      pendingResults += pending;

      return {
        classSectionId: cs.id,
        grade: cs.grade,
        section: cs.section,
        name: cs.name,
        studentCount: cs._count.studentEnrollments,
        examCount: new Set(list.map((s) => s.assessmentGroupId)).size,
        totalSchedules: list.length,
        uploadedSchedules: uploaded,
        pendingSchedules: pending,
      };
    });

    const totalStudents = classSections.reduce(
      (sum, c) => sum + c._count.studentEnrollments,
      0,
    );

    return ok(res, {
      stats: {
        totalClasses: classSections.length,
        totalStudents,
        uploadedResults,
        pendingResults,
      },
      classWise,
      academicYear: activeYear,
    });
  } catch (e) {
    console.error("[getAdminUploadOverview]", e);
    return err(res, e.message, 500);
  }
}

export const exportResultsExcel = async (req, res) => {
  try {
    const { classSectionId, assessmentGroupId, subjectId } = req.query;

    if (!classSectionId || !assessmentGroupId) {
      return res.status(400).json({
        message:
          "Missing required params: classSectionId and assessmentGroupId",
      });
    }

    // ── 1. Fetch data ──────────────────────────────────────────────────────────
    const schoolId = req.user?.schoolId;
    const results = await prisma.marks.findMany({
      where: {
        deletedAt: null,
        schedule: {
          classSectionId,
          assessmentGroupId,
          deletedAt: null,
          ...(subjectId ? { subjectId } : {}),
          ...(schoolId ? { assessmentGroup: { schoolId } } : {}),
        },
      },
      include: {
        student: {
          include: {
            enrollments: {
              where: { classSectionId },
              select: { rollNumber: true },
              take: 1,
            },
          },
        },
        schedule: {
          include: {
            subject: true,
            classSection: true,
            assessmentGroup: true,
          },
        },
      },
      orderBy: [
        { schedule: { subject: { name: "asc" } } },
        { student: { name: "asc" } },
      ],
    });

    if (!results.length) {
      return res
        .status(404)
        .json({ message: "No results found for the given filters" });
    }

    // ── 2. Meta from first row ─────────────────────────────────────────────────
    const first = results[0].schedule;
    const className = first.classSection.name;
    const examName = first.assessmentGroup.name;
    const exportDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    // ── 3. Build workbook ──────────────────────────────────────────────────────
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "School Results System";
    wb.created = new Date();
    wb.modified = new Date();

    const ws = wb.addWorksheet("Results", {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
      views: [{ state: "frozen", ySplit: 6 }], // freeze above the data rows
    });

    // ── 4. Colour palette ──────────────────────────────────────────────────────
    const C = {
      headerBg: "FF1E3A5F", // deep navy
      headerFg: "FFFFFFFF", // white
      subHeaderBg: "FF2E86AB", // ocean blue
      subHeaderFg: "FFFFFFFF",
      metaBg: "FFE8F4FD", // very light blue
      metaFg: "FF1E3A5F",
      colHeaderBg: "FF34495E", // dark slate
      colHeaderFg: "FFFFFFFF",
      rowEven: "FFF8FBFF", // off-white
      rowOdd: "FFFFFFFF", // pure white
      borderCol: "FFB0C4DE",
      gradA: "FF1A7A4A", // dark green   A+ / A
      gradAFg: "FFFFFFFF",
      gradB: "FF2E7D32", // green        B
      gradBFg: "FFFFFFFF",
      gradC: "FFF57F17", // amber        C
      gradCFg: "FFFFFFFF",
      gradD: "FFE65100", // orange       D
      gradDFg: "FFFFFFFF",
      gradF: "FFC62828", // red          F
      gradFFg: "FFFFFFFF",
      gradAB: "FF6D4C41", // brown        AB (absent)
      gradABFg: "FFFFFFFF",
      passCell: "FFE8F5E9", // light green  passing rows
      failCell: "FFFCE4E4", // light red    failing rows
    };

    // ── 5. Column definitions (A–H) ────────────────────────────────────────────
    ws.columns = [
      { key: "rollNo", width: 10 }, // A
      { key: "student", width: 28 }, // B
      { key: "subject", width: 22 }, // C
      { key: "exam", width: 20 }, // D
      { key: "marks", width: 12 }, // E
      { key: "total", width: 12 }, // F
      { key: "percentage", width: 14 }, // G
      { key: "grade", width: 10 }, // H
    ];
    const LAST_COL = "H";
    const TOTAL_COLS = 8;

    // Helper – thin border all around
    const thinBorder = (color = C.borderCol) => ({
      top: { style: "thin", color: { argb: color } },
      left: { style: "thin", color: { argb: color } },
      bottom: { style: "thin", color: { argb: color } },
      right: { style: "thin", color: { argb: color } },
    });

    const fillSolid = (argb) => ({
      type: "pattern",
      pattern: "solid",
      fgColor: { argb },
    });

    // Helper – merge a row and style it
    const addBanner = (text, bgArgb, fgArgb, fontSize, rowHeight) => {
      const row = ws.addRow([text]);
      const cell = row.getCell(1);
      ws.mergeCells(`A${row.number}:${LAST_COL}${row.number}`);
      cell.value = text;
      cell.font = {
        bold: true,
        size: fontSize,
        color: { argb: fgArgb },
        name: "Calibri",
      };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill = fillSolid(bgArgb);
      cell.border = thinBorder("FFFFFFFF");
      row.height = rowHeight;
      return row;
    };

    // ── 6. Rows 1-5: Header block ──────────────────────────────────────────────

    // Row 1 – Title banner
    addBanner("📋  STUDENT RESULTS REPORT", C.headerBg, C.headerFg, 18, 36);

    // Row 2 – Class & Exam
    addBanner(
      `Class: ${className}   |   Exam: ${examName}`,
      C.subHeaderBg,
      C.subHeaderFg,
      13,
      26,
    );

    // Row 3 – Export date + total students
    const totalStudents = new Set(results.map((r) => r.studentId)).size;
    addBanner(
      `Exported on: ${exportDate}     |     Total Students: ${totalStudents}     |     Total Records: ${results.length}`,
      C.metaBg,
      C.metaFg,
      10,
      20,
    );

    // Row 4 – spacer
    const spacer = ws.addRow([]);
    spacer.height = 6;

    // Row 5 – blank (will be used for spacing)
    // (skipped – freeze already at row 6)

    // ── 7. Row 6: Column headers ───────────────────────────────────────────────
    const headerLabels = [
      "Roll No",
      "Student Name",
      "Subject",
      "Exam",
      "Marks",
      "Total",
      "Percentage",
      "Grade",
    ];
    const hdrRow = ws.addRow(headerLabels);
    hdrRow.height = 28;
    hdrRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        size: 11,
        color: { argb: C.colHeaderFg },
        name: "Calibri",
      };
      cell.fill = fillSolid(C.colHeaderBg);
      cell.alignment = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      cell.border = thinBorder("FF1A252F");
    });

    // ── 8. Data rows ───────────────────────────────────────────────────────────
    results.forEach((r, idx) => {
      // Subject-level row. Subject grade comes from the subject percentage
      // only — passing marks colour the row but never force an "F".
      const state = markState(r); // "entered" | "absent" | "pending"
      const total = Number(r.schedule.maxMarks || 0);
      const marks = state === "entered" ? Number(r.marksObtained) : null;
      const pct = state === "entered" ? pctOf(marks, total) : null;
      const grade =
        state === "absent" ? "AB" : state === "pending" ? "—" : getGrade(pct);
      const passed = state === "entered" && !isMarkRowFail(r);
      const rollNo = r.student.enrollments?.[0]?.rollNumber ?? idx + 1;

      const dataRow = ws.addRow({
        rollNo: rollNo,
        student: r.student.name,
        subject: r.schedule.subject.name,
        exam: r.schedule.assessmentGroup.name,
        marks: state === "absent" ? "AB" : state === "pending" ? "—" : marks,
        total: total,
        percentage: state === "absent" ? "AB" : state === "pending" ? "—" : pct,
        grade: grade,
      });
      dataRow.height = 22;

      const rowBg = idx % 2 === 0 ? C.rowEven : C.rowOdd;

      dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        const isGradeCol = colNum === TOTAL_COLS;
        const isNumCol = colNum >= 5 && colNum <= 7;

        cell.font = { size: 10, name: "Calibri", color: { argb: "FF1A1A2E" } };
        cell.alignment = {
          horizontal:
            isNumCol || isGradeCol
              ? "center"
              : colNum === 1
                ? "center"
                : "left",
          vertical: "middle",
        };
        cell.border = thinBorder(C.borderCol);

        // Row background – subject-level: green at/above passing marks,
        // light red below, cream for absent, white for pending.
        if (!isGradeCol) {
          cell.fill = fillSolid(
            state === "absent"
              ? "FFFFF9F0"
              : state === "pending"
                ? C.rowOdd
                : passed
                  ? C.passCell
                  : C.failCell,
          );
        }

        // Grade cell – bold coloured badge
        if (isGradeCol) {
          const gradeColors = {
            "A+": { bg: C.gradA, fg: C.gradAFg },
            A: { bg: C.gradA, fg: C.gradAFg },
            B: { bg: C.gradB, fg: C.gradBFg },
            C: { bg: C.gradC, fg: C.gradCFg },
            D: { bg: C.gradD, fg: C.gradDFg },
            F: { bg: C.gradF, fg: C.gradFFg },
            AB: { bg: C.gradAB, fg: C.gradABFg },
          };
          const gc = gradeColors[grade] || { bg: "FFF0F0F0", fg: "FF000000" };
          cell.fill = fillSolid(gc.bg);
          cell.font = {
            bold: true,
            size: 11,
            name: "Calibri",
            color: { argb: gc.fg },
          };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }

        // Percentage column – add % symbol if numeric
        if (colNum === 7 && state === "entered") {
          cell.numFmt = "0.0";
        }
      });
    });

    // ── 9. Summary stats footer ────────────────────────────────────────────────
    // Subject-record statistics (per marks row). Overall results per
    // student are on the "Overall Results" sheet.
    const scored = results.filter((r) => markState(r) === "entered");
    const avgPct = scored.length
      ? (
          scored.reduce(
            (s, r) => s + (pctOf(r.marksObtained, r.schedule.maxMarks) ?? 0),
            0,
          ) / scored.length
        ).toFixed(1)
      : 0;
    const passed = scored.filter((r) => !isMarkRowFail(r)).length;
    const absent = results.filter((r) => r.isAbsent).length;

    // Blank spacer row
    ws.addRow([]).height = 8;

    // Stats header
    addBanner("SUMMARY", C.headerBg, C.headerFg, 11, 22);

    // Stats row
    const statsLabels = [
      ["Total Records", results.length],
      ["Present", scored.length],
      ["Absent", absent],
      ["At/Above Passing", passed],
      ["Below Passing", scored.length - passed],
      ["Avg Subject %", `${avgPct}%`],
      [
        "Subject Pass Rate",
        scored.length > 0
          ? `${((passed / scored.length) * 100).toFixed(1)}%`
          : "N/A",
      ],
    ];

    // Two stats rows side-by-side (label + value pairs)
    for (let i = 0; i < statsLabels.length; i += 4) {
      const chunk = statsLabels.slice(i, i + 4);
      const labels = [];
      const values = [];
      chunk.forEach(([l, v]) => {
        labels.push(l, "");
        values.push(v, "");
      });
      // Pad to 8 columns
      while (labels.length < 8) labels.push("");
      while (values.length < 8) values.push("");

      const lRow = ws.addRow(labels);
      lRow.height = 18;
      lRow.eachCell({ includeEmpty: true }, (cell, cn) => {
        if (labels[cn - 1] !== "") {
          cell.font = {
            bold: true,
            size: 9,
            color: { argb: C.metaFg },
            name: "Calibri",
          };
          cell.fill = fillSolid(C.metaBg);
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = thinBorder(C.borderCol);
        }
      });

      const vRow = ws.addRow(values);
      vRow.height = 22;
      vRow.eachCell({ includeEmpty: true }, (cell, cn) => {
        if (values[cn - 1] !== "") {
          cell.font = {
            bold: true,
            size: 12,
            color: { argb: C.headerBg },
            name: "Calibri",
          };
          cell.fill = fillSolid("FFFFFFFF");
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border = thinBorder(C.borderCol);
        }
      });
    }

    // ── 10. Footer row ─────────────────────────────────────────────────────────
    ws.addRow([]).height = 6;
    addBanner(
      `This report was generated automatically on ${exportDate}. For official use only.`,
      "FFECF0F1",
      C.metaFg,
      8,
      18,
    );

    // ── 10B. Overall Results sheet (whole exam, all subjects) ─────────────────
    // Same shared rules as the result list, report card and PDF:
    //   % = total obtained / total max of ALL scheduled subjects × 100,
    //   grade from % only, all-absent → AB / Absent / Not Ranked.
    if (!subjectId) {
      const classData = await loadClassExamData(prisma, {
        assessmentGroupIds: [assessmentGroupId],
        classSectionId,
        academicYearId: first.assessmentGroup.academicYearId,
      });
      const classResults = computeClassResults(classData);
      const enrollByStudent = new Map(
        classData.enrollments.map((e) => [e.studentId, e]),
      );

      const overallRows = [...classResults.entries()]
        .filter(([, r]) => r.status !== "pending")
        .map(([sid, r]) => ({ sid, r, enr: enrollByStudent.get(sid) }))
        .sort((a, b) => {
          const ra = a.r.rank ?? Number.MAX_SAFE_INTEGER;
          const rb = b.r.rank ?? Number.MAX_SAFE_INTEGER;
          if (ra !== rb) return ra - rb;
          return String(a.enr?.student?.name || "").localeCompare(
            String(b.enr?.student?.name || ""),
          );
        });

      const ows = wb.addWorksheet("Overall Results", {
        pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
        views: [{ state: "frozen", ySplit: 3 }],
      });
      ows.columns = [
        { key: "rank", width: 12 },
        { key: "rollNo", width: 10 },
        { key: "student", width: 28 },
        { key: "obtained", width: 16 },
        { key: "max", width: 16 },
        { key: "percentage", width: 14 },
        { key: "grade", width: 10 },
        { key: "status", width: 16 },
      ];

      const oTitle = ows.addRow([
        `OVERALL RESULTS — Class: ${className}   |   Exam: ${examName}`,
      ]);
      ows.mergeCells(`A${oTitle.number}:H${oTitle.number}`);
      oTitle.height = 28;
      oTitle.getCell(1).font = {
        bold: true,
        size: 13,
        color: { argb: C.headerFg },
        name: "Calibri",
      };
      oTitle.getCell(1).fill = fillSolid(C.headerBg);
      oTitle.getCell(1).alignment = {
        horizontal: "center",
        vertical: "middle",
      };
      ows.addRow([]).height = 6;

      const oHdr = ows.addRow([
        "Rank",
        "Roll No",
        "Student Name",
        "Total Obtained",
        "Total Max",
        "Percentage",
        "Grade",
        "Status",
      ]);
      oHdr.height = 24;
      oHdr.eachCell((cell) => {
        cell.font = {
          bold: true,
          size: 11,
          color: { argb: C.colHeaderFg },
          name: "Calibri",
        };
        cell.fill = fillSolid(C.colHeaderBg);
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };
        cell.border = thinBorder("FF1A252F");
      });

      const gradeColorsO = {
        "A+": C.gradA,
        A: C.gradA,
        B: C.gradB,
        C: C.gradC,
        D: C.gradD,
        F: C.gradF,
        AB: C.gradAB,
      };

      overallRows.forEach(({ r, enr }, idx) => {
        const row = ows.addRow({
          rank: r.rank ?? "Not Ranked",
          rollNo: enr?.rollNumber ?? "-",
          student: enr?.student?.name ?? "—",
          obtained: r.isAbsent ? "AB" : r.totalObtained,
          max: r.totalMax,
          percentage: r.isAbsent ? "—" : r.percentage,
          grade: r.grade,
          status: r.isAbsent
            ? "Absent"
            : r.isComplete
              ? "Result"
              : "Result (partial)",
        });
        row.height = 20;
        row.eachCell({ includeEmpty: true }, (cell, colNum) => {
          cell.font = {
            size: 10,
            name: "Calibri",
            color: { argb: "FF1A1A2E" },
          };
          cell.alignment = {
            horizontal: colNum === 3 ? "left" : "center",
            vertical: "middle",
          };
          cell.border = thinBorder(C.borderCol);
          cell.fill = fillSolid(idx % 2 === 0 ? C.rowEven : C.rowOdd);
          if (colNum === 6 && !r.isAbsent) cell.numFmt = "0.00";
          if (colNum === 7) {
            cell.fill = fillSolid(gradeColorsO[r.grade] || "FFF0F0F0");
            cell.font = {
              bold: true,
              size: 11,
              name: "Calibri",
              color: { argb: "FFFFFFFF" },
            };
          }
        });
      });
    }

    // ── 11. Send response ──────────────────────────────────────────────────────
    const safeName = `${className}_${examName}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeName}_Results.xlsx"`,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    await wb.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("[exportResultsExcel]", error);
    res.status(500).json({ message: "Export failed", error: error.message });
  }
};
// ═══════════════════════════════════════════════════════════════
//  GET /api/results/report/:studentId/:assessmentGroupId
//  Admin/Staff view of a single student's full report card
//  (same shape the student/parent "Marks & Report Card" page uses).
//  View, Print Preview, Download PDF and Bulk download all read this,
//  so they all show exactly the same totals, grade, status and rank.
// ═══════════════════════════════════════════════════════════════

const REPORT_SCHOOL_SELECT = {
  select: {
    id: true,
    name: true,
    address: true,
    city: true,
    state: true,
    phone: true,
    email: true,
    logoUrl: true,
    type: true,
    university: {
      select: {
        logoUrl: true, // ✅ the actual logo the SuperAdmin uploads (Settings → Profile → upload-logo)
      },
    },
  },
};

// The school's real logo is the one the SuperAdmin uploads, which is
// stored on university.logoUrl (see superAdminProfile.controller.js
// → updateSchoolLogo). school.logoUrl is checked as a fallback for
// schools that have their own logo set independently.
async function resolveLogoUrlAdmin(school) {
  const rawKey = school?.university?.logoUrl ?? school?.logoUrl ?? null;
  if (!rawKey) return null;
  if (rawKey.startsWith("http://") || rawKey.startsWith("https://"))
    return rawKey;
  try {
    return await generateSignedUrl(rawKey, 240);
  } catch (e) {
    console.error(
      "[resolveLogoUrlAdmin] signed URL generation failed:",
      e.message,
    );
    return null;
  }
}

const normSubjectName = (s) =>
  String(s || "")
    .trim()
    .toLowerCase();

export async function getStudentReportCard(req, res) {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return err(res, "Unauthorized", 401);

    const { studentId, assessmentGroupId } = req.params;
    if (!studentId || !assessmentGroupId) {
      return err(res, "studentId and assessmentGroupId are required", 400);
    }

    const [enrollment, assessmentGroup] = await Promise.all([
      prisma.studentEnrollment.findFirst({
        where: { studentId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        include: {
          academicYear: true,
          classSection: {
            include: {
              stream: true,
              course: true,
              school: REPORT_SCHOOL_SELECT,
            },
          },
        },
      }),
      prisma.assessmentGroup.findUnique({
        where: { id: assessmentGroupId },
        include: { term: true },
      }),
    ]);

    if (!enrollment)
      return err(res, "No active enrollment found for this student", 404);
    if (!assessmentGroup) return err(res, "Exam not found", 404);
    if (assessmentGroup.schoolId !== schoolId)
      return err(res, "Unauthorized", 403);

    const classSectionId = enrollment.classSectionId;
    const academicYearId = enrollment.academicYearId;

    const [
      personalInfo,
      student,
      mainData,
      resultSummary,
      schoolLogoUrl,
      fatherLink,
    ] = await Promise.all([
      prisma.studentPersonalInfo.findUnique({ where: { studentId } }),
      prisma.student.findUnique({
        where: { id: studentId },
        select: { name: true, email: true },
      }),
      // All configured subjects + every student's marks for this class/exam
      loadClassExamData(prisma, {
        assessmentGroupIds: [assessmentGroupId],
        classSectionId,
        academicYearId,
      }),
      prisma.resultSummary.findFirst({
        where: { studentId, assessmentGroupId, academicYearId },
      }),
      resolveLogoUrlAdmin(enrollment.classSection.school),
      // Father's name for the report card header. The linked Parent
      // account (relation = FATHER) is the primary source; the free-text
      // StudentPersonalInfo.parentName is used as a fallback below.
      prisma.studentParent.findFirst({
        where: { studentId, relation: "FATHER" },
        select: { parent: { select: { name: true, deletedAt: true } } },
      }),
    ]);

    const linkedFatherName =
      fatherLink?.parent && !fatherLink.parent.deletedAt
        ? fatherLink.parent.name?.trim() || null
        : null;
    const fatherName =
      linkedFatherName ?? (personalInfo?.parentName?.trim() || null);

    const myMainRows = new Map(
      mainData.marks
        .filter((m) => m.studentId === studentId)
        .map((m) => [m.scheduleId, m]),
    );
    if (myMainRows.size === 0)
      return err(res, "No marks found for this exam", 404);

    const mainSchedules = [...mainData.schedules].sort((a, b) =>
      String(a.subject?.name || "").localeCompare(
        String(b.subject?.name || ""),
      ),
    );

    // ── Subject rows: every configured subject (pending ones included, so the
    //    table always adds up to the Total Maximum shown in the summary).
    const subjectResults = mainSchedules.map((sc) =>
      buildSubjectResult(sc, myMainRows.get(sc.id) || null),
    );

    // ── Overall result + class rank (shared rules)
    const mainClassResults = computeClassResults(mainData);
    const myMain = mainClassResults.get(studentId);
    const isPublished =
      resultSummary?.isPublished ?? assessmentGroup.isPublished;

    const school = enrollment.classSection.school;

    // ── Optional: combine with a "Sub Exam" (an AssessmentGroup filed under
    // the default "Assessment" term) — e.g. Assessment (20) + Final Exam (80).
    // With no ?subAssessmentGroupId, everything below is skipped.
    const { subAssessmentGroupId } = req.query;
    let subExamGroup = null;
    let finalSubjectResults = subjectResults;
    let finalSummary = toReportSummary(myMain, {
      totalStudentsInClass: mainClassResults.size,
      isPublished,
    });

    if (subAssessmentGroupId) {
      subExamGroup = await prisma.assessmentGroup.findUnique({
        where: { id: subAssessmentGroupId },
      });
      if (subExamGroup && subExamGroup.schoolId === schoolId) {
        const subData = await loadClassExamData(prisma, {
          assessmentGroupIds: [subAssessmentGroupId],
          classSectionId,
          academicYearId,
        });
        const mySubRows = new Map(
          subData.marks
            .filter((m) => m.studentId === studentId)
            .map((m) => [m.scheduleId, m]),
        );

        // Pair sub-exam schedules with main subjects (by subject id, then name)
        const subBySubjectId = new Map(
          subData.schedules.map((s) => [s.subjectId, s]),
        );
        const subByName = new Map(
          subData.schedules.map((s) => [normSubjectName(s.subject?.name), s]),
        );
        const usedSub = new Set();

        const combineRow = (mainSc, subSc) => {
          const mainRow = mainSc ? myMainRows.get(mainSc.id) || null : null;
          const subRow = subSc ? mySubRows.get(subSc.id) || null : null;
          const mState = mainSc ? markState(mainRow) : null;
          const sState = subSc ? markState(subRow) : null;

          const mainObtained =
            mState === "entered" ? Number(mainRow.marksObtained) : null;
          const subObtained =
            sState === "entered" ? Number(subRow.marksObtained) : null;
          const mainMax = Number(mainSc?.maxMarks || 0);
          const subMax = Number(subSc?.maxMarks || 0);
          const anyEntered = mState === "entered" || sState === "entered";
          const allAbsent =
            (mState === null || mState === "absent") &&
            (sState === null || sState === "absent");

          const totalObtainedSubj = (mainObtained ?? 0) + (subObtained ?? 0);
          const totalMaxSubj = mainMax + subMax;
          const pct = anyEntered
            ? pctOf(totalObtainedSubj, totalMaxSubj)
            : null;
          const g = anyEntered
            ? gradeFromPercentage(pct)
            : allAbsent
              ? ABSENT_GRADE
              : PENDING_GRADE;
          const combinedFail =
            anyEntered && isCombinedSubjectFail(mainSc, mainRow, subSc, subRow);

          const base = mainSc
            ? buildSubjectResult(mainSc, mainRow)
            : {
                ...buildSubjectResult(subSc, subRow),
                marksObtained: null,
                maxMarks: 0,
              };

          return {
            ...base,
            isCombined: true,
            mainObtained,
            mainMax,
            subExamObtained: subObtained,
            subExamMax: subMax,
            subExamIsAbsent: sState === "absent",
            totalObtained: anyEntered
              ? totalObtainedSubj
              : allAbsent
                ? 0
                : null,
            totalMax: totalMaxSubj,
            percentage: pct,
            // Subject grade from the combined subject percentage only.
            grade: g.grade,
            gradeLabel: g.label,
            combinedFail, // informational — never changes the overall grade
            resultStatus: allAbsent
              ? "absent"
              : !anyEntered
                ? "pending"
                : combinedFail
                  ? "fail"
                  : "pass",
          };
        };

        finalSubjectResults = mainSchedules.map((mainSc) => {
          let subSc = subBySubjectId.get(mainSc.subjectId);
          if (!subSc)
            subSc = subByName.get(normSubjectName(mainSc.subject?.name));
          if (subSc) usedSub.add(subSc.id);
          return combineRow(mainSc, subSc || null);
        });
        // Sub-exam subjects that have no main-exam paper still count.
        for (const subSc of subData.schedules) {
          if (!usedSub.has(subSc.id))
            finalSubjectResults.push(combineRow(null, subSc));
        }

        // Combined overall = main + sub, over ALL configured schedules of both.
        const combinedResults = computeClassResults({
          schedules: [...mainData.schedules, ...subData.schedules],
          enrollments: mainData.enrollments,
          marks: [...mainData.marks, ...subData.marks],
        });
        const myCombined = combinedResults.get(studentId);

        finalSummary = toReportSummary(myCombined, {
          totalStudentsInClass: combinedResults.size,
          isPublished,
        });
      }
    }

    const data = {
      student: {
        id: studentId,
        name: student?.name,
        admissionNumber: enrollment.admissionNumber,
        rollNumber: enrollment.rollNumber,
        firstName: personalInfo?.firstName,
        lastName: personalInfo?.lastName,
        profileImage: personalInfo?.profileImage,
        fatherName,
        gender: personalInfo?.gender,
        dateOfBirth: personalInfo?.dateOfBirth,
      },
      enrollment: {
        className: enrollment.classSection.name,
        grade: enrollment.classSection.grade,
        section: enrollment.classSection.section,
        stream: enrollment.classSection.stream?.name ?? null,
        course: enrollment.classSection.course?.name ?? null,
        academicYear: enrollment.academicYear.name,
        schoolName: school?.name ?? null,
        schoolAddress: school?.address ?? null,
        schoolCity: school?.city ?? null,
        schoolState: school?.state ?? null,
        schoolPhone: school?.phone ?? null,
        schoolEmail: school?.email ?? null,
        schoolLogoUrl: schoolLogoUrl,
      },
      exam: {
        id: assessmentGroup.id,
        name: assessmentGroup.name,
        weightage: assessmentGroup.weightage,
        isLocked: assessmentGroup.isLocked,
        isPublished: assessmentGroup.isPublished,
        term: assessmentGroup.term
          ? { id: assessmentGroup.term.id, name: assessmentGroup.term.name }
          : null,
      },
      // Present only when a Sub Exam was combined into this report
      hasSubExam: !!subExamGroup,
      subExam: subExamGroup
        ? { id: subExamGroup.id, name: subExamGroup.name }
        : null,
      subjectResults: finalSubjectResults,
      summary: finalSummary,
    };

    return ok(res, { data });
  } catch (error) {
    console.error("[getStudentReportCard]", error);
    return err(res, "Server error", 500);
  }
}
