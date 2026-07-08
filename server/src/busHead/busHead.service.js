// server\src\busHead\busHead.service.js
import bcrypt from "bcrypt";
import { prisma } from "../config/db.js";
import { generateToken } from "../modules/auth/auth.utils.js";
import { sendSmsOtp, normalizePhone } from "../modules/auth/sms.js";

const stripCountryCode = (phone) => {
  let p = String(phone || "").replace(/\D/g, "").trim();
  if (p.startsWith("91") && p.length === 12) p = p.slice(2);
  return p;
};

const phoneVariants = (phone) => {
  const digits = stripCountryCode(phone);
  if (!digits) return [];
  return [digits, `91${digits}`, `+91${digits}`];
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// ── Create BusHead (SuperAdmin action) ─────────────────────────────────────
// No OTP step here — account is created and active immediately.
export const createBusHeadService = async (
  { name, phone, password, accessType, schoolId },
  { superAdminId, universityId }
) => {
  if (!name || !phone || !password) {
    throw { status: 400, message: "Name, mobile number and password are required" };
  }

  const normalizedType = accessType === "ALL_SCHOOLS" ? "ALL_SCHOOLS" : "SINGLE_SCHOOL";

  if (normalizedType === "SINGLE_SCHOOL" && !schoolId) {
    throw { status: 400, message: "Please select a school for single-school access" };
  }

  if (normalizedType === "SINGLE_SCHOOL") {
    const school = await prisma.school.findFirst({
      where: { id: schoolId, universityId },
    });
    if (!school) throw { status: 404, message: "School not found" };
  }

  const normalizedPhone = normalizePhone(phone);

  const existing = await prisma.busHead.findFirst({
    where: { phone: { in: phoneVariants(phone) } },
  });
  if (existing) throw { status: 409, message: "A Bus Head with this mobile number already exists" };

  const hashedPassword = await bcrypt.hash(password, 12);

  const busHead = await prisma.busHead.create({
    data: {
      name,
      phone: normalizedPhone,
      password: hashedPassword,
      accessType: normalizedType,
      schoolId: normalizedType === "SINGLE_SCHOOL" ? schoolId : null,
      universityId,
      createdById: superAdminId,
      isPhoneVerified: true,
      isActive: true,
    },
  });

  return {
    message: "Bus Head created and ready to log in.",
    busHeadId: busHead.id,
    phone: normalizedPhone,
  };
};

// ── List BusHeads for a University (SuperAdmin portal) ─────────────────────
export const listBusHeadsService = async ({ universityId }) => {
  const busHeads = await prisma.busHead.findMany({
    where: { universityId },
    include: { school: { select: { id: true, name: true, code: true } } },
    orderBy: { createdAt: "desc" },
  });

  return {
    data: busHeads.map((b) => ({
      id: b.id,
      name: b.name,
      phone: b.phone,
      accessType: b.accessType,
      school: b.school,
      isActive: b.isActive,
      lastLoginAt: b.lastLoginAt,
      createdAt: b.createdAt,
    })),
  };
};

// ── Activate / Deactivate a BusHead (SuperAdmin action) ────────────────────
export const setBusHeadStatusService = async (busHeadId, isActive, { universityId }) => {
  const busHead = await prisma.busHead.findFirst({ where: { id: busHeadId, universityId } });
  if (!busHead) throw { status: 404, message: "Bus Head not found" };

  await prisma.busHead.update({ where: { id: busHeadId }, data: { isActive: !!isActive } });

  return { message: isActive ? "Bus Head activated" : "Bus Head deactivated" };
};

// ── BusHead Login — STEP 1: verify credentials, send OTP ───────────────────
export const sendBusHeadLoginOtpService = async ({ phone, password }) => {
  if (!phone || !password) throw { status: 400, message: "Mobile number and password are required" };

  const variants = phoneVariants(phone);
  const busHead = await prisma.busHead.findFirst({
    where: { phone: { in: variants } },
    include: {
      school: { select: { id: true, name: true, code: true } },
      university: { select: { id: true, name: true, code: true, isDeactivated: true } },
    },
  });

  if (!busHead) throw { status: 401, message: "Invalid credentials" };

  if (!busHead.isActive) {
    throw { status: 403, message: "Your account is inactive. Contact your administrator." };
  }
  if (busHead.university?.isDeactivated) {
    throw { status: 403, message: "This account no longer exists. Contact support@eduabaccotech.com" };
  }

  const valid = await bcrypt.compare(password, busHead.password);
  if (!valid) throw { status: 401, message: "Invalid credentials" };

  const token = generateToken({
    id: busHead.id,
    role: "BUS_HEAD",
    userType: "busHead",
    accessType: busHead.accessType,
    schoolId: busHead.schoolId,
    universityId: busHead.universityId,
  });

  const loginPayload = {
    token,
    user: {
      id: busHead.id,
      name: busHead.name,
      phone: busHead.phone,
      role: "BUS_HEAD",
      userType: "busHead",
      accessType: busHead.accessType,
      school: busHead.school,
      university: busHead.university,
    },
  };

  const normalizedPhone = normalizePhone(busHead.phone);
  const otp = generateOtp();

  // Store the ready-to-use login payload, keyed by phone + OTP — same pattern
  // used for staff/student/parent/superAdmin login-with-otp.
  await prisma.loginOtp.create({
    data: {
      identifier: normalizedPhone,
      otp,
      loginData: JSON.stringify(loginPayload),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });

  await sendSmsOtp({ phone: normalizedPhone, otp });

  // Bump lastLoginAt only once OTP is actually verified (see step 2) —
  // not here, since credentials alone haven't completed login yet.

  return {
    otpRequired: true,
    phone: normalizedPhone,
  };
};

// ── BusHead Login — STEP 2: verify OTP, return token + user ────────────────
export const verifyBusHeadLoginOtpService = async ({ phone, otp }) => {
  if (!phone || !otp) throw { status: 400, message: "Mobile number and OTP are required" };

  const normalizedPhone = normalizePhone(phone);
  const variants = [normalizedPhone, ...phoneVariants(phone)];

  let record = null;
  for (const v of variants) {
    record = await prisma.loginOtp.findFirst({ where: { identifier: v, otp } });
    if (record) break;
  }

  if (!record) throw { status: 400, message: "Invalid OTP" };
  if (record.expiresAt < new Date()) throw { status: 400, message: "OTP expired" };

  const loginData = JSON.parse(record.loginData);

  await prisma.loginOtp.delete({ where: { id: record.id } });

  await prisma.busHead.update({
    where: { id: loginData.user.id },
    data: { lastLoginAt: new Date() },
  });

  return loginData; // { token, user }
};

// ── Live vehicle data scoped to the logged-in BusHead ──────────────────────
export const getBusHeadLiveVehiclesService = async ({ schoolId, universityId, accessType }) => {
  const schoolWhere =
    accessType === "ALL_SCHOOLS"
      ? { universityId }
      : { id: schoolId, universityId };

  const vehicles = await prisma.schoolVehicle.findMany({
    where: { school: schoolWhere, isActive: true },
    include: {
      locations: { orderBy: { recordedAt: "desc" }, take: 1 },
      school: { select: { id: true, name: true, code: true } },
    },
  });

  return {
    data: vehicles.map((v) => ({
      id: v.id,
      regNo: v.regNo,
      vehicleName: v.vehicleName,
      vehicleType: v.vehicleType,
      school: v.school,
      location: v.locations[0] || null,
    })),
  };
};