// server/src/modules/auth/auth.service.js

import { generateToken } from "./auth.utils.js";
import prisma from "../../lib/prisma.js";
import bcrypt from "bcrypt";

// ── Super Admin ────────────────────────────────────────────────────────────

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
    const superAdmin = await tx.superAdmin.create({
      data: {
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        phone: adminPhone || null,
        universityId: university.id,
      },
    });
    return { university, superAdmin };
  });

  const token = generateToken({
    id: result.superAdmin.id,
    role: "SUPER_ADMIN",
    userType: "superAdmin",
    universityId: result.university.id,
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
    include: { university: { select: { id: true, name: true, code: true } } },
  });

  if (!admin) throw { status: 401, message: "Invalid email or password" };
  if (!admin.isActive) throw { status: 403, message: "Account deactivated" };

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

export const loginStaffService = async ({ email, password, selectedRole }) => {
  const user = await prisma.user.findFirst({
    where: { email, isActive: true },
    include: {
      school: {
        select: {
          id: true,
          name: true,
          code: true,
          type: true,
          universityId: true,
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
    // Check if this email exists in another portal
    const portal = await detectPortalByEmail(email);
    if (portal) throw { status: 403, message: `This email is registered as a ${portal}. Please use the ${portal} login.` };
    throw { status: 401, message: "Invalid email or password" };
  }

  // Enforce selected role — e.g. teacher can't login via Admin tab
  if (selectedRole && user.role !== selectedRole) {
    const roleLabel = { ADMIN: "Admin", TEACHER: "Teacher", FINANCE: "Financer" };
    const actualLabel = roleLabel[user.role] || user.role;
    const selectedLabel = roleLabel[selectedRole] || selectedRole;
    throw { status: 403, message: `This account is registered as ${actualLabel}. Please use the ${actualLabel} login tab.` };
  }

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
// ✅ Removed grade/className from personalInfo select — not on schema anymore
// ✅ Returns active enrollment with classSection so frontend gets class info

export const loginStudentService = async ({ email, password }) => {
  // 1️⃣ Find student using the email from request
  const student = await prisma.student.findFirst({
    where: {
      email,
      isActive: true,
    },
    include: {
      school: {
        select: {
          id: true,
          name: true,
          code: true,
          type: true,
          universityId: true,
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
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 2️⃣ Student not found — check other portals
  if (!student) {
    const staffUser = await prisma.user.findFirst({ where: { email } });
    if (staffUser) {
      const label = { ADMIN: "Admin", TEACHER: "Teacher", FINANCE: "Financer" }[staffUser.role] || "Staff";
      throw { status: 403, message: `This email is registered as ${label}. Please use the Staff → ${label} login.` };
    }
    const parent = await prisma.parent.findFirst({ where: { email } });
    if (parent) throw { status: 403, message: "This email is registered as a Parent. Please use the Parent login." };
    const superAdmin = await prisma.superAdmin.findFirst({ where: { email } });
    if (superAdmin) throw { status: 403, message: "This email is registered as a Super Admin. Please use the Super Admin login." };
    throw { status: 401, message: "Invalid email or password" };
  }

  // 3️⃣ Password validation
  const isValid = await bcrypt.compare(password, student.password);

  if (!isValid) {
    throw { status: 401, message: "Invalid email or password" };
  }

  // 4️⃣ Account status check
  if (student.personalInfo?.status === "SUSPENDED") {
    throw {
      status: 403,
      message: "Your account is suspended. Contact your school.",
    };
  }

  // 5️⃣ Generate token
  const token = generateToken({
    id: student.id,
    role: "STUDENT",
    userType: "student",
    schoolId: student.schoolId,
    universityId: student.school.universityId,
  });

  // 6️⃣ Return normalized response
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
    },
  };
};

// ── Parent ─────────────────────────────────────────────────────────────────

export const loginParentService = async ({ email, password }) => {
  const parent = await prisma.parent.findFirst({
    where: { email, isActive: true },
    include: {
      school: {
        select: {
          id: true,
          name: true,
          code: true,
          type: true,
          universityId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!parent) {
    const staffUser = await prisma.user.findFirst({ where: { email } });
    if (staffUser) {
      const label = { ADMIN: "Admin", TEACHER: "Teacher", FINANCE: "Financer" }[staffUser.role] || "Staff";
      throw { status: 403, message: `This email is registered as ${label}. Please use the Staff → ${label} login.` };
    }
    const student = await prisma.student.findFirst({ where: { email } });
    if (student) throw { status: 403, message: "This email is registered as a Student. Please use the Student login." };
    const superAdmin = await prisma.superAdmin.findFirst({ where: { email } });
    if (superAdmin) throw { status: 403, message: "This email is registered as a Super Admin. Please use the Super Admin login." };
    throw { status: 401, message: "Invalid email or password" };
  }

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

export async function loginFinanceService({ email, password }) {
  if (!email || !password) {
    throw { status: 400, message: "Email and password required" };
  }

const user = await prisma.user.findFirst({
  where: {
    email,
    role: "FINANCE",
  },
  include: {
    school: {
      select: {
        id: true,
        name: true,
      },
    },
  },
});

  if (!user) {
    const student = await prisma.student.findFirst({ where: { email } });
    if (student) throw { status: 403, message: "This email is registered as a Student. Please use the Student login." };
    const parent = await prisma.parent.findFirst({ where: { email } });
    if (parent) throw { status: 403, message: "This email is registered as a Parent. Please use the Parent login." };
    // Could be admin/teacher with same email
    const otherStaff = await prisma.user.findFirst({ where: { email } });
    if (otherStaff) {
      const label = { ADMIN: "Admin", TEACHER: "Teacher" }[otherStaff.role] || "Staff";
      throw { status: 403, message: `This email is registered as ${label}. Please use the Staff → ${label} login.` };
    }
    throw { status: 401, message: "Invalid email or password" };
  }

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


export const sendOtp = async (identifier) => {
  const user =
    await prisma.user.findFirst({ where: { email: identifier } }) ||
    await prisma.student.findFirst({ where: { email: identifier } }) ||
    await prisma.parent.findFirst({ where: { email: identifier } }) ||
    await prisma.superAdmin.findFirst({ where: { email: identifier } });

  if (!user) throw new Error("User not found");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await prisma.otp.create({
    data: {
      identifier,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    }
  });

  console.log("OTP:", otp);

  return { message: "OTP sent successfully" };
};

export const verifyOtp = async (identifier, otp) => {
  const record = await prisma.otp.findFirst({
    where: { identifier, otp }
  });

  if (!record) throw new Error("Invalid OTP");

  if (record.expiresAt < new Date()) {
    throw new Error("OTP expired");
  }

  // ✅ DELETE OTP after verification
  await prisma.otp.delete({
    where: { id: record.id }
  });

  return { message: "OTP verified" };
};


export const resetPassword = async (identifier, newPassword) => {
  // ✅ find user (email or phone)
const user = await prisma.user.findFirst({
  where: {
    email: identifier
  }
});

  if (!user) {
    throw new Error("User not found");
  }

  // 🔐 hash password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // ✅ update password
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword }
  });

  return { message: "Password reset successful" };
};