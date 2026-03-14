// server/src/staffControlls/StudentsControlls.js
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { uploadToR2, generateSignedUrl } from "../lib/r2.js";
import cacheService from "../utils/cacheService.js";
import { getExpiryByRole } from "../utils/fileAccessPolicy.js";

const prisma = new PrismaClient();

async function bustStudentCache(schoolId) {
  await cacheService.invalidateSchool(schoolId);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const toEnum = (v) => (v ? v.toUpperCase().replace(/\s+/g, "_") : undefined);

const bloodGroupMap = {
  A_PLUS: "A_POS",
  A_MINUS: "A_NEG",
  B_PLUS: "B_POS",
  B_MINUS: "B_NEG",
  AB_PLUS: "AB_POS",
  AB_MINUS: "AB_NEG",
  O_PLUS: "O_POS",
  O_MINUS: "O_NEG",
  A_POS: "A_POS",
  A_NEG: "A_NEG",
  B_POS: "B_POS",
  B_NEG: "B_NEG",
  AB_POS: "AB_POS",
  AB_NEG: "AB_NEG",
  O_POS: "O_POS",
  O_NEG: "O_NEG",
};

const VALID_CASTE_CATEGORIES = ["SC", "ST", "OBC", "GM", "OTHER"];

// Valid values for SchoolBoard enum
const VALID_SCHOOL_BOARDS = [
  "KSEEB",
  "CBSE",
  "ICSE",
  "NIOS",
  "IB",
  "IGCSE",
  "STATE",
  "OTHER",
];

const compact = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== ""),
  );

// ── registerStudent ───────────────────────────────────────────────────────────
export const registerStudent = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password || !name)
      return res
        .status(400)
        .json({ message: "name, email and password are required" });

    const schoolId = req.user?.schoolId;
    if (!schoolId)
      return res.status(400).json({ message: "schoolId missing from token" });

    const exists = await prisma.student.findFirst({
      where: { email, schoolId },
    });
    if (exists)
      return res.status(409).json({
        message: "A student with this email already exists in this school",
      });

    const hashed = await bcrypt.hash(password, 10);
    const student = await prisma.student.create({
      data: { name, email, password: hashed, schoolId },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    await bustStudentCache(schoolId);
    return res.status(201).json({ student });
  } catch (err) {
    console.error("[registerStudent]", err);
    return res
      .status(500)
      .json({ message: "Server error", detail: err.message });
  }
};

// ── createParentLogin ─────────────────────────────────────────────────────────
export const createParentLogin = async (req, res) => {
  try {
    const { id: studentId } = req.params;
    const { name, email, password, phone, occupation, relation } = req.body;

    if (!name || !email || !password || !relation)
      return res
        .status(400)
        .json({ message: "name, email, password and relation are required" });

    const validRelations = ["FATHER", "MOTHER", "GUARDIAN"];
    if (!validRelations.includes(relation.toUpperCase()))
      return res
        .status(400)
        .json({ message: "relation must be FATHER, MOTHER or GUARDIAN" });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true },
    });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const schoolId = student.schoolId;
    const relationEnum = relation.toUpperCase();

    const existingLink = await prisma.studentParent.findUnique({
      where: { studentId_relation: { studentId, relation: relationEnum } },
    });
    if (existingLink)
      return res.status(409).json({
        message: `This student already has a ${relationEnum} linked. Remove it first to replace.`,
      });

    let parent = await prisma.parent.findUnique({
      where: { email_schoolId: { email, schoolId } },
    });

    if (!parent) {
      const hashed = await bcrypt.hash(password, 10);
      parent = await prisma.parent.create({
        data: {
          name,
          email,
          password: hashed,
          phone: phone || null,
          occupation: occupation || null,
          schoolId,
        },
      });
    }

    const link = await prisma.studentParent.create({
      data: {
        studentId,
        parentId: parent.id,
        relation: relationEnum,
        isPrimary: relationEnum === "FATHER" || relationEnum === "MOTHER",
        emergencyContact: false,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            occupation: true,
          },
        },
      },
    });

    await bustStudentCache(schoolId);
    return res.status(201).json({
      parent: link.parent,
      relation: link.relation,
      isPrimary: link.isPrimary,
      linkId: link.id,
    });
  } catch (err) {
    console.error("[createParentLogin]", err);
    return res
      .status(500)
      .json({ message: "Server error", detail: err.message });
  }
};

