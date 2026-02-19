// server/src/controllers/timetableEntryController.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// GET /api/class-sections/:id/timetable?academicYearId=xxx
export const getTimetableEntries = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id: classSectionId } = req.params;
    const { academicYearId } = req.query;
    if (!academicYearId)
      return res.status(400).json({ message: "academicYearId is required" });

    const entries = await prisma.timetableEntry.findMany({
      where: { classSectionId, academicYearId, schoolId },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
            profileImage: true,
          },
        },
        subject: { select: { id: true, name: true, code: true } },
        periodSlot: true,
      },
      orderBy: [{ day: "asc" }, { periodSlot: { slotOrder: "asc" } }],
    });
    return res.json({ entries });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// POST /api/class-sections/:id/timetable
// body: { academicYearId, entries: [{ day, periodSlotId, subjectId, teacherId }] }
// Replaces the full timetable for this class in this year
export const saveTimetableEntries = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { id: classSectionId } = req.params;
    const { academicYearId, entries } = req.body;

    if (!academicYearId)
      return res.status(400).json({ message: "academicYearId is required" });
    if (!Array.isArray(entries))
      return res.status(400).json({ message: "entries must be an array" });

    const section = await prisma.classSection.findFirst({
      where: { id: classSectionId, schoolId },
    });
    if (!section)
      return res.status(404).json({ message: "Class section not found" });

    // ── Conflict detection: same teacher, same day, same slot, different class ──
    const conflicts = [];
    for (const entry of entries) {
      const { day, periodSlotId, teacherId } = entry;
      const conflict = await prisma.timetableEntry.findFirst({
        where: {
          schoolId,
          academicYearId,
          day,
          periodSlotId,
          teacherId,
          NOT: { classSectionId },
        },
        include: { classSection: { select: { name: true } } },
      });
      if (conflict) {
        conflicts.push({
          day,
          periodSlotId,
          teacherId,
          conflictingClass: conflict.classSection.name,
        });
      }
    }

    if (conflicts.length > 0) {
      return res.status(409).json({
        message: "Teacher conflict detected",
        conflicts,
      });
    }

    // ── Save inside transaction: delete existing, recreate ──
    const saved = await prisma.$transaction(async (tx) => {
      await tx.timetableEntry.deleteMany({
        where: { classSectionId, academicYearId, schoolId },
      });
      if (entries.length === 0) return [];
      await tx.timetableEntry.createMany({
        data: entries.map((e) => ({
          schoolId,
          academicYearId,
          classSectionId,
          day: e.day,
          periodSlotId: e.periodSlotId,
          subjectId: e.subjectId,
          teacherId: e.teacherId,
        })),
      });
      return tx.timetableEntry.findMany({
        where: { classSectionId, academicYearId, schoolId },
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              designation: true,
            },
          },
          subject: { select: { id: true, name: true, code: true } },
          periodSlot: true,
        },
      });
    });

    return res.json({ message: "Timetable saved", entries: saved });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// DELETE single entry: DELETE /api/class-sections/:id/timetable/entry/:entryId
export const deleteTimetableEntry = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const { entryId } = req.params;
    const entry = await prisma.timetableEntry.findFirst({
      where: { id: entryId, schoolId },
    });
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    await prisma.timetableEntry.delete({ where: { id: entryId } });
    return res.json({ message: "Entry removed" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
