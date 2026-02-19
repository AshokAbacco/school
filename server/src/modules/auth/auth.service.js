// server/src/modules/auth/auth.service.js
import bcrypt from "bcryptjs";
import { prisma } from "../../config/db.js";
import { generateToken } from "./auth.utils.js";

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

export const loginStaffService = async ({ email, password }) => {
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

  if (!user) throw { status: 401, message: "Invalid email or password" };
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
  const student = await prisma.student.findFirst({
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
      personalInfo: {
        select: {
          firstName: true,
          lastName: true,
          profileImage: true,
          status: true,
          admissionDate: true,
        },
      },
      // ✅ Pull the most recent active enrollment for class info
      enrollments: {
        where: { status: "ACTIVE" },
        select: {
          rollNumber: true,
          status: true,
          classSection: {
            select: { id: true, name: true, grade: true, section: true },
          },
          academicYear: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!student) throw { status: 401, message: "Invalid email or password" };
  if (student.personalInfo?.status === "SUSPENDED")
    throw {
      status: 403,
      message: "Your account is suspended. Contact your school.",
    };

  const isValid = await bcrypt.compare(password, student.password);
  if (!isValid) throw { status: 401, message: "Invalid email or password" };

  const token = generateToken({
    id: student.id,
    role: "STUDENT",
    userType: "student",
    schoolId: student.schoolId,
    universityId: student.school.universityId,
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
      // ✅ current class info from enrollment
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

  if (!parent) throw { status: 401, message: "Invalid email or password" };

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
