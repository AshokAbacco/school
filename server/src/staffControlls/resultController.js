import { prisma } from "../config/db.js";
// import XLSX from "xlsx";
import ExcelJS from "exceljs";

const ok  = (res, data)         => res.json({ success: true, ...data });
const err = (res, msg, s = 400) => res.status(s).json({ success: false, message: msg });

function getGrade(pct) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
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
    const userId   = req.user?.id;
    const schoolId = req.user?.schoolId;
    const role     = req.user?.role;
    if (!userId || !schoolId) return err(res, "Unauthorized", 401);

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    if (role === "ADMIN") {
      const [exams, schedules] = await Promise.all([
        prisma.assessmentGroup.findMany({
          where: { schoolId, academicYearId: activeYear.id },
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, term: { select: { id: true, name: true } } },
        }),
        prisma.assessmentSchedule.findMany({
          where: { assessmentGroup: { academicYearId: activeYear.id, schoolId } },
          select: {
            classSection: { select: { id: true, name: true } },
            subject:      { select: { id: true, name: true } },
          },
        }),
      ]);

      const classMap   = new Map();
      const subjectMap = new Map();
      for (const s of schedules) {
        classMap.set(s.classSection.id, s.classSection.name);
        subjectMap.set(s.subject.id, s.subject.name);
      }

      return ok(res, {
        exams,
        classes:  [...classMap.entries()].map(([id, name]) => ({ id, name })),
        subjects: [...subjectMap.entries()].map(([id, name]) => ({ id, name })),
      });
    }

    const teacher = await prisma.teacherProfile.findUnique({ where: { userId } });
    if (!teacher) return err(res, "Teacher profile not found", 404);

    const [timetableEntries, extraClasses] = await Promise.all([
      prisma.timetableEntry.findMany({
        where: { teacherId: teacher.id, academicYearId: activeYear.id },
        select: { classSectionId: true, subjectId: true },
      }),
      prisma.extraClass.findMany({
        where: { teacherId: teacher.id, academicYearId: activeYear.id, schoolId, isActive: true },
        select: { classSectionId: true },
      }),
    ]);

    const teacherClassIds   = [...new Set([...timetableEntries, ...extraClasses].map((e) => e.classSectionId).filter(Boolean))];
    const teacherSubjectIds = [...new Set(timetableEntries.map((e) => e.subjectId).filter(Boolean))];

    const [exams, schedules] = await Promise.all([
      prisma.assessmentGroup.findMany({
        where: { schoolId, academicYearId: activeYear.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, term: { select: { id: true, name: true } } },
      }),
      prisma.assessmentSchedule.findMany({
        where: {
          classSectionId: { in: teacherClassIds },
          subjectId:      { in: teacherSubjectIds },
          assessmentGroup: { academicYearId: activeYear.id, schoolId },
        },
        select: {
          classSection: { select: { id: true, name: true } },
          subject:      { select: { id: true, name: true } },
        },
      }),
    ]);

    const classMap   = new Map();
    const subjectMap = new Map();
    for (const s of schedules) {
      classMap.set(s.classSection.id, s.classSection.name);
      subjectMap.set(s.subject.id, s.subject.name);
    }

    return ok(res, {
      exams,
      classes:  [...classMap.entries()].map(([id, name]) => ({ id, name })),
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
    const userId   = req.user?.id;
    const schoolId = req.user?.schoolId;
    if (!userId || !schoolId) return err(res, "Unauthorized", 401);

    const teacher = await prisma.teacherProfile.findUnique({ where: { userId } });
    if (!teacher) return err(res, "Teacher profile not found", 404);

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    const [entries, extras] = await Promise.all([
      prisma.timetableEntry.findMany({
        where: { teacherId: teacher.id, academicYearId: activeYear.id },
        select: { classSectionId: true, classSection: { select: { id: true, name: true, grade: true, section: true } } },
        distinct: ["classSectionId"],
      }),
      prisma.extraClass.findMany({
        where: { teacherId: teacher.id, academicYearId: activeYear.id, schoolId, isActive: true },
        select: { classSectionId: true, classSection: { select: { id: true, name: true, grade: true, section: true } } },
        distinct: ["classSectionId"],
      }),
    ]);

    const seen = new Set();
    const classes = [...entries, ...extras]
      .map((e) => e.classSection)
      .filter((cs) => { if (seen.has(cs.id)) return false; seen.add(cs.id); return true; })
      .sort((a, b) =>
        String(a.grade).localeCompare(String(b.grade), undefined, { numeric: true }) ||
        String(a.section).localeCompare(String(b.section)),
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
    const userId   = req.user?.id;
    const schoolId = req.user?.schoolId;
    if (!userId || !schoolId) return err(res, "Unauthorized", 401);

    const { classSectionId } = req.params;
    const { assessmentGroupId } = req.query;

    const teacher = await prisma.teacherProfile.findUnique({ where: { userId } });
    if (!teacher) return err(res, "Teacher profile not found", 404);

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    const timetableEntries = await prisma.timetableEntry.findMany({
      where: { teacherId: teacher.id, academicYearId: activeYear.id, classSectionId },
      select: { subjectId: true },
      distinct: ["subjectId"],
    });
    const teacherSubjectIds = timetableEntries.map((e) => e.subjectId).filter(Boolean);

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
        id: true, maxMarks: true, passingMarks: true, examDate: true,
        subject:         { select: { id: true, name: true, code: true } },
        assessmentGroup: { select: { id: true, name: true } },
      },
    });

    const subjectMap = new Map();
    for (const s of schedules) {
      if (!subjectMap.has(s.subject.id)) subjectMap.set(s.subject.id, s.subject);
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
      where: { schoolId, academicYearId: activeYear.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, weightage: true, isPublished: true, isLocked: true, termId: true,
        term: { select: { id: true, name: true } },
      },
    });

    return ok(res, { data: exams, academicYear: activeYear });
  } catch (e) {
    console.error("[getResultExamGroups]", e);
    return err(res, e.message, 500);
  }
}

