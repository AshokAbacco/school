// financeProfile.controller.js
import { prisma } from "../../config/db.js";
import redisClient from "../../utils/redis.js";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CACHE_ONE = (id) => `finance_profile:${id}`;
const CACHE_UNI = (uid) => `finance_profiles:uni:${uid}`;
const TTL = 60; // seconds

/* ─────────────────────────────────────────────────────────────
 * MULTER — inlined so routes need no extra import
 *
 * Handles multipart/form-data (files + text fields).
 * Falls through silently for plain JSON requests.
 * ───────────────────────────────────────────────────────────── */
const _upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, "../../../../uploads/finance"),
    filename: (_, file, cb) =>
      cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
}).fields([
  { name: "photo",          maxCount: 1 },
  { name: "panDocument",    maxCount: 1 },
  { name: "aadharDocument", maxCount: 1 },
]);

function parseFormData(req, res) {
  return new Promise((resolve, reject) => {
    const ct = req.headers["content-type"] ?? "";
    // Only run multer for multipart requests; JSON is already parsed by express.json()
    if (!ct.includes("multipart/form-data")) return resolve();
    _upload(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

/* ─── helpers ────────────────────────────────────────────── */
async function bustCache(universityId) {
  if (!universityId) return;
  await redisClient.del(CACHE_UNI(universityId));
}

async function getUniversityIdForProfile(financeProfileId) {
  const fp = await prisma.financeProfile.findUnique({
    where: { id: financeProfileId },
    include: { school: { select: { universityId: true } } },
  });
  return fp?.school?.universityId ?? null;
}

const toDecimal = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};


/* ═══════════════════════════════════════════════════════════
 * CREATE FINANCE ACCOUNT
 * ═══════════════════════════════════════════════════════════ */
export async function createFinanceProfile(req, res) {
  try {
    await parseFormData(req, res);           // parse multipart if needed
    const body = req.body ?? {};             // guard against undefined body

    const {
      name, email, password, schoolId,
      employeeCode, designation, phone, address, salary,
      bankName, accountNumber, ifscCode,
      panNumber, aadharNumber,
    } = body;

    const universityId = req.user?.universityId;

    if (!name || !email || !password || !schoolId) {
      return res.status(400).json({ message: "name, email, password and schoolId are required." });
    }

    const existing = await prisma.user.findFirst({ where: { email, schoolId } });
    if (existing) {
      return res.status(400).json({ message: "A user with this email already exists in the selected school." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const photoUrl     = req.files?.photo?.[0]?.path          ?? null;
    const panDocUrl    = req.files?.panDocument?.[0]?.path    ?? null;
    const aadharDocUrl = req.files?.aadharDocument?.[0]?.path ?? null;

    const finance = await prisma.user.create({
      data: {
        name, email,
        password: hashedPassword,
        role: "FINANCE",
        schoolId,
        isActive: true,
        financeProfile: {
          create: {
            name,
            email,
            employeeCode:  employeeCode  || null,
            designation:   designation   || "Finance Officer",
            phone:         phone         || null,
            address:       address       || null,
            salary:        toDecimal(salary),
            bankName:      bankName      || null,
            accountNumber: accountNumber || null,
            ifscCode:      ifscCode      || null,
            panNumber:     panNumber     || null,
            aadharNumber:  aadharNumber  || null,
            photoUrl,
            panDocUrl,
            aadharDocUrl,
            school: { connect: { id: schoolId } },
          },
        },
      },
      include: { financeProfile: true },
    });

    await bustCache(universityId);
    res.status(201).json({ message: "Finance created successfully", finance });
  } catch (error) {
    console.error("Create Finance Error:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ message: "A user with this email already exists in the selected school." });
    }
    res.status(500).json({ message: "Failed to create finance" });
  }
}


/* ═══════════════════════════════════════════════════════════
 * GET ALL FINANCE PROFILES  (cached, scoped to university)
 * ═══════════════════════════════════════════════════════════ */
export const getFinanceProfiles = async (req, res) => {
  try {
    const universityId = req.user.universityId;
    const CACHE_KEY    = CACHE_UNI(universityId);

    const cached = await redisClient.get(CACHE_KEY);
    if (cached) {
      return res.json({ success: true, fromCache: true, data: JSON.parse(cached) });
    }

    const profiles = await prisma.financeProfile.findMany({
      where: { school: { universityId } },
      include: { user: true, school: true },
      orderBy: { createdAt: "desc" },
    });

    await redisClient.set(CACHE_KEY, JSON.stringify(profiles), { EX: TTL });
    res.json({ success: true, fromCache: false, data: profiles });
  } catch (error) {
    console.error("Get FinanceProfiles Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/* ═══════════════════════════════════════════════════════════
 * GET SINGLE FINANCE PROFILE  (cached)
 * ═══════════════════════════════════════════════════════════ */
export const getFinanceProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const cached = await redisClient.get(CACHE_ONE(id));
    if (cached) {
      return res.json({ success: true, fromCache: true, data: JSON.parse(cached) });
    }

    const profile = await prisma.financeProfile.findUnique({
      where: { id },
      include: { user: true, school: true },
    });

    if (!profile) {
      return res.status(404).json({ message: "Finance profile not found" });
    }

    await redisClient.set(CACHE_ONE(id), JSON.stringify(profile), { EX: TTL });
    res.json({ success: true, fromCache: false, data: profile });
  } catch (error) {
    console.error("Get FinanceProfile Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/* ═══════════════════════════════════════════════════════════
 * UPDATE FINANCE PROFILE
 * ═══════════════════════════════════════════════════════════ */
export const updateFinanceProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ KEY FIX: parse multipart FIRST — populates req.body and req.files
    await parseFormData(req, res);

    // ✅ Guard: req.body can be undefined if no parser ran at all
    const body = req.body ?? {};

    const {
      name, email, password, isActive, schoolId,
      employeeCode, designation, phone, address, salary,
      bankName, accountNumber, ifscCode,
      panNumber, aadharNumber,
    } = body;

    const universityId = req.user?.universityId;

    const financeProfile = await prisma.financeProfile.findUnique({ where: { id } });
    if (!financeProfile) {
      return res.status(404).json({ message: "Finance profile not found" });
    }

    // ── User-level fields ──
    const userData = {};
    if (name     !== undefined) userData.name     = name;
    if (email    !== undefined) userData.email    = email;
    if (schoolId !== undefined) userData.schoolId = schoolId;
    if (isActive !== undefined) userData.isActive = isActive === "true" || isActive === true;
    if (password)               userData.password = await bcrypt.hash(password, 10);

    // ── FinanceProfile fields ──
    const profileData = {};
    if (name  !== undefined) profileData.name  = name;
    if (email !== undefined) profileData.email = email;
    if (employeeCode  !== undefined) profileData.employeeCode  = employeeCode;
    if (designation   !== undefined) profileData.designation   = designation;
    if (phone         !== undefined) profileData.phone         = phone;
    if (address       !== undefined) profileData.address       = address;
    if (salary        !== undefined) profileData.salary        = toDecimal(salary) ?? 0;
    if (bankName      !== undefined) profileData.bankName      = bankName;
    if (accountNumber !== undefined) profileData.accountNumber = accountNumber;
    if (ifscCode      !== undefined) profileData.ifscCode      = ifscCode;
    if (panNumber     !== undefined) profileData.panNumber     = panNumber;
    if (aadharNumber  !== undefined) profileData.aadharNumber  = aadharNumber;

    // ── Document uploads (only overwrite when a new file is uploaded) ──
    if (req.files?.photo?.[0]?.path)          profileData.photoUrl     = req.files.photo[0].path;
    if (req.files?.panDocument?.[0]?.path)    profileData.panDocUrl    = req.files.panDocument[0].path;
    if (req.files?.aadharDocument?.[0]?.path) profileData.aadharDocUrl = req.files.aadharDocument[0].path;

    // ── Reconnect school if schoolId changed ──
    if (schoolId) profileData.school = { connect: { id: schoolId } };

    if (Object.keys(userData).length) {
      await prisma.user.update({ where: { id: financeProfile.userId }, data: userData });
    }

    const updated = await prisma.financeProfile.update({
      where: { id },
      data: profileData,
      include: { user: true, school: true },
    });

    // ── Bust caches ──
    const uid = universityId ?? (await getUniversityIdForProfile(id));
    await bustCache(uid);
    await redisClient.del(CACHE_ONE(id));
    await redisClient.set(CACHE_ONE(id), JSON.stringify(updated), { EX: TTL });

    res.json({ success: true, message: "Finance profile updated", data: updated });
  } catch (error) {
    console.error("Update Finance Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


/* ═══════════════════════════════════════════════════════════
 * DELETE FINANCE PROFILE
 * ═══════════════════════════════════════════════════════════ */
export const deleteFinanceProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const universityId = req.user?.universityId;

   prisma.financeProfile.update({
      where: { id },

      data: {
        deletedAt: new Date(),
      },
    });
    prisma.user.update({
      data: {
        deletedAt: new Date(),
        isActive: false,
      }
    })
    const uid = universityId ?? (await getUniversityIdForProfile(id));

    await prisma.$transaction(async (tx) => {
      const fp = await tx.financeProfile.findUnique({
        where: { id },
        select: { userId: true },
      });
      if (!fp) throw new Error("Finance profile not found");
      await tx.financeProfile.delete({ where: { id } });
      await tx.user.delete({ where: { id: fp.userId } });
    });

    await bustCache(uid);
    await redisClient.del(CACHE_ONE(id));

    res.json({ success: true, message: "Finance profile deleted successfully" });
  } catch (error) {
    console.error("Delete Finance Error:", error);
    if (error.message === "Finance profile not found") {
      return res.status(404).json({ message: "Finance profile not found" });
    }
    res.status(500).json({ message: "Server error" });
  }
};