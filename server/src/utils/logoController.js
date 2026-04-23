// server/src/utils/logoController.js
import { prisma } from "../config/db.js";
import { generateSignedUrl } from "../lib/r2.js";

export const getSchoolLogo = async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    let schoolId = null;

    switch (role) {
      case "SUPER_ADMIN": {
        const access = await prisma.superAdminSchoolAccess.findFirst({
          where: { superAdminId: userId },
          select: { schoolId: true },
        });
        schoolId = access?.schoolId;
        break;
      }

      // ADMIN, TEACHER, FINANCE all live in the User table with schoolId
      case "ADMIN":
      case "TEACHER":
      case "FINANCE": {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { schoolId: true },
        });
        schoolId = user?.schoolId;
        break;
      }

      case "PARENT": {
        const parent = await prisma.parent.findUnique({
          where: { id: userId },
          select: { schoolId: true },
        });
        schoolId = parent?.schoolId;
        break;
      }

      case "STUDENT": {
        const student = await prisma.student.findUnique({
          where: { id: userId },
          select: { schoolId: true },
        });
        schoolId = student?.schoolId;
        break;
      }

      default:
        return res.json({ logoUrl: null });
    }

    if (!schoolId) return res.json({ logoUrl: null });

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { logoUrl: true },
    });

    if (!school?.logoUrl) return res.json({ logoUrl: null });

    // Signed URL — same as superadmin flow, valid 5 minutes
    const signedUrl = await generateSignedUrl(school.logoUrl, 300);
    return res.json({ logoUrl: signedUrl });

  } catch (err) {
    console.error("[getSchoolLogo]", err);
    res.status(500).json({ message: "Server error" });
  }
};