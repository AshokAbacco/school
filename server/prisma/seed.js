// prisma/seed.js
// ═══════════════════════════════════════════════════════════════════════════════
//  SPRINGFIELD SEED  —  Schema-Compatible v3
//  Fully compatible with schema.prisma (no unknown fields, no computed fields)
//  Password for all accounts: 123456
// ═══════════════════════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = "123456";

// ── Dev dataset size ─────────────────────────────────────────────────────────
const STUDENTS_PER_SECTION = 5;   // keep small for fast seeding
const MAX_SECTIONS          = 2;   // only 2 sections per school
const MAX_SUBJECTS          = 2;   // only 2 subjects for assessments / marks

// ── Global counters so emails never collide ──────────────────────────────────
let TEACHER_CTR = 1;
let STUDENT_CTR = 1;
let PARENT_CTR  = 1;

// ── Name pools ───────────────────────────────────────────────────────────────
const MALE_NAMES   = ["Aarav","Rohan","KiranKumar","Amit","Vijay","Ravi","Mohan","Sanjay","Arjun","Nikhil","Pranav","Harsh","Dev","Raj","Vikram","Arun","Deepak","Kartik","Ankit","Rahul"];
const FEMALE_NAMES = ["Priya","Anjali","Pooja","Divya","Sunita","Rekha","Meena","Kavitha","Nisha","Anita","Sneha","Deepa","Ritu","Neha","Swati","Lakshmi","Savitha","Nalini","Vidya","Hema"];
const LAST_NAMES   = ["Allapalli","Kavadimatti","Hosamani","Kammar","Doddamani","Kambale","Murgod","Hadapad","Chougule","Angadi","Mugali","Patil","Nandikol","Walikar","Benakatti","Aralikatti","Lamani","Gudadinni","Tirlapur","Negalur"];
const PARENT_NAMES = ["Rajesh","Sunil","Manoj","Anil","Ramesh","Suresh","Dinesh","Ganesh","Mahesh","Naresh","Rajan","Mohan","Sohan","Kishan","Madan"];
const CITIES  = ["Bengaluru","Chennai","Hyderabad","Mumbai","Pune","Delhi","Kolkata","Jaipur","Mysuru","Mangaluru"];
const STATES  = ["Karnataka","Tamil Nadu","Telangana","Maharashtra","Maharashtra","Delhi","West Bengal","Rajasthan","Karnataka","Karnataka"];
const ZIPS    = ["560001","600001","500001","400001","411001","110001","700001","302001","570001","575001"];
const BLOOD_GROUPS = ["A_POS","A_NEG","B_POS","B_NEG","O_POS","O_NEG","AB_POS","AB_NEG"];
const OCCS    = ["Engineer","Doctor","Teacher","Business Owner","Government Employee","Nurse","Accountant","Lawyer","Farmer","Shopkeeper"];
const GENDERS = ["MALE","FEMALE"];

const pick = (arr, i) => arr[Math.abs(i) % arr.length];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";

function generateStudentCode() {
  let code = "";
  for (let i = 0; i < 6; i++) code += NUMBERS.charAt(Math.floor(Math.random() * NUMBERS.length));
  for (let i = 0; i < 4; i++) code += LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));
  return code;
}

async function createUniqueStudentCode() {
  let studentCode;
  let exists = true;
  while (exists) {
    studentCode = generateStudentCode();
    const student = await prisma.student.findUnique({ where: { studentCode }, select: { id: true } });
    exists = !!student;
  }
  return studentCode;
}

