import { prisma } from "../config/db.js";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/biometric/punch
// Receives raw punch data from biometric device, resolves device → school →
// user mapping, and stores in BiometricLog (never rejects raw data).
// ─────────────────────────────────────────────────────────────────────────────
export const receivePunch = async (req, res) => {
  try {
    const records = Array.isArray(req.body) ? req.body : [req.body];

    let inserted = 0;
    let skipped = 0;

    for (const item of records) {
      const enrollmentId = item.EnrollmentId || item.EnrollmentID || null;
      const deviceCode   = item.DevicesId?.toString() || item.DeviceId?.toString() || null;
      const deviceName   = item.DeviceName || null;
      const serialNo     = item.SerialNo || null;
      const punchMode    = item.PunchMode || null;
      const punchDateTime = item.PunchDateAndTime ? new Date(item.PunchDateAndTime) : null;

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
          biometricDeviceId:       device?.id     || null,
          biometricUserMappingId:  mapping?.id    || null,
          academicYearId:          academicYear?.id || null,
          personType:              mapping?.personType || null,
          studentId:               mapping?.studentId || null,
          teacherId:               mapping?.teacherId || null,
          staffId:                 mapping?.staffId   || null,
          userId:                  mapping?.userId    || null,
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
// Returns only the schools that belong to the logged-in super admin's university.
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
// Returns active devices for a school.
// ─────────────────────────────────────────────────────────────────────────────
export const getDevices = async (req, res) => {
  try {
    const { schoolId } = req.query;

    if (!schoolId) {
      return res.status(400).json({ success: false, message: "schoolId is required" });
    }

    const devices = await prisma.biometricDevice.findMany({
      where: { schoolId, isActive: true },
      select: {
        id:         true,
        deviceCode: true,
        serialNo:   true,
        deviceName: true,
      },
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
// Returns all active ClassSections for a school (used for student class filter).
// ─────────────────────────────────────────────────────────────────────────────
export const getClasses = async (req, res) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) {
      return res.status(400).json({ success: false, message: "schoolId is required" });
    }

    // Get active academic year first
    const activeYear = await prisma.academicYear.findFirst({
      where: { schoolId, isActive: true },
      select: { id: true },
    });

    // Get class sections that have enrollments in the active year
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
        id:      true,
        name:    true,
        grade:   true,
        section: true,
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
      id:           c.id,
      name:         c.name,
      grade:        c.grade,
      section:      c.section,
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
// Searches persons by name/code depending on personType.
// For STUDENT: supports classSectionId to filter by class.
// personType: STUDENT | TEACHER | STAFF | ADMIN | FINANCE
// ─────────────────────────────────────────────────────────────────────────────
export const searchPersons = async (req, res) => {
  try {
    const { schoolId, personType, q, classSectionId } = req.query;

    if (!schoolId || !personType) {
      return res.status(400).json({ success: false, message: "schoolId and personType are required" });
    }

    const search = (q || "").trim();
    const searchFilter = search
      ? { contains: search, mode: "insensitive" }
      : undefined;

    let results = [];

    if (personType === "STUDENT") {
      // Get active academic year for this school
      const activeYear = await prisma.academicYear.findFirst({
        where: { schoolId, isActive: true },
        select: { id: true },
      });

      // Build student where clause
      const studentWhere = {
        schoolId,
        isActive: true,
        deletedAt: null,
        // Filter by class section if provided
        ...(classSectionId && {
          enrollments: {
            some: {
              classSectionId,
              status: "ACTIVE",
              ...(activeYear && { academicYearId: activeYear.id }),
            },
          },
        }),
        // Search filter
        ...(searchFilter && {
          OR: [
            { name: searchFilter },
            { studentCode: searchFilter },
          ],
        }),
      };

      const students = await prisma.student.findMany({
        where: studentWhere,
        select: {
          id:          true,
          name:        true,
          studentCode: true,
          enrollments: {
            where: {
              status: "ACTIVE",
              ...(activeYear && { academicYearId: activeYear.id }),
            },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              rollNumber: true,
              classSection: {
                select: { name: true },
              },
            },
          },
        },
        take: 50,
        orderBy: { name: "asc" },
      });

      results = students.map((s) => ({
        id:    s.id,
        name:  s.name,
        code:  s.studentCode || "—",
        extra: s.enrollments?.[0]?.classSection?.name || "Student",
        rollNumber: s.enrollments?.[0]?.rollNumber || null,
      }));

    } else if (personType === "TEACHER") {
      const teachers = await prisma.teacherProfile.findMany({
        where: {
          schoolId,
          deletedAt: null,
          status: "ACTIVE",
          ...(searchFilter && {
            OR: [
              { firstName: searchFilter },
              { lastName:  searchFilter },
              { employeeCode: searchFilter },
            ],
          }),
        },
        select: {
          id:           true,
          firstName:    true,
          lastName:     true,
          employeeCode: true,
          department:   true,
          designation:  true,
        },
        take: 20,
        orderBy: { firstName: "asc" },
      });

      results = teachers.map((t) => ({
        id:    t.id,
        name:  `${t.firstName} ${t.lastName}`,
        code:  t.employeeCode,
        extra: t.designation || t.department || "Teacher",
      }));

    } else if (personType === "STAFF") {
      const staff = await prisma.staffProfile.findMany({
        where: {
          schoolId,
          deletedAt: null,
          status: "ACTIVE",
          ...(searchFilter && {
            OR: [
              { firstName: searchFilter },
              { lastName:  searchFilter },
            ],
          }),
        },
        select: {
          id:        true,
          firstName: true,
          lastName:  true,
          role:      true,
          groupType: true,
        },
        take: 20,
        orderBy: { firstName: "asc" },
      });

      results = staff.map((s) => ({
        id:    s.id,
        name:  `${s.firstName} ${s.lastName}`,
        code:  s.groupType || "STAFF",
        extra: s.role || "Staff",
      }));

    } else if (personType === "ADMIN") {
      // School Admin users (role = ADMIN)
      const admins = await prisma.user.findMany({
        where: {
          schoolId,
          role: "ADMIN",
          isActive: true,
          deletedAt: null,
          ...(searchFilter && {
            OR: [{ name: searchFilter }, { email: searchFilter }],
          }),
        },
        select: {
          id:    true,
          name:  true,
          email: true,
          schoolAdminProfile: {
            select: { employeeId: true, designation: true },
          },
        },
        take: 20,
        orderBy: { name: "asc" },
      });

      results = admins.map((a) => ({
        id:    a.id,
        name:  a.name,
        code:  a.schoolAdminProfile?.employeeId || a.email,
        extra: a.schoolAdminProfile?.designation || "Admin",
      }));

    } else if (personType === "FINANCE") {
      // Finance users (role = FINANCE)
      const financeUsers = await prisma.user.findMany({
        where: {
          schoolId,
          role: "FINANCE",
          isActive: true,
          deletedAt: null,
          ...(searchFilter && {
            OR: [{ name: searchFilter }, { email: searchFilter }],
          }),
        },
        select: {
          id:    true,
          name:  true,
          email: true,
          financeProfile: {
            select: { employeeCode: true, designation: true },
          },
        },
        take: 20,
        orderBy: { name: "asc" },
      });

      results = financeUsers.map((f) => ({
        id:    f.id,
        name:  f.name,
        code:  f.financeProfile?.employeeCode || f.email,
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
// Lists BiometricUserMapping records for a school with optional filters.
// ─────────────────────────────────────────────────────────────────────────────
export const getMappings = async (req, res) => {
  try {
    const { schoolId, personType, isActive } = req.query;

    if (!schoolId) {
      return res.status(400).json({ success: false, message: "schoolId is required" });
    }

    const where = { schoolId };

    if (personType && personType !== "ALL") {
      where.personType = personType;
    }

    if (isActive === "true")  where.isActive = true;
    if (isActive === "false") where.isActive = false;

    const mappings = await prisma.biometricUserMapping.findMany({
      where,
      select: {
        id:           true,
        enrollmentId: true,
        personType:   true,
        isActive:     true,
        assignedAt:   true,
        deactivatedAt: true,

        // Person details
        student: {
          select: {
            id:          true,
            name:        true,
            studentCode: true,
          },
        },
        teacher: {
          select: {
            id:           true,
            firstName:    true,
            lastName:     true,
            employeeCode: true,
            designation:  true,
          },
        },
        staff: {
          select: {
            id:        true,
            firstName: true,
            lastName:  true,
            role:      true,
          },
        },
        user: {
          select: {
            id:   true,
            name: true,
            role: true,
            schoolAdminProfile: { select: { employeeId: true } },
            financeProfile:     { select: { employeeCode: true } },
          },
        },

        // Who assigned
        assignedBy: {
          select: { id: true, name: true },
        },

        // Logs count
        _count: {
          select: { logs: true },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    // Normalise into flat shape for frontend
    const data = mappings.map((m) => {
      let personName = "—";
      let personCode = "—";
      let personExtra = "";

      if (m.personType === "STUDENT" && m.student) {
        personName  = m.student.name;
        personCode  = m.student.studentCode || "—";
      } else if (m.personType === "TEACHER" && m.teacher) {
        personName  = `${m.teacher.firstName} ${m.teacher.lastName}`;
        personCode  = m.teacher.employeeCode;
        personExtra = m.teacher.designation || "";
      } else if (m.personType === "STAFF" && m.staff) {
        personName  = `${m.staff.firstName} ${m.staff.lastName}`;
        personCode  = "—";
        personExtra = m.staff.role || "";
      } else if ((m.personType === "ADMIN" || m.personType === "FINANCE") && m.user) {
        personName  = m.user.name;
        personCode  = m.user.schoolAdminProfile?.employeeId
                   || m.user.financeProfile?.employeeCode
                   || "—";
      }

      return {
        id:            m.id,
        enrollmentId:  m.enrollmentId,
        personType:    m.personType,
        personName,
        personCode,
        personExtra,
        isActive:      m.isActive,
        assignedAt:    m.assignedAt,
        deactivatedAt: m.deactivatedAt,
        assignedBy:    m.assignedBy?.name || "—",
        totalPunches:  m._count.logs,
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
// Assigns an enrollment ID to a person for a school.
// Body: { schoolId, personType, personId, deviceId, enrollmentId, assignedById }
// ─────────────────────────────────────────────────────────────────────────────
export const assignMapping = async (req, res) => {
  try {
    const { schoolId, personType, personId, deviceId, enrollmentId, assignedById } = req.body;

    if (!schoolId || !personType || !personId || !enrollmentId) {
      return res.status(400).json({
        success: false,
        message: "schoolId, personType, personId, and enrollmentId are required",
      });
    }

    // Check if this enrollmentId is already active in this school
    const conflict = await prisma.biometricUserMapping.findFirst({
      where: { schoolId, enrollmentId, isActive: true },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `Enrollment ID "${enrollmentId}" is already active for another person in this school. Deactivate it first.`,
      });
    }

    // Check the device exists and belongs to the school (optional but recommended)
    if (deviceId) {
      const device = await prisma.biometricDevice.findFirst({
        where: { id: deviceId, schoolId, isActive: true },
      });

      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found or inactive" });
      }
    }

    // Build person FK fields
    const personFields = {};

    if (personType === "STUDENT") {
      personFields.studentId = personId;
    } else if (personType === "TEACHER") {
      personFields.teacherId = personId;
    } else if (personType === "STAFF") {
      personFields.staffId = personId;
    } else if (personType === "ADMIN" || personType === "FINANCE") {
      personFields.userId = personId;
    } else {
      return res.status(400).json({ success: false, message: "Invalid personType" });
    }

    const mapping = await prisma.biometricUserMapping.create({
      data: {
        schoolId,
        enrollmentId,
        personType,
        ...personFields,
        assignedById: assignedById || null,
        isActive: true,
        assignedAt: new Date(),
      },
    });

    return res.status(201).json({ success: true, data: mapping });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/biometric/mappings/:id/deactivate
// Soft-deactivates a mapping (card released, ready for re-use).
// ─────────────────────────────────────────────────────────────────────────────
export const deactivateMapping = async (req, res) => {
  try {
    const { id } = req.params;

    const mapping = await prisma.biometricUserMapping.findUnique({ where: { id } });

    if (!mapping) {
      return res.status(404).json({ success: false, message: "Mapping not found" });
    }

    if (!mapping.isActive) {
      return res.status(400).json({ success: false, message: "Mapping is already inactive" });
    }

    const updated = await prisma.biometricUserMapping.update({
      where: { id },
      data: {
        isActive:      false,
        deactivatedAt: new Date(),
      },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// GET /api/biometric/stats
// Summary counts for the BiometricManagement dashboard header.
// ─────────────────────────────────────────────────────────────────────────────
export const getStats = async (req, res) => {
  try {
    const universityId = req.user?.universityId;

    if (!universityId) {
      return res.status(400).json({ success: false, message: "universityId missing in token" });
    }

    // Resolve school IDs for this university
    const schools = await prisma.school.findMany({
      where: { universityId },
      select: { id: true },
    });
    const schoolIds = schools.map((s) => s.id);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalDevices, mappedUsers, todayPunches, unmappedPunches] = await Promise.all([
      prisma.biometricDevice.count({
        where: { isActive: true, schoolId: { in: schoolIds } },
      }),
      prisma.biometricUserMapping.count({
        where: { isActive: true, schoolId: { in: schoolIds } },
      }),
      prisma.biometricLog.count({
        where: { schoolId: { in: schoolIds }, punchDateTime: { gte: todayStart } },
      }),
      prisma.biometricLog.count({
        where: { schoolId: { in: schoolIds }, biometricUserMappingId: null },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: { totalDevices, mappedUsers, todayPunches, unmappedPunches },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/biometric/devices
// Add a new biometric device to a school.
// ─────────────────────────────────────────────────────────────────────────────
export const addDevice = async (req, res) => {
  try {
    const { schoolId, deviceName, deviceCode, serialNo } = req.body;

    if (!schoolId || !deviceCode || !serialNo) {
      return res.status(400).json({
        success: false,
        message: "schoolId, deviceCode, and serialNo are required",
      });
    }

    // Check uniqueness within school
    const existing = await prisma.biometricDevice.findFirst({
      where: {
        schoolId,
        OR: [{ deviceCode }, { serialNo }],
      },
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
// Toggle a device between active and inactive.
// ─────────────────────────────────────────────────────────────────────────────
export const toggleDevice = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await prisma.biometricDevice.findUnique({ where: { id } });
    if (!device) {
      return res.status(404).json({ success: false, message: "Device not found" });
    }

    const updated = await prisma.biometricDevice.update({
      where: { id },
      data:  { isActive: !device.isActive },
    });

    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Override getDevices to support includeInactive + school name in response
// ─────────────────────────────────────────────────────────────────────────────
export const getDevicesFull = async (req, res) => {
  try {
    const universityId = req.user?.universityId;
    const { schoolId, includeInactive } = req.query;

    if (!universityId) {
      return res.status(400).json({ success: false, message: "universityId missing in token" });
    }

    const where = {
      // Always scope to this university's schools
      school: { universityId },
    };
    if (schoolId) where.schoolId = schoolId;
    if (includeInactive !== "true") where.isActive = true;

    const devices = await prisma.biometricDevice.findMany({
      where,
      select: {
        id:         true,
        deviceCode: true,
        serialNo:   true,
        deviceName: true,
        isActive:   true,
        createdAt:  true,
        school: {
          select: { id: true, name: true, code: true },
        },
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
// GET /api/biometric/logs
// Paginated punch log viewer with filters.
// Query: schoolId, from, to, personType, mapped (true/false), page, limit
// ─────────────────────────────────────────────────────────────────────────────
export const getLogs = async (req, res) => {
  try {
    const universityId = req.user?.universityId;
    const {
      schoolId, from, to, personType, mapped,
      page = "1", limit = "20",
    } = req.query;

    if (!universityId) {
      return res.status(400).json({ success: false, message: "universityId missing in token" });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Scope to this university's schools
    const where = {
      school: { universityId },
    };

    if (schoolId)   where.schoolId   = schoolId;
    if (personType && personType !== "ALL") where.personType = personType;

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
        where,
        skip,
        take,
        orderBy: { punchDateTime: "desc" },
        select: {
          id:                    true,
          punchDateTime:         true,
          punchMode:             true,
          personType:            true,
          biometricUserMappingId: true,
          rawData:               true,

          biometricDevice: {
            select: { deviceName: true, deviceCode: true },
          },

          student: {
            select: { name: true, studentCode: true },
          },
          teacher: {
            select: { firstName: true, lastName: true, employeeCode: true },
          },
          staff: {
            select: { firstName: true, lastName: true },
          },
          user: {
            select: { name: true },
          },
        },
      }),
    ]);

    // Normalise person name
    const logs = rawLogs.map((log) => {
      let personName = null;
      let personCode = null;

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
        id:                     log.id,
        punchDateTime:          log.punchDateTime,
        punchMode:              log.punchMode,
        personType:             log.personType,
        personName,
        personCode,
        biometricUserMappingId: log.biometricUserMappingId,
        deviceName:             log.biometricDevice?.deviceName || null,
        deviceCode:             log.biometricDevice?.deviceCode || null,
        rawData:                log.rawData,
      };
    });

    return res.status(200).json({
      success: true,
      data:    logs,
      meta:    { total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};