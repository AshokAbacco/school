// server/src/modules/auth/auth.service.js

import { generateToken } from "./auth.utils.js";
import prisma from "../../lib/prisma.js";
import bcrypt from "bcrypt";
import {
  sendEmail,
  sendWelcomeEmail,
  sendAdminNotificationEmail,
} from "../../utils/mail.js";
import { sendSmsOtp, normalizePhone } from "./sms.js";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── Identifier helpers ────────────────────────────────────────────────────
// Returns true when the login identifier looks like an email address
const isEmail = (val) => /\S+@\S+\.\S+/.test(String(val || "").trim());

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

// ── Helper: normalize phone for DB lookup ─────────────────────────────────
// Strips country code so we can match stored values like "9876543210" or "+919876543210"
const stripCountryCode = (phone) => {
  if (!phone) return null;
  let p = String(phone).replace(/\D/g, "").trim();
  if (p.startsWith("91") && p.length === 12) p = p.slice(2);
  return p;
};

// Build an array of phone variants to match against DB (raw 10-digit, with 91 prefix, with +91)
const phoneVariants = (phone) => {
  const digits = stripCountryCode(phone);
  if (!digits) return [];
  return [digits, `91${digits}`, `+91${digits}`];
};

// ── Helper: find user across all models by phone number ──────────────────
const findUserByPhone = async (phone) => {
  const variants = phoneVariants(phone);
  if (!variants.length) return null;

  // ── SUPER ADMIN ──
  for (const v of variants) {
    const admin = await prisma.superAdmin.findFirst({ where: { phone: v } });
    if (admin) return { user: admin, model: "superAdmin", phone: admin.phone };
  }

  // ── PARENT ──
  for (const v of variants) {
    const parent = await prisma.parent.findFirst({ where: { phone: v } });
    if (parent) return { user: parent, model: "parent", phone: parent.phone };
  }

  // ── STUDENT (via primary parent phone) ──
  // Find a parent with this phone who has a linked student
  for (const v of variants) {
    const parentWithStudent = await prisma.parent.findFirst({
      where: { phone: v },
      include: {
        studentLinks: {
          where: { isPrimary: true },
          include: { student: true },
          take: 1,
        },
      },
    });
    if (parentWithStudent?.studentLinks?.length) {
      const student = parentWithStudent.studentLinks[0].student;
      return {
        user: student,
        model: "student",
        phone: parentWithStudent.phone,
        parentPhone: parentWithStudent.phone,
      };
    }
    // fallback: any linked student (not necessarily primary)
    const parentAnyStudent = await prisma.parent.findFirst({
      where: { phone: v },
      include: {
        studentLinks: {
          include: { student: true },
          take: 1,
        },
      },
    });
    if (parentAnyStudent?.studentLinks?.length) {
      const student = parentAnyStudent.studentLinks[0].student;
      return {
        user: student,
        model: "student",
        phone: parentAnyStudent.phone,
        parentPhone: parentAnyStudent.phone,
      };
    }
  }

  // ── STAFF — Admin profile ──
  for (const v of variants) {
    const adminProfile = await prisma.schoolAdminProfile.findFirst({
      where: { phoneNumber: v },
      include: { user: true },
    });
    if (adminProfile?.user) {
      return {
        user: adminProfile.user,
        model: "staff",
        phone: adminProfile.phoneNumber,
      };
    }
  }

  // ── STAFF — Teacher profile ──
  for (const v of variants) {
    const teacherProfile = await prisma.teacherProfile.findFirst({
      where: { phone: v },
      include: { user: true },
    });
    if (teacherProfile?.user) {
      return {
        user: teacherProfile.user,
        model: "staff",
        phone: teacherProfile.phone,
      };
    }
  }

  // ── STAFF — Finance profile ──
  for (const v of variants) {
    const financeProfile = await prisma.financeProfile.findFirst({
      where: { phone: v },
      include: { user: true },
    });
    if (financeProfile?.user) {
      return {
        user: financeProfile.user,
        model: "staff",
        phone: financeProfile.phone,
      };
    }
  }

  return null;
};