// ── Date helpers ─────────────────────────────────────────────────────────────
function studentDOB(idx, baseAge = 8) {
  const y = new Date().getFullYear() - (baseAge + (idx % 5));
  const m = ((idx * 3) % 12) + 1;
  const d = ((idx * 7) % 28) + 1;
  return new Date(`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
}
function admDate(idx) { return new Date(`${2021 + (idx % 4)}-06-01`); }

// ── Realistic marks generator ─────────────────────────────────────────────────
// Returns only fields that exist on the Marks model: marksObtained, isAbsent, remarks
function genMarks(stuIdx, schIdx, maxMarks, passingMarks) {
  const seed = ((stuIdx * 17) + (schIdx * 31)) % 100;
  if (seed < 8) return { isAbsent: true, marksObtained: null, remarks: "Absent" };
  if (seed < 18) {
    const fail = Math.floor(((seed - 8) / 10) * (passingMarks - 1));
    return { isAbsent: false, marksObtained: Math.max(0, fail), remarks: null };
  }
  const range    = maxMarks - passingMarks;
  const obtained = passingMarks + Math.floor(((seed - 18) / 82) * range);
  return { isAbsent: false, marksObtained: Math.min(obtained, maxMarks), remarks: null };
}

// ── Period helpers ────────────────────────────────────────────────────────────
function t2m(t) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function m2t(m) { return `${String(Math.floor(m / 60)).padStart(2,"0")}:${String(m % 60).padStart(2,"0")}`; }

function buildPeriodDefinitionData(cfg, dayType) {
  const defs = []; let order = 1; let cur = t2m(cfg.startTime);
  const bm = {}; (cfg.breaks || []).forEach(b => bm[b.afterPeriod] = b);
  for (let i = 1; i <= cfg.totalPeriods; i++) {
    defs.push({
      periodNumber: i,
      label:        dayType === "SATURDAY" ? `Sat Period ${i}` : `Period ${i}`,
      slotType:     "PERIOD",
      dayType,
      startTime:    m2t(cur),
      endTime:      m2t(cur + cfg.periodDuration),
      order:        order++,
    });
    cur += cfg.periodDuration;
    if (bm[i]) {
      const b = bm[i];
      defs.push({
        periodNumber: 100 + i,
        label:        dayType === "SATURDAY" ? `Sat ${b.label}` : b.label,
        slotType:     b.type || "SHORT_BREAK",
        dayType,
        startTime:    m2t(cur),
        endTime:      m2t(cur + b.duration),
        order:        order++,
      });
      cur += b.duration;
    }
  }
  return defs;
}

const WD_CFG = {
  startTime: "08:00", periodDuration: 40, totalPeriods: 7,
  breaks: [
    { afterPeriod: 3, type: "SHORT_BREAK", label: "Short Break", duration: 10 },
    { afterPeriod: 5, type: "LUNCH_BREAK", label: "Lunch Break", duration: 30 },
  ],
};
const SAT_CFG = {
  startTime: "09:00", periodDuration: 35, totalPeriods: 5,
  breaks: [{ afterPeriod: 3, type: "SHORT_BREAK", label: "Short Break", duration: 15 }],
};
const ALL_DAYS = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];

// ── Conflict-free timetable builder ──────────────────────────────────────────
function buildTimetables(wdDefs, satDefs, subjects, tBySubject, sections) {
  const busy = {};
  for (const pool of Object.values(tBySubject))
    for (const t of pool) { busy[t.id] = {}; for (const d of ALL_DAYS) busy[t.id][d] = {}; }

  const result = new Map();
  for (const cs of sections) result.set(cs.id, []);

  for (let di = 0; di < ALL_DAYS.length; di++) {
    const day  = ALL_DAYS[di];
    const defs = day === "SATURDAY" ? satDefs : wdDefs;
    for (let si = 0; si < defs.length; si++) {
      const def = defs[si];
      for (let ci = 0; ci < sections.length; ci++) {
        const cs      = sections[ci];
        const subIdx  = (ci + si + di * 3) % subjects.length;
        const subject = subjects[subIdx];
        const pool    = tBySubject[subIdx];
        let assigned  = false;
        for (const teacher of pool) {
          if (!busy[teacher.id][day][def.id]) {
            busy[teacher.id][day][def.id] = true;
            result.get(cs.id).push({ day, periodDefinitionId: def.id, subjectId: subject.id, teacherId: teacher.id });
            assigned = true; break;
          }
        }
        if (!assigned) console.warn(`⚠  No free teacher: ${cs.name} ${day} ${def.label}`);
      }
    }
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TEACHER FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
async function createTeachers(school, password, teacherDefs) {
  const allProfiles = [];
  const tBySubject  = {};
  for (let i = 0; i < teacherDefs.subjectDefs.length; i++) tBySubject[i] = [];

  for (const def of teacherDefs.defs) {
    const n     = TEACHER_CTR++;
    const email = `teacher${n}@gmail.com`;

    let user = await prisma.user.findUnique({
      where: { email_schoolId: { email, schoolId: school.id } },
    });
    if (!user) {
      user = await prisma.user.create({
        data: {
          name:     `${def.fn} ${def.ln}`,
          email,
          password,
          role:     "TEACHER",
          school:   { connect: { id: school.id } },
        },
      });
    }

    let prof = await prisma.teacherProfile.findUnique({ where: { userId: user.id } });
    if (!prof) {
      const idx = def.n - 1;
      prof = await prisma.teacherProfile.create({
        data: {
          user:            { connect: { id: user.id } },
          school:          { connect: { id: school.id } },
          employeeCode:    `${school.code.slice(0,3)}-T${String(n).padStart(3,"0")}`,
          firstName:       def.fn,
          lastName:        def.ln,
          dateOfBirth:     new Date(`${1970 + (idx % 25)}-${String((idx % 9) + 1).padStart(2,"0")}-15`),
          gender:          idx % 2 === 0 ? "MALE" : "FEMALE",
          phone:           `98${String(10000000 + idx * 1111111).slice(0,8)}`,
          address:         `${100 + idx}, Teacher Colony, Sector ${(idx % 10) + 1}`,
          city:            pick(CITIES, idx),
          state:           pick(STATES, idx),
          zipCode:         pick(ZIPS, idx),
          department:      def.dept,
          designation:     idx < teacherDefs.subjectDefs.length ? "Senior Teacher" : "Teacher",
          qualification:   "M.Sc, B.Ed",
          experienceYears: 2 + (idx % 18),
          joiningDate:     new Date(`${2010 + (idx % 12)}-07-01`),
          employmentType:  "FULL_TIME",
          salary:          28000 + idx * 1200,
          panNumber:       `ABCDE${1000 + idx}F`,
          aadhaarNumber:   String(200000000000 + idx * 11111111111),
        },
      });
    }
    allProfiles.push(prof);
    tBySubject[def.si].push(prof);
  }
  return { allProfiles, tBySubject };
}

// ── Timetable config ──────────────────────────────────────────────────────────
async function createTimetableConfig(school, ay) {
  let cfg = await prisma.timetableConfig.findUnique({
    where:   { schoolId_academicYearId: { schoolId: school.id, academicYearId: ay.id } },
    include: { periodDefinitions: { orderBy: { order: "asc" } } },
  });
  if (!cfg) {
    cfg = await prisma.timetableConfig.create({
      data: {
        school:       { connect: { id: school.id } },
        academicYear: { connect: { id: ay.id } },
        weekdayTotalPeriods:  WD_CFG.totalPeriods,
        saturdayTotalPeriods: SAT_CFG.totalPeriods,
        periodDefinitions: {
          createMany: {
            data: [
              ...buildPeriodDefinitionData(WD_CFG,  "WEEKDAY"),
              ...buildPeriodDefinitionData(SAT_CFG, "SATURDAY"),
            ],
          },
        },
      },
      include: { periodDefinitions: { orderBy: { order: "asc" } } },
    });
  }
  const wdDefs  = cfg.periodDefinitions.filter(d => d.slotType === "PERIOD" && d.dayType === "WEEKDAY");
  const satDefs = cfg.periodDefinitions.filter(d => d.slotType === "PERIOD" && d.dayType === "SATURDAY");
  return { configId: cfg.id, wdDefs, satDefs };
}

// ── Subject + teacher links ───────────────────────────────────────────────────
async function linkSubjectsAndTeachers({ cs, subjects, tBySubject, ay, gi, si }) {
  for (const subj of subjects) {
    await prisma.classSubject.upsert({
      where:  { classSectionId_subjectId_academicYearId: { classSectionId: cs.id, subjectId: subj.id, academicYearId: ay.id } },
      update: {},
      create: {
        classSection: { connect: { id: cs.id } },
        subject:      { connect: { id: subj.id } },
        academicYear: { connect: { id: ay.id } },
      },
    });
  }
  for (let ti = 0; ti < subjects.length; ti++) {
    const pool = tBySubject[ti];
    const pt   = pool[Math.floor((gi * 2 + si) / subjects.length) % pool.length] || pool[0];
    await prisma.teacherAssignment.upsert({
      where:  { classSectionId_subjectId_academicYearId: { classSectionId: cs.id, subjectId: subjects[ti].id, academicYearId: ay.id } },
      update: { teacher: { connect: { id: pt.id } } },
      create: {
        classSection: { connect: { id: cs.id } },
        subject:      { connect: { id: subjects[ti].id } },
        academicYear: { connect: { id: ay.id } },
        teacher:      { connect: { id: pt.id } },
      },
    });
  }
}

// ── Timetable entries ─────────────────────────────────────────────────────────
async function writeTimetable(school, ay, subjects, tBySubject, allSections, wdDefs, satDefs, configId) {
  await prisma.timetableEntry.deleteMany({ where: { schoolId: school.id, academicYearId: ay.id } });
  const ttMap = buildTimetables(wdDefs, satDefs, subjects, tBySubject, allSections);
  let total = 0;
  for (const cs of allSections) {
    const entries = ttMap.get(cs.id) || [];
    if (entries.length) {
      await prisma.timetableEntry.createMany({
        data: entries.map(e => ({
          schoolId:           school.id,
          academicYearId:     ay.id,
          classSectionId:     cs.id,
          day:                e.day,
          periodDefinitionId: e.periodDefinitionId,
          subjectId:          e.subjectId,
          teacherId:          e.teacherId,
          configId,
        })),
        skipDuplicates: true,
      });
    }
    total += entries.length;
  }
  return total;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  seedStudents
// ═══════════════════════════════════════════════════════════════════════════════
async function seedStudents({ school, ay, cs, count, baseAge, password }) {
  const enrollments = [];
  for (let s = 1; s <= count; s++) {
    const sn    = STUDENT_CTR++;
    const pn    = PARENT_CTR++;
    const ci    = sn % CITIES.length;
    const g     = pick(GENDERS, sn);
    const fn    = g === "MALE" ? pick(MALE_NAMES, sn) : pick(FEMALE_NAMES, sn);
    const ln    = pick(LAST_NAMES, sn);
    const email = `student${sn}@gmail.com`;
    const rn    = `${cs.grade.replace(/\s/g,"")}${cs.section || ""}${String(s).padStart(3,"0")}`;
    const an    = `ADM${String(sn).padStart(6,"0")}`;

    // ── Student ──────────────────────────────────────────────────────────────
    let stu = await prisma.student.findFirst({ where: { email, schoolId: school.id } });
    if (!stu) {
      const studentCode = await createUniqueStudentCode();
      stu = await prisma.student.create({
        data: {
          studentCode,
          name:     `${fn} ${ln}`,
          email,
          password,
          schoolId: school.id,
        },
      });
    }

    // ── Personal info ─────────────────────────────────────────────────────────
    await prisma.studentPersonalInfo.upsert({
      where:  { studentId: stu.id },
      update: {},
      create: {
        student:          { connect: { id: stu.id } },
        firstName:        fn,
        lastName:         ln,
        dateOfBirth:      studentDOB(sn, baseAge),
        gender:           g,
        phone:            `9${String(800000000 + sn).slice(0,9)}`,
        address:          `${sn}, ${fn} Nagar, Block ${(sn % 10) + 1}`,
        city:             CITIES[ci],
        state:            STATES[ci],
        zipCode:          ZIPS[ci],
        bloodGroup:       pick(BLOOD_GROUPS, sn),
        parentName:       `${pick(PARENT_NAMES, sn + 11)} ${pick(LAST_NAMES, sn + 7)}`,
        parentEmail:      `parent${pn}@gmail.com`,
        parentPhone:      `9${String(700000000 + sn).slice(0,9)}`,
        emergencyContact: `9${String(600000000 + sn).slice(0,9)}`,
      },
    });

    // ── Enrollment ────────────────────────────────────────────────────────────
    const enr = await prisma.studentEnrollment.upsert({
      where:  { studentId_academicYearId: { studentId: stu.id, academicYearId: ay.id } },
      update: {},
      create: {
        admissionNumber: an,
        admissionDate:   admDate(sn),
        student:         { connect: { id: stu.id } },
        classSection:    { connect: { id: cs.id } },
        academicYear:    { connect: { id: ay.id } },
        rollNumber:      rn,
        status:          "ACTIVE",
      },
    });
    enrollments.push({ studentId: stu.id, classSectionId: cs.id, enrollmentId: enr.id });

    // ── Parent ────────────────────────────────────────────────────────────────
    const pe  = `parent${pn}@gmail.com`;
    const par = await prisma.parent.upsert({
      where:  { email_schoolId: { email: pe, schoolId: school.id } },
      update: {},
      create: {
        name:       `${pick(PARENT_NAMES, sn + 7)} ${pick(LAST_NAMES, pn + 5)}`,
        email:      pe,
        password,
        phone:      `9${String(700000000 + sn).slice(0,9)}`,
        occupation: pick(OCCS, sn),
        school:     { connect: { id: school.id } },
      },
    });

    // ── StudentParent link ────────────────────────────────────────────────────
    const spExisting = await prisma.studentParent.findUnique({
      where: { studentId_relation: { studentId: stu.id, relation: "FATHER" } },
    });
    if (!spExisting) {
      await prisma.studentParent.create({
        data: {
          student:          { connect: { id: stu.id } },
          parent:           { connect: { id: par.id } },
          relation:         "FATHER",
          isPrimary:        true,
          emergencyContact: true,
        },
      });
    }
  }
  return enrollments;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  seedAssessments
// ═══════════════════════════════════════════════════════════════════════════════
async function seedAssessments({ school, ay, allSections, subjects, allEnrollments }) {
  console.log(`\n   📝  Seeding assessments for ${school.name}…`);

  // ── 1. Terms ──────────────────────────────────────────────────────────────
  const TERM_DEFS = [
    { name: "Term 1", order: 1 },
  ];
  const terms = [];
  for (const td of TERM_DEFS) {
    let term = await prisma.assessmentTerm.findFirst({
      where: { name: td.name, academicYearId: ay.id, schoolId: school.id },
    });
    if (!term) {
      term = await prisma.assessmentTerm.create({
        data: {
          name:         td.name,
          order:        td.order,
          academicYear: { connect: { id: ay.id } },
          school:       { connect: { id: school.id } },
        },
      });
    }
    terms.push(term);
  }

  // ── 2. Assessment groups ──────────────────────────────────────────────────
  const GROUP_DEFS = [
    { name: "Unit Test",  termIdx: 0, weightage: 20, maxMarks: 20,  passingMarks: 7,  startDate: "2025-07-15", isLocked: true, isPublished: true },
    { name: "Final Exam", termIdx: 0, weightage: 80, maxMarks: 100, passingMarks: 35, startDate: "2026-01-15", isLocked: true, isPublished: true },
  ];
  const groups = [];
  for (const gd of GROUP_DEFS) {
    let grp = await prisma.assessmentGroup.findFirst({
      where: { name: gd.name, academicYearId: ay.id, schoolId: school.id },
    });
    if (!grp) {
      grp = await prisma.assessmentGroup.create({
        data: {
          name:         gd.name,
          weightage:    gd.weightage,
          isPublished:  gd.isPublished,
          isLocked:     gd.isLocked,
          academicYear: { connect: { id: ay.id } },
          school:       { connect: { id: school.id } },
          term:         { connect: { id: terms[gd.termIdx].id } },
        },
      });
    }
    groups.push({ ...grp, _maxMarks: gd.maxMarks, _passingMarks: gd.passingMarks, _startDate: gd.startDate });
  }
  console.log(`      ✅  ${terms.length} terms, ${groups.length} assessment groups`);

  // ── 3. Schedules ──────────────────────────────────────────────────────────
  const limitedSections = allSections.slice(0, MAX_SECTIONS);
  const limitedSubjects = subjects.slice(0, MAX_SUBJECTS);

  const allSchedules   = [];
  let   totalSchedules = 0;

  for (const grp of groups) {
    for (const cs of limitedSections) {
      for (let subIdx = 0; subIdx < limitedSubjects.length; subIdx++) {
        const subj    = limitedSubjects[subIdx];
        const base    = new Date(`${grp._startDate}T00:00:00.000Z`);
        base.setUTCDate(base.getUTCDate() + subIdx);
        const dateStr = base.toISOString().split("T")[0];

        let sched = await prisma.assessmentSchedule.findFirst({
          where: { assessmentGroupId: grp.id, classSectionId: cs.id, subjectId: subj.id },
        });
        if (!sched) {
          sched = await prisma.assessmentSchedule.create({
            data: {
              assessmentGroup: { connect: { id: grp.id } },
              classSection:    { connect: { id: cs.id } },
              subject:         { connect: { id: subj.id } },
              maxMarks:        grp._maxMarks,
              passingMarks:    grp._passingMarks,
              examDate:        new Date(`${dateStr}T12:00:00.000Z`),
              startTime:       new Date(`${dateStr}T09:00:00.000Z`),
              endTime:         new Date(`${dateStr}T12:00:00.000Z`),
              venue:           `Hall ${(limitedSections.indexOf(cs) % 5) + 1}`,
            },
          });
          totalSchedules++;
        }
        allSchedules.push({ sched, classSectionId: cs.id, maxMarks: grp._maxMarks, passingMarks: grp._passingMarks });
      }
    }
  }
  console.log(`      ✅  ${totalSchedules} exam schedules`);

  // ── 4. Marks (only fields that exist in the Marks model) ──────────────────
  const sectionStudents = {};
  for (const { studentId, classSectionId } of allEnrollments) {
    if (!sectionStudents[classSectionId]) sectionStudents[classSectionId] = [];
    sectionStudents[classSectionId].push(studentId);
  }

  let totalMarksInserted = 0;

  for (const cs of limitedSections) {
    const studentIds      = (sectionStudents[cs.id] || []).slice(0, STUDENTS_PER_SECTION);
    if (!studentIds.length) continue;

    const sectionSchedules = allSchedules.filter(s => s.classSectionId === cs.id);
    const toCreate         = [];

    for (let schIdx = 0; schIdx < sectionSchedules.length; schIdx++) {
      const { sched, maxMarks, passingMarks } = sectionSchedules[schIdx];

      for (let stuIdx = 0; stuIdx < studentIds.length; stuIdx++) {
        const studentId = studentIds[stuIdx];
        const { isAbsent, marksObtained, remarks } = genMarks(stuIdx, schIdx, maxMarks, passingMarks);

        // ✅ STRICT SCHEMA MATCH — Marks model fields only:
        //    id, scheduleId, studentId, marksObtained, isAbsent, remarks, createdAt, updatedAt
        toCreate.push({
          studentId,
          scheduleId:    sched.id,
          marksObtained: isAbsent ? null : marksObtained,
          isAbsent,
          remarks,
        });
      }
    }

    if (toCreate.length) {
      await prisma.marks.createMany({ data: toCreate, skipDuplicates: true });
      totalMarksInserted += toCreate.length;
    }
  }
  console.log(`      ✅  ${totalMarksInserted} mark entries`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  seedAttendance
// ═══════════════════════════════════════════════════════════════════════════════
async function seedAttendance({ school, ay, allSections, allEnrollments, adminUser }) {
  console.log(`\n   📅  Seeding attendance for ${school.name}…`);

  const sectionStudents = {};
  for (const { studentId, classSectionId } of allEnrollments) {
    if (!sectionStudents[classSectionId]) sectionStudents[classSectionId] = [];
    sectionStudents[classSectionId].push(studentId);
  }

  const HOLIDAYS = new Set([
    "2025-08-15","2025-09-02","2025-10-02","2025-10-14","2025-10-21",
    "2025-11-01","2025-12-25","2026-01-01","2026-01-14","2026-01-26",
    "2026-02-26","2026-03-14","2026-03-20",
  ]);

  const schoolDays = [];
  const cur = new Date("2025-06-02T00:00:00.000Z");
  const endDate = new Date("2026-03-27T00:00:00.000Z");
  while (cur <= endDate) {
    const dayOfWeek = cur.getUTCDay();
    const dateStr   = cur.toISOString().split("T")[0];
    if (dayOfWeek !== 0 && !HOLIDAYS.has(dateStr)) schoolDays.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  console.log(`      📆  ${schoolDays.length} school days`);

  const STATUSES = ["PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","ABSENT","ABSENT","LATE","HALF_DAY","EXCUSED"];
  let totalInserted = 0;

  for (const cs of allSections) {
    const studentIds = sectionStudents[cs.id] || [];
    if (!studentIds.length) continue;

    // Process in batches of 30 days
    for (let di = 0; di < schoolDays.length; di += 30) {
      const dayBatch = schoolDays.slice(di, di + 30);
      const toCreate = [];

      for (const date of dayBatch) {
        const dateStr = date.toISOString().split("T")[0];
        for (let stuIdx = 0; stuIdx < studentIds.length; stuIdx++) {
          const studentId = studentIds[stuIdx];
          const seed      = (stuIdx * 13 + di * 7 + date.getUTCDate() * 3) % STATUSES.length;
          const status    = STATUSES[seed];

          toCreate.push({
            date:           new Date(`${dateStr}T07:30:00.000Z`),
            status,
            studentId,
            classSectionId: cs.id,
            academicYearId: ay.id,
            markedById:     adminUser.id,
          });
        }
      }

      if (toCreate.length) {
        await prisma.attendanceRecord.createMany({ data: toCreate, skipDuplicates: true });
        totalInserted += toCreate.length;
      }
    }
  }
  console.log(`      ✅  ${totalInserted} attendance records`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  seedTeacherAttendance
// ═══════════════════════════════════════════════════════════════════════════════
async function seedTeacherAttendance({ school, ay, allTeachers, adminUser }) {
  console.log(`\n   👨‍🏫  Seeding teacher attendance for ${school.name}…`);

  const HOLIDAYS = new Set([
    "2025-08-15","2025-09-02","2025-10-02","2025-10-14","2025-10-21",
    "2025-11-01","2025-12-25","2026-01-01","2026-01-14","2026-01-26",
    "2026-02-26","2026-03-14","2026-03-20",
  ]);

  const schoolDays = [];
  const cur = new Date("2025-06-02T00:00:00.000Z");
  const endDate = new Date("2026-03-27T00:00:00.000Z");
  while (cur <= endDate) {
    const dayOfWeek = cur.getUTCDay();
    const dateStr   = cur.toISOString().split("T")[0];
    if (dayOfWeek !== 0 && !HOLIDAYS.has(dateStr)) schoolDays.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const T_STATUSES = ["PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","ABSENT","LATE","HALF_DAY","ON_LEAVE"];
  let totalInserted = 0;

  // Process in batches of 30 days; batch-fetch existing records per batch
  for (let di = 0; di < schoolDays.length; di += 30) {
    const dayBatch = schoolDays.slice(di, di + 30);
    if (!dayBatch.length) continue;

    // Batch fetch existing records for the whole window (no per-day DB calls)
    const existingRecords = await prisma.teacherAttendance.findMany({
      where: {
        schoolId:      school.id,
        academicYearId: ay.id,
        date: {
          gte: dayBatch[0],
          lt:  new Date(dayBatch[dayBatch.length - 1].getTime() + 86400000),
        },
      },
      select: { teacherId: true, date: true },
    });

    // Build Map<dateStr, Set<teacherId>>
    const existingMap = new Map();
    for (const rec of existingRecords) {
      const d = rec.date.toISOString().split("T")[0];
      if (!existingMap.has(d)) existingMap.set(d, new Set());
      existingMap.get(d).add(rec.teacherId);
    }

    const toCreate = [];
    for (const date of dayBatch) {
      const dateStr    = date.toISOString().split("T")[0];
      const existingSet = existingMap.get(dateStr) || new Set();

      for (let ti = 0; ti < allTeachers.length; ti++) {
        const teacher = allTeachers[ti];
        if (existingSet.has(teacher.id)) continue;

        const seed   = (ti * 11 + di * 5 + date.getUTCDate() * 7) % T_STATUSES.length;
        const status = T_STATUSES[seed];

        toCreate.push({
          date:           new Date(`${dateStr}T08:00:00.000Z`),
          status,
          teacherId:      teacher.id,
          schoolId:       school.id,
          academicYearId: ay.id,
          markedById:     adminUser.id,
        });
      }
    }

    if (toCreate.length) {
      await prisma.teacherAttendance.createMany({ data: toCreate, skipDuplicates: true });
      totalInserted += toCreate.length;
    }
  }
  console.log(`      ✅  ${totalInserted} teacher attendance records`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  seedHolidays
// ═══════════════════════════════════════════════════════════════════════════════
async function seedHolidays({ school, ay, adminUser }) {
  console.log(`\n   🗓️  Seeding holidays for ${school.name}…`);

  const GOVT_HOLIDAYS = [
    { title: "Independence Day",   description: "National holiday",        month: 8,  day: 15 },
    { title: "Gandhi Jayanti",     description: "National holiday",        month: 10, day: 2  },
    { title: "Republic Day",       description: "National holiday",        month: 1,  day: 26 },
    { title: "Christmas",          description: "Christmas day",           month: 12, day: 25 },
    { title: "New Year Day",       description: "New Year",                month: 1,  day: 1  },
    { title: "Kannada Rajyotsava", description: "Karnataka formation day", month: 11, day: 1  },
  ];

  for (const h of GOVT_HOLIDAYS) {
    const existing = await prisma.schoolHoliday.findFirst({
      where: { schoolId: school.id, month: h.month, day: h.day },
    });
    if (!existing) {
      await prisma.schoolHoliday.create({
        data: {
          title:       h.title,
          description: h.description,
          type:        "GOVERNMENT",
          month:       h.month,
          day:         h.day,
          school:      { connect: { id: school.id } },
          createdBy:   { connect: { id: adminUser.id } },
        },
      });
    }
  }

  const SCHOOL_HOLIDAYS = [
    { title: "Dasara Holidays",        description: "Dussehra break",         startDate: "2025-10-13", endDate: "2025-10-17" },
    { title: "Diwali Holidays",        description: "Deepavali break",        startDate: "2025-10-20", endDate: "2025-10-24" },
    { title: "Winter Break",           description: "Christmas break",        startDate: "2025-12-22", endDate: "2025-12-31" },
    { title: "Sankranti Holidays",     description: "Harvest festival break", startDate: "2026-01-13", endDate: "2026-01-15" },
    { title: "Annual Day Preparation", description: "School annual day prep", startDate: "2026-02-10", endDate: "2026-02-11" },
    { title: "Holi Break",             description: "Holi festival",          startDate: "2026-03-13", endDate: "2026-03-14" },
    { title: "Ugadi Holidays",         description: "Kannada New Year",       startDate: "2026-03-20", endDate: "2026-03-21" },
  ];

  for (const h of SCHOOL_HOLIDAYS) {
    const existing = await prisma.schoolHoliday.findFirst({
      where: { schoolId: school.id, title: h.title, academicYearId: ay.id },
    });
    if (!existing) {
      await prisma.schoolHoliday.create({
        data: {
          title:        h.title,
          description:  h.description,
          type:         "SCHOOL",
          startDate:    new Date(`${h.startDate}T00:00:00.000Z`),
          endDate:      new Date(`${h.endDate}T23:59:59.000Z`),
          school:       { connect: { id: school.id } },
          academicYear: { connect: { id: ay.id } },
          createdBy:    { connect: { id: adminUser.id } },
        },
      });
    }
  }
  console.log(`      ✅  ${GOVT_HOLIDAYS.length} government + ${SCHOOL_HOLIDAYS.length} school holidays`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  seedGallery
// ═══════════════════════════════════════════════════════════════════════════════
async function seedGallery({ school, adminUser }) {
  console.log(`\n   🖼️  Seeding gallery for ${school.name}…`);

  const ALBUMS = [
    { title: "Annual Day 2025",              description: "Annual day celebrations",          eventDate: "2025-12-15" },
    { title: "Independence Day Celebration", description: "Flag hoisting & cultural programs", eventDate: "2025-08-15" },
    { title: "Sports Day 2025",              description: "Annual sports meet",                eventDate: "2025-10-05" },
    { title: "Science Exhibition 2025",      description: "Student science projects",          eventDate: "2025-11-20" },
    { title: "Cultural Fest 2026",           description: "Inter-class cultural competition",  eventDate: "2026-01-30" },
    { title: "Republic Day 2026",            description: "Republic day celebration",           eventDate: "2026-01-26" },
  ];

  for (let ai = 0; ai < ALBUMS.length; ai++) {
    const alb      = ALBUMS[ai];
    const existing = await prisma.galleryAlbum.findFirst({ where: { schoolId: school.id, title: alb.title } });
    if (existing) continue;

    const album = await prisma.galleryAlbum.create({
      data: {
        title:         alb.title,
        description:   alb.description,
        eventDate:     new Date(`${alb.eventDate}T00:00:00.000Z`),
        school:        { connect: { id: school.id } },
        createdBy:     { connect: { id: adminUser.id } },
        coverImageUrl: `https://picsum.photos/seed/${school.code}-${alb.title.replace(/\s/g,"-")}/800/400`,
        isPublished:   true,
      },
    });

    const imgCount = 6 + (ai % 5);
    const images   = [];
    for (let i = 1; i <= imgCount; i++) {
      images.push({
        albumId:       album.id,
        fileKey:       `gallery/${school.code}/${album.id}/img-${i}.webp`,
        thumbKey:      `gallery/${school.code}/${album.id}/thumb-${i}.webp`,
        fileType:      "image/webp",
        fileSizeBytes: 150000 + i * 12000,
        caption:       `${alb.title} - Photo ${i}`,
        uploadedAt:    new Date(`${alb.eventDate}T${10 + i}:00:00.000Z`),
      });
    }
    await prisma.galleryImage.createMany({ data: images });
  }
  console.log(`      ✅  ${ALBUMS.length} albums with images`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  seedActivities
// ═══════════════════════════════════════════════════════════════════════════════
async function seedActivitiesAndEvents({ school, ay, allSections, allEnrollments, adminUser }) {
  console.log(`\n   🏆  Seeding activities & events for ${school.name}…`);

  const sectionStudents = {};
  for (const { studentId, classSectionId } of allEnrollments) {
    if (!sectionStudents[classSectionId]) sectionStudents[classSectionId] = [];
    sectionStudents[classSectionId].push(studentId);
  }

  // ── Activities ─────────────────────────────────────────────────────────────
  const ACTIVITY_DEFS = [
    { name: "Cricket Club",       category: "SPORTS",   participationType: "TEAM",       description: "School cricket team training" },
    { name: "Chess Club",         category: "SPORTS",   participationType: "INDIVIDUAL", description: "Chess training and competitions" },
    { name: "Debate Club",        category: "ACADEMIC", participationType: "INDIVIDUAL", description: "Public speaking and debate" },
    { name: "Drama Club",         category: "CULTURAL", participationType: "TEAM",       description: "Theatre and drama" },
    { name: "Eco Warriors Club",  category: "OTHER",    participationType: "TEAM",       description: "Environmental awareness" },
  ];

  const activities = [];
  for (const def of ACTIVITY_DEFS) {
    let activity = await prisma.activity.findFirst({
      where: { name: def.name, schoolId: school.id, academicYearId: ay.id },
    });
    if (!activity) {
      activity = await prisma.activity.create({
        data: {
          name:              def.name,
          description:       def.description,
          category:          def.category,
          participationType: def.participationType,
          isArchived:        false,
          school:            { connect: { id: school.id } },
          academicYear:      { connect: { id: ay.id } },
          createdBy:         { connect: { id: adminUser.id } },
        },
      });
    }
    activities.push(activity);
  }

  // Link activities to class sections
  for (const activity of activities) {
    const sectionSubset = allSections.slice(0, Math.min(MAX_SECTIONS, allSections.length));
    for (const cs of sectionSubset) {
      const exists = await prisma.activityClass.findUnique({
        where: { activityId_classSectionId: { activityId: activity.id, classSectionId: cs.id } },
      });
      if (!exists) {
        await prisma.activityClass.create({
          data: {
            activity:     { connect: { id: activity.id } },
            classSection: { connect: { id: cs.id } },
          },
        });
      }
    }
  }

  // Enroll students
  let enrollCount = 0;
  for (const cs of allSections.slice(0, MAX_SECTIONS)) {
    const studentIds = (sectionStudents[cs.id] || []).slice(0, STUDENTS_PER_SECTION);
    for (let si = 0; si < studentIds.length; si++) {
      const studentId = studentIds[si];
      const actIdx    = si % activities.length;
      const activity  = activities[actIdx];
      const exists    = await prisma.studentActivityEnrollment.findUnique({
        where: { studentId_activityId_academicYearId: { studentId, activityId: activity.id, academicYearId: ay.id } },
      });
      if (!exists) {
        await prisma.studentActivityEnrollment.create({
          data: {
            student:      { connect: { id: studentId } },
            activity:     { connect: { id: activity.id } },
            academicYear: { connect: { id: ay.id } },
            status:       "ACTIVE",
            enrolledAt:   new Date("2025-07-01T00:00:00.000Z"),
          },
        });
        enrollCount++;
      }
    }
  }
  console.log(`      ✅  ${activities.length} activities, ${enrollCount} student enrollments`);

  // ── Events ─────────────────────────────────────────────────────────────────
  const EVENT_DEFS = [
    {
      name: "Annual Sports Meet 2025", description: "Inter-class sports competition",
      eventType: "COMPETITION", participationMode: "BOTH", status: "COMPLETED",
      eventDate: "2025-10-05", venue: "School Ground",
      maxTeamsPerClass: 2, maxStudentsPerClass: 20,
    },
    {
      name: "Science Olympiad 2025", description: "School-level science olympiad",
      eventType: "COMPETITION", participationMode: "INDIVIDUAL", status: "COMPLETED",
      eventDate: "2025-11-20", venue: "Science Hall",
      maxTeamsPerClass: null, maxStudentsPerClass: 10,
    },
    {
      name: "Annual Cultural Fest 2025", description: "Dance, drama, music competition",
      eventType: "CULTURAL", participationMode: "BOTH", status: "COMPLETED",
      eventDate: "2025-12-15", venue: "School Auditorium",
      maxTeamsPerClass: 3, maxStudentsPerClass: 30,
    },
  ];

  const events = [];
  for (const def of EVENT_DEFS) {
    let event = await prisma.activityEvent.findFirst({
      where: { name: def.name, schoolId: school.id, academicYearId: ay.id },
    });
    if (!event) {
      event = await prisma.activityEvent.create({
        data: {
          name:                def.name,
          description:         def.description,
          eventType:           def.eventType,
          participationMode:   def.participationMode,
          status:              def.status,
          isArchived:          false,
          isAutoGenerated:     false,
          eventDate:           new Date(`${def.eventDate}T09:00:00.000Z`),
          venue:               def.venue,
          maxTeamsPerClass:    def.maxTeamsPerClass,
          maxStudentsPerClass: def.maxStudentsPerClass,
          school:              { connect: { id: school.id } },
          academicYear:        { connect: { id: ay.id } },
          createdBy:           { connect: { id: adminUser.id } },
        },
      });
    }
    events.push(event);
  }

  // Link events to class sections
  for (const event of events) {
    const sectionSubset = allSections.slice(0, Math.min(MAX_SECTIONS, allSections.length));
    for (const cs of sectionSubset) {
      const exists = await prisma.eventClass.findUnique({
        where: { eventId_classSectionId: { eventId: event.id, classSectionId: cs.id } },
      });
      if (!exists) {
        await prisma.eventClass.create({
          data: {
            event:        { connect: { id: event.id } },
            classSection: { connect: { id: cs.id } },
          },
        });
      }
    }
  }

  // Teams for TEAM / BOTH events
  const TEAM_COLORS = ["#E53E3E","#3182CE","#38A169","#D69E2E","#805AD5","#DD6B20"];
  const teamEvents  = events.filter(e => e.participationMode === "TEAM" || e.participationMode === "BOTH");

  for (const event of teamEvents) {
    const sectionSubset = allSections.slice(0, Math.min(MAX_SECTIONS, allSections.length));
    for (let si = 0; si < sectionSubset.length; si++) {
      const cs         = sectionSubset[si];
      const studentIds = (sectionStudents[cs.id] || []).slice(0, STUDENTS_PER_SECTION);
      if (!studentIds.length) continue;

      const teamName = `${cs.name} Team`;
      let team = await prisma.eventTeam.findFirst({ where: { eventId: event.id, name: teamName } });
      if (!team) {
        team = await prisma.eventTeam.create({
          data: {
            name:      teamName,
            colorHex:  TEAM_COLORS[si % TEAM_COLORS.length],
            event:     { connect: { id: event.id } },
            createdBy: { connect: { id: adminUser.id } },
          },
        });
      }

      for (const studentId of studentIds) {
        const exists = await prisma.eventTeamMember.findUnique({
          where: { teamId_studentId: { teamId: team.id, studentId } },
        });
        if (!exists) {
          await prisma.eventTeamMember.create({
            data: {
              team:    { connect: { id: team.id } },
              student: { connect: { id: studentId } },
              role:    "Player",
            },
          });
        }
      }

      if (event.status === "COMPLETED") {
        const existsResult = await prisma.eventResult.findUnique({
          where: { eventId_teamId: { eventId: event.id, teamId: team.id } },
        });
        if (!existsResult) {
          const resultTypes = ["WINNER","RUNNER_UP","THIRD_PLACE","PARTICIPATED","PARTICIPATED"];
          await prisma.eventResult.create({
            data: {
              event:      { connect: { id: event.id } },
              team:       { connect: { id: team.id } },
              resultType: resultTypes[si % resultTypes.length],
              position:   si + 1,
              awardTitle: si === 0 ? "First Place Trophy" : si === 1 ? "Runner-Up Trophy" : null,
              remarks:    `${cs.name} performed excellently`,
              recordedBy: { connect: { id: adminUser.id } },
            },
          });
        }
      }
    }
  }

  // Individual participants & results
  const indivEvents = events.filter(e => e.participationMode === "INDIVIDUAL" || e.participationMode === "BOTH");
  for (const event of indivEvents) {
    const sectionSubset = allSections.slice(0, Math.min(MAX_SECTIONS, allSections.length));
    for (const cs of sectionSubset) {
      const studentIds = (sectionStudents[cs.id] || []).slice(0, STUDENTS_PER_SECTION);
      for (let pi = 0; pi < studentIds.length; pi++) {
        const studentId   = studentIds[pi];
        const existsPart  = await prisma.eventParticipant.findUnique({
          where: { eventId_studentId: { eventId: event.id, studentId } },
        });
        if (!existsPart) {
          await prisma.eventParticipant.create({
            data: {
              event:        { connect: { id: event.id } },
              student:      { connect: { id: studentId } },
              participated: true,
              score:        60 + pi * 5,
              remarks:      "Good performance",
            },
          });
        }

        if (event.status === "COMPLETED" && pi < 3) {
          const existsResult = await prisma.eventResult.findUnique({
            where: { eventId_studentId: { eventId: event.id, studentId } },
          });
          if (!existsResult) {
            const rt = ["WINNER","RUNNER_UP","THIRD_PLACE"][pi];
            await prisma.eventResult.create({
              data: {
                event:      { connect: { id: event.id } },
                student:    { connect: { id: studentId } },
                resultType: rt,
                position:   pi + 1,
                awardTitle: pi === 0 ? "Gold Medal" : pi === 1 ? "Silver Medal" : "Bronze Medal",
                recordedBy: { connect: { id: adminUser.id } },
              },
            });
          }
        }
      }
    }
  }

  // Certificates for completed events
  const completedEvents = events.filter(e => e.status === "COMPLETED");
  let certCount = 0;
  for (const event of completedEvents) {
    const results = await prisma.eventResult.findMany({
      where:   { eventId: event.id },
      include: {
        student: { include: { personalInfo: true } },
        team:    { include: { members: { include: { student: { include: { personalInfo: true } } } } } },
      },
    });
    for (const result of results) {
      if (result.studentId) {
        const exists = await prisma.certificate.findUnique({
          where: { studentId_resultId: { studentId: result.studentId, resultId: result.id } },
        });
        if (!exists) {
          const pi = result.student?.personalInfo;
          await prisma.certificate.create({
            data: {
              student:         { connect: { id: result.studentId } },
              event:           { connect: { id: event.id } },
              result:          { connect: { id: result.id } },
              studentName:     pi ? `${pi.firstName} ${pi.lastName}` : result.student?.name || "Student",
              eventName:       event.name,
              achievementText: `${result.resultType.replace(/_/g," ")} in ${event.name}`,
              academicYear:    "2025-26",
              status:          "ISSUED",
              issuedDate:      new Date("2026-01-15T00:00:00.000Z"),
            },
          });
          certCount++;
        }
      } else if (result.teamId && result.team) {
        for (const member of result.team.members) {
          const exists = await prisma.certificate.findUnique({
            where: { studentId_resultId: { studentId: member.studentId, resultId: result.id } },
          });
          if (!exists) {
            const pi = member.student?.personalInfo;
            await prisma.certificate.create({
              data: {
                student:         { connect: { id: member.studentId } },
                event:           { connect: { id: event.id } },
                team:            { connect: { id: result.teamId } },
                result:          { connect: { id: result.id } },
                studentName:     pi ? `${pi.firstName} ${pi.lastName}` : member.student?.name || "Student",
                eventName:       event.name,
                achievementText: `${result.resultType.replace(/_/g," ")} as part of ${result.team.name} in ${event.name}`,
                academicYear:    "2025-26",
                status:          "ISSUED",
                issuedDate:      new Date("2026-01-15T00:00:00.000Z"),
              },
            });
            certCount++;
          }
        }
      }
    }
  }
  console.log(`      ✅  ${events.length} events, ${certCount} certificates`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  seedAwards
// ═══════════════════════════════════════════════════════════════════════════════
async function seedAwards({ school, ay, allSections, allEnrollments, adminUser }) {
  console.log(`\n   🏅  Seeding awards for ${school.name}…`);

  const sectionStudents = {};
  for (const { studentId, classSectionId } of allEnrollments) {
    if (!sectionStudents[classSectionId]) sectionStudents[classSectionId] = [];
    sectionStudents[classSectionId].push(studentId);
  }

  const AWARD_DEFS = [
    { name: "Best Student Award",       category: "ACADEMIC",   description: "Top performing student" },
    { name: "Perfect Attendance Award", category: "ATTENDANCE", description: "100% attendance throughout the year" },
    { name: "Sports Champion",          category: "SPORTS",     description: "Best sports performer" },
    { name: "Cultural Star Award",      category: "CULTURAL",   description: "Outstanding cultural performance" },
    { name: "Discipline Award",         category: "DISCIPLINE", description: "Model of discipline and conduct" },
    { name: "Leadership Award",         category: "LEADERSHIP", description: "Exemplary leadership qualities" },
  ];

  const awards = [];
  for (const def of AWARD_DEFS) {
    let award = await prisma.award.findUnique({
      where: { schoolId_name: { schoolId: school.id, name: def.name } },
    });
    if (!award) {
      award = await prisma.award.create({
        data: {
          name:        def.name,
          description: def.description,
          category:    def.category,
          school:      { connect: { id: school.id } },
        },
      });
    }
    awards.push(award);
  }

  let awardCount = 0;
  for (let si = 0; si < Math.min(allSections.length, MAX_SECTIONS); si++) {
    const cs         = allSections[si];
    const studentIds = sectionStudents[cs.id] || [];
    if (!studentIds.length) continue;

    const awardsToGive = awards.slice(0, 3);
    for (let ai = 0; ai < awardsToGive.length; ai++) {
      const award     = awardsToGive[ai];
      const studentId = studentIds[ai % studentIds.length];

      const exists = await prisma.studentAward.findUnique({
        where: { studentId_awardId_academicYearId: { studentId, awardId: award.id, academicYearId: ay.id } },
      });
      if (exists) continue;

      const studentAward = await prisma.studentAward.create({
        data: {
          student:      { connect: { id: studentId } },
          award:        { connect: { id: award.id } },
          academicYear: { connect: { id: ay.id } },
          classSection: { connect: { id: cs.id } },
          givenBy:      { connect: { id: adminUser.id } },
          remarks:      `Awarded for outstanding performance in ${award.name}`,
        },
      });
      awardCount++;

      const student    = await prisma.student.findUnique({ where: { id: studentId }, include: { personalInfo: true } });
      const pi         = student?.personalInfo;
      const certExists = await prisma.certificate.findUnique({
        where: { studentId_studentAwardId: { studentId, studentAwardId: studentAward.id } },
      });
      if (!certExists) {
        await prisma.certificate.create({
          data: {
            student:         { connect: { id: studentId } },
            studentAward:    { connect: { id: studentAward.id } },
            studentName:     pi ? `${pi.firstName} ${pi.lastName}` : student?.name || "Student",
            eventName:       award.name,
            achievementText: `Received ${award.name} for the academic year 2025-26`,
            academicYear:    "2025-26",
            status:          "ISSUED",
            issuedDate:      new Date("2026-03-15T00:00:00.000Z"),
          },
        });
      }
    }
  }
  console.log(`      ✅  ${awards.length} award types, ${awardCount} student awards`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  seedStaffAndSalaries
// ═══════════════════════════════════════════════════════════════════════════════
async function seedStaffAndSalaries({ school }) {
  console.log(`\n   👷  Seeding staff profiles & salaries for ${school.name}…`);

  const STAFF_DEFS = [
    { firstName: "Ramu",     lastName: "Naik",   role: "Watchman",       groupType: "Group B", basicSalary: 18000 },
    { firstName: "Srinivas", lastName: "Hegde",  role: "Plumber",        groupType: "Group B", basicSalary: 17000 },
    { firstName: "Basanna",  lastName: "Kamble", role: "Peon",           groupType: "Group C", basicSalary: 12000 },
    { firstName: "Geetha",   lastName: "Lamani", role: "Sweeper",        groupType: "Group C", basicSalary: 11000 },
    { firstName: "Kariappa", lastName: "Nayak",  role: "Security Guard", groupType: "Group B", basicSalary: 19000 },
  ];

  const staffList = [];
  for (let i = 0; i < STAFF_DEFS.length; i++) {
    const def      = STAFF_DEFS[i];
    const existing = await prisma.staffProfile.findFirst({
      where: { schoolId: school.id, firstName: def.firstName, lastName: def.lastName },
    });
    if (existing) { staffList.push(existing); continue; }

    const staff = await prisma.staffProfile.create({
      data: {
        firstName:   def.firstName,
        lastName:    def.lastName,
        role:        def.role,
        groupType:   def.groupType,
        basicSalary: def.basicSalary,
        joiningDate: new Date(`${2018 + (i % 5)}-06-01`),
        status:      "ACTIVE",
        phone:       `9${String(800000000 + i * 11111).slice(0,9)}`,
        school:      { connect: { id: school.id } },
      },
    });
    staffList.push(staff);
  }

  const SALARY_MONTHS = [
    { month: 6,  year: 2025 }, { month: 7,  year: 2025 }, { month: 8,  year: 2025 },
    { month: 9,  year: 2025 }, { month: 10, year: 2025 }, { month: 11, year: 2025 },
    { month: 12, year: 2025 }, { month: 1,  year: 2026 }, { month: 2,  year: 2026 },
    { month: 3,  year: 2026 },
  ];

  const CURRENT_MONTH = 3;
  let salaryCount = 0;

  for (const staff of staffList) {
    for (const { month, year } of SALARY_MONTHS) {
      const isPast         = year < 2026 || (year === 2026 && month < CURRENT_MONTH);
      const status         = isPast ? "PAID" : "PENDING";
      const leaveDays      = isPast ? (staff.role === "Peon" ? 1 : 0) : 0;
      const perDay         = Number(staff.basicSalary) / 26;
      const leaveDeduction = parseFloat((leaveDays * perDay).toFixed(2));
      const bonus          = isPast ? (month === 10 ? 2000 : 0) : 0;
      const netSalary      = parseFloat((Number(staff.basicSalary) + bonus - leaveDeduction).toFixed(2));

      if (staff.groupType === "Group B") {
        const exists = await prisma.groupBStaffSalary.findUnique({
          where: { staffId_month_year: { staffId: staff.id, month, year } },
        });
        if (!exists) {
          await prisma.groupBStaffSalary.create({
            data: {
              staff:         { connect: { id: staff.id } },
              schoolId:      school.id,
              staffName:     `${staff.firstName} ${staff.lastName}`,
              staffEmail:    `${staff.firstName.toLowerCase()}@school.com`,
              staffRole:     staff.role,
              month, year,
              basicSalary:   staff.basicSalary,
              bonus,
              deductions:    0,
              netSalary,
              leaveDays,
              leaveDeduction,
              status,
              paymentDate:   isPast ? new Date(`${year}-${String(month).padStart(2,"0")}-28`) : null,
            },
          });
          salaryCount++;
        }
      } else {
        const exists = await prisma.groupCStaffSalary.findUnique({
          where: { staffId_month_year: { staffId: staff.id, month, year } },
        });
        if (!exists) {
          await prisma.groupCStaffSalary.create({
            data: {
              staff:         { connect: { id: staff.id } },
              schoolId:      school.id,
              staffName:     `${staff.firstName} ${staff.lastName}`,
              staffEmail:    `${staff.firstName.toLowerCase()}@school.com`,
              staffRole:     staff.role,
              month, year,
              basicSalary:   staff.basicSalary,
              bonus,
              deductions:    0,
              netSalary,
              leaveDays,
              leaveDeduction,
              status,
              paymentDate:   isPast ? new Date(`${year}-${String(month).padStart(2,"0")}-28`) : null,
            },
          });
          salaryCount++;
        }
      }
    }
  }
  console.log(`      ✅  ${staffList.length} staff, ${salaryCount} salary records`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  seedTeacherSalaries
// ═══════════════════════════════════════════════════════════════════════════════
async function seedTeacherSalaries({ school, allTeachers }) {
  console.log(`\n   💰  Seeding teacher salaries for ${school.name}…`);

  const SALARY_MONTHS = [
    { month: 6,  year: 2025 }, { month: 7,  year: 2025 }, { month: 8,  year: 2025 },
    { month: 9,  year: 2025 }, { month: 10, year: 2025 }, { month: 11, year: 2025 },
    { month: 12, year: 2025 }, { month: 1,  year: 2026 }, { month: 2,  year: 2026 },
    { month: 3,  year: 2026 },
  ];

  const CURRENT_MONTH = 3;
  let totalInserted   = 0;

  for (const teacher of allTeachers) {
    const user        = await prisma.user.findUnique({ where: { id: teacher.userId } });
    const basicSalary = Number(teacher.salary ?? 30000);

    for (const { month, year } of SALARY_MONTHS) {
      const exists = await prisma.teacherMonthlySalary.findUnique({
        where: { teacherId_month_year: { teacherId: teacher.id, month, year } },
      });
      if (exists) continue;

      const isPast         = year < 2026 || (year === 2026 && month < CURRENT_MONTH);
      const status         = isPast ? "PAID" : "PENDING";
      const leaveDays      = isPast ? (teacher.id.charCodeAt(0) % 2) : 0;
      const perDay         = basicSalary / 26;
      const leaveDeduction = parseFloat((leaveDays * perDay).toFixed(2));
      const bonus          = month === 10 ? 3000 : 0;
      const deductions     = parseFloat((basicSalary * 0.12).toFixed(2));
      const netSalary      = parseFloat((basicSalary + bonus - deductions - leaveDeduction).toFixed(2));

      await prisma.teacherMonthlySalary.create({
        data: {
          teacher:      { connect: { id: teacher.id } },
          school:       { connect: { id: school.id } },
          teacherName:  `${teacher.firstName} ${teacher.lastName}`,
          teacherEmail: user?.email ?? `${teacher.firstName.toLowerCase()}@school.com`,
          month, year,
          basicSalary,
          bonus,
          deductions,
          netSalary,
          leaveDays,
          leaveDeduction,
          status,
          paymentDate: isPast ? new Date(`${year}-${String(month).padStart(2,"0")}-28`) : null,
        },
      });
      totalInserted++;
    }
  }
  console.log(`      ✅  ${totalInserted} teacher salary records`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  seedExpenses
// ═══════════════════════════════════════════════════════════════════════════════
async function seedExpenses({ school }) {
  console.log(`\n   💸  Seeding expenses & categories…`);

  const CATEGORY_DEFS = [
    { name: "Maintenance",    icon: "🔧", color: "#E53E3E" },
    { name: "Electricity",    icon: "⚡", color: "#D69E2E" },
    { name: "Stationery",     icon: "📝", color: "#3182CE" },
    { name: "Transport",      icon: "🚌", color: "#38A169" },
    { name: "Salary",         icon: "💰", color: "#805AD5" },
    { name: "Events",         icon: "🎉", color: "#DD6B20" },
    { name: "Infrastructure", icon: "🏗️", color: "#2B6CB0" },
    { name: "Cleaning",       icon: "🧹", color: "#276749" },
  ];

  const categories = [];
  for (const def of CATEGORY_DEFS) {
    let cat = await prisma.expenseCategory.findFirst({ where: { name: def.name } });
    if (!cat) {
      cat = await prisma.expenseCategory.create({
        data: { name: def.name, icon: def.icon, color: def.color, schoolId: school.id },
      });
    }
    categories.push(cat);
  }

  const EXPENSE_DEFS = [
    { label: "Classroom whiteboard replacement",  amount: 15000,  catIdx: 0 },
    { label: "Plumbing repairs – Block B",        amount: 8500,   catIdx: 0 },
    { label: "Electricity bill – June 2025",      amount: 32000,  catIdx: 1 },
    { label: "Electricity bill – September 2025", amount: 28000,  catIdx: 1 },
    { label: "Notebooks & pens – Term 1",         amount: 12000,  catIdx: 2 },
    { label: "School bus fuel – Q1",              amount: 45000,  catIdx: 3 },
    { label: "Teacher salaries – June 2025",      amount: 850000, catIdx: 4 },
    { label: "Annual Day event expenses",         amount: 75000,  catIdx: 5 },
    { label: "Projector installation",            amount: 55000,  catIdx: 6 },
    { label: "Cleaning supplies – Term 1",        amount: 8000,   catIdx: 7 },
  ];

  let expenseCount = 0;
  for (const def of EXPENSE_DEFS) {
    const existing = await prisma.expense.findFirst({ where: { label: def.label } });
    if (existing) continue;

    const expense = await prisma.expense.create({
      data: { label: def.label, amount: def.amount },
    });
    await prisma.expenseCategoryMap.create({
      data: {
        category: { connect: { id: categories[def.catIdx].id } },
        expense:  { connect: { id: expense.id } },
      },
    });
    expenseCount++;
  }
  console.log(`      ✅  ${categories.length} categories, ${expenseCount} expenses`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN SCHOOL SEEDER
// ═══════════════════════════════════════════════════════════════════════════════
async function seedSchool(university, password) {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   🏫  Springfield High School        ║");
  console.log("╚══════════════════════════════════════╝");

  // ── School ─────────────────────────────────────────────────────────────────
  const school = await prisma.school.upsert({
    where:  { code: "SPRINGFIELD_HIGH" },
    update: {},
    create: {
      name:       "Springfield High School",
      code:       "SPRINGFIELD_HIGH",
      type:       "SCHOOL",
      address:    "456 School Lane",
      city:       "Bengaluru",
      state:      "Karnataka",
      phone:      "080-11111111",
      email:      "school@springfield.edu",
      university: { connect: { id: university.id } },
    },
  });

  // ── Admin user ─────────────────────────────────────────────────────────────
  let adminUser = await prisma.user.findUnique({
    where: { email_schoolId: { email: "admin1@gmail.com", schoolId: school.id } },
  });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        name:     "School Admin",
        email:    "admin1@gmail.com",
        password,
        role:     "ADMIN",
        school:   { connect: { id: school.id } },
      },
    });
  }

  // ── Finance user ───────────────────────────────────────────────────────────
  let finUser = await prisma.user.findUnique({
    where: { email_schoolId: { email: "finance1@gmail.com", schoolId: school.id } },
  });
  if (!finUser) {
    finUser = await prisma.user.create({
      data: {
        name:     "Finance Admin",
        email:    "finance1@gmail.com",
        password,
        role:     "FINANCE",
        school:   { connect: { id: school.id } },
      },
    });
  }
  await prisma.financeProfile.upsert({
    where:  { userId: finUser.id },
    update: {},
    create: {
      user:         { connect: { id: finUser.id } },
      school:       { connect: { id: school.id } },
      employeeCode: "FIN-001",
      designation:  "Finance Officer",
      phone:        "9000000001",
    },
  });
  console.log("   ✅  Admin + Finance Admin");

  // ── Promotion config ───────────────────────────────────────────────────────
  await prisma.schoolPromotionConfig.upsert({
    where:  { schoolId: school.id },
    update: {},
    create: {
      school:     { connect: { id: school.id } },
      skipGrades: ["7"],
      lastGrade:  "10",
      firstGrade: "1",
    },
  });

  // ── Academic year ──────────────────────────────────────────────────────────
  const ay = await prisma.academicYear.upsert({
    where:  { name_schoolId: { name: "2025-26", schoolId: school.id } },
    update: { isActive: true },
    create: {
      name:      "2025-26",
      startDate: new Date("2025-06-01"),
      endDate:   new Date("2026-03-31"),
      isActive:  true,
      school:    { connect: { id: school.id } },
    },
  });

  // ── Subjects ───────────────────────────────────────────────────────────────
  const SUBJ_DEFS = [
    { name: "Mathematics",        code: "SCH-MATH" },
    { name: "Science",            code: "SCH-SCI"  },
    { name: "English",            code: "SCH-ENG"  },
    { name: "Social Studies",     code: "SCH-SST"  },
    { name: "Hindi",              code: "SCH-HIN"  },
    { name: "Computer Science",   code: "SCH-CS"   },
    { name: "Physical Education", code: "SCH-PE"   },
  ];
  const subjects = [];
  for (const d of SUBJ_DEFS) {
    subjects.push(await prisma.subject.upsert({
      where:  { code_schoolId: { code: d.code, schoolId: school.id } },
      update: { name: d.name },
      create: { name: d.name, code: d.code, school: { connect: { id: school.id } } },
    }));
  }
  console.log(`   ✅  ${subjects.length} subjects`);

  // ── Teachers ───────────────────────────────────────────────────────────────
  const tStart = TEACHER_CTR;
  const { allProfiles, tBySubject } = await createTeachers(school, password, {
    subjectDefs: SUBJ_DEFS,
    defs: [
      { n: 1,  fn: "Arjun",   ln: "Sharma",   dept: "Mathematics",        si: 0 },
      { n: 2,  fn: "Naveen",  ln: "Reddy",    dept: "Mathematics",        si: 0 },
      { n: 3,  fn: "Sanjana", ln: "Bose",     dept: "Mathematics",        si: 0 },
      { n: 4,  fn: "Priya",   ln: "Nair",     dept: "Science",            si: 1 },
      { n: 5,  fn: "Ramesh",  ln: "Joshi",    dept: "Science",            si: 1 },
      { n: 6,  fn: "Leela",   ln: "Desai",    dept: "Science",            si: 1 },
      { n: 7,  fn: "Rahul",   ln: "Verma",    dept: "English",            si: 2 },
      { n: 8,  fn: "Sunita",  ln: "Ghosh",    dept: "English",            si: 2 },
      { n: 9,  fn: "Kiran",   ln: "Mehta",    dept: "English",            si: 2 },
      { n: 10, fn: "Sneha",   ln: "Pillai",   dept: "Social Studies",     si: 3 },
      { n: 11, fn: "Deepa",   ln: "Nambiar",  dept: "Social Studies",     si: 3 },
      { n: 12, fn: "Suresh",  ln: "Kulkarni", dept: "Social Studies",     si: 3 },
      { n: 13, fn: "Vikram",  ln: "Rao",      dept: "Hindi",              si: 4 },
      { n: 14, fn: "Meena",   ln: "Trivedi",  dept: "Hindi",              si: 4 },
      { n: 15, fn: "Dinesh",  ln: "Pandey",   dept: "Hindi",              si: 4 },
      { n: 16, fn: "Kavitha", ln: "Menon",    dept: "Computer Science",   si: 5 },
      { n: 17, fn: "Ankit",   ln: "Shah",     dept: "Computer Science",   si: 5 },
      { n: 18, fn: "Pooja",   ln: "Iyer",     dept: "Computer Science",   si: 5 },
      { n: 19, fn: "Deepak",  ln: "Kumar",    dept: "Physical Education", si: 6 },
      { n: 20, fn: "Ritu",    ln: "Singh",    dept: "Physical Education", si: 6 },
      { n: 21, fn: "Mohan",   ln: "Das",      dept: "Physical Education", si: 6 },
    ],
  });

  console.log(`   ✅  ${allProfiles.length} teachers  (teacher${tStart}@gmail.com … teacher${TEACHER_CTR - 1}@gmail.com)`);

  // ── Timetable config ───────────────────────────────────────────────────────
  const { configId, wdDefs, satDefs } = await createTimetableConfig(school, ay);

  // ── Class sections (only MAX_SECTIONS per grade for dev speed) ────────────
  const GRADES   = ["1","2","3","4","5","6","8","9","10"];   // 7 is in skipGrades
  const SECTIONS = ["A","B"].slice(0, MAX_SECTIONS);
  const allSections = []; let ctIdx = 0;

  for (let gi = 0; gi < GRADES.length; gi++) {
    for (let si = 0; si < SECTIONS.length; si++) {
      const grade   = GRADES[gi];
      const section = SECTIONS[si];
      const name    = `${grade}-${section}`;

      let cs = await prisma.classSection.findFirst({ where: { grade, section, schoolId: school.id } });
      if (!cs) {
        cs = await prisma.classSection.create({
          data: { grade, section, name, school: { connect: { id: school.id } } },
        });
      }

      const ct = allProfiles[ctIdx++ % allProfiles.length];
      await prisma.classSectionAcademicYear.upsert({
        where:  { classSectionId_academicYearId: { classSectionId: cs.id, academicYearId: ay.id } },
        update: { classTeacherId: ct.id, isActive: true },
        create: {
          classSection: { connect: { id: cs.id } },
          academicYear: { connect: { id: ay.id } },
          classTeacher: { connect: { id: ct.id } },
          isActive:     true,
        },
      });

    await linkSubjectsAndTeachers({
      cs,
      subjects,
      tBySubject,
      ay,
      gi,
      si,
    });

    allSections.push({
      id: cs.id,
      grade,
      section,
      name,
    });
    console.log(`   ✅  ${allSections.length} class sections`);
        // ── Tutorial profiles ─────────────────────────────

    }
  }
  console.log(`   ✅  ${allSections.length} class sections`);

  // ── Timetable entries ──────────────────────────────────────────────────────
  const totalTT = await writeTimetable(school, ay, subjects, tBySubject, allSections, wdDefs, satDefs, configId);
  console.log(`   ✅  ${totalTT} timetable entries`);

  // ── Students (STUDENTS_PER_SECTION per section) ───────────────────────────
  const stuStart       = STUDENT_CTR;
  const allEnrollments = [];
  console.log(`   👨‍🎓  Seeding ${STUDENTS_PER_SECTION} students × ${allSections.length} sections…`);
  for (const cs of allSections) {
    const enrs = await seedStudents({ school, ay, cs, count: STUDENTS_PER_SECTION, baseAge: 6, password });
    allEnrollments.push(...enrs);
    process.stdout.write(`      ✅  ${cs.name}  (${STUDENTS_PER_SECTION} students)\n`);
  }

  // ── Assessments ────────────────────────────────────────────────────────────
  await seedAssessments({ school, ay, allSections, subjects, allEnrollments });
  // ── Tutorial profiles ─────────────────────────────
await seedTeacherTutorialProfiles({
  school,
  teachers: allProfiles,
  subjects,
});

  // ── Attendance ─────────────────────────────────────────────────────────────
  await seedAttendance({ school, ay, allSections, allEnrollments, adminUser });

  // ── Teacher attendance ─────────────────────────────────────────────────────
  await seedTeacherAttendance({ school, ay, allTeachers: allProfiles, adminUser });

  // ── Holidays ───────────────────────────────────────────────────────────────
  await seedHolidays({ school, ay, adminUser });

  // ── Gallery ────────────────────────────────────────────────────────────────
  await seedGallery({ school, adminUser });

  // ── Activities & Events ────────────────────────────────────────────────────
  await seedActivitiesAndEvents({ school, ay, allSections, allEnrollments, adminUser });

  // ── Awards ────────────────────────────────────────────────────────────────
  await seedAwards({ school, ay, allSections, allEnrollments, adminUser });

  // ── Staff salaries ─────────────────────────────────────────────────────────
  await seedStaffAndSalaries({ school });

  // ── Teacher salaries ───────────────────────────────────────────────────────
  await seedTeacherSalaries({ school, allTeachers: allProfiles });

  return {
    school,
    adminUser,
    totalStudents: STUDENT_CTR - stuStart,
    totalSections: allSections.length,
    totalTT,
  };
}
// ═══════════════════════════════════════════════
//  TEACHER TUTORIAL PROFILE SEEDER
// ═══════════════════════════════════════════════
async function seedTeacherTutorialProfiles({ school, teachers, subjects }) {
  console.log(`\n   🎓 Seeding Teacher Tutorial Profiles...`);

  let count = 0;

  for (let ti = 0; ti < teachers.length; ti++) {
    const teacher = teachers[ti];

    // Each teacher gets 1–3 subjects
    const subjectCount = 1 + (ti % 3);

    for (let si = 0; si < subjectCount; si++) {
      const subject = subjects[(ti + si) % subjects.length];

      // check if already exists
      const exists = await prisma.teacherTutorialProfile.findFirst({
        where: {
          teacherId: teacher.id,

          subjects: {
            has: subject.name,
          },
        },
      });

      if (!exists) {
      await prisma.teacherTutorialProfile.create({
        data: {

          school: {
            connect: {
              id: school.id,
            },
          },

          teacher: {
            connect: {
              id: teacher.id,
            },
          },

          subjects: [subject.name],

          grades: ["8", "9", "10"],

          bio:
            `${teacher.firstName} specializes in ${subject.name}`,

          mode:
            ti % 2 === 0
              ? "ONLINE"
              : "OFFLINE",

          monthlyFee:
            1500 + ti * 250,

          capacity:
            20 + (ti % 15),

          rating: parseFloat(
            (
              3.5 +
              Math.random() * 1.5
            ).toFixed(1)
          ),

          passPercentage:
            60 + (ti % 40),

          averageStudentScore:
            65 + (ti % 30),

          rankingScore:
            70 + (ti % 25),

          rankingType:
            ti % 2 === 0
              ? "RESULT_BASED"
              : "EXPERIENCE_BASED",

          adminPriority:
            ti % 5,

          isActive: true,
        },
      });

        count++;
      }
    }
  }

  console.log(`      ✅ ${count} tutorial profiles created`);
}
// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log("🌱  Springfield Seed Starting…\n");
  const password = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  // ── University ─────────────────────────────────────────────────────────────
  const university = await prisma.university.upsert({
    where:  { code: "SPRINGFIELD_UNI" },
    update: {},
    create: {
      name:    "Springfield University",
      code:    "SPRINGFIELD_UNI",
      address: "123 University Road",
      city:    "Bengaluru",
      state:   "Karnataka",
      phone:   "080-12345678",
      email:   "contact@springfield.edu",
      website: "https://springfield.edu",
    },
  });
  console.log("📚  Springfield University ready");

  // Seed school first (SuperAdmin needs a schoolId)
  const schoolResult = await seedSchool(university, password);
  const { school } = schoolResult;

  // ── SuperAdmin ─────────────────────────────────────────────────────────────
  let sa = await prisma.superAdmin.findUnique({ where: { email: "superadmin@gmail.com" } });
  if (!sa) {
    sa = await prisma.superAdmin.create({
      data: {
        name:       "Super Admin",
        email:      "superadmin@gmail.com",
        password,
        phone:      "9000000000",
        university: { connect: { id: university.id } },
        school:     { connect: { id: school.id } },
      },
    });
  }
  console.log("👑  Super Admin ready  (superadmin@gmail.com)");

  // ── SuperAdminSchoolAccess ─────────────────────────────────────────────────
  await prisma.superAdminSchoolAccess.upsert({
    where:  { superAdminId_schoolId: { superAdminId: sa.id, schoolId: school.id } },
    update: {},
    create: {
      superAdmin: { connect: { id: sa.id } },
      school:     { connect: { id: school.id } },
    },
  });

  // ── Expenses ───────────────────────────────────────────────────────────────
  await seedExpenses({ school });

  const S = schoolResult.totalStudents;
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                    ✨  SEEDING COMPLETE  ✨                       ║
╠═══════════════════════════════════════════════════════════════════╣
║  ALL PASSWORDS          →  123456                                 ║
║  SUPER ADMIN            →  superadmin@gmail.com                   ║
║  SCHOOL ADMIN           →  admin1@gmail.com                       ║
║  FINANCE ADMIN          →  finance1@gmail.com                     ║
╠═══════════════════════════════════════════════════════════════════╣
║  🏫  HIGH SCHOOL                                                  ║
║      ${String(schoolResult.totalSections).padEnd(2)} sections × ${STUDENTS_PER_SECTION} students = ${String(S).padEnd(5)} students          ║
║      📝 ${MAX_SUBJECTS} subjects × ${MAX_SECTIONS} sections = assessment marks               ║
║      📅 Full-year attendance (Jun 2025 – Mar 2026)               ║
║      🏆 Activities + Events + Awards + Gallery                    ║
║      💰 Teacher & staff salary records                            ║
╚═══════════════════════════════════════════════════════════════════╝
`);
}

main()
  .catch(e => { console.error("❌  Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });