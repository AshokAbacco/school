import { prisma } from "../config/db.js";
import { processPresent, processAbsent } from "./biometric_attendance_service.js";

// ─────────────────────────────────────────────────────────────────────────────
// TIMEZONE HELPER
// Biometric devices send timestamps in IST (UTC+5:30) with NO timezone marker,
// e.g. "2026-06-12 18:47:15". Node.js new Date() treats this as UTC,
// shifting it +5:30 hours → wrong day/time. This forces correct IST parsing.
// ─────────────────────────────────────────────────────────────────────────────
function parseIST(dateStr) {
  if (!dateStr) return null;
  const s = String(dateStr).trim().replace(" ", "T");
  // If already has timezone info, use as-is
  if (s.endsWith("Z") || s.includes("+") || /[+-]\d{2}:\d{2}$/.test(s)) {
    return new Date(s);
  }
  // No timezone marker → device is IST, force +05:30
  return new Date(s + "+05:30");
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/biometric/punch
// ─────────────────────────────────────────────────────────────────────────────
export const receivePunch = async (req, res) => {
  try {
    const records = Array.isArray(req.body) ? req.body : [req.body];

    let inserted = 0;
    let skipped = 0;

    for (const item of records) {
      const enrollmentId  = item.EnrollmentId || item.EnrollmentID || null;
      const deviceCode    = item.DevicesId?.toString() || item.DeviceId?.toString() || null;
      const deviceName    = item.DeviceName || null;
      const serialNo      = item.SerialNo || null;
      const punchMode     = item.PunchMode || null;

      // ✅ FIXED: use parseIST instead of new Date() — device sends IST without timezone marker
      const punchDateTime = parseIST(item.PunchDateAndTime);

      // 1. Find device
      const device = await prisma.biometricDevice.findFirst({
        where: { deviceCode, serialNo, isActive: true },
      });

      const schoolId = device?.schoolId || null;

      // 2. Find active user mapping
      let mapping = null;
      if (schoolId && enrollmentId) {
        mapping = await prisma.biometricUserMapping.findFirst({
          where: { schoolId, enrollmentId, isActive: true },
        });
      }

      // 3. Active academic year
      let academicYear = null;
      if (schoolId) {
        academicYear = await prisma.academicYear.findFirst({
          where: { schoolId, isActive: true },
        });
      }

      // 4. Duplicate check
      const existing = await prisma.biometricLog.findFirst({
        where: {
          biometricUserMappingId: mapping?.id || null,
          punchDateTime,
          punchMode,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // 5. Store log
      await prisma.biometricLog.create({
        data: {
          schoolId,
          biometricDeviceId:      device?.id        || null,
          biometricUserMappingId: mapping?.id        || null,
          academicYearId:         academicYear?.id   || null,
          personType:             mapping?.personType || null,
          studentId:              mapping?.studentId  || null,
          teacherId:              mapping?.teacherId  || null,
          staffId:                mapping?.staffId    || null,
          userId:                 mapping?.userId     || null,
          punchMode,
          punchDateTime,
          isProcessed: false,
          rawData: { ...item, enrollmentId, deviceCode, deviceName, serialNo },
        },
      });

      inserted++;
    }

    return res.status(200).json({ success: true, message: "Biometric data processed", inserted, skipped });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/biometric/schools
// ─────────────────────────────────────────────────────────────────────────────
export const getSchools = async (req, res) => {
  try {
    const universityId = req.user?.universityId;
    if (!universityId) {
      return res.status(400).json({ success: false, message: "universityId missing in token" });
    }
    const schools = await prisma.school.findMany({
      where: { universityId, isActive: true, deletedAt: null },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
    return res.status(200).json({ success: true, data: schools });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/biometric/devices?schoolId=
// ─────────────────────────────────────────────────────────────────────────────
export const getDevices = async (req, res) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: "schoolId is required" });
    }
    const devices = await prisma.biometricDevice.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, deviceCode: true, serialNo: true, deviceName: true },
      orderBy: { deviceName: "asc" },
    });
    return res.status(200).json({ success: true, data: devices });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/biometric/classes?schoolId=
// ─────────────────────────────────────────────────────────────────────────────
export const getClasses = async (req, res) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: "schoolId is required" });
    }
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true },
    });
    const classes = await prisma.classSection.findMany({
      where: {
        schoolId,
        deletedAt: null,
        ...(activeYear && {
          studentEnrollments: {
            some: { academicYearId: activeYear.id, status: "ACTIVE" },
          },
        }),
      },
      select: {
        id: true, name: true, grade: true, section: true,
        _count: {
          select: {
            studentEnrollments: activeYear
              ? { where: { academicYearId: activeYear.id, status: "ACTIVE" } }
              : true,
          },
        },
      },
      orderBy: [{ grade: "asc" }, { section: "asc" }],
    });
    const data = classes.map((c) => ({
      id: c.id, name: c.name, grade: c.grade, section: c.section,
      studentCount: c._count.studentEnrollments,
    }));
    return res.status(200).json({ success: true, data, activeYearId: activeYear?.id || null });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/biometric/persons?schoolId=&personType=&q=&classSectionId=
// ─────────────────────────────────────────────────────────────────────────────
export const searchPersons = async (req, res) => {
  try {
    const { schoolId, personType, q, classSectionId } = req.query;
    if (!schoolId || !personType) {
      return res.status(400).json({ success: false, message: "schoolId and personType are required" });
    }
    const search = (q || "").trim();
    const searchFilter = search ? { contains: search, mode: "insensitive" } : undefined;
    let results = [];

    if (personType === "STUDENT") {
      const activeYear = await prisma.academicYear.findFirst({
        where: { schoolId, isActive: true },
        select: { id: true },
      });
      const students = await prisma.student.findMany({
        where: {
          schoolId, isActive: true, deletedAt: null,
          ...(classSectionId && {
            enrollments: {
              some: {
                classSectionId, status: "ACTIVE",
                ...(activeYear && { academicYearId: activeYear.id }),
              },
            },
          }),
          ...(searchFilter && { OR: [{ name: searchFilter }, { studentCode: searchFilter }] }),
        },
        select: {
          id: true, name: true, studentCode: true,
          enrollments: {
            where: { status: "ACTIVE", ...(activeYear && { academicYearId: activeYear.id }) },
            orderBy: { createdAt: "desc" }, take: 1,
            select: { rollNumber: true, classSection: { select: { name: true } } },
          },
        },
        take: 50,
        orderBy: { name: "asc" },
      });
      results = students.map((s) => ({
        id: s.id, name: s.name, code: s.studentCode || "—",
        extra: s.enrollments?.[0]?.classSection?.name || "Student",
        rollNumber: s.enrollments?.[0]?.rollNumber || null,
      }));

    } else if (personType === "TEACHER") {
      const teachers = await prisma.teacherProfile.findMany({
        where: {
          schoolId, deletedAt: null, status: "ACTIVE",
          ...(searchFilter && {
            OR: [{ firstName: searchFilter }, { lastName: searchFilter }, { employeeCode: searchFilter }],
          }),
        },
        select: { id: true, firstName: true, lastName: true, employeeCode: true, department: true, designation: true },
        take: 50,
        orderBy: { firstName: "asc" },
      });
      results = teachers.map((t) => ({
        id: t.id, name: `${t.firstName} ${t.lastName}`, code: t.employeeCode,
        extra: t.designation || t.department || "Teacher",
      }));

    } else if (personType === "STAFF") {
      const staff = await prisma.staffProfile.findMany({
        where: {
          schoolId, deletedAt: null, status: "ACTIVE",
          ...(searchFilter && { OR: [{ firstName: searchFilter }, { lastName: searchFilter }] }),
        },
        select: { id: true, firstName: true, lastName: true, role: true, groupType: true },
        take: 50,
        orderBy: { firstName: "asc" },
      });
      results = staff.map((s) => ({
        id: s.id, name: `${s.firstName} ${s.lastName}`,
        code: s.groupType || "STAFF", extra: s.role || "Staff",
      }));

    } else if (personType === "ADMIN") {
      const admins = await prisma.user.findMany({
        where: {
          schoolId, role: "ADMIN", isActive: true, deletedAt: null,
          ...(searchFilter && { OR: [{ name: searchFilter }, { email: searchFilter }] }),
        },
        select: {
          id: true, name: true, email: true,
          schoolAdminProfile: { select: { employeeId: true, designation: true } },
        },
        take: 50,
        orderBy: { name: "asc" },
      });
      results = admins.map((a) => ({
        id: a.id, name: a.name,
        code: a.schoolAdminProfile?.employeeId || a.email,
        extra: a.schoolAdminProfile?.designation || "Admin",
      }));

    } else if (personType === "FINANCE") {
      const financeUsers = await prisma.user.findMany({
        where: {
          schoolId, role: "FINANCE", isActive: true, deletedAt: null,
          ...(searchFilter && { OR: [{ name: searchFilter }, { email: searchFilter }] }),
        },
        select: {
          id: true, name: true, email: true,
          financeProfile: { select: { employeeCode: true, designation: true } },
        },
        take: 50,
        orderBy: { name: "asc" },
      });
      results = financeUsers.map((f) => ({
        id: f.id, name: f.name,
        code: f.financeProfile?.employeeCode || f.email,
        extra: f.financeProfile?.designation || "Finance",
      }));

    } else {
      return res.status(400).json({ success: false, message: "Invalid personType" });
    }

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/biometric/mappings?schoolId=&personType=&isActive=
// ─────────────────────────────────────────────────────────────────────────────
export const getMappings = async (req, res) => {
  try {
    const { schoolId, personType, isActive } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: "schoolId is required" });
    }
    const where = { schoolId };
    if (personType && personType !== "ALL") where.personType = personType.includes(",") ? { in: personType.split(",").map(s=>s.trim()).filter(Boolean) } : personType;
    if (isActive === "true")  where.isActive = true;
    if (isActive === "false") where.isActive = false;

    const mappings = await prisma.biometricUserMapping.findMany({
      where,
      select: {
        id: true, enrollmentId: true, personType: true,
        isActive: true, assignedAt: true, deactivatedAt: true,
        student: { select: { id: true, name: true, studentCode: true } },
        teacher: { select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true } },
        staff:   { select: { id: true, firstName: true, lastName: true, role: true } },
        user: {
          select: {
            id: true, name: true, role: true,
            schoolAdminProfile: { select: { employeeId: true } },
            financeProfile:     { select: { employeeCode: true } },
          },
        },
        assignedBy: { select: { id: true, name: true } },
        _count: { select: { logs: true } },
      },
      orderBy: { assignedAt: "desc" },
    });

    const data = mappings.map((m) => {
      let personName = "—", personCode = "—", personExtra = "";
      if (m.personType === "STUDENT" && m.student) {
        personName = m.student.name;
        personCode = m.student.studentCode || "—";
      } else if (m.personType === "TEACHER" && m.teacher) {
        personName  = `${m.teacher.firstName} ${m.teacher.lastName}`;
        personCode  = m.teacher.employeeCode;
        personExtra = m.teacher.designation || "";
      } else if (m.personType === "STAFF" && m.staff) {
        personName  = `${m.staff.firstName} ${m.staff.lastName}`;
        personCode  = "—";
        personExtra = m.staff.role || "";
      } else if ((m.personType === "ADMIN" || m.personType === "FINANCE") && m.user) {
        personName = m.user.name;
        personCode = m.user.schoolAdminProfile?.employeeId || m.user.financeProfile?.employeeCode || "—";
      }
      return {
        id: m.id, enrollmentId: m.enrollmentId, personType: m.personType,
        personName, personCode, personExtra,
        isActive: m.isActive, assignedAt: m.assignedAt, deactivatedAt: m.deactivatedAt,
        assignedBy: m.assignedBy?.name || "—",
        totalPunches: m._count.logs,
      };
    });

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/biometric/mappings
// ─────────────────────────────────────────────────────────────────────────────
export const assignMapping = async (req, res) => {
  try {
    const { schoolId, personType, personId, deviceId, enrollmentId, assignedById } = req.body;
    if (!schoolId || !personType || !personId || !enrollmentId) {
      return res.status(400).json({ success: false, message: "schoolId, personType, personId, and enrollmentId are required" });
    }
    const conflict = await prisma.biometricUserMapping.findFirst({
      where: { schoolId, enrollmentId, isActive: true },
    });
    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `Enrollment ID "${enrollmentId}" is already active for another person in this school. Deactivate it first.`,
      });
    }
    if (deviceId) {
      const device = await prisma.biometricDevice.findFirst({ where: { id: deviceId, schoolId, isActive: true } });
      if (!device) return res.status(404).json({ success: false, message: "Device not found or inactive" });
    }
    const personFields = {};
    if (personType === "STUDENT")        personFields.studentId = personId;
    else if (personType === "TEACHER")   personFields.teacherId = personId;
    else if (personType === "STAFF")     personFields.staffId   = personId;
    else if (personType === "ADMIN" || personType === "FINANCE") personFields.userId = personId;
    else return res.status(400).json({ success: false, message: "Invalid personType" });

    const mapping = await prisma.biometricUserMapping.create({
      data: { schoolId, enrollmentId, personType, ...personFields, assignedById: assignedById || null, isActive: true, assignedAt: new Date() },
    });
    return res.status(201).json({ success: true, data: mapping });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/biometric/mappings/:id/deactivate
// ─────────────────────────────────────────────────────────────────────────────
export const deactivateMapping = async (req, res) => {
  try {
    const { id } = req.params;
    const mapping = await prisma.biometricUserMapping.findUnique({ where: { id } });
    if (!mapping) return res.status(404).json({ success: false, message: "Mapping not found" });
    if (!mapping.isActive) return res.status(400).json({ success: false, message: "Mapping is already inactive" });
    const updated = await prisma.biometricUserMapping.update({
      where: { id },
      data: { isActive: false, deactivatedAt: new Date() },
    });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/biometric/stats
// ─────────────────────────────────────────────────────────────────────────────
// export const getStats = async (req, res) => {
//   try {
//     const universityId = req.user?.universityId;
//     if (!universityId) {
//       return res.status(400).json({ success: false, message: "universityId missing in token" });
//     }
//     const schools = await prisma.school.findMany({ where: { universityId }, select: { id: true } });
//     const schoolIds = schools.map((s) => s.id);

//     const todayStart = new Date();
//     todayStart.setHours(0, 0, 0, 0);

//     const [totalDevices, mappedUsers, todayPunches, unmappedPunches] = await Promise.all([
//       prisma.biometricDevice.count({ where: { isActive: true, schoolId: { in: schoolIds } } }),
//       prisma.biometricUserMapping.count({ where: { isActive: true, schoolId: { in: schoolIds } } }),
//       prisma.biometricLog.count({ where: { schoolId: { in: schoolIds }, punchDateTime: { gte: todayStart } } }),
//       prisma.biometricLog.count({ where: { schoolId: { in: schoolIds }, biometricUserMappingId: null } }),
//     ]);

//     return res.status(200).json({ success: true, data: { totalDevices, mappedUsers, todayPunches, unmappedPunches } });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ success: false, message: error.message });
//   }
// };
export const getStats = async (req, res) => {
  try {
    const universityId = req.user?.universityId;
    if (!universityId) {
      return res.status(400).json({ success: false, message: "universityId missing in token" });
    }
    const schools = await prisma.school.findMany({ where: { universityId }, select: { id: true } });
    const schoolIds = schools.map((s) => s.id);

    const now = new Date();
    const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
    const dateStr = istNow.toISOString().slice(0, 10);
    const todayStart = new Date(dateStr + "T00:00:00+05:30");

    const [totalDevices, mappedUsers, todayPunches, unmappedPunches] = await Promise.all([
      prisma.biometricDevice.count({ where: { isActive: true, schoolId: { in: schoolIds } } }),
      prisma.biometricUserMapping.count({ where: { isActive: true, schoolId: { in: schoolIds } } }),
      prisma.biometricLog.count({ where: { schoolId: { in: schoolIds }, punchDateTime: { gte: todayStart } } }),
      prisma.biometricLog.count({ where: { schoolId: { in: schoolIds }, biometricUserMappingId: null } }),
    ]);

    return res.status(200).json({ success: true, data: { totalDevices, mappedUsers, todayPunches, unmappedPunches } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/biometric/devices
// ─────────────────────────────────────────────────────────────────────────────
export const addDevice = async (req, res) => {
  try {
    const { schoolId, deviceName, deviceCode, serialNo } = req.body;
    if (!schoolId || !deviceCode || !serialNo) {
      return res.status(400).json({ success: false, message: "schoolId, deviceCode, and serialNo are required" });
    }
    const existing = await prisma.biometricDevice.findFirst({
      where: { schoolId, OR: [{ deviceCode }, { serialNo }] },
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `A device with deviceCode "${deviceCode}" or serialNo "${serialNo}" already exists in this school.`,
      });
    }
    const device = await prisma.biometricDevice.create({
      data: { schoolId, deviceName, deviceCode, serialNo, isActive: true },
    });
    return res.status(201).json({ success: true, data: device });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/biometric/devices/:id/toggle
// ─────────────────────────────────────────────────────────────────────────────
export const toggleDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const device = await prisma.biometricDevice.findUnique({ where: { id } });
    if (!device) return res.status(404).json({ success: false, message: "Device not found" });
    const updated = await prisma.biometricDevice.update({ where: { id }, data: { isActive: !device.isActive } });
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/biometric/devices (full — with school name, supports includeInactive)
// ─────────────────────────────────────────────────────────────────────────────
export const getDevicesFull = async (req, res) => {
  try {
    const universityId = req.user?.universityId;
    const { schoolId, includeInactive } = req.query;
    if (!universityId) {
      return res.status(400).json({ success: false, message: "universityId missing in token" });
    }
    const where = { school: { universityId } };
    if (schoolId) where.schoolId = schoolId;
    if (includeInactive !== "true") where.isActive = true;

    const devices = await prisma.biometricDevice.findMany({
      where,
      select: {
        id: true, deviceCode: true, serialNo: true, deviceName: true,
        isActive: true, createdAt: true,
        school: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ school: { name: "asc" } }, { deviceName: "asc" }],
    });
    return res.status(200).json({ success: true, data: devices });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/biometric/attendance-logs
// Returns per-person per-day summary: firstPunch (entry) + lastPunch (exit)
// Groups raw BiometricLog records — much cleaner than raw punch list
// ─────────────────────────────────────────────────────────────────────────────
export const getAttendanceLogs = async (req, res) => {
  try {
    const universityId = req.user?.universityId;
    const { schoolId, from, to, personType, page = "1", limit = "20" } = req.query;

    if (!universityId) {
      return res.status(400).json({ success: false, message: "universityId missing in token" });
    }

    // Date range — default to today IST
    const nowIST    = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayStr  = nowIST.toISOString().slice(0, 10);
    const fromStr   = from || todayStr;
    const toStr     = to   || todayStr;

    const fromDate  = new Date(fromStr + "T00:00:00+05:30");
    const toDate    = new Date(toStr   + "T23:59:59+05:30");

    const where = { school: { universityId }, punchDateTime: { gte: fromDate, lte: toDate } };
    if (schoolId)                              where.schoolId  = schoolId;
    if (personType && personType !== "ALL")    where.personType = personType.includes(",") ? { in: personType.split(",").map(s=>s.trim()).filter(Boolean) } : personType;
    // Only mapped punches for attendance summary
    where.biometricUserMappingId = { not: null };

    // Fetch all punches in range (no pagination at raw level — we group first)
    const rawLogs = await prisma.biometricLog.findMany({
      where,
      orderBy: { punchDateTime: "asc" },
      select: {
        id: true, punchDateTime: true, personType: true,
        biometricUserMappingId: true, schoolId: true,
        studentId: true, teacherId: true, staffId: true, userId: true,
        biometricDevice: { select: { deviceName: true, deviceCode: true } },
        student: { select: { name: true, studentCode: true } },
        teacher: { select: { firstName: true, lastName: true, employeeCode: true } },
        staff:   { select: { firstName: true, lastName: true } },
        user:    { select: { name: true } },
      },
    });

    // ── Group by personId + IST date ──────────────────────────────────────────
    const groups = new Map(); // key = "personId|dateStr"

    for (const log of rawLogs) {
      if (!log.punchDateTime) continue;

      // Convert to IST date
      const istMs   = log.punchDateTime.getTime() + 5.5 * 60 * 60 * 1000;
      const dateStr = new Date(istMs).toISOString().slice(0, 10);

      // Determine person
      let personId   = null;
      let personName = null;
      let personCode = null;

      if (log.personType === "STUDENT" && log.studentId) {
        personId   = log.studentId;
        personName = log.student?.name || "Unknown";
        personCode = log.student?.studentCode || null;
      } else if (log.personType === "TEACHER" && log.teacherId) {
        personId   = log.teacherId;
        personName = log.teacher ? `${log.teacher.firstName} ${log.teacher.lastName}` : "Unknown";
        personCode = log.teacher?.employeeCode || null;
      } else if (log.personType === "STAFF" && log.staffId) {
        personId   = log.staffId;
        personName = log.staff ? `${log.staff.firstName} ${log.staff.lastName}` : "Unknown";
      } else if (log.userId) {
        personId   = log.userId;
        personName = log.user?.name || "Unknown";
      }

      if (!personId) continue;

      const key = `${personId}|${dateStr}`;
      if (!groups.has(key)) {
        groups.set(key, {
          personId,
          personName,
          personCode,
          personType:  log.personType,
          date:        dateStr,
          schoolId:    log.schoolId,
          firstPunch:  log.punchDateTime,  // earliest
          lastPunch:   log.punchDateTime,  // will update
          punchCount:  0,
          deviceName:  log.biometricDevice?.deviceName || null,
          deviceCode:  log.biometricDevice?.deviceCode || null,
        });
      }

      const g = groups.get(key);
      g.punchCount++;
      if (log.punchDateTime < g.firstPunch) g.firstPunch = log.punchDateTime;
      if (log.punchDateTime > g.lastPunch)  g.lastPunch  = log.punchDateTime;
    }

    // ── Convert to array, compute worked time and status ──────────────────────
    const fmtTime = (dt) => dt
      ? new Date(dt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true })
      : null;

    let summaries = Array.from(groups.values()).map((g) => {
      const sameTime      = g.firstPunch.getTime() === g.lastPunch.getTime();
      const workedMinutes = sameTime ? null : Math.floor((g.lastPunch - g.firstPunch) / 60000);
      const hasExit       = g.punchCount >= 2 && !sameTime;

      return {
        personId:     g.personId,
        personName:   g.personName,
        personCode:   g.personCode,
        personType:   g.personType,
        date:         g.date,
        firstPunch:   g.firstPunch,   // entry time (raw UTC)
        lastPunch:    hasExit ? g.lastPunch : null,  // null if only 1 punch
        firstPunchFmt: fmtTime(g.firstPunch),
        lastPunchFmt:  hasExit ? fmtTime(g.lastPunch) : null,
        workedMinutes,
        workedFmt:    workedMinutes != null
          ? `${Math.floor(workedMinutes / 60)}h ${workedMinutes % 60}m`
          : null,
        punchCount:   g.punchCount,
        hasExit,
        deviceName:   g.deviceName,
        deviceCode:   g.deviceCode,
      };
    });

    // Sort by date desc, then personName asc
    summaries.sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (a.personName || "").localeCompare(b.personName || "");
    });

    // Paginate after grouping
    const total      = summaries.length;
    const pageNum    = parseInt(page);
    const limitNum   = parseInt(limit);
    const skip       = (pageNum - 1) * limitNum;
    const paginated  = summaries.slice(skip, skip + limitNum);

    return res.status(200).json({
      success: true,
      data:    paginated,
      meta:    { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });

  } catch (error) {
    console.error("[getAttendanceLogs]", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/biometric/attendance-report
// Query: schoolId, from, to, personTypes  (comma-separated, e.g. "TEACHER,STAFF")
//
// GENERIC version of getTeacherAttendanceReport — supports downloading
// MULTIPLE person types in one go (e.g. Teacher + Staff together), not just
// Teacher. Bank info (bankName/bankAccountNo/ifscCode) is included for
// TEACHER and STAFF (both have bank fields in schema); left null for
// STUDENT/ADMIN/FINANCE since those have no bank fields.
//
// NO PAGINATION — this always returns the full result set for the given
// date range and person types. The on-screen table (getAttendanceLogs) is
// paginated for display only; this export endpoint is intentionally not.
// ─────────────────────────────────────────────────────────────────────────────
export const getBiometricAttendanceReport = async (req, res) => {
  try {
    const universityId = req.user?.universityId;
    const { schoolId, from, to, personTypes } = req.query;

    if (!universityId) {
      return res.status(400).json({ success: false, message: "universityId missing in token" });
    }
    if (!schoolId) {
      return res.status(400).json({ success: false, message: "schoolId is required" });
    }

    const ALL_TYPES = ["STUDENT", "TEACHER", "STAFF", "ADMIN", "FINANCE"];
    const types = personTypes
      ? personTypes.split(",").map((s) => s.trim().toUpperCase()).filter((t) => ALL_TYPES.includes(t))
      : ALL_TYPES;

    if (!types.length) {
      return res.status(400).json({ success: false, message: "No valid personTypes provided" });
    }

    // Date range — default to current month IST if not provided
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const defaultFrom = new Date(nowIST.getFullYear(), nowIST.getMonth(), 1).toISOString().slice(0, 10);
    const defaultTo   = nowIST.toISOString().slice(0, 10);
    const fromStr = from || defaultFrom;
    const toStr   = to   || defaultTo;

    const fromDate = new Date(fromStr + "T00:00:00+05:30");
    const toDate   = new Date(toStr   + "T23:59:59+05:30");

    // ── 1. Raw punches in range for the requested person types ────────────────
    // No skip/take here — full dataset for export, deliberately unpaginated.
    const rawLogs = await prisma.biometricLog.findMany({
      where: {
        school: { universityId },
        schoolId,
        personType: { in: types },
        biometricUserMappingId: { not: null },
        punchDateTime: { gte: fromDate, lte: toDate },
      },
      orderBy: { punchDateTime: "asc" },
      select: {
        punchDateTime: true,
        personType: true,
        studentId: true, teacherId: true, staffId: true, userId: true,
        student: { select: { name: true, studentCode: true } },
        teacher: {
          select: {
            firstName: true, lastName: true, employeeCode: true,
            bankName: true, bankAccountNo: true, ifscCode: true,
          },
        },
        staff: {
          select: {
            firstName: true, lastName: true, role: true,
            bankName: true, bankAccountNo: true, ifscCode: true,
          },
        },
        user: { select: { name: true } },
      },
    });

    // ── 2. Group by (personType|personId), then by IST date ───────────────────
    const personMap = new Map();

    for (const log of rawLogs) {
      if (!log.punchDateTime) continue;

      let personId = null, name = null, code = null;
      let bankName = null, bankAccountNo = null, ifscCode = null;

      if (log.personType === "STUDENT" && log.studentId) {
        personId = log.studentId;
        name     = log.student?.name || "Unknown";
        code     = log.student?.studentCode || null;
      } else if (log.personType === "TEACHER" && log.teacherId) {
        personId      = log.teacherId;
        name          = log.teacher ? `${log.teacher.firstName} ${log.teacher.lastName}`.trim() : "Unknown";
        code          = log.teacher?.employeeCode || null;
        bankName      = log.teacher?.bankName || null;
        bankAccountNo = log.teacher?.bankAccountNo || null;
        ifscCode      = log.teacher?.ifscCode || null;
      } else if (log.personType === "STAFF" && log.staffId) {
        personId      = log.staffId;
        name          = log.staff ? `${log.staff.firstName} ${log.staff.lastName}`.trim() : "Unknown";
        code          = log.staff?.role || null;
        bankName      = log.staff?.bankName || null;
        bankAccountNo = log.staff?.bankAccountNo || null;
        ifscCode      = log.staff?.ifscCode || null;
      } else if (log.userId) {
        // ADMIN / FINANCE
        personId = log.userId;
        name     = log.user?.name || "Unknown";
      }

      if (!personId) continue;

      const key = `${log.personType}|${personId}`;
      if (!personMap.has(key)) {
        personMap.set(key, {
          personId, personType: log.personType, name, code,
          bankName, bankAccountNo, ifscCode,
          days: new Map(),
        });
      }

      const p = personMap.get(key);
      const istMs   = log.punchDateTime.getTime() + 5.5 * 60 * 60 * 1000;
      const dateStr = new Date(istMs).toISOString().slice(0, 10);

      if (!p.days.has(dateStr)) {
        p.days.set(dateStr, { firstPunch: log.punchDateTime, lastPunch: log.punchDateTime, punchCount: 0 });
      }
      const d = p.days.get(dateStr);
      d.punchCount++;
      if (log.punchDateTime < d.firstPunch) d.firstPunch = log.punchDateTime;
      if (log.punchDateTime > d.lastPunch)  d.lastPunch  = log.punchDateTime;
    }

    // ── 3. Shape final response ────────────────────────────────────────────────
    const fmtTime = (dt) => dt
      ? new Date(dt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true })
      : null;

    const persons = Array.from(personMap.values())
      .map((p) => {
        const days = Array.from(p.days.entries())
          .map(([date, d]) => {
            const sameTime = d.firstPunch.getTime() === d.lastPunch.getTime();
            const hasExit  = d.punchCount >= 2 && !sameTime;
            const workedMinutes = hasExit ? Math.floor((d.lastPunch - d.firstPunch) / 60000) : null;
            return {
              date,
              punchIn:  fmtTime(d.firstPunch),
              punchOut: hasExit ? fmtTime(d.lastPunch) : null,
              workedFmt: workedMinutes != null ? `${Math.floor(workedMinutes / 60)}h ${workedMinutes % 60}m` : null,
              punchCount: d.punchCount,
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date));

        return {
          personId:      p.personId,
          personType:    p.personType,
          name:          p.name,
          code:          p.code,
          bankName:      p.bankName,
          bankAccountNo: p.bankAccountNo,
          ifscCode:      p.ifscCode,
          days,
        };
      })
      .sort((a, b) => {
        if (a.personType !== b.personType) return a.personType.localeCompare(b.personType);
        return (a.name || "").localeCompare(b.name || "");
      });

    return res.status(200).json({
      success: true,
      data: persons,
      meta: { from: fromStr, to: toStr, schoolId, personTypes: types, personCount: persons.length },
    });

  } catch (error) {
    console.error("[getBiometricAttendanceReport]", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/biometric/teacher-attendance-report
// Query: schoolId, from, to
//
// Returns TEACHER-only data, grouped by teacher, for building the
// "one workbook / one sheet per teacher" Excel download on the frontend.
// Includes bank details (bankName / bankAccountNo / ifscCode) so the sheet
// can show them if present, and skip them cleanly if not.
// (Kept for backward compatibility — new downloads should use
//  getBiometricAttendanceReport above, which supports multiple person types.)
// ─────────────────────────────────────────────────────────────────────────────
export const getTeacherAttendanceReport = async (req, res) => {
  try {
    const universityId = req.user?.universityId;
    const { schoolId, from, to } = req.query;

    if (!universityId) {
      return res.status(400).json({ success: false, message: "universityId missing in token" });
    }
    if (!schoolId) {
      return res.status(400).json({ success: false, message: "schoolId is required" });
    }

    // Date range — default to current month IST if not provided
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const defaultFrom = new Date(nowIST.getFullYear(), nowIST.getMonth(), 1).toISOString().slice(0, 10);
    const defaultTo   = nowIST.toISOString().slice(0, 10);
    const fromStr = from || defaultFrom;
    const toStr   = to   || defaultTo;

    const fromDate = new Date(fromStr + "T00:00:00+05:30");
    const toDate   = new Date(toStr   + "T23:59:59+05:30");

    // ── 1. Raw teacher punches in range ───────────────────────────────────────
    const rawLogs = await prisma.biometricLog.findMany({
      where: {
        school: { universityId },
        schoolId,
        personType: "TEACHER",
        teacherId: { not: null },
        biometricUserMappingId: { not: null },
        punchDateTime: { gte: fromDate, lte: toDate },
      },
      orderBy: { punchDateTime: "asc" },
      select: {
        punchDateTime: true,
        teacherId: true,
        teacher: {
          select: {
            firstName: true, lastName: true, employeeCode: true,
            bankName: true, bankAccountNo: true, ifscCode: true,
          },
        },
      },
    });

    // ── 2. Group by teacherId, then by IST date ───────────────────────────────
    const teacherMap = new Map(); // teacherId -> { info, days: Map(dateStr -> {first,last,count}) }

    for (const log of rawLogs) {
      if (!log.punchDateTime || !log.teacherId || !log.teacher) continue;

      const istMs   = log.punchDateTime.getTime() + 5.5 * 60 * 60 * 1000;
      const dateStr = new Date(istMs).toISOString().slice(0, 10);

      if (!teacherMap.has(log.teacherId)) {
        teacherMap.set(log.teacherId, {
          teacherId:     log.teacherId,
          name:          `${log.teacher.firstName} ${log.teacher.lastName}`.trim(),
          employeeCode:  log.teacher.employeeCode || null,
          bankName:      log.teacher.bankName || null,
          bankAccountNo: log.teacher.bankAccountNo || null,
          ifscCode:      log.teacher.ifscCode || null,
          days:          new Map(),
        });
      }

      const t = teacherMap.get(log.teacherId);
      if (!t.days.has(dateStr)) {
        t.days.set(dateStr, { firstPunch: log.punchDateTime, lastPunch: log.punchDateTime, punchCount: 0 });
      }
      const d = t.days.get(dateStr);
      d.punchCount++;
      if (log.punchDateTime < d.firstPunch) d.firstPunch = log.punchDateTime;
      if (log.punchDateTime > d.lastPunch)  d.lastPunch  = log.punchDateTime;
    }

    // ── 3. Shape final response ────────────────────────────────────────────────
    const fmtTime = (dt) => dt
      ? new Date(dt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true })
      : null;

    const teachers = Array.from(teacherMap.values())
      .map((t) => {
        const days = Array.from(t.days.entries())
          .map(([date, d]) => {
            const sameTime = d.firstPunch.getTime() === d.lastPunch.getTime();
            const hasExit  = d.punchCount >= 2 && !sameTime;
            const workedMinutes = hasExit ? Math.floor((d.lastPunch - d.firstPunch) / 60000) : null;
            return {
              date,
              punchIn:  fmtTime(d.firstPunch),
              punchOut: hasExit ? fmtTime(d.lastPunch) : null,
              workedFmt: workedMinutes != null ? `${Math.floor(workedMinutes / 60)}h ${workedMinutes % 60}m` : null,
              punchCount: d.punchCount,
            };
          })
          .sort((a, b) => a.date.localeCompare(b.date));

        return {
          teacherId:     t.teacherId,
          name:          t.name,
          employeeCode:  t.employeeCode,
          bankName:      t.bankName,
          bankAccountNo: t.bankAccountNo,
          ifscCode:      t.ifscCode,
          days,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return res.status(200).json({
      success: true,
      data: teachers,
      meta: { from: fromStr, to: toStr, schoolId, teacherCount: teachers.length },
    });

  } catch (error) {
    console.error("[getTeacherAttendanceReport]", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/biometric/logs
// ─────────────────────────────────────────────────────────────────────────────
export const getLogs = async (req, res) => {
  try {
    const universityId = req.user?.universityId;
    const { schoolId, from, to, personType, mapped, page = "1", limit = "20" } = req.query;

    if (!universityId) {
      return res.status(400).json({ success: false, message: "universityId missing in token" });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = { school: { universityId } };
    if (schoolId) where.schoolId = schoolId;
    if (personType && personType !== "ALL") where.personType = personType.includes(",") ? { in: personType.split(",").map(s=>s.trim()).filter(Boolean) } : personType;

    if (from || to) {
      where.punchDateTime = {};
      if (from) where.punchDateTime.gte = new Date(from);
      if (to) {
        const toEnd = new Date(to);
        toEnd.setHours(23, 59, 59, 999);
        where.punchDateTime.lte = toEnd;
      }
    }

    if (mapped === "true")  where.biometricUserMappingId = { not: null };
    if (mapped === "false") where.biometricUserMappingId = null;

    const [total, rawLogs] = await Promise.all([
      prisma.biometricLog.count({ where }),
      prisma.biometricLog.findMany({
        where, skip, take,
        orderBy: { punchDateTime: "desc" },
        select: {
          id: true, punchDateTime: true, punchMode: true, personType: true,
          biometricUserMappingId: true, rawData: true,
          biometricDevice: { select: { deviceName: true, deviceCode: true } },
          student: { select: { name: true, studentCode: true } },
          teacher: { select: { firstName: true, lastName: true, employeeCode: true } },
          staff:   { select: { firstName: true, lastName: true } },
          user:    { select: { name: true } },
        },
      }),
    ]);

    const logs = rawLogs.map((log) => {
      let personName = null, personCode = null;
      if (log.personType === "STUDENT" && log.student) {
        personName = log.student.name;
        personCode = log.student.studentCode;
      } else if (log.personType === "TEACHER" && log.teacher) {
        personName = `${log.teacher.firstName} ${log.teacher.lastName}`;
        personCode = log.teacher.employeeCode;
      } else if (log.personType === "STAFF" && log.staff) {
        personName = `${log.staff.firstName} ${log.staff.lastName}`;
      } else if ((log.personType === "ADMIN" || log.personType === "FINANCE") && log.user) {
        personName = log.user.name;
      }
      return {
        id: log.id, punchDateTime: log.punchDateTime,
        punchMode: log.punchMode, personType: log.personType,
        personName, personCode,
        biometricUserMappingId: log.biometricUserMappingId,
        deviceName: log.biometricDevice?.deviceName || null,
        deviceCode: log.biometricDevice?.deviceCode || null,
        rawData: log.rawData,
      };
    });

    return res.status(200).json({
      success: true,
      data: logs,
      meta: { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * POST /api/biometric/trigger-attendance
 * Body: { schoolId, type: "present" | "absent" | "both" }
 *
 * Manual backup trigger — admin fires this if cron missed or server restarted.
 * Only works for schools that have at least one active biometric device.
 */
export const triggerBiometricAttendance = async (req, res) => {
  try {
    const { schoolId, type = "both" } = req.body;
 
    if (!schoolId) {
      return res.status(400).json({ success: false, message: "schoolId is required" });
    }
 
    // Verify school has an active biometric device
    const hasDevice = await prisma.biometricDevice.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true },
    });
 
    if (!hasDevice) {
      return res.status(400).json({
        success: false,
        message: "This school has no active biometric device. Use manual attendance instead.",
      });
    }
 
    // Fire in background — don't await, respond immediately
    if (type === "present" || type === "both") {
      processPresent(schoolId).catch((err) =>
        console.error("[ManualTrigger] processPresent error:", err)
      );
    }
 
    if (type === "absent" || type === "both") {
      processAbsent(schoolId).catch((err) =>
        console.error("[ManualTrigger] processAbsent error:", err)
      );
    }
 
    return res.json({
      success: true,
      message: `Biometric attendance processing triggered (type: ${type}). Notifications will be sent shortly.`,
    });
 
  } catch (err) {
    console.error("[triggerBiometricAttendance]", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};