// ─── GET /api/results/exams/:assessmentGroupId/schedules ──────────────────
export async function getSchedulesByAssessmentGroup(req, res) {
  try {
    const userId   = req.user?.id;
    const schoolId = req.user?.schoolId;
    const role     = req.user?.role;
    if (!userId || !schoolId) return err(res, "Unauthorized", 401);

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    if (role === "ADMIN") {
      const schedules = await prisma.assessmentSchedule.findMany({
        where: {
          assessmentGroupId: req.params.assessmentGroupId,
          classSection: { schoolId },
        },
        orderBy: [
          { classSection: { grade: "asc" } },
          { classSection: { section: "asc" } },
          { subject: { name: "asc" } },
        ],
        select: {
          id: true, classSectionId: true, subjectId: true,
          maxMarks: true, passingMarks: true, examDate: true,
          assessmentGroup: { select: { id: true, name: true, termId: true } },
          classSection:    { select: { id: true, name: true, grade: true, section: true } },
          subject:         { select: { id: true, name: true, code: true } },
        },
      });
      return ok(res, { data: schedules });
    }

    const teacher = await prisma.teacherProfile.findUnique({ where: { userId } });
    if (!teacher) return err(res, "Teacher profile not found", 404);

    const timetableEntries = await prisma.timetableEntry.findMany({
      where: { teacherId: teacher.id, academicYearId: activeYear.id },
      select: { classSectionId: true, subjectId: true },
    });
    const teacherClassIds   = [...new Set(timetableEntries.map((e) => e.classSectionId).filter(Boolean))];
    const teacherSubjectIds = [...new Set(timetableEntries.map((e) => e.subjectId).filter(Boolean))];

    const schedules = await prisma.assessmentSchedule.findMany({
      where: {
        assessmentGroupId: req.params.assessmentGroupId,
        classSectionId:    { in: teacherClassIds },
        subjectId:         { in: teacherSubjectIds },
        classSection:      { schoolId },
      },
      orderBy: [
        { classSection: { grade: "asc" } },
        { classSection: { section: "asc" } },
        { subject: { name: "asc" } },
      ],
      select: {
        id: true, classSectionId: true, subjectId: true,
        maxMarks: true, passingMarks: true, examDate: true,
        assessmentGroup: { select: { id: true, name: true, termId: true } },
        classSection:    { select: { id: true, name: true, grade: true, section: true } },
        subject:         { select: { id: true, name: true, code: true } },
      },
    });

    return ok(res, { data: schedules });
  } catch (e) {
    console.error("[getSchedulesByAssessmentGroup]", e);
    return err(res, e.message, 500);
  }
}

// ─── GET /api/results/schedule/:scheduleId/students ───────────────────────
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
          id: true, classSectionId: true, maxMarks: true, passingMarks: true,
          examDate: true, assessmentGroupId: true,
          assessmentGroup: {
            select: { id: true, name: true, termId: true, term: { select: { id: true, name: true } } },
          },
          classSection: { select: { id: true, name: true } },
          subject:      { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.marks.findMany({
        where: { scheduleId: req.params.scheduleId },
        select: { id: true, studentId: true, marksObtained: true, isAbsent: true, remarks: true },
      }),
    ]);

    if (!schedule) return err(res, "Schedule not found", 404);

    const enrollments = await prisma.studentEnrollment.findMany({
      where: { classSectionId: schedule.classSectionId, academicYearId: activeYear.id, status: "ACTIVE" },
      orderBy: [{ rollNumber: "asc" }, { student: { name: "asc" } }],
      select: {
        rollNumber: true, admissionNumber: true,
        student: { select: { id: true, name: true, email: true } },
      },
    });

    const marksMap = new Map(existingMarks.map((m) => [m.studentId, m]));

    const students = enrollments.map(({ student, rollNumber, admissionNumber }) => {
      const m = marksMap.get(student.id);
      return {
        studentId:       student.id,
        studentName:     student.name,
        email:           student.email,
        rollNumber:      rollNumber || "",
        admissionNumber: admissionNumber || "",
        marksId:         m?.id || null,
        marksObtained:   m?.marksObtained ?? "",
        isAbsent:        m?.isAbsent || false,
        remarks:         m?.remarks || "",
      };
    });

    return ok(res, {
      data: {
        schedule: {
          id:               schedule.id,
          examId:           schedule.assessmentGroup.id,
          examName:         schedule.assessmentGroup.name,
          termId:           schedule.assessmentGroup.term?.id || null,
          termName:         schedule.assessmentGroup.term?.name || null,
          classSectionId:   schedule.classSection.id,
          classSectionName: schedule.classSection.name,
          subjectName:      schedule.subject.name,
          subjectCode:      schedule.subject.code,
          maxMarks:         schedule.maxMarks,
          passingMarks:     schedule.passingMarks,
          examDate:         schedule.examDate,
        },
        students,
      },
    });
  } catch (e) {
    console.error("[getStudentsForSchedule]", e);
    return err(res, e.message, 500);
  }
}

// ─── POST /api/results/schedule/:scheduleId/marks ─────────────────────────
export async function saveMarksForSchedule(req, res) {
  try {
    const schoolId = req.user?.schoolId;
    const { scheduleId } = req.params;
    const { students } = req.body;

    if (!schoolId)                                    return err(res, "Unauthorized", 401);
    if (!scheduleId)                                  return err(res, "Schedule id required", 400);
    if (!Array.isArray(students) || !students.length) return err(res, "Students array required", 400);

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    const schedule = await prisma.assessmentSchedule.findFirst({
      where: { id: scheduleId, classSection: { schoolId } },
      select: {
        id: true, classSectionId: true, maxMarks: true, assessmentGroupId: true,
        assessmentGroup: { select: { id: true, termId: true } },
      },
    });
    if (!schedule) return err(res, "Schedule not found", 404);

    const validIds = await prisma.studentEnrollment.findMany({
      where: { classSectionId: schedule.classSectionId, academicYearId: activeYear.id, status: "ACTIVE" },
      select: { studentId: true },
    });
    const validSet = new Set(validIds.map((s) => s.studentId));

    for (const item of students) {
      if (!validSet.has(item.studentId))
        return err(res, `Invalid student: ${item.studentId}`, 400);
      if (!item.isAbsent && item.marksObtained !== "" && item.marksObtained != null) {
        const v = Number(item.marksObtained);
        if (isNaN(v) || v < 0)    return err(res, `Invalid marks for ${item.studentId}`, 400);
        if (v > schedule.maxMarks) return err(res, `Marks exceed max for ${item.studentId}`, 400);
      }
    }

    const schedulesInGroup = await prisma.assessmentSchedule.findMany({
      where: { assessmentGroupId: schedule.assessmentGroupId, classSectionId: schedule.classSectionId },
      select: { id: true, maxMarks: true },
    });
    const scheduleIds        = schedulesInGroup.map((s) => s.id);
    const maxMarksBySchedule = new Map(schedulesInGroup.map((s) => [s.id, Number(s.maxMarks || 0)]));

    await prisma.$transaction(async (tx) => {
      await Promise.all(students.map((item) => {
        const marksValue =
          item.isAbsent || item.marksObtained === "" || item.marksObtained == null
            ? null : Number(item.marksObtained);
        const data = {
          marksObtained: marksValue,
          isAbsent:      !!item.isAbsent,
          remarks:       item.remarks?.trim() || null,
        };
        return tx.marks.upsert({
          where:  { scheduleId_studentId: { scheduleId, studentId: item.studentId } },
          update: data,
          create: { scheduleId, studentId: item.studentId, ...data },
        });
      }));

      const allMarks = await tx.marks.findMany({
        where: { studentId: { in: students.map((s) => s.studentId) }, scheduleId: { in: scheduleIds } },
        select: { studentId: true, scheduleId: true, marksObtained: true },
      });

      const marksByStudent = allMarks.reduce((acc, m) => {
        acc.set(m.studentId, [...(acc.get(m.studentId) || []), m]);
        return acc;
      }, new Map());

      await Promise.all(students.map((item) => {
        const sMarks = marksByStudent.get(item.studentId) || [];

        const totalMarks = sMarks.reduce((sum, m) => sum + Number(m.marksObtained || 0), 0);
        const coveredMax = sMarks.reduce((sum, m) => sum + (maxMarksBySchedule.get(m.scheduleId) || 0), 0);

        const percentage = coveredMax > 0 ? (totalMarks / coveredMax) * 100 : 0;
        const grade      = getGrade(percentage);

        const summaryData = { totalMarks, maxMarks: coveredMax, percentage, grade };
          const termId = schedule.assessmentGroup.termId;

          if (!termId) {
            console.warn("❌ termId missing → skipping resultSummary");
            return; // ⛔ prevent Prisma crash
          }

          return tx.resultSummary.upsert({
            where: {
              studentId_academicYearId_termId_assessmentGroupId: {
                studentId: item.studentId,
                academicYearId: activeYear.id,
                termId: termId, // ✅ FIXED
                assessmentGroupId: schedule.assessmentGroupId,
              },
            },
          update: summaryData,
          create: {
            studentId:         item.studentId,
            academicYearId:    activeYear.id,
            termId:            schedule.assessmentGroup.termId || null,
            assessmentGroupId: schedule.assessmentGroupId,
            isPublished:       false,
            ...summaryData,
          },
        });
      }));
    }, { timeout: 15000 });

    return ok(res, { message: "Marks saved successfully" });
  } catch (e) {
    console.error("[saveMarksForSchedule]", e);
    return err(res, e.message, 500);
  }
}

