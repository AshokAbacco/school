// server/prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("123456", 10);

  // ─────────────────────────────────────────────────────────────
  // 1. UNIVERSITY
  // ─────────────────────────────────────────────────────────────
  const university = await prisma.university.create({
    data: {
      name: "Christ University",
      code: "CHRIST_UNI",
      address: "Hosur Road",
      city: "Bangalore",
      state: "Karnataka",
      phone: "+91 80 4012 9100",
      email: "info@school.com",
      website: "https://christuniversity.in",
    },
  });

  console.log("✅ University created:", university.name);

  // ─────────────────────────────────────────────────────────────
  // 2. SUPER ADMIN
  // ─────────────────────────────────────────────────────────────
  const superAdmin = await prisma.superAdmin.create({
    data: {
      name: "Super Admin",
      email: "superadmin@school.com", // superadmin@school.com
      password,
      phone: "+91 98765 00000",
      universityId: university.id,
    },
  });

  console.log("✅ Super Admin created:", superAdmin.email);

  // ─────────────────────────────────────────────────────────────
  // 3. SCHOOLS
  // ─────────────────────────────────────────────────────────────
  const highSchool = await prisma.school.create({
    data: {
      name: "Christ High School",
      code: "CHRIST_HIGH",
      type: "HIGH_SCHOOL",
      address: "Hosur Road, Block A",
      city: "Bangalore",
      state: "Karnataka",
      phone: "+91 80 4012 9101",
      email: "highschool@school.com",
      universityId: university.id,
    },
  });

  const degreeCollege = await prisma.school.create({
    data: {
      name: "Christ Degree College",
      code: "CHRIST_DEGREE",
      type: "DEGREE",
      address: "Hosur Road, Block B",
      city: "Bangalore",
      state: "Karnataka",
      phone: "+91 80 4012 9102",
      email: "degree@school.com",
      universityId: university.id,
    },
  });

  console.log("✅ Schools created:", highSchool.code, degreeCollege.code);

  await prisma.superAdminSchoolAccess.createMany({
    data: [
      { superAdminId: superAdmin.id, schoolId: highSchool.id },
      { superAdminId: superAdmin.id, schoolId: degreeCollege.id },
    ],
  });

  // ─────────────────────────────────────────────────────────────
  // 4. ADMINS
  //    admin1@school.com → High School
  //    admin2@school.com → Degree College
  // ─────────────────────────────────────────────────────────────
  const highSchoolAdmin = await prisma.user.create({
    data: {
      name: "Admin One",
      email: "admin1@school.com", // admin1@school.com
      password,
      role: "ADMIN",
      schoolId: highSchool.id,
    },
  });

  const degreeAdmin = await prisma.user.create({
    data: {
      name: "Admin Two",
      email: "admin2@school.com", // admin2@school.com
      password,
      role: "ADMIN",
      schoolId: degreeCollege.id,
    },
  });

  console.log("✅ Admins created:", highSchoolAdmin.email, degreeAdmin.email);

  // ─────────────────────────────────────────────────────────────
  // 5. TEACHERS
  //    teacher1@school.com, teacher2@school.com → High School
  //    teacher3@school.com, teacher4@school.com → Degree College
  // ─────────────────────────────────────────────────────────────
  const hsTeacher1User = await prisma.user.create({
    data: {
      name: "Teacher One",
      email: "teacher1@school.com", // teacher1@school.com
      password,
      role: "TEACHER",
      schoolId: highSchool.id,
      teacherProfile: {
        create: {
          schoolId: highSchool.id,
          employeeCode: "HS-TCH-001",
          firstName: "Teacher",
          lastName: "One",
          gender: "MALE",
          phone: "+91 98765 11111",
          department: "Mathematics",
          designation: "Senior Teacher",
          qualification: "M.Sc Mathematics",
          experienceYears: 8,
          joiningDate: new Date("2018-06-01"),
          employmentType: "FULL_TIME",
          status: "ACTIVE",
          salary: 45000,
        },
      },
    },
  });

  const hsTeacher2User = await prisma.user.create({
    data: {
      name: "Teacher Two",
      email: "teacher2@school.com", // teacher2@school.com
      password,
      role: "TEACHER",
      schoolId: highSchool.id,
      teacherProfile: {
        create: {
          schoolId: highSchool.id,
          employeeCode: "HS-TCH-002",
          firstName: "Teacher",
          lastName: "Two",
          gender: "FEMALE",
          phone: "+91 98765 22222",
          department: "Science",
          designation: "Teacher",
          qualification: "M.Sc Physics",
          experienceYears: 4,
          joiningDate: new Date("2021-07-15"),
          employmentType: "FULL_TIME",
          status: "ACTIVE",
          salary: 38000,
        },
      },
    },
  });

  const dcTeacher3User = await prisma.user.create({
    data: {
      name: "Teacher Three",
      email: "teacher3@school.com", // teacher3@school.com
      password,
      role: "TEACHER",
      schoolId: degreeCollege.id,
      teacherProfile: {
        create: {
          schoolId: degreeCollege.id,
          employeeCode: "DC-TCH-001",
          firstName: "Teacher",
          lastName: "Three",
          gender: "MALE",
          phone: "+91 98765 33333",
          department: "Computer Science",
          designation: "Associate Professor",
          qualification: "Ph.D Computer Science",
          experienceYears: 12,
          joiningDate: new Date("2015-01-10"),
          employmentType: "FULL_TIME",
          status: "ACTIVE",
          salary: 75000,
        },
      },
    },
  });

  const dcTeacher4User = await prisma.user.create({
    data: {
      name: "Teacher Four",
      email: "teacher4@school.com", // teacher4@school.com
      password,
      role: "TEACHER",
      schoolId: degreeCollege.id,
      teacherProfile: {
        create: {
          schoolId: degreeCollege.id,
          employeeCode: "DC-TCH-002",
          firstName: "Teacher",
          lastName: "Four",
          gender: "FEMALE",
          phone: "+91 98765 44444",
          department: "Business Studies",
          designation: "Assistant Professor",
          qualification: "MBA Finance",
          experienceYears: 6,
          joiningDate: new Date("2019-08-01"),
          employmentType: "FULL_TIME",
          status: "ACTIVE",
          salary: 55000,
        },
      },
    },
  });

  console.log("✅ Teachers created for both schools");

  // Teacher assignments
  const hsTeacherProfile1 = await prisma.teacherProfile.findUnique({
    where: { userId: hsTeacher1User.id },
  });
  const hsTeacherProfile2 = await prisma.teacherProfile.findUnique({
    where: { userId: hsTeacher2User.id },
  });

  await prisma.teacherAssignment.createMany({
    data: [
      {
        teacherId: hsTeacherProfile1.id,
        grade: "9",
        className: "A",
        subject: "Mathematics",
        academicYear: "2024-25",
      },
      {
        teacherId: hsTeacherProfile1.id,
        grade: "10",
        className: "A",
        subject: "Mathematics",
        academicYear: "2024-25",
      },
      {
        teacherId: hsTeacherProfile2.id,
        grade: "9",
        className: "A",
        subject: "Physics",
        academicYear: "2024-25",
      },
      {
        teacherId: hsTeacherProfile2.id,
        grade: "10",
        className: "B",
        subject: "Science",
        academicYear: "2024-25",
      },
    ],
  });

  console.log("✅ Teacher assignments created");

  // ─────────────────────────────────────────────────────────────
  // 6. STUDENTS
  //    student1, student2, student3 → High School
  //    student4, student5           → Degree College
  // ─────────────────────────────────────────────────────────────
  await prisma.student.create({
    data: {
      name: "Student One",
      email: "student1@school.com", // student1@school.com
      password,
      schoolId: highSchool.id,
      personalInfo: {
        create: {
          firstName: "Student",
          lastName: "One",
          dateOfBirth: new Date("2008-03-15"),
          gender: "MALE",
          grade: "10",
          className: "A",
          rollNumber: "HS-2024-001",
          admissionDate: new Date("2022-06-01"),
          status: "ACTIVE",
          parentName: "Parent One",
          parentEmail: "parent1@school.com",
          parentPhone: "+91 98765 66661",
          bloodGroup: "B_POS",
        },
      },
    },
  });

  await prisma.student.create({
    data: {
      name: "Student Two",
      email: "student2@school.com", // student2@school.com
      password,
      schoolId: highSchool.id,
      personalInfo: {
        create: {
          firstName: "Student",
          lastName: "Two",
          dateOfBirth: new Date("2008-07-22"),
          gender: "FEMALE",
          grade: "10",
          className: "A",
          rollNumber: "HS-2024-002",
          admissionDate: new Date("2022-06-01"),
          status: "ACTIVE",
          parentName: "Parent Two",
          parentEmail: "parent2@school.com",
          parentPhone: "+91 98765 66662",
          bloodGroup: "O_POS",
        },
      },
    },
  });

  await prisma.student.create({
    data: {
      name: "Student Three",
      email: "student3@school.com", // student3@school.com
      password,
      schoolId: highSchool.id,
      personalInfo: {
        create: {
          firstName: "Student",
          lastName: "Three",
          dateOfBirth: new Date("2009-11-05"),
          gender: "MALE",
          grade: "9",
          className: "B",
          rollNumber: "HS-2024-003",
          admissionDate: new Date("2023-06-01"),
          status: "ACTIVE",
          bloodGroup: "A_POS",
        },
      },
    },
  });

  await prisma.student.create({
    data: {
      name: "Student Four",
      email: "student4@school.com", // student4@school.com
      password,
      schoolId: degreeCollege.id,
      personalInfo: {
        create: {
          firstName: "Student",
          lastName: "Four",
          dateOfBirth: new Date("2004-05-18"),
          gender: "FEMALE",
          grade: "2nd Year",
          className: "CS-B",
          rollNumber: "DC-2023-001",
          admissionDate: new Date("2023-08-01"),
          status: "ACTIVE",
          parentName: "Parent Three",
          parentEmail: "parent3@school.com",
          parentPhone: "+91 98765 77771",
          bloodGroup: "AB_POS",
        },
      },
    },
  });

  await prisma.student.create({
    data: {
      name: "Student Five",
      email: "student5@school.com", // student5@school.com
      password,
      schoolId: degreeCollege.id,
      personalInfo: {
        create: {
          firstName: "Student",
          lastName: "Five",
          dateOfBirth: new Date("2003-09-30"),
          gender: "MALE",
          grade: "3rd Year",
          className: "BBA-A",
          rollNumber: "DC-2022-001",
          admissionDate: new Date("2022-08-01"),
          status: "ACTIVE",
          bloodGroup: "O_NEG",
        },
      },
    },
  });

  console.log("✅ Students created for both schools");

  // ─────────────────────────────────────────────────────────────
  // 7. PARENTS
  //    parent1, parent2 → High School
  //    parent3          → Degree College
  // ─────────────────────────────────────────────────────────────
  await prisma.parent.createMany({
    data: [
      {
        name: "Parent One",
        email: "parent1@school.com", // parent1@school.com
        password,
        phone: "+91 98765 66661",
        schoolId: highSchool.id,
      },
      {
        name: "Parent Two",
        email: "parent2@school.com", // parent2@school.com
        password,
        phone: "+91 98765 66662",
        schoolId: highSchool.id,
      },
      {
        name: "Parent Three",
        email: "parent3@school.com", // parent3@school.com
        password,
        phone: "+91 98765 77771",
        schoolId: degreeCollege.id,
      },
    ],
  });

  console.log("✅ Parents created");

  // ─────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════╗
║           SEED COMPLETE — LOGIN CREDENTIALS              ║
╠══════════════════════════════════════════════════════════╣
║  All passwords : 123456                                  ║
╠══════════════════════════════════════════════════════════╣
║  SUPER ADMIN (no school code needed)                     ║
║    superadmin@school.com                                 ║
╠══════════════════════════════════════════════════════════╣
║  HIGH SCHOOL  →  school code: CHRIST_HIGH                ║
║    admin1@school.com                                     ║
║    teacher1@school.com                                   ║
║    teacher2@school.com                                   ║
║    student1@school.com                                   ║
║    student2@school.com                                   ║
║    student3@school.com                                   ║
║    parent1@school.com                                    ║
║    parent2@school.com                                    ║
╠══════════════════════════════════════════════════════════╣
║  DEGREE COLLEGE  →  school code: CHRIST_DEGREE           ║
║    admin2@school.com                                     ║
║    teacher3@school.com                                   ║
║    teacher4@school.com                                   ║
║    student4@school.com                                   ║
║    student5@school.com                                   ║
║    parent3@school.com                                    ║
╚══════════════════════════════════════════════════════════╝
  `);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
