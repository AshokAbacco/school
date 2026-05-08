import { prisma } from "../config/db.js";

const BIRTHDAY_WISHES = [
  "🎂 Happy Birthday! Wishing you a wonderful day filled with joy and appreciation for all that you do.",
  "🎉 Happy Birthday! Thank you for inspiring and guiding students every day.",
  "🌟 Happy Birthday! Your dedication and passion make a difference in every student's life.",
  "🎈 Happy Birthday! Wishing you success, happiness, and continued excellence in teaching.",
  "🥳 Happy Birthday! May your day be as inspiring as the lessons you teach.",
  "🎁 Happy Birthday! Thank you for shaping young minds and building bright futures.",
  "✨ Happy Birthday! Your guidance and support mean so much to all your students.",
  "🌈 Happy Birthday! Wishing you a year full of achievements and happiness.",
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

    console.log("\n🎯 [Birthday API HIT]");
    console.log("👤 userId:", userId, "| role:", role, "| schoolId:", schoolId);

    if (!userId || !schoolId) {
      console.log("❌ Missing userId or schoolId");
      return res.status(401).json({ success: false, message: "Unauthorised" });
    }

    const now        = new Date();
    const todayMonth = now.getUTCMonth() + 1;
    const todayDay   = now.getUTCDate();
    const dateStr    = `${String(todayDay).padStart(2, "0")}/${String(todayMonth).padStart(2, "0")}/${now.getUTCFullYear()}`;

    console.log("📅 Today:", todayDay, "/", todayMonth);

    let studentIds = null;

    // ── TEACHER SELF BIRTHDAY ─────────────────────────────
    if (role === "TEACHER") {
      console.log("👨‍🏫 Checking teacher birthday...");

      const teacher = await prisma.teacherProfile.findUnique({
        where: { userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          dateOfBirth: true,
          profileImage: true,
        },
      });

      console.log("📌 Teacher data:", teacher);

      if (teacher?.dateOfBirth) {
        const dob = new Date(teacher.dateOfBirth);

        console.log(
          "🎂 Teacher DOB:",
          dob.getUTCDate(),
          "/",
          dob.getUTCMonth() + 1
        );

        const isToday =
          dob.getUTCMonth() + 1 === todayMonth &&
          dob.getUTCDate() === todayDay;

        console.log("✅ Is Teacher Birthday Today?", isToday);

        if (isToday) {
          console.log("🎉 RETURNING TEACHER BIRTHDAY");

          return res.json({
            success: true,
            data: {
              count: 1,
              birthdayStudents: [
                {
                  id: teacher.id,
                  name: `${teacher.firstName} ${teacher.lastName}`,
                  profilePic: teacher.profileImage ?? null,
                  type: "TEACHER",
                },
              ],
              date: dateStr,
              wish: pickRandomWish(),
            },
          });
        }
      } else {
        console.log("⚠️ Teacher DOB not found");
      }

      console.log("❌ Not teacher birthday → returning empty");

      return res.json({
        success: true,
        data: {
          count: 0,
          birthdayStudents: [],
          date: dateStr,
        },
      });
    }

    // ── STUDENT BIRTHDAYS ─────────────────────────────────
    console.log("🎓 Fetching student birthdays...");

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

    console.log("📊 Total students fetched:", students.length);

    const birthdayStudents = students.filter((s) => {
      const raw = s.personalInfo?.dateOfBirth;
      if (!raw) return false;

      const d = new Date(raw);
      if (isNaN(d.getTime())) return false;

      return (
        d.getUTCMonth() + 1 === todayMonth &&
        d.getUTCDate() === todayDay
      );
    });

    console.log("🎂 Students with birthday today:", birthdayStudents.length);

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
    console.error("🔥 [getStaffBirthdayNotifications ERROR]", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
}