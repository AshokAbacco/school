// prisma/seed.js
// ═══════════════════════════════════════════════════════════════════════════════
//  MULTI-INSTITUTION SEED  —  FULL DATA (including new tables)
//  NEW: AttendanceRecord, TeacherAttendance, GalleryAlbum/Image,
//       SchoolHoliday, Activity, ActivityClass, StudentActivityEnrollment,
//       ActivityEvent, EventClass, EventTeam, EventTeamMember,
//       EventParticipant, EventResult, Certificate, Award, StudentAward
//
//  ⚠  Activities and Events are STANDALONE (no activityId link on events)
//  ⚠  All original functions kept intact
//  Password for all accounts: 123456
// ═══════════════════════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = "123456";

// ── Global counters so emails never collide across schools ────────────────────
let TEACHER_CTR = 1;
let STUDENT_CTR = 1;
let PARENT_CTR  = 1;

// ── Name pools ────────────────────────────────────────────────────────────────
const MALE_NAMES   = ["Aarav","Rohan","KiranKumar","Amit","Vijay","Ravi","Mohan","Sanjay","Arjun","Nikhil","Pranav","Harsh","Dev","Raj","Vikram","Arun","Deepak","Kartik","Ankit","Rahul","Varun","Tarun","Manish","Dinesh","Ganesh","Mahesh","Naresh","Sunil","Manoj","Raghu","Shyam","Chetan","Girish","Satish","Hemant","Madan","Kishan","Naveen","Sridhar","Suresh"];
const FEMALE_NAMES = ["Priya","Anjali","Pooja","Divya","Sunita","Rekha","Meena","Kavitha","Pooja","Nisha","Anita","Sneha","Deepa","Ritu","Neha","Swati","Lakshmi","Savitha","Nalini","Vidya","Hema","Meera","Padma","Sudha","Archana","Preethi","Mala","Usha","Geetha","Leela","Saritha","Vimala","Kamala","Radha","Sita","Latha","Suma","Veena","Asha","Nandini","Pallavi"];
const LAST_NAMES = ["Allapalli","KavadiMatti","Hosamani","Kammar","Doddamani","Kambale","Murgod","Goudappanavar","Hadapad","Chougule","Angadi","Mugali","Patil","Nandikol","Walikar","Benakatti","Aralikatti","Lamani","Gudadinni","Tirlapur","Negalur"];
const PARENT_NAMES = ["Rajesh","Sunil","Manoj","Anil","Ramesh","Suresh","Dinesh","Ganesh","Mahesh","Naresh","Rajan","Mohan","Sohan","Kishan","Madan","Chetan","Hemant","Girish","Satish","Umesh"];
const CITIES  = ["Bengaluru","Chennai","Hyderabad","Mumbai","Pune","Delhi","Kolkata","Jaipur","Mysuru","Mangaluru"];
const STATES  = ["Karnataka","Tamil Nadu","Telangana","Maharashtra","Maharashtra","Delhi","West Bengal","Rajasthan","Karnataka","Karnataka"];
const ZIPS    = ["560001","600001","500001","400001","411001","110001","700001","302001","570001","575001"];
const BLOOD_GROUPS = ["A_POS","A_NEG","B_POS","B_NEG","O_POS","O_NEG","AB_POS","AB_NEG"];
const OCCS    = ["Engineer","Doctor","Teacher","Business Owner","Government Employee","Nurse","Accountant","Lawyer","Farmer","Shopkeeper"];
const GENDERS = ["MALE","FEMALE"];

const pick = (arr, i) => arr[Math.abs(i) % arr.length];

