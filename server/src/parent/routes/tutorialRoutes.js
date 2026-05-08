import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { prisma } from "../../config/db.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const parentId = req.user?.id;
    const studentId = req.query.studentId;

    if (!parentId || !studentId) {
      return res.status(400).json({ success: false, message: "Missing IDs" });
    }

    // Verify parent-student link
    const link = await prisma.studentParent.findFirst({
      where: { parentId, studentId },
    });
    if (!link) return res.status(403).json({ success: false, message: "Access denied" });

    // Get the student's current grade for subject-based teacher matching
    const enrollment = await prisma.studentEnrollment.findFirst({
      where: { studentId, status: "ACTIVE" },
      include: { classSection: { select: { grade: true } } },
      orderBy: { createdAt: "desc" },
    });
    const studentGrade = enrollment?.classSection?.grade;

    const recommendations = await prisma.studentTutorialRecommendation.findMany({
      where: { studentId, status: "ACTIVE" },
      include: { subject: { select: { id: true, name: true } } },
    });

    const enriched = await Promise.all(
      recommendations.map(async (rec) => {

        // ── Step 1: Parse whatever shape recommendedTeachers is stored as ──
        let stored = rec.recommendedTeachers;
        if (typeof stored === "string") {
          try { stored = JSON.parse(stored); } catch { stored = []; }
        }
        if (!Array.isArray(stored)) stored = [];

        // Extract tutorialProfileIds OR teacherIds — handle both shapes
        const tutorialProfileIds = stored
          .map((t) => t.id || t.tutorialProfileId)   // full profile objects saved with .id
          .filter(Boolean);

        const teacherIds = stored
          .map((t) => t.teacherId)
          .filter(Boolean);

        // ── Step 2: Fetch active tutorial teachers for this subject ──
        // Strategy A: if we have tutorialProfileIds, use them directly
        // Strategy B: fallback — query by subjectId and grade from the school
        let teachers = [];

        if (tutorialProfileIds.length > 0) {
          teachers = await prisma.teacherTutorialProfile.findMany({
            where: {
              id: { in: tutorialProfileIds },
              isActive: true,
            },
            include: {
              teacher: {
                select: { firstName: true, lastName: true, designation: true, phone: true },
              },
            },
          });
        }

        // If tutorialProfileIds didn't work, try teacherIds
        if (teachers.length === 0 && teacherIds.length > 0) {
          teachers = await prisma.teacherTutorialProfile.findMany({
            where: {
              teacherId: { in: teacherIds },
              isActive: true,
            },
            include: {
              teacher: {
                select: { firstName: true, lastName: true, designation: true, phone: true },
              },
            },
          });
        }

        // ── Step 3: Last resort fallback — match by subject name + grade ──
        // This handles the case where stored IDs are stale or missing entirely
        if (teachers.length === 0) {
          const subjectName = rec.subject?.name;
          teachers = await prisma.teacherTutorialProfile.findMany({
            where: {
              isActive: true,
              subjects: subjectName ? { has: subjectName } : undefined,
              grades: studentGrade ? { has: studentGrade } : undefined,
            },
            include: {
              teacher: {
                select: { firstName: true, lastName: true, designation: true, phone: true },
              },
            },
            orderBy: [{ rankingScore: "desc" }, { adminPriority: "desc" }],
            take: 5,
          });
        }

        return { ...rec, recommendedTeachers: teachers };
      })
    );

    return res.json({ success: true, data: enriched });
  } catch (e) {
    console.error("[parent/tutorial-recommendations] ERROR:", e);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;