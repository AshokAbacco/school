// prisma/seed.js
// ═══════════════════════════════════════════════════════════════════════════════
//  MULTI-INSTITUTION SEED  —  Updated for new schema
//
//  New schema fields covered:
//    • Stream.hasCombinations  (Boolean)
//    • StreamCombination       model (PCMB, PCMC, CEBA, SEBA, HEP)
//    • ClassSection.combinationId  FK → StreamCombination
//    • Course.hasBranches      (Boolean)
//
//  Creates 3 schools under one university:
//    1. Springfield High School    (SCHOOL  — Grades 1–10, Sections A & B)
//       → 120 students/section
//    2. Springfield PUC            (PUC     — Grades 11–12)
//       Science  (hasCombinations:true)  → PCMB (A,B), PCMC (A,B)
//       Commerce (hasCombinations:true)  → CEBA (A,B), SEBA (A,B)
//       Arts     (hasCombinations:false) → HEP  (A,B)
//       → 110 students/section
//    3. Springfield Degree College (DEGREE)
//       BE  (hasBranches:true)  — CSE, ECE, ME — Sem 1–8, Section A
//       BA  (hasBranches:false) — Sem 1–6, Sections A & B
//       → 100 students/section
//
//  Passwords  : 123456
//  Admins     : admin1@gmail.com | admin2@gmail.com | admin3@gmail.com
//  Super Admin: superadmin@gmail.com
//  Teachers   : teacher1@gmail.com … (global sequential)
//  Students   : student1@gmail.com … (global sequential)
//  Parents    : parent1@gmail.com  … (global sequential)
// ═══════════════════════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = "123456";

// ── Global counters (shared so emails never collide across schools) ────────────
let TEACHER_CTR = 1;
let STUDENT_CTR = 1;
let PARENT_CTR = 1;

// ── Name pools ────────────────────────────────────────────────────────────────
const MALE_NAMES = [
  "Aarav",
  "Rohan",
  "Kiran",
  "Amit",
  "Suresh",
  "Vijay",
  "Ravi",
  "Mohan",
  "Sanjay",
  "Arjun",
  "Nikhil",
  "Pranav",
  "Harsh",
  "Dev",
  "Raj",
  "Vikram",
  "Arun",
  "Deepak",
  "Kartik",
  "Ankit",
  "Rahul",
  "Varun",
  "Tarun",
  "Manish",
  "Dinesh",
  "Ganesh",
  "Mahesh",
  "Naresh",
  "Sunil",
  "Manoj",
  "Raghu",
  "Shyam",
  "Chetan",
  "Girish",
  "Satish",
  "Hemant",
  "Madan",
  "Kishan",
  "Naveen",
  "Sridhar",
];
const FEMALE_NAMES = [
  "Priya",
  "Anjali",
  "Divya",
  "Sunita",
  "Rekha",
  "Meena",
  "Kavitha",
  "Pooja",
  "Nisha",
  "Anita",
  "Sneha",
  "Deepa",
  "Ritu",
  "Neha",
  "Swati",
  "Lakshmi",
  "Savitha",
  "Nalini",
  "Vidya",
  "Hema",
  "Meera",
  "Padma",
  "Sudha",
  "Archana",
  "Preethi",
  "Mala",
  "Usha",
  "Geetha",
  "Leela",
  "Saritha",
  "Vimala",
  "Kamala",
  "Radha",
  "Sita",
  "Latha",
  "Suma",
  "Veena",
  "Asha",
  "Nandini",
  "Pallavi",
];
const LAST_NAMES = [
  "Sharma",
  "Patel",
  "Kumar",
  "Singh",
  "Nair",
  "Rao",
  "Iyer",
  "Verma",
  "Pillai",
  "Menon",
  "Joshi",
  "Desai",
  "Gupta",
  "Reddy",
  "Bose",
  "Ghosh",
  "Shah",
  "Trivedi",
  "Kulkarni",
  "Pandey",
  "Nambiar",
  "Shetty",
  "Hegde",
  "Kamath",
  "Naidu",
  "Chandra",
  "Mishra",
  "Tiwari",
  "Dubey",
  "Das",
  "Rajan",
  "Mohan",
  "Krishnan",
  "Subramaniam",
  "Balaji",
  "Murthy",
  "Gowda",
  "Yadav",
  "Patil",
  "Mali",
];
const PARENT_NAMES = [
  "Rajesh",
  "Sunil",
  "Manoj",
  "Anil",
  "Ramesh",
  "Suresh",
  "Dinesh",
  "Ganesh",
  "Mahesh",
  "Naresh",
  "Rajan",
  "Mohan",
  "Sohan",
  "Kishan",
  "Madan",
  "Chetan",
  "Hemant",
  "Girish",
  "Satish",
  "Umesh",
];
const CITIES = [
  "Bengaluru",
  "Chennai",
  "Hyderabad",
  "Mumbai",
  "Pune",
  "Delhi",
  "Kolkata",
  "Jaipur",
  "Mysuru",
  "Mangaluru",
];
const STATES = [
  "Karnataka",
  "Tamil Nadu",
  "Telangana",
  "Maharashtra",
  "Maharashtra",
  "Delhi",
  "West Bengal",
  "Rajasthan",
  "Karnataka",
  "Karnataka",
];
const ZIPS = [
  "560001",
  "600001",
  "500001",
  "400001",
  "411001",
  "110001",
  "700001",
  "302001",
  "570001",
  "575001",
];
const BLOOD_GROUPS = [
  "A_POS",
  "A_NEG",
  "B_POS",
  "B_NEG",
  "O_POS",
  "O_NEG",
  "AB_POS",
  "AB_NEG",
];
const OCCS = [
  "Engineer",
  "Doctor",
  "Teacher",
  "Business Owner",
  "Government Employee",
  "Nurse",
  "Accountant",
  "Lawyer",
  "Farmer",
  "Shopkeeper",
];
const GENDERS = ["MALE", "FEMALE"];

const pick = (arr, i) => arr[Math.abs(i) % arr.length];

// ── Date helpers ──────────────────────────────────────────────────────────────
function studentDOB(idx, baseAge = 8) {
  const y = new Date().getFullYear() - (baseAge + (idx % 5));
  const m = ((idx * 3) % 12) + 1;
  const d = ((idx * 7) % 28) + 1;
  return new Date(
    `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
  );
}
function admDate(idx) {
  return new Date(`${2021 + (idx % 4)}-06-01`);
}

// ── Period definition builder (replaces old buildSlots) ──────────────────────
// ✅ UPDATED: builds PeriodDefinition rows (not TimetablePeriodSlot rows)
// Matches exactly what buildPeriodDefinitions() in timetableConfigController does
function t2m(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function m2t(m) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function buildPeriodDefinitionData(cfg, dayType) {
  const defs = [];
  let order = 1;
  let cur = t2m(cfg.startTime);
  const bm = {};
  (cfg.breaks || []).forEach((b) => (bm[b.afterPeriod] = b));

  for (let i = 1; i <= cfg.totalPeriods; i++) {
    defs.push({
      periodNumber: i,
      label: dayType === "SATURDAY" ? `Sat Period ${i}` : `Period ${i}`,
      slotType: "PERIOD",
      dayType,
      startTime: m2t(cur),
      endTime: m2t(cur + cfg.periodDuration),
      order: order++,
    });
    cur += cfg.periodDuration;

    if (bm[i]) {
      const b = bm[i];
      // Break periodNumber convention: 100 + afterPeriod (matches controller)
      defs.push({
        periodNumber: 100 + i,
        label: dayType === "SATURDAY" ? `Sat ${b.label}` : b.label,
        slotType: b.type || "SHORT_BREAK",
        dayType,
        startTime: m2t(cur),
        endTime: m2t(cur + b.duration),
        order: order++,
      });
      cur += b.duration;
    }
  }
  return defs;
}

const WD_CFG = {
  startTime: "08:00",
  periodDuration: 40,
  totalPeriods: 7,
  breaks: [
    { afterPeriod: 3, type: "SHORT_BREAK", label: "Short Break", duration: 10 },
    { afterPeriod: 5, type: "LUNCH_BREAK", label: "Lunch Break", duration: 30 },
  ],
};
const SAT_CFG = {
  startTime: "09:00",
  periodDuration: 35,
  totalPeriods: 5,
  breaks: [
    { afterPeriod: 3, type: "SHORT_BREAK", label: "Short Break", duration: 15 },
  ],
};
const ALL_DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

// ── Conflict-free timetable builder ──────────────────────────────────────────
// ✅ UPDATED: uses periodDefinitionId (not periodSlotId)
function buildTimetables(
  wdPeriodDefs,
  satPeriodDefs,
  subjects,
  tBySubject,
  sections,
) {
  // busy[teacherId][day][defId] = true
  const busy = {};
  for (const pool of Object.values(tBySubject))
    for (const t of pool) {
      busy[t.id] = {};
      for (const d of ALL_DAYS) busy[t.id][d] = {};
    }

  const result = new Map();
  for (const cs of sections) result.set(cs.id, []);

  for (let di = 0; di < ALL_DAYS.length; di++) {
    const day = ALL_DAYS[di];
    // ✅ Use periodDefinition objects (not slot objects)
    const defs = day === "SATURDAY" ? satPeriodDefs : wdPeriodDefs;
    for (let si = 0; si < defs.length; si++) {
      const def = defs[si];
      for (let ci = 0; ci < sections.length; ci++) {
        const cs = sections[ci];
        const subIdx = (ci + si + di * 3) % subjects.length;
        const subject = subjects[subIdx];
        const pool = tBySubject[subIdx];
        let assigned = false;
        for (const teacher of pool) {
          if (!busy[teacher.id][day][def.id]) {
            busy[teacher.id][day][def.id] = true;
            result.get(cs.id).push({
              day,
              periodDefinitionId: def.id, // ✅ UPDATED: was periodSlotId
              subjectId: subject.id,
              teacherId: teacher.id,
            });
            assigned = true;
            break;
          }
        }
        if (!assigned)
          console.warn(`⚠️  No free teacher: ${cs.name} ${day} ${def.label}`);
      }
    }
  }
  return result;
}

// ── Teacher factory ───────────────────────────────────────────────────────────
async function createTeachers(school, password, teacherDefs) {
  const allProfiles = [];
  const tBySubject = {};
  for (let i = 0; i < teacherDefs.subjectDefs.length; i++) tBySubject[i] = [];

  for (const def of teacherDefs.defs) {
    const n = TEACHER_CTR++;
    const email = `teacher${n}@gmail.com`;

    let user = await prisma.user.findUnique({
      where: { email_schoolId: { email, schoolId: school.id } },
    });
    if (!user)
      user = await prisma.user.create({
        data: {
          name: `${def.fn} ${def.ln}`,
          email,
          password,
          role: "TEACHER",
          schoolId: school.id,
        },
      });

    let prof = await prisma.teacherProfile.findUnique({
      where: { userId: user.id },
    });
    if (!prof) {
      const idx = def.n - 1;
      prof = await prisma.teacherProfile.create({
        data: {
          userId: user.id,
          schoolId: school.id,
          employeeCode: `${school.code.slice(0, 3)}-T${String(n).padStart(3, "0")}`,
          firstName: def.fn,
          lastName: def.ln,
          dateOfBirth: new Date(
            `${1970 + (idx % 25)}-${String((idx % 9) + 1).padStart(2, "0")}-15`,
          ),
          gender: idx % 2 === 0 ? "MALE" : "FEMALE",
          phone: `98${String(10000000 + idx * 1111111).slice(0, 8)}`,
          address: `${100 + idx}, Teacher Colony, Sector ${(idx % 10) + 1}`,
          city: pick(CITIES, idx),
          state: pick(STATES, idx),
          zipCode: pick(ZIPS, idx),
          department: def.dept,
          designation:
            idx < teacherDefs.subjectDefs.length ? "Senior Teacher" : "Teacher",
          qualification: "M.Sc, B.Ed",
          experienceYears: 2 + (idx % 18),
          joiningDate: new Date(`${2010 + (idx % 12)}-07-01`),
          employmentType: "FULL_TIME",
          salary: 28000 + idx * 1200,
          panNumber: `ABCDE${1000 + idx}F`,
          aadhaarNumber: String(200000000000 + idx * 11111111111),
        },
      });
    }
    allProfiles.push(prof);
    tBySubject[def.si].push(prof);
  }
  return { allProfiles, tBySubject };
}

// ── Timetable config factory ──────────────────────────────────────────────────
// ✅ UPDATED: Creates TimetableConfig + PeriodDefinition rows (not old slots)
//    TimetableConfig no longer has startTime/endTime/periodDuration/totalPeriods/slots
async function createTimetableConfig(school, ay) {
  let cfg = await prisma.timetableConfig.findUnique({
    where: {
      schoolId_academicYearId: { schoolId: school.id, academicYearId: ay.id },
    },
    include: { periodDefinitions: { orderBy: { order: "asc" } } },
  });

  if (!cfg) {
    const wdDefData = buildPeriodDefinitionData(WD_CFG, "WEEKDAY");
    const satDefData = buildPeriodDefinitionData(SAT_CFG, "SATURDAY");
    const totalDefs = [...wdDefData, ...satDefData];

    cfg = await prisma.timetableConfig.create({
      data: {
        schoolId: school.id,
        academicYearId: ay.id,
        weekdayTotalPeriods: WD_CFG.totalPeriods,
        saturdayTotalPeriods: SAT_CFG.totalPeriods,
        periodDefinitions: {
          createMany: { data: totalDefs },
        },
      },
      include: { periodDefinitions: { orderBy: { order: "asc" } } },
    });
  }

  // ✅ UPDATED: filter from periodDefinitions (not cfg.slots)
  // Only PERIOD slotType rows are used for timetable entry assignment
  const wdPeriodDefs = cfg.periodDefinitions.filter(
    (d) => d.slotType === "PERIOD" && d.dayType === "WEEKDAY",
  );
  const satPeriodDefs = cfg.periodDefinitions.filter(
    (d) => d.slotType === "PERIOD" && d.dayType === "SATURDAY",
  );

  return { configId: cfg.id, wdPeriodDefs, satPeriodDefs };
}

// ── Student + parent seeder for one class section ─────────────────────────────
async function seedStudents({ school, ay, cs, count, baseAge, password }) {
  for (let s = 1; s <= count; s++) {
    const sn = STUDENT_CTR++;
    const pn = PARENT_CTR++;
    const ci = sn % CITIES.length;
    const g = pick(GENDERS, sn);
    const fn = g === "MALE" ? pick(MALE_NAMES, sn) : pick(FEMALE_NAMES, sn);
    const ln = pick(LAST_NAMES, sn);
    const email = `student${sn}@gmail.com`;
    const rn = `${cs.grade.replace(/\s/g, "")}${cs.section || ""}${String(s).padStart(3, "0")}`;
    const an = `ADM${String(sn).padStart(6, "0")}`;

    let stu = await prisma.student.findFirst({
      where: { email, schoolId: school.id },
    });
    if (!stu)
      stu = await prisma.student.create({
        data: {
          name: `${fn} ${ln}`,
          email,
          password,
          schoolId: school.id,
        },
      });

    await prisma.studentPersonalInfo.upsert({
      where: { studentId: stu.id },
      update: {},
      create: {
        studentId: stu.id,
        firstName: fn,
        lastName: ln,
        dateOfBirth: studentDOB(sn, baseAge),
        gender: g,
        phone: `9${String(800000000 + sn).slice(0, 9)}`,
        address: `${sn}, ${fn} Nagar, Block ${(sn % 10) + 1}`,
        city: CITIES[ci],
        state: STATES[ci],
        zipCode: ZIPS[ci],
        bloodGroup: pick(BLOOD_GROUPS, sn),
        parentName: `${pick(PARENT_NAMES, sn)} ${ln}`,
        parentEmail: `parent${pn}@gmail.com`,
        parentPhone: `9${String(700000000 + sn).slice(0, 9)}`,
        emergencyContact: `9${String(600000000 + sn).slice(0, 9)}`,
      },
    });

    await prisma.studentEnrollment.upsert({
      where: {
        studentId_academicYearId: { studentId: stu.id, academicYearId: ay.id },
      },
      update: {},
      create: {
        admissionNumber: an,
        admissionDate: admDate(sn),
        studentId: stu.id,
        classSectionId: cs.id,
        academicYearId: ay.id,
        rollNumber: rn,
        status: "ACTIVE",
      },
    });

    const pe = `parent${pn}@gmail.com`;
    let par = await prisma.parent.findUnique({
      where: { email_schoolId: { email: pe, schoolId: school.id } },
    });
    if (!par)
      par = await prisma.parent.create({
        data: {
          name: `${pick(PARENT_NAMES, sn)} ${ln}`,
          email: pe,
          password,
          phone: `9${String(700000000 + sn).slice(0, 9)}`,
          occupation: pick(OCCS, sn),
          schoolId: school.id,
        },
      });

    await prisma.studentParent.upsert({
      where: { studentId_relation: { studentId: stu.id, relation: "FATHER" } },
      update: {},
      create: {
        studentId: stu.id,
        parentId: par.id,
        relation: "FATHER",
        isPrimary: true,
        emergencyContact: true,
      },
    });
  }
}

// ── Subject + teacher assignment linker ───────────────────────────────────────
async function linkSubjectsAndTeachers({
  cs,
  subjects,
  tBySubject,
  ay,
  gi,
  si,
}) {
  for (const subj of subjects) {
    await prisma.classSubject.upsert({
      where: {
        classSectionId_subjectId_academicYearId: {
          classSectionId: cs.id,
          subjectId: subj.id,
          academicYearId: ay.id,
        },
      },
      update: {},
      create: {
        classSectionId: cs.id,
        subjectId: subj.id,
        academicYearId: ay.id,
      },
    });
  }
  for (let ti = 0; ti < subjects.length; ti++) {
    const pool = tBySubject[ti];
    const pt =
      pool[Math.floor((gi * 2 + si) / subjects.length) % pool.length] ||
      pool[0];
    await prisma.teacherAssignment.upsert({
      where: {
        classSectionId_subjectId_academicYearId: {
          classSectionId: cs.id,
          subjectId: subjects[ti].id,
          academicYearId: ay.id,
        },
      },
      update: { teacherId: pt.id },
      create: {
        classSectionId: cs.id,
        subjectId: subjects[ti].id,
        academicYearId: ay.id,
        teacherId: pt.id,
      },
    });
  }
}

// ── Timetable entry writer ────────────────────────────────────────────────────
// ✅ UPDATED: uses periodDefinitionId + configId (not periodSlotId) in createMany data
async function writeTimetable(
  school,
  ay,
  subjects,
  tBySubject,
  allSections,
  wdPeriodDefs,
  satPeriodDefs,
  configId,
) {
  await prisma.timetableEntry.deleteMany({
    where: { schoolId: school.id, academicYearId: ay.id },
  });
  const ttMap = buildTimetables(
    wdPeriodDefs,
    satPeriodDefs,
    subjects,
    tBySubject,
    allSections,
  );
  let total = 0;
  for (const cs of allSections) {
    const entries = ttMap.get(cs.id) || [];
    if (entries.length) {
      await prisma.timetableEntry.createMany({
        data: entries.map((e) => ({
          schoolId: school.id,
          academicYearId: ay.id,
          classSectionId: cs.id,
          day: e.day,
          periodDefinitionId: e.periodDefinitionId, // ✅ UPDATED: was periodSlotId
          subjectId: e.subjectId,
          teacherId: e.teacherId,
          configId, // ✅ NEW: required FK to TimetableConfig
        })),
      });
    }
    total += entries.length;
  }
  return total;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  1. SCHOOL  —  Grades 1–10, Sections A & B, 120 students/section
// ═══════════════════════════════════════════════════════════════════════════════
async function seedSchool(university, password) {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   🏫  Springfield High School        ║");
  console.log("╚══════════════════════════════════════╝");

  const school = await prisma.school.upsert({
    where: { code: "SPRINGFIELD_HIGH" },
    update: {},
    create: {
      name: "Springfield High School",
      code: "SPRINGFIELD_HIGH",
      type: "SCHOOL",
      address: "456 School Lane",
      city: "Bengaluru",
      state: "Karnataka",
      phone: "080-11111111",
      email: "school@springfield.edu",
      universityId: university.id,
    },
  });

  await prisma.user.upsert({
    where: {
      email_schoolId: { email: "admin1@gmail.com", schoolId: school.id },
    },
    update: {},
    create: {
      name: "School Admin",
      email: "admin1@gmail.com",
      password,
      role: "ADMIN",
      schoolId: school.id,
    },
  });
  console.log("   ✅  Admin: admin1@gmail.com");
  // Finance Admin
  const financeUser = await prisma.user.upsert({
    where: {
      email_schoolId: { email: "finance1@gmail.com", schoolId: school.id },
    },
    update: {},
    create: {
      name: "Finance Admin",
      email: "finance1@gmail.com",
      password,
      role: "FINANCE",
      schoolId: school.id,
    },
  });

  await prisma.financeProfile.upsert({
    where: { userId: financeUser.id },
    update: {},
    create: {
      userId: financeUser.id,
      schoolId: school.id,
      employeeCode: "FIN-001",
      designation: "Finance Officer",
      phone: "9000000001",
    },
  });

  console.log("   💰  Finance Admin: finance1@gmail.com");
  await prisma.schoolPromotionConfig.upsert({
    where: { schoolId: school.id },
    update: {},
    create: {
      schoolId: school.id,
      skipGrades: ["7"],
      lastGrade: "10",
      firstGrade: "1",
    },
  });

  const ay = await prisma.academicYear.upsert({
    where: { name_schoolId: { name: "2025-26", schoolId: school.id } },
    update: { isActive: true },
    create: {
      name: "2025-26",
      startDate: new Date("2025-06-01"),
      endDate: new Date("2026-03-31"),
      isActive: true,
      schoolId: school.id,
    },
  });

  // Subjects
  const SUBJ_DEFS = [
    { name: "Mathematics", code: "SCH-MATH" },
    { name: "Science", code: "SCH-SCI" },
    { name: "English", code: "SCH-ENG" },
    { name: "Social Studies", code: "SCH-SST" },
    { name: "Hindi", code: "SCH-HIN" },
    { name: "Computer Science", code: "SCH-CS" },
    { name: "Physical Education", code: "SCH-PE" },
  ];
  const subjects = [];
  for (const d of SUBJ_DEFS)
    subjects.push(
      await prisma.subject.upsert({
        where: { code_schoolId: { code: d.code, schoolId: school.id } },
        update: { name: d.name },
        create: { name: d.name, code: d.code, schoolId: school.id },
      }),
    );
  console.log(`   ✅  ${subjects.length} subjects`);

  const tStart = TEACHER_CTR;
  const { allProfiles, tBySubject } = await createTeachers(school, password, {
    subjectDefs: SUBJ_DEFS,
    defs: [
      { n: 1, fn: "Arjun", ln: "Sharma", dept: "Mathematics", si: 0 },
      { n: 2, fn: "Naveen", ln: "Reddy", dept: "Mathematics", si: 0 },
      { n: 3, fn: "Sanjana", ln: "Bose", dept: "Mathematics", si: 0 },
      { n: 4, fn: "Priya", ln: "Nair", dept: "Science", si: 1 },
      { n: 5, fn: "Ramesh", ln: "Joshi", dept: "Science", si: 1 },
      { n: 6, fn: "Leela", ln: "Desai", dept: "Science", si: 1 },
      { n: 7, fn: "Rahul", ln: "Verma", dept: "English", si: 2 },
      { n: 8, fn: "Sunita", ln: "Ghosh", dept: "English", si: 2 },
      { n: 9, fn: "Kiran", ln: "Mehta", dept: "English", si: 2 },
      { n: 10, fn: "Sneha", ln: "Pillai", dept: "Social Studies", si: 3 },
      { n: 11, fn: "Deepa", ln: "Nambiar", dept: "Social Studies", si: 3 },
      { n: 12, fn: "Suresh", ln: "Kulkarni", dept: "Social Studies", si: 3 },
      { n: 13, fn: "Vikram", ln: "Rao", dept: "Hindi", si: 4 },
      { n: 14, fn: "Meena", ln: "Trivedi", dept: "Hindi", si: 4 },
      { n: 15, fn: "Dinesh", ln: "Pandey", dept: "Hindi", si: 4 },
      { n: 16, fn: "Kavitha", ln: "Menon", dept: "Computer Science", si: 5 },
      { n: 17, fn: "Ankit", ln: "Shah", dept: "Computer Science", si: 5 },
      { n: 18, fn: "Pooja", ln: "Iyer", dept: "Computer Science", si: 5 },
      { n: 19, fn: "Deepak", ln: "Kumar", dept: "Physical Education", si: 6 },
      { n: 20, fn: "Ritu", ln: "Singh", dept: "Physical Education", si: 6 },
      { n: 21, fn: "Mohan", ln: "Das", dept: "Physical Education", si: 6 },
    ],
  });
  console.log(
    `   ✅  ${allProfiles.length} teachers  (teacher${tStart}@gmail.com … teacher${TEACHER_CTR - 1}@gmail.com)`,
  );

  const { configId, wdPeriodDefs, satPeriodDefs } = await createTimetableConfig(
    school,
    ay,
  );

  const GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  const SECTIONS = ["A", "B"];
  const allSections = [];
  let ctIdx = 0;

  for (let gi = 0; gi < GRADES.length; gi++) {
    for (let si = 0; si < SECTIONS.length; si++) {
      const grade = GRADES[gi],
        section = SECTIONS[si],
        name = `${grade}-${section}`;
      let cs = await prisma.classSection.findFirst({
        where: { grade, section, schoolId: school.id },
      });
      if (!cs)
        cs = await prisma.classSection.create({
          data: { grade, section, name, schoolId: school.id },
        });

      const ct = allProfiles[ctIdx++ % allProfiles.length];
      await prisma.classSectionAcademicYear.upsert({
        where: {
          classSectionId_academicYearId: {
            classSectionId: cs.id,
            academicYearId: ay.id,
          },
        },
        update: { classTeacherId: ct.id, isActive: true },
        create: {
          classSectionId: cs.id,
          academicYearId: ay.id,
          classTeacherId: ct.id,
          isActive: true,
        },
      });
      await linkSubjectsAndTeachers({ cs, subjects, tBySubject, ay, gi, si });
      allSections.push({ id: cs.id, grade, section, name });
    }
  }
  console.log(
    `   ✅  ${allSections.length} class sections  (${GRADES.length} grades × ${SECTIONS.length} sections)`,
  );

  const totalTT = await writeTimetable(
    school,
    ay,
    subjects,
    tBySubject,
    allSections,
    wdPeriodDefs,
    satPeriodDefs,
    configId,
  );
  console.log(`   ✅  ${totalTT} timetable entries`);

  const COUNT = 120;
  const stuStart = STUDENT_CTR;
  console.log(
    `   👨‍🎓  Seeding ${COUNT} students/section × ${allSections.length} sections…`,
  );
  for (const cs of allSections) {
    await seedStudents({ school, ay, cs, count: COUNT, baseAge: 6, password });
    console.log(`      ✅  ${cs.name}  — ${COUNT} students`);
  }

  return {
    school,
    totalStudents: STUDENT_CTR - stuStart,
    totalSections: allSections.length,
    totalTT,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  2. PUC  —  11–12
// ═══════════════════════════════════════════════════════════════════════════════
async function seedPUC(university, password) {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   🎓  Springfield PUC                ║");
  console.log("╚══════════════════════════════════════╝");

  const school = await prisma.school.upsert({
    where: { code: "SPRINGFIELD_PUC" },
    update: {},
    create: {
      name: "Springfield PUC",
      code: "SPRINGFIELD_PUC",
      type: "PUC",
      address: "789 College Road",
      city: "Bengaluru",
      state: "Karnataka",
      phone: "080-22222222",
      email: "puc@springfield.edu",
      universityId: university.id,
    },
  });

  await prisma.user.upsert({
    where: {
      email_schoolId: { email: "admin2@gmail.com", schoolId: school.id },
    },
    update: {},
    create: {
      name: "PUC Admin",
      email: "admin2@gmail.com",
      password,
      role: "ADMIN",
      schoolId: school.id,
    },
  });
  console.log("   ✅  Admin: admin2@gmail.com");
  // Finance Admin
  const financeUser = await prisma.user.upsert({
    where: {
      email_schoolId: { email: "finance2@gmail.com", schoolId: school.id },
    },
    update: {},
    create: {
      name: "Finance Admin",
      email: "finance2@gmail.com",
      password,
      role: "FINANCE",
      schoolId: school.id,
    },
  });

  await prisma.financeProfile.upsert({
    where: { userId: financeUser.id },
    update: {},
    create: {
      userId: financeUser.id,
      schoolId: school.id,
      employeeCode: "FIN-002",
      designation: "Finance Officer",
      phone: "9000000002",
    },
  });

  console.log("   💰  Finance Admin: finance2@gmail.com");

  await prisma.schoolPromotionConfig.upsert({
    where: { schoolId: school.id },
    update: {},
    create: {
      schoolId: school.id,
      skipGrades: [],
      lastGrade: "12",
      firstGrade: "11",
    },
  });

  const ay = await prisma.academicYear.upsert({
    where: { name_schoolId: { name: "2025-26", schoolId: school.id } },
    update: { isActive: true },
    create: {
      name: "2025-26",
      startDate: new Date("2025-06-01"),
      endDate: new Date("2026-03-31"),
      isActive: true,
      schoolId: school.id,
    },
  });

  // ── Streams ────────────────────────────────────────────────────────────────
  const sciStream = await prisma.stream.upsert({
    where: { name_schoolId: { name: "Science", schoolId: school.id } },
    update: { hasCombinations: true },
    create: {
      name: "Science",
      code: "SCI",
      hasCombinations: true,
      schoolId: school.id,
    },
  });
  const comStream = await prisma.stream.upsert({
    where: { name_schoolId: { name: "Commerce", schoolId: school.id } },
    update: { hasCombinations: true },
    create: {
      name: "Commerce",
      code: "COM",
      hasCombinations: true,
      schoolId: school.id,
    },
  });
  const artsStream = await prisma.stream.upsert({
    where: { name_schoolId: { name: "Arts", schoolId: school.id } },
    update: { hasCombinations: false },
    create: {
      name: "Arts",
      code: "ART",
      hasCombinations: false,
      schoolId: school.id,
    },
  });
  console.log(
    "   ✅  Streams: Science (hasCombinations:true), Commerce (hasCombinations:true), Arts (hasCombinations:false)",
  );

  // ── StreamCombination records ──────────────────────────────────────────────
  const pcmb = await prisma.streamCombination.upsert({
    where: { name_streamId: { name: "PCMB", streamId: sciStream.id } },
    update: {},
    create: { name: "PCMB", code: "PCMB", streamId: sciStream.id },
  });
  const pcmc = await prisma.streamCombination.upsert({
    where: { name_streamId: { name: "PCMC", streamId: sciStream.id } },
    update: {},
    create: { name: "PCMC", code: "PCMC", streamId: sciStream.id },
  });
  const ceba = await prisma.streamCombination.upsert({
    where: { name_streamId: { name: "CEBA", streamId: comStream.id } },
    update: {},
    create: { name: "CEBA", code: "CEBA", streamId: comStream.id },
  });
  const seba = await prisma.streamCombination.upsert({
    where: { name_streamId: { name: "SEBA", streamId: comStream.id } },
    update: {},
    create: { name: "SEBA", code: "SEBA", streamId: comStream.id },
  });
  const hep = await prisma.streamCombination.upsert({
    where: { name_streamId: { name: "HEP", streamId: artsStream.id } },
    update: {},
    create: { name: "HEP", code: "HEP", streamId: artsStream.id },
  });
  console.log(
    "   ✅  Combinations: PCMB, PCMC (Science) | CEBA, SEBA (Commerce) | HEP (Arts)",
  );

  // ── Subjects ───────────────────────────────────────────────────────────────
  const SUBJ_DEFS = [
    { name: "Physics", code: "PUC-PHY" },
    { name: "Chemistry", code: "PUC-CHE" },
    { name: "Mathematics", code: "PUC-MATH" },
    { name: "Biology", code: "PUC-BIO" },
    { name: "Computer Science", code: "PUC-CS" },
    { name: "English", code: "PUC-ENG" },
    { name: "Economics", code: "PUC-ECO" },
    { name: "Commerce", code: "PUC-COM" },
    { name: "Accountancy", code: "PUC-ACC" },
    { name: "Business Studies", code: "PUC-BUS" },
    { name: "Statistics", code: "PUC-STAT" },
    { name: "History", code: "PUC-HIS" },
    { name: "Political Science", code: "PUC-POL" },
    { name: "Sociology", code: "PUC-SOC" },
  ];
  const subjects = [];
  for (const d of SUBJ_DEFS)
    subjects.push(
      await prisma.subject.upsert({
        where: { code_schoolId: { code: d.code, schoolId: school.id } },
        update: { name: d.name },
        create: { name: d.name, code: d.code, schoolId: school.id },
      }),
    );
  console.log(`   ✅  ${subjects.length} subjects`);

  const tStart = TEACHER_CTR;
  const { allProfiles, tBySubject } = await createTeachers(school, password, {
    subjectDefs: SUBJ_DEFS,
    defs: [
      { n: 1, fn: "Rajan", ln: "Nair", dept: "Physics", si: 0 },
      { n: 2, fn: "Savitha", ln: "Menon", dept: "Physics", si: 0 },
      { n: 3, fn: "Arun", ln: "Kumar", dept: "Physics", si: 0 },
      { n: 4, fn: "Lakshmi", ln: "Sharma", dept: "Chemistry", si: 1 },
      { n: 5, fn: "Suresh", ln: "Pillai", dept: "Chemistry", si: 1 },
      { n: 6, fn: "Usha", ln: "Rao", dept: "Chemistry", si: 1 },
      { n: 7, fn: "Praveen", ln: "Iyer", dept: "Mathematics", si: 2 },
      { n: 8, fn: "Geetha", ln: "Verma", dept: "Mathematics", si: 2 },
      { n: 9, fn: "Ramesh", ln: "Patel", dept: "Mathematics", si: 2 },
      { n: 10, fn: "Nalini", ln: "Reddy", dept: "Biology", si: 3 },
      { n: 11, fn: "Shankar", ln: "Singh", dept: "Biology", si: 3 },
      { n: 12, fn: "Vidya", ln: "Joshi", dept: "Biology", si: 3 },
      { n: 13, fn: "Meera", ln: "Bose", dept: "Computer Science", si: 4 },
      { n: 14, fn: "Anil", ln: "Shah", dept: "Computer Science", si: 4 },
      { n: 15, fn: "Sundar", ln: "Ghosh", dept: "Computer Science", si: 4 },
      { n: 16, fn: "Pradeep", ln: "Gupta", dept: "English", si: 5 },
      { n: 17, fn: "Hema", ln: "Nambiar", dept: "English", si: 5 },
      { n: 18, fn: "Karthik", ln: "Desai", dept: "English", si: 5 },
      { n: 19, fn: "Anand", ln: "Iyer", dept: "Economics", si: 6 },
      { n: 20, fn: "Preeti", ln: "Mishra", dept: "Economics", si: 6 },
      { n: 21, fn: "Girish", ln: "Shetty", dept: "Economics", si: 6 },
      { n: 22, fn: "Mohan", ln: "Das", dept: "Commerce", si: 7 },
      { n: 23, fn: "Kavitha", ln: "Hegde", dept: "Commerce", si: 7 },
      { n: 24, fn: "Ravi", ln: "Naidu", dept: "Commerce", si: 7 },
      { n: 25, fn: "Seema", ln: "Kamath", dept: "Accountancy", si: 8 },
      { n: 26, fn: "Vinod", ln: "Chandra", dept: "Accountancy", si: 8 },
      { n: 27, fn: "Rekha", ln: "Tiwari", dept: "Accountancy", si: 8 },
      { n: 28, fn: "Girish", ln: "Kulkarni", dept: "Business Studies", si: 9 },
      { n: 29, fn: "Nisha", ln: "Dubey", dept: "Business Studies", si: 9 },
      { n: 30, fn: "Satish", ln: "Pandey", dept: "Statistics", si: 10 },
      { n: 31, fn: "Swati", ln: "Trivedi", dept: "Statistics", si: 10 },
      { n: 32, fn: "Hemant", ln: "Rajan", dept: "History", si: 11 },
      { n: 33, fn: "Archana", ln: "Krishnan", dept: "History", si: 11 },
      {
        n: 34,
        fn: "Deepak",
        ln: "Subramaniam",
        dept: "Political Science",
        si: 12,
      },
      { n: 35, fn: "Padma", ln: "Balaji", dept: "Political Science", si: 12 },
      { n: 36, fn: "Kiran", ln: "Gowda", dept: "Sociology", si: 13 },
      { n: 37, fn: "Sunita", ln: "Yadav", dept: "Sociology", si: 13 },
    ],
  });
  console.log(
    `   ✅  ${allProfiles.length} teachers  (teacher${tStart}@gmail.com … teacher${TEACHER_CTR - 1}@gmail.com)`,
  );

  const { configId, wdPeriodDefs, satPeriodDefs } = await createTimetableConfig(
    school,
    ay,
  );

  const SECTION_DEFS = [
    {
      stream: sciStream,
      combo: pcmb,
      grade: "11",
      sec: "A",
      name: "11-A Science/PCMB",
    },
    {
      stream: sciStream,
      combo: pcmb,
      grade: "11",
      sec: "B",
      name: "11-B Science/PCMB",
    },
    {
      stream: sciStream,
      combo: pcmb,
      grade: "12",
      sec: "A",
      name: "12-A Science/PCMB",
    },
    {
      stream: sciStream,
      combo: pcmb,
      grade: "12",
      sec: "B",
      name: "12-B Science/PCMB",
    },
    {
      stream: sciStream,
      combo: pcmc,
      grade: "11",
      sec: "C",
      name: "11-C Science/PCMC",
    },
    {
      stream: sciStream,
      combo: pcmc,
      grade: "11",
      sec: "D",
      name: "11-D Science/PCMC",
    },
    {
      stream: sciStream,
      combo: pcmc,
      grade: "12",
      sec: "C",
      name: "12-C Science/PCMC",
    },
    {
      stream: sciStream,
      combo: pcmc,
      grade: "12",
      sec: "D",
      name: "12-D Science/PCMC",
    },
    {
      stream: comStream,
      combo: ceba,
      grade: "11",
      sec: "A",
      name: "11-A Commerce/CEBA",
    },
    {
      stream: comStream,
      combo: ceba,
      grade: "11",
      sec: "B",
      name: "11-B Commerce/CEBA",
    },
    {
      stream: comStream,
      combo: ceba,
      grade: "12",
      sec: "A",
      name: "12-A Commerce/CEBA",
    },
    {
      stream: comStream,
      combo: ceba,
      grade: "12",
      sec: "B",
      name: "12-B Commerce/CEBA",
    },
    {
      stream: comStream,
      combo: seba,
      grade: "11",
      sec: "C",
      name: "11-C Commerce/SEBA",
    },
    {
      stream: comStream,
      combo: seba,
      grade: "12",
      sec: "C",
      name: "12-C Commerce/SEBA",
    },
    {
      stream: artsStream,
      combo: hep,
      grade: "11",
      sec: "A",
      name: "11-A Arts/HEP",
    },
    {
      stream: artsStream,
      combo: hep,
      grade: "11",
      sec: "B",
      name: "11-B Arts/HEP",
    },
    {
      stream: artsStream,
      combo: hep,
      grade: "12",
      sec: "A",
      name: "12-A Arts/HEP",
    },
    {
      stream: artsStream,
      combo: hep,
      grade: "12",
      sec: "B",
      name: "12-B Arts/HEP",
    },
  ];

  const allSections = [];
  let ctIdx = 0;
  for (let i = 0; i < SECTION_DEFS.length; i++) {
    const def = SECTION_DEFS[i];
    let cs = await prisma.classSection.findFirst({
      where: {
        grade: def.grade,
        section: def.sec,
        schoolId: school.id,
        streamId: def.stream.id,
        combinationId: def.combo.id,
      },
    });
    if (!cs)
      cs = await prisma.classSection.create({
        data: {
          grade: def.grade,
          section: def.sec,
          name: def.name,
          schoolId: school.id,
          streamId: def.stream.id,
          combinationId: def.combo.id,
        },
      });

    const ct = allProfiles[ctIdx++ % allProfiles.length];
    await prisma.classSectionAcademicYear.upsert({
      where: {
        classSectionId_academicYearId: {
          classSectionId: cs.id,
          academicYearId: ay.id,
        },
      },
      update: { classTeacherId: ct.id, isActive: true },
      create: {
        classSectionId: cs.id,
        academicYearId: ay.id,
        classTeacherId: ct.id,
        isActive: true,
      },
    });
    await linkSubjectsAndTeachers({
      cs,
      subjects,
      tBySubject,
      ay,
      gi: i,
      si: 0,
    });
    allSections.push({
      id: cs.id,
      grade: def.grade,
      section: def.sec,
      name: def.name,
    });
  }
  console.log(`   ✅  ${allSections.length} class sections`);

  const totalTT = await writeTimetable(
    school,
    ay,
    subjects,
    tBySubject,
    allSections,
    wdPeriodDefs,
    satPeriodDefs,
    configId,
  );
  console.log(`   ✅  ${totalTT} timetable entries`);

  const COUNT = 110;
  const stuStart = STUDENT_CTR;
  console.log(
    `   👨‍🎓  Seeding ${COUNT} students/section × ${allSections.length} sections…`,
  );
  for (const cs of allSections) {
    await seedStudents({ school, ay, cs, count: COUNT, baseAge: 16, password });
    console.log(`      ✅  ${cs.name}  — ${COUNT} students`);
  }

  return {
    school,
    totalStudents: STUDENT_CTR - stuStart,
    totalSections: allSections.length,
    totalTT,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3. DEGREE
// ═══════════════════════════════════════════════════════════════════════════════
async function seedDegree(university, password) {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   🎓  Springfield Degree College     ║");
  console.log("╚══════════════════════════════════════╝");

  const school = await prisma.school.upsert({
    where: { code: "SPRINGFIELD_DEG" },
    update: {},
    create: {
      name: "Springfield Degree College",
      code: "SPRINGFIELD_DEG",
      type: "DEGREE",
      address: "101 University Avenue",
      city: "Bengaluru",
      state: "Karnataka",
      phone: "080-33333333",
      email: "degree@springfield.edu",
      universityId: university.id,
    },
  });

  await prisma.user.upsert({
    where: {
      email_schoolId: { email: "admin3@gmail.com", schoolId: school.id },
    },
    update: {},
    create: {
      name: "Degree Admin",
      email: "admin3@gmail.com",
      password,
      role: "ADMIN",
      schoolId: school.id,
    },
  });
  console.log("   ✅  Admin: admin3@gmail.com");
  // Finance Admin
  const financeUser = await prisma.user.upsert({
    where: {
      email_schoolId: { email: "finance3@gmail.com", schoolId: school.id },
    },
    update: {},
    create: {
      name: "Finance Admin",
      email: "finance3@gmail.com",
      password,
      role: "FINANCE",
      schoolId: school.id,
    },
  });

  await prisma.financeProfile.upsert({
    where: { userId: financeUser.id },
    update: {},
    create: {
      userId: financeUser.id,
      schoolId: school.id,
      employeeCode: "FIN-003",
      designation: "Finance Officer",
      phone: "9000000003",
    },
  });

  console.log("   💰  Finance Admin: finance3@gmail.com");

  await prisma.schoolPromotionConfig.upsert({
    where: { schoolId: school.id },
    update: {},
    create: {
      schoolId: school.id,
      skipGrades: [],
      lastGrade: "Semester 8",
      firstGrade: "Semester 1",
    },
  });

  const ay = await prisma.academicYear.upsert({
    where: { name_schoolId: { name: "2025-26", schoolId: school.id } },
    update: { isActive: true },
    create: {
      name: "2025-26",
      startDate: new Date("2025-08-01"),
      endDate: new Date("2026-05-31"),
      isActive: true,
      schoolId: school.id,
    },
  });

  // ── Courses ────────────────────────────────────────────────────────────────
  const beCourse = await prisma.course.upsert({
    where: { name_schoolId: { name: "BE", schoolId: school.id } },
    update: { hasBranches: true },
    create: {
      name: "BE",
      code: "BE",
      type: "DEGREE_COURSE",
      totalSemesters: 8,
      hasBranches: true,
      schoolId: school.id,
    },
  });
  const baCourse = await prisma.course.upsert({
    where: { name_schoolId: { name: "BA", schoolId: school.id } },
    update: { hasBranches: false },
    create: {
      name: "BA",
      code: "BA",
      type: "DEGREE_COURSE",
      totalSemesters: 6,
      hasBranches: false,
      schoolId: school.id,
    },
  });

  const beBranches = [];
  for (const d of [
    { name: "Computer Science & Engineering", code: "CSE" },
    { name: "Electronics & Communication", code: "ECE" },
    { name: "Mechanical Engineering", code: "ME" },
  ]) {
    beBranches.push(
      await prisma.courseBranch.upsert({
        where: { name_courseId: { name: d.name, courseId: beCourse.id } },
        update: {},
        create: { name: d.name, code: d.code, courseId: beCourse.id },
      }),
    );
  }
  console.log(
    `   ✅  Course: BE  (hasBranches:true)  — ${beBranches.map((b) => b.code).join(", ")}`,
  );
  console.log(`   ✅  Course: BA  (hasBranches:false) — no branches`);

  // ── Subjects ───────────────────────────────────────────────────────────────
  const SUBJ_DEFS = [
    { name: "Engineering Mathematics", code: "DEG-MATH" },
    { name: "Physics", code: "DEG-PHY" },
    { name: "Programming in C", code: "DEG-PROG" },
    { name: "Data Structures", code: "DEG-DS" },
    { name: "Digital Electronics", code: "DEG-DE" },
    { name: "Engineering Drawing", code: "DEG-DRAW" },
    { name: "Communication Skills", code: "DEG-COMM" },
  ];
  const subjects = [];
  for (const d of SUBJ_DEFS)
    subjects.push(
      await prisma.subject.upsert({
        where: { code_schoolId: { code: d.code, schoolId: school.id } },
        update: { name: d.name },
        create: { name: d.name, code: d.code, schoolId: school.id },
      }),
    );
  console.log(`   ✅  ${subjects.length} subjects`);

  const tStart = TEACHER_CTR;
  const { allProfiles, tBySubject } = await createTeachers(school, password, {
    subjectDefs: SUBJ_DEFS,
    defs: [
      { n: 1, fn: "Venkat", ln: "Rao", dept: "Mathematics", si: 0 },
      { n: 2, fn: "Archana", ln: "Sharma", dept: "Mathematics", si: 0 },
      { n: 3, fn: "Shiva", ln: "Kumar", dept: "Mathematics", si: 0 },
      { n: 4, fn: "Sridhar", ln: "Nair", dept: "Physics", si: 1 },
      { n: 5, fn: "Mala", ln: "Pillai", dept: "Physics", si: 1 },
      { n: 6, fn: "Ganesh", ln: "Menon", dept: "Physics", si: 1 },
      { n: 7, fn: "Rahul", ln: "Iyer", dept: "Computer Science", si: 2 },
      { n: 8, fn: "Nisha", ln: "Bose", dept: "Computer Science", si: 2 },
      { n: 9, fn: "Kartik", ln: "Singh", dept: "Computer Science", si: 2 },
      { n: 10, fn: "Divya", ln: "Gupta", dept: "Computer Science", si: 3 },
      { n: 11, fn: "Suresh", ln: "Reddy", dept: "Computer Science", si: 3 },
      { n: 12, fn: "Ananya", ln: "Patel", dept: "Computer Science", si: 3 },
      { n: 13, fn: "Vivek", ln: "Verma", dept: "Electronics", si: 4 },
      { n: 14, fn: "Padma", ln: "Joshi", dept: "Electronics", si: 4 },
      { n: 15, fn: "Rajiv", ln: "Desai", dept: "Electronics", si: 4 },
      { n: 16, fn: "Uday", ln: "Nambiar", dept: "Mechanical", si: 5 },
      { n: 17, fn: "Sudha", ln: "Ghosh", dept: "Mechanical", si: 5 },
      { n: 18, fn: "Kiran", ln: "Trivedi", dept: "Mechanical", si: 5 },
      { n: 19, fn: "Rekha", ln: "Kulkarni", dept: "Communication", si: 6 },
      { n: 20, fn: "Anand", ln: "Shah", dept: "Communication", si: 6 },
      { n: 21, fn: "Preethi", ln: "Das", dept: "Communication", si: 6 },
    ],
  });
  console.log(
    `   ✅  ${allProfiles.length} teachers  (teacher${tStart}@gmail.com … teacher${TEACHER_CTR - 1}@gmail.com)`,
  );

  const { configId, wdPeriodDefs, satPeriodDefs } = await createTimetableConfig(
    school,
    ay,
  );

  const BE_SEMS = [
    "Semester 1",
    "Semester 2",
    "Semester 3",
    "Semester 4",
    "Semester 5",
    "Semester 6",
    "Semester 7",
    "Semester 8",
  ];
  const BA_SEMS = [
    "Semester 1",
    "Semester 2",
    "Semester 3",
    "Semester 4",
    "Semester 5",
    "Semester 6",
  ];
  const allSections = [];
  let ctIdx = 0;

  // BE: 3 branches × 8 semesters × 1 section = 24 sections
  for (let bi = 0; bi < beBranches.length; bi++) {
    const branch = beBranches[bi];
    for (let gi = 0; gi < BE_SEMS.length; gi++) {
      const sem = BE_SEMS[gi],
        section = "A",
        name = `BE-${branch.code} ${sem}-A`;
      let cs = await prisma.classSection.findFirst({
        where: {
          grade: sem,
          section,
          schoolId: school.id,
          branchId: branch.id,
        },
      });
      if (!cs)
        cs = await prisma.classSection.create({
          data: {
            grade: sem,
            section,
            name,
            schoolId: school.id,
            courseId: beCourse.id,
            branchId: branch.id,
          },
        });

      const ct = allProfiles[ctIdx++ % allProfiles.length];
      await prisma.classSectionAcademicYear.upsert({
        where: {
          classSectionId_academicYearId: {
            classSectionId: cs.id,
            academicYearId: ay.id,
          },
        },
        update: { classTeacherId: ct.id, isActive: true },
        create: {
          classSectionId: cs.id,
          academicYearId: ay.id,
          classTeacherId: ct.id,
          isActive: true,
        },
      });
      await linkSubjectsAndTeachers({
        cs,
        subjects,
        tBySubject,
        ay,
        gi,
        si: bi,
      });
      allSections.push({ id: cs.id, grade: sem, section, name });
    }
  }

  // BA: 6 semesters × 2 sections = 12 sections
  for (let gi = 0; gi < BA_SEMS.length; gi++) {
    const sem = BA_SEMS[gi];
    for (const section of ["A", "B"]) {
      const name = `BA ${sem}-${section}`;
      let cs = await prisma.classSection.findFirst({
        where: {
          grade: sem,
          section,
          schoolId: school.id,
          courseId: baCourse.id,
          branchId: null,
        },
      });
      if (!cs)
        cs = await prisma.classSection.create({
          data: {
            grade: sem,
            section,
            name,
            schoolId: school.id,
            courseId: baCourse.id,
          },
        });

      const ct = allProfiles[ctIdx++ % allProfiles.length];
      await prisma.classSectionAcademicYear.upsert({
        where: {
          classSectionId_academicYearId: {
            classSectionId: cs.id,
            academicYearId: ay.id,
          },
        },
        update: { classTeacherId: ct.id, isActive: true },
        create: {
          classSectionId: cs.id,
          academicYearId: ay.id,
          classTeacherId: ct.id,
          isActive: true,
        },
      });
      await linkSubjectsAndTeachers({
        cs,
        subjects,
        tBySubject,
        ay,
        gi,
        si: 0,
      });
      allSections.push({ id: cs.id, grade: sem, section, name });
    }
  }
  console.log(`   ✅  ${allSections.length} class sections  (BE: 24, BA: 12)`);

  const totalTT = await writeTimetable(
    school,
    ay,
    subjects,
    tBySubject,
    allSections,
    wdPeriodDefs,
    satPeriodDefs,
    configId,
  );
  console.log(`   ✅  ${totalTT} timetable entries`);

  const COUNT = 100;
  const stuStart = STUDENT_CTR;
  console.log(
    `   👨‍🎓  Seeding ${COUNT} students/section × ${allSections.length} sections…`,
  );
  for (const cs of allSections) {
    await seedStudents({ school, ay, cs, count: COUNT, baseAge: 18, password });
    console.log(`      ✅  ${cs.name}  — ${COUNT} students`);
  }

  return {
    school,
    totalStudents: STUDENT_CTR - stuStart,
    totalSections: allSections.length,
    totalTT,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log("🌱  Springfield Multi-Institution Seed Starting…\n");
  const password = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  console.log("📚  Creating Springfield University…");
  const university = await prisma.university.upsert({
    where: { code: "SPRINGFIELD_UNI" },
    update: {},
    create: {
      name: "Springfield University",
      code: "SPRINGFIELD_UNI",
      address: "123 University Road",
      city: "Bengaluru",
      state: "Karnataka",
      phone: "080-12345678",
      email: "contact@springfield.edu",
      website: "https://springfield.edu",
    },
  });

  console.log("👑  Creating Super Admin…");
  const sa = await prisma.superAdmin.upsert({
    where: { email: "superadmin@gmail.com" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin@gmail.com",
      password,
      phone: "9000000000",
      universityId: university.id,
    },
  });

  const schoolResult = await seedSchool(university, password);
  const pucResult = await seedPUC(university, password);
  const degResult = await seedDegree(university, password);

  for (const { school } of [schoolResult, pucResult, degResult]) {
    await prisma.superAdminSchoolAccess.upsert({
      where: {
        superAdminId_schoolId: { superAdminId: sa.id, schoolId: school.id },
      },
      update: {},
      create: { superAdminId: sa.id, schoolId: school.id },
    });
  }

  const S = schoolResult.totalStudents;
  const P = pucResult.totalStudents;
  const D = degResult.totalStudents;
  const sEnd = S;
  const pEnd = S + P;
  const dEnd = S + P + D;

  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                      ✨  SEEDING COMPLETE  ✨                            ║
╠══════════════════════════════════════════════════════════════════════════╣
║  ALL PASSWORDS   →  123456                                               ║
╠══════════════════════════════════════════════════════════════════════════╣
║  SUPER ADMIN     →  superadmin@gmail.com                                 ║
╠══════════════════════════════════════════════════════════════════════════╣
║  🏫  HIGH SCHOOL  →  admin1@gmail.com                                    ║
║     Grades 1–10, Sections A & B  —  20 sections                          ║
║     120 students/section  —  ${String(S).padEnd(4)} total students                      ║
║     Students : student1@gmail.com  …  student${sEnd}@gmail.com           ║
║     Teachers : teacher1@gmail.com  …  teacher21@gmail.com                ║
╠══════════════════════════════════════════════════════════════════════════╣
║  🎓  PUC          →  admin2@gmail.com                                    ║
║     Science (PCMB ×4, PCMC ×4) | Commerce (CEBA ×4, SEBA ×2) | Arts ×4  ║
║     18 sections  —  110 students/section  —  ${String(P).padEnd(4)} total students      ║
║     Students : student${String(sEnd + 1).padEnd(5)}@gmail.com  …  student${pEnd}@gmail.com  ║
╠══════════════════════════════════════════════════════════════════════════╣
║  🎓  DEGREE       →  admin3@gmail.com                                    ║
║     BE (CSE/ECE/ME ×8 sem) + BA (6 sem × A,B)  —  36 sections            ║
║     100 students/section  —  ${String(D).padEnd(4)} total students                      ║
║     Students : student${String(pEnd + 1).padEnd(5)}@gmail.com  …  student${dEnd}@gmail.com  ║
╠══════════════════════════════════════════════════════════════════════════╣
║  GRAND TOTAL STUDENTS  :  ${String(dEnd).padEnd(6)}                                      ║
╚══════════════════════════════════════════════════════════════════════════╝
`);
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
