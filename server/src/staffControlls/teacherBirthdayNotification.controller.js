import { prisma } from "../config/db.js";

const BIRTHDAY_WISHES = [
  "🎂 Wishing you a day filled with joy and laughter!",
  "🎉 May your birthday be as amazing as you are!",
  "🌟 Another year older, another year wiser — Happy Birthday!",
  "🎈 Hope your special day is absolutely fantastic!",
  "🥳 Cheers to you on your wonderful birthday!",
  "🎁 May all your birthday dreams come true today!",
  "✨ Sending you warm wishes on your special day!",
  "🌈 Hope this birthday brings you endless happiness!",
];

function pickRandomWish() {
  return BIRTHDAY_WISHES[Math.floor(Math.random() * BIRTHDAY_WISHES.length)];
}

/**
 * GET /api/notifications/birthdays
 * Returns today's birthday students grouped by the teacher's assigned classes.
 * Works for TEACHER, ADMIN, FINANCE, SUPER_ADMIN roles.
 */
export async function getStaffBirthdayNotifications(req, res) {
  try {
    const userId   = req.user?.id;
    const schoolId = req.user?.schoolId;
    const role     = req.user?.role;

    if (!userId || !schoolId) {
      return res.status(401).json({ success: false, message: "Unauthorised" });
    }

    const now        = new Date();
    const todayMonth = now.getUTCMonth() + 1;
    const todayDay   = now.getUTCDate();
    const dateStr    = `${String(todayDay).padStart(2, "0")}/${String(todayMonth).padStart(2, "0")}/${now.getUTCFullYear()}`;

    // ── For TEACHER: only students in their assigned classes ──────────────────
    // ── For ADMIN / others: all students in the school ────────────────────────
    let studentIds = null; // null = no filter (admin sees all)

    if (role === "TEACHER") {
      const teacher = await prisma.teacherProfile.findUnique({
        where:  { userId },
        select: { id: true },
      });

      if (teacher) {
        // Get active academic year
        const activeYear = await prisma.academicYear.findFirst({
          where:   { schoolId, isActive: true },
          select:  { id: true },
        });

        if (activeYear) {
          // Get all class sections this teacher is assigned to
          const assignments = await prisma.teacherAssignment.findMany({
            where:  { teacherId: teacher.id, academicYearId: activeYear.id },
            select: { classSectionId: true },
          });

          const classSectionIds = assignments.map((a) => a.classSectionId);

          if (classSectionIds.length > 0) {
            // Get student IDs enrolled in those sections
            const enrollments = await prisma.studentEnrollment.findMany({
              where: {
                classSectionId: { in: classSectionIds },
                academicYearId: activeYear.id,
                status: "ACTIVE",
              },
              select: { studentId: true, classSectionId: true },
            });

            studentIds = enrollments.map((e) => e.studentId);
          }
        }
      }
    }

    // ── Fetch students with their personalInfo ─────────────────────────────────
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        ...(studentIds ? { id: { in: studentIds } } : {}),
      },
      select: {
        id: true,
        name: true,
        personalInfo: {
          select: {
            dateOfBirth:  true,
            profileImage: true,
          },
        },
      },
    });

    // ── Filter to today's birthdays ────────────────────────────────────────────
    const birthdayStudents = students.filter((s) => {
      const raw = s.personalInfo?.dateOfBirth;
      if (!raw) return false;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return false;
      return (d.getUTCMonth() + 1) === todayMonth && d.getUTCDate() === todayDay;
    });

    const birthdayList = birthdayStudents.map((s) => ({
      id:         s.id,
      name:       s.name,
      profilePic: s.personalInfo?.profileImage ?? null,
    }));

    return res.json({
      success: true,
      data: {
        count:            birthdayList.length,
        birthdayStudents: birthdayList,
        date:             dateStr,
        wish:             pickRandomWish(),
      },
    });

  } catch (err) {
    console.error("[getStaffBirthdayNotifications]", err);
    return res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
}