// ─── GET /api/results/list ─────────────────────────────────────────────────
export async function getResultsList(req, res) {
  try {
    const userId   = req.user?.id;
    const schoolId = req.user?.schoolId;
    const role     = req.user?.role;
    if (!userId || !schoolId) return err(res, "Unauthorized", 401);

    const { search = "", assessmentGroupId = "", classSectionId = "", subjectId = "" } = req.query;

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    let effectiveClassIds   = null;
    let effectiveSubjectIds = null;

    if (role !== "ADMIN") {
      const teacher = await prisma.teacherProfile.findUnique({ where: { userId } });
      if (!teacher) return err(res, "Teacher profile not found", 404);

      const timetableEntries = await prisma.timetableEntry.findMany({
        where: { teacherId: teacher.id, academicYearId: activeYear.id },
        select: { classSectionId: true, subjectId: true },
      });

      const teacherClassIds   = [...new Set(timetableEntries.map((e) => e.classSectionId).filter(Boolean))];
      const teacherSubjectIds = [...new Set(timetableEntries.map((e) => e.subjectId).filter(Boolean))];

      effectiveClassIds   = classSectionId
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
        schedule: {
          ...(effectiveClassIds   ? { classSectionId: { in: effectiveClassIds } }   : classSectionId  ? { classSectionId }  : {}),
          ...(effectiveSubjectIds ? { subjectId:      { in: effectiveSubjectIds } }  : subjectId       ? { subjectId }       : {}),
          assessmentGroup: {
            schoolId,
            academicYearId: activeYear.id,
            ...(assessmentGroupId ? { id: assessmentGroupId } : {}),
          },
        },
        ...(search ? {
          OR: [
            { student: { name: { contains: search, mode: "insensitive" } } },
            { student: { enrollments: { some: { academicYearId: activeYear.id, rollNumber: { contains: search, mode: "insensitive" } } } } },
          ],
        } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, marksObtained: true, isAbsent: true, remarks: true,
        student: {
          select: {
            id: true, name: true,
            enrollments: {
              where: { academicYearId: activeYear.id },
              select: { rollNumber: true },
              take: 1,
            },
          },
        },
        schedule: {
          select: {
            maxMarks: true, examDate: true,
            subject:         { select: { id: true, name: true } },
            classSection:    { select: { id: true, name: true } },
            assessmentGroup: { select: { id: true, name: true } },
          },
        },
      },
    });

    const data = rows.map((r) => {
      const marks      = Number(r.marksObtained || 0);
      const totalMarks = Number(r.schedule.maxMarks || 0);
      const percentage = totalMarks > 0 ? Math.round((marks / totalMarks) * 100) : 0;
      return {
        id:             r.id,
        studentId:      r.student.id,
        studentName:    r.student.name,
        rollNo:         r.student.enrollments[0]?.rollNumber || "-",
        classSectionId: r.schedule.classSection.id,
        className:      r.schedule.classSection.name,
        subjectId:      r.schedule.subject.id,
        subject:        r.schedule.subject.name,
        examId:         r.schedule.assessmentGroup.id,
        exam:           r.schedule.assessmentGroup.name,
        marks, totalMarks, percentage,
        grade:    r.isAbsent ? "AB" : getGrade(percentage),
        isAbsent: r.isAbsent,
        remarks:  r.remarks,
        date:     r.schedule.examDate,
      };
    });

    return ok(res, { data });
  } catch (e) {
    console.error("[getResultsList]", e);
    return err(res, e.message, 500);
  }
}

