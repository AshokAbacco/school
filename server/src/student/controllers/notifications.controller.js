// server/src/student/controllers/notifications.controller.js

import { prisma } from "../../config/db.js";

const BIRTHDAY_WISHES = [
  "🎂 Happy Birthday! Dear student, wishing you a wonderful day filled with joy and success in your studies.",
  "🎉 Happy Birthday! Keep learning, growing, and making your teachers proud.",
  "🌟 Happy Birthday! Wishing you a bright future and great success in your academics.",
  "🎈 Happy Birthday! May your day be full of smiles and your year full of achievements.",
  "🥳 Happy Birthday! Stay focused, work hard, and achieve all your dreams.",
  "🎁 Happy Birthday! Wishing you success in studies and happiness in life.",
  "✨ Happy Birthday! May this year bring you knowledge, growth, and great results.",
  "🌈 Happy Birthday! Keep believing in yourself and continue to excel.",
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