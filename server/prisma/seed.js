import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("123456", 10);

  // ─────────────────────────────────────────────
  // SUPER ADMIN
  // ─────────────────────────────────────────────
  await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "super@school.com",
      password,
      role: "SUPER_ADMIN",
    },
  });

  // ─────────────────────────────────────────────
  // ADMIN
  // ─────────────────────────────────────────────
  await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@school.com",
      password,
      role: "ADMIN",
    },
  });

  // ─────────────────────────────────────────────
  // TEACHER + TeacherProfile
  // ─────────────────────────────────────────────
  await prisma.user.create({
    data: {
      name: "Teacher User",
      email: "teacher@school.com",
      password,
      role: "TEACHER",
      teacherProfile: {
        create: {
          employeeCode: "TCH-001",
          firstName: "Teacher",
          lastName: "User",
          department: "Mathematics",
          designation: "Senior Teacher",
          qualification: "M.Sc Mathematics",
          experienceYears: 5,
          joiningDate: new Date(),
          employmentType: "FULL_TIME",
          status: "ACTIVE",
        },
      },
    },
  });

  // ─────────────────────────────────────────────
  // STUDENT + StudentPersonalInfo
  // ─────────────────────────────────────────────
  await prisma.student.create({
    data: {
      name: "Student One",
      email: "student@school.com",
      password,
      personalInfo: {
        create: {
          firstName: "Student",
          lastName: "One",
          grade: "10",
          className: "A",
          admissionDate: new Date(),
          status: "ACTIVE",
        },
      },
    },
  });

  // ─────────────────────────────────────────────
  // PARENT
  // ─────────────────────────────────────────────
  await prisma.parent.create({
    data: {
      name: "Parent One",
      email: "parent@school.com",
      password,
    },
  });

  console.log("Seed data inserted successfully ✅");
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