// ─── GET /api/results/summary ──────────────────────────────────────────────
// Returns per-student aggregated results from resultSummary table.
// Filters: ?classSectionId=&assessmentGroupId=
// Used by ResultsTab to show class-level stats and student result tables.
export async function getResultsSummary(req, res) {
  try {
    const userId   = req.user?.id;
    const schoolId = req.user?.schoolId;
    if (!userId || !schoolId) return err(res, "Unauthorized", 401);

    const { classSectionId = "", assessmentGroupId = "" } = req.query;

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    const summaries = await prisma.resultSummary.findMany({
      where: {
        academicYearId: activeYear.id,
        ...(assessmentGroupId ? { assessmentGroupId } : {}),
        assessmentGroup: { schoolId },
      },
      select: {
        id: true,
        studentId: true,
        assessmentGroupId: true,
        totalMarks: true,
        maxMarks: true,
        percentage: true,
        grade: true,
        isPublished: true,
        student: {
          select: {
            id: true,
            name: true,
            enrollments: {
              where: { academicYearId: activeYear.id },
              select: { rollNumber: true, classSectionId: true },
            },
          },
        },
        assessmentGroup: {
          select: {
            id: true,
            name: true,
            term: { select: { id: true, name: true } },
          },
        },
      },
    });

    const data = summaries
      .map((s) => {
        // ✅ FIX: find correct enrollment
        const enrollment = s.student.enrollments.find(
          (e) => e.classSectionId
        );

        if (!enrollment) return null;

        // optional filter
        if (classSectionId && enrollment.classSectionId !== classSectionId)
          return null;

        return {
          id:                s.id,
          studentId:         s.studentId,
          studentName:       s.student.name,
          rollNo:            enrollment.rollNumber || "-",
          classSectionId:    enrollment.classSectionId, // ✅ IMPORTANT
          assessmentGroupId: s.assessmentGroupId,
          examName:          s.assessmentGroup.name,
          term:              s.assessmentGroup.term,
          totalMarks:        Number(s.totalMarks || 0),
          maxMarks:          Number(s.maxMarks || 0),
          percentage:        Number(s.percentage || 0),
          grade:             s.grade,
          isPublished:       s.isPublished,
        };
      })
      .filter(Boolean);

    return ok(res, { data });

  } catch (e) {
    console.error("[getResultsSummary]", e);
    return err(res, e.message, 500);
  }
}
// ─── DELETE /api/results/marks/:id ────────────────────────────────────────
export async function deleteMarkEntry(req, res) {
  try {
    const userId   = req.user?.id;
    const schoolId = req.user?.schoolId;
    if (!userId || !schoolId) return err(res, "Unauthorized", 401);

    const teacher = await prisma.teacherProfile.findUnique({ where: { userId } });
    if (!teacher) return err(res, "Teacher profile not found", 404);

    const activeYear = await getActiveYear(schoolId);
    if (!activeYear) return err(res, "No active academic year", 404);

    const existing = await prisma.marks.findFirst({
      where: { id: req.params.id, schedule: { assessmentGroup: { schoolId } } },
      select: {
        id: true,
        schedule: { select: { classSectionId: true, subjectId: true } },
      },
    });
    if (!existing) return err(res, "Marks entry not found", 404);

    const assigned = await prisma.timetableEntry.findFirst({
      where: {
        teacherId:      teacher.id,
        academicYearId: activeYear.id,
        classSectionId: existing.schedule.classSectionId,
        subjectId:      existing.schedule.subjectId,
      },
    });
    if (!assigned) return err(res, "Not authorized to delete this entry", 403);

    await prisma.marks.delete({ where: { id: req.params.id } });
    return ok(res, { message: "Deleted successfully" });
  } catch (e) {
    console.error("[deleteMarkEntry]", e);
    return err(res, e.message, 500);
  }
}