// ── Date helpers ──────────────────────────────────────────────────────────────
function studentDOB(idx, baseAge = 8) {
  const y = new Date().getFullYear() - (baseAge + (idx % 5));
  const m = ((idx * 3) % 12) + 1;
  const d = ((idx * 7) % 28) + 1;
  return new Date(`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
}
function admDate(idx) { return new Date(`${2021 + (idx % 4)}-06-01`); }

// ── Grade calculator ──────────────────────────────────────────────────────────
function calcGrade(pct) {
  if (pct == null) return null;
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 35) return "D";
  return "F";
}

// ── Realistic marks generator ─────────────────────────────────────────────────
function genMarks(stuIdx, schIdx, maxMarks, passingMarks) {
  const seed = ((stuIdx * 17) + (schIdx * 31)) % 100;
  if (seed < 8) return { isAbsent: true, marksObtained: null };
  if (seed < 18) {
    const fail = Math.floor(((seed - 8) / 10) * (passingMarks - 1));
    return { isAbsent: false, marksObtained: Math.max(0, fail) };
  }
  const range   = maxMarks - passingMarks;
  const obtained = passingMarks + Math.floor(((seed - 18) / 82) * range);
  return { isAbsent: false, marksObtained: Math.min(obtained, maxMarks) };
}

// ── Period definition builder ─────────────────────────────────────────────────
function t2m(t) { const [h,m] = t.split(":").map(Number); return h*60+m; }
function m2t(m) { return `${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`; }

function buildPeriodDefinitionData(cfg, dayType) {
  const defs = []; let order = 1; let cur = t2m(cfg.startTime);
  const bm = {}; (cfg.breaks||[]).forEach(b => bm[b.afterPeriod] = b);
  for (let i = 1; i <= cfg.totalPeriods; i++) {
    defs.push({ periodNumber: i, label: dayType==="SATURDAY" ? `Sat Period ${i}` : `Period ${i}`,
      slotType: "PERIOD", dayType, startTime: m2t(cur), endTime: m2t(cur+cfg.periodDuration), order: order++ });
    cur += cfg.periodDuration;
    if (bm[i]) {
      const b = bm[i];
      defs.push({ periodNumber: 100+i, label: dayType==="SATURDAY" ? `Sat ${b.label}` : b.label,
        slotType: b.type||"SHORT_BREAK", dayType, startTime: m2t(cur), endTime: m2t(cur+b.duration), order: order++ });
      cur += b.duration;
    }
  }
  return defs;
}

const WD_CFG  = { startTime:"08:00", periodDuration:40, totalPeriods:7, breaks:[
  { afterPeriod:3, type:"SHORT_BREAK", label:"Short Break", duration:10 },
  { afterPeriod:5, type:"LUNCH_BREAK", label:"Lunch Break", duration:30 },
]};
const SAT_CFG = { startTime:"09:00", periodDuration:35, totalPeriods:5, breaks:[
  { afterPeriod:3, type:"SHORT_BREAK", label:"Short Break", duration:15 },
]};
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
    const defs = day==="SATURDAY" ? satDefs : wdDefs;
    for (let si = 0; si < defs.length; si++) {
      const def = defs[si];
      for (let ci = 0; ci < sections.length; ci++) {
        const cs      = sections[ci];
        const subIdx  = (ci + si + di*3) % subjects.length;
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

// ── Teacher factory ───────────────────────────────────────────────────────────
async function createTeachers(school, password, teacherDefs) {
  const allProfiles = [];
  const tBySubject  = {};
  for (let i = 0; i < teacherDefs.subjectDefs.length; i++) tBySubject[i] = [];

  for (const def of teacherDefs.defs) {
    const n     = TEACHER_CTR++;
    const email = `teacher${n}@gmail.com`;

    let user = await prisma.user.findUnique({ where: { email_schoolId:{ email, schoolId: school.id } } });
    if (!user) user = await prisma.user.create({ data:{ name:`${def.fn} ${def.ln}`, email, password, role:"TEACHER", schoolId: school.id } });

    let prof = await prisma.teacherProfile.findUnique({ where:{ userId: user.id } });
    if (!prof) {
      const idx = def.n - 1;
      prof = await prisma.teacherProfile.create({ data:{
        userId: user.id, schoolId: school.id,
        employeeCode: `${school.code.slice(0,3)}-T${String(n).padStart(3,"0")}`,
        firstName: def.fn, lastName: def.ln,
        dateOfBirth: new Date(`${1970+(idx%25)}-${String((idx%9)+1).padStart(2,"0")}-15`),
        gender: idx%2===0 ? "MALE" : "FEMALE",
        phone: `98${String(10000000 + idx*1111111).slice(0,8)}`,
        address: `${100+idx}, Teacher Colony, Sector ${(idx%10)+1}`,
        city: pick(CITIES,idx), state: pick(STATES,idx), zipCode: pick(ZIPS,idx),
        department: def.dept,
        designation: idx < teacherDefs.subjectDefs.length ? "Senior Teacher" : "Teacher",
        qualification: "M.Sc, B.Ed", experienceYears: 2+(idx%18),
        joiningDate: new Date(`${2010+(idx%12)}-07-01`),
        employmentType: "FULL_TIME", salary: 28000 + idx*1200,
        panNumber: `ABCDE${1000+idx}F`,
        aadhaarNumber: String(200000000000 + idx*11111111111),
      }});
    }
    allProfiles.push(prof);
    tBySubject[def.si].push(prof);
  }
  return { allProfiles, tBySubject };
}

// ── Timetable config ──────────────────────────────────────────────────────────
async function createTimetableConfig(school, ay) {
  let cfg = await prisma.timetableConfig.findUnique({
    where:   { schoolId_academicYearId:{ schoolId: school.id, academicYearId: ay.id } },
    include: { periodDefinitions:{ orderBy:{ order:"asc" } } },
  });
  if (!cfg) {
    cfg = await prisma.timetableConfig.create({ data:{
      schoolId: school.id, academicYearId: ay.id,
      weekdayTotalPeriods: WD_CFG.totalPeriods, saturdayTotalPeriods: SAT_CFG.totalPeriods,
      periodDefinitions: { createMany:{ data:[
        ...buildPeriodDefinitionData(WD_CFG,  "WEEKDAY"),
        ...buildPeriodDefinitionData(SAT_CFG, "SATURDAY"),
      ]}},
    }, include:{ periodDefinitions:{ orderBy:{ order:"asc" } } }});
  }
  const wdDefs  = cfg.periodDefinitions.filter(d => d.slotType==="PERIOD" && d.dayType==="WEEKDAY");
  const satDefs = cfg.periodDefinitions.filter(d => d.slotType==="PERIOD" && d.dayType==="SATURDAY");
  return { configId: cfg.id, wdDefs, satDefs };
}

// ── Subject + teacher links ───────────────────────────────────────────────────
async function linkSubjectsAndTeachers({ cs, subjects, tBySubject, ay, gi, si }) {
  for (const subj of subjects) {
    await prisma.classSubject.upsert({
      where:  { classSectionId_subjectId_academicYearId:{ classSectionId: cs.id, subjectId: subj.id, academicYearId: ay.id } },
      update: {}, create: { classSectionId: cs.id, subjectId: subj.id, academicYearId: ay.id },
    });
  }
  for (let ti = 0; ti < subjects.length; ti++) {
    const pool = tBySubject[ti];
    const pt   = pool[Math.floor((gi*2+si) / subjects.length) % pool.length] || pool[0];
    await prisma.teacherAssignment.upsert({
      where:  { classSectionId_subjectId_academicYearId:{ classSectionId: cs.id, subjectId: subjects[ti].id, academicYearId: ay.id } },
      update: { teacherId: pt.id },
      create: { classSectionId: cs.id, subjectId: subjects[ti].id, academicYearId: ay.id, teacherId: pt.id },
    });
  }
}

// ── Timetable entries ─────────────────────────────────────────────────────────
async function writeTimetable(school, ay, subjects, tBySubject, allSections, wdDefs, satDefs, configId) {
  await prisma.timetableEntry.deleteMany({ where:{ schoolId: school.id, academicYearId: ay.id } });
  const ttMap = buildTimetables(wdDefs, satDefs, subjects, tBySubject, allSections);
  let total = 0;
  for (const cs of allSections) {
    const entries = ttMap.get(cs.id) || [];
    if (entries.length) {
      await prisma.timetableEntry.createMany({ data: entries.map(e => ({
        schoolId: school.id, academicYearId: ay.id,
        classSectionId: cs.id, day: e.day,
        periodDefinitionId: e.periodDefinitionId,
        subjectId: e.subjectId, teacherId: e.teacherId, configId,
      }))});
    }
    total += entries.length;
  }
  return total;
}

// ── Students + parents ────────────────────────────────────────────────────────
async function seedStudents({ school, ay, cs, count, baseAge, password }) {
  const enrollments = [];
  for (let s = 1; s <= count; s++) {
    const sn  = STUDENT_CTR++;
    const pn  = PARENT_CTR++;
    const ci  = sn % CITIES.length;
    const g   = pick(GENDERS, sn);
 const fn  = g==="MALE" ? pick(MALE_NAMES,sn) : pick(FEMALE_NAMES,sn);
const ln  = pick(LAST_NAMES, sn);
    const email = `student${sn}@gmail.com`;
    const rn    = `${cs.grade.replace(/\s/g,"")}${cs.section||""}${String(s).padStart(3,"0")}`;
    const an    = `ADM${String(sn).padStart(6,"0")}`;

    let stu = await prisma.student.findFirst({ where:{ email, schoolId: school.id } });
    if (!stu) stu = await prisma.student.create({ data:{ name:`${fn} ${ln}`, email, password, schoolId: school.id } });

    await prisma.studentPersonalInfo.upsert({
      where:  { studentId: stu.id },
      update: {},
      create: {
        studentId: stu.id, firstName: fn, lastName: ln,
        dateOfBirth: studentDOB(sn, baseAge), gender: g,
        phone: `9${String(800000000+sn).slice(0,9)}`,
        address: `${sn}, ${fn} Nagar, Block ${(sn%10)+1}`,
        city: CITIES[ci], state: STATES[ci], zipCode: ZIPS[ci],
        bloodGroup: pick(BLOOD_GROUPS, sn),
        parentName:  `${pick(PARENT_NAMES,sn)} ${ln}`,
        parentEmail: `parent${pn}@gmail.com`,
        parentPhone: `9${String(700000000+sn).slice(0,9)}`,
        emergencyContact: `9${String(600000000+sn).slice(0,9)}`,
      },
    });

    const enr = await prisma.studentEnrollment.upsert({
      where:  { studentId_academicYearId:{ studentId: stu.id, academicYearId: ay.id } },
      update: {},
      create: {
        admissionNumber: an, admissionDate: admDate(sn),
        studentId: stu.id, classSectionId: cs.id,
        academicYearId: ay.id, rollNumber: rn, status:"ACTIVE",
      },
    });
    enrollments.push({ studentId: stu.id, classSectionId: cs.id, enrollmentId: enr.id });

    const pe  = `parent${pn}@gmail.com`;
    let par = await prisma.parent.findUnique({ where:{ email_schoolId:{ email: pe, schoolId: school.id } } });
    if (!par) par = await prisma.parent.create({ data:{
      name: `${pick(PARENT_NAMES, sn + 7)} ${ln}`, email: pe, password,
      phone: `9${String(700000000+sn).slice(0,9)}`,
      occupation: pick(OCCS,sn), schoolId: school.id,
    }});

    await prisma.studentParent.upsert({
      where:  { studentId_relation:{ studentId: stu.id, relation:"FATHER" } },
      update: {},
      create: { studentId: stu.id, parentId: par.id, relation:"FATHER", isPrimary:true, emergencyContact:true },
    });
  }
  return enrollments;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ASSESSMENT SEEDER
// ═══════════════════════════════════════════════════════════════════════════════
async function seedAssessments({ school, ay, allSections, subjects, allEnrollments }) {
  console.log(`\n   📝  Seeding assessments for ${school.name}…`);

  const TERM_DEFS = [
    { name:"Term 1", order:1 },
    { name:"Term 2", order:2 },
    { name:"Annual", order:3 },
  ];
  const terms = [];
  for (const td of TERM_DEFS) {
    let term = await prisma.assessmentTerm.findFirst({
      where: { name: td.name, academicYearId: ay.id, schoolId: school.id },
    });
    if (!term) {
      term = await prisma.assessmentTerm.create({
        data: { name: td.name, order: td.order, academicYearId: ay.id, schoolId: school.id },
      });
    }
    terms.push(term);
  }

  const GROUP_DEFS = [
    { name:"Unit Test 1",  termIdx:0, weightage:10,  maxMarks:20,  passingMarks:7,  startDate:"2025-07-15", isLocked:true,  isPublished:true  },
    { name:"Mid Term",     termIdx:0, weightage:40,  maxMarks:100, passingMarks:35, startDate:"2025-09-01", isLocked:true,  isPublished:true  },
    { name:"Unit Test 2",  termIdx:1, weightage:10,  maxMarks:20,  passingMarks:7,  startDate:"2025-11-10", isLocked:true,  isPublished:true  },
    { name:"Final Exam",   termIdx:1, weightage:40,  maxMarks:100, passingMarks:35, startDate:"2026-01-15", isLocked:true,  isPublished:true  },
    { name:"Annual Exam",  termIdx:2, weightage:100, maxMarks:100, passingMarks:35, startDate:"2026-03-01", isLocked:false, isPublished:false },
  ];
  const groups = [];
  for (const gd of GROUP_DEFS) {
    let grp = await prisma.assessmentGroup.findFirst({
      where: { name: gd.name, academicYearId: ay.id, schoolId: school.id },
    });
    if (!grp) {
      grp = await prisma.assessmentGroup.create({
        data: {
          name: gd.name, weightage: gd.weightage,
          isPublished: gd.isPublished, isLocked: gd.isLocked,
          academicYearId: ay.id, schoolId: school.id,
          termId: terms[gd.termIdx].id,
        },
      });
    }
    groups.push({ ...grp, _maxMarks: gd.maxMarks, _passingMarks: gd.passingMarks, _startDate: gd.startDate });
  }
  console.log(`      ✅  ${terms.length} terms, ${groups.length} assessment groups`);

  let totalSchedules = 0;
  const allSchedules = [];

  for (const grp of groups) {
    for (const cs of allSections) {
      for (let subIdx = 0; subIdx < subjects.length; subIdx++) {
        const subj = subjects[subIdx];
        const base = new Date(`${grp._startDate}T00:00:00.000Z`);
        base.setUTCDate(base.getUTCDate() + subIdx);
        const dateStr = base.toISOString().split("T")[0];

        let sched = await prisma.assessmentSchedule.findFirst({
          where: { assessmentGroupId: grp.id, classSectionId: cs.id, subjectId: subj.id },
        });
        if (!sched) {
          sched = await prisma.assessmentSchedule.create({
            data: {
              assessmentGroupId: grp.id,
              classSectionId:    cs.id,
              subjectId:         subj.id,
              maxMarks:          grp._maxMarks,
              passingMarks:      grp._passingMarks,
              examDate:  new Date(`${dateStr}T12:00:00.000Z`),
              startTime: new Date(`${dateStr}T09:00:00.000Z`),
              endTime:   new Date(`${dateStr}T12:00:00.000Z`),
              venue:     `Hall ${(allSections.indexOf(cs) % 5) + 1}`,
            },
          });
          totalSchedules++;
        }
        allSchedules.push({ sched, classSectionId: cs.id, maxMarks: grp._maxMarks, passingMarks: grp._passingMarks });
      }
    }
  }
  console.log(`      ✅  ${totalSchedules} exam schedules`);

  const sectionStudents = {};
  for (const { studentId, classSectionId } of allEnrollments) {
    if (!sectionStudents[classSectionId]) sectionStudents[classSectionId] = [];
    sectionStudents[classSectionId].push(studentId);
  }

  let totalMarksInserted = 0;

  for (const cs of allSections) {
    const studentIds = sectionStudents[cs.id] || [];
    if (!studentIds.length) continue;

    const sectionSchedules = allSchedules.filter(s => s.classSectionId === cs.id);
    const resultAccum = {};

    for (let schIdx = 0; schIdx < sectionSchedules.length; schIdx++) {
      const { sched, maxMarks, passingMarks } = sectionSchedules[schIdx];

      const existing = await prisma.marks.findMany({
        where: { scheduleId: sched.id },
        select: { studentId: true, marksObtained: true, isAbsent: true },
      });
      const existingMap = {};
      for (const m of existing) existingMap[m.studentId] = m;

      const toCreate = [];
      for (let stuIdx = 0; stuIdx < studentIds.length; stuIdx++) {
        const studentId = studentIds[stuIdx];
        const key = `${studentId}::${sched.assessmentGroupId}`;

        if (!resultAccum[key]) resultAccum[key] = { groupId: sched.assessmentGroupId, total: 0, max: 0 };

        if (existingMap[studentId]) {
          const em = existingMap[studentId];
          if (!em.isAbsent) resultAccum[key].total += em.marksObtained ?? 0;
          resultAccum[key].max += maxMarks;
        } else {
          const m = genMarks(stuIdx, schIdx, maxMarks, passingMarks);
          toCreate.push({ scheduleId: sched.id, studentId, marksObtained: m.marksObtained, isAbsent: m.isAbsent });
          if (!m.isAbsent) resultAccum[key].total += m.marksObtained ?? 0;
          resultAccum[key].max += maxMarks;
        }
      }

      if (toCreate.length) {
        await prisma.marks.createMany({ data: toCreate, skipDuplicates: true });
        totalMarksInserted += toCreate.length;
      }
    }

    const resultOps = [];
    for (const [key, data] of Object.entries(resultAccum)) {
      const [studentId, groupId] = key.split("::");
      const grp = groups.find(g => g.id === groupId);
      if (!grp) continue;
      const pct = data.max > 0 ? parseFloat(((data.total / data.max) * 100).toFixed(2)) : 0;

      resultOps.push(prisma.resultSummary.upsert({
        where: {
          studentId_academicYearId_termId_assessmentGroupId: {
            studentId,
            academicYearId:    ay.id,
            termId:            grp.termId ?? null,
            assessmentGroupId: groupId,
          },
        },
        update: { totalMarks: data.total, maxMarks: data.max, percentage: pct, grade: calcGrade(pct) },
        create: {
          studentId,
          academicYearId:    ay.id,
          termId:            grp.termId ?? null,
          assessmentGroupId: groupId,
          totalMarks:        data.total,
          maxMarks:          data.max,
          percentage:        pct,
          grade:             calcGrade(pct),
          isPublished:       grp.isPublished,
        },
      }));
    }

    for (let i = 0; i < resultOps.length; i += 50) {
      await prisma.$transaction(resultOps.slice(i, i + 50));
    }
  }

  console.log(`      ✅  ${totalMarksInserted} mark entries, result summaries upserted`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ATTENDANCE SEEDER — full academic year (June 2025 – March 2026)
//  Generates realistic attendance: ~92% present, ~4% absent, ~2% late, ~2% half-day
//  Skips Sundays and known public holidays
// ═══════════════════════════════════════════════════════════════════════════════
async function seedAttendance({ school, ay, allSections, allEnrollments, adminUser }) {
  console.log(`\n   📅  Seeding attendance for ${school.name}…`);

  // Build section → [studentId] map
  const sectionStudents = {};
  for (const { studentId, classSectionId } of allEnrollments) {
    if (!sectionStudents[classSectionId]) sectionStudents[classSectionId] = [];
    sectionStudents[classSectionId].push(studentId);
  }

  // Generate school days between June 2025 and March 2026
  const startDate = new Date("2025-06-02T00:00:00.000Z"); // first Monday
  const endDate   = new Date("2026-03-27T00:00:00.000Z"); // last working day

  // Public holidays to skip (Karnataka + national)
  const HOLIDAYS = new Set([
    "2025-06-04","2025-06-28", // local holidays
    "2025-07-17", // Muharram
    "2025-08-15", // Independence Day
    "2025-08-16", // weekend makeup
    "2025-09-02", // Ganesh Chaturthi
    "2025-09-20", // Dussehra holiday prep
    "2025-10-02", // Gandhi Jayanti
    "2025-10-14", // Dussehra
    "2025-10-20", // Diwali eve
    "2025-10-21", // Diwali
    "2025-10-22", // Diwali holiday
    "2025-11-01", // Kannada Rajyotsava
    "2025-11-05", // local holiday
    "2025-12-25", // Christmas
    "2025-12-26", // Christmas holiday
    "2026-01-01", // New Year
    "2026-01-14", // Sankranti
    "2026-01-26", // Republic Day
    "2026-02-26", // Mahashivratri
    "2026-03-14", // Holi
    "2026-03-20", // Ugadi
  ]);

  const schoolDays = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const dayOfWeek = cur.getUTCDay(); // 0=Sun, 6=Sat
    const dateStr   = cur.toISOString().split("T")[0];
    // Skip Sundays; include Saturdays (half-day school)
    if (dayOfWeek !== 0 && !HOLIDAYS.has(dateStr)) {
      schoolDays.push(new Date(cur));
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  console.log(`      📆  ${schoolDays.length} school days to fill`);

  const STATUSES = ["PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","ABSENT","ABSENT","LATE","HALF_DAY","EXCUSED"];

  let totalInserted = 0;

  // Process in section batches to keep memory manageable
  for (const cs of allSections) {
    const studentIds = sectionStudents[cs.id] || [];
    if (!studentIds.length) continue;

    // Process in day batches of 30
    for (let di = 0; di < schoolDays.length; di += 30) {
      const dayBatch = schoolDays.slice(di, di + 30);
      const toCreate = [];

      for (const date of dayBatch) {
        const dateStr = date.toISOString().split("T")[0];

        // Check existing
        const existing = await prisma.attendanceRecord.findMany({
          where: { classSectionId: cs.id, academicYearId: ay.id, date: { gte: new Date(`${dateStr}T00:00:00.000Z`), lt: new Date(`${dateStr}T23:59:59.000Z`) } },
          select: { studentId: true },
        });
        const existingSet = new Set(existing.map(e => e.studentId));

        for (let stuIdx = 0; stuIdx < studentIds.length; stuIdx++) {
          const studentId = studentIds[stuIdx];
          if (existingSet.has(studentId)) continue;

          // Deterministic but varied status
          const seed = (stuIdx * 13 + di * 7 + date.getUTCDate() * 3) % STATUSES.length;
          const status = STATUSES[seed];

          toCreate.push({
            date:          new Date(`${dateStr}T07:30:00.000Z`),
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

  console.log(`      ✅  ${totalInserted} attendance records inserted`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TEACHER ATTENDANCE SEEDER
// ═══════════════════════════════════════════════════════════════════════════════
async function seedTeacherAttendance({ school, ay, allTeachers, adminUser }) {
  console.log(`\n   👨‍🏫  Seeding teacher attendance for ${school.name}…`);

  const startDate = new Date("2025-06-02T00:00:00.000Z");
  const endDate   = new Date("2026-03-27T00:00:00.000Z");

  const HOLIDAYS = new Set([
    "2025-08-15","2025-09-02","2025-10-02","2025-10-14","2025-10-21",
    "2025-11-01","2025-12-25","2026-01-01","2026-01-14","2026-01-26",
    "2026-02-26","2026-03-14","2026-03-20",
  ]);

  const schoolDays = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const dayOfWeek = cur.getUTCDay();
    const dateStr   = cur.toISOString().split("T")[0];
    if (dayOfWeek !== 0 && !HOLIDAYS.has(dateStr)) schoolDays.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const T_STATUSES = ["PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","PRESENT","ABSENT","LATE","HALF_DAY","ON_LEAVE"];
  let totalInserted = 0;

  for (let di = 0; di < schoolDays.length; di += 30) {
    const dayBatch = schoolDays.slice(di, di + 30);
    const toCreate = [];

    for (const date of dayBatch) {
      const dateStr = date.toISOString().split("T")[0];

      const existing = await prisma.teacherAttendance.findMany({
        where: { schoolId: school.id, academicYearId: ay.id, date: { gte: new Date(`${dateStr}T00:00:00.000Z`), lt: new Date(`${dateStr}T23:59:59.000Z`) } },
        select: { teacherId: true },
      });
      const existingSet = new Set(existing.map(e => e.teacherId));

      for (let ti = 0; ti < allTeachers.length; ti++) {
        const teacher = allTeachers[ti];
        if (existingSet.has(teacher.id)) continue;

        const seed = (ti * 11 + di * 5 + date.getUTCDate() * 7) % T_STATUSES.length;
        const status = T_STATUSES[seed];

        toCreate.push({
          date:          new Date(`${dateStr}T08:00:00.000Z`),
          status,
          teacherId:     teacher.id,
          schoolId:      school.id,
          academicYearId: ay.id,
          markedById:    adminUser.id,
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
//  HOLIDAYS SEEDER
// ═══════════════════════════════════════════════════════════════════════════════
async function seedHolidays({ school, ay, adminUser }) {
  console.log(`\n   🗓️  Seeding holidays for ${school.name}…`);

  // Government/recurring holidays (month+day, no academicYear)
  const GOVT_HOLIDAYS = [
    { title:"Independence Day",   description:"National holiday",        month:8,  day:15 },
    { title:"Gandhi Jayanti",     description:"National holiday",        month:10, day:2  },
    { title:"Republic Day",       description:"National holiday",        month:1,  day:26 },
    { title:"Christmas",          description:"Christmas day",           month:12, day:25 },
    { title:"New Year Day",       description:"New Year",                month:1,  day:1  },
    { title:"Kannada Rajyotsava", description:"Karnataka formation day", month:11, day:1  },
  ];

  for (const h of GOVT_HOLIDAYS) {
    const existing = await prisma.schoolHoliday.findFirst({ where: { schoolId: school.id, month: h.month, day: h.day } });
    if (!existing) {
      await prisma.schoolHoliday.create({
        data: { title: h.title, description: h.description, type: "GOVERNMENT", month: h.month, day: h.day, schoolId: school.id, createdById: adminUser.id },
      });
    }
  }

  // School-specific (academic year) holidays
  const SCHOOL_HOLIDAYS = [
    { title:"Dasara Holidays",       description:"Dussehra break",         startDate:"2025-10-13", endDate:"2025-10-17" },
    { title:"Diwali Holidays",       description:"Deepavali break",        startDate:"2025-10-20", endDate:"2025-10-24" },
    { title:"Winter Break",          description:"Christmas break",        startDate:"2025-12-22", endDate:"2025-12-31" },
    { title:"Sankranti Holidays",    description:"Harvest festival break", startDate:"2026-01-13", endDate:"2026-01-15" },
    { title:"Annual Day Preparation",description:"School annual day prep", startDate:"2026-02-10", endDate:"2026-02-11" },
    { title:"Holi Break",            description:"Holi festival",          startDate:"2026-03-13", endDate:"2026-03-14" },
    { title:"Ugadi Holidays",        description:"Kannada New Year",       startDate:"2026-03-20", endDate:"2026-03-21" },
  ];

  for (const h of SCHOOL_HOLIDAYS) {
    const existing = await prisma.schoolHoliday.findFirst({ where: { schoolId: school.id, title: h.title, academicYearId: ay.id } });
    if (!existing) {
      await prisma.schoolHoliday.create({
        data: { title: h.title, description: h.description, type: "SCHOOL",
          startDate: new Date(`${h.startDate}T00:00:00.000Z`),
          endDate:   new Date(`${h.endDate}T23:59:59.000Z`),
          schoolId: school.id, academicYearId: ay.id, createdById: adminUser.id },
      });
    }
  }

  console.log(`      ✅  ${GOVT_HOLIDAYS.length} government + ${SCHOOL_HOLIDAYS.length} school holidays`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GALLERY SEEDER
// ═══════════════════════════════════════════════════════════════════════════════
async function seedGallery({ school, ay, adminUser }) {
  console.log(`\n   🖼️  Seeding gallery for ${school.name}…`);

  const ALBUMS = [
    { title:"Annual Day 2025",              description:"Annual day celebrations and performances", eventDate:"2025-12-15" },
    { title:"Independence Day Celebration", description:"Flag hoisting and cultural programs",      eventDate:"2025-08-15" },
    { title:"Sports Day 2025",              description:"Annual sports meet and prize distribution", eventDate:"2025-10-05" },
    { title:"Science Exhibition 2025",      description:"Student science projects exhibition",       eventDate:"2025-11-20" },
    { title:"Cultural Fest 2026",           description:"Inter-class cultural competition",          eventDate:"2026-01-30" },
    { title:"Republic Day 2026",            description:"Republic day celebration",                  eventDate:"2026-01-26" },
  ];

  for (const alb of ALBUMS) {
    const existing = await prisma.galleryAlbum.findFirst({ where: { schoolId: school.id, title: alb.title } });
    if (existing) continue;

    const album = await prisma.galleryAlbum.create({
      data: {
        title: alb.title, description: alb.description,
        eventDate: new Date(`${alb.eventDate}T00:00:00.000Z`),
        schoolId: school.id, createdById: adminUser.id,
        coverImageUrl: `https://picsum.photos/seed/${school.code}-${alb.title.replace(/\s/g,"-")}/800/400`,
        isPublished: true,
      },
    });

    // Add 6-10 images per album
    const imgCount = 6 + (ALBUMS.indexOf(alb) % 5);
    const images = [];
    for (let i = 1; i <= imgCount; i++) {
      images.push({
        albumId:  album.id,
        fileKey:  `gallery/${school.code}/${album.id}/img-${i}.webp`,
        thumbKey: `gallery/${school.code}/${album.id}/thumb-${i}.webp`,
        fileType: "image/webp",
        fileSizeBytes: 150000 + i * 12000,
        caption:  `${alb.title} - Photo ${i}`,
        uploadedAt: new Date(`${alb.eventDate}T${10+i}:00:00.000Z`),
      });
    }
    await prisma.galleryImage.createMany({ data: images });
  }

  console.log(`      ✅  ${ALBUMS.length} albums with images`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ACTIVITIES SEEDER
//  Activities are STANDALONE — events have NO activityId
// ═══════════════════════════════════════════════════════════════════════════════
async function seedActivitiesAndEvents({ school, ay, allSections, allEnrollments, adminUser }) {
  console.log(`\n   🏆  Seeding activities & events for ${school.name}…`);

  // Build section → [studentId] map
  const sectionStudents = {};
  for (const { studentId, classSectionId } of allEnrollments) {
    if (!sectionStudents[classSectionId]) sectionStudents[classSectionId] = [];
    sectionStudents[classSectionId].push(studentId);
  }

  // ── 1. ACTIVITIES (clubs / sports teams students enroll in) ───────────────
  const ACTIVITY_DEFS = [
    { name:"Cricket Club",         category:"SPORTS",   participationType:"TEAM",       description:"School cricket team training and matches" },
    { name:"Football Club",        category:"SPORTS",   participationType:"TEAM",       description:"Football coaching and inter-school matches" },
    { name:"Basketball Club",      category:"SPORTS",   participationType:"TEAM",       description:"Basketball practice and tournaments" },
    { name:"Chess Club",           category:"SPORTS",   participationType:"INDIVIDUAL", description:"Chess training and competitions" },
    { name:"Debate Club",          category:"ACADEMIC", participationType:"INDIVIDUAL", description:"Public speaking and debate training" },
    { name:"Science Club",         category:"ACADEMIC", participationType:"INDIVIDUAL", description:"Scientific experiments and projects" },
    { name:"Math Olympiad Club",   category:"ACADEMIC", participationType:"INDIVIDUAL", description:"Preparation for math olympiad" },
    { name:"Drama Club",           category:"CULTURAL", participationType:"TEAM",       description:"Theatre and drama performances" },
    { name:"Music Club",           category:"CULTURAL", participationType:"INDIVIDUAL", description:"Vocal and instrumental music" },
    { name:"Dance Club",           category:"CULTURAL", participationType:"TEAM",       description:"Classical and contemporary dance" },
    { name:"Yoga Club",            category:"SPORTS",   participationType:"INDIVIDUAL", description:"Daily yoga and wellness" },
    { name:"Eco Warriors Club",    category:"OTHER",    participationType:"TEAM",       description:"Environmental awareness activities" },
  ];

  const activities = [];
  for (const def of ACTIVITY_DEFS) {
    let activity = await prisma.activity.findFirst({ where: { name: def.name, schoolId: school.id, academicYearId: ay.id } });
    if (!activity) {
      activity = await prisma.activity.create({
        data: {
          name: def.name, description: def.description,
          category: def.category, participationType: def.participationType,
          schoolId: school.id, academicYearId: ay.id,
          createdById: adminUser.id, isArchived: false,
        },
      });
    }
    activities.push(activity);
  }

  // Link activities to class sections (first 6 sections per activity)
  for (let ai = 0; ai < activities.length; ai++) {
    const activity = activities[ai];
    const sectionSubset = allSections.slice(0, Math.min(6, allSections.length));
    for (const cs of sectionSubset) {
      const exists = await prisma.activityClass.findUnique({
        where: { activityId_classSectionId: { activityId: activity.id, classSectionId: cs.id } },
      });
      if (!exists) {
        await prisma.activityClass.create({ data: { activityId: activity.id, classSectionId: cs.id } });
      }
    }
  }

  // Enroll students in activities (each student joins 1-2 activities)
  let enrollCount = 0;
  for (const cs of allSections.slice(0, 6)) {
    const studentIds = sectionStudents[cs.id] || [];
    // Take first 30 students per section to keep it reasonable
    const subset = studentIds.slice(0, Math.min(30, studentIds.length));
    for (let si = 0; si < subset.length; si++) {
      const studentId = subset[si];
      const actIdx1 = si % activities.length;
      const actIdx2 = (si + 3) % activities.length;

      for (const actIdx of [actIdx1, actIdx2]) {
        const activity = activities[actIdx];
        const exists = await prisma.studentActivityEnrollment.findUnique({
          where: { studentId_activityId_academicYearId: { studentId, activityId: activity.id, academicYearId: ay.id } },
        });
        if (!exists) {
          await prisma.studentActivityEnrollment.create({
            data: { studentId, activityId: activity.id, academicYearId: ay.id, status: "ACTIVE", enrolledAt: new Date("2025-07-01T00:00:00.000Z") },
          });
          enrollCount++;
        }
      }
    }
  }
  console.log(`      ✅  ${activities.length} activities, ${enrollCount} student enrollments`);

  // ── 2. STANDALONE EVENTS (NO activityId link) ─────────────────────────────
  const EVENT_DEFS = [
    {
      name:"Annual Sports Meet 2025", description:"Inter-class sports competition",
      eventType:"COMPETITION", participationMode:"BOTH", status:"COMPLETED",
      eventDate:"2025-10-05", venue:"School Ground",
      maxTeamsPerClass:2, maxStudentsPerClass:20,
    },
    {
      name:"Science Olympiad 2025", description:"School-level science olympiad",
      eventType:"COMPETITION", participationMode:"INDIVIDUAL", status:"COMPLETED",
      eventDate:"2025-11-20", venue:"Science Hall",
      maxTeamsPerClass:null, maxStudentsPerClass:10,
    },
    {
      name:"Annual Cultural Fest 2025", description:"Dance, drama, music competition",
      eventType:"CULTURAL", participationMode:"BOTH", status:"COMPLETED",
      eventDate:"2025-12-15", venue:"School Auditorium",
      maxTeamsPerClass:3, maxStudentsPerClass:30,
    },
    {
      name:"Math Quiz Championship", description:"Inter-class math quiz",
      eventType:"COMPETITION", participationMode:"TEAM", status:"COMPLETED",
      eventDate:"2025-09-15", venue:"Main Hall",
      maxTeamsPerClass:2, maxStudentsPerClass:null,
    },
    {
      name:"Republic Day Cultural Program", description:"Patriotic performances",
      eventType:"CULTURAL", participationMode:"BOTH", status:"COMPLETED",
      eventDate:"2026-01-26", venue:"School Ground",
      maxTeamsPerClass:null, maxStudentsPerClass:15,
    },
    {
      name:"Inter-School Debate 2026", description:"Public speaking and debate competition",
      eventType:"COMPETITION", participationMode:"INDIVIDUAL", status:"PUBLISHED",
      eventDate:"2026-02-20", venue:"Conference Hall",
      maxTeamsPerClass:null, maxStudentsPerClass:5,
    },
  ];

  const events = [];
  for (const def of EVENT_DEFS) {
    let event = await prisma.activityEvent.findFirst({ where: { name: def.name, schoolId: school.id, academicYearId: ay.id } });
    if (!event) {
      event = await prisma.activityEvent.create({
        data: {
          name: def.name, description: def.description,
          eventType: def.eventType, participationMode: def.participationMode,
          status: def.status, isArchived: false, isAutoGenerated: false,
          eventDate: new Date(`${def.eventDate}T09:00:00.000Z`),
          venue: def.venue,
          maxTeamsPerClass: def.maxTeamsPerClass,
          maxStudentsPerClass: def.maxStudentsPerClass,
          activityId: null, // ← STANDALONE, no activity link
          schoolId: school.id, academicYearId: ay.id,
          createdById: adminUser.id,
        },
      });
    }
    events.push(event);
  }

  // Link events to class sections
  for (let ei = 0; ei < events.length; ei++) {
    const event = events[ei];
    const sectionSubset = allSections.slice(0, Math.min(4, allSections.length));
    for (const cs of sectionSubset) {
      const exists = await prisma.eventClass.findUnique({
        where: { eventId_classSectionId: { eventId: event.id, classSectionId: cs.id } },
      });
      if (!exists) {
        await prisma.eventClass.create({ data: { eventId: event.id, classSectionId: cs.id } });
      }
    }
  }

  // ── 3. TEAMS for TEAM/BOTH events ─────────────────────────────────────────
  const TEAM_COLORS = ["#E53E3E","#3182CE","#38A169","#D69E2E","#805AD5","#DD6B20"];
  const teamEvents = events.filter(e => e.participationMode === "TEAM" || e.participationMode === "BOTH");

  for (const event of teamEvents) {
    const sectionSubset = allSections.slice(0, Math.min(4, allSections.length));
    for (let si = 0; si < sectionSubset.length; si++) {
      const cs = sectionSubset[si];
      const studentIds = sectionStudents[cs.id] || [];
      if (!studentIds.length) continue;

      const teamName = `${cs.name} Team`;
      let team = await prisma.eventTeam.findFirst({ where: { eventId: event.id, name: teamName } });
      if (!team) {
        team = await prisma.eventTeam.create({
          data: { name: teamName, colorHex: TEAM_COLORS[si % TEAM_COLORS.length], eventId: event.id, createdById: adminUser.id },
        });
      }

      // Add 5 members to team
      const members = studentIds.slice(0, Math.min(5, studentIds.length));
      for (const studentId of members) {
        const exists = await prisma.eventTeamMember.findUnique({
          where: { teamId_studentId: { teamId: team.id, studentId } },
        });
        if (!exists) {
          await prisma.eventTeamMember.create({ data: { teamId: team.id, studentId, role: "Player" } });
        }
      }

      // Team results for completed events
      if (event.status === "COMPLETED") {
        const existsResult = await prisma.eventResult.findUnique({ where: { eventId_teamId: { eventId: event.id, teamId: team.id } } });
        if (!existsResult) {
          const resultTypes = ["WINNER","RUNNER_UP","THIRD_PLACE","PARTICIPATED","PARTICIPATED"];
          await prisma.eventResult.create({
            data: {
              eventId: event.id, teamId: team.id, studentId: null,
              resultType: resultTypes[si % resultTypes.length],
              position: si + 1,
              awardTitle: si === 0 ? "First Place Trophy" : si === 1 ? "Runner-Up Trophy" : null,
              remarks: `${cs.name} performed excellently`,
              recordedById: adminUser.id,
            },
          });
        }
      }
    }
  }

  // ── 4. INDIVIDUAL PARTICIPANTS & RESULTS ──────────────────────────────────
  const indivEvents = events.filter(e => e.participationMode === "INDIVIDUAL" || e.participationMode === "BOTH");

  for (const event of indivEvents) {
    const sectionSubset = allSections.slice(0, Math.min(4, allSections.length));

    for (const cs of sectionSubset) {
      const studentIds = (sectionStudents[cs.id] || []).slice(0, Math.min(5, (sectionStudents[cs.id]||[]).length));

      for (let pi = 0; pi < studentIds.length; pi++) {
        const studentId = studentIds[pi];

        const existsPart = await prisma.eventParticipant.findUnique({
          where: { eventId_studentId: { eventId: event.id, studentId } },
        });
        if (!existsPart) {
          await prisma.eventParticipant.create({
            data: { eventId: event.id, studentId, participated: true, score: 60 + (pi * 5), remarks: "Good performance" },
          });
        }

        if (event.status === "COMPLETED" && pi < 3) {
          const existsResult = await prisma.eventResult.findUnique({ where: { eventId_studentId: { eventId: event.id, studentId } } });
          if (!existsResult) {
            const rt = ["WINNER","RUNNER_UP","THIRD_PLACE"][pi] || "PARTICIPATED";
            await prisma.eventResult.create({
              data: {
                eventId: event.id, studentId, teamId: null,
                resultType: rt,
                position: pi + 1,
                awardTitle: pi === 0 ? "Gold Medal" : pi === 1 ? "Silver Medal" : "Bronze Medal",
                recordedById: adminUser.id,
              },
            });
          }
        }
      }
    }
  }

  // ── 5. CERTIFICATES for completed event results ────────────────────────────
  const completedEvents = events.filter(e => e.status === "COMPLETED");
  let certCount = 0;

  for (const event of completedEvents) {
    const results = await prisma.eventResult.findMany({
      where: { eventId: event.id },
      include: {
        student: { include: { personalInfo: true } },
        team: { include: { members: { include: { student: { include: { personalInfo: true } } } } } },
      },
    });

    for (const result of results) {
      if (result.studentId) {
        // Individual certificate
        const exists = await prisma.certificate.findUnique({ where: { studentId_resultId: { studentId: result.studentId, resultId: result.id } } });
        if (!exists) {
          const pi = result.student?.personalInfo;
          await prisma.certificate.create({
            data: {
              studentId: result.studentId, eventId: event.id, resultId: result.id,
              studentName: pi ? `${pi.firstName} ${pi.lastName}` : result.student?.name || "Student",
              eventName: event.name,
              achievementText: `${result.resultType.replace(/_/g," ")} in ${event.name}`,
              academicYear: "2025-26",
              status: "ISSUED", issuedDate: new Date("2026-01-15T00:00:00.000Z"),
            },
          });
          certCount++;
        }
      } else if (result.teamId && result.team) {
        // Team certificates — one per member
        for (const member of result.team.members) {
          const exists = await prisma.certificate.findUnique({ where: { studentId_resultId: { studentId: member.studentId, resultId: result.id } } });
          if (!exists) {
            const pi = member.student?.personalInfo;
            await prisma.certificate.create({
              data: {
                studentId: member.studentId, eventId: event.id,
                teamId: result.teamId, resultId: result.id,
                studentName: pi ? `${pi.firstName} ${pi.lastName}` : member.student?.name || "Student",
                eventName: event.name,
                achievementText: `${result.resultType.replace(/_/g," ")} as part of ${result.team.name} in ${event.name}`,
                academicYear: "2025-26",
                status: "ISSUED", issuedDate: new Date("2026-01-15T00:00:00.000Z"),
              },
            });
            certCount++;
          }
        }
      }
    }
  }

  console.log(`      ✅  ${events.length} events, ${certCount} certificates`);
  return activities;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AWARDS SEEDER
// ═══════════════════════════════════════════════════════════════════════════════
async function seedAwards({ school, ay, allSections, allEnrollments, adminUser }) {
  console.log(`\n   🏅  Seeding awards for ${school.name}…`);

  // Build section → [studentId] map
  const sectionStudents = {};
  for (const { studentId, classSectionId } of allEnrollments) {
    if (!sectionStudents[classSectionId]) sectionStudents[classSectionId] = [];
    sectionStudents[classSectionId].push(studentId);
  }

  const AWARD_DEFS = [
    { name:"Best Student Award",         category:"ACADEMIC",    description:"Awarded to the top performing student" },
    { name:"Perfect Attendance Award",   category:"ATTENDANCE",  description:"100% attendance throughout the year" },
    { name:"Sports Champion",            category:"SPORTS",      description:"Best sports performer of the year" },
    { name:"Cultural Star Award",        category:"CULTURAL",    description:"Outstanding cultural performance" },
    { name:"Discipline Award",           category:"DISCIPLINE",  description:"Model of discipline and conduct" },
    { name:"Leadership Award",           category:"LEADERSHIP",  description:"Exemplary leadership qualities" },
    { name:"Science Excellence Award",   category:"ACADEMIC",    description:"Best science project or performance" },
    { name:"Special Achievement Award",  category:"SPECIAL",     description:"Extraordinary achievement outside curriculum" },
  ];

  const awards = [];
  for (const def of AWARD_DEFS) {
    let award = await prisma.award.findUnique({ where: { schoolId_name: { schoolId: school.id, name: def.name } } });
    if (!award) {
      award = await prisma.award.create({
        data: { name: def.name, description: def.description, category: def.category, schoolId: school.id },
      });
    }
    awards.push(award);
  }

  // Give awards to top students in each section (1 award per section per type)
  let awardCount = 0;
  for (let si = 0; si < Math.min(allSections.length, 6); si++) {
    const cs = allSections[si];
    const studentIds = sectionStudents[cs.id] || [];
    if (!studentIds.length) continue;

    // Give 3-4 different awards in each section to different students
    const awardsToGive = awards.slice(0, 4);
    for (let ai = 0; ai < awardsToGive.length; ai++) {
      const award = awardsToGive[ai];
      const studentId = studentIds[ai % studentIds.length];

      const exists = await prisma.studentAward.findUnique({
        where: { studentId_awardId_academicYearId: { studentId, awardId: award.id, academicYearId: ay.id } },
      });
      if (exists) continue;

      const studentAward = await prisma.studentAward.create({
        data: {
          studentId, awardId: award.id, academicYearId: ay.id,
          classSectionId: cs.id, givenById: adminUser.id,
          remarks: `Awarded for outstanding performance in ${award.name}`,
        },
      });
      awardCount++;

      // Create certificate for the award
      const student = await prisma.student.findUnique({ where: { id: studentId }, include: { personalInfo: true } });
      const pi = student?.personalInfo;
      const certExists = await prisma.certificate.findUnique({ where: { studentId_studentAwardId: { studentId, studentAwardId: studentAward.id } } });
      if (!certExists) {
        await prisma.certificate.create({
          data: {
            studentId, studentAwardId: studentAward.id,
            studentName: pi ? `${pi.firstName} ${pi.lastName}` : student?.name || "Student",
            eventName: award.name,
            achievementText: `Received ${award.name} for the academic year 2025-26`,
            academicYear: "2025-26",
            status: "ISSUED", issuedDate: new Date("2026-03-15T00:00:00.000Z"),
          },
        });
      }
    }
  }

  console.log(`      ✅  ${awards.length} award types, ${awardCount} student awards`);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  1.  HIGH SCHOOL  —  Grades 1–10, Sections A & B, 120 students/section
// ═══════════════════════════════════════════════════════════════════════════════
async function seedSchool(university, password) {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   🏫  Springfield High School        ║");
  console.log("╚══════════════════════════════════════╝");

  const school = await prisma.school.upsert({
    where:  { code:"SPRINGFIELD_HIGH" }, update: {},
    create: { name:"Springfield High School", code:"SPRINGFIELD_HIGH", type:"SCHOOL",
      address:"456 School Lane", city:"Bengaluru", state:"Karnataka",
      phone:"080-11111111", email:"school@springfield.edu", universityId: university.id },
  });

  const adminUser = await prisma.user.upsert({
    where:  { email_schoolId:{ email:"admin1@gmail.com", schoolId: school.id } }, update:{},
    create: { name:"School Admin", email:"admin1@gmail.com", password, role:"ADMIN", schoolId: school.id },
  });
  const fu1 = await prisma.user.upsert({
    where:  { email_schoolId:{ email:"finance1@gmail.com", schoolId: school.id } }, update:{},
    create: { name:"Finance Admin", email:"finance1@gmail.com", password, role:"FINANCE", schoolId: school.id },
  });
  await prisma.financeProfile.upsert({ where:{ userId: fu1.id }, update:{},
    create:{ userId: fu1.id, schoolId: school.id, employeeCode:"FIN-001", designation:"Finance Officer", phone:"9000000001" }});
  await prisma.schoolPromotionConfig.upsert({ where:{ schoolId: school.id }, update:{},
    create:{ schoolId: school.id, skipGrades:["7"], lastGrade:"10", firstGrade:"1" }});
  console.log("   ✅  Admin + Finance Admin");

  const ay = await prisma.academicYear.upsert({
    where:  { name_schoolId:{ name:"2025-26", schoolId: school.id } }, update:{ isActive:true },
    create: { name:"2025-26", startDate: new Date("2025-06-01"), endDate: new Date("2026-03-31"), isActive:true, schoolId: school.id },
  });

  const SUBJ_DEFS = [
    { name:"Mathematics",        code:"SCH-MATH" },
    { name:"Science",            code:"SCH-SCI"  },
    { name:"English",            code:"SCH-ENG"  },
    { name:"Social Studies",     code:"SCH-SST"  },
    { name:"Hindi",              code:"SCH-HIN"  },
    { name:"Computer Science",   code:"SCH-CS"   },
    { name:"Physical Education", code:"SCH-PE"   },
  ];
  const subjects = [];
  for (const d of SUBJ_DEFS)
    subjects.push(await prisma.subject.upsert({
      where:  { code_schoolId:{ code: d.code, schoolId: school.id } },
      update: { name: d.name }, create: { name: d.name, code: d.code, schoolId: school.id },
    }));
  console.log(`   ✅  ${subjects.length} subjects`);

  const tStart = TEACHER_CTR;
  const { allProfiles, tBySubject } = await createTeachers(school, password, {
    subjectDefs: SUBJ_DEFS,
    defs: [
      {n:1,  fn:"Arjun",   ln:"Sharma",   dept:"Mathematics",        si:0},
      {n:2,  fn:"Naveen",  ln:"Reddy",    dept:"Mathematics",        si:0},
      {n:3,  fn:"Sanjana", ln:"Bose",     dept:"Mathematics",        si:0},
      {n:4,  fn:"Priya",   ln:"Nair",     dept:"Science",            si:1},
      {n:5,  fn:"Ramesh",  ln:"Joshi",    dept:"Science",            si:1},
      {n:6,  fn:"Leela",   ln:"Desai",    dept:"Science",            si:1},
      {n:7,  fn:"Rahul",   ln:"Verma",    dept:"English",            si:2},
      {n:8,  fn:"Sunita",  ln:"Ghosh",    dept:"English",            si:2},
      {n:9,  fn:"Kiran",   ln:"Mehta",    dept:"English",            si:2},
      {n:10, fn:"Sneha",   ln:"Pillai",   dept:"Social Studies",     si:3},
      {n:11, fn:"Deepa",   ln:"Nambiar",  dept:"Social Studies",     si:3},
      {n:12, fn:"Suresh",  ln:"Kulkarni", dept:"Social Studies",     si:3},
      {n:13, fn:"Vikram",  ln:"Rao",      dept:"Hindi",              si:4},
      {n:14, fn:"Meena",   ln:"Trivedi",  dept:"Hindi",              si:4},
      {n:15, fn:"Dinesh",  ln:"Pandey",   dept:"Hindi",              si:4},
      {n:16, fn:"Kavitha", ln:"Menon",    dept:"Computer Science",   si:5},
      {n:17, fn:"Ankit",   ln:"Shah",     dept:"Computer Science",   si:5},
      {n:18, fn:"Pooja",   ln:"Iyer",     dept:"Computer Science",   si:5},
      {n:19, fn:"Deepak",  ln:"Kumar",    dept:"Physical Education", si:6},
      {n:20, fn:"Ritu",    ln:"Singh",    dept:"Physical Education", si:6},
      {n:21, fn:"Mohan",   ln:"Das",      dept:"Physical Education", si:6},
    ],
  });
  console.log(`   ✅  ${allProfiles.length} teachers  (teacher${tStart}@gmail.com … teacher${TEACHER_CTR-1}@gmail.com)`);

  const { configId, wdDefs, satDefs } = await createTimetableConfig(school, ay);

  const GRADES   = ["1","2","3","4","5","6","7","8","9","10"];
  const SECTIONS = ["A","B"];
  const allSections = []; let ctIdx = 0;

  for (let gi = 0; gi < GRADES.length; gi++) {
    for (let si = 0; si < SECTIONS.length; si++) {
      const grade = GRADES[gi], section = SECTIONS[si], name = `${grade}-${section}`;
      let cs = await prisma.classSection.findFirst({ where:{ grade, section, schoolId: school.id } });
      if (!cs) cs = await prisma.classSection.create({ data:{ grade, section, name, schoolId: school.id } });
      const ct = allProfiles[ctIdx++ % allProfiles.length];
      await prisma.classSectionAcademicYear.upsert({
        where:  { classSectionId_academicYearId:{ classSectionId: cs.id, academicYearId: ay.id } },
        update: { classTeacherId: ct.id, isActive:true },
        create: { classSectionId: cs.id, academicYearId: ay.id, classTeacherId: ct.id, isActive:true },
      });
      await linkSubjectsAndTeachers({ cs, subjects, tBySubject, ay, gi, si });
      allSections.push({ id: cs.id, grade, section, name });
    }
  }
  console.log(`   ✅  ${allSections.length} class sections`);

  const totalTT = await writeTimetable(school, ay, subjects, tBySubject, allSections, wdDefs, satDefs, configId);
  console.log(`   ✅  ${totalTT} timetable entries`);

  const COUNT = 120, stuStart = STUDENT_CTR;
  console.log(`   👨‍🎓  Seeding ${COUNT} students × ${allSections.length} sections…`);
  const allEnrollments = [];
  for (const cs of allSections) {
    const enrs = await seedStudents({ school, ay, cs, count: COUNT, baseAge:6, password });
    allEnrollments.push(...enrs);
    process.stdout.write(`      ✅  ${cs.name}  (${COUNT} students)\n`);
  }

  // Assessments
  await seedAssessments({ school, ay, allSections, subjects, allEnrollments });

  // NEW: Full-year attendance
  await seedAttendance({ school, ay, allSections, allEnrollments, adminUser });

  // NEW: Teacher attendance
  await seedTeacherAttendance({ school, ay, allTeachers: allProfiles, adminUser });

  // NEW: Holidays
  await seedHolidays({ school, ay, adminUser });

  // NEW: Gallery
  await seedGallery({ school, ay, adminUser });

  // NEW: Activities & Events (standalone)
  await seedActivitiesAndEvents({ school, ay, allSections, allEnrollments, adminUser });

  // NEW: Awards
  await seedAwards({ school, ay, allSections, allEnrollments, adminUser });

  return { school, totalStudents: STUDENT_CTR - stuStart, totalSections: allSections.length, totalTT };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  2.  PUC
// ═══════════════════════════════════════════════════════════════════════════════
async function seedPUC(university, password) {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   🎓  Springfield PUC                ║");
  console.log("╚══════════════════════════════════════╝");

  const school = await prisma.school.upsert({
    where:  { code:"SPRINGFIELD_PUC" }, update:{},
    create: { name:"Springfield PUC", code:"SPRINGFIELD_PUC", type:"PUC",
      address:"789 College Road", city:"Bengaluru", state:"Karnataka",
      phone:"080-22222222", email:"puc@springfield.edu", universityId: university.id },
  });

  const adminUser = await prisma.user.upsert({ where:{ email_schoolId:{ email:"admin2@gmail.com", schoolId: school.id } }, update:{},
    create:{ name:"PUC Admin", email:"admin2@gmail.com", password, role:"ADMIN", schoolId: school.id }});
  const fu2 = await prisma.user.upsert({ where:{ email_schoolId:{ email:"finance2@gmail.com", schoolId: school.id } }, update:{},
    create:{ name:"Finance Admin", email:"finance2@gmail.com", password, role:"FINANCE", schoolId: school.id }});
  await prisma.financeProfile.upsert({ where:{ userId: fu2.id }, update:{},
    create:{ userId: fu2.id, schoolId: school.id, employeeCode:"FIN-002", designation:"Finance Officer", phone:"9000000002" }});
  await prisma.schoolPromotionConfig.upsert({ where:{ schoolId: school.id }, update:{},
    create:{ schoolId: school.id, skipGrades:[], lastGrade:"12", firstGrade:"11" }});
  console.log("   ✅  Admin + Finance Admin");

  const ay = await prisma.academicYear.upsert({
    where:  { name_schoolId:{ name:"2025-26", schoolId: school.id } }, update:{ isActive:true },
    create: { name:"2025-26", startDate: new Date("2025-06-01"), endDate: new Date("2026-03-31"), isActive:true, schoolId: school.id },
  });

  const sciStream  = await prisma.stream.upsert({ where:{ name_schoolId:{ name:"Science",  schoolId: school.id } }, update:{ hasCombinations:true  }, create:{ name:"Science",  code:"SCI", hasCombinations:true,  schoolId: school.id } });
  const comStream  = await prisma.stream.upsert({ where:{ name_schoolId:{ name:"Commerce", schoolId: school.id } }, update:{ hasCombinations:true  }, create:{ name:"Commerce", code:"COM", hasCombinations:true,  schoolId: school.id } });
  const artsStream = await prisma.stream.upsert({ where:{ name_schoolId:{ name:"Arts",     schoolId: school.id } }, update:{ hasCombinations:false }, create:{ name:"Arts",     code:"ART", hasCombinations:false, schoolId: school.id } });

  const pcmb = await prisma.streamCombination.upsert({ where:{ name_streamId:{ name:"PCMB", streamId: sciStream.id  } }, update:{}, create:{ name:"PCMB", code:"PCMB", streamId: sciStream.id  } });
  const pcmc = await prisma.streamCombination.upsert({ where:{ name_streamId:{ name:"PCMC", streamId: sciStream.id  } }, update:{}, create:{ name:"PCMC", code:"PCMC", streamId: sciStream.id  } });
  const ceba = await prisma.streamCombination.upsert({ where:{ name_streamId:{ name:"CEBA", streamId: comStream.id  } }, update:{}, create:{ name:"CEBA", code:"CEBA", streamId: comStream.id  } });
  const seba = await prisma.streamCombination.upsert({ where:{ name_streamId:{ name:"SEBA", streamId: comStream.id  } }, update:{}, create:{ name:"SEBA", code:"SEBA", streamId: comStream.id  } });
  const hep  = await prisma.streamCombination.upsert({ where:{ name_streamId:{ name:"HEP",  streamId: artsStream.id } }, update:{}, create:{ name:"HEP",  code:"HEP",  streamId: artsStream.id } });
  console.log("   ✅  Streams + combinations (PCMB, PCMC, CEBA, SEBA, HEP)");

  const SUBJ_DEFS = [
    { name:"Physics",            code:"PUC-PHY"  },
    { name:"Chemistry",          code:"PUC-CHE"  },
    { name:"Mathematics",        code:"PUC-MATH" },
    { name:"Biology",            code:"PUC-BIO"  },
    { name:"Computer Science",   code:"PUC-CS"   },
    { name:"English",            code:"PUC-ENG"  },
    { name:"Economics",          code:"PUC-ECO"  },
    { name:"Commerce",           code:"PUC-COM"  },
    { name:"Accountancy",        code:"PUC-ACC"  },
    { name:"Business Studies",   code:"PUC-BUS"  },
    { name:"Statistics",         code:"PUC-STAT" },
    { name:"History",            code:"PUC-HIS"  },
    { name:"Political Science",  code:"PUC-POL"  },
    { name:"Sociology",          code:"PUC-SOC"  },
  ];
  const subjects = [];
  for (const d of SUBJ_DEFS)
    subjects.push(await prisma.subject.upsert({
      where:  { code_schoolId:{ code: d.code, schoolId: school.id } },
      update: { name: d.name }, create: { name: d.name, code: d.code, schoolId: school.id },
    }));
  console.log(`   ✅  ${subjects.length} subjects`);

  const tStart = TEACHER_CTR;
  const { allProfiles, tBySubject } = await createTeachers(school, password, {
    subjectDefs: SUBJ_DEFS,
    defs: [
      {n:1,  fn:"Rajan",   ln:"Nair",         dept:"Physics",          si:0  },
      {n:2,  fn:"Savitha", ln:"Menon",         dept:"Physics",          si:0  },
      {n:3,  fn:"Arun",    ln:"Kumar",         dept:"Physics",          si:0  },
      {n:4,  fn:"Lakshmi", ln:"Sharma",        dept:"Chemistry",        si:1  },
      {n:5,  fn:"Suresh",  ln:"Pillai",        dept:"Chemistry",        si:1  },
      {n:6,  fn:"Usha",    ln:"Rao",           dept:"Chemistry",        si:1  },
      {n:7,  fn:"Praveen", ln:"Iyer",          dept:"Mathematics",      si:2  },
      {n:8,  fn:"Geetha",  ln:"Verma",         dept:"Mathematics",      si:2  },
      {n:9,  fn:"Ramesh",  ln:"Patel",         dept:"Mathematics",      si:2  },
      {n:10, fn:"Nalini",  ln:"Reddy",         dept:"Biology",          si:3  },
      {n:11, fn:"Shankar", ln:"Singh",         dept:"Biology",          si:3  },
      {n:12, fn:"Vidya",   ln:"Joshi",         dept:"Biology",          si:3  },
      {n:13, fn:"Meera",   ln:"Bose",          dept:"Computer Science", si:4  },
      {n:14, fn:"Anil",    ln:"Shah",          dept:"Computer Science", si:4  },
      {n:15, fn:"Sundar",  ln:"Ghosh",         dept:"Computer Science", si:4  },
      {n:16, fn:"Pradeep", ln:"Gupta",         dept:"English",          si:5  },
      {n:17, fn:"Hema",    ln:"Nambiar",       dept:"English",          si:5  },
      {n:18, fn:"Karthik", ln:"Desai",         dept:"English",          si:5  },
      {n:19, fn:"Anand",   ln:"Iyer",          dept:"Economics",        si:6  },
      {n:20, fn:"Preeti",  ln:"Mishra",        dept:"Economics",        si:6  },
      {n:21, fn:"Girish",  ln:"Shetty",        dept:"Economics",        si:6  },
      {n:22, fn:"Mohan",   ln:"Das",           dept:"Commerce",         si:7  },
      {n:23, fn:"Kavitha", ln:"Hegde",         dept:"Commerce",         si:7  },
      {n:24, fn:"Ravi",    ln:"Naidu",         dept:"Commerce",         si:7  },
      {n:25, fn:"Seema",   ln:"Kamath",        dept:"Accountancy",      si:8  },
      {n:26, fn:"Vinod",   ln:"Chandra",       dept:"Accountancy",      si:8  },
      {n:27, fn:"Rekha",   ln:"Tiwari",        dept:"Accountancy",      si:8  },
      {n:28, fn:"Girish",  ln:"Kulkarni",      dept:"Business Studies", si:9  },
      {n:29, fn:"Nisha",   ln:"Dubey",         dept:"Business Studies", si:9  },
      {n:30, fn:"Satish",  ln:"Pandey",        dept:"Statistics",       si:10 },
      {n:31, fn:"Swati",   ln:"Trivedi",       dept:"Statistics",       si:10 },
      {n:32, fn:"Hemant",  ln:"Rajan",         dept:"History",          si:11 },
      {n:33, fn:"Archana", ln:"Krishnan",      dept:"History",          si:11 },
      {n:34, fn:"Deepak",  ln:"Subramaniam",   dept:"Political Science",si:12 },
      {n:35, fn:"Padma",   ln:"Balaji",        dept:"Political Science",si:12 },
      {n:36, fn:"Kiran",   ln:"Gowda",         dept:"Sociology",        si:13 },
      {n:37, fn:"Sunita",  ln:"Yadav",         dept:"Sociology",        si:13 },
    ],
  });
  console.log(`   ✅  ${allProfiles.length} teachers  (teacher${tStart}@gmail.com … teacher${TEACHER_CTR-1}@gmail.com)`);

  const { configId, wdDefs, satDefs } = await createTimetableConfig(school, ay);

  const SECTION_DEFS = [
    { stream:sciStream,  combo:pcmb, grade:"11", sec:"A", name:"11-A Science/PCMB"   },
    { stream:sciStream,  combo:pcmb, grade:"11", sec:"B", name:"11-B Science/PCMB"   },
    { stream:sciStream,  combo:pcmb, grade:"12", sec:"A", name:"12-A Science/PCMB"   },
    { stream:sciStream,  combo:pcmb, grade:"12", sec:"B", name:"12-B Science/PCMB"   },
    { stream:sciStream,  combo:pcmc, grade:"11", sec:"C", name:"11-C Science/PCMC"   },
    { stream:sciStream,  combo:pcmc, grade:"11", sec:"D", name:"11-D Science/PCMC"   },
    { stream:sciStream,  combo:pcmc, grade:"12", sec:"C", name:"12-C Science/PCMC"   },
    { stream:sciStream,  combo:pcmc, grade:"12", sec:"D", name:"12-D Science/PCMC"   },
    { stream:comStream,  combo:ceba, grade:"11", sec:"A", name:"11-A Commerce/CEBA"  },
    { stream:comStream,  combo:ceba, grade:"11", sec:"B", name:"11-B Commerce/CEBA"  },
    { stream:comStream,  combo:ceba, grade:"12", sec:"A", name:"12-A Commerce/CEBA"  },
    { stream:comStream,  combo:ceba, grade:"12", sec:"B", name:"12-B Commerce/CEBA"  },
    { stream:comStream,  combo:seba, grade:"11", sec:"C", name:"11-C Commerce/SEBA"  },
    { stream:comStream,  combo:seba, grade:"12", sec:"C", name:"12-C Commerce/SEBA"  },
    { stream:artsStream, combo:hep,  grade:"11", sec:"A", name:"11-A Arts/HEP"       },
    { stream:artsStream, combo:hep,  grade:"11", sec:"B", name:"11-B Arts/HEP"       },
    { stream:artsStream, combo:hep,  grade:"12", sec:"A", name:"12-A Arts/HEP"       },
    { stream:artsStream, combo:hep,  grade:"12", sec:"B", name:"12-B Arts/HEP"       },
  ];

  const allSections = []; let ctIdx = 0;
  for (let i = 0; i < SECTION_DEFS.length; i++) {
    const def = SECTION_DEFS[i];
    let cs = await prisma.classSection.findFirst({
      where:{ grade: def.grade, section: def.sec, schoolId: school.id, streamId: def.stream.id, combinationId: def.combo.id },
    });
    if (!cs) cs = await prisma.classSection.create({
      data:{ grade: def.grade, section: def.sec, name: def.name, schoolId: school.id, streamId: def.stream.id, combinationId: def.combo.id },
    });
    const ct = allProfiles[ctIdx++ % allProfiles.length];
    await prisma.classSectionAcademicYear.upsert({
      where:  { classSectionId_academicYearId:{ classSectionId: cs.id, academicYearId: ay.id } },
      update: { classTeacherId: ct.id, isActive:true },
      create: { classSectionId: cs.id, academicYearId: ay.id, classTeacherId: ct.id, isActive:true },
    });
    await linkSubjectsAndTeachers({ cs, subjects, tBySubject, ay, gi:i, si:0 });
    allSections.push({ id: cs.id, grade: def.grade, section: def.sec, name: def.name });
  }
  console.log(`   ✅  ${allSections.length} class sections`);

  const totalTT = await writeTimetable(school, ay, subjects, tBySubject, allSections, wdDefs, satDefs, configId);
  console.log(`   ✅  ${totalTT} timetable entries`);

  const COUNT = 110, stuStart = STUDENT_CTR;
  console.log(`   👨‍🎓  Seeding ${COUNT} students × ${allSections.length} sections…`);
  const allEnrollments = [];
  for (const cs of allSections) {
    const enrs = await seedStudents({ school, ay, cs, count: COUNT, baseAge:16, password });
    allEnrollments.push(...enrs);
    process.stdout.write(`      ✅  ${cs.name}  (${COUNT} students)\n`);
  }

  await seedAssessments({ school, ay, allSections, subjects, allEnrollments });
  await seedAttendance({ school, ay, allSections, allEnrollments, adminUser });
  await seedTeacherAttendance({ school, ay, allTeachers: allProfiles, adminUser });
  await seedHolidays({ school, ay, adminUser });
  await seedGallery({ school, ay, adminUser });
  await seedActivitiesAndEvents({ school, ay, allSections, allEnrollments, adminUser });
  await seedAwards({ school, ay, allSections, allEnrollments, adminUser });

  return { school, totalStudents: STUDENT_CTR - stuStart, totalSections: allSections.length, totalTT };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3.  DEGREE
// ═══════════════════════════════════════════════════════════════════════════════
async function seedDegree(university, password) {
  console.log("\n╔══════════════════════════════════════╗");
  console.log("║   🎓  Springfield Degree College     ║");
  console.log("╚══════════════════════════════════════╝");

  const school = await prisma.school.upsert({
    where:  { code:"SPRINGFIELD_DEG" }, update:{},
    create: { name:"Springfield Degree College", code:"SPRINGFIELD_DEG", type:"DEGREE",
      address:"101 University Avenue", city:"Bengaluru", state:"Karnataka",
      phone:"080-33333333", email:"degree@springfield.edu", universityId: university.id },
  });

  const adminUser = await prisma.user.upsert({ where:{ email_schoolId:{ email:"admin3@gmail.com", schoolId: school.id } }, update:{},
    create:{ name:"Degree Admin", email:"admin3@gmail.com", password, role:"ADMIN", schoolId: school.id }});
  const fu3 = await prisma.user.upsert({ where:{ email_schoolId:{ email:"finance3@gmail.com", schoolId: school.id } }, update:{},
    create:{ name:"Finance Admin", email:"finance3@gmail.com", password, role:"FINANCE", schoolId: school.id }});
  await prisma.financeProfile.upsert({ where:{ userId: fu3.id }, update:{},
    create:{ userId: fu3.id, schoolId: school.id, employeeCode:"FIN-003", designation:"Finance Officer", phone:"9000000003" }});
  await prisma.schoolPromotionConfig.upsert({ where:{ schoolId: school.id }, update:{},
    create:{ schoolId: school.id, skipGrades:[], lastGrade:"Semester 8", firstGrade:"Semester 1" }});
  console.log("   ✅  Admin + Finance Admin");

  const ay = await prisma.academicYear.upsert({
    where:  { name_schoolId:{ name:"2025-26", schoolId: school.id } }, update:{ isActive:true },
    create: { name:"2025-26", startDate: new Date("2025-08-01"), endDate: new Date("2026-05-31"), isActive:true, schoolId: school.id },
  });

  const beCourse = await prisma.course.upsert({ where:{ name_schoolId:{ name:"BE", schoolId: school.id } }, update:{ hasBranches:true  }, create:{ name:"BE", code:"BE", type:"DEGREE_COURSE", totalSemesters:8, hasBranches:true,  schoolId: school.id } });
  const baCourse = await prisma.course.upsert({ where:{ name_schoolId:{ name:"BA", schoolId: school.id } }, update:{ hasBranches:false }, create:{ name:"BA", code:"BA", type:"DEGREE_COURSE", totalSemesters:6, hasBranches:false, schoolId: school.id } });

  const beBranches = [];
  for (const d of [{ name:"Computer Science & Engineering", code:"CSE" },{ name:"Electronics & Communication", code:"ECE" },{ name:"Mechanical Engineering", code:"ME" }])
    beBranches.push(await prisma.courseBranch.upsert({ where:{ name_courseId:{ name: d.name, courseId: beCourse.id } }, update:{}, create:{ name: d.name, code: d.code, courseId: beCourse.id } }));
  console.log(`   ✅  Courses: BE (CSE/ECE/ME), BA`);

  const SUBJ_DEFS = [
    { name:"Engineering Mathematics", code:"DEG-MATH" },
    { name:"Physics",                 code:"DEG-PHY"  },
    { name:"Programming in C",        code:"DEG-PROG" },
    { name:"Data Structures",         code:"DEG-DS"   },
    { name:"Digital Electronics",     code:"DEG-DE"   },
    { name:"Engineering Drawing",     code:"DEG-DRAW" },
    { name:"Communication Skills",    code:"DEG-COMM" },
  ];
  const subjects = [];
  for (const d of SUBJ_DEFS)
    subjects.push(await prisma.subject.upsert({
      where:  { code_schoolId:{ code: d.code, schoolId: school.id } },
      update: { name: d.name }, create: { name: d.name, code: d.code, schoolId: school.id },
    }));
  console.log(`   ✅  ${subjects.length} subjects`);

  const tStart = TEACHER_CTR;
  const { allProfiles, tBySubject } = await createTeachers(school, password, {
    subjectDefs: SUBJ_DEFS,
    defs: [
      {n:1,  fn:"Venkat",  ln:"Rao",       dept:"Mathematics",     si:0},
      {n:2,  fn:"Archana", ln:"Sharma",    dept:"Mathematics",     si:0},
      {n:3,  fn:"Shiva",   ln:"Kumar",     dept:"Mathematics",     si:0},
      {n:4,  fn:"Sridhar", ln:"Nair",      dept:"Physics",         si:1},
      {n:5,  fn:"Mala",    ln:"Pillai",    dept:"Physics",         si:1},
      {n:6,  fn:"Ganesh",  ln:"Menon",     dept:"Physics",         si:1},
      {n:7,  fn:"Rahul",   ln:"Iyer",      dept:"Computer Science",si:2},
      {n:8,  fn:"Nisha",   ln:"Bose",      dept:"Computer Science",si:2},
      {n:9,  fn:"Kartik",  ln:"Singh",     dept:"Computer Science",si:2},
      {n:10, fn:"Divya",   ln:"Gupta",     dept:"Computer Science",si:3},
      {n:11, fn:"Suresh",  ln:"Reddy",     dept:"Computer Science",si:3},
      {n:12, fn:"Ananya",  ln:"Patel",     dept:"Computer Science",si:3},
      {n:13, fn:"Vivek",   ln:"Verma",     dept:"Electronics",     si:4},
      {n:14, fn:"Padma",   ln:"Joshi",     dept:"Electronics",     si:4},
      {n:15, fn:"Rajiv",   ln:"Desai",     dept:"Electronics",     si:4},
      {n:16, fn:"Uday",    ln:"Nambiar",   dept:"Mechanical",      si:5},
      {n:17, fn:"Sudha",   ln:"Ghosh",     dept:"Mechanical",      si:5},
      {n:18, fn:"Kiran",   ln:"Trivedi",   dept:"Mechanical",      si:5},
      {n:19, fn:"Rekha",   ln:"Kulkarni",  dept:"Communication",   si:6},
      {n:20, fn:"Anand",   ln:"Shah",      dept:"Communication",   si:6},
      {n:21, fn:"Preethi", ln:"Das",       dept:"Communication",   si:6},
    ],
  });
  console.log(`   ✅  ${allProfiles.length} teachers  (teacher${tStart}@gmail.com … teacher${TEACHER_CTR-1}@gmail.com)`);

  const { configId, wdDefs, satDefs } = await createTimetableConfig(school, ay);

  const BE_SEMS = ["Semester 1","Semester 2","Semester 3","Semester 4","Semester 5","Semester 6","Semester 7","Semester 8"];
  const BA_SEMS = ["Semester 1","Semester 2","Semester 3","Semester 4","Semester 5","Semester 6"];
  const allSections = []; let ctIdx = 0;

  for (let bi = 0; bi < beBranches.length; bi++) {
    const branch = beBranches[bi];
    for (let gi = 0; gi < BE_SEMS.length; gi++) {
      const sem = BE_SEMS[gi], section = "A", name = `BE-${branch.code} ${sem}-A`;
      let cs = await prisma.classSection.findFirst({ where:{ grade: sem, section, schoolId: school.id, branchId: branch.id } });
      if (!cs) cs = await prisma.classSection.create({ data:{ grade: sem, section, name, schoolId: school.id, courseId: beCourse.id, branchId: branch.id } });
      const ct = allProfiles[ctIdx++ % allProfiles.length];
      await prisma.classSectionAcademicYear.upsert({
        where:  { classSectionId_academicYearId:{ classSectionId: cs.id, academicYearId: ay.id } },
        update: { classTeacherId: ct.id, isActive:true },
        create: { classSectionId: cs.id, academicYearId: ay.id, classTeacherId: ct.id, isActive:true },
      });
      await linkSubjectsAndTeachers({ cs, subjects, tBySubject, ay, gi, si: bi });
      allSections.push({ id: cs.id, grade: sem, section, name });
    }
  }

  for (let gi = 0; gi < BA_SEMS.length; gi++) {
    const sem = BA_SEMS[gi];
    for (const section of ["A","B"]) {
      const name = `BA ${sem}-${section}`;
      let cs = await prisma.classSection.findFirst({ where:{ grade: sem, section, schoolId: school.id, courseId: baCourse.id, branchId: null } });
      if (!cs) cs = await prisma.classSection.create({ data:{ grade: sem, section, name, schoolId: school.id, courseId: baCourse.id } });
      const ct = allProfiles[ctIdx++ % allProfiles.length];
      await prisma.classSectionAcademicYear.upsert({
        where:  { classSectionId_academicYearId:{ classSectionId: cs.id, academicYearId: ay.id } },
        update: { classTeacherId: ct.id, isActive:true },
        create: { classSectionId: cs.id, academicYearId: ay.id, classTeacherId: ct.id, isActive:true },
      });
      await linkSubjectsAndTeachers({ cs, subjects, tBySubject, ay, gi, si:0 });
      allSections.push({ id: cs.id, grade: sem, section, name });
    }
  }
  console.log(`   ✅  ${allSections.length} class sections  (BE: 24, BA: 12)`);

  const totalTT = await writeTimetable(school, ay, subjects, tBySubject, allSections, wdDefs, satDefs, configId);
  console.log(`   ✅  ${totalTT} timetable entries`);

  const COUNT = 100, stuStart = STUDENT_CTR;
  console.log(`   👨‍🎓  Seeding ${COUNT} students × ${allSections.length} sections…`);
  const allEnrollments = [];
  for (const cs of allSections) {
    const enrs = await seedStudents({ school, ay, cs, count: COUNT, baseAge:18, password });
    allEnrollments.push(...enrs);
    process.stdout.write(`      ✅  ${cs.name}  (${COUNT} students)\n`);
  }

  await seedAssessments({ school, ay, allSections, subjects, allEnrollments });
  await seedAttendance({ school, ay, allSections, allEnrollments, adminUser });
  await seedTeacherAttendance({ school, ay, allTeachers: allProfiles, adminUser });
  await seedHolidays({ school, ay, adminUser });
  await seedGallery({ school, ay, adminUser });
  await seedActivitiesAndEvents({ school, ay, allSections, allEnrollments, adminUser });
  await seedAwards({ school, ay, allSections, allEnrollments, adminUser });

  return { school, totalStudents: STUDENT_CTR - stuStart, totalSections: allSections.length, totalTT };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log("🌱  Springfield Multi-Institution Seed Starting…\n");
  const password = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  const university = await prisma.university.upsert({
    where:  { code:"SPRINGFIELD_UNI" }, update:{},
    create: { name:"Springfield University", code:"SPRINGFIELD_UNI",
      address:"123 University Road", city:"Bengaluru", state:"Karnataka",
      phone:"080-12345678", email:"contact@springfield.edu", website:"https://springfield.edu" },
  });
  console.log("📚  Springfield University ready");

  const sa = await prisma.superAdmin.upsert({
    where:  { email:"superadmin@gmail.com" }, update:{},
    create: { name:"Super Admin", email:"superadmin@gmail.com", password, phone:"9000000000", universityId: university.id },
  });
  console.log("👑  Super Admin ready  (superadmin@gmail.com)");

  const schoolResult = await seedSchool(university, password);
  const pucResult    = await seedPUC(university, password);
  const degResult    = await seedDegree(university, password);

  for (const { school } of [schoolResult, pucResult, degResult]) {
    await prisma.superAdminSchoolAccess.upsert({
      where:  { superAdminId_schoolId:{ superAdminId: sa.id, schoolId: school.id } },
      update: {},
      create: { superAdminId: sa.id, schoolId: school.id },
    });
  }

  const S = schoolResult.totalStudents;
  const P = pucResult.totalStudents;
  const D = degResult.totalStudents;
  const total = S + P + D;

  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║                        ✨  SEEDING COMPLETE  ✨                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  ALL PASSWORDS              →  123456                                         ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  SUPER ADMIN                →  superadmin@gmail.com                           ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  🏫  HIGH SCHOOL  admin1@gmail.com  /  finance1@gmail.com                     ║
║      20 sections × 120 students  =  ${String(S).padEnd(6)} students                       ║
║      📝 5 exam groups with marks + results                                    ║
║      📅 Full-year attendance (Jun 2025 – Mar 2026)                            ║
║      🏆 12 activities + 6 standalone events + awards + gallery                ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  🎓  PUC          admin2@gmail.com  /  finance2@gmail.com                     ║
║      18 sections × 110 students  =  ${String(P).padEnd(6)} students                       ║
║      📝 5 exam groups + 📅 Full-year attendance + 🏆 activities/events        ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  🎓  DEGREE       admin3@gmail.com  /  finance3@gmail.com                     ║
║      36 sections × 100 students  =  ${String(D).padEnd(6)} students                       ║
║      📝 5 exam groups + 📅 Full-year attendance + 🏆 activities/events        ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  GRAND TOTAL  ${String(total).padEnd(7)} students                                          ║
║  student1@gmail.com  …  student${total}@gmail.com                             ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  NEW TABLES SEEDED:                                                           ║
║  ✅ AttendanceRecord      — ~92% present, ~4% absent, full academic year      ║
║  ✅ TeacherAttendance     — all teachers, full academic year                  ║
║  ✅ SchoolHoliday         — 6 govt recurring + 7 school-specific per school   ║
║  ✅ GalleryAlbum/Image    — 6 albums × 6-10 images per school                 ║
║  ✅ Activity              — 12 clubs/sports (standalone, no event link)        ║
║  ✅ ActivityClass         — activities linked to class sections               ║
║  ✅ StudentActivityEnroll — students enrolled in activities                   ║
║  ✅ ActivityEvent         — 6 standalone events (activityId = null)           ║
║  ✅ EventClass            — events linked to class sections                   ║
║  ✅ EventTeam/Member      — teams with 5 students each                        ║
║  ✅ EventParticipant      — individual participants                           ║
║  ✅ EventResult           — winners/runners-up for completed events           ║
║  ✅ Certificate           — issued for event results + awards                 ║
║  ✅ Award                 — 8 award types per school                          ║
║  ✅ StudentAward          — top students per section receive awards           ║
╚═══════════════════════════════════════════════════════════════════════════════╝
`);
}

main()
  .catch(e => { console.error("❌  Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });