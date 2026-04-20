import { PrismaClient } from "@prisma/client";
import cacheService from "../utils/cacheService.js";

import { prisma } from "../config/db.js";

/* ============================================================
   1️⃣ TERM CONTROLLERS
============================================================ */

export const createTerm = async (req, res) => {
  try {
    const { name, order, academicYearId } = req.body;
    const schoolId = req.user?.schoolId;

    if (!academicYearId) return res.status(400).json({ error: "academicYearId is required" });
    if (!schoolId)       return res.status(400).json({ error: "schoolId not found in token" });

    const term = await prisma.assessmentTerm.create({
      data: { name, order, academicYearId, schoolId },
    });

    await cacheService.invalidateSchool(schoolId);
    res.status(201).json(term);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getTerms = async (req, res) => {
  try {
    const { academicYearId } = req.params;
    const schoolId = req.user?.schoolId;

    const cacheKey = await cacheService.buildKey(schoolId, `terms:${academicYearId}`);
    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const terms = await prisma.assessmentTerm.findMany({
      where: { academicYearId },
      orderBy: { order: "asc" },
    });

    await cacheService.set(cacheKey, terms);
    res.json(terms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    const term = await prisma.assessmentTerm.update({
      where: { id },
      data: req.body,
    });

    await cacheService.invalidateSchool(schoolId);
    res.json(term);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteTerm = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    await prisma.assessmentTerm.delete({ where: { id } });

    await cacheService.invalidateSchool(schoolId);
    res.json({ message: "Term deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================================================
   2️⃣ GROUP CONTROLLERS
============================================================ */

export const createGroup = async (req, res) => {
  try {
    const { name, weightage, academicYearId, termId } = req.body;
    const schoolId = req.user?.schoolId;

    if (!academicYearId) return res.status(400).json({ error: "academicYearId is required" });
    if (!schoolId)       return res.status(400).json({ error: "schoolId not found in token" });

    const group = await prisma.assessmentGroup.create({
      data: {
        name,
        weightage: weightage || 0,
        academicYearId,
        schoolId,
        ...(termId && { termId }),
      },
    });

    await cacheService.invalidateSchool(schoolId);
    res.status(201).json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getGroups = async (req, res) => {
  try {
    const { academicYearId } = req.params;
    const schoolId = req.user?.schoolId;

    const cacheKey = await cacheService.buildKey(schoolId, `groups:${academicYearId}`);
    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const [groups, allSchedules] = await Promise.all([
      prisma.assessmentGroup.findMany({
        where: { academicYearId },
        include: { term: true },
      }),
      prisma.assessmentSchedule.findMany({
        where: { assessmentGroup: { academicYearId } },
        select: {
          id: true,
          assessmentGroupId: true,
          classSectionId: true,
          classSection: { select: { id: true, grade: true, section: true } },
        },
      }),
    ]);

    const schedulesByGroup = {};
    allSchedules.forEach((sc) => {
      if (!schedulesByGroup[sc.assessmentGroupId]) schedulesByGroup[sc.assessmentGroupId] = [];
      schedulesByGroup[sc.assessmentGroupId].push(sc);
    });

    const enriched = groups.map((g) => ({
      ...g,
      assessmentSchedules: schedulesByGroup[g.id] || [],
    }));

    await cacheService.set(cacheKey, enriched);
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    const group = await prisma.assessmentGroup.update({
      where: { id },
      data: req.body,
    });

    await cacheService.invalidateSchool(schoolId);
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    await prisma.assessmentGroup.delete({ where: { id } });

    await cacheService.invalidateSchool(schoolId);
    res.json({ message: "Group deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const publishGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    const group = await prisma.assessmentGroup.update({
      where: { id },
      data: { isPublished: true },
    });

    await cacheService.invalidateSchool(schoolId);
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const lockGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    const group = await prisma.assessmentGroup.update({
      where: { id },
      data: { isLocked: true },
    });

    await cacheService.invalidateSchool(schoolId);
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================================================
   3️⃣ SCHEDULE CONTROLLERS
============================================================ */

export const createSchedule = async (req, res) => {
  try {
    const data = req.body;
    const schoolId = req.user?.schoolId;
    const dateOnly = (data.examDate || "").split("T")[0];

    const toUTCDateTime = (timeStr) => {
      const t = String(timeStr || "00:00").trim().substring(0, 8);
      const parts = t.split(":");
      const hh = (parts[0] || "00").padStart(2, "0");
      const mm = (parts[1] || "00").padStart(2, "0");
      const ss = (parts[2] || "00").padStart(2, "0");
      const iso = `${dateOnly}T${hh}:${mm}:${ss}.000Z`;
      const d = new Date(iso);
      if (isNaN(d.getTime())) throw new Error(`Invalid time value: "${timeStr}"`);
      return d;
    };

    const schedule = await prisma.assessmentSchedule.create({
      data: {
        ...data,
        examDate:  new Date(`${dateOnly}T12:00:00.000Z`),
        startTime: toUTCDateTime(data.startTime),
        endTime:   toUTCDateTime(data.endTime),
      },
    });

    await cacheService.invalidateSchool(schoolId);
    res.status(201).json(schedule);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getSchedules = async (req, res) => {
  try {
    const { groupId } = req.params;
    const schoolId = req.user?.schoolId;

    const cacheKey = await cacheService.buildKey(schoolId, `schedules:${groupId}`);
    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const schedules = await prisma.assessmentSchedule.findMany({
      where: { assessmentGroupId: groupId },
      include: { subject: true, classSection: true },
    });

    const toTimeStr = (dt) => {
      if (!dt) return "";
      const iso = dt instanceof Date ? dt.toISOString() : String(dt);
      return iso.includes("T") ? iso.split("T")[1].substring(0, 8) : iso;
    };

    const normalized = schedules.map((sc) => ({
      ...sc,
      startTime: toTimeStr(sc.startTime),
      endTime:   toTimeStr(sc.endTime),
    }));

    await cacheService.set(cacheKey, normalized);
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    await prisma.assessmentSchedule.delete({ where: { id } });

    await cacheService.invalidateSchool(schoolId);
    res.json({ message: "Schedule deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================================================
   4️⃣ MARKS CONTROLLERS
============================================================ */

export const bulkMarksEntry = async (req, res) => {
  try {
    const { scheduleId, marks } = req.body;
    const schoolId = req.user?.schoolId;

    const operations = marks.map((m) =>
      prisma.marks.upsert({
        where: { scheduleId_studentId: { scheduleId, studentId: m.studentId } },
        update: { marksObtained: m.marksObtained, isAbsent: m.isAbsent || false },
        create: { scheduleId, studentId: m.studentId, marksObtained: m.marksObtained, isAbsent: m.isAbsent || false },
      })
    );

    await prisma.$transaction(operations);

    await cacheService.invalidateSchool(schoolId);
    res.json({ message: "Marks saved successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMarksBySchedule = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const schoolId = req.user?.schoolId;

    const cacheKey = await cacheService.buildKey(schoolId, `marks:${scheduleId}`);
    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const marks = await prisma.marks.findMany({
      where: { scheduleId },
      include: { student: true },
    });

    await cacheService.set(cacheKey, marks);
    res.json(marks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ============================================================
   5️⃣ RESULT CALCULATION
============================================================ */

export const calculateResults = async (req, res) => {
  try {
    const { groupId } = req.params;
    const schoolId = req.user?.schoolId;

    const group = await prisma.assessmentGroup.findUnique({ where: { id: groupId } });

    const schedules = await prisma.assessmentSchedule.findMany({
      where: { assessmentGroupId: groupId },
      include: { marks: true },
    });

    const studentMap = {};
    for (const schedule of schedules) {
      for (const mark of schedule.marks) {
        if (!studentMap[mark.studentId]) studentMap[mark.studentId] = { total: 0, max: 0 };
        if (!mark.isAbsent) studentMap[mark.studentId].total += mark.marksObtained || 0;
        studentMap[mark.studentId].max += schedule.maxMarks;
      }
    }

    const operations = Object.entries(studentMap).map(([studentId, data]) =>
      prisma.resultSummary.upsert({
        where: {
          studentId_academicYearId_termId_assessmentGroupId: {
            studentId,
            academicYearId: group.academicYearId,
            termId: group.termId,
            assessmentGroupId: groupId,
          },
        },
        update: { totalMarks: data.total, maxMarks: data.max, percentage: (data.total / data.max) * 100 },
        create: {
          studentId,
          academicYearId:    group.academicYearId,
          termId:            group.termId,
          assessmentGroupId: groupId,
          totalMarks:        data.total,
          maxMarks:          data.max,
          percentage:        (data.total / data.max) * 100,
        },
      })
    );

    await prisma.$transaction(operations);

    await cacheService.invalidateSchool(schoolId);
    res.json({ message: "Results calculated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getStudentResult = async (req, res) => {
  try {
    const { studentId, academicYearId } = req.params;
    const schoolId = req.user?.schoolId;

    const cacheKey = await cacheService.buildKey(schoolId, `results:${studentId}:${academicYearId}`);
    const cached = await cacheService.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const results = await prisma.resultSummary.findMany({
      where: { studentId, academicYearId },
      include: { assessmentGroup: true, term: true },
    });

    await cacheService.set(cacheKey, results);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};