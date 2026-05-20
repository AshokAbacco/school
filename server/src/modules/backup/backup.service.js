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

  try {

    if (!prisma[model]) {
      throw new Error(`Invalid model: ${model}`);
    }

    console.log("RESTORE REQUEST:", {
      model,
      recordId,
      type: typeof recordId,
    });

    // =========================
    // STAFF RESTORE
    // =========================

    if (model === "staffProfile") {

      const restoredStaff =
        await prisma.staffProfile.update({

          where: {
            id: recordId,
          },

          data: {
            deletedAt: null,
            status: "ACTIVE",
          },
        });

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
    // NORMAL RESTORE
    // =========================

    const restoredRecord =
      await prisma[model].update({

        where: {
          id: recordId,
        },

        data: {
          deletedAt: null,
        },
      });

    return restoredRecord;

  } catch (error) {

    console.log("❌ RESTORE ERROR:", error);

    throw error;
  }
};
/* =========================================================
   LIST SCHOOL BACKUPS
========================================================= */



/* =========================================================
   RESTORE ENTIRE SCHOOL
========================================================= */

export const restoreEntireSchool =
  async (schoolId, superAdminId) => {

    try {

      // ====================================
      // FIND LATEST BACKUP
      // ====================================

    const listCommand =
  new ListObjectsV2Command({
    Bucket: process.env.R2_BUCKET,
  Prefix:
`CloudBackup/super-admins/${superAdminId}/schools/${schoolId}/`,
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
if (!backup || !backup.school) {
  throw new Error("Invalid backup data");
}
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
   FINANCE PROFILE RESTORE
========================================================= */

for (const finance of backup.financeProfiles || []) {

  // RESTORE USER FIRST
  if (finance.userId) {

    const financeUser =
      backup.users?.find(
        (u) => u.id === finance.userId
      );

    if (financeUser) {

      await prisma.user.upsert({

        where: {
          id: financeUser.id,
        },

        update: {
          deletedAt: null,
          isActive: true,
        },

        create: {
          ...financeUser,
          deletedAt: null,
          isActive: true,
        },
      });
    }
  }

  // RESTORE FINANCE PROFILE
  await prisma.financeProfile.upsert({

    where: {
      id: finance.id,
    },

    update: {
      deletedAt: null,
    },

    create: {
      ...finance,
      deletedAt: null,
    },
  });
}
/* =========================================================
   USERS
========================================================= */

 
/* =========================================================
   USERS RESTORE
========================================================= */

for (const user of backup.users || []) {

  await prisma.user.upsert({

    where: {
      id: user.id,
    },

    update: {
      deletedAt: null,
      isActive: true,
    },

    create: {
      ...user,
      deletedAt: null,
      isActive: true,
    },
  });
}
 


/* =========================================================
   SCHOOL ADMINS
========================================================= */

 /* =========================================================
   SCHOOL ADMINS
========================================================= */

for (const admin of backup.schoolAdminProfiles || []) {

  // restore linked user first
  if (admin.userId) {

    const adminUser =
      backup.users?.find(
        (u) => u.id === admin.userId
      );

    if (adminUser) {

      await prisma.user.upsert({

        where: {
          id: adminUser.id,
        },

        update: {
          deletedAt: null,
          isActive: true,
        },

        create: {
          ...adminUser,
          deletedAt: null,
          isActive: true,
        },
      });
    }
  }

  // restore school admin profile
  await prisma.schoolAdminProfile.upsert({

    where: {
      id: admin.id,
    },

    update: {},

    create: {
      id: admin.id,
      userId: admin.userId,
      schoolId: admin.schoolId,
      adminName: admin.adminName,
      email: admin.email,
      phoneNumber: admin.phoneNumber,
      address: admin.address,
      employeeId: admin.employeeId,
      designation: admin.designation,
      basicSalary: admin.basicSalary,
      bankName: admin.bankName,
      accountNumber: admin.accountNumber,
      ifscCode: admin.ifscCode,
      panNumber: admin.panNumber,
      aadharNumber: admin.aadharNumber,
      photoUrl: admin.photoUrl,
      panDocumentUrl: admin.panDocumentUrl,
      aadharDocumentUrl: admin.aadharDocumentUrl,
      joiningDate: admin.joiningDate,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt,
    },
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

 
    update: {},
 


    create: parent,
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

    update: {},

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

   update: {},

    create: {
  id: student.id,
  name: student.name,
  email: student.email,
  password: student.password,
  schoolId: student.schoolId,
  deletedAt: null,
},
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
  async (superAdminId) => {

    const schools =
  await prisma.school.findMany({

    where: {
      superAdminId,

    
    },

    select: {
      id: true,
      name: true,
      code: true,
      type: true,
    },
  });

    const backups = [];

  for (const school of schools) {

  const command =
    new ListObjectsV2Command({

      Bucket: process.env.R2_BUCKET,

      Prefix:
`CloudBackup/super-admins/${superAdminId}/schools/${school.id}/`,
    });

  const response =
    await r2.send(command);

  const files =
    response.Contents || [];

  const latest =
    files.length > 0
      ? files.sort(
          (a, b) =>
            new Date(b.LastModified) -
            new Date(a.LastModified)
        )[0]
      : null;

  backups.push({
    schoolId: school.id,

    school: {
      name: school.name,
      code: school.code,
      type: school.type,
      deletedAt: school.deletedAt,
    },

    hasBackup: files.length > 0,

    createdAt:
      latest?.LastModified || null,
  });
}

    return backups;
};

export const createFullSchoolBackup = async (schoolId) => {

  // =========================
  // VALIDATE SCHOOL
  // =========================

  const school = await prisma.school.findUnique({
    where: {
      id: schoolId,
    },
  });

  if (!school) {
    throw new Error("School not found");
  }
console.log("SCHOOL:", school);
console.log("SUPER ADMIN ID:", school.superAdminId);

if (!school.superAdminId) {
  throw new Error(
    `School ${school.name} has no superAdminId`
  );
}
  // =========================
  // CORE DATA
  // =========================

  const [
    users,
    students,
    parents,
    teachers,
    staffProfiles,
    studentLists,

    // ACADEMICS
    subjects,
    classSections,
    academicYears,
    classSectionAcademicYears,
    streams,
    streamCombinations,
    courses,
    courseBranches,

    // ENROLLMENTS
    studentEnrollments,
    classSubjects,
    teacherAssignments,

    // ATTENDANCE
    attendanceRecords,
    teacherAttendances,

    // EXAMS
    assessmentTerms,
    assessmentGroups,
    assessmentSchedules,
    marks,
    resultSummaries,

    // TIMETABLE
    timetableConfigs,
    periodDefinitions,
    timetableEntries,

    // SYLLABUS
    subjectSyllabus,
    sectionPortionProgress,

    // EVENTS
    activities,
    activityClasses,
    activityEvents,
    eventClasses,
    eventTeams,
    eventTeamMembers,
    eventParticipants,
    eventResults,

    // AWARDS
    awards,
    studentAwards,
    certificates,

    // GALLERY
    galleryAlbums,

    // HOLIDAYS
    holidays,

    // LIVE CLASSES
    liveClasses,
    liveClassSections,
    liveClassAttendance,

    // ASSIGNMENTS
    assignments,
    assignmentSections,

    // TRANSPORT
    transportRoutes,
    transportStops,
    studentTransports,
    transportFeePlans,

    // FEES
    classFees,
    studentFinance,

    // MEETINGS
    meetings,
    meetingParticipants,
    meetingClasses,
    meetingStudents,

    // EXTRA CLASSES
    extraClasses,

    // FINANCE
    financeProfiles,
    schoolAdminProfiles,
    financeMonthlySalary,
    adminMonthlySalary,

    // STAFF SALARIES
    groupBStaffSalary,
    groupCStaffSalary,
    groupDStaffSalary,
    
  ] = await Promise.all([

    // =========================
    // CORE
    // =========================

    prisma.user.findMany({
      where: { schoolId },
    }),

    prisma.student.findMany({
      where: { schoolId },
    }),

    prisma.parent.findMany({
      where: { schoolId },
    }),

    prisma.teacherProfile.findMany({
      where: { schoolId },
    }),

    prisma.staffProfile.findMany({
      where: { schoolId },
    }),

    prisma.studentList.findMany({
      where: { schoolId },
    }),

    // =========================
    // ACADEMICS
    // =========================

    prisma.subject.findMany({
      where: { schoolId },
    }),

    prisma.classSection.findMany({
      where: { schoolId },
    }),

    prisma.academicYear.findMany({
      where: { schoolId },
    }),

    prisma.classSectionAcademicYear.findMany({
      where: {
        classSection: {
          schoolId,
        },
      },
    }),

    prisma.stream.findMany({
      where: { schoolId },
    }),

    prisma.streamCombination.findMany({
      where: {
        stream: {
          schoolId,
        },
      },
    }),

    prisma.course.findMany({
      where: { schoolId },
    }),

    prisma.courseBranch.findMany({
      where: {
        course: {
          schoolId,
        },
      },
    }),

    // =========================
    // ENROLLMENTS
    // =========================

    prisma.studentEnrollment.findMany({
      where: {
        student: {
          schoolId,
        },
      },
    }),

    prisma.classSubject.findMany({
      where: {
        classSection: {
          schoolId,
        },
      },
    }),

    prisma.teacherAssignment.findMany({
      where: {
        classSection: {
          schoolId,
        },
      },
    }),

    // =========================
    // ATTENDANCE
    // =========================

    prisma.attendanceRecord.findMany({
      where: {
        classSection: {
          schoolId,
        },
      },
    }),

    prisma.teacherAttendance.findMany({
      where: {
        schoolId,
      },
    }),

    // =========================
    // EXAMS
    // =========================

    prisma.assessmentTerm.findMany({
      where: {
        schoolId,
      },
    }),

    prisma.assessmentGroup.findMany({
      where: {
        schoolId,
      },
    }),

    prisma.assessmentSchedule.findMany({
      where: {
        classSection: {
          schoolId,
        },
      },
    }),

    prisma.marks.findMany({
      where: {
        student: {
          schoolId,
        },
      },
    }),

    prisma.resultSummary.findMany({
      where: {
        student: {
          schoolId,
        },
      },
    }),

    // =========================
    // TIMETABLE
    // =========================

    prisma.timetableConfig.findMany({
      where: {
        schoolId,
      },
    }),

    prisma.periodDefinition.findMany({
      where: {
        config: {
          schoolId,
        },
      },
    }),

    prisma.timetableEntry.findMany({
      where: {
        schoolId,
      },
    }),

    // =========================
    // SYLLABUS
    // =========================

    prisma.subjectSyllabus.findMany({
      where: {
        schoolId,
      },
    }),

    prisma.sectionPortionProgress.findMany({
      where: {
        schoolId,
      },
    }),

    // =========================
    // EVENTS
    // =========================

    prisma.activity.findMany({
      where: {
        schoolId,
      },
    }),

    prisma.activityClass.findMany({
      where: {
        activity: {
          schoolId,
        },
      },
    }),

    prisma.activityEvent.findMany({
      where: {
        schoolId,
      },
    }),

    prisma.eventClass.findMany({
      where: {
        event: {
          schoolId,
        },
      },
    }),

    prisma.eventTeam.findMany({
      where: {
        event: {
          schoolId,
        },
      },
    }),

    prisma.eventTeamMember.findMany({
      where: {
        team: {
          event: {
            schoolId,
          },
        },
      },
    }),

    prisma.eventParticipant.findMany({
      where: {
        event: {
          schoolId,
        },
      },
    }),

    prisma.eventResult.findMany({
      where: {
        event: {
          schoolId,
        },
      },
    }),

    // =========================
    // AWARDS
    // =========================

    prisma.award.findMany({
      where: {
        schoolId,
      },
    }),

    prisma.studentAward.findMany({
      where: {
        student: {
          schoolId,
        },
      },
    }),

    prisma.certificate.findMany({
      where: {
        student: {
          schoolId,
        },
      },
    }),

    // =========================
    // GALLERY
    // =========================

    prisma.galleryAlbum.findMany({
      where: {
        schoolId,
      },
      include: {
        images: true,
      },
    }),

    // =========================
    // HOLIDAYS
    // =========================

    prisma.schoolHoliday.findMany({
      where: {
        schoolId,
      },
    }),

    // =========================
    // LIVE CLASSES
    // =========================

    prisma.liveClass.findMany({
      where: {
        schoolId,
      },
    }),

    prisma.liveClassSection.findMany({
      where: {
        liveClass: {
          schoolId,
        },
      },
    }),

    prisma.liveClassAttendance.findMany({
      where: {
        student: {
          schoolId,
        },
      },
    }),

    // =========================
    // ASSIGNMENTS
    // =========================

    prisma.assignment.findMany({
      where: {
        schoolId,
      },
    }),

    prisma.assignmentSection.findMany({
      where: {
        assignment: {
          schoolId,
        },
      },
    }),

    // =========================
    // TRANSPORT
    // =========================

    prisma.transportRoute.findMany({
      where: {
        schoolId,
      },
    }),

    prisma.transportStop.findMany({
      where: {
        schoolId,
      },
    }),

    prisma.studentTransport.findMany({
      where: {
        schoolId,
      },
    }),

    prisma.transportFeePlan.findMany({
      where: {
        schoolId,
      },
    }),

    // =========================
    // FEES
    // =========================

    prisma.classFee.findMany({
      where: {
        schoolId,
      },
    }),

    prisma.studentFinance.findMany({
      where: {
        schoolId,
      },
    }),

    // =========================
    // MEETINGS
    // =========================

    prisma.meeting.findMany({
      where: {
        schoolId,
      },
    }),

    prisma.meetingParticipant.findMany(),

    prisma.meetingClass.findMany(),

    prisma.meetingStudent.findMany(),

    // =========================
    // EXTRA CLASSES
    // =========================

    prisma.extraClass.findMany({
      where: {
        schoolId,
      },
    }),

    // =========================
    // FINANCE
    // =========================

    prisma.financeProfile.findMany({
      where: {
        schoolId,
      },
    }),

    prisma.schoolAdminProfile.findMany({
      where: {
        schoolId,
      },
    }),

    prisma.financeMonthlySalary.findMany({
      where: {
        schoolId,
      },
    }),

    prisma.adminMonthlySalary.findMany({
      where: {
        schoolId,
      },
    }),

    // =========================
    // STAFF SALARY
    // =========================

    prisma.groupBStaffSalary.findMany({
      where: {
        schoolId,
      },
    }),

    prisma.groupCStaffSalary.findMany({
      where: {
        schoolId,
      },
    }),

    prisma.groupDStaffSalary.findMany({
      where: {
        schoolId,
      },
    }),

  ]);

  // =========================
  // BACKUP JSON
  // =========================

  const backupData = {

    metadata: {
      backupType: "FULL_SCHOOL_BACKUP",
      schoolId,
      schoolName: school.name,
      createdAt: new Date(),
      version: "2.0.0",
    },

    school,

    users,
    students,
    parents,
    teachers,
    staffProfiles,
    studentLists,

    subjects,
    classSections,
    academicYears,
    classSectionAcademicYears,

    streams,
    streamCombinations,
    courses,
    courseBranches,

    studentEnrollments,
    classSubjects,
    teacherAssignments,

    attendanceRecords,
    teacherAttendances,

    assessmentTerms,
    assessmentGroups,
    assessmentSchedules,
    marks,
    resultSummaries,

    timetableConfigs,
    periodDefinitions,
    timetableEntries,

    subjectSyllabus,
    sectionPortionProgress,

    activities,
    activityClasses,
    activityEvents,
    eventClasses,
    eventTeams,
    eventTeamMembers,
    eventParticipants,
    eventResults,

    awards,
    studentAwards,
    certificates,

    galleryAlbums,

    holidays,

    liveClasses,
    liveClassSections,
    liveClassAttendance,

    assignments,
    assignmentSections,

    transportRoutes,
    transportStops,
    studentTransports,
    transportFeePlans,

    classFees,
    studentFinance,

    meetings,
    meetingParticipants,
    meetingClasses,
    meetingStudents,

    extraClasses,

    financeProfiles,
    schoolAdminProfiles,
    financeMonthlySalary,
    adminMonthlySalary,

    groupBStaffSalary,
    groupCStaffSalary,
    groupDStaffSalary,
  };

  // =========================
  // R2 PATH
  // =========================



const key =
`CloudBackup/super-admins/${school.superAdminId}/schools/${schoolId}/backup-${Date.now()}.json`;

  // =========================
  // UPLOAD
  // =========================

  const command = new PutObjectCommand({

    Bucket: process.env.R2_BUCKET,

    Key: key,

    Body: JSON.stringify(
      backupData,
      null,
      2
    ),

    ContentType:
      "application/json",

  });

  await r2.send(command);

  console.log(
    "✅ Full school backup created:",
    key
  );

  return {
    success: true,
    key,
  };

};