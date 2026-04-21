// server/src/staffControlls/StudentsControlls.js
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { uploadToR2, generateSignedUrl } from "../lib/r2.js";
import cacheService from "../utils/cacheService.js";
import { getExpiryByRole } from "../utils/fileAccessPolicy.js";
import { uploadToCloud } from "../utils/cloud.service.js";
import XLSX from "xlsx";

import { saveBackup } from "../utils/cloudBackup.js";
import { prisma } from "../config/db.js";

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
      await saveBackup({
  model: "parents",
  refId: parent.id,
  data: parent,
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
await saveBackup({
  model: "studentParent",
  refId: link.id,
  data: link,
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
});
    if (!student) return res.status(404).json({ message: "Student not found" });


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


export const bulkImportRow = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ message: "schoolId missing from token" });

    // Uses the unified worker to handle all database operations at once
    const student = await createStudentFull(req.body, schoolId);

    await bustStudentCache(schoolId);

    return res.status(201).json({
      studentId: student.id,
      name: student.name,
      message: "Student imported successfully",
    });

  } catch (err) {
    console.error("[bulkImportRow]", err);
    // Return specific error message (e.g., "Duplicate Email" or "Class not found")
    return res.status(400).json({ message: err.message || "Server error" });
  }
};

export const bulkImportStudents = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ message: "schoolId missing" });

    const students = req.body.students;
    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ message: "No students provided" });
    }

    const results = [];

    // Process each student row through the unified worker
    for (let i = 0; i < students.length; i++) {
      const row = students[i];
      try {
        const student = await createStudentFull(row, schoolId);
        results.push({
          row: i + 1,
          success: true,
          studentId: student.id,
        });
      } catch (err) {
        // Capture the specific reason for failure for this row
        results.push({
          row: i + 1,
          success: false,
          error: err.message,
        });
      }
    }

    await bustStudentCache(schoolId);

    return res.json({
      total: students.length,
      successCount: results.filter(r => r.success).length,
      failCount: results.filter(r => !r.success).length,
      results,
    });

  } catch (err) {
    console.error("[bulkImportStudents]", err);
    return res.status(500).json({ message: "Import process encountered a server error" });
  }
};

const parseIndianDate = (dateStr) => {
  if (!dateStr) return undefined;
  if (dateStr instanceof Date) return dateStr;
  const parts = dateStr.toString().trim().split(/[-/]/); 
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1; // JS months are 0-11
    let y = parseInt(parts[2], 10);
    if (y < 100) y = y > 25 ? 1900 + y : 2000 + y; // Handle 2-digit years
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) return date;
  }
  return new Date(dateStr);
};



async function createStudentFull(row, schoolId) {
  const {
    // Basic & Identity
    firstName, lastName, email, password, gender, dateOfBirth, phone,
    address, city, state, zipCode, nationality, religion, casteCategory,
    motherTongue, subcaste, domicileState, annualIncome, physicallyChallenged,
    disabilityType, aadhaarNumber, panNumber, satsNumber,
    // Academic
    admissionNumber, classSectionName, academicYearName, rollNumber, externalId, 
    admissionDate, status, previousSchoolName, previousSchoolBoard, udiseCode, lateralEntry,
    // Parent (Unified Single Login)
    parentName, parentPhone, parentEmail, parentPassword, parentOccupation, parentRelation,
    emergencyContact,
    // Health
    bloodGroup, heightCm, weightKg, identifyingMarks, medicalConditions, allergies
  } = row;

  // 1. Mandatory Pre-validations (Provides clear UI feedback)
  const studentEmail = (row.loginEmail || email)?.toLowerCase().trim();
  if (!studentEmail) throw new Error("Student login email is required.");
  if (!admissionNumber) throw new Error("Admission Number is required.");

  const exists = await prisma.student.findFirst({ where: { email: studentEmail, schoolId } });
  if (exists) throw new Error(`Student email "${studentEmail}" is already registered.`);

  // 2. Resolve Class Section (Smart lookup for "10-A", "10 A", or "10A")
  const classSection = await prisma.classSection.findFirst({
    where: {
      schoolId,
      OR: [
        { name: { equals: classSectionName?.trim(), mode: "insensitive" } },
        {
          AND: [
            { grade: { equals: classSectionName?.split(/[-\s]/)[0]?.trim(), mode: "insensitive" } },
            { section: { equals: classSectionName?.split(/[-\s]/)[1]?.trim(), mode: "insensitive" } }
          ]
        }
      ],
    },
  });
  if (!classSection) throw new Error(`Class "${classSectionName}" not found in system.`);

  // 3. Resolve Academic Year
  const academicYear = await prisma.academicYear.findFirst({
    where: { schoolId, name: { equals: academicYearName?.trim(), mode: "insensitive" } },
  });
  if (!academicYear) throw new Error(`Academic year "${academicYearName}" not found.`);

  // 4. Pre-check Roll Number Conflict
  if (rollNumber?.toString().trim()) {
    const rollExists = await prisma.studentEnrollment.findFirst({
      where: { 
        classSectionId: classSection.id, 
        academicYearId: academicYear.id, 
        rollNumber: rollNumber.toString().trim() 
      }
    });
    if (rollExists) throw new Error(`Roll No ${rollNumber} already assigned in ${classSection.name}.`);
  }

  // 5. Atomic Transaction (Matches manual form Tabs 1-6)
  return await prisma.$transaction(async (tx) => {
    // Step A: Register Student Base (Login)
    const student = await tx.student.create({
      data: {
        name: `${firstName} ${lastName}`.trim(),
        email: studentEmail,
        password: await bcrypt.hash(password.toString(), 10),
        schoolId,
      },
    });

    // Step B: Personal & Health Info
    const normalizedBlood = bloodGroupMap[bloodGroup?.toUpperCase().replace(/\s/g, "")] || undefined;
    
    await tx.studentPersonalInfo.create({
      data: {
        studentId: student.id,
        firstName, lastName,
        dateOfBirth: parseIndianDate(dateOfBirth),
        gender: toEnum(gender),
        phone: phone?.toString(),
        address, city, state, zipCode: zipCode?.toString(),
        nationality: nationality || "Indian",
        religion,
        aadhaarNumber: row.aadhaarNumber 
        ? row.aadhaarNumber.toString()      // Convert to string first
            .replace(/\s/g, "")             // Remove any spaces
            .replace(/\.0$/, "")            // Remove ".0" if Excel added it
            .replace(/[^0-9]/g, "")         // Remove anything else (dots, letters)
            .slice(0, 12)                   // Keep exactly 12 digits
        : null,
        panNumber: panNumber?.toString().toUpperCase(),
        satsNumber: satsNumber?.toString(),
        casteCategory: toEnum(casteCategory),
        motherTongue, subcaste,
        domicileState: domicileState || "Karnataka",
        annualIncome: annualIncome ? parseFloat(annualIncome) : null,
        physicallyChallenged: physicallyChallenged === "true" || physicallyChallenged === true,
        disabilityType,
        bloodGroup: normalizedBlood,
        heightCm: heightCm ? parseFloat(heightCm) : null,
        weightKg: weightKg ? parseFloat(weightKg) : null,
        identifyingMarks,
        medicalConditions,
        allergies,
        parentName, 
        parentPhone: parentPhone?.toString(),
        parentEmail,
        emergencyContact: emergencyContact || parentPhone?.toString(),
      }
    });

    // Step C: Enrollment (Assign to Class & History)
    await tx.studentEnrollment.create({
      data: {
        studentId: student.id,
        classSectionId: classSection.id,
        academicYearId: academicYear.id,
        admissionNumber: admissionNumber.toString(),
        admissionDate: parseIndianDate(admissionDate) || new Date(),
        rollNumber: rollNumber?.toString().trim() || null,
        externalId: externalId?.toString(),
        status: toEnum(status) || "ACTIVE",
        previousSchoolName,
        previousSchoolBoard: toEnum(previousSchoolBoard),
        udiseCode: udiseCode?.toString(),
        lateralEntry: lateralEntry === "true" || lateralEntry === true,
      }
    });

    // Step D: Unified Parent Account Sync (One Login per row)
    if (parentName && parentEmail) {
      const pEmail = parentEmail.toLowerCase().trim();
      let parent = await tx.parent.findFirst({ where: { email: pEmail, schoolId } });
      
      if (!parent) {
        // Use Excel password if provided, otherwise default
        const rawPw = parentPassword?.toString().trim() || "Parent@123";
        parent = await tx.parent.create({
          data: {
            name: parentName,
            email: pEmail,
            password: await bcrypt.hash(rawPw, 10),
            phone: parentPhone?.toString(),
            occupation: parentOccupation,
            schoolId,
          }
        });
      }

      // Link Parent record to Student
      await tx.studentParent.create({
        data: {
          studentId: student.id,
          parentId: parent.id,
          relation: toEnum(parentRelation) || "GUARDIAN",
          isPrimary: true,
          emergencyContact: true
        }
      });
    }

    return student;
  });
}

export const exportStudentsExcel = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    const { classSectionId } = req.query;

    // ── 1. Fetch students ──────────────────────────────────────────────────────
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        ...(classSectionId && {
          enrollments: { some: { classSectionId } },
        }),
      },
      include: {
        personalInfo: true,
        enrollments: {
          include: { classSection: true, academicYear: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });

    if (!students.length) {
      return res.status(404).json({ message: "No students found" });
    }

    // ── 2. Meta ────────────────────────────────────────────────────────────────
    const exportDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit", month: "long", year: "numeric",
    });

    // Derive a display label for the filter (class name or "All Classes")
    const filterLabel = classSectionId
      ? (students[0]?.enrollments?.[0]?.classSection?.name || "Filtered Class")
      : "All Classes";

    // ── 3. Build workbook ──────────────────────────────────────────────────────
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator  = "School Management System";
    wb.created  = new Date();
    wb.modified = new Date();

    const ws = wb.addWorksheet("Students", {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
      views: [{ state: "frozen", ySplit: 6 }],
    });

    // ── 4. Colour palette (same design language as Results export) ─────────────
    const C = {
      headerBg:    "FF1E3A5F",   // deep navy
      headerFg:    "FFFFFFFF",
      subHeaderBg: "FF2E86AB",   // ocean blue
      subHeaderFg: "FFFFFFFF",
      metaBg:      "FFE8F4FD",   // very light blue
      metaFg:      "FF1E3A5F",
      colHeaderBg: "FF34495E",   // dark slate
      colHeaderFg: "FFFFFFFF",
      rowEven:     "FFF8FBFF",
      rowOdd:      "FFFFFFFF",
      borderCol:   "FFB0C4DE",
      activeCell:  "FFE8F5E9",   // light green  – ACTIVE
      inactiveCell:"FFFCE4E4",   // light red    – INACTIVE / other
      statusActive:   { bg: "FF1A7A4A", fg: "FFFFFFFF" },
      statusInactive: { bg: "FFC62828", fg: "FFFFFFFF" },
      statusOther:    { bg: "FFF57F17", fg: "FFFFFFFF" },
    };

    // ── 5. Column definitions ─────────────────────────────────────────────────
    //  A  B            C        D       E            F           G       H
    ws.columns = [
      { key: "rollNo",      width: 10  },  // A – Roll No
      { key: "admNo",       width: 16  },  // B – Admission No
      { key: "name",        width: 28  },  // C – Student Name
      { key: "gender",      width: 10  },  // D – Gender
      { key: "phone",       width: 16  },  // E – Phone
      { key: "email",       width: 30  },  // F – Email
      { key: "class",       width: 14  },  // G – Class
      { key: "academicYear",width: 18  },  // H – Academic Year
      { key: "dob",         width: 16  },  // I – Date of Birth
      { key: "bloodGroup",  width: 12  },  // J – Blood Group
      { key: "status",      width: 12  },  // K – Status
    ];

    const LAST_COL  = "K";
    const TOTAL_COLS = 11;

    // ── 6. Helpers ────────────────────────────────────────────────────────────
    const thinBorder = (color = C.borderCol) => ({
      top:    { style: "thin", color: { argb: color } },
      left:   { style: "thin", color: { argb: color } },
      bottom: { style: "thin", color: { argb: color } },
      right:  { style: "thin", color: { argb: color } },
    });

    const fillSolid = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

    const addBanner = (text, bgArgb, fgArgb, fontSize, rowHeight) => {
      const row  = ws.addRow([text]);
      const cell = row.getCell(1);
      ws.mergeCells(`A${row.number}:${LAST_COL}${row.number}`);
      cell.value     = text;
      cell.font      = { bold: true, size: fontSize, color: { argb: fgArgb }, name: "Calibri" };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.fill      = fillSolid(bgArgb);
      cell.border    = thinBorder("FFFFFFFF");
      row.height     = rowHeight;
      return row;
    };

    // ── 7. Rows 1-4: Header block ──────────────────────────────────────────────
    // Row 1 – Title banner
    addBanner("🎓  STUDENT LIST REPORT", C.headerBg, C.headerFg, 18, 36);

    // Row 2 – Class filter
    addBanner(`Class: ${filterLabel}`, C.subHeaderBg, C.subHeaderFg, 13, 26);

    // Row 3 – Meta info
    addBanner(
      `Exported on: ${exportDate}     |     Total Students: ${students.length}`,
      C.metaBg, C.metaFg, 10, 20,
    );

    // Row 4 – spacer
    const spacer = ws.addRow([]);
    spacer.height = 6;

    // ── 8. Row 5: Column headers ───────────────────────────────────────────────
    const headerLabels = [
      "Roll No", "Admission No", "Student Name", "Gender",
      "Phone", "Email", "Class", "Academic Year",
      "Date of Birth", "Blood Group", "Status",
    ];
    const hdrRow  = ws.addRow(headerLabels);
    hdrRow.height = 28;
    hdrRow.eachCell((cell) => {
      cell.font      = { bold: true, size: 11, color: { argb: C.colHeaderFg }, name: "Calibri" };
      cell.fill      = fillSolid(C.colHeaderBg);
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border    = thinBorder("FF1A252F");
    });

    // ── 9. Data rows ───────────────────────────────────────────────────────────
    students.forEach((s, idx) => {
      const enroll  = s.enrollments?.[0];
      const info    = s.personalInfo;
      const status  = (enroll?.status || "UNKNOWN").toUpperCase();
      const isActive = status === "ACTIVE";

      const dobRaw = info?.dateOfBirth;
      const dobStr = dobRaw
        ? new Date(dobRaw).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "";

      const fullName = [info?.firstName, info?.lastName].filter(Boolean).join(" ") || s.name || "";

      const bloodRaw = info?.bloodGroup || "";
      // Convert enum like "A_POS" → "A+" and "AB_NEG" → "AB-" for display
      const bloodDisplay = bloodRaw
        .replace(/_POS$/, "+")
        .replace(/_NEG$/, "-")
        .replace(/_/g, "");

      const dataRow = ws.addRow({
        rollNo:      enroll?.rollNumber      || "",
        admNo:       enroll?.admissionNumber || "",
        name:        fullName,
        gender:      info?.gender ? info.gender.charAt(0) + info.gender.slice(1).toLowerCase() : "",
        phone:       info?.phone  || "",
        email:       s.email      || "",
        class:       enroll?.classSection?.name  || "",
        academicYear:enroll?.academicYear?.name  || "",
        dob:         dobStr,
        bloodGroup:  bloodDisplay,
        status:      status,
      });
      dataRow.height = 22;

      const rowBg = idx % 2 === 0 ? C.rowEven : C.rowOdd;

      dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        const isStatusCol = colNum === TOTAL_COLS;
        const isCenterCol = colNum === 1 || colNum === 4 || colNum === 9 || colNum === 10;

        cell.font      = { size: 10, name: "Calibri", color: { argb: "FF1A1A2E" } };
        cell.alignment = {
          horizontal: isCenterCol || isStatusCol ? "center" : "left",
          vertical:   "middle",
        };
        cell.border = thinBorder(C.borderCol);

        // Row background – green for active, red for inactive
        if (!isStatusCol) {
          cell.fill = fillSolid(isActive ? C.activeCell : C.inactiveCell);
        }

        // Status cell – bold coloured badge
        if (isStatusCol) {
          let sc = C.statusOther;
          if (status === "ACTIVE")   sc = C.statusActive;
          if (status === "INACTIVE") sc = C.statusInactive;
          cell.fill      = fillSolid(sc.bg);
          cell.font      = { bold: true, size: 10, name: "Calibri", color: { argb: sc.fg } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }
      });
    });

    // ── 10. Summary footer ─────────────────────────────────────────────────────
    ws.addRow([]).height = 8;
    addBanner("SUMMARY", C.headerBg, C.headerFg, 11, 22);

    const activeCount   = students.filter((s) => (s.enrollments?.[0]?.status || "").toUpperCase() === "ACTIVE").length;
    const inactiveCount = students.length - activeCount;

    const statsLabels = [
      ["Total Students", students.length],
      ["Active",         activeCount],
      ["Inactive",       inactiveCount],
      ["Classes",        [...new Set(students.map((s) => s.enrollments?.[0]?.classSection?.name).filter(Boolean))].length],
    ];

    const labels = [];
    const values = [];
    statsLabels.forEach(([l, v]) => { labels.push(l, ""); values.push(v, ""); });
    while (labels.length < TOTAL_COLS) labels.push("");
    while (values.length < TOTAL_COLS) values.push("");

    const lRow = ws.addRow(labels);
    lRow.height = 18;
    lRow.eachCell({ includeEmpty: true }, (cell, cn) => {
      if (labels[cn - 1] !== "") {
        cell.font      = { bold: true, size: 9, color: { argb: C.metaFg }, name: "Calibri" };
        cell.fill      = fillSolid(C.metaBg);
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border    = thinBorder(C.borderCol);
      }
    });

    const vRow = ws.addRow(values);
    vRow.height = 22;
    vRow.eachCell({ includeEmpty: true }, (cell, cn) => {
      if (values[cn - 1] !== "") {
        cell.font      = { bold: true, size: 12, color: { argb: C.headerBg }, name: "Calibri" };
        cell.fill      = fillSolid("FFFFFFFF");
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.border    = thinBorder(C.borderCol);
      }
    });

    // ── 11. Footer row ─────────────────────────────────────────────────────────
    ws.addRow([]).height = 6;
    addBanner(
      `This report was generated automatically on ${exportDate}. For official use only.`,
      "FFECF0F1", C.metaFg, 8, 18,
    );

    // ── 12. Send response ──────────────────────────────────────────────────────
    const safeName = `Students_${filterLabel}`.replace(/[^a-zA-Z0-9_-]/g, "_");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.xlsx"`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    await wb.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("[exportStudentsExcel]", err);
    res.status(500).json({ message: "Export failed", error: err.message });
  }
};
