// server/src/staffControlls/schoolAdmin.controller.js
import { prisma } from "../../config/db.js";
import bcrypt from "bcrypt";
import redisClient from "../../utils/redis.js";

const SALT_ROUNDS = 10;
const CACHE_TTL = 300;

async function bustCache(universityId) {
  await redisClient.del(`school_admins:uni:${universityId}`);
}

// ============================================================
// 🔧 HELPER: Resolve the correct admin limit from a payment
//
//  Convention stored in Plan.maxSchoolAdmins:
//    null  → Unlimited  (e.g. Premium plan)
//    -1    → Unlimited  (alternative sentinel)
//    N > 0 → Hard cap   (e.g. Silver=1, Gold=5)
//
//  We always read from the LIVE plan relation (latestPayment.plan)
//  so a plan change takes effect immediately without re-purchasing.
//  The payment snapshot (latestPayment.maxSchoolAdmins) is used as
//  a safe fallback in case the plan row is missing.
// ============================================================
function resolvePlanLimit(latestPayment) {
  // Prefer live plan data; fall back to snapshot on the payment row
  const raw =
    latestPayment.plan?.maxSchoolAdmins ??
    latestPayment.maxSchoolAdmins ??
    null;

  const isUnlimited = raw === null || raw === -1;
  return { limit: raw, isUnlimited };
}

// ============================================================
// 🔧 HELPER: Fetch the latest SUCCESS payment WITH its plan
// ============================================================
async function getActivePlan(superAdminId) {
  const payment = await prisma.payment.findFirst({
    where: {
      superAdminId,
      status: "SUCCESS",
    },
    orderBy: { createdAt: "desc" },
    include: { plan: true }, // ← always include live plan
  });
  return payment;
}

/**
 * GET /api/school-admins/usage
 * Lightweight endpoint: returns admin count + plan limit so the
 * frontend doesn't have to fetch the full admins list just to count.
 */
export async function getAdminUsage(req, res) {
  try {
    const universityId = req.user.universityId;
    const superAdminId = req.user.id;

    // Current count
    const used = await prisma.user.count({
      where: {
        role: "ADMIN",
        school: { universityId },
      },
    });

    // Plan info
    const latestPayment = await getActivePlan(superAdminId);

    if (!latestPayment) {
      return res.json({
        used,
        limit: 0,
        isUnlimited: false,
        planName: null,
        planExpired: false,
        hasActivePlan: false,
      });
    }

    const { limit, isUnlimited } = resolvePlanLimit(latestPayment);

    const now = new Date();
    const planExpired =
      latestPayment.planEndDate
        ? now > new Date(latestPayment.planEndDate)
        : false;

    return res.json({
      used,
      limit: isUnlimited ? null : limit,   // null → unlimited on the wire
      isUnlimited,
      planName: latestPayment.plan?.name ?? latestPayment.planName,
      planEndDate: latestPayment.planEndDate,
      planExpired,
      hasActivePlan: true,
    });
  } catch (err) {
    console.error("[getAdminUsage]", err);
    return res.status(500).json({ message: "Failed to fetch admin usage" });
  }
}

/**
 * GET /api/school-admins
 * Returns all ADMIN users scoped to the university's schools
 */
export async function getSchoolAdmins(req, res) {
  try {
    const universityId = req.user.universityId;

    const cached = await redisClient.get(`school_admins:uni:${universityId}`);
    if (cached) return res.json({ admins: JSON.parse(cached), fromCache: true });

    const admins = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN"] },
        school: { universityId },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        schoolId: true,
        school: {
          select: { id: true, name: true, code: true, type: true },
        },
        schoolAdminProfile: true,
      },
    });

    await redisClient.setEx(
      `school_admins:uni:${universityId}`,
      CACHE_TTL,
      JSON.stringify(admins)
    );

    return res.json({ admins, fromCache: false });
  } catch (err) {
    console.error("[getSchoolAdmins]", err);
    return res.status(500).json({ message: "Failed to fetch school admins" });
  }
}

/**
 * POST /api/school-admins
 * Creates a User with role ADMIN for a specific school,
 * enforcing per-plan admin limits.
 */
export async function createSchoolAdmin(req, res) {
  try {
    const {
      name,
      email,
      password,
      schoolId,
      role,

      // Admin Details
      employeeId,
      designation = "School Admin",
      phoneNumber,
      address,
      salary,

      // Identity
      panNumber,
      aadharNumber,

      // Banking
      bankName,
      accountNumber,
      ifscCode,
    } = req.body;

    const universityId = req.user.universityId;

    // ============================================================
    // ✅ 1. FETCH LATEST SUCCESS PAYMENT + LIVE PLAN
    // ============================================================
    const latestPayment = await getActivePlan(req.user.id);

    if (!latestPayment) {
      return res.status(403).json({
        message: "No active plan found. Please purchase a plan to add admins.",
      });
    }

    // ============================================================
    // ✅ 2. CHECK PLAN EXPIRY
    // ============================================================
    if (
      latestPayment.planEndDate &&
      new Date() > new Date(latestPayment.planEndDate)
    ) {
      return res.status(403).json({
        message:
          "Your plan has expired. Please renew your subscription to add admins.",
      });
    }

    // ============================================================
    // ✅ 3. RESOLVE LIMIT FROM LIVE PLAN
    //    null / -1  → unlimited
    //    number     → hard cap (Silver=1, Gold=5, etc.)
    // ============================================================
    const { limit: planLimit, isUnlimited } = resolvePlanLimit(latestPayment);
    const planName =
      latestPayment.plan?.name ?? latestPayment.planName ?? "your plan";

    // ============================================================
    // ✅ 4. COUNT EXISTING SCHOOL ADMINS
    // ============================================================
    const existingAdminsCount = await prisma.user.count({
      where: {
        role: "ADMIN",
        school: { universityId },
      },
    });

    // ============================================================
    // ✅ 5. ENFORCE PLAN LIMIT
    // ============================================================
    if (!isUnlimited && existingAdminsCount >= planLimit) {
      return res.status(403).json({
        message: `Admin limit reached. Your ${planName} plan allows only ${planLimit} admin(s). Please upgrade to add more.`,
        usage: {
          used: existingAdminsCount,
          limit: planLimit,
          planName,
        },
      });
    }

    // ============================================================
    // ✅ 6. BASIC VALIDATION
    // ============================================================
    if (!name || !email || !password || !schoolId) {
      return res.status(400).json({
        message: "Name, email, password, and schoolId are required",
      });
    }

    // ============================================================
    // ✅ 7. SCHOOL MUST BELONG TO UNIVERSITY
    // ============================================================
    const school = await prisma.school.findFirst({
      where: { id: schoolId, universityId },
    });

    if (!school) {
      return res.status(404).json({
        message: "School not found or does not belong to your university",
      });
    }

    // ============================================================
    // ✅ 8. DUPLICATE EMAIL CHECK
    // ============================================================
    const existing = await prisma.user.findUnique({
      where: { email_schoolId: { email, schoolId } },
    });

    if (existing) {
      return res.status(409).json({
        message: "An admin with this email already exists in this school",
      });
    }

    // ============================================================
    // ✅ 9. HASH PASSWORD
    // ============================================================
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const toFloat = (v) => {
      const n = parseFloat(v);
      return isNaN(n) ? 0 : n;
    };

    // ============================================================
    // ✅ 10. CREATE SCHOOL ADMIN
    // ============================================================
    const admin = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "ADMIN",
        schoolId,
        schoolAdminProfile: {
          create: {
            schoolId,
            adminName: name,
            email,
            phoneNumber: phoneNumber || "",
            address: address || "",
            employeeId: employeeId || `ADM-${Date.now()}`,
            designation: designation || "School Admin",
            basicSalary: toFloat(salary),
            bankName: bankName || "",
            accountNumber: accountNumber || "",
            ifscCode: ifscCode || "",
            panNumber: panNumber || "",
            aadharNumber: aadharNumber || "",
            joiningDate: new Date(),
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        schoolId: true,
        school: {
          select: { id: true, name: true, code: true, type: true },
        },
        schoolAdminProfile: true,
      },
    });

    // ============================================================
    // ✅ 11. CLEAR CACHE
    // ============================================================
    await bustCache(universityId);

    // ============================================================
    // ✅ 12. SUCCESS RESPONSE
    // ============================================================
    return res.status(201).json({
      message: "School admin created successfully ✅",
      admin,
      usage: {
        used: existingAdminsCount + 1,
        limit: isUnlimited ? null : planLimit,
        isUnlimited,
        planName,
      },
    });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({
        message: "An admin with this email already exists in this school",
      });
    }
    console.error("[createSchoolAdmin]", err);
    return res.status(500).json({ message: "Failed to create school admin" });
  }
}

/**
 * PATCH /api/school-admins/:id
 * Updates User fields AND schoolAdminProfile fields
 */
export async function updateSchoolAdmin(req, res) {
  try {
    const { id } = req.params;
    const universityId = req.user.universityId;

    const {
      name,
      email,
      password,
      isActive,
      employeeId,
      designation,
      phoneNumber,
      address,
      salary,
      bankName,
      accountNumber,
      ifscCode,
      panNumber,
      aadharNumber,
    } = req.body;

    /* ── Build User-level update data ── */
    const userData = {};
    if (name     !== undefined) userData.name     = name;
    if (email    !== undefined) userData.email    = email;
    if (isActive !== undefined) userData.isActive = isActive;
    if (password) userData.password = await bcrypt.hash(password, SALT_ROUNDS);

    /* ── Build SchoolAdminProfile update data ── */
    const toFloat = (v) => {
      const n = parseFloat(v);
      return isNaN(n) ? undefined : n;
    };

    const profileData = {};
    if (name          !== undefined) profileData.adminName     = name;
    if (email         !== undefined) profileData.email         = email;
    if (employeeId    !== undefined) profileData.employeeId    = employeeId;
    if (designation   !== undefined) profileData.designation   = designation;
    if (phoneNumber   !== undefined) profileData.phoneNumber   = phoneNumber;
    if (address       !== undefined) profileData.address       = address;
    if (salary        !== undefined) profileData.basicSalary   = toFloat(salary) ?? 0;
    if (bankName      !== undefined) profileData.bankName      = bankName;
    if (accountNumber !== undefined) profileData.accountNumber = accountNumber;
    if (ifscCode      !== undefined) profileData.ifscCode      = ifscCode;
    if (panNumber     !== undefined) profileData.panNumber     = panNumber;
    if (aadharNumber  !== undefined) profileData.aadharNumber  = aadharNumber;

    const hasProfileUpdates = Object.keys(profileData).length > 0;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...userData,
        ...(hasProfileUpdates && {
          schoolAdminProfile: {
            upsert: {
              create: {
                schoolId: (
                  await prisma.user.findUnique({
                    where: { id },
                    select: { schoolId: true },
                  })
                ).schoolId,
                adminName: name || "",
                email: email || "",
                ...profileData,
                joiningDate: new Date(),
              },
              update: profileData,
            },
          },
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        schoolId: true,
        school: { select: { id: true, name: true, code: true, type: true } },
        schoolAdminProfile: true,
      },
    });

    await bustCache(universityId);
    return res.json({ message: "Admin updated ✅", admin: updated });
  } catch (err) {
    console.error("[updateSchoolAdmin]", err);
    return res.status(500).json({ message: "Failed to update admin" });
  }
}

/**
 * DELETE /api/school-admins/:id
 * Hard delete — permanently removes the admin and their profile
 */
export async function deleteSchoolAdmin(req, res) {
  try {
    const { id } = req.params;
    const universityId = req.user.universityId;

    await prisma.$transaction(async (tx) => {
      await tx.schoolAdminProfile.deleteMany({ where: { userId: id } });
      await tx.user.delete({ where: { id } });
    });

    await bustCache(universityId);
    return res.json({ message: "Admin permanently deleted ✅" });
  } catch (err) {
    console.error("[deleteSchoolAdmin]", err);
    return res.status(500).json({ message: "Failed to delete admin" });
  }
}