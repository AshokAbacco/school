// server/src/modules/auth/auth.service.js

import { generateToken } from "./auth.utils.js";
import prisma from "../../lib/prisma.js";
import bcrypt from "bcrypt";
import { sendEmail , sendWelcomeEmail, sendAdminNotificationEmail  } from "../../utils/mail.js";

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
          connect: { id: university.id },
        },
      },
    });

    // 🔥 FIXED: use local variables (NOT result)
    if (tempUserId) {
      await tx.payment.updateMany({
        where: {
          tempUserId,
          superAdminId: null,
        },
        data: {
          superAdminId: superAdmin.id,
          universityId: university.id,
        },
      });
    }

    return { university, superAdmin };
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
    where: { email: identifier }
  });
  if (user) return { user, model: "superAdmin" };

  // ✅ STUDENT
  user = await prisma.student.findFirst({
    where: { email: identifier }
  });
  if (user) return { user, model: "student" };

  // ✅ PARENT
  user = await prisma.parent.findFirst({
    where: { email: identifier }
  });
  if (user) return { user, model: "parent" };

  // ✅ STAFF (ADMIN / TEACHER / FINANCE)
  user = await prisma.user.findFirst({
    where: { email: identifier }
  });
  if (user) return { user, model: "staff" };

  return null;
};

export const loginStaffService = async ({ email, password, selectedRole }) => {
  const user = await prisma.user.findFirst({
    where: { email, isActive: true },
    include: {
      school: {
        include: {
          university: {
            select: {
              id: true,
              isDeactivated: true,
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
    orderBy: { createdAt: "desc" },
  });

  if (!user) {
    const portal = await detectPortalByEmail(email);
    if (portal)
      throw {
        status: 403,
        message: `This email is registered as a ${portal}. Please use the ${portal} login.`,
      };
    throw { status: 401, message: "Invalid email or password" };
  }

  // Enforce selected role
  if (selectedRole && user.role !== selectedRole) {
    const roleLabel = { ADMIN: "Admin", TEACHER: "Teacher", FINANCE: "Financer" };
    const actualLabel = roleLabel[user.role] || user.role;
    throw {
      status: 403,
      message: `This account is registered as ${actualLabel}. Please use the ${actualLabel} login tab.`,
    };
  }

  // ✅ School deactivated check (before isActive check so message is clear)
 if (user.school?.university?.isDeactivated)
    throw { status: 403, message: DEACTIVATED_MSG };

  if (!user.school || user.school.isActive === false)
    throw { status: 403, message: "School is inactive" };

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) throw { status: 401, message: "Invalid email or password" };

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

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
    },
  };
};

// ── Student ────────────────────────────────────────────────────────────────

export const loginStudentService = async ({ email, password }) => {
  const student = await prisma.student.findFirst({
    where: { email, isActive: true },
    include: {
    school: {
      include: {
        university: {
          select: {
            id: true,
            isDeactivated: true,
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
      enrollments: {
        where: { status: "ACTIVE" },
        select: {
          admissionDate: true,
          rollNumber: true,
          status: true,
          classSection: {
            select: { id: true, name: true, grade: true, section: true },
          },
          academicYear: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!student) {
    const staffUser = await prisma.user.findFirst({ where: { email } });
    if (staffUser) {
      const label =
        { ADMIN: "Admin", TEACHER: "Teacher", FINANCE: "Financer" }[staffUser.role] || "Staff";
      throw {
        status: 403,
        message: `This email is registered as ${label}. Please use the Staff → ${label} login.`,
      };
    }
    const parent = await prisma.parent.findFirst({ where: { email } });
    if (parent)
      throw {
        status: 403,
        message: "This email is registered as a Parent. Please use the Parent login.",
      };
    const superAdmin = await prisma.superAdmin.findFirst({ where: { email } });
    if (superAdmin)
      throw {
        status: 403,
        message: "This email is registered as a Super Admin. Please use the Super Admin login.",
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
          select: {
            id: true,
            isDeactivated: true,
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
        { ADMIN: "Admin", TEACHER: "Teacher", FINANCE: "Financer" }[staffUser.role] || "Staff";
      throw {
        status: 403,
        message: `This email is registered as ${label}. Please use the Staff → ${label} login.`,
      };
    }
    const student = await prisma.student.findFirst({ where: { email } });
    if (student)
      throw {
        status: 403,
        message: "This email is registered as a Student. Please use the Student login.",
      };
    const superAdmin = await prisma.superAdmin.findFirst({ where: { email } });
    if (superAdmin)
      throw {
        status: 403,
        message: "This email is registered as a Super Admin. Please use the Super Admin login.",
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
    },
  };
};

// ── Finance ────────────────────────────────────────────────────────────────

export async function loginFinanceService({ email, password }) {
  if (!email || !password) {
    throw { status: 400, message: "Email and password required" };
  }

  const user = await prisma.user.findFirst({
    where: { email, role: "FINANCE" },
    include: {
      school: {
        include: {
          university: {
            select: {
              id: true,
              isDeactivated: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    const student = await prisma.student.findFirst({ where: { email } });
    if (student)
      throw {
        status: 403,
        message: "This email is registered as a Student. Please use the Student login.",
      };
    const parent = await prisma.parent.findFirst({ where: { email } });
    if (parent)
      throw {
        status: 403,
        message: "This email is registered as a Parent. Please use the Parent login.",
      };
    const otherStaff = await prisma.user.findFirst({ where: { email } });
    if (otherStaff) {
      const label = { ADMIN: "Admin", TEACHER: "Teacher" }[otherStaff.role] || "Staff";
      throw {
        status: 403,
        message: `This email is registered as ${label}. Please use the Staff → ${label} login.`,
      };
    }
    throw { status: 401, message: "Invalid email or password" };
  }

  // ✅ School deactivated check
 if (user.school?.university?.isDeactivated)
    throw { status: 403, message: DEACTIVATED_MSG };

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw { status: 401, message: "Invalid email or password" };

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
    },
  };
}

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