// ── savePersonalInfo ──────────────────────────────────────────────────────────
export const savePersonalInfo = async (req, res) => {
  try {
    const { id: studentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const {
      // ── Basic personal ──────────────────────────────────────
      firstName,
      lastName,
      dateOfBirth,
      gender,
      phone,
      address,
      city,
      state,
      zipCode,
      admissionDate,
      status,
      parentName,
      parentEmail,
      parentPhone,
      emergencyContact,
      bloodGroup,
      medicalConditions,
      allergies,

      // ── Government / Identity ───────────────────────────────
      aadhaarNumber,
      panNumber,
      satsNumber,
      nationality,
      religion,
      casteCategory,

      // ── NEW: Karnataka-specific personal fields ─────────────
      motherTongue,
      subcaste,
      domicileState,
      annualIncome,
      physicallyChallenged,
      disabilityType,

      // ── NEW: Health measurements ────────────────────────────
      heightCm,
      weightKg,
      identifyingMarks,

      // ── Academic enrollment ─────────────────────────────────
      classSectionId,
      academicYearId,
      admissionNumber,
      rollNumber,
      externalId,

      // ── NEW: Previous institution ───────────────────────────
      previousSchoolName,
      previousSchoolBoard,
      udiseCode,
      lateralEntry,
    } = req.body;

    if (!firstName || !lastName)
      return res
        .status(400)
        .json({ message: "firstName and lastName are required" });

    if (!admissionDate)
      return res.status(400).json({ message: "admissionDate is required" });

    // ── Validate enums ──────────────────────────────────────────────────────
    if (casteCategory) {
      const castEnum = toEnum(casteCategory);
      if (!VALID_CASTE_CATEGORIES.includes(castEnum))
        return res.status(400).json({
          message: `Invalid casteCategory. Must be one of: ${VALID_CASTE_CATEGORIES.join(", ")}`,
        });
    }

    if (previousSchoolBoard) {
      const boardEnum = toEnum(previousSchoolBoard);
      if (!VALID_SCHOOL_BOARDS.includes(boardEnum))
        return res.status(400).json({
          message: `Invalid previousSchoolBoard. Must be one of: ${VALID_SCHOOL_BOARDS.join(", ")}`,
        });
    }

    // ── Check admissionNumber uniqueness ────────────────────────────────────
    if (admissionNumber?.trim() && academicYearId) {
      const admExists = await prisma.studentEnrollment.findFirst({
        where: {
          admissionNumber: admissionNumber.trim(),
          academicYearId,
          NOT: { studentId },
        },
      });
      if (admExists)
        return res.status(409).json({
          message:
            "A student with this admission number already exists for this academic year",
        });
    }

    // ── Profile image upload ────────────────────────────────────────────────
    let profileImageUrl;
    if (req.file) {
      const key = `schools/${student.schoolId}/students/${studentId}/profile/${Date.now()}-${req.file.originalname}`;
      profileImageUrl = await uploadToR2(
        key,
        req.file.buffer,
        req.file.mimetype,
      );
    }

    // ── Blood group normalisation ───────────────────────────────────────────
    const rawBloodGroup = toEnum(bloodGroup)
      ?.replace(/\+/g, "_PLUS")
      .replace(/-/g, "_MINUS");
    const fixedBloodGroup = bloodGroupMap[rawBloodGroup] || rawBloodGroup;

    // ── PersonalInfo payload ────────────────────────────────────────────────
    const data = compact({
      firstName,
      lastName,
      phone,
      address,
      city,
      state,
      zipCode,
      parentName,
      parentEmail,
      parentPhone,
      emergencyContact,
      bloodGroup: fixedBloodGroup,
      medicalConditions,
      allergies,

      // Government / Identity
      aadhaarNumber: aadhaarNumber?.trim() || undefined,
      panNumber: panNumber?.trim() || undefined,
      satsNumber: satsNumber?.trim() || undefined,
      nationality: nationality?.trim() || undefined,
      religion: religion?.trim() || undefined,
      casteCategory: casteCategory ? toEnum(casteCategory) : undefined,

      // Karnataka-specific
      motherTongue: motherTongue?.trim() || undefined,
      subcaste: subcaste?.trim() || undefined,
      domicileState: domicileState?.trim() || undefined,
      annualIncome: annualIncome ? parseFloat(annualIncome) : undefined,
      // physicallyChallenged comes as string "true"/"false" from FormData
      physicallyChallenged:
        physicallyChallenged !== undefined
          ? physicallyChallenged === true || physicallyChallenged === "true"
          : undefined,
      disabilityType: disabilityType?.trim() || undefined,

      // Health measurements
      heightCm: heightCm ? parseFloat(heightCm) : undefined,
      weightKg: weightKg ? parseFloat(weightKg) : undefined,
      identifyingMarks: identifyingMarks?.trim() || undefined,

      // Dates and enums
      ...(profileImageUrl ? { profileImage: profileImageUrl } : {}),
      ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}),
      ...(gender ? { gender: toEnum(gender) } : {}),
    });

    const personalInfo = await prisma.studentPersonalInfo.upsert({
      where: { studentId },
      create: { studentId, ...data },
      update: data,
    });

    // ── Enrollment upsert ───────────────────────────────────────────────────
    let enrollment = null;
    if (classSectionId && academicYearId) {
      enrollment = await prisma.studentEnrollment.upsert({
        where: { studentId_academicYearId: { studentId, academicYearId } },
        create: {
          studentId,
          classSectionId,
          academicYearId,
          admissionNumber: admissionNumber?.trim() || null,
          admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
          rollNumber: rollNumber?.trim() || null,
          externalId: externalId?.trim() || null,
          status: toEnum(status) || "ACTIVE",
          // Previous institution
          previousSchoolName: previousSchoolName?.trim() || null,
          previousSchoolBoard: previousSchoolBoard
            ? toEnum(previousSchoolBoard)
            : null,
          udiseCode: udiseCode?.trim() || null,
          lateralEntry:
            lateralEntry === true || lateralEntry === "true" || false,
        },
        update: {
          classSectionId,
          admissionNumber: admissionNumber?.trim() || null,
          rollNumber: rollNumber?.trim() || null,
          externalId: externalId?.trim() || null,
          status: toEnum(status) || "ACTIVE",
          // Previous institution
          previousSchoolName: previousSchoolName?.trim() || null,
          previousSchoolBoard: previousSchoolBoard
            ? toEnum(previousSchoolBoard)
            : null,
          udiseCode: udiseCode?.trim() || null,
          lateralEntry:
            lateralEntry === true || lateralEntry === "true" || false,
        },
      });
    }

    await bustStudentCache(student.schoolId);
    return res.status(200).json({ personalInfo, enrollment });
  } catch (err) {
    console.error("[savePersonalInfo]", err);
    return res
      .status(500)
      .json({ message: "Server error", detail: err.message });
  }
};

// ── uploadDocumentsBulk ───────────────────────────────────────────────────────
export const uploadDocumentsBulk = async (req, res) => {
  try {
    const { id: studentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (!req.files?.length)
      return res.status(400).json({ message: "No files received" });

    const metadata = JSON.parse(req.body.metadata || "[]");
    if (metadata.length !== req.files.length)
      return res
        .status(400)
        .json({ message: "metadata length must match files length" });

    // Validate all documentName values are valid enum members
    const VALID_DOC_TYPES = [
      "AADHAR_CARD",
      "BIRTH_CERTIFICATE",
      "PASSBOOK",
      "TRANSFER_CERTIFICATE",
      "MARKSHEET",
      "MIGRATION_CERTIFICATE",
      "CHARACTER_CERTIFICATE",
      "MEDICAL_CERTIFICATE",
      "PASSPORT",
      "CASTE_CERTIFICATE",
      "INCOME_CERTIFICATE",
      "PHOTO",
      "CUSTOM",
    ];

    for (const [i, meta] of metadata.entries()) {
      if (!VALID_DOC_TYPES.includes(meta.documentName)) {
        return res.status(400).json({
          message: `Invalid documentName "${meta.documentName}" at index ${i}. Must be one of: ${VALID_DOC_TYPES.join(", ")}`,
        });
      }
      // CUSTOM requires a customLabel
      if (meta.documentName === "CUSTOM" && !meta.customLabel?.trim()) {
        return res.status(400).json({
          message: `customLabel is required when documentName is CUSTOM (index ${i})`,
        });
      }
    }

    const created = await Promise.all(
      req.files.map(async (file, idx) => {
        const { documentName, customLabel } = metadata[idx];
       const key = `schools/${student.schoolId}/students/${studentId}/documents/${Date.now()}-${file.originalname}`;
        await uploadToR2(key, file.buffer, file.mimetype);
        return prisma.studentDocumentInfo.create({
          data: {
            studentId,
            documentName,
            customLabel: customLabel?.trim() || null,
            fileKey: key,
            fileType: file.mimetype,
            fileSizeBytes: file.size,
          },
        });
      }),
    );

    await bustStudentCache(student.schoolId);
    return res.status(201).json({ documents: created });
  } catch (err) {
    console.error("[uploadDocumentsBulk]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── getStudent ────────────────────────────────────────────────────────────────
export const getStudent = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId)
      return res.status(400).json({ message: "schoolId missing from token" });

    const { id } = req.params;
    const baseKey = `students:one:${schoolId}:${id}`;
    const key = await cacheService.buildKey(schoolId, baseKey);

    const cached = await cacheService.get(key);
    if (cached)
      return res.json({ student: JSON.parse(cached), fromCache: true });

    const student = await prisma.student.findUnique({
      where: { id, schoolId },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        personalInfo: true, // full model — all new fields included
        documents: { orderBy: { createdAt: "desc" } },
        enrollments: {
          include: {
            classSection: {
              select: {
                id: true,
                grade: true,
                section: true,
                name: true,
                streamId: true,
                stream: {
                  select: { id: true, name: true, hasCombinations: true },
                },
                combinationId: true,
                combination: { select: { id: true, name: true, code: true } },
                courseId: true,
                course: {
                  select: {
                    id: true,
                    name: true,
                    hasBranches: true,
                    totalSemesters: true,
                  },
                },
                branchId: true,
                branch: { select: { id: true, name: true, code: true } },
              },
            },
            academicYear: { select: { id: true, name: true, isActive: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        parentLinks: {
          include: {
            parent: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                occupation: true,
                isActive: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        readmissions: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!student) return res.status(404).json({ message: "Student not found" });

    await cacheService.set(key, student);
    return res.json({ student, fromCache: false });
  } catch (err) {
    console.error("[getStudent]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── listStudents ──────────────────────────────────────────────────────────────
export const listStudents = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId)
      return res.status(400).json({ message: "schoolId missing from token" });

    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, parseInt(req.query.limit || "20"));
    const search = req.query.search?.trim() || "";
    const classSectionId = req.query.classSectionId || null;
    const academicYearId = req.query.academicYearId || null;
    const status = req.query.status?.toUpperCase() || null;

    const baseKey = `students:list:${schoolId}:${JSON.stringify({ page, limit, search, classSectionId, academicYearId, status })}`;
    const key = await cacheService.buildKey(schoolId, baseKey);

    const cached = await cacheService.get(key);
    if (cached) return res.json({ ...JSON.parse(cached), fromCache: true });

    const hasEnrollmentFilter = classSectionId || academicYearId || status;
    const enrollmentFilter = {
      ...(classSectionId ? { classSectionId } : {}),
      ...(academicYearId ? { academicYearId } : {}),
      ...(status ? { status } : {}),
    };

    const where = {
      schoolId,
      ...(hasEnrollmentFilter
        ? { enrollments: { some: enrollmentFilter } }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              {
                personalInfo: {
                  is: {
                    firstName: { contains: search, mode: "insensitive" },
                  },
                },
              },
              {
                personalInfo: {
                  is: {
                    lastName: { contains: search, mode: "insensitive" },
                  },
                },
              },
              {
                enrollments: {
                  some: {
                    admissionNumber: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const total = await prisma.student.count({ where });

    const students = await prisma.student.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        personalInfo: {
          select: {
            firstName: true,
            lastName: true,
            profileImage: true,
            phone: true,
            casteCategory: true,
            nationality: true,
            motherTongue: true, // NEW
            physicallyChallenged: true, // NEW
          },
        },
        enrollments: {
          where: academicYearId ? { academicYearId } : {},
          include: {
            classSection: {
              include: {
                stream: true,
                combination: true,
                course: true,
                branch: true,
              },
            },
            academicYear: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: { documents: true },
        },
      },
    });

    const payload = {
      students,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
    await cacheService.set(key, payload);
    return res.json({ ...payload, fromCache: false });
  } catch (err) {
    console.error("[listStudents]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── deleteStudent ─────────────────────────────────────────────────────────────
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;
    if (!schoolId)
      return res.status(400).json({ message: "schoolId missing from token" });

    const student = await prisma.student.findUnique({
      where: { id, schoolId },
      select: { id: true },
    });
    if (!student) return res.status(404).json({ message: "Student not found" });

    await prisma.student.delete({ where: { id, schoolId } });
    await bustStudentCache(schoolId);
    return res.json({ message: "Student deleted" });
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ message: "Student not found" });
    console.error("[deleteStudent]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── viewStudentDocument ───────────────────────────────────────────────────────
export const viewStudentDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    if (!req.user?.role)
      return res.status(403).json({ message: "Unauthorized" });

    const document = await prisma.studentDocumentInfo.findUnique({
      where: { id: documentId },
    });
    if (!document)
      return res.status(404).json({ message: "Document not found" });

    const expiresIn = getExpiryByRole(req.user.role);
    const signedUrl = await generateSignedUrl(document.fileKey, expiresIn);
    return res.json({ url: signedUrl, expiresIn });
  } catch (error) {
    console.error("[viewStudentDocument]", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── getProfileImage ───────────────────────────────────────────────────────────
export const getProfileImage = async (req, res) => {
  try {
    if (!req.user?.role)
      return res.status(401).json({ message: "Unauthorized" });

    const { id: studentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { personalInfo: { select: { profileImage: true } } },
    });

    if (!student?.personalInfo?.profileImage)
      return res.status(404).json({ message: "Profile image not found" });

    const signedUrl = await generateSignedUrl(
      student.personalInfo.profileImage,
      86400,
    );
    return res.json({ url: signedUrl, expiresIn: 86400 });
  } catch (err) {
    console.error("[getProfileImage]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── getMyStudent (student self-view) ──────────────────────────────────────────
export const getMyStudent = async (req, res) => {
  try {
    const userId = req.user?.id;
    const schoolId = req.user?.schoolId;
    if (!userId || !schoolId)
      return res.status(400).json({ message: "Invalid token" });

    const baseKey = `students:me:${schoolId}:${userId}`;
    const key = await cacheService.buildKey(schoolId, baseKey);

    const cached = await cacheService.get(key);
    if (cached)
      return res.json({ student: JSON.parse(cached), fromCache: true });

    const student = await prisma.student.findUnique({
      where: { id: userId, schoolId },
      include: {
        personalInfo: true,
        enrollments: {
          include: {
            classSection: {
              include: {
                stream: true,
                combination: true,
                course: true,
                branch: true,
              },
            },
            academicYear: true,
          },
          orderBy: { createdAt: "desc" },
        },
        parentLinks: {
          include: {
            parent: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
      },
    });

    if (!student) return res.status(404).json({ message: "Student not found" });

    await cacheService.set(key, student);
    return res.json({ student, fromCache: false });
  } catch (error) {
    console.error("[getMyStudent]", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── getMyParentStudents ───────────────────────────────────────────────────────
export const getMyParentStudents = async (req, res) => {
  try {
    const parentId = req.user?.id;
    const schoolId = req.user?.schoolId;
    if (!parentId || !schoolId)
      return res.status(400).json({ message: "Invalid token" });

    const baseKey = `students:parent:${schoolId}:${parentId}`;
    const key = await cacheService.buildKey(schoolId, baseKey);

    const cached = await cacheService.get(key);
    if (cached)
      return res.json({ students: JSON.parse(cached), fromCache: true });

    const links = await prisma.studentParent.findMany({
      where: { parentId, student: { schoolId } },
      include: {
        student: {
          include: {
            personalInfo: true,
            enrollments: {
              include: {
                classSection: {
                  include: {
                    stream: true,
                    combination: true,
                    course: true,
                    branch: true,
                  },
                },
                academicYear: true,
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const students = links.map((link) => ({
      relation: link.relation,
      isPrimary: link.isPrimary,
      student: link.student,
    }));

    await cacheService.set(key, students);
    return res.json({ students, fromCache: false });
  } catch (error) {
    console.error("[getMyParentStudents]", error);
    return res.status(500).json({ message: "Server error" });
  }
};