// export const exportResultsExcel = async (req, res) => {
//   try {
//     const { classSectionId, assessmentGroupId, subjectId } = req.query;

//     if (!classSectionId || !assessmentGroupId) {
//       return res.status(400).json({ message: "Missing params" });
//     }

//     const results = await prisma.marks.findMany({
//       where: {
//         schedule: {
//           classSectionId,
//           assessmentGroupId,
//           ...(subjectId ? { subjectId } : {}),
//         },
//       },
//       include: {
//         student: true,
//         schedule: {
//           include: {
//             subject: true,
//             classSection: true,
//             assessmentGroup: true,
//           },
//         },
//       },
//     });

//     const data = results.map((r) => {
//       const marks = Number(r.marksObtained || 0);
//       const total = Number(r.schedule.maxMarks || 0);
//       const pct = total > 0 ? ((marks / total) * 100).toFixed(1) : 0;

//       return {
//         Student: r.student.name,
//         Subject: r.schedule.subject.name,
//         Exam: r.schedule.assessmentGroup.name,
//         Marks: marks,
//         Total: total,
//         Percentage: pct,
//         Grade: r.isAbsent ? "AB" : getGrade(pct),
//       };
//     });

//     const wb = XLSX.utils.book_new();
//     const ws = XLSX.utils.json_to_sheet(data);

//     XLSX.utils.book_append_sheet(wb, ws, "Results");

//     const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

//     res.setHeader(
//       "Content-Disposition",
//       "attachment; filename=results.xlsx"
//     );
//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );

//     res.send(buffer);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Export failed" });
//   }
// };


// ─── INSTALL DEPENDENCY (run once) ───────────────────────────────────────────
// npm install exceljs
// ─────────────────────────────────────────────────────────────────────────────
// Replace the existing exportResultsExcel at the bottom of resultController.js
// Also add this import at the top of the file:
//   import ExcelJS from "exceljs";
// (You can remove the old `import XLSX from "xlsx"` if it's only used here)
// ─────────────────────────────────────────────────────────────────────────────