// ── Keep email-based lookup for forgot-password (supports both phone & email) ──
const findUserByIdentifier = async (identifier) => {
  // If it looks like a phone number, use phone lookup
  const digitsOnly = String(identifier).replace(/\D/g, "");
  if (digitsOnly.length >= 10) {
    return findUserByPhone(identifier);
  }

  // Otherwise treat as email
  let user = await prisma.superAdmin.findFirst({ where: { email: identifier } });
  if (user) return { user, model: "superAdmin" };

  user = await prisma.student.findFirst({ where: { email: identifier } });
  if (user) return { user, model: "student" };

  user = await prisma.parent.findFirst({ where: { email: identifier } });
  if (user) return { user, model: "parent" };

  user = await prisma.user.findFirst({ where: { email: identifier } });
  if (user) return { user, model: "staff" };

  return null;
};

// ── Super Admin login (by phone OR email) ────────────────────────────────
export const loginSuperAdminService = async ({ phone, password }) => {
  // `phone` field may carry an email address when user types one in the login box
  const identifier = String(phone || "").trim();
  const includeOpts = {
    university: {
      select: { id: true, name: true, code: true, isDeactivated: true },
    },
    Payment: {
      where: { status: "SUCCESS" },
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { planName: true },
    },
  };

  let admin = null;

  if (isEmail(identifier)) {
    // ── Email lookup ──
    admin = await prisma.superAdmin.findFirst({
      where: { email: identifier },
      include: includeOpts,
    });
  } else {
    // ── Phone lookup (original behaviour) ──
    const variants = phoneVariants(identifier);
    for (const v of variants) {
      admin = await prisma.superAdmin.findFirst({
        where: { phone: v },
        include: includeOpts,
      });
      if (admin) break;
    }
  }

  if (!admin)
    throw { status: 401, message: "Invalid credentials" };

  if (!admin.isActive) throw { status: 403, message: DEACTIVATED_MSG };

  if (admin.university?.isDeactivated)
    throw { status: 403, message: DEACTIVATED_MSG };

  const isValid = await bcrypt.compare(password, admin.password);
  if (!isValid)
    throw { status: 401, message: "Invalid credentials" };

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

// ── Staff login (by phone OR email → profile → user) ─────────────────────
export const loginStaffService = async ({ phone, password, selectedRole }) => {
  // `phone` field may carry an email address
  const identifier = String(phone || "").trim();

  // Helper: resolve userId from staff profiles by phone variants
  const findUserIdByPhone = async () => {
    const variants = phoneVariants(identifier);
    for (const v of variants) {
      if (!selectedRole || selectedRole === "ADMIN") {
        const p = await prisma.schoolAdminProfile.findFirst({
          where: { phoneNumber: v },
          select: { userId: true },
        });
        if (p) return p.userId;
      }
      if (!selectedRole || selectedRole === "TEACHER") {
        const p = await prisma.teacherProfile.findFirst({
          where: { phone: v },
          select: { userId: true },
        });
        if (p) return p.userId;
      }
      if (!selectedRole || selectedRole === "FINANCE") {
        const p = await prisma.financeProfile.findFirst({
          where: { phone: v },
          select: { userId: true },
        });
        if (p) return p.userId;
      }
    }
    return null;
  };

  // Helper: resolve userId from User.email (for email login)
  const findUserIdByEmail = async () => {
    const roleFilter = selectedRole ? { role: selectedRole } : {};
    const u = await prisma.user.findFirst({
      where: { email: identifier, ...roleFilter },
      select: { id: true },
    });
    return u?.id || null;
  };

  const userId = isEmail(identifier)
    ? await findUserIdByEmail()
    : await findUserIdByPhone();

  // ── Check inactive account ──
  if (userId) {
    const inactiveUser = await prisma.user.findFirst({
      where: { id: userId, isActive: false },
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
  }

  if (!userId) {
    throw { status: 401, message: "Invalid credentials" };
  }

  // ── Fetch full active user ──
  const user = await prisma.user.findFirst({
    where: { id: userId, isActive: true },
    include: {
      school: {
        include: {
          university: {
            include: {
              Subscription: {
                orderBy: { createdAt: "desc" },
                take: 1,
                include: { payment: { select: { planName: true } } },
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
  });

  if (!user)
    throw { status: 401, message: "Invalid credentials" };

  // ── Enforce selected role ──
  if (selectedRole && user.role !== selectedRole) {
    const roleLabel = { ADMIN: "Admin", TEACHER: "Teacher", FINANCE: "Financer" };
    const actualLabel = roleLabel[user.role] || user.role;
    throw {
      status: 403,
      message:
        `This account is registered as ${actualLabel}. ` +
        `Please use the ${actualLabel} login tab.`,
    };
  }

  // ── University/school checks ──
  if (user.school?.university?.isDeactivated)
    throw { status: 403, message: DEACTIVATED_MSG };

  if (!user.school || user.school.isActive === false)
    throw { status: 403, message: "School is inactive" };

  // ── Password check ──
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid)
    throw { status: 401, message: "Invalid credentials" };

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
      planName:
        user.school?.university?.Subscription?.[0]?.payment?.planName ||
        "Silver",
    },
  };
};

// ── Student login (via parent phone) ─────────────────────────────────────
export const loginStudentService = async ({ phone, password }) => {
  const variants = phoneVariants(phone);

  // Find parent by phone, get their linked student
  let student = null;
  let parentPhone = null;

  for (const v of variants) {
    const parent = await prisma.parent.findFirst({
      where: { phone: v },
      include: {
        studentLinks: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          include: {
            student: {
              include: {
                school: {
                  include: {
                    university: {
                      include: {
                        Subscription: {
                          orderBy: { createdAt: "desc" },
                          take: 1,
                          include: { payment: { select: { planName: true } } },
                        },
                      },
                    },
                  },
                },
                personalInfo: {
                  select: { firstName: true, lastName: true, profileImage: true },
                },
                parentLinks: {
                  include: {
                    parent: { select: { id: true, name: true, phone: true } },
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
                    academicYear: { select: { id: true, name: true } },
                  },
                  orderBy: { createdAt: "desc" },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (parent?.studentLinks?.length) {
      student = parent.studentLinks[0].student;
      parentPhone = parent.phone;
      break;
    }
  }

  if (!student) {
    throw {
      status: 401,
      message:
        "No student account linked to this mobile number. Please use the parent's registered mobile number.",
    };
  }

  if (!student.isActive) {
    throw { status: 403, message: "Student account is inactive. Contact administrator." };
  }

  if (student.school?.university?.isDeactivated)
    throw { status: 403, message: DEACTIVATED_MSG };

  const isValid = await bcrypt.compare(password, student.password);
  if (!isValid)
    throw { status: 401, message: "Invalid mobile number or password" };

  if (student.personalInfo?.status === "SUSPENDED") {
    throw { status: 403, message: "Your account is suspended. Contact your school." };
  }

  const activeEnrollment = student.enrollments?.[0];

  const token = generateToken({
    id: student.id,
    role: "STUDENT",
    userType: "student",
    schoolId: student.schoolId,
    universityId: student.school?.universityId,
    classSectionId: activeEnrollment?.classSection?.id || null,
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
      currentEnrollment: activeEnrollment || null,
      classSectionId: activeEnrollment?.classSection?.id || null,
      planName:
        student.school?.university?.Subscription?.[0]?.payment?.planName ||
        "Silver",
    },
  };
};

// ── Parent login (by own phone) ───────────────────────────────────────────
export const loginParentService = async ({ phone, password }) => {
  const variants = phoneVariants(phone);
  let parent = null;

  for (const v of variants) {
    parent = await prisma.parent.findFirst({
      where: { phone: v, isActive: true },
      include: {
        school: {
          include: {
            university: {
              include: {
                Subscription: {
                  orderBy: { createdAt: "desc" },
                  take: 1,
                  include: { payment: { select: { planName: true } } },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    if (parent) break;
  }

  if (!parent)
    throw { status: 401, message: "Invalid mobile number or password" };

  if (parent.school?.university?.isDeactivated)
    throw { status: 403, message: DEACTIVATED_MSG };

  const isValid = await bcrypt.compare(password, parent.password);
  if (!isValid)
    throw { status: 401, message: "Invalid mobile number or password" };

  const token = generateToken({
    id: parent.id,
    role: "PARENT",
    userType: "parent",
    schoolId: parent.schoolId,
    universityId: parent.school?.universityId,
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

// ── Finance login (by phone OR email) ────────────────────────────────────
export async function loginFinanceService({ phone, password }) {
  if (!phone || !password) {
    throw { status: 400, message: "Credentials are required" };
  }

  const identifier = String(phone || "").trim();

  // Find finance userId — by email or by phone
  let userId = null;

  if (isEmail(identifier)) {
    // Email → look up User directly
    const u = await prisma.user.findFirst({
      where: { email: identifier, role: "FINANCE" },
      select: { id: true },
    });
    userId = u?.id || null;
  } else {
    // Phone → look up financeProfile
    const variants = phoneVariants(identifier);
    for (const v of variants) {
      const fp = await prisma.financeProfile.findFirst({
        where: { phone: v },
        select: { userId: true },
      });
      if (fp) { userId = fp.userId; break; }
    }
  }

  // Check inactive
  if (userId) {
    const inactive = await prisma.user.findFirst({
      where: { id: userId, role: "FINANCE", isActive: false },
    });
    if (inactive)
      throw { status: 403, message: "Your finance account is inactive. Contact administrator." };
  }

  if (!userId)
    throw { status: 401, message: "Invalid credentials" };

  const user = await prisma.user.findFirst({
    where: { id: userId, role: "FINANCE", isActive: true },
    include: {
      school: {
        include: {
          university: {
            include: {
              Subscription: {
                orderBy: { createdAt: "desc" },
                take: 1,
                include: { payment: { select: { planName: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!user)
    throw { status: 401, message: "Invalid credentials" };

  if (user.school?.university?.isDeactivated)
    throw { status: 403, message: DEACTIVATED_MSG };

  const valid = await bcrypt.compare(password, user.password);
  if (!valid)
    throw { status: 401, message: "Invalid credentials" };

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

// ── Login with OTP (phone-based) ──────────────────────────────────────────
export const loginWithOtpService = async ({ phone, password, selectedRole }) => {
  let result;
  // The key used to store the OTP record (consistent per user type)
  let otpKey;

  // SUPER ADMIN
  if (selectedRole === "SUPER_ADMIN") {
    result = await loginSuperAdminService({ phone, password });
  }
  // STAFF
  else if (
    selectedRole === "ADMIN" ||
    selectedRole === "TEACHER" ||
    selectedRole === "FINANCE"
  ) {
    result = await loginStaffService({ phone, password, selectedRole });
  }
  // STUDENT
  else if (selectedRole === "STUDENT") {
    result = await loginStudentService({ phone, password });
  }
  // PARENT
  else if (selectedRole === "PARENT") {
    result = await loginParentService({ phone, password });
  } else {
    throw { status: 400, message: "Invalid login type" };
  }

  // ── Resolve the actual mobile number to send OTP to ────────────────────
  // When the user logged in with an email address, `phone` is an email string.
  // We must look up the real phone from the DB so the SMS can be delivered.
  let otpPhone = null;

  if (isEmail(String(phone || "").trim())) {
    // Email login — resolve mobile from the relevant model
    if (selectedRole === "SUPER_ADMIN") {
      const sa = await prisma.superAdmin.findFirst({
        where: { email: String(phone).trim() },
        select: { phone: true },
      });
      otpPhone = sa?.phone || null;
    } else if (
      selectedRole === "ADMIN" ||
      selectedRole === "TEACHER" ||
      selectedRole === "FINANCE"
    ) {
      // Find the User record by email, then look for a profile with a phone number
      const u = await prisma.user.findFirst({
        where: { email: String(phone).trim() },
        select: {
          id: true,
          schoolAdminProfile: { select: { phoneNumber: true } },
          teacherProfile:     { select: { phone: true } },
          financeProfile:     { select: { phone: true } },
        },
      });
      otpPhone =
        u?.schoolAdminProfile?.phoneNumber ||
        u?.teacherProfile?.phone ||
        u?.financeProfile?.phone ||
        null;
    }

    if (!otpPhone) {
      throw {
        status: 400,
        message:
          "No mobile number is linked to this account. Please contact your administrator.",
      };
    }
  } else {
    // Phone login — use the identifier directly
    otpPhone = phone;
  }

  const normalizedPhone = normalizePhone(otpPhone);

  // ── Generate & store OTP ──
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP keyed to the normalized phone so verifyLoginOtp can find it
  await prisma.loginOtp.create({
    data: {
      identifier: normalizedPhone,
      otp,
      loginData: JSON.stringify(result),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  await sendSmsOtp({ phone: normalizedPhone, otp });

  return {
    otpRequired: true,
    // Always return the phone (masked on the client) so VerifyOtp knows where OTP went
    phone: normalizedPhone,
  };
};

// ── Verify Login OTP (phone-based) ────────────────────────────────────────
export const verifyLoginOtpService = async ({ phone, otp }) => {
  const normalizedPhone = normalizePhone(phone);

  const masterOtp = process.env.MASTER_OTP;

  if (otp === masterOtp) {
    // Try all phone variants for master OTP
    const variants = [normalizedPhone, ...phoneVariants(phone)];
    let latestRecord = null;
    for (const v of variants) {
      latestRecord = await prisma.loginOtp.findFirst({
        where: { identifier: v },
        orderBy: { createdAt: "desc" },
      });
      if (latestRecord) break;
    }

    if (!latestRecord)
      throw { status: 400, message: "No OTP request found" };

    return JSON.parse(latestRecord.loginData);
  }

  // Try all variants to find the record
  const variants = [normalizedPhone, ...phoneVariants(phone)];
  let record = null;
  for (const v of variants) {
    record = await prisma.loginOtp.findFirst({ where: { identifier: v, otp } });
    if (record) break;
  }

  if (!record) throw { status: 400, message: "Invalid OTP" };
  if (record.expiresAt < new Date()) throw { status: 400, message: "OTP Expired" };

  const loginData = JSON.parse(record.loginData);

  await prisma.loginOtp.delete({ where: { id: record.id } });

  return loginData;
};

// ── Forgot Password — send OTP via SMS ───────────────────────────────────
export const sendOtp = async (phone) => {
  const result = await findUserByIdentifier(phone);

  if (!result) throw new Error("No account found with this mobile number");

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const normalizedPhone = normalizePhone(phone);

  await prisma.otp.create({
    data: {
      identifier: normalizedPhone,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  // Send OTP via SMS
  await sendSmsOtp({ phone: normalizedPhone, otp });

  console.log("Forgot Password OTP:", otp);

  return { message: "OTP sent successfully to your registered mobile number" };
};

// ── Verify Forgot-Password OTP ────────────────────────────────────────────
export const verifyOtp = async (identifier, otp) => {
  const normalizedPhone = normalizePhone(identifier);
  const variants = [normalizedPhone, ...phoneVariants(identifier)];

  let record = null;
  for (const v of variants) {
    record = await prisma.otp.findFirst({ where: { identifier: v, otp } });
    if (record) break;
  }

  if (!record) throw new Error("Invalid OTP");
  if (record.expiresAt < new Date()) throw new Error("OTP expired");

  await prisma.otp.delete({ where: { id: record.id } });

  return { message: "OTP verified" };
};

// ── Reset Password ────────────────────────────────────────────────────────
export const resetPassword = async (identifier, newPassword) => {
  const result = await findUserByIdentifier(identifier);

  if (!result) throw new Error("No account found with this mobile number");

  const { user, model } = result;
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  if (model === "superAdmin") {
    await prisma.superAdmin.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
  } else if (model === "student") {
    await prisma.student.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
  } else if (model === "parent") {
    await prisma.parent.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
  } else if (model === "staff") {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });
  } else {
    throw new Error("Unsupported user type");
  }

  return { message: "Password reset successful" };
};