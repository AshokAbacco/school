import { prisma } from "../../config/db.js";
import cache from "../../utils/cacheService.js";

export const getParentStudents = async (req, res) => {
  try {
    const parentId = req.user?.id;

    if (!parentId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const cacheKey = `parent:students:${parentId}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const studentLinks = await prisma.studentParent.findMany({
      where: { parentId },
      include: {
        student: {
          include: {
            personalInfo: true,
            enrollments: {
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });

    const result = studentLinks.map((link) => {
      const s = link.student;
      const enrollment = s.enrollments?.[0];
      const info = s.personalInfo;

      // Build display name with multiple fallbacks
      const firstName = info?.firstName || s.name?.split(" ")[0] || "";
      const lastName = info?.lastName || s.name?.split(" ").slice(1).join(" ") || "";

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        firstName,
        lastName,
        profileImage: info?.profileImage || null,
        admissionNumber: enrollment?.admissionNumber || null,
        rollNumber: enrollment?.rollNumber || null,
        personalInfo: info,
      };
    });

    const response = { success: true, data: result };
    await cache.set(cacheKey, JSON.stringify(response));

    return res.json(response);
  } catch (err) {
    console.error("GET PARENT STUDENTS ERROR:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch students" });
  }
};