export const exportResultsExcel = async (req, res) => {
  try {
    const { classSectionId, assessmentGroupId, subjectId } = req.query;

    if (!classSectionId || !assessmentGroupId) {
      return res.status(400).json({ message: "Missing required params: classSectionId and assessmentGroupId" });
    }

    // ── 1. Fetch data ──────────────────────────────────────────────────────────
    const results = await prisma.marks.findMany({
      where: {
        schedule: {
          classSectionId,
          assessmentGroupId,
          ...(subjectId ? { subjectId } : {}),
        },
      },
      include: {
        student: true,
        schedule: {
          include: {
            subject:         true,
            classSection:    true,
            assessmentGroup: true,
          },
        },
      },
      orderBy: [
        { schedule: { subject: { name: "asc" } } },
        { student:  { name: "asc" } },
      ],
    });

    if (!results.length) {
      return res.status(404).json({ message: "No results found for the given filters" });
    }

    // ── 2. Meta from first row ─────────────────────────────────────────────────
    const first      = results[0].schedule;
    const className  = first.classSection.name;
    const examName   = first.assessmentGroup.name;
    const exportDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit", month: "long", year: "numeric",
    });

    // ── 3. Build workbook ──────────────────────────────────────────────────────
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator  = "School Results System";
    wb.created  = new Date();
    wb.modified = new Date();

    const ws = wb.addWorksheet("Results", {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
      views: [{ state: "frozen", ySplit: 6 }],   // freeze above the data rows
    });

    // ── 4. Colour palette ──────────────────────────────────────────────────────
    const C = {
      headerBg:    "FF1E3A5F",   // deep navy
      headerFg:    "FFFFFFFF",   // white
      subHeaderBg: "FF2E86AB",   // ocean blue
      subHeaderFg: "FFFFFFFF",
      metaBg:      "FFE8F4FD",   // very light blue
      metaFg:      "FF1E3A5F",
      colHeaderBg: "FF34495E",   // dark slate
      colHeaderFg: "FFFFFFFF",
      rowEven:     "FFF8FBFF",   // off-white
      rowOdd:      "FFFFFFFF",   // pure white
      borderCol:   "FFB0C4DE",
      gradA:       "FF1A7A4A",   // dark green   A+ / A
      gradAFg:     "FFFFFFFF",
      gradB:       "FF2E7D32",   // green        B
      gradBFg:     "FFFFFFFF",
      gradC:       "FFF57F17",   // amber        C
      gradCFg:     "FFFFFFFF",
      gradD:       "FFE65100",   // orange       D
      gradDFg:     "FFFFFFFF",
      gradF:       "FFC62828",   // red          F
      gradFFg:     "FFFFFFFF",
      gradAB:      "FF6D4C41",   // brown        AB (absent)
      gradABFg:    "FFFFFFFF",
      passCell:    "FFE8F5E9",   // light green  passing rows
      failCell:    "FFFCE4E4",   // light red    failing rows
    };

    // ── 5. Column definitions (A–H) ────────────────────────────────────────────
    ws.columns = [
      { key: "rollNo",     width: 10  },  // A
      { key: "student",    width: 28  },  // B
      { key: "subject",    width: 22  },  // C
      { key: "exam",       width: 20  },  // D
      { key: "marks",      width: 12  },  // E
      { key: "total",      width: 12  },  // F
      { key: "percentage", width: 14  },  // G
      { key: "grade",      width: 10  },  // H
    ];
    const LAST_COL = "H";
    const TOTAL_COLS = 8;

    // Helper – thin border all around
    const thinBorder = (color = C.borderCol) => ({
      top:    { style: "thin", color: { argb: color } },
      left:   { style: "thin", color: { argb: color } },
      bottom: { style: "thin", color: { argb: color } },
      right:  { style: "thin", color: { argb: color } },
    });

    const fillSolid = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

    // Helper – merge a row and style it
    const addBanner = (text, bgArgb, fgArgb, fontSize, rowHeight) => {
      const row  = ws.addRow([text]);
      const cell = row.getCell(1);
      ws.mergeCells(`A${row.number}:${LAST_COL}${row.number}`);
      cell.value          = text;
      cell.font           = { bold: true, size: fontSize, color: { argb: fgArgb }, name: "Calibri" };
      cell.alignment      = { horizontal: "center", vertical: "middle" };
      cell.fill           = fillSolid(bgArgb);
      cell.border         = thinBorder("FFFFFFFF");
      row.height          = rowHeight;
      return row;
    };

    // ── 6. Rows 1-5: Header block ──────────────────────────────────────────────

    // Row 1 – Title banner
    addBanner("📋  STUDENT RESULTS REPORT", C.headerBg, C.headerFg, 18, 36);

    // Row 2 – Class & Exam
    addBanner(`Class: ${className}   |   Exam: ${examName}`, C.subHeaderBg, C.subHeaderFg, 13, 26);

    // Row 3 – Export date + total students
    const totalStudents = new Set(results.map((r) => r.studentId)).size;
    addBanner(
      `Exported on: ${exportDate}     |     Total Students: ${totalStudents}     |     Total Records: ${results.length}`,
      C.metaBg, C.metaFg, 10, 20,
    );

    // Row 4 – spacer
    const spacer = ws.addRow([]);
    spacer.height = 6;

    // Row 5 – blank (will be used for spacing)
    // (skipped – freeze already at row 6)

    // ── 7. Row 6: Column headers ───────────────────────────────────────────────
    const headerLabels = ["Roll No", "Student Name", "Subject", "Exam", "Marks", "Total", "Percentage", "Grade"];
    const hdrRow       = ws.addRow(headerLabels);
    hdrRow.height      = 28;
    hdrRow.eachCell((cell) => {
      cell.font      = { bold: true, size: 11, color: { argb: C.colHeaderFg }, name: "Calibri" };
      cell.fill      = fillSolid(C.colHeaderBg);
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border    = thinBorder("FF1A252F");
    });

    // ── 8. Data rows ───────────────────────────────────────────────────────────
    results.forEach((r, idx) => {
      const marks  = Number(r.marksObtained || 0);
      const total  = Number(r.schedule.maxMarks || 0);
      const pct    = total > 0 ? parseFloat(((marks / total) * 100).toFixed(1)) : 0;
      const grade  = r.isAbsent ? "AB" : getGrade(pct);
      const passed = !r.isAbsent && pct >= 50;
      const rollNo = r.student.enrollments?.[0]?.rollNumber ?? idx + 1;

      const dataRow = ws.addRow({
        rollNo:     rollNo,
        student:    r.student.name,
        subject:    r.schedule.subject.name,
        exam:       r.schedule.assessmentGroup.name,
        marks:      r.isAbsent ? "AB" : marks,
        total:      total,
        percentage: r.isAbsent ? "AB" : pct,
        grade:      grade,
      });
      dataRow.height = 22;

      const rowBg = idx % 2 === 0 ? C.rowEven : C.rowOdd;

      dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        const isGradeCol = colNum === TOTAL_COLS;
        const isNumCol   = colNum >= 5 && colNum <= 7;

        cell.font      = { size: 10, name: "Calibri", color: { argb: "FF1A1A2E" } };
        cell.alignment = {
          horizontal: isNumCol || isGradeCol ? "center" : colNum === 1 ? "center" : "left",
          vertical:   "middle",
        };
        cell.border = thinBorder(C.borderCol);

        // Row background – light green for pass, light red for fail
        if (!isGradeCol) {
          cell.fill = fillSolid(r.isAbsent ? "FFFFF9F0" : passed ? C.passCell : C.failCell);
        }

        // Grade cell – bold coloured badge
        if (isGradeCol) {
          const gradeColors = {
            "A+": { bg: C.gradA,  fg: C.gradAFg  },
            "A":  { bg: C.gradA,  fg: C.gradAFg  },
            "B":  { bg: C.gradB,  fg: C.gradBFg  },
            "C":  { bg: C.gradC,  fg: C.gradCFg  },
            "D":  { bg: C.gradD,  fg: C.gradDFg  },
            "F":  { bg: C.gradF,  fg: C.gradFFg  },
            "AB": { bg: C.gradAB, fg: C.gradABFg },
          };
          const gc = gradeColors[grade] || { bg: "FFF0F0F0", fg: "FF000000" };
          cell.fill      = fillSolid(gc.bg);
          cell.font      = { bold: true, size: 11, name: "Calibri", color: { argb: gc.fg } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }

        // Percentage column – add % symbol if numeric
        if (colNum === 7 && !r.isAbsent) {
          cell.numFmt = "0.0";
        }
      });
    });

    // ── 9. Summary stats footer ────────────────────────────────────────────────
    const scored = results.filter((r) => !r.isAbsent);
    const avgPct = scored.length
      ? (scored.reduce((s, r) => {
          const t = Number(r.schedule.maxMarks || 0);
          const m = Number(r.marksObtained   || 0);
          return s + (t > 0 ? (m / t) * 100 : 0);
        }, 0) / scored.length).toFixed(1)
      : 0;
    const passed  = scored.filter((r) => {
      const t = Number(r.schedule.maxMarks || 0);
      const m = Number(r.marksObtained   || 0);
      return t > 0 && (m / t) * 100 >= 50;
    }).length;
    const absent  = results.filter((r) => r.isAbsent).length;

    // Blank spacer row
    ws.addRow([]).height = 8;

    // Stats header
    addBanner("SUMMARY", C.headerBg, C.headerFg, 11, 22);

    // Stats row
    const statsLabels = [
      ["Total Records", results.length],
      ["Present",       scored.length],
      ["Absent",        absent],
      ["Passed",        passed],
      ["Failed",        scored.length - passed],
      ["Class Avg %",   `${avgPct}%`],
      ["Pass Rate",     scored.length > 0 ? `${((passed / scored.length) * 100).toFixed(1)}%` : "N/A"],
    ];

    // Two stats rows side-by-side (label + value pairs)
    for (let i = 0; i < statsLabels.length; i += 4) {
      const chunk = statsLabels.slice(i, i + 4);
      const labels = [];
      const values = [];
      chunk.forEach(([l, v]) => { labels.push(l, ""); values.push(v, ""); });
      // Pad to 8 columns
      while (labels.length < 8) labels.push("");
      while (values.length < 8) values.push("");

      const lRow = ws.addRow(labels);
      lRow.height = 18;
      lRow.eachCell({ includeEmpty: true }, (cell, cn) => {
        if (labels[cn - 1] !== "") {
          cell.font      = { bold: true, size: 9, color: { argb: C.metaFg }, name: "Calibri" };
          cell.fill      = fillSolid(C.metaBg);
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border    = thinBorder(C.borderCol);
        }
      });

      const vRow = ws.addRow(values);
      vRow.height = 22;
      vRow.eachCell({ includeEmpty: true }, (cell, cn) => {
        if (values[cn - 1] !== "") {
          cell.font      = { bold: true, size: 12, color: { argb: C.headerBg }, name: "Calibri" };
          cell.fill      = fillSolid("FFFFFFFF");
          cell.alignment = { horizontal: "center", vertical: "middle" };
          cell.border    = thinBorder(C.borderCol);
        }
      });
    }

    // ── 10. Footer row ─────────────────────────────────────────────────────────
    ws.addRow([]).height = 6;
    addBanner(
      `This report was generated automatically on ${exportDate}. For official use only.`,
      "FFECF0F1", C.metaFg, 8, 18,
    );

    // ── 11. Send response ──────────────────────────────────────────────────────
    const safeName = `${className}_${examName}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}_Results.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    await wb.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("[exportResultsExcel]", error);
    res.status(500).json({ message: "Export failed", error: error.message });
  }
};