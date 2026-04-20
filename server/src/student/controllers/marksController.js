import { prisma } from "../../config/db.js";
import cacheService from "../../utils/cacheService.js";

const GRADE_SCALE = [
  { min: 90, max: 100, grade: "A+", label: "Outstanding"   },
  { min: 80, max: 89,  grade: "A",  label: "Excellent"     },
  { min: 70, max: 79,  grade: "B",  label: "Very Good"     },
  { min: 60, max: 69,  grade: "C",  label: "Good"          },
  { min: 50, max: 59,  grade: "D",  label: "Average"       },
  { min:  0, max: 49,  grade: "F",  label: "Below Average" },
];

function calcGrade(percentage) {
  return GRADE_SCALE.find((g) => percentage >= g.min && percentage <= g.max)
    ?? { grade: "F", label: "Below Average" };
}

function computeTotals(marksRows) {
  let totalObtained = 0, totalMax = 0, hasFail = false;
  for (const m of marksRows) {
    if (!m.isAbsent && m.marksObtained !== null) {
      totalObtained += m.marksObtained;
      if (m.schedule.passingMarks !== null && m.marksObtained < m.schedule.passingMarks) {
        hasFail = true;
      }
    }
    totalMax += m.schedule.maxMarks;
  }
  const percentage = totalMax > 0 ? parseFloat(((totalObtained / totalMax) * 100).toFixed(2)) : 0;
  const gradeInfo  = hasFail ? { grade: "F", label: "Fail" } : calcGrade(percentage);
  return { totalObtained, totalMax, percentage, gradeInfo, hasFail };
}

