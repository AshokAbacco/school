// server/src/staffControlls/superAdminExams.controller.js
//
// READ-ONLY exams & results aggregation for SuperAdmin.
// Fetches data across ALL schools under the logged-in university.
//
// KEY DESIGN: We read from Marks + AssessmentSchedule directly,
// NOT from ResultSummary — because calculateResults() may not have
// been called yet. This mirrors what the admin /api/results/list
// endpoint does under the hood.
//
// Endpoints:
//   GET /api/superadmin-exams/academic-years
//   GET /api/superadmin-exams/class-sections
//   GET /api/superadmin-exams/groups?academicYearId=xxx
//   GET /api/superadmin-exams/results/detail
//   GET /api/superadmin-exams/results/export

import { prisma } from "../config/db.js";

function nullStats() {
  return {
    totalStudents: 0, totalBoys: 0, totalGirls: 0,
    totalPassed: 0, totalFailed: 0, totalAbsent: 0,
    passPercentage: 0, failPercentage: 0,
  };
}

// ─── shared helper ────────────────────────────────────────────────────────────
async function resolveSchoolIds(universityId) {
  const schools = await prisma.school.findMany({
    where: { universityId, deletedAt: null },
    select: { id: true },
  });
  return schools.map((s) => s.id);
}

function getGrade(pct) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
}

/**
 * Shared core: given scheduleIds + optional classSectionId filter,
 * fetch all Marks and aggregate per student.
 * Returns a flat array of normalised student rows.
 */
async function aggregateMarksToRows(scheduleIds, scheduleMap, classSectionId) {
  const allMarks = await prisma.marks.findMany({
    where: {
      scheduleId: { in: scheduleIds },
      deletedAt: null,
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          personalInfo: { select: { gender: true } },
          enrollments: {
            where: classSectionId
              ? { classSectionId, status: "ACTIVE" }
              : { status: "ACTIVE" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              admissionNumber: true,
              rollNumber: true,
              classSectionId: true,
              classSection: { select: { id: true, grade: true, section: true, name: true } },
            },
          },
        },
      },
    },
  });

  // Aggregate per student
  const studentMap = new Map();
  for (const mark of allMarks) {
    const sc = scheduleMap.get(mark.scheduleId);
    if (!sc) continue;
    const sid = mark.studentId;
    if (!studentMap.has(sid)) {
      studentMap.set(sid, {
        student: mark.student,
        totalObtained: 0,
        totalMax: 0,
        allAbsent: true,
      });
    }
    const entry = studentMap.get(sid);
    entry.totalMax += Number(sc.maxMarks ?? 0);
    if (!mark.isAbsent) {
      entry.allAbsent = false;
      entry.totalObtained += Number(mark.marksObtained ?? 0);
    }
  }

  // Build rows
  const rows = [];
  for (const [, entry] of studentMap) {
    const { student, totalObtained, totalMax, allAbsent } = entry;
    const enroll = student.enrollments?.[0];
    const pct = totalMax > 0 && !allAbsent ? (totalObtained / totalMax) * 100 : 0;
    const genderVal = student.personalInfo?.gender || null;
    const isPassed = !allAbsent && pct >= 50;

    rows.push({
      studentId: student.id,
      studentName: student.name,
      gender: genderVal,
      admissionNumber: enroll?.admissionNumber || "—",
      rollNumber: enroll?.rollNumber || "—",
      classSection: enroll?.classSection || null,
      classSectionId: enroll?.classSectionId || null,
      totalMarks: Math.round(totalObtained * 10) / 10,
      maxMarks: totalMax,
      percentage: Math.round(pct * 10) / 10,
      grade: allAbsent ? "AB" : getGrade(pct),
      isPassed,
      isAbsent: allAbsent,
      status: allAbsent ? "absent" : isPassed ? "pass" : "fail",
    });
  }

  // Sort by percentage desc
  rows.sort((a, b) => b.percentage - a.percentage);
  return rows;
}

