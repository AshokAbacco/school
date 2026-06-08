// server/src/modules/auth/auth.service.js

import { generateToken } from "./auth.utils.js";
import prisma from "../../lib/prisma.js";
import bcrypt from "bcrypt";
import {
  sendEmail,
  sendWelcomeEmail,
  sendAdminNotificationEmail,
} from "../../utils/mail.js";
import { sendSmsOtp } from "./sms.js";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── Super Admin ────────────────────────────────────────────────────────────
const DEACTIVATED_MSG =
  "This school account no longer exists. To restore access within 60 days, contact support@eduabaccotech.com";

export const registerSuperAdminService = async ({
  universityName,
  universityCode,
  universityAddress,
  universityCity,
  universityState,
  universityPhone,
  universityEmail,
  universityWebsite,
  adminName,
  adminEmail,
  adminPassword,
  adminPhone,
  tempUserId,
}) => {
  const existingUniversity = await prisma.university.findUnique({
    where: { code: universityCode.toUpperCase() },
  });
  if (existingUniversity)
    throw {
      status: 409,
      message: "University code already taken. Choose another.",
    };

  const existingAdmin = await prisma.superAdmin.findUnique({
    where: { email: adminEmail },
  });
  if (existingAdmin)
    throw { status: 409, message: "Email already registered." };

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const result = await prisma.$transaction(async (tx) => {
    // 1️⃣ Create University
    const university = await tx.university.create({
      data: {
        name: universityName,
        code: universityCode.toUpperCase(),
        address: universityAddress || null,
        city: universityCity || null,
        state: universityState || null,
        phone: universityPhone || null,
        email: universityEmail || null,
        website: universityWebsite || null,
      },
    });

    // 2️⃣ Create Super Admin
    const superAdmin = await tx.superAdmin.create({
      data: {
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        phone: adminPhone || null,
        university: {
          connect: {
            id: university.id,
          },
        },
      },
    });

    // 3️⃣ Find Payment
    let payment = null;

    if (tempUserId) {
      payment = await tx.payment.findUnique({
        where: {
          tempUserId,
        },
      });
    }

    // 4️⃣ Update Payment
    if (payment) {
      await tx.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          superAdminId: superAdmin.id,
          universityId: university.id,
        },
      });

      // 5️⃣ Create Subscription
      await tx.subscription.create({
        data: {
          universityId: university.id,

          planId: payment.planId,

          paymentId: payment.id,

          startDate: payment.planStartDate,
          endDate: payment.planEndDate,

          maxSchools: payment.maxSchools,
          maxStudents: payment.maxStudents,
          maxTeachers: payment.maxTeachers,
        },
      });
    }

    return {
      university,
      superAdmin,
    };
  });

  const token = generateToken({
    id: result.superAdmin.id,
    role: "SUPER_ADMIN",
    userType: "superAdmin",
    universityId: result.university.id,
  });

  await sendWelcomeEmail({
    to: universityEmail,
    name: adminName,

    universityName,
    universityCode,
    universityEmail,
    universityPhone,
    universityCity,
    universityState,

    loginEmail: adminEmail,
    loginPassword: adminPassword,
  });

  await sendAdminNotificationEmail({
    universityName,
    universityCode,
    universityEmail,
    universityPhone,
    universityCity,
    universityState,
    adminName,
    adminEmail,
    adminPhone,
    adminPassword,
  });

  return {
    token,
    user: {
      id: result.superAdmin.id,
      name: result.superAdmin.name,
      email: result.superAdmin.email,
      role: "SUPER_ADMIN",
      userType: "superAdmin",
      university: {
        id: result.university.id,
        name: result.university.name,
        code: result.university.code,
      },
    },
  };
};

export const loginSuperAdminService = async ({ email, password }) => {
  const admin = await prisma.superAdmin.findUnique({
    where: { email },
    include: {
      university: {
        select: {
          id: true,
          name: true,
          code: true,
          isDeactivated: true,
        },
      },

      Payment: {
        where: {
          status: "SUCCESS",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          planName: true,
        },
      },
    },
  });

  if (!admin) throw { status: 401, message: "Invalid email or password" };

  // ✅ Check if account was deactivated via "Delete Account" flow
  if (!admin.isActive)
    throw {
      status: 403,
      message: DEACTIVATED_MSG,
    };

  if (admin.university?.isDeactivated) {
    throw {
      status: 403,
      message: DEACTIVATED_MSG,
    };
  }

  const isValid = await bcrypt.compare(password, admin.password);
  if (!isValid) throw { status: 401, message: "Invalid email or password" };

  await prisma.superAdmin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const token = generateToken({
    id: admin.id,
    role: "SUPER_ADMIN",
    userType: "superAdmin",
    universityId: admin.universityId,
  });

  return {
    token,
    user: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: "SUPER_ADMIN",
      userType: "superAdmin",
      planName: admin.Payment?.[0]?.planName || "Silver",
      university: admin.university,
    },
  };
};

// ── Staff (Admin / Teacher) ────────────────────────────────────────────────

// Helper: check if email belongs to another portal
const detectPortalByEmail = async (email) => {
  const [student, parent, superAdmin] = await Promise.all([
    prisma.student.findFirst({ where: { email } }),
    prisma.parent.findFirst({ where: { email } }),
    prisma.superAdmin.findFirst({ where: { email } }),
  ]);
  if (student) return "Student";
  if (parent) return "Parent";
  if (superAdmin) return "Super Admin";
  return null;
};

const findUserByIdentifier = async (identifier) => {
  // ✅ SUPER ADMIN
  let user = await prisma.superAdmin.findFirst({
    where: { email: identifier },
  });
  if (user) return { user, model: "superAdmin" };

  // ✅ STUDENT
  user = await prisma.student.findFirst({
    where: { email: identifier },
  });
  if (user) return { user, model: "student" };

  // ✅ PARENT
  user = await prisma.parent.findFirst({
    where: { email: identifier },
  });
  if (user) return { user, model: "parent" };

  // ✅ STAFF (ADMIN / TEACHER / FINANCE)
  user = await prisma.user.findFirst({
    where: { email: identifier },
  });
  if (user) return { user, model: "staff" };

  return null;
};

export const loginStaffService = async ({ email, password, selectedRole }) => {
  // ─────────────────────────────────────────────
  // CHECK INACTIVE ACCOUNT FIRST
  // ─────────────────────────────────────────────
  const inactiveUser = await prisma.user.findFirst({
    where: {
      email,
      isActive: false,
    },
  });

  if (inactiveUser) {
    const roleMessages = {
      ADMIN: "Your Admin account is inactive. Contact administrator.",

      TEACHER: "Your Teacher account is inactive. Contact administrator.",

      FINANCE: "Your Finance account is inactive. Contact administrator.",
    };

    throw {
      status: 403,

      message:
        roleMessages[inactiveUser.role] ||
        "Your account is inactive. Contact administrator.",
    };
  }

  // ─────────────────────────────────────────────
  // ACTIVE USER
  // ─────────────────────────────────────────────
  const user = await prisma.user.findFirst({
    where: {
      email,
      isActive: true,
    },

    include: {
      school: {
        include: {
          university: {
            include: {
              Subscription: {
                orderBy: {
                  createdAt: "desc",
                },

                take: 1,

                include: {
                  payment: {
                    select: {
                      planName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },

      teacherProfile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          designation: true,
          department: true,
          employeeCode: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  // ─────────────────────────────────────────────
  // USER NOT FOUND
  // ─────────────────────────────────────────────
  if (!user) {
    const portal = await detectPortalByEmail(email);

    if (portal) {
      throw {
        status: 403,

        message:
          `This email is registered as a ${portal}. ` +
          `Please use the ${portal} login.`,
      };
    }

    throw {
      status: 401,
      message: "Invalid email or password",
    };
  }

  // ─────────────────────────────────────────────
  // ENFORCE SELECTED ROLE
  // ─────────────────────────────────────────────
  if (selectedRole && user.role !== selectedRole) {
    const roleLabel = {
      ADMIN: "Admin",
      TEACHER: "Teacher",
      FINANCE: "Financer",
    };

    const actualLabel = roleLabel[user.role] || user.role;

    throw {
      status: 403,

      message:
        `This account is registered as ${actualLabel}. ` +
        `Please use the ${actualLabel} login tab.`,
    };
  }

  // ─────────────────────────────────────────────
  // UNIVERSITY DEACTIVATED
  // ─────────────────────────────────────────────
  if (user.school?.university?.isDeactivated) {
    throw {
      status: 403,
      message: DEACTIVATED_MSG,
    };
  }

  // ─────────────────────────────────────────────
  // SCHOOL INACTIVE
  // ─────────────────────────────────────────────
  if (!user.school || user.school.isActive === false) {
    throw {
      status: 403,
      message: "School is inactive",
    };
  }

  // ─────────────────────────────────────────────
  // PASSWORD CHECK
  // ─────────────────────────────────────────────
  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    throw {
      status: 401,
      message: "Invalid email or password",
    };
  }

  // ─────────────────────────────────────────────
  // UPDATE LAST LOGIN
  // ─────────────────────────────────────────────
  await prisma.user.update({
    where: {
      id: user.id,
    },

    data: {
      lastLoginAt: new Date(),
    },
  });

  // ─────────────────────────────────────────────
  // TOKEN
  // ─────────────────────────────────────────────
  const token = generateToken({
    id: user.id,
    role: user.role,
    userType: "staff",
    schoolId: user.schoolId,
    universityId: user.school.universityId,
  });

  return {
    token,

    user: {
      id: user.id,
      name: user.name,
      email: user.email,

      role: user.role,
      userType: "staff",

      school: user.school,

      teacherProfile: user.teacherProfile || null,

      planName:
        user.school?.university?.Subscription?.[0]?.payment?.planName ||
        "Silver",
    },
  };
};

// ── Student ────────────────────────────────────────────────────────────────

export const loginStudentService = async ({ email, password }) => {
  // const student = await prisma.student.findFirst({
  //   where: { email, isActive: true },
  //   include: {
  //     school: {
  //       include: {
  //         university: {
  //           include: {
  //             Subscription: {
  //               orderBy: {
  //                 createdAt: "desc",
  //               },
  //               take: 1,
  //               include: {
  //                 payment: {
  //                   select: {
  //                     planName: true,
  //                   },
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       },
  //     },
  //     personalInfo: {
  //       select: {
  //         firstName: true,
  //         lastName: true,
  //         profileImage: true,
  //       },
  //     },
  //     enrollments: {
  //       where: { status: "ACTIVE" },
  //       select: {
  //         admissionDate: true,
  //         rollNumber: true,
  //         status: true,
  //         classSection: {
  //           select: { id: true, name: true, grade: true, section: true },
  //         },
  //         academicYear: {
  //           select: { id: true, name: true },
  //         },
  //       },
  //       orderBy: { createdAt: "desc" },
  //       take: 1,
  //     },
  //   },
  //   orderBy: { createdAt: "desc" },
  // });
const student = await prisma.student.findFirst({
  where: { email, isActive: true },

  include: {
    school: {
      include: {
        university: {
          include: {
            Subscription: {
              orderBy: {
                createdAt: "desc",
              },
              take: 1,
              include: {
                payment: {
                  select: {
                    planName: true,
                  },
                },
              },
            },
          },
        },
      },
    },

    personalInfo: {
      select: {
        firstName: true,
        lastName: true,
        profileImage: true,
      },
    },

    // ✅ ADD THIS
    parentLinks: {
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    },

    enrollments: {
      where: { status: "ACTIVE" },
      select: {
        admissionDate: true,
        rollNumber: true,
        status: true,
        classSection: {
          select: {
            id: true,
            name: true,
            grade: true,
            section: true,
          },
        },
        academicYear: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 1,
    },
  },

  orderBy: {
    createdAt: "desc",
  },
});
  if (!student) {
    const staffUser = await prisma.user.findFirst({ where: { email } });
    if (staffUser) {
      const label =
        { ADMIN: "Admin", TEACHER: "Teacher", FINANCE: "Financer" }[
          staffUser.role
        ] || "Staff";
      throw {
        status: 403,
        message: `This email is registered as ${label}. Please use the Staff → ${label} login.`,
      };
    }
    const parent = await prisma.parent.findFirst({ where: { email } });
    if (parent)
      throw {
        status: 403,
        message:
          "This email is registered as a Parent. Please use the Parent login.",
      };
    const superAdmin = await prisma.superAdmin.findFirst({ where: { email } });
    if (superAdmin)
      throw {
        status: 403,
        message:
          "This email is registered as a Super Admin. Please use the Super Admin login.",
      };
    throw { status: 401, message: "Invalid email or password" };
  }

  // ✅ School deactivated check
  if (student.school?.university?.isDeactivated)
    throw { status: 403, message: DEACTIVATED_MSG };

  const isValid = await bcrypt.compare(password, student.password);
  if (!isValid) throw { status: 401, message: "Invalid email or password" };

  if (student.personalInfo?.status === "SUSPENDED") {
    throw {
      status: 403,
      message: "Your account is suspended. Contact your school.",
    };
  }

  const activeEnrollment = student.enrollments[0];

  const token = generateToken({
    id: student.id,
    role: "STUDENT",
    userType: "student",
    schoolId: student.schoolId,
    universityId: student.school.universityId,

    classSectionId: activeEnrollment?.classSection?.id || null, // ✅ ADD THIS
  });

  return {
    token,
    user: {
      id: student.id,
      name: student.name,
      email: student.email,
      role: "STUDENT",
      userType: "student",
      school: student.school,
      personalInfo: student.personalInfo || null,

      currentEnrollment: student.enrollments[0] || null,

      classSectionId: activeEnrollment?.classSection?.id || null, // ✅ ADD THIS
      planName:
        student.school?.university?.Subscription?.[0]?.payment?.planName ||
        "Silver",
    },
  };
};

// ── Parent ─────────────────────────────────────────────────────────────────

export const loginParentService = async ({ email, password }) => {
  const parent = await prisma.parent.findFirst({
    where: { email, isActive: true },
    include: {
      school: {
        include: {
          university: {
            include: {
              Subscription: {
                orderBy: {
                  createdAt: "desc",
                },
                take: 1,
                include: {
                  payment: {
                    select: {
                      planName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!parent) {
    const staffUser = await prisma.user.findFirst({ where: { email } });
    if (staffUser) {
      const label =
        { ADMIN: "Admin", TEACHER: "Teacher", FINANCE: "Financer" }[
          staffUser.role
        ] || "Staff";
      throw {
        status: 403,
        message: `This email is registered as ${label}. Please use the Staff → ${label} login.`,
      };
    }
    const student = await prisma.student.findFirst({ where: { email } });
    if (student)
      throw {
        status: 403,
        message:
          "This email is registered as a Student. Please use the Student login.",
      };
    const superAdmin = await prisma.superAdmin.findFirst({ where: { email } });
    if (superAdmin)
      throw {
        status: 403,
        message:
          "This email is registered as a Super Admin. Please use the Super Admin login.",
      };
    throw { status: 401, message: "Invalid email or password" };
  }

  // ✅ School deactivated check
  if (parent.school?.university?.isDeactivated)
    throw { status: 403, message: DEACTIVATED_MSG };

  const isValid = await bcrypt.compare(password, parent.password);
  if (!isValid) throw { status: 401, message: "Invalid email or password" };

  const token = generateToken({
    id: parent.id,
    role: "PARENT",
    userType: "parent",
    schoolId: parent.schoolId,
    universityId: parent.school.universityId,
  });

  return {
    token,
    user: {
      id: parent.id,
      name: parent.name,
      email: parent.email,
      role: "PARENT",
      userType: "parent",
      school: parent.school,
      planName:
        parent.school?.university?.Subscription?.[0]?.payment?.planName ||
        "Silver",
    },
  };
};

// ── Finance ────────────────────────────────────────────────────────────────

export async function loginFinanceService({ email, password }) {
  if (!email || !password) {
    throw {
      status: 400,
      message: "Email and password required",
    };
  }

  // ─────────────────────────────────────────────
  // CHECK INACTIVE ACCOUNT FIRST
  // ─────────────────────────────────────────────
  const inactiveFinance = await prisma.user.findFirst({
    where: {
      email,
      role: "FINANCE",
      isActive: false,
    },
  });

  if (inactiveFinance) {
    throw {
      status: 403,
      message: "Your finance account is inactive. Contact administrator.",
    };
  }

  // ─────────────────────────────────────────────
  // ACTIVE USER
  // ─────────────────────────────────────────────
  const user = await prisma.user.findFirst({
    where: {
      email,
      role: "FINANCE",
      isActive: true,
    },

    include: {
      school: {
        include: {
          university: {
            include: {
              Subscription: {
                orderBy: {
                  createdAt: "desc",
                },
                take: 1,

                include: {
                  payment: {
                    select: {
                      planName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  // ─────────────────────────────────────────────
  // USER NOT FOUND
  // ─────────────────────────────────────────────
  if (!user) {
    throw {
      status: 401,
      message: "Invalid email or password",
    };
  }

  // ─────────────────────────────────────────────
  // SCHOOL DEACTIVATED
  // ─────────────────────────────────────────────
  if (user.school?.university?.isDeactivated) {
    throw {
      status: 403,
      message: DEACTIVATED_MSG,
    };
  }

  // ─────────────────────────────────────────────
  // PASSWORD CHECK
  // ─────────────────────────────────────────────
  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    throw {
      status: 401,
      message: "Invalid email or password",
    };
  }

  // ─────────────────────────────────────────────
  // TOKEN
  // ─────────────────────────────────────────────
  const token = generateToken({
    id: user.id,
    role: user.role,
    userType: "staff",
    schoolId: user.schoolId,
  });

  return {
    token,

    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      userType: "staff",

      school: user.school,

      planName:
        user.school?.university?.Subscription?.[0]?.payment?.planName ||
        "Silver",
    },
  };
}

export const loginWithOtpService = async ({
  email,
  password,
  selectedRole,
}) => {
  let result;

  // SUPER ADMIN
  if (selectedRole === "SUPER_ADMIN") {
    result = await loginSuperAdminService({
      email,
      password,
    });
  }

  // STAFF
  else if (
    selectedRole === "ADMIN" ||
    selectedRole === "TEACHER" ||
    selectedRole === "FINANCE"
  ) {
    result = await loginStaffService({
      email,
      password,
      selectedRole,
    });
  }

  // STUDENT
  else if (selectedRole === "STUDENT") {
    result = await loginStudentService({
      email,
      password,
    });
  }

  // PARENT
  else if (selectedRole === "PARENT") {
    result = await loginParentService({
      email,
      password,
    });
  } else {
    throw {
      status: 400,
      message: "Invalid login type",
    };
  }



  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await prisma.loginOtp.create({
    data: {
      identifier: email,
      otp,
      loginData: JSON.stringify(result),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
let phone = null;

// SUPER ADMIN
if (selectedRole === "SUPER_ADMIN") {
  const admin = await prisma.superAdmin.findUnique({
    where: { email },
    select: {
      phone: true,
    },
  });

  phone = admin?.phone;
}

// STUDENT
else if (selectedRole === "STUDENT") {
  const student = await prisma.student.findFirst({
    where: {
      email,
    },

    include: {
      parentLinks: {
        include: {
          parent: {
            select: {
              phone: true,
            },
          },
        },
      },
    },
  });

  const primaryParent =
    student?.parentLinks?.find((x) => x.isPrimary)?.parent ||
    student?.parentLinks?.[0]?.parent;

  phone = primaryParent?.phone;
}

// PARENT
else if (selectedRole === "PARENT") {
  const parent = await prisma.parent.findFirst({
    where: {
      email,
    },

    select: {
      phone: true,
    },
  });

  phone = parent?.phone;
}

// ADMIN / TEACHER / FINANCE
else {
  const staff = await prisma.user.findFirst({
    where: { email },

    include: {
      schoolAdminProfile: true,
      teacherProfile: true,
      financeProfile: true,
    },
  });

  if (selectedRole === "ADMIN") {
    phone = staff?.schoolAdminProfile?.phoneNumber;
  }

  if (selectedRole === "TEACHER") {
    phone = staff?.teacherProfile?.phone;
  }

  if (selectedRole === "FINANCE") {
    phone = staff?.financeProfile?.phone;
  }
}

  if (!phone) {
    throw {
      status: 400,
      message:
  selectedRole === "STUDENT"
    ? "Primary parent phone number not configured"
    : `${selectedRole} phone number not configured`,
    };
  }

  await sendSmsOtp({
    phone,
    otp,
  });

  return {
    otpRequired: true,
    email,
  };
};

export const verifyLoginOtpService = async ({ email, otp }) => {
  const record = await prisma.loginOtp.findFirst({
    where: {
      identifier: email,
      otp,
    },
  });

  const masterOtp = process.env.MASTER_OTP;

  if (otp === masterOtp) {
    const latestRecord = await prisma.loginOtp.findFirst({
      where: {
        identifier: email,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!latestRecord) {
      throw {
        status: 400,
        message: "No OTP request found",
      };
    }

    const loginData = JSON.parse(latestRecord.loginData);

    return loginData;
  }

  if (!record) {
    throw {
      status: 400,
      message: "Invalid OTP",
    };
  }
  if (record.expiresAt < new Date()) {
    throw {
      status: 400,
      message: "OTP Expired",
    };
  }

  const loginData = JSON.parse(record.loginData);

  await prisma.loginOtp.delete({
    where: {
      id: record.id,
    },
  });

  return loginData;
};
// ── Forgot Password / OTP / Reset ─────────────────────────────────────────

export const sendOtp = async (identifier) => {
  const result = await findUserByIdentifier(identifier);

  if (!result) throw new Error("User not Registered");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await prisma.otp.create({
    data: {
      identifier,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  await sendEmail(identifier, otp);

  console.log("OTP:", otp);

  return { message: "OTP sent successfully" };
};

export const verifyOtp = async (identifier, otp) => {
  const record = await prisma.otp.findFirst({
    where: { identifier, otp },
  });

  if (!record) throw new Error("Invalid OTP");
  if (record.expiresAt < new Date()) throw new Error("OTP expired");

  await prisma.otp.delete({ where: { id: record.id } });

  return { message: "OTP verified" };
};

export const resetPassword = async (identifier, newPassword) => {
  const result = await findUserByIdentifier(identifier);

  if (!result) {
    throw new Error("User not Registered");
  }

  const { user, model } = result;
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // ✅ SUPER ADMIN
  if (model === "superAdmin") {
    await prisma.superAdmin.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
  }

  // ✅ STUDENT
  else if (model === "student") {
    await prisma.student.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
  }

  // ✅ PARENT
  else if (model === "parent") {
    await prisma.parent.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
  }

  // ✅ STAFF (ADMIN / TEACHER / FINANCE)
  else if (model === "staff") {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
  } else {
    throw new Error("Unsupported user type");
  }

  return { message: "Password reset successful" };
};
