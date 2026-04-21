import { prisma } from "../config/db.js";

export async function getFullData(model, id) {
  try {
    switch (model) {

      case "Student":
        return await prisma.student.findUnique({
          where: { id },
          include: {
            personalInfo: true,
            enrollments: true,
            documents: true,
            parentLinks: { include: { parent: true } },
          },
        });

      case "TeacherProfile":
        return await prisma.teacherProfile.findUnique({
          where: { id },
          include: {
            documents: true,
            assignments: true,
          },
        });

      case "Parent":
        return await prisma.parent.findUnique({
          where: { id },
          include: {
            studentLinks: true,
          },
        });

      case "Expense":
        return await prisma.expense.findUnique({
          where: { id },
        });

      case "StudentFinance":
        return await prisma.studentFinance.findUnique({
          where: { id },
        });

      default:
        // fallback (basic)
        return await prisma[model.charAt(0).toLowerCase() + model.slice(1)]
          .findUnique({
            where: { id },
          });
    }
  } catch (err) {
    console.error("FullData error:", err.message);
    return null;
  }
}