async function getFilteredSchedules(assessmentGroupId, schoolIds, classSectionId) {
  const scheduleWhere = { assessmentGroupId, deletedAt: null };
  if (classSectionId) scheduleWhere.classSectionId = classSectionId;

  const schedules = await prisma.assessmentSchedule.findMany({
    where: scheduleWhere,
    select: {
      id: true,
      classSectionId: true,
      maxMarks: true,
      classSection: { select: { id: true, grade: true, section: true, name: true, schoolId: true } },
    },
  });

  // Only keep schedules belonging to this university's schools
  const validSet = new Set(schoolIds);
  return schedules.filter((sc) => sc.classSection && validSet.has(sc.classSection.schoolId));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. ACADEMIC YEARS
// ─────────────────────────────────────────────────────────────────────────────
export const getSuperAdminAcademicYears = async (req, res) => {
  try {
    const universityId = req.user?.universityId;
    if (!universityId)
      return res.status(400).json({ success: false, message: "universityId missing in token" });

    const schoolIds = await resolveSchoolIds(universityId);
    if (!schoolIds.length) return res.json({ success: true, data: [] });

    const years = await prisma.academicYear.findMany({
      where: { schoolId: { in: schoolIds }, deletedAt: null },
      include: { school: { select: { id: true, name: true, code: true } } },
      orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
    });

    // Deduplicate by name — prefer the active one
    const seen = new Map();
    years.forEach((y) => { if (!seen.has(y.name) || y.isActive) seen.set(y.name, y); });

    return res.json({ success: true, data: [...seen.values()] });
  } catch (err) {
    console.error("[superAdminExams] getSuperAdminAcademicYears:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch academic years" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. CLASS SECTIONS
// ─────────────────────────────────────────────────────────────────────────────
export const getSuperAdminClassSections = async (req, res) => {
  try {
    const universityId = req.user?.universityId;
    if (!universityId)
      return res.status(400).json({ success: false, message: "universityId missing in token" });

    const schoolIds = await resolveSchoolIds(universityId);
    if (!schoolIds.length) return res.json({ success: true, data: [] });

    const sections = await prisma.classSection.findMany({
      where: { schoolId: { in: schoolIds }, deletedAt: null },
      include: { school: { select: { id: true, name: true, code: true } } },
      orderBy: [{ grade: "asc" }, { section: "asc" }],
    });

    return res.json({ success: true, data: sections });
  } catch (err) {
    console.error("[superAdminExams] getSuperAdminClassSections:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch class sections" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. ASSESSMENT GROUPS
//    GET /api/superadmin-exams/groups?academicYearId=xxx
// ─────────────────────────────────────────────────────────────────────────────
export const getSuperAdminGroups = async (req, res) => {
  try {
    const universityId = req.user?.universityId;
    if (!universityId)
      return res.status(400).json({ success: false, message: "universityId missing in token" });

    const schoolIds = await resolveSchoolIds(universityId);
    if (!schoolIds.length) return res.json({ success: true, data: [] });

    const { academicYearId } = req.query;
    const whereClause = { schoolId: { in: schoolIds }, deletedAt: null };
    if (academicYearId) whereClause.academicYearId = academicYearId;

    const groups = await prisma.assessmentGroup.findMany({
      where: whereClause,
      include: {
        term: true,
        academicYear: { select: { id: true, name: true } },
        school: { select: { id: true, name: true, code: true } },
        schedules: {
          where: { deletedAt: null },
          select: { id: true, classSectionId: true, subjectId: true, examDate: true, maxMarks: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ success: true, data: groups });
  } catch (err) {
    console.error("[superAdminExams] getSuperAdminGroups:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch exam groups" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. RESULTS — DETAIL  (reads from Marks, NOT ResultSummary)
//    GET /api/superadmin-exams/results/detail
//    Query: assessmentGroupId*, classSectionId, gender, status, search, page, pageSize
// ─────────────────────────────────────────────────────────────────────────────
export const getSuperAdminResultsDetail = async (req, res) => {
  try {
    const universityId = req.user?.universityId;
    if (!universityId)
      return res.status(400).json({ success: false, message: "universityId missing in token" });

    const schoolIds = await resolveSchoolIds(universityId);
    if (!schoolIds.length)
      return res.json({ success: true, data: [], total: 0, stats: nullStats() });

    const { assessmentGroupId, classSectionId, gender, status, search, page = 1, pageSize = 20 } = req.query;

    if (!assessmentGroupId)
      return res.status(400).json({ success: false, message: "assessmentGroupId is required" });

    // Get schedules filtered to this university
    const filteredSchedules = await getFilteredSchedules(assessmentGroupId, schoolIds, classSectionId);
    if (!filteredSchedules.length) {
      return res.json({ success: true, data: [], total: 0, page: 1, pageSize: Number(pageSize), totalPages: 0, stats: nullStats() });
    }

    const scheduleIds = filteredSchedules.map((sc) => sc.id);
    const scheduleMap = new Map(filteredSchedules.map((sc) => [sc.id, sc]));

    // Aggregate marks → student rows
    let rows = await aggregateMarksToRows(scheduleIds, scheduleMap, classSectionId);

    // Apply filters
    if (gender && gender !== "ALL") rows = rows.filter((r) => r.gender === gender);
    if (status && status !== "all") rows = rows.filter((r) => r.status === status);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.admissionNumber.toLowerCase().includes(q) ||
        r.rollNumber.toLowerCase().includes(q)
      );
    }

    // Stats
    const totalStudents = rows.length;
    const totalBoys = rows.filter((r) => r.gender === "MALE").length;
    const totalGirls = rows.filter((r) => r.gender === "FEMALE").length;
    const totalPassed = rows.filter((r) => r.isPassed).length;
    const totalFailed = rows.filter((r) => !r.isPassed && !r.isAbsent).length;
    const totalAbsent = rows.filter((r) => r.isAbsent).length;
    const nonAbsent = totalStudents - totalAbsent;
    const passPercentage = nonAbsent > 0 ? +((totalPassed / nonAbsent) * 100).toFixed(1) : 0;
    const failPercentage = nonAbsent > 0 ? +((totalFailed / nonAbsent) * 100).toFixed(1) : 0;

    // Paginate
    const total = rows.length;
    const skip = (Number(page) - 1) * Number(pageSize);
    const paginatedRows = rows.slice(skip, skip + Number(pageSize));

    return res.json({
      success: true,
      data: paginatedRows,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / Number(pageSize)),
      stats: { totalStudents, totalBoys, totalGirls, totalPassed, totalFailed, totalAbsent, passPercentage, failPercentage },
    });
  } catch (err) {
    console.error("[superAdminExams] getSuperAdminResultsDetail:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch results" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. RESULTS — EXPORT  (same logic, no pagination)
// ─────────────────────────────────────────────────────────────────────────────
export const getSuperAdminResultsExport = async (req, res) => {
  try {
    const universityId = req.user?.universityId;
    if (!universityId)
      return res.status(400).json({ success: false, message: "universityId missing in token" });

    const schoolIds = await resolveSchoolIds(universityId);
    if (!schoolIds.length) return res.json({ success: true, data: [] });

    const {
    assessmentGroupId,
    classSectionId,
    gender,
    status,
    search,
  } = req.query;
    if (!assessmentGroupId)
      return res.status(400).json({ success: false, message: "assessmentGroupId is required" });

    const filteredSchedules = await getFilteredSchedules(assessmentGroupId, schoolIds, classSectionId);
    if (!filteredSchedules.length) return res.json({ success: true, data: [] });

    const scheduleIds = filteredSchedules.map((sc) => sc.id);
    const scheduleMap = new Map(filteredSchedules.map((sc) => [sc.id, sc]));

    let rows = await aggregateMarksToRows(scheduleIds, scheduleMap, classSectionId);

    // Map to export shape
    let exportRows = rows.map((r) => ({
      studentName: r.studentName,
      gender: r.gender || "—",
      admissionNumber: r.admissionNumber,
      rollNumber: r.rollNumber,
      className: r.classSection?.name || "—",
      grade: r.classSection?.grade || "—",
      section: r.classSection?.section || "—",
      totalMarks: r.totalMarks,
      maxMarks: r.maxMarks,
      percentage: r.percentage,
      resultGrade: r.grade,
      status: r.isAbsent ? "Absent" : r.isPassed ? "Pass" : "Fail",
    }));

    if (gender && gender !== "ALL") exportRows = exportRows.filter((r) => r.gender === gender);
    if (status && status !== "all") {
      exportRows = exportRows.filter(
        (r) => r.status.toLowerCase() === status.toLowerCase()
      );
    }

if (search) {
  const q = search.toLowerCase();

  exportRows = exportRows.filter(
    (r) =>
      (r.studentName || "").toLowerCase().includes(q) ||
      (r.admissionNumber || "").toLowerCase().includes(q) ||
      (r.rollNumber || "").toLowerCase().includes(q)
  );
}

    return res.json({ success: true, data: exportRows });
  } catch (err) {
    console.error("[superAdminExams] getSuperAdminResultsExport:", err);
    return res.status(500).json({ success: false, message: "Failed to export results" });
  }
};