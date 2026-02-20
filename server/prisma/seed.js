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
      email: "superadmin@school.com",
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

  // Grant super admin access to both schools
  await prisma.superAdminSchoolAccess.createMany({
    data: [
      { superAdminId: superAdmin.id, schoolId: highSchool.id },
      { superAdminId: superAdmin.id, schoolId: degreeCollege.id },
    ],
  });

  // ─────────────────────────────────────────────────────────────
  // 4. ADMINS
  // ─────────────────────────────────────────────────────────────
  const highSchoolAdmin = await prisma.user.create({
    data: {
      name: "Admin One",
      email: "admin1@school.com",
      password,
      role: "ADMIN",
      schoolId: highSchool.id,
    },
  });

  const degreeAdmin = await prisma.user.create({
    data: {
      name: "Admin Two",
      email: "admin2@school.com",
      password,
      role: "ADMIN",
      schoolId: degreeCollege.id,
    },
  });
  console.log("✅ Admins created:", highSchoolAdmin.email, degreeAdmin.email);

  // ─────────────────────────────────────────────────────────────
  // 5. ACADEMIC YEARS
  // ─────────────────────────────────────────────────────────────
  const hsAcademicYear = await prisma.academicYear.create({
    data: {
      name: "2024-25",
      startDate: new Date("2024-06-01"),
      endDate: new Date("2025-03-31"),
      isActive: true,
      schoolId: highSchool.id,
    },
  });

  const dcAcademicYear = await prisma.academicYear.create({
    data: {
      name: "2024-25",
      startDate: new Date("2024-08-01"),
      endDate: new Date("2025-05-31"),
      isActive: true,
      schoolId: degreeCollege.id,
    },
  });
  console.log("✅ Academic Years created");

  // ─────────────────────────────────────────────────────────────
  // 6. CLASS SECTIONS
  // ─────────────────────────────────────────────────────────────
  const hs9A = await prisma.classSection.create({
    data: { grade: "9", section: "A", name: "9-A", schoolId: highSchool.id },
  });
  const hs9B = await prisma.classSection.create({
    data: { grade: "9", section: "B", name: "9-B", schoolId: highSchool.id },
  });
  const hs10A = await prisma.classSection.create({
    data: { grade: "10", section: "A", name: "10-A", schoolId: highSchool.id },
  });
  const hs10B = await prisma.classSection.create({
    data: { grade: "10", section: "B", name: "10-B", schoolId: highSchool.id },
  });

  const dcFyCSA = await prisma.classSection.create({
    data: {
      grade: "FY-CS",
      section: "A",
      name: "FY-CS-A",
      schoolId: degreeCollege.id,
    },
  });
  const dcSyCSB = await prisma.classSection.create({
    data: {
      grade: "SY-CS",
      section: "B",
      name: "SY-CS-B",
      schoolId: degreeCollege.id,
    },
  });
  const dcTyBBAA = await prisma.classSection.create({
    data: {
      grade: "TY-BBA",
      section: "A",
      name: "TY-BBA-A",
      schoolId: degreeCollege.id,
    },
  });
  console.log("✅ Class Sections created");

  // ─────────────────────────────────────────────────────────────
  // 7. TEACHERS
  // ─────────────────────────────────────────────────────────────
  const hsTeacher1User = await prisma.user.create({
    data: {
      name: "Teacher One",
      email: "teacher1@school.com",
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
      email: "teacher2@school.com",
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
      email: "teacher3@school.com",
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
      email: "teacher4@school.com",
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

  const hsTeacherProfile1 = await prisma.teacherProfile.findUniqueOrThrow({
    where: { userId: hsTeacher1User.id },
  });
  const hsTeacherProfile2 = await prisma.teacherProfile.findUniqueOrThrow({
    where: { userId: hsTeacher2User.id },
  });
  const dcTeacherProfile3 = await prisma.teacherProfile.findUniqueOrThrow({
    where: { userId: dcTeacher3User.id },
  });
  const dcTeacherProfile4 = await prisma.teacherProfile.findUniqueOrThrow({
    where: { userId: dcTeacher4User.id },
  });
  console.log("✅ Teachers created");

  // ─────────────────────────────────────────────────────────────
  // 8. CLASS SECTION × ACADEMIC YEAR
  // ─────────────────────────────────────────────────────────────
  await prisma.classSectionAcademicYear.createMany({
    data: [
      {
        classSectionId: hs9A.id,
        academicYearId: hsAcademicYear.id,
        classTeacherId: hsTeacherProfile1.id,
        isActive: true,
      },
      {
        classSectionId: hs9B.id,
        academicYearId: hsAcademicYear.id,
        classTeacherId: hsTeacherProfile2.id,
        isActive: true,
      },
      {
        classSectionId: hs10A.id,
        academicYearId: hsAcademicYear.id,
        classTeacherId: hsTeacherProfile1.id,
        isActive: true,
      },
      {
        classSectionId: hs10B.id,
        academicYearId: hsAcademicYear.id,
        classTeacherId: hsTeacherProfile2.id,
        isActive: true,
      },
      {
        classSectionId: dcFyCSA.id,
        academicYearId: dcAcademicYear.id,
        classTeacherId: dcTeacherProfile3.id,
        isActive: true,
      },
      {
        classSectionId: dcSyCSB.id,
        academicYearId: dcAcademicYear.id,
        classTeacherId: dcTeacherProfile3.id,
        isActive: true,
      },
      {
        classSectionId: dcTyBBAA.id,
        academicYearId: dcAcademicYear.id,
        classTeacherId: dcTeacherProfile4.id,
        isActive: true,
      },
    ],
  });
  console.log("✅ Class Section × Academic Year links created");

  // ─────────────────────────────────────────────────────────────
  // 9. SUBJECTS
  // ─────────────────────────────────────────────────────────────
  const hsMath9 = await prisma.subject.create({
    data: {
      name: "Mathematics",
      code: "HS-MATH-9",
      gradeLevel: "9",
      schoolId: highSchool.id,
    },
  });
  const hsPhysics9 = await prisma.subject.create({
    data: {
      name: "Physics",
      code: "HS-PHY-9",
      gradeLevel: "9",
      schoolId: highSchool.id,
    },
  });
  const hsEnglish9 = await prisma.subject.create({
    data: {
      name: "English",
      code: "HS-ENG-9",
      gradeLevel: "9",
      schoolId: highSchool.id,
    },
  });
  const hsMath10 = await prisma.subject.create({
    data: {
      name: "Mathematics",
      code: "HS-MATH-10",
      gradeLevel: "10",
      schoolId: highSchool.id,
    },
  });
  const hsScience10 = await prisma.subject.create({
    data: {
      name: "Science",
      code: "HS-SCI-10",
      gradeLevel: "10",
      schoolId: highSchool.id,
    },
  });
  const hsEnglish10 = await prisma.subject.create({
    data: {
      name: "English",
      code: "HS-ENG-10",
      gradeLevel: "10",
      schoolId: highSchool.id,
    },
  });

  const dcDS = await prisma.subject.create({
    data: {
      name: "Data Structures",
      code: "CS-DS-101",
      gradeLevel: "FY-CS",
      schoolId: degreeCollege.id,
    },
  });
  const dcMath = await prisma.subject.create({
    data: {
      name: "Engineering Mathematics",
      code: "CS-MATH-101",
      gradeLevel: "FY-CS",
      schoolId: degreeCollege.id,
    },
  });
  const dcDBMS = await prisma.subject.create({
    data: {
      name: "Database Management Systems",
      code: "CS-DBMS-201",
      gradeLevel: "SY-CS",
      schoolId: degreeCollege.id,
    },
  });
  const dcOS = await prisma.subject.create({
    data: {
      name: "Operating Systems",
      code: "CS-OS-201",
      gradeLevel: "SY-CS",
      schoolId: degreeCollege.id,
    },
  });
  const dcMktg = await prisma.subject.create({
    data: {
      name: "Marketing Management",
      code: "BBA-MKT-301",
      gradeLevel: "TY-BBA",
      schoolId: degreeCollege.id,
    },
  });
  const dcFin = await prisma.subject.create({
    data: {
      name: "Financial Management",
      code: "BBA-FIN-301",
      gradeLevel: "TY-BBA",
      schoolId: degreeCollege.id,
    },
  });
  console.log("✅ Subjects created");

  // ─────────────────────────────────────────────────────────────
  // 10. CLASS SUBJECTS
  // ─────────────────────────────────────────────────────────────
  await prisma.classSubject.createMany({
    data: [
      {
        classSectionId: hs9A.id,
        subjectId: hsMath9.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        classSectionId: hs9A.id,
        subjectId: hsPhysics9.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        classSectionId: hs9A.id,
        subjectId: hsEnglish9.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        classSectionId: hs9B.id,
        subjectId: hsMath9.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        classSectionId: hs9B.id,
        subjectId: hsPhysics9.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        classSectionId: hs9B.id,
        subjectId: hsEnglish9.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        classSectionId: hs10A.id,
        subjectId: hsMath10.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        classSectionId: hs10A.id,
        subjectId: hsScience10.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        classSectionId: hs10A.id,
        subjectId: hsEnglish10.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        classSectionId: hs10B.id,
        subjectId: hsMath10.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        classSectionId: hs10B.id,
        subjectId: hsScience10.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        classSectionId: hs10B.id,
        subjectId: hsEnglish10.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        classSectionId: dcFyCSA.id,
        subjectId: dcDS.id,
        academicYearId: dcAcademicYear.id,
      },
      {
        classSectionId: dcFyCSA.id,
        subjectId: dcMath.id,
        academicYearId: dcAcademicYear.id,
      },
      {
        classSectionId: dcSyCSB.id,
        subjectId: dcDBMS.id,
        academicYearId: dcAcademicYear.id,
      },
      {
        classSectionId: dcSyCSB.id,
        subjectId: dcOS.id,
        academicYearId: dcAcademicYear.id,
      },
      {
        classSectionId: dcTyBBAA.id,
        subjectId: dcMktg.id,
        academicYearId: dcAcademicYear.id,
      },
      {
        classSectionId: dcTyBBAA.id,
        subjectId: dcFin.id,
        academicYearId: dcAcademicYear.id,
      },
    ],
  });
  console.log("✅ Class Subjects assigned");

  // ─────────────────────────────────────────────────────────────
  // 11. TEACHER ASSIGNMENTS
  // ─────────────────────────────────────────────────────────────
  await prisma.teacherAssignment.createMany({
    data: [
      {
        teacherId: hsTeacherProfile1.id,
        classSectionId: hs9A.id,
        subjectId: hsMath9.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        teacherId: hsTeacherProfile1.id,
        classSectionId: hs9B.id,
        subjectId: hsMath9.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        teacherId: hsTeacherProfile1.id,
        classSectionId: hs10A.id,
        subjectId: hsMath10.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        teacherId: hsTeacherProfile1.id,
        classSectionId: hs10B.id,
        subjectId: hsMath10.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        teacherId: hsTeacherProfile2.id,
        classSectionId: hs9A.id,
        subjectId: hsPhysics9.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        teacherId: hsTeacherProfile2.id,
        classSectionId: hs9B.id,
        subjectId: hsPhysics9.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        teacherId: hsTeacherProfile2.id,
        classSectionId: hs10A.id,
        subjectId: hsScience10.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        teacherId: hsTeacherProfile2.id,
        classSectionId: hs10B.id,
        subjectId: hsScience10.id,
        academicYearId: hsAcademicYear.id,
      },
      {
        teacherId: dcTeacherProfile3.id,
        classSectionId: dcFyCSA.id,
        subjectId: dcDS.id,
        academicYearId: dcAcademicYear.id,
      },
      {
        teacherId: dcTeacherProfile3.id,
        classSectionId: dcFyCSA.id,
        subjectId: dcMath.id,
        academicYearId: dcAcademicYear.id,
      },
      {
        teacherId: dcTeacherProfile3.id,
        classSectionId: dcSyCSB.id,
        subjectId: dcDBMS.id,
        academicYearId: dcAcademicYear.id,
      },
      {
        teacherId: dcTeacherProfile3.id,
        classSectionId: dcSyCSB.id,
        subjectId: dcOS.id,
        academicYearId: dcAcademicYear.id,
      },
      {
        teacherId: dcTeacherProfile4.id,
        classSectionId: dcTyBBAA.id,
        subjectId: dcMktg.id,
        academicYearId: dcAcademicYear.id,
      },
      {
        teacherId: dcTeacherProfile4.id,
        classSectionId: dcTyBBAA.id,
        subjectId: dcFin.id,
        academicYearId: dcAcademicYear.id,
      },
    ],
  });
  console.log("✅ Teacher Assignments created");

  // ─────────────────────────────────────────────────────────────
  // 12. STUDENTS
  // ─────────────────────────────────────────────────────────────
  const student1 = await prisma.student.create({
    data: {
      name: "Student One",
      email: "student1@school.com",
      password,
      schoolId: highSchool.id,
      personalInfo: {
        create: {
          firstName: "Student",
          lastName: "One",
          dateOfBirth: new Date("2008-03-15"),
          gender: "MALE",
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

  const student2 = await prisma.student.create({
    data: {
      name: "Student Two",
      email: "student2@school.com",
      password,
      schoolId: highSchool.id,
      personalInfo: {
        create: {
          firstName: "Student",
          lastName: "Two",
          dateOfBirth: new Date("2008-07-22"),
          gender: "FEMALE",
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

  const student3 = await prisma.student.create({
    data: {
      name: "Student Three",
      email: "student3@school.com",
      password,
      schoolId: highSchool.id,
      personalInfo: {
        create: {
          firstName: "Student",
          lastName: "Three",
          dateOfBirth: new Date("2009-11-05"),
          gender: "MALE",
          admissionDate: new Date("2023-06-01"),
          status: "ACTIVE",
          bloodGroup: "A_POS",
        },
      },
    },
  });

  const student4 = await prisma.student.create({
    data: {
      name: "Student Four",
      email: "student4@school.com",
      password,
      schoolId: degreeCollege.id,
      personalInfo: {
        create: {
          firstName: "Student",
          lastName: "Four",
          dateOfBirth: new Date("2004-05-18"),
          gender: "FEMALE",
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

  const student5 = await prisma.student.create({
    data: {
      name: "Student Five",
      email: "student5@school.com",
      password,
      schoolId: degreeCollege.id,
      personalInfo: {
        create: {
          firstName: "Student",
          lastName: "Five",
          dateOfBirth: new Date("2003-09-30"),
          gender: "MALE",
          admissionDate: new Date("2022-08-01"),
          status: "ACTIVE",
          bloodGroup: "O_NEG",
        },
      },
    },
  });
  console.log("✅ Students created");

  // ─────────────────────────────────────────────────────────────
  // 13. STUDENT ENROLLMENTS
  // ─────────────────────────────────────────────────────────────
  await prisma.studentEnrollment.createMany({
    data: [
      {
        studentId: student1.id,
        classSectionId: hs10A.id,
        academicYearId: hsAcademicYear.id,
        rollNumber: "HS-2024-001",
        status: "ACTIVE",
      },
      {
        studentId: student2.id,
        classSectionId: hs10A.id,
        academicYearId: hsAcademicYear.id,
        rollNumber: "HS-2024-002",
        status: "ACTIVE",
      },
      {
        studentId: student3.id,
        classSectionId: hs9B.id,
        academicYearId: hsAcademicYear.id,
        rollNumber: "HS-2024-003",
        status: "ACTIVE",
      },
      {
        studentId: student4.id,
        classSectionId: dcSyCSB.id,
        academicYearId: dcAcademicYear.id,
        rollNumber: "DC-2023-001",
        status: "ACTIVE",
      },
      {
        studentId: student5.id,
        classSectionId: dcTyBBAA.id,
        academicYearId: dcAcademicYear.id,
        rollNumber: "DC-2022-001",
        status: "ACTIVE",
      },
    ],
  });
  console.log("✅ Student Enrollments created");

  // ─────────────────────────────────────────────────────────────
  // 14. PARENTS
  // ─────────────────────────────────────────────────────────────
  await prisma.parent.createMany({
    data: [
      {
        name: "Parent One",
        email: "parent1@school.com",
        password,
        phone: "+91 98765 66661",
        schoolId: highSchool.id,
      },
      {
        name: "Parent Two",
        email: "parent2@school.com",
        password,
        phone: "+91 98765 66662",
        schoolId: highSchool.id,
      },
      {
        name: "Parent Three",
        email: "parent3@school.com",
        password,
        phone: "+91 98765 77771",
        schoolId: degreeCollege.id,
      },
    ],
  });
  console.log("✅ Parents created");

  // ─────────────────────────────────────────────────────────────
  // 15. ASSESSMENT TERMS
  // ─────────────────────────────────────────────────────────────
  const hsTerm1 = await prisma.assessmentTerm.create({
    data: {
      name: "Term 1",
      order: 1,
      academicYearId: hsAcademicYear.id,
      schoolId: highSchool.id,
    },
  });
  const hsTerm2 = await prisma.assessmentTerm.create({
    data: {
      name: "Term 2",
      order: 2,
      academicYearId: hsAcademicYear.id,
      schoolId: highSchool.id,
    },
  });
  const dcSem1 = await prisma.assessmentTerm.create({
    data: {
      name: "Semester 1",
      order: 1,
      academicYearId: dcAcademicYear.id,
      schoolId: degreeCollege.id,
    },
  });
  const dcSem2 = await prisma.assessmentTerm.create({
    data: {
      name: "Semester 2",
      order: 2,
      academicYearId: dcAcademicYear.id,
      schoolId: degreeCollege.id,
    },
  });
  console.log("✅ Assessment Terms created");

  // ─────────────────────────────────────────────────────────────
  // 16. ASSESSMENT GROUPS
  // ─────────────────────────────────────────────────────────────
  const hsUT1 = await prisma.assessmentGroup.create({
    data: {
      name: "Unit Test 1",
      weightage: 10,
      termId: hsTerm1.id,
      academicYearId: hsAcademicYear.id,
      schoolId: highSchool.id,
    },
  });
  const hsMidTerm = await prisma.assessmentGroup.create({
    data: {
      name: "Mid-Term Exam",
      weightage: 30,
      termId: hsTerm1.id,
      academicYearId: hsAcademicYear.id,
      schoolId: highSchool.id,
    },
  });
  const hsUT2 = await prisma.assessmentGroup.create({
    data: {
      name: "Unit Test 2",
      weightage: 10,
      termId: hsTerm2.id,
      academicYearId: hsAcademicYear.id,
      schoolId: highSchool.id,
    },
  });
  const hsFinal = await prisma.assessmentGroup.create({
    data: {
      name: "Final Exam",
      weightage: 50,
      termId: hsTerm2.id,
      academicYearId: hsAcademicYear.id,
      schoolId: highSchool.id,
    },
  });

  const dcIA1 = await prisma.assessmentGroup.create({
    data: {
      name: "IA 1",
      weightage: 20,
      termId: dcSem1.id,
      academicYearId: dcAcademicYear.id,
      schoolId: degreeCollege.id,
    },
  });
  const dcIA2 = await prisma.assessmentGroup.create({
    data: {
      name: "IA 2",
      weightage: 20,
      termId: dcSem1.id,
      academicYearId: dcAcademicYear.id,
      schoolId: degreeCollege.id,
    },
  });
  const dcSemExam = await prisma.assessmentGroup.create({
    data: {
      name: "Semester Exam",
      weightage: 60,
      termId: dcSem1.id,
      academicYearId: dcAcademicYear.id,
      schoolId: degreeCollege.id,
    },
  });
  console.log("✅ Assessment Groups created");

  // ─────────────────────────────────────────────────────────────
  // 17. ASSESSMENT SCHEDULES
  // ─────────────────────────────────────────────────────────────
  const hsMidMathSchedule = await prisma.assessmentSchedule.create({
    data: {
      assessmentGroupId: hsMidTerm.id,
      classSectionId: hs10A.id,
      subjectId: hsMath10.id,
      maxMarks: 100,
      passingMarks: 35,
      examDate: new Date("2024-10-05"),
      startTime: new Date("2024-10-05T10:00:00"),
      endTime: new Date("2024-10-05T13:00:00"),
    },
  });

  const hsMidSciSchedule = await prisma.assessmentSchedule.create({
    data: {
      assessmentGroupId: hsMidTerm.id,
      classSectionId: hs10A.id,
      subjectId: hsScience10.id,
      maxMarks: 100,
      passingMarks: 35,
      examDate: new Date("2024-10-07"),
      startTime: new Date("2024-10-07T10:00:00"),
      endTime: new Date("2024-10-07T13:00:00"),
    },
  });

  const dcIA1DSSchedule = await prisma.assessmentSchedule.create({
    data: {
      assessmentGroupId: dcIA1.id,
      classSectionId: dcFyCSA.id,
      subjectId: dcDS.id,
      maxMarks: 50,
      passingMarks: 20,
      examDate: new Date("2024-09-15"),
      startTime: new Date("2024-09-15T09:00:00"),
      endTime: new Date("2024-09-15T10:30:00"),
    },
  });

  const dcIA1MathSchedule = await prisma.assessmentSchedule.create({
    data: {
      assessmentGroupId: dcIA1.id,
      classSectionId: dcFyCSA.id,
      subjectId: dcMath.id,
      maxMarks: 50,
      passingMarks: 20,
      examDate: new Date("2024-09-17"),
      startTime: new Date("2024-09-17T09:00:00"),
      endTime: new Date("2024-09-17T10:30:00"),
    },
  });
  console.log("✅ Assessment Schedules created");

  // ─────────────────────────────────────────────────────────────
  // 18. MARKS
  // ─────────────────────────────────────────────────────────────
  await prisma.marks.createMany({
    data: [
      {
        scheduleId: hsMidMathSchedule.id,
        studentId: student1.id,
        marksObtained: 78,
        isAbsent: false,
      },
      {
        scheduleId: hsMidMathSchedule.id,
        studentId: student2.id,
        marksObtained: 85,
        isAbsent: false,
      },
      {
        scheduleId: hsMidSciSchedule.id,
        studentId: student1.id,
        marksObtained: 65,
        isAbsent: false,
      },
      {
        scheduleId: hsMidSciSchedule.id,
        studentId: student2.id,
        isAbsent: true,
      },
      {
        scheduleId: dcIA1DSSchedule.id,
        studentId: student4.id,
        marksObtained: 42,
        isAbsent: false,
      },
      {
        scheduleId: dcIA1MathSchedule.id,
        studentId: student4.id,
        marksObtained: 38,
        isAbsent: false,
      },
    ],
  });
  console.log("✅ Marks entered");

  // ─────────────────────────────────────────────────────────────
  // 19. TIMETABLE CONFIG + SLOTS  ← label field added to every slot
  // ─────────────────────────────────────────────────────────────
  const hsTimetableConfig = await prisma.timetableConfig.create({
    data: {
      schoolId: highSchool.id,
      academicYearId: hsAcademicYear.id,
      startTime: "08:30",
      endTime: "15:30",
      periodDuration: 45,
      totalPeriods: 8,
      slots: {
        create: [
          {
            slotOrder: 1,
            slotType: "PRAYER",
            label: "Prayer / Assembly",
            startTime: "08:30",
            endTime: "08:45",
          },
          {
            slotOrder: 2,
            slotType: "PERIOD",
            label: "Period 1",
            startTime: "08:45",
            endTime: "09:30",
          },
          {
            slotOrder: 3,
            slotType: "PERIOD",
            label: "Period 2",
            startTime: "09:30",
            endTime: "10:15",
          },
          {
            slotOrder: 4,
            slotType: "SHORT_BREAK",
            label: "Short Break",
            startTime: "10:15",
            endTime: "10:30",
          },
          {
            slotOrder: 5,
            slotType: "PERIOD",
            label: "Period 3",
            startTime: "10:30",
            endTime: "11:15",
          },
          {
            slotOrder: 6,
            slotType: "PERIOD",
            label: "Period 4",
            startTime: "11:15",
            endTime: "12:00",
          },
          {
            slotOrder: 7,
            slotType: "LUNCH_BREAK",
            label: "Lunch Break",
            startTime: "12:00",
            endTime: "12:45",
          },
          {
            slotOrder: 8,
            slotType: "PERIOD",
            label: "Period 5",
            startTime: "12:45",
            endTime: "13:30",
          },
          {
            slotOrder: 9,
            slotType: "PERIOD",
            label: "Period 6",
            startTime: "13:30",
            endTime: "14:15",
          },
          {
            slotOrder: 10,
            slotType: "PERIOD",
            label: "Period 7",
            startTime: "14:15",
            endTime: "15:00",
          },
          {
            slotOrder: 11,
            slotType: "OTHER",
            label: "Extra Activity",
            startTime: "15:00",
            endTime: "15:30",
          },
        ],
      },
    },
    include: { slots: true },
  });

  // Pick only PERIOD slots for timetable entries
  const periodSlots = hsTimetableConfig.slots
    .filter((s) => s.slotType === "PERIOD")
    .sort((a, b) => a.slotOrder - b.slotOrder);

  const [p1, p2, p3, p4, p5, p6, p7] = periodSlots;

  // ─────────────────────────────────────────────────────────────
  // 20. TIMETABLE ENTRIES for 10-A (Monday + Tuesday sample)
  // ─────────────────────────────────────────────────────────────
  await prisma.timetableEntry.createMany({
    data: [
      // Monday — 10-A
      {
        schoolId: highSchool.id,
        academicYearId: hsAcademicYear.id,
        classSectionId: hs10A.id,
        teacherId: hsTeacherProfile1.id,
        subjectId: hsMath10.id,
        periodSlotId: p1.id,
        day: "MONDAY",
      },
      {
        schoolId: highSchool.id,
        academicYearId: hsAcademicYear.id,
        classSectionId: hs10A.id,
        teacherId: hsTeacherProfile2.id,
        subjectId: hsScience10.id,
        periodSlotId: p2.id,
        day: "MONDAY",
      },
      {
        schoolId: highSchool.id,
        academicYearId: hsAcademicYear.id,
        classSectionId: hs10A.id,
        teacherId: hsTeacherProfile1.id,
        subjectId: hsMath10.id,
        periodSlotId: p3.id,
        day: "MONDAY",
      },
      // Tuesday — 10-A
      {
        schoolId: highSchool.id,
        academicYearId: hsAcademicYear.id,
        classSectionId: hs10A.id,
        teacherId: hsTeacherProfile2.id,
        subjectId: hsScience10.id,
        periodSlotId: p1.id,
        day: "TUESDAY",
      },
      {
        schoolId: highSchool.id,
        academicYearId: hsAcademicYear.id,
        classSectionId: hs10A.id,
        teacherId: hsTeacherProfile1.id,
        subjectId: hsMath10.id,
        periodSlotId: p2.id,
        day: "TUESDAY",
      },
    ],
  });
  console.log("✅ Timetable Config, Slots, and Entries created");

  // ─────────────────────────────────────────────────────────────
// 4B. FINANCE ADMINS
// ─────────────────────────────────────────────────────────────

const highSchoolFinance = await prisma.user.create({
  data: {
    name: "Finance Manager HS",
    email: "finance1@school.com",
    password,
    role: "FINANCE",
    schoolId: highSchool.id,
    financeProfile: {
      create: {
        schoolId: highSchool.id,
        employeeCode: "HS-FIN-001",
        designation: "Finance Manager",
        phone: "+91 98765 88881",
        salary: 50000,
      },
    },
  },
});

const degreeFinance = await prisma.user.create({
  data: {
    name: "Finance Manager DC",
    email: "finance2@school.com",
    password,
    role: "FINANCE",
    schoolId: degreeCollege.id,
    financeProfile: {
      create: {
        schoolId: degreeCollege.id,
        employeeCode: "DC-FIN-001",
        designation: "Accounts Officer",
        phone: "+91 98765 88882",
        salary: 60000,
      },
    },
  },
});

console.log("✅ Finance Admins created");

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
║    teacher1@school.com  (Math — 9-A, 9-B, 10-A, 10-B)   ║
║    teacher2@school.com  (Sci  — 9-A, 9-B, 10-A, 10-B)   ║
║    student1@school.com  (10-A)                           ║
║    student2@school.com  (10-A)                           ║
║    student3@school.com  (9-B)                            ║
║    parent1@school.com                                    ║
║    parent2@school.com                                    ║
╠══════════════════════════════════════════════════════════╣
║  DEGREE COLLEGE  →  school code: CHRIST_DEGREE           ║
║    admin2@school.com                                     ║
║    teacher3@school.com  (CS subjects — FY-CS-A, SY-CS-B) ║
║    teacher4@school.com  (BBA subjects — TY-BBA-A)        ║
║    student4@school.com  (SY-CS-B)                        ║
║    student5@school.com  (TY-BBA-A)                       ║
║    parent3@school.com                                    ║
╚══════════════════════════════════════════════════════════╝
║  HIGH SCHOOL  →  school code: CHRIST_HIGH
║    finance1@school.com
║
║  DEGREE COLLEGE  →  school code: CHRIST_DEGREE
║    finance2@school.com


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