// ═══════════════════════════════════════════════════════════════
//  GET /marks/exam-groups
// ═══════════════════════════════════════════════════════════════
export const getExamGroups = async (req, res) => {
  try {
    const studentId = (req.user ?? req.student)?.id;
    const schoolId  = req.user?.schoolId;
    if (!studentId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const enrollment = await prisma.studentEnrollment.findFirst({
      where:   { studentId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: { academicYear: true, classSection: true },
    });
    if (!enrollment) return res.status(404).json({ success: false, message: "No active enrollment found" });

    const cacheKey = await cacheService.buildKey(
      schoolId,
      `student:exam-groups:${studentId}:${enrollment.academicYearId}`
    );
    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached) });

    const groups = await prisma.assessmentGroup.findMany({
      where: {
        schoolId: enrollment.classSection.schoolId,
        academicYearId: enrollment.academicYearId,
        schedules: { some: { classSectionId: enrollment.classSectionId } },
      },
      orderBy: { createdAt: "asc" },
      include: { term: { select: { id: true, name: true, order: true } } },
    });

    const data = {
      enrollment: {
        academicYearId:   enrollment.academicYearId,
        academicYearName: enrollment.academicYear.name,
        classSectionId:   enrollment.classSectionId,
        className:        enrollment.classSection.name,
        admissionNumber:  enrollment.admissionNumber,
      },
      examGroups: groups.map((g) => ({
        id:          g.id,
        name:        g.name,
        weightage:   g.weightage,
        isPublished: g.isPublished,
        isLocked:    g.isLocked,
        term:        g.term ? { id: g.term.id, name: g.term.name, order: g.term.order } : null,
      })),
    };

    await cacheService.set(cacheKey, data);
    return res.json({ success: true, data });
  } catch (err) {
    console.error("[getExamGroups]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ═══════════════════════════════════════════════════════════════
//  GET /marks/report/:assessmentGroupId
// ═══════════════════════════════════════════════════════════════
export const getReportCard = async (req, res) => {
  try {
    const studentId = (req.user ?? req.student)?.id;
    const schoolId  = req.user?.schoolId;
    if (!studentId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { assessmentGroupId } = req.params;

    const cacheKey = await cacheService.buildKey(
      schoolId,
      `student:report:${studentId}:${assessmentGroupId}`
    );
    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached) });

    const [enrollment, assessmentGroup] = await Promise.all([
      prisma.studentEnrollment.findFirst({
        where:   { studentId, status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        include: {
          academicYear: true,
          classSection: { include: { stream: true, course: true } },
        },
      }),
      prisma.assessmentGroup.findUnique({
        where:   { id: assessmentGroupId },
        include: { term: true },
      }),
    ]);

    if (!enrollment) return res.status(404).json({ success: false, message: "No active enrollment found" });
    if (!assessmentGroup) return res.status(404).json({ success: false, message: "Exam not found" });
    if (!assessmentGroup.isPublished) return res.status(403).json({ success: false, message: "Results have not been published yet" });

    const [personalInfo, student, marks] = await Promise.all([
      prisma.studentPersonalInfo.findUnique({ where: { studentId } }),
      prisma.student.findUnique({ where: { id: studentId }, select: { name: true, email: true } }),
      prisma.marks.findMany({
        where: {
          studentId,
          schedule: { assessmentGroupId, classSectionId: enrollment.classSectionId },
        },
        include: {
          schedule: {
            include: { subject: { select: { id: true, name: true, code: true } } },
          },
        },
        orderBy: { schedule: { subject: { name: "asc" } } },
      }),
    ]);

    if (marks.length === 0) return res.status(404).json({ success: false, message: "No marks found for this exam" });

    const subjectResults = marks.map((m) => {
      const obtained = m.isAbsent ? null : (m.marksObtained ?? null);
      const maxMarks = m.schedule.maxMarks;
      const passing  = m.schedule.passingMarks ?? null;
      const pct      = obtained !== null && maxMarks > 0
        ? parseFloat(((obtained / maxMarks) * 100).toFixed(2)) : null;

      let resultStatus = "absent";
      if (!m.isAbsent && obtained !== null) {
        resultStatus = passing !== null ? (obtained >= passing ? "pass" : "fail") : "pass";
      }

      return {
        subjectId:     m.schedule.subject.id,
        subjectName:   m.schedule.subject.name,
        subjectCode:   m.schedule.subject.code,
        marksObtained: obtained,
        maxMarks,
        passingMarks:  passing,
        percentage:    pct,
        grade:         pct !== null ? calcGrade(pct).grade : "—",
        gradeLabel:    pct !== null ? calcGrade(pct).label : "—",
        resultStatus,
        isAbsent:      m.isAbsent,
        remarks:       m.remarks ?? null,
        examDate:      m.schedule.examDate,
      };
    });

    const { totalObtained, totalMax, percentage, gradeInfo, hasFail } = computeTotals(marks);

    const [allClassMarks, resultSummary] = await Promise.all([
      prisma.marks.findMany({
        where: { schedule: { assessmentGroupId, classSectionId: enrollment.classSectionId } },
        include: { schedule: { select: { maxMarks: true, passingMarks: true } } },
      }),
      prisma.resultSummary.findFirst({
        where: { studentId, assessmentGroupId, academicYearId: enrollment.academicYearId },
      }),
    ]);

    const studentTotalsMap = {};
    for (const m of allClassMarks) {
      if (!studentTotalsMap[m.studentId]) studentTotalsMap[m.studentId] = { rows: [] };
      studentTotalsMap[m.studentId].rows.push(m);
    }

    const studentSummaries = Object.entries(studentTotalsMap)
      .map(([sid, { rows }]) => {
        const t = computeTotals(rows);
        return { studentId: sid, total: t.totalObtained, pct: t.percentage };
      })
      .sort((a, b) => b.total !== a.total ? b.total - a.total : b.pct - a.pct);

    let rank = 1;
    for (let i = 0; i < studentSummaries.length; i++) {
      if (i > 0) {
        const prev = studentSummaries[i - 1], curr = studentSummaries[i];
        if (curr.total !== prev.total || curr.pct !== prev.pct) rank = i + 1;
      }
      if (studentSummaries[i].studentId === studentId) break;
    }

    const data = {
      student: {
        id:              studentId,
        name:            student.name,
        admissionNumber: enrollment.admissionNumber,
        rollNumber:      enrollment.rollNumber,
        firstName:       personalInfo?.firstName,
        lastName:        personalInfo?.lastName,
        profileImage:    personalInfo?.profileImage,
        gender:          personalInfo?.gender,
        dateOfBirth:     personalInfo?.dateOfBirth,
      },
      enrollment: {
        className:   enrollment.classSection.name,
        grade:       enrollment.classSection.grade,
        section:     enrollment.classSection.section,
        stream:      enrollment.classSection.stream?.name ?? null,
        course:      enrollment.classSection.course?.name ?? null,
        academicYear: enrollment.academicYear.name,
      },
      exam: {
        id:          assessmentGroup.id,
        name:        assessmentGroup.name,
        weightage:   assessmentGroup.weightage,
        isLocked:    assessmentGroup.isLocked,
        term:        assessmentGroup.term
          ? { id: assessmentGroup.term.id, name: assessmentGroup.term.name } : null,
      },
      subjectResults,
      summary: {
        totalObtained,
        totalMax,
        percentage,
        grade:               hasFail ? "F" : gradeInfo.grade,
        gradeLabel:          hasFail ? "Fail" : gradeInfo.label,
        hasFail,
        rank,
        totalStudentsInClass: studentSummaries.length,
        isPublished:         resultSummary?.isPublished ?? assessmentGroup.isPublished,
      },
    };

    await cacheService.set(cacheKey, data);
    return res.json({ success: true, data });
  } catch (err) {
    console.error("[getReportCard]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ═══════════════════════════════════════════════════════════════
//  GET /marks/term-summary/:termId
// ═══════════════════════════════════════════════════════════════
export const getTermSummary = async (req, res) => {
  try {
    const studentId = (req.user ?? req.student)?.id;
    const schoolId  = req.user?.schoolId;
    if (!studentId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { termId } = req.params;

    const enrollment = await prisma.studentEnrollment.findFirst({
      where:   { studentId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      include: { academicYear: true, classSection: true },
    });
    if (!enrollment) return res.status(404).json({ success: false, message: "No active enrollment found" });

    const cacheKey = await cacheService.buildKey(
      schoolId,
      `student:term-summary:${studentId}:${termId}`
    );
    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json({ success: true, data: JSON.parse(cached) });

    const term = await prisma.assessmentTerm.findUnique({
      where:   { id: termId },
      include: {
        assessmentGroups: {
          where:   { isPublished: true },
          include: { schedules: { where: { classSectionId: enrollment.classSectionId } } },
        },
      },
    });
    if (!term) return res.status(404).json({ success: false, message: "Term not found" });

    const groupSummaries = [];
    for (const group of term.assessmentGroups) {
      const marks = await prisma.marks.findMany({
        where: {
          studentId,
          schedule: { assessmentGroupId: group.id, classSectionId: enrollment.classSectionId },
        },
        include: { schedule: { select: { maxMarks: true, passingMarks: true } } },
      });
      if (marks.length === 0) continue;

      const { totalObtained, totalMax, percentage, gradeInfo, hasFail } = computeTotals(marks);
      groupSummaries.push({
        examId:        group.id,
        examName:      group.name,
        weightage:     group.weightage,
        totalObtained,
        totalMax,
        percentage,
        grade:         hasFail ? "F" : gradeInfo.grade,
        hasFail,
      });
    }

    const totalWeight = groupSummaries.reduce((s, g) => s + (g.weightage ?? 1), 0);
    const overallPct  = totalWeight > 0
      ? parseFloat(groupSummaries.reduce((s, g) => s + (g.percentage * (g.weightage ?? 1)) / totalWeight, 0).toFixed(2))
      : 0;
    const overallGrade  = calcGrade(overallPct);
    const termHasFail   = groupSummaries.some((g) => g.hasFail);

    const data = {
      term:       { id: term.id, name: term.name },
      enrollment: {
        className:       enrollment.classSection.name,
        academicYear:    enrollment.academicYear.name,
        admissionNumber: enrollment.admissionNumber,
      },
      examGroups: groupSummaries,
      overall: {
        percentage:  overallPct,
        grade:       termHasFail ? "F" : overallGrade.grade,
        gradeLabel:  termHasFail ? "Fail" : overallGrade.label,
        hasFail:     termHasFail,
      },
    };

    await cacheService.set(cacheKey, data);
    return res.json({ success: true, data });
  } catch (err) {
    console.error("[getTermSummary]", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};