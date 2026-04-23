import prisma from "../../lib/prisma.js";

export const getParentFees = async (req, res) => {
  try {
    const parentId = req.user.id;

    // 1️⃣ Get studentIds
    const links = await prisma.studentParent.findMany({
      where: { parentId },
      select: { studentId: true },
    });

    const studentIds = links.map(l => l.studentId);

    // 2️⃣ Get students (REAL table)
    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
      },
      select: {
        name: true,
        email: true,
      },
    });

    const emails = students.map(s => s.email);

    // 3️⃣ Match with StudentList (fees table)
    const fees = await prisma.studentList.findMany({
      where: {
        email: { in: emails },
      },
    });

    res.json(fees);

  } catch (err) {
    console.error("❌ Parent Fees Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};