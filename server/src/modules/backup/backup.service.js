import { prisma } from "../../config/db.js";
import {
  S3Client,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import {
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import {
  PutObjectCommand,
} from "@aws-sdk/client-s3";
/* =========================================================
   LIST DELETED RECORDS
========================================================= */

export const listDeletedRecords = async (schoolId) => {

const models = [

  // CORE
  "student",
  "studentList",
  "parent",
  "teacherProfile",
  "staffProfile",
  "user",

  // ACADEMICS
  "classSection",
  "subject",
  "academicYear",
  "studentEnrollment",
  "teacherAssignment",
  "classSubject",

  // ATTENDANCE
  "attendanceRecord",
  "teacherAttendance",

  // EXAMS
  "assessmentTerm",
  "assessmentGroup",
  "assessmentSchedule",
  "marks",

  // TIMETABLE
  "timetableConfig",
  "timetableEntry",



  // EVENTS & ACTIVITIES
  "activity",
  "activityEvent",
  "eventTeam",
  "eventParticipant",
"schoolHoliday",
  // CERTIFICATES & AWARDS
  "certificate",
  "award",
  "studentAward",

  // GALLERY
  "galleryAlbum",
  "galleryImage",



  // STAFF & SALARY
  "teacherMonthlySalary",

  // TRANSPORT
 
  "transportRoute",

"teacherTutorialProfile",

  // CHAT
 
  "message",

  // NOTIFICATIONS
 
  "groupBStaffSalary",
"groupCStaffSalary",

"teacherMonthlySalary",
"expense",
"chatRoom",
];
  const result = {};

  for (const model of models) {

    try {

      // Skip invalid prisma models
      if (!prisma[model]) {
        console.log(`Model not found: ${model}`);
        continue;
      }

      // Skip models without deletedAt
// models without deletedAt
const noSoftDeleteModels = [
  "chatRoom",
   "message",
];

if (noSoftDeleteModels.includes(model)) {
  continue;
}

const whereClause = {
  deletedAt: {
    not: null,
  },
};

// models having direct schoolId
const schoolIdModels = [
  "student",
  "studentList",
  "parent",
  "teacherProfile",
  "staffProfile",
  "classSection",
  "subject",
  "academicYear",
  "attendanceRecord",
  "teacherAttendance",
  "assessmentTerm",
  "assessmentGroup",
  "assessmentSchedule",
  "marks",
  "schoolHoliday",
  "timetableConfig",
  "timetableEntry",
  
  "activity",
  "activityEvent",
  "certificate",
  "galleryAlbum",
  "expense",
  
  "teacherMonthlySalary",
  "transport",
  "transportRoute",
  "hostel",
  "notification",
 "teacherTutorialProfile",
  "groupBStaffSalary",
  "groupCStaffSalary",
 
];

if (schoolId && schoolIdModels.includes(model)) {
  whereClause.schoolId = schoolId;
}
if (model === "galleryImage" && schoolId) {
  whereClause.album = {
    schoolId,
  };
}
// marks -> through schedule
if (model === "marks" && schoolId) {
  whereClause.schedule = {
    schoolId,
  };
}

// certificate -> through student
if (model === "certificate" && schoolId) {
  whereClause.student = {
    schoolId,
  };
}

if (model === "schoolHoliday" && schoolId) {
  whereClause.school = {
    id: schoolId,
  };
}
const includeConfig = {
  parent: {
    user: true,
  },

  teacherProfile: {
    user: true,
  },

  staffProfile: {
    user: true,
  },

  teacherTutorialProfile: {
    teacher: {
      select: {
        firstName: true,
        lastName: true,
      },
    },
  },
};
const data = await prisma[model].findMany({
  where: whereClause,

  include:
    includeConfig[model] || undefined,

  orderBy: {
    deletedAt: "desc",
  },
});
      result[model] = data;

    } catch (error) {

      console.log(
        `Error loading ${model}:`,
        error.message
      );

      result[model] = [];

    }
  }

  return result;
};

/* =========================================================
   RESTORE SINGLE RECORD
========================================================= */

export const restoreSingleRecord = async ({
  schoolId,
  model,
  recordId,
}) => {

  if (!prisma[model]) {
    throw new Error("Invalid model");
  }

  // =========================
  // STAFF RESTORE
  // =========================

  if (model === "staffProfile") {

    const restoredStaff =
      await prisma.staffProfile.update({

        where: {
        id: Number(recordId),
        },

        data: {
          deletedAt: null,
          status: "ACTIVE",
        },
      });

    // restore linked user
    if (restoredStaff.userId) {

      await prisma.user.update({

        where: {
          id: restoredStaff.userId,
        },

        data: {
          deletedAt: null,
          isActive: true,
        },
      });

    }

    return restoredStaff;
  }

  // =========================
  // TUTORIAL TEACHER RESTORE
  // =========================

  if (model === "teacherTutorialProfile") {

    const restoredTutorial =
      await prisma.teacherTutorialProfile.update({

        where: {
         id: Number(recordId),
        },

        data: {
          deletedAt: null,
          isActive: true,
        },
      });

    return restoredTutorial;
  }

  // =========================
  // CLASS SECTION RESTORE
  // =========================

  if (model === "classSection") {

    const restoredClass =
      await prisma.classSection.update({

        where: {
        id: Number(recordId),
        },

        data: {
          deletedAt: null,
        },
      });

    return restoredClass;
  }

  // =========================
  // HOLIDAY RESTORE
  // =========================

  if (model === "schoolHoliday") {

    const restoredHoliday =
      await prisma.schoolHoliday.update({

        where: {
         id: Number(recordId),
        },

        data: {
          deletedAt: null,
        },
      });

    return restoredHoliday;
  }

  // =========================
  // GALLERY IMAGE RESTORE
  // =========================

  if (model === "galleryImage") {

    const restoredImage =
      await prisma.galleryImage.update({

        where: {
id: Number(recordId),
        },

        data: {
          deletedAt: null,
        },
      });

    return restoredImage;
  }
// =========================
// FINANCE STUDENT RESTORE
// =========================

if (model === "studentList") {

  const restoredStudent =
    await prisma.studentList.update({

      where: {
        id: Number(recordId),
      },

      data: {
        deletedAt: null,
      },
    });

  return restoredStudent;
}
  // =========================
  // NORMAL RESTORE
  // =========================

  const restoredRecord =
    await prisma[model].update({

      where: {
      id: Number(recordId),
      },

      data: {
        deletedAt: null,
      },
    });

  return restoredRecord;
};

/* =========================================================
   LIST SCHOOL BACKUPS
========================================================= */



/* =========================================================
   RESTORE ENTIRE SCHOOL
========================================================= */

export const restoreEntireSchool =
  async (schoolId) => {

    try {

      // ====================================
      // FIND LATEST BACKUP
      // ====================================

    const listCommand =
  new ListObjectsV2Command({
    Bucket: process.env.R2_BUCKET,
  Prefix:
`CloudBackup/school-backups/${schoolId}/`,
  });


      const listResponse =
        await r2.send(listCommand);

      const files =
        listResponse.Contents || [];

      if (!files.length) {
        throw new Error(
          "No backup found"
        );
      }

      // latest backup
      const latest =
        files.sort(
          (a, b) =>
            new Date(b.LastModified) -
            new Date(a.LastModified)
        )[0];

      // ====================================
      // DOWNLOAD BACKUP
      // ====================================

      const getCommand =
        new GetObjectCommand({

          Bucket:
            process.env.R2_BUCKET,

          Key: latest.Key,
        });

      const response =
        await r2.send(getCommand);

      const jsonString =
        await streamToString(
          response.Body
        );

      const backup =
        JSON.parse(jsonString);

      const school =
        backup.school;

      // ====================================
      // RESTORE SCHOOL
      // ====================================

await prisma.school.upsert({
  where: {
    id: school.id,
  },

  update: {
    deletedAt: null,
    name: school.name,
    code: school.code,
    type: school.type,
    universityId: school.universityId,
  },

  create: {
    id: school.id,
    name: school.name,
    code: school.code,
    type: school.type,
    university: {
      connect: {
        id: school.universityId,
      },
    },
  },
});

      // ====================================
      // RESTORE STUDENTS
      // ====================================

    for (const student of backup.students || []) {

        await prisma.student.upsert({

          where: {
            id: student.id,
          },

          update: {
            deletedAt: null,
          },

          create: {
            ...student,
            personalInfo: undefined,
            documents: undefined,
            enrollments: undefined,
            parentLinks: undefined,
          },
        });

      }



/* =========================================================
   USERS
========================================================= */

for (const user of backup.users || []) {

  await prisma.user.upsert({

    where: {
      id: user.id,
    },

    update: {},

    create: user,
  });
}


/* =========================================================
   PARENTS
========================================================= */

for (const parent of backup.parents || []) {

  await prisma.parent.upsert({

    where: {
      id: parent.id,
    },

    update: {
      deletedAt: null,
    },

    create: parent,
  });
}


/* =========================================================
   TEACHERS
========================================================= */

for (const teacher of backup.teachers || []) {

  await prisma.teacherProfile.upsert({

    where: {
      id: teacher.id,
    },

    update: {
      deletedAt: null,
    },

    create: teacher,
  });
}


/* =========================================================
   STUDENTS
========================================================= */

for (const student of backup.students || []) {

  await prisma.student.upsert({

    where: {
      id: student.id,
    },

    update: {
      deletedAt: null,
    },

    create: student,
  });
}


/* =========================================================
   CLASS SECTIONS
========================================================= */

for (const section of backup.classSections || []) {

  await prisma.classSection.upsert({

    where: {
      id: section.id,
    },

    update: {},

    create: section,
  });
}


/* =========================================================
   SUBJECTS
========================================================= */

for (const subject of backup.subjects || []) {

  await prisma.subject.upsert({

    where: {
      id: subject.id,
    },

    update: {},

    create: subject,
  });
}


/* =========================================================
   ACADEMIC YEARS
========================================================= */

for (const year of backup.academicYears || []) {

  await prisma.academicYear.upsert({

    where: {
      id: year.id,
    },

    update: {},

    create: year,
  });
}


/* =========================================================
   ENROLLMENTS
========================================================= */

for (const enrollment of backup.studentEnrollments || []) {

  await prisma.studentEnrollment.upsert({

    where: {
      id: enrollment.id,
    },

    update: {},

    create: enrollment,
  });
}


/* =========================================================
   ATTENDANCE
========================================================= */

for (const attendance of backup.attendanceRecords || []) {

  await prisma.attendanceRecord.upsert({

    where: {
      id: attendance.id,
    },

    update: {},

    create: attendance,
  });
}


/* =========================================================
   TEACHER ATTENDANCE
========================================================= */

for (const attendance of backup.teacherAttendances || []) {

  await prisma.teacherAttendance.upsert({

    where: {
      id: attendance.id,
    },

    update: {},

    create: attendance,
  });
}


/* =========================================================
   EXAMS
========================================================= */

for (const term of backup.assessmentTerms || []) {

  await prisma.assessmentTerm.upsert({

    where: {
      id: term.id,
    },

    update: {},

    create: term,
  });
}

for (const group of backup.assessmentGroups || []) {

  await prisma.assessmentGroup.upsert({

    where: {
      id: group.id,
    },

    update: {},

    create: group,
  });
}

for (const schedule of backup.assessmentSchedules || []) {

  await prisma.assessmentSchedule.upsert({

    where: {
      id: schedule.id,
    },

    update: {},

    create: schedule,
  });
}

for (const mark of backup.marks || []) {

  await prisma.marks.upsert({

    where: {
      id: mark.id,
    },

    update: {},

    create: mark,
  });
}


/* =========================================================
   TIMETABLE
========================================================= */

for (const config of backup.timetableConfigs || []) {

  await prisma.timetableConfig.upsert({

    where: {
      id: config.id,
    },

    update: {},

    create: config,
  });
}

for (const entry of backup.timetableEntries || []) {

  await prisma.timetableEntry.upsert({

    where: {
      id: entry.id,
    },

    update: {},

    create: entry,
  });
}


/* =========================================================
   FEES
========================================================= */

for (const fee of backup.feeStructures || []) {

  await prisma.feeStructure.upsert({

    where: {
      id: fee.id,
    },

    update: {},

    create: fee,
  });
}

for (const assignment of backup.feeAssignments || []) {

  await prisma.feeAssignment.upsert({

    where: {
      id: assignment.id,
    },

    update: {},

    create: assignment,
  });
}

for (const payment of backup.feePayments || []) {

  await prisma.feePayment.upsert({

    where: {
      id: payment.id,
    },

    update: {},

    create: payment,
  });
}


/* =========================================================
   EVENTS
========================================================= */

for (const activity of backup.activities || []) {

  await prisma.activity.upsert({

    where: {
      id: activity.id,
    },

    update: {},

    create: activity,
  });
}

for (const event of backup.activityEvents || []) {

  await prisma.activityEvent.upsert({

    where: {
      id: event.id,
    },

    update: {},

    create: event,
  });
}

for (const team of backup.eventTeams || []) {

  await prisma.eventTeam.upsert({

    where: {
      id: team.id,
    },

    update: {},

    create: team,
  });
}

for (const participant of backup.eventParticipants || []) {

  await prisma.eventParticipant.upsert({

    where: {
      id: participant.id,
    },

    update: {},

    create: participant,
  });
}


/* =========================================================
   CERTIFICATES
========================================================= */

for (const cert of backup.certificates || []) {

  await prisma.certificate.upsert({

    where: {
      id: cert.id,
    },

    update: {},

    create: cert,
  });
}


/* =========================================================
   AWARDS
========================================================= */

for (const award of backup.awards || []) {

  await prisma.award.upsert({

    where: {
      id: award.id,
    },

    update: {},

    create: award,
  });
}

for (const award of backup.studentAwards || []) {

  await prisma.studentAward.upsert({

    where: {
      id: award.id,
    },

    update: {},

    create: award,
  });
}


/* =========================================================
   GALLERY
========================================================= */

for (const album of backup.galleryAlbums || []) {

  await prisma.galleryAlbum.upsert({

    where: {
      id: album.id,
    },

    update: {},

    create: album,
  });
}

for (const image of backup.galleryImages || []) {

  await prisma.galleryImage.upsert({

    where: {
      id: image.id,
    },

    update: {},

    create: image,
  });
}


/* =========================================================
   HOLIDAYS
========================================================= */

for (const holiday of backup.schoolHolidays || []) {

  await prisma.schoolHoliday.upsert({

    where: {
      id: holiday.id,
    },

    update: {},

    create: holiday,
  });
}


/* =========================================================
   STAFF
========================================================= */

for (const staff of backup.staffProfiles || []) {

  await prisma.staffProfile.upsert({

    where: {
      id: staff.id,
    },

    update: {},

    create: staff,
  });
}

for (const salary of backup.teacherMonthlySalaries || []) {

  await prisma.teacherMonthlySalary.upsert({

    where: {
      id: salary.id,
    },

    update: {},

    create: salary,
  });
}


/* =========================================================
   NOTIFICATIONS
========================================================= */

for (const notification of backup.notifications || []) {

  await prisma.notification.upsert({

    where: {
      id: notification.id,
    },

    update: {},

    create: notification,
  });
}
for (const finance of backup.studentLists || []) {

  await prisma.studentList.upsert({

    where: {
      id: finance.id,
    },

    update: {
      deletedAt: null,
    },

    create: finance,
  });
}
      console.log(
        "✅ School restored"
      );

      return true;

    } catch (err) {

      console.log(
        "❌ Restore failed:",
        err.message
      );

      throw err;

    }

};

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});
const streamToString = async (stream) => {

  return await new Promise(
    (resolve, reject) => {

      const chunks = [];

      stream.on("data", (chunk) =>
        chunks.push(chunk)
      );

      stream.on("error", reject);

      stream.on("end", () =>
        resolve(
          Buffer.concat(chunks).toString("utf8")
        )
      );
    }
  );
};
export const listSchoolBackups =
  async () => {

    const command =
      new ListObjectsV2Command({

        Bucket:
          process.env.R2_BUCKET,

        Prefix:
          "CloudBackup/school-backups/",
      });

    const response =
      await r2.send(command);

    const files =
      response.Contents || [];

    const grouped = {};

    files.forEach((file) => {

      const parts =
        file.Key.split("/");

      // CloudBackup/school-backups/{schoolId}/backup.json

      if (parts.length < 4) return;

      const schoolId =
        parts[2];

      if (!grouped[schoolId]) {
        grouped[schoolId] = [];
      }

      grouped[schoolId].push(file);

    });

    const result =
      await Promise.all(

        Object.entries(grouped).map(
          async ([schoolId, backups]) => {

            const latest =
              backups.sort(
                (a, b) =>
                  new Date(b.LastModified) -
                  new Date(a.LastModified)
              )[0];

            const getCommand =
              new GetObjectCommand({

                Bucket:
                  process.env.R2_BUCKET,

                Key: latest.Key,
              });

            const response =
              await r2.send(getCommand);

            const jsonString =
              await streamToString(
                response.Body
              );

            const backup =
              JSON.parse(jsonString);
return {

  id: schoolId,

  schoolId,

  school: backup.school,

  createdAt: latest.LastModified,

  backupsCount: backups.length,

  // CORE
  users: backup.users || [],
  students: backup.students || [],
  parents: backup.parents || [],
  teachers: backup.teachers || [],

  // ATTENDANCE
  attendanceRecords:
    backup.attendanceRecords || [],

  // EXAMS
  assessmentTerms:
    backup.assessmentTerms || [],

  marks:
    backup.marks || [],

  // TIMETABLE
  timetableEntries:
    backup.timetableEntries || [],

  // FEES
  feePayments:
    backup.feePayments || [],

  // GALLERY
  galleryAlbums:
    backup.galleryAlbums || [],

  // EVENTS
  activities:
    backup.activities || [],

  // HOLIDAYS
  schoolHolidays:
    backup.schoolHolidays || [],

  // CERTIFICATES
  certificates:
    backup.certificates || [],

  // NOTIFICATIONS
  notifications:
    backup.notifications || [],

  // SALARIES
  teacherMonthlySalaries:
    backup.teacherMonthlySalaries || [],
};
          }
        )
      );

    return result;
};

export const createFullSchoolBackup =
  async (schoolId) => {

    // =========================
    // LOAD COMPLETE SCHOOL
    // =========================

    const school =
      await prisma.school.findUnique({

        where: {
          id: schoolId,
        },
include: {

  // CORE
  users: true,
  students: true,
  parents: true,
  teacherProfiles: true,
  staffProfiles: true,
  studentLists: true,

  // ACADEMICS
  subjects: true,
  classSections: true,
  academicYears: true,
  studentEnrollments: true,
  teacherAssignments: true,
  classSubjects: true,

  // ATTENDANCE
  attendanceRecords: true,
  teacherAttendances: true,

  // EXAMS
  assessmentTerms: true,
  assessmentGroups: true,
  assessmentSchedules: true,
  marks: true,

  // TIMETABLE
  timetableConfigs: true,
  timetableEntries: true,

  // FEES
  feeStructures: true,
  feeAssignments: true,
  feePayments: true,

  // EVENTS
  activities: true,
  activityEvents: true,
  eventTeams: true,
  eventParticipants: true,

  // GALLERY
  galleryAlbums: {
    include: {
      images: true,
    },
  },

  // HOLIDAYS
  schoolHolidays: true,

  // CERTIFICATES
  certificates: true,

  // TRANSPORT
  transportRoutes: true,

  // EXPENSES
  expenses: true,
},
      });

    if (!school) {
      throw new Error("School not found");
    }

    // =========================
    // CREATE BACKUP JSON
    // =========================

const backupData = {

  school,

  users: school.users || [],
  students: school.students || [],
  parents: school.parents || [],
  teachers: school.teacherProfiles || [],
  staffProfiles: school.staffProfiles || [],
  studentLists: school.studentLists || [],

  subjects: school.subjects || [],
  classSections: school.classSections || [],
  academicYears: school.academicYears || [],

  studentEnrollments:
    school.studentEnrollments || [],

  teacherAssignments:
    school.teacherAssignments || [],

  classSubjects:
    school.classSubjects || [],

  attendanceRecords:
    school.attendanceRecords || [],

  teacherAttendances:
    school.teacherAttendances || [],

  assessmentTerms:
    school.assessmentTerms || [],

  assessmentGroups:
    school.assessmentGroups || [],

  assessmentSchedules:
    school.assessmentSchedules || [],

  marks: school.marks || [],

  timetableConfigs:
    school.timetableConfigs || [],

  timetableEntries:
    school.timetableEntries || [],

  feeStructures:
    school.feeStructures || [],

  feeAssignments:
    school.feeAssignments || [],

  feePayments:
    school.feePayments || [],

  activities:
    school.activities || [],

  activityEvents:
    school.activityEvents || [],

  galleryAlbums:
    school.galleryAlbums || [],

  schoolHolidays:
    school.schoolHolidays || [],

  certificates:
    school.certificates || [],

  transportRoutes:
    school.transportRoutes || [],

  expenses:
    school.expenses || [],
};

    // =========================
    // R2 PATH
    // =========================

    const key =
      `CloudBackup/school-backups/${schoolId}/backup-${Date.now()}.json`;

    // =========================
    // UPLOAD TO R2
    // =========================

    const command =
      new PutObjectCommand({

        Bucket:
          process.env.R2_BUCKET,

        Key: key,

        Body:
          JSON.stringify(
            backupData,
            null,
            2
          ),

        ContentType:
          "application/json",
      });

    await r2.send(command);

    console.log(
      "✅ School backup created:",
      key
    );

    return {
      success: true,
      key,
    };
};