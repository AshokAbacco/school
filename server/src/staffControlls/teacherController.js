// server/src/staffControlls/teacherController.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import cacheService from "../utils/cacheService.js";
import { uploadToR2, generateSignedUrl } from "../lib/r2.js";
const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

// ── POST /api/teachers/:id/profile-image ──────────────────────
export async function uploadProfileImage(req, res) {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    if (!req.file) return res.status(400).json({ error: "No file received" });

    const teacher = await prisma.teacherProfile.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const key = `schools/${schoolId}/teachers/${id}/profile/${Date.now()}-${req.file.originalname}`;

    await uploadToR2(key, req.file.buffer, req.file.mimetype);

    const updated = await prisma.teacherProfile.update({
      where: { id },
      data: { profileImage: key },
    });

    await cacheService.invalidateSchool(schoolId);
    res.json({ data: updated });
  } catch (err) {
    console.error("[uploadProfileImage]", err);
    res.status(500).json({ error: "Failed to upload profile image" });
  }
}

// ── GET /api/teachers/:id/profile-image ───────────────────────
export async function getProfileImage(req, res) {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    if (!req.user?.role) return res.status(401).json({ error: "Unauthorized" });

    const teacher = await prisma.teacherProfile.findFirst({
      where: { id, schoolId },
      select: { profileImage: true },
    });

    if (!teacher?.profileImage)
      return res.status(404).json({ error: "Profile image not found" });

    const expiresIn = 86400;
    const signedUrl = await generateSignedUrl(teacher.profileImage, expiresIn);

    res.json({ url: signedUrl, expiresIn });
  } catch (err) {
    console.error("[getProfileImage]", err);
    res.status(500).json({ error: "Failed to fetch profile image" });
  }
}

// ── POST /api/teachers/:id/documents ─────────────────────────
export async function uploadTeacherDocument(req, res) {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;
    const { documentType, customLabel } = req.body;

    if (!req.file) return res.status(400).json({ error: "No file received" });
    if (!documentType)
      return res.status(400).json({ error: "documentType is required" });

    const teacher = await prisma.teacherProfile.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const ext = req.file.originalname.split(".").pop();
    const key = `schools/${schoolId}/teachers/${id}/documents/${documentType}-${Date.now()}.${ext}`;
    await uploadToR2(key, req.file.buffer, req.file.mimetype);

    const doc = await prisma.teacherDocument.create({
      data: {
        teacherId: id,
        documentType,
        customLabel: customLabel || null,
        fileKey: key,
        fileType: ext.toLowerCase(),
        fileSizeBytes: req.file.size,
        isVerified: false,
      },
    });

    await cacheService.invalidateSchool(schoolId);
    res.status(201).json({ data: doc });
  } catch (err) {
    console.error("[uploadTeacherDocument]", err);
    res.status(500).json({ error: "Failed to upload document" });
  }
}

// ── GET /api/teachers ─────────────────────────────────────────
export async function getTeachers(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      status = "",
      department = "",
      employmentType = "",
    } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const schoolId = req.user?.schoolId;

    const cacheKey = await cacheService.buildKey(
      schoolId,
      `teachers:list:${JSON.stringify({ page, limit, search, status, department, employmentType })}`,
    );

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      const signedData = await Promise.all(
        parsed.data.map(async (t) => {
          if (t.profileImage) {
            try {
              t.profileImage = await generateSignedUrl(t.profileImage, 86400);
            } catch {
              t.profileImage = null;
            }
          }
          return t;
        }),
      );
      return res.json({ data: signedData, meta: parsed.meta, fromCache: true });
    }

    const where = {
      ...(schoolId ? { schoolId } : {}),
      ...(status && { status }),
      ...(employmentType && { employmentType }),
      ...(department && {
        department: { contains: department, mode: "insensitive" },
      }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { employeeCode: { contains: search, mode: "insensitive" } },
          { department: { contains: search, mode: "insensitive" } },
          { designation: { contains: search, mode: "insensitive" } },
          { user: { email: { contains: search, mode: "insensitive" } } },
        ],
      }),
    };

    const [data, total] = await prisma.$transaction([
      prisma.teacherProfile.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          department: true,
          designation: true,
          employmentType: true,
          status: true,
          joiningDate: true,
          phone: true,
          profileImage: true,
          experienceYears: true,
          bloodGroup: true,
          user: { select: { email: true, isActive: true } },
          assignments: {
            select: {
              id: true,
              academicYear: { select: { id: true, name: true } },
              classSection: {
                select: { id: true, name: true, grade: true, section: true },
              },
              subject: { select: { id: true, name: true, code: true } },
            },
          },
        },
      }),
      prisma.teacherProfile.count({ where }),
    ]);

    const meta = {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    };

    await cacheService.set(cacheKey, { data, meta });

    const signedData = await Promise.all(
      data.map(async (t) => {
        if (t.profileImage) {
          try {
            t.profileImage = await generateSignedUrl(t.profileImage, 86400);
          } catch {
            t.profileImage = null;
          }
        }
        return t;
      }),
    );

    res.json({ data: signedData, meta, fromCache: false });
  } catch (err) {
    console.error("[getTeachers]", err);
    res.status(500).json({ error: "Failed to fetch teachers" });
  }
}

// ── GET /api/teachers/:id ─────────────────────────────────────
export async function getTeacherById(req, res) {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;
    const cacheKey = await cacheService.buildKey(schoolId, `teachers:${id}`);

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      const teacher = JSON.parse(cached);
      if (teacher.profileImage) {
        teacher.profileImage = await generateSignedUrl(
          teacher.profileImage,
          86400,
        );
      }
      return res.json({ data: teacher, fromCache: true });
    }

    const teacher = await prisma.teacherProfile.findFirst({
      where: { id, schoolId },
      include: {
        user: {
          select: { id: true, email: true, isActive: true, lastLoginAt: true },
        },
        assignments: {
          include: {
            classSection: {
              select: { id: true, name: true, grade: true, section: true },
            },
            subject: { select: { id: true, name: true, code: true } },
            academicYear: { select: { id: true, name: true } },
          },
        },
        documents: {
          select: {
            id: true,
            documentType: true,
            customLabel: true,
            fileKey: true,
            fileType: true,
            fileSizeBytes: true,
            isVerified: true,
            verifiedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    await cacheService.set(cacheKey, teacher);

    if (teacher.profileImage) {
      teacher.profileImage = await generateSignedUrl(
        teacher.profileImage,
        86400,
      );
    }

    res.json({ data: teacher, fromCache: false });
  } catch (err) {
    console.error("[getTeacherById]", err);
    res.status(500).json({ error: "Failed to fetch teacher" });
  }
}

// ── POST /api/teachers ────────────────────────────────────────
export async function createTeacher(req, res) {
  try {
    const {
      email,
      password,
      name,
      employeeCode,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      address,
      city,
      state,
      zipCode,
      department,
      designation,
      qualification,
      experienceYears,
      joiningDate,
      employmentType,
      salary,
      bankAccountNo,
      bankName,
      ifscCode,
      panNumber,
      aadhaarNumber,
      // ── NEW fields ──
      bloodGroup,
      emergencyContact,
      medicalConditions,
      allergies,
    } = req.body;

    const schoolId = req.user?.schoolId;
    if (!schoolId)
      return res.status(400).json({ error: "schoolId missing from token" });

    const teacher = await prisma.$transaction(async (tx) => {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

      const user = await tx.user.create({
        data: {
          name: name || `${firstName} ${lastName}`,
          email,
          password: hashedPassword,
          role: "TEACHER",
          schoolId,
        },
      });

      return tx.teacherProfile.create({
        data: {
          userId: user.id,
          schoolId,
          employeeCode,
          firstName,
          lastName,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: gender || null,
          phone: phone || null,
          address: address || null,
          city: city || null,
          state: state || null,
          zipCode: zipCode || null,
          department,
          designation,
          qualification: qualification || null,
          experienceYears: experienceYears ? Number(experienceYears) : null,
          joiningDate: new Date(joiningDate),
          employmentType,
          salary: salary ? Number(salary) : null,
          bankAccountNo: bankAccountNo || null,
          bankName: bankName || null,
          ifscCode: ifscCode || null,
          panNumber: panNumber || null,
          aadhaarNumber: aadhaarNumber || null,
          // ── NEW fields ──
          bloodGroup: bloodGroup || null,
          emergencyContact: emergencyContact || null,
          medicalConditions: medicalConditions || null,
          allergies: allergies || null,
        },
        include: { user: { select: { id: true, email: true } } },
      });
    });

    await cacheService.invalidateSchool(schoolId);
    res.status(201).json({ data: teacher });
  } catch (err) {
    if (err.code === "P2002")
      return res
        .status(409)
        .json({ error: "Email or employee code already exists" });
    console.error("[createTeacher]", err);
    res.status(500).json({ error: "Failed to create teacher" });
  }
}

// ── PATCH /api/teachers/:id ───────────────────────────────────
export async function updateTeacher(req, res) {
  try {
    const { id } = req.params;
    const allowed = [
      "firstName",
      "lastName",
      "dateOfBirth",
      "gender",
      "phone",
      "address",
      "city",
      "state",
      "zipCode",
      "department",
      "designation",
      "qualification",
      "experienceYears",
      "employmentType",
      "status",
      "salary",
      "bankAccountNo",
      "bankName",
      "ifscCode",
      "panNumber",
      "aadhaarNumber",
      "profileImage",
      // ── NEW fields ──
      "bloodGroup",
      "emergencyContact",
      "medicalConditions",
      "allergies",
    ];

    const data = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }
    if (data.dateOfBirth) data.dateOfBirth = new Date(data.dateOfBirth);
    if (data.experienceYears)
      data.experienceYears = Number(data.experienceYears);
    if (data.salary !== undefined) {
      data.salary = data.salary ? Number(data.salary) : null;
    }

    const updated = await prisma.teacherProfile.update({ where: { id }, data });

    const schoolId = req.user?.schoolId;
    await cacheService.invalidateSchool(schoolId);
    res.json({ data: updated });
  } catch (err) {
    console.error("[updateTeacher]", err);
    res.status(500).json({ error: "Failed to update teacher" });
  }
}

// ── DELETE /api/teachers/:id (soft delete) ────────────────────
export async function deleteTeacher(req, res) {
  try {
    const { id } = req.params;
    await prisma.teacherProfile.update({
      where: { id },
      data: { status: "RESIGNED" },
    });
    const schoolId = req.user?.schoolId;

    await cacheService.invalidateSchool(schoolId);
    res.json({ message: "Teacher marked as resigned" });
  } catch (err) {
    console.error("[deleteTeacher]", err);
    res.status(500).json({ error: "Failed to deactivate teacher" });
  }
}

// ── POST /api/teachers/:id/assignments ────────────────────────
export async function addAssignment(req, res) {
  try {
    const { id: teacherId } = req.params;
    const { classSectionId, subjectId, academicYearId } = req.body;
    const schoolId = req.user?.schoolId;

    if (!classSectionId || !subjectId || !academicYearId)
      return res.status(400).json({
        error: "classSectionId, subjectId and academicYearId are required",
      });

    const assignment = await prisma.teacherAssignment.create({
      data: { teacherId, classSectionId, subjectId, academicYearId },
      include: {
        classSection: { select: { name: true, grade: true, section: true } },
        subject: { select: { name: true, code: true } },
        academicYear: { select: { name: true } },
      },
    });

    await cacheService.invalidateSchool(schoolId);
    res.status(201).json({ data: assignment });
  } catch (err) {
    if (err.code === "P2002")
      return res.status(409).json({
        error: "This teacher is already assigned to this subject in this class",
      });

    console.error("[addAssignment]", err);
    res.status(500).json({ error: "Failed to add assignment" });
  }
}

// ── DELETE /api/teachers/:id/assignments/:aId ─────────────────
export async function removeAssignment(req, res) {
  try {
    const { id: teacherId, aId } = req.params;
    const schoolId = req.user?.schoolId;

    await prisma.teacherAssignment.delete({ where: { id: aId } });

    await cacheService.invalidateSchool(schoolId);
    res.json({ message: "Assignment removed" });
  } catch (err) {
    console.error("[removeAssignment]", err);
    res.status(500).json({ error: "Failed to remove assignment" });
  }
}


export async function getTeacherDocumentUrl(req, res) {
  try {
    const { id, docId } = req.params;
    const schoolId = req.user?.schoolId;

    // Verify teacher belongs to school
    const teacher = await prisma.teacherProfile.findFirst({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    // Fetch the document
    const doc = await prisma.teacherDocument.findFirst({
      where: { id: docId, teacherId: id },
      select: { fileKey: true, fileType: true },
    });
    if (!doc) return res.status(404).json({ error: "Document not found" });

    const expiresIn = 300; // 5 minutes
    const url = await generateSignedUrl(doc.fileKey, expiresIn);

    res.json({ url, expiresIn });
  } catch (err) {
    console.error("[getTeacherDocumentUrl]", err);
    res.status(500).json({ error: "Failed to generate document URL" });
  }
}
// ── POST /api/teachers/bulk-import ────────────────────────────
// Add this function to teacherController.js
// IMPORTANT: In teachersRoutes.js, register this route BEFORE /:id routes:
//   router.post("/bulk-import", authMiddleware, bulkImportTeachers);

export async function bulkImportTeachers(req, res) {
  try {
    const { teachers } = req.body;
    const schoolId = req.user?.schoolId;

    console.log("[bulkImportTeachers] schoolId:", schoolId);
    console.log("[bulkImportTeachers] teachers count:", teachers?.length);

    if (!schoolId)
      return res.status(400).json({ error: "schoolId missing from token" });

    if (!Array.isArray(teachers) || teachers.length === 0)
      return res.status(400).json({ error: "No teachers provided" });

    const results = [];

    for (let i = 0; i < teachers.length; i++) {
      const t = teachers[i];
      console.log(`[bulkImportTeachers] Processing row ${i + 1}:`, {
        email: t.email,
        firstName: t.firstName,
        lastName: t.lastName,
        department: t.department,
        joiningDate: t.joiningDate,
        employmentType: t.employmentType,
      });

      try {
        // ── Defensive parsing ──────────────────────────────────────────────

        // Parse joining date — fallback to today if missing/invalid
        let joiningDate = new Date();
        if (t.joiningDate) {
          // Handle DD-MM-YYYY format from Excel template
          const ddmmyyyy = t.joiningDate.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
          if (ddmmyyyy) {
            joiningDate = new Date(`${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2,"0")}-${ddmmyyyy[1].padStart(2,"0")}`);
          } else {
            const parsed = new Date(t.joiningDate);
            if (!isNaN(parsed.getTime())) joiningDate = parsed;
          }
        }

        // Parse date of birth
        let dateOfBirth = null;
        if (t.dateOfBirth) {
          const ddmmyyyy = t.dateOfBirth.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
          if (ddmmyyyy) {
            dateOfBirth = new Date(`${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2,"0")}-${ddmmyyyy[1].padStart(2,"0")}`);
          } else {
            const parsed = new Date(t.dateOfBirth);
            if (!isNaN(parsed.getTime())) dateOfBirth = parsed;
          }
        }

        // Normalize employment type to DB enum
        const normalizeEmploymentType = (v) => {
          if (!v) return "FULL_TIME";
          const map = {
            "full time": "FULL_TIME",
            "fulltime": "FULL_TIME",
            "full_time": "FULL_TIME",
            "part time": "PART_TIME",
            "parttime": "PART_TIME",
            "part_time": "PART_TIME",
            "contract": "CONTRACT",
            "temporary": "TEMPORARY",
            "temp": "TEMPORARY",
          };
          const lower = v.toString().toLowerCase().trim();
          return map[lower] || "FULL_TIME";
        };

        // Normalize status to DB enum
        const normalizeStatus = (v) => {
          if (!v) return "ACTIVE";
          const map = {
            "active": "ACTIVE",
            "on leave": "ON_LEAVE",
            "on_leave": "ON_LEAVE",
            "resigned": "RESIGNED",
            "terminated": "TERMINATED",
          };
          return map[v.toString().toLowerCase().trim()] || "ACTIVE";
        };

        // Normalize gender
        const normalizeGender = (v) => {
          if (!v) return null;
          const u = v.toString().toUpperCase().trim();
          if (u === "M" || u === "MALE") return "MALE";
          if (u === "F" || u === "FEMALE") return "FEMALE";
          if (u === "OTHER") return "OTHER";
          return null;
        };

        // Normalize blood group
        const normalizeBlood = (v) => {
          if (!v) return null;
          const cleaned = v.toString().toUpperCase().trim()
            .replace(/\+/, "_POS")
            .replace(/-/, "_NEG")
            .replace(/\s/g, "");
          const valid = ["A_POS","A_NEG","B_POS","B_NEG","O_POS","O_NEG","AB_POS","AB_NEG"];
          return valid.includes(cleaned) ? cleaned : null;
        };

        const hashedPassword = await bcrypt.hash(t.password, SALT_ROUNDS);

        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              name: `${t.firstName} ${t.lastName}`,
              email: t.email.trim().toLowerCase(),
              password: hashedPassword,
              role: "TEACHER",
              schoolId,
            },
          });

          await tx.teacherProfile.create({
            data: {
              userId:           user.id,
              schoolId,
              employeeCode:     t.employeeCode?.trim() || null,
              firstName:        t.firstName.trim(),
              lastName:         t.lastName.trim(),
              dateOfBirth,
              gender:           normalizeGender(t.gender),
              phone:            t.phone?.trim() || null,
              address:          t.address?.trim() || null,
              city:             t.city?.trim() || null,
              state:            t.state?.trim() || null,
              zipCode:          t.zipCode?.trim() || null,
              aadhaarNumber:    t.aadhaarNumber?.trim() || null,
              panNumber:        t.panNumber?.trim() || null,
              bloodGroup:       normalizeBlood(t.bloodGroup),
              emergencyContact: t.emergencyContact?.trim() || null,
              medicalConditions:t.medicalConditions?.trim() || null,
              allergies:        t.allergies?.trim() || null,
              department:       t.department?.trim() || null,
              designation:      t.designation?.trim() || null,
              qualification:    t.qualification?.trim() || null,
              experienceYears:  t.experienceYears ? Number(t.experienceYears) || null : null,
              joiningDate,
              employmentType:   normalizeEmploymentType(t.employmentType),
              status:           normalizeStatus(t.status),
              salary:           t.salary ? Number(t.salary) || null : null,
              bankAccountNo:    t.bankAccountNo?.trim() || null,
              bankName:         t.bankName?.trim() || null,
              ifscCode:         t.ifscCode?.trim() || null,
            },
          });
        });

        console.log(`[bulkImportTeachers] Row ${i + 1} SUCCESS`);
        results.push({ row: i + 1, success: true });

      } catch (err) {
        console.error(`[bulkImportTeachers] Row ${i + 1} FAILED:`, err.message, err.code);
        const msg =
          err.code === "P2002"
            ? "Email or employee code already exists"
            : err.code === "P2003"
            ? "Invalid reference (check schoolId or userId)"
            : err.message || "Failed to create teacher";
        results.push({ row: i + 1, success: false, error: msg });
      }
    }

    await cacheService.invalidateSchool(schoolId);

    const successCount = results.filter((r) => r.success).length;
    console.log(`[bulkImportTeachers] Done — ${successCount}/${teachers.length} succeeded`);

    res.status(207).json({ results });
  } catch (err) {
    console.error("[bulkImportTeachers] Fatal error:", err);
    res.status(500).json({ error: "Bulk import failed: " + err.message });
  }
}