// server/src/student/controllers/notifications.controller.js

import { prisma } from "../../config/db.js";

const BIRTHDAY_WISHES = [
  "🎂 Wishing you a day filled with joy and laughter!",
  "🎉 May your birthday be as amazing as you are!",
  "🌟 Another year older, another year wiser — Happy Birthday!",
  "🎈 Hope your special day is absolutely fantastic!",
  "🥳 Cheers to you on your wonderful birthday!",
  "🎁 May all your birthday dreams come true today!",
  "✨ Sending you warm wishes on your special day!",
  "🌈 Hope this birthday brings you endless happiness!",
  "🍰 Have a slice of happiness on your birthday!",
  "💫 May this birthday be the start of your best year yet!",
];

function pickRandomWish() {
  return BIRTHDAY_WISHES[Math.floor(Math.random() * BIRTHDAY_WISHES.length)];
}

export async function getBirthdayNotifications(req, res) {
  try {
    const studentId = req.user?.id;
    const role      = req.user?.role;

    if (!studentId || role !== "STUDENT") {
      return res.status(401).json({ success: false, message: "Unauthorised" });
    }

    // Get the logged-in student + their school
    const me = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true },
    });

    if (!me) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    const now        = new Date();
    const todayMonth = now.getUTCMonth() + 1;
    const todayDay   = now.getUTCDate();

    // Fetch all students in the school WITH their personalInfo
    const allStudents = await prisma.student.findMany({
      where: { schoolId: me.schoolId },
      select: {
        id: true,
        name: true,
        personalInfo: {
          select: {
            dateOfBirth: true,
            profileImage: true,
          },
        },
      },
    });

    // Filter to today's birthdays using personalInfo.dateOfBirth
    const birthdayStudents = allStudents.filter((s) => {
      const raw = s.personalInfo?.dateOfBirth;
      if (!raw) return false;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return false;
      return (d.getUTCMonth() + 1) === todayMonth && d.getUTCDate() === todayDay;
    });

    const isMyBirthday = birthdayStudents.some((s) => s.id === studentId);
    const birthdayList = birthdayStudents.map((s) => ({
      id:         s.id,
      name:       s.name,
      profilePic: s.personalInfo?.profileImage ?? null,
      isMe:       s.id === studentId,
    }));

    const dateStr = `${String(todayDay).padStart(2, "0")}/${String(todayMonth).padStart(2, "0")}/${now.getUTCFullYear()}`;

    return res.json({
      success: true,
      data: {
        count:            birthdayList.length,
        isMyBirthday,
        birthdayStudents: birthdayList,
        date:             dateStr,
        wish:             pickRandomWish(),
      },
    });

  } catch (err) {
    console.error("[getBirthdayNotifications]", err);
    return res.status(500).json({ success: false, message: "Internal server error", error: err.message });
  }
}