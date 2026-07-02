// server/src/staffControlls/StudentsControlls.js
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { uploadToR2, generateSignedUrl } from "../lib/r2.js";
import { getExpiryByRole } from "../utils/fileAccessPolicy.js";
import { uploadToCloud } from "../utils/cloud.service.js";
import XLSX from "xlsx";
import {
  createFullSchoolBackup
} from "../modules/backup/backup.service.js";

import { prisma } from "../config/db.js";

// ── checkStudentLimit ─────────────────────────────────────────────────────────
async function checkStudentLimit(schoolId, countToAdd = 1) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { universityId: true },
  });
  if (!school) return { allowed: false, message: "School not found" };

  const payment = await prisma.payment.findFirst({
    where: {
      status: "SUCCESS",
      superAdmin: { universityId: school.universityId },
    },
    orderBy: { createdAt: "desc" },
    select: { studentCount: true },
  });

  if (!payment) {
    return { allowed: false, message: "No active plan found for this school." };
  }

  // null = unlimited (Premium plan)
  if (payment.studentCount === null) return { allowed: true };

  const currentCount = await prisma.student.count({ where: { schoolId } });
  const limit = payment.studentCount;

  if (currentCount + countToAdd > limit) {
    return {
      allowed: false,
      message: `Student limit reached. Your plan allows ${limit} students and you currently have ${currentCount}.`,
      used:  currentCount,
      limit,
    };
  }

  return { allowed: true, used: currentCount, limit };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const toEnum = (v) => (v ? v.toUpperCase().replace(/\s+/g, "_") : undefined);

const normalizePhone = (v) => {
  if (!v) return v;
  const stripped = String(v).replace(/[\s\-]/g, "");
  if (/^91\d{10}$/.test(stripped)) return stripped;
  if (/^\d{10}$/.test(stripped)) return "91" + stripped;
  return stripped;
};

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

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const NUMBERS = "0123456789";

function generateStudentCode() {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += NUMBERS.charAt(Math.floor(Math.random() * NUMBERS.length));
  }
  for (let i = 0; i < 4; i++) {
    code += LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));
  }
  return code;
}

async function createUniqueStudentCode() {
  let studentCode;
  let exists = true;
  while (exists) {
    studentCode = generateStudentCode();
    const student = await prisma.student.findUnique({
      where: { studentCode },
      select: { id: true },
    });
    exists = !!student;
  }
  return studentCode;
}

// ── registerStudent ───────────────────────────────────────────────────────────
export const registerStudent = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password || !name)
      return res.status(400).json({ message: "name, email and password are required" });

    const schoolId = req.user?.schoolId;
    if (!schoolId)
      return res.status(400).json({ message: "schoolId missing from token" });

    const limitCheck = await checkStudentLimit(schoolId, 1);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message: limitCheck.message,
        used:    limitCheck.used,
        limit:   limitCheck.limit,
        code:    "STUDENT_LIMIT_REACHED",
      });
    }

    const exists = await prisma.student.findFirst({ where: { email, schoolId } });
    if (exists)
      return res.status(409).json({
        message: "A student with this email already exists in this school",
      });

    const hashed = await bcrypt.hash(password, 10);
    const studentCode = await createUniqueStudentCode();

    const student = await prisma.student.create({
      data: { studentCode, name, email, password: hashed, schoolId },
    });

    return res.status(201).json({ student });
  } catch (err) {
    console.error("[registerStudent]", err);
    return res.status(500).json({ message: "Server error", detail: err.message });
  }
};

// ── createParentLogin ─────────────────────────────────────────────────────────
export const createParentLogin = async (req, res) => {
  try {
    const { id: studentId } = req.params;
    const { name, email, password, phone, occupation, relation, anniversaryDate } = req.body;

    if (!name || !email || !password || !relation)
      return res.status(400).json({ message: "name, email, password and relation are required" });

    const validRelations = ["FATHER", "MOTHER", "GUARDIAN"];
    if (!validRelations.includes(relation.toUpperCase()))
      return res.status(400).json({ message: "relation must be FATHER, MOTHER or GUARDIAN" });

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
          phone: normalizePhone(phone) || null,
          occupation: occupation || null,
          anniversaryDate: anniversaryDate ? new Date(anniversaryDate) : null,
          schoolId,
        },
      });

      try {
        await createFullSchoolBackup(schoolId);
      } catch (error) {
        console.error("[createParentLogin] Backup failed:", error.message);
      }
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
            anniversaryDate: true,
          },
        },
      },
    });

    return res.status(201).json({
      parent: link.parent,
      relation: link.relation,
      isPrimary: link.isPrimary,
      linkId: link.id,
    });
  } catch (err) {
    console.error("[createParentLogin]", err);
    return res.status(500).json({ message: "Server error", detail: err.message });
  }
};

// ── savePersonalInfo ──────────────────────────────────────────────────────────
export const savePersonalInfo = async (req, res) => {
  try {
    const { id: studentId } = req.params;

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const {
      firstName, lastName,  email, dateOfBirth, gender, phone, address, city, state, zipCode,
      admissionDate, status, parentName, parentEmail, parentPhone, parentOccupation,
      parentAnniversaryDate, fatherAadhaarNumber, emergencyContact,
      motherName, motherEmail, motherPhone, motherOccupation, motherAnniversaryDate, motherAadhaarNumber,
      guardianName, guardianRelation, guardianEmail, guardianPhone, guardianOccupation,
      bankAccountNumber, ifscCode, bankName, bankBranch,
      boardingType,
      bloodGroup, medicalConditions, allergies,
      aadhaarNumber, panNumber, satsNumber, nationality, religion, casteCategory,
      motherTongue, subcaste, domicileState, annualIncome, physicallyChallenged, disabilityType,
      heightCm, weightKg, identifyingMarks,
      classSectionId, academicYearId, admissionNumber, rollNumber, externalId,
      previousSchoolName, previousSchoolBoard, udiseCode, lateralEntry,
    } = req.body;

    if (!firstName )
      return res.status(400).json({ message: "firstName is required" });

    if (!admissionDate)
      return res.status(400).json({ message: "admissionDate is required" });

    // Allow predefined categories OR any custom value
    if (casteCategory && casteCategory.trim().length > 100) {
      return res.status(400).json({
        message: "Caste Category is too long",
      });
    }

    if (previousSchoolBoard) {
      const boardEnum = toEnum(previousSchoolBoard);
      if (!VALID_SCHOOL_BOARDS.includes(boardEnum))
        return res.status(400).json({
          message: `Invalid previousSchoolBoard. Must be one of: ${VALID_SCHOOL_BOARDS.join(", ")}`,
        });
    }

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
          message: "A student with this admission number already exists for this academic year",
        });
    }

    let profileImageUrl;
    if (req.file) {
      const key = `schools/${student.schoolId}/students/${studentId}/profile/${Date.now()}-${req.file.originalname}`;
      profileImageUrl = await uploadToR2(key, req.file.buffer, req.file.mimetype);
    }

    const rawBloodGroup = toEnum(bloodGroup)
      ?.replace(/\+/g, "_PLUS")
      .replace(/-/g, "_MINUS");
    const fixedBloodGroup = bloodGroupMap[rawBloodGroup] || rawBloodGroup;

    const data = compact({
      firstName, lastName,
      phone: normalizePhone(phone),
      address, city, state, zipCode,

      // ── Father — always saved, independent of any login ──
      parentName, parentEmail,
      parentPhone: normalizePhone(parentPhone),
      parentOccupation: parentOccupation?.trim() || undefined,
      parentAnniversaryDate: parentAnniversaryDate ? new Date(parentAnniversaryDate) : undefined,
      fatherAadhaarNumber: fatherAadhaarNumber?.trim() || undefined,
      emergencyContact,

      // ── Mother — always saved, independent of any login ──
      motherName: motherName?.trim() || undefined,
      motherEmail: motherEmail?.trim() || undefined,
      motherPhone: normalizePhone(motherPhone),
      motherOccupation: motherOccupation?.trim() || undefined,
      motherAnniversaryDate: motherAnniversaryDate ? new Date(motherAnniversaryDate) : undefined,
      motherAadhaarNumber: motherAadhaarNumber?.trim() || undefined,

      // ── Guardian — always saved ──
      guardianName: guardianName?.trim() || undefined,
      guardianRelation: guardianRelation?.trim() || undefined,
      guardianEmail: guardianEmail?.trim() || undefined,
      guardianPhone: normalizePhone(guardianPhone),
      guardianOccupation: guardianOccupation?.trim() || undefined,

      // ── Bank details ──
      bankAccountNumber: bankAccountNumber?.trim() || undefined,
      ifscCode: ifscCode?.trim()?.toUpperCase() || undefined,
      bankName: bankName?.trim() || undefined,
      bankBranch: bankBranch?.trim() || undefined,

      // ── Boarding type ──
      boardingType: ["HOSTEL", "DAY_SCHOLAR"].includes((boardingType || "").toUpperCase())
        ? boardingType.toUpperCase()
        : undefined,

      bloodGroup: fixedBloodGroup,
      medicalConditions, allergies,
      aadhaarNumber: aadhaarNumber?.trim() || undefined,
      panNumber: panNumber?.trim() || undefined,
      satsNumber: satsNumber?.trim() || undefined,
      nationality: nationality?.trim() || undefined,
      religion: religion?.trim() || undefined,
      casteCategory: casteCategory?.trim() || undefined,
      motherTongue: motherTongue?.trim() || undefined,
      subcaste: subcaste?.trim() || undefined,
      domicileState: domicileState?.trim() || undefined,
      annualIncome: annualIncome ? parseFloat(annualIncome) : undefined,
      physicallyChallenged:
        physicallyChallenged !== undefined
          ? physicallyChallenged === true || physicallyChallenged === "true"
          : undefined,
      disabilityType: disabilityType?.trim() || undefined,
      heightCm: heightCm ? parseFloat(heightCm) : undefined,
      weightKg: weightKg ? parseFloat(weightKg) : undefined,
      identifyingMarks: identifyingMarks?.trim() || undefined,
      ...(profileImageUrl ? { profileImage: profileImageUrl } : {}),
      ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}),
      ...(gender ? { gender: toEnum(gender) } : {}),
    });

    if (email?.trim()) {
      const existingStudent = await prisma.student.findFirst({
        where: {
          email: email.trim(),
          NOT: { id: studentId },
        },
      });

      if (existingStudent) {
        return res.status(409).json({
          message: "Email already exists",
        });
      }

      await prisma.student.update({
        where: { id: studentId },
        data: {
          email: email.trim(),
          // name: `${firstName} ${lastName}`.trim(),
          name: [firstName, lastName].filter(Boolean).join(" "),
        },
      });
    }

    const personalInfo = await prisma.studentPersonalInfo.upsert({
      where: { studentId },
      create: { studentId, ...data },
      update: data,
    });

    let enrollment = null;
    if (classSectionId && academicYearId) {
      enrollment = await prisma.studentEnrollment.upsert({
        where: { studentId_academicYearId: { studentId, academicYearId } },
        create: {
          studentId, classSectionId, academicYearId,
          admissionNumber: admissionNumber?.trim() || null,
          admissionDate: admissionDate ? new Date(admissionDate) : new Date(),
          rollNumber: rollNumber?.trim() || null,
          externalId: externalId?.trim() || null,
          status: toEnum(status) || "ACTIVE",
          previousSchoolName: previousSchoolName?.trim() || null,
          previousSchoolBoard: previousSchoolBoard ? toEnum(previousSchoolBoard) : null,
          udiseCode: udiseCode?.trim() || null,
          lateralEntry: lateralEntry === true || lateralEntry === "true" || false,
        },
        update: {
          classSectionId,
          admissionNumber: admissionNumber?.trim() || null,
          rollNumber: rollNumber?.trim() || null,
          externalId: externalId?.trim() || null,
          status: toEnum(status) || "ACTIVE",
          previousSchoolName: previousSchoolName?.trim() || null,
          previousSchoolBoard: previousSchoolBoard ? toEnum(previousSchoolBoard) : null,
          udiseCode: udiseCode?.trim() || null,
          lateralEntry: lateralEntry === true || lateralEntry === "true" || false,
        },
      });
    }

    return res.status(200).json({ personalInfo, enrollment });
  } catch (err) {
    console.error("[savePersonalInfo]", err);
    return res.status(500).json({ message: "Server error", detail: err.message });
  }
};

// ── uploadDocumentsBulk ───────────────────────────────────────────────────────
export const uploadDocumentsBulk = async (req, res) => {
  try {
    const { id: studentId } = req.params;

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (!req.files?.length)
      return res.status(400).json({ message: "No files received" });

    const metadata = JSON.parse(req.body.metadata || "[]");
    if (metadata.length !== req.files.length)
      return res.status(400).json({ message: "metadata length must match files length" });

    const VALID_DOC_TYPES = [
      "AADHAR_CARD", "BIRTH_CERTIFICATE", "PASSBOOK", "TRANSFER_CERTIFICATE",
      "MARKSHEET", "MIGRATION_CERTIFICATE", "CHARACTER_CERTIFICATE",
      "MEDICAL_CERTIFICATE", "PASSPORT", "CASTE_CERTIFICATE",
      "INCOME_CERTIFICATE", "PHOTO", "CUSTOM",
    ];

    for (const [i, meta] of metadata.entries()) {
      if (!VALID_DOC_TYPES.includes(meta.documentName)) {
        return res.status(400).json({
          message: `Invalid documentName "${meta.documentName}" at index ${i}. Must be one of: ${VALID_DOC_TYPES.join(", ")}`,
        });
      }
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

    return res.status(201).json({ documents: created });
  } catch (err) {
    console.error("[uploadDocumentsBulk]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── getStudent ────────────────────────────────────────────────────────────────
export const getStudent = async (req, res) => {
  try {
    const schoolId = req.query.schoolId || req.user.schoolId;
    if (!schoolId)
      return res.status(400).json({ message: "schoolId missing from token" });

    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id, schoolId },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        personalInfo: true,
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
                stream: { select: { id: true, name: true, hasCombinations: true } },
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

    return res.json({ student, fromCache: false });
  } catch (err) {
    console.error("[getStudent]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── listStudents ──────────────────────────────────────────────────────────────
export const listStudents = async (req, res) => {
  try {
   const schoolId = req.query.schoolId || req.user?.schoolId;
    if (!schoolId)
      return res.status(400).json({ message: "schoolId missing from token" });

    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, parseInt(req.query.limit || "20"));
    const search = req.query.search?.trim() || "";
    const classSectionId = req.query.classSectionId || null;
    const academicYearId = req.query.academicYearId || null;
    const status = req.query.status?.toUpperCase() || null;

    const hasEnrollmentFilter = classSectionId || academicYearId || status;
    const enrollmentFilter = {
      ...(classSectionId ? { classSectionId } : {}),
      ...(academicYearId ? { academicYearId } : {}),
      ...(status ? { status } : {}),
    };

    const where = {
      schoolId,
      deletedAt: null,
      ...(hasEnrollmentFilter ? { enrollments: { some: enrollmentFilter } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { personalInfo: { is: { firstName: { contains: search, mode: "insensitive" } } } },
              { personalInfo: { is: { lastName: { contains: search, mode: "insensitive" } } } },
              { enrollments: { some: { admissionNumber: { contains: search, mode: "insensitive" } } } },
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
            motherTongue: true,
            physicallyChallenged: true,
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

    return res.json({
      students,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      fromCache: false,
    });
  } catch (err) {
    console.error("[listStudents]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── deleteStudent ─────────────────────────────────────────────────────────────
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return res.json({
      success: true,
      message: "Student moved to recovery",
      student,
    });
  } catch (error) {
    console.log("DELETE ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── bulkDeleteStudents ────────────────────────────────────────────────────────
export const bulkDeleteStudents = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No student ids provided" });
    }

    const result = await prisma.student.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date() },
    });

    return res.json({
      success: true,
      message: `${result.count} student${result.count !== 1 ? "s" : ""} moved to recovery`,
      count: result.count,
    });
  } catch (error) {
    console.log("BULK DELETE ERROR:", error);
    return res.status(500).json({ success: false, message: error.message });
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

    const student = await prisma.student.findUnique({
      where: { id: userId, schoolId },
      include: {
        personalInfo: true,
        enrollments: {
          include: {
            classSection: {
              include: { stream: true, combination: true, course: true, branch: true },
            },
            academicYear: true,
          },
          orderBy: { createdAt: "desc" },
        },
        parentLinks: {
          include: {
            parent: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
      },
    });

    if (!student) return res.status(404).json({ message: "Student not found" });

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

    const links = await prisma.studentParent.findMany({
      where: { parentId, student: { schoolId } },
      include: {
        student: {
          include: {
            personalInfo: true,
            enrollments: {
              include: {
                classSection: {
                  include: { stream: true, combination: true, course: true, branch: true },
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

    return res.json({ students, fromCache: false });
  } catch (error) {
    console.error("[getMyParentStudents]", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── bulkImportRow ─────────────────────────────────────────────────────────────
export const bulkImportRow = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ message: "schoolId missing from token" });

    const student = await createStudentFull(req.body, schoolId);

    return res.status(201).json({
      studentId: student.id,
      name: student.name,
      message: "Student imported successfully",
    });
  } catch (err) {
    console.error("[bulkImportRow]", err);
    return res.status(400).json({ message: err.message || "Server error" });
  }
};

// ── bulkImportStudents ────────────────────────────────────────────────────────
// export const bulkImportStudents = async (req, res) => {
//   try {
//     const schoolId = req.user?.schoolId;
//     if (!schoolId)
//       return res.status(400).json({ message: "schoolId missing from token" });

//     const students = Array.isArray(req.body.students) ? req.body.students : [];
//     if (!students.length)
//       return res.status(400).json({ message: "No students provided" });

//     const limitCheck = await checkStudentLimit(schoolId, students.length);
//     if (!limitCheck.allowed) {
//       return res.status(403).json({
//         message: limitCheck.message,
//         used:    limitCheck.used,
//         limit:   limitCheck.limit,
//         code:    "STUDENT_LIMIT_REACHED",
//       });
//     }

//     const results = [];
//     let successCount = 0;

//     for (let i = 0; i < students.length; i++) {
//       const s = students[i];
//       try {
//         const student = await createStudentFull(s, schoolId);
//         successCount++;
//         results.push({ row: i + 1, success: true, studentId: student.id });
//       } catch (err) {
//         console.error(`[bulkImportStudents][Row ${i + 1}]`, err);
//         let message = err.message || "Unknown error";
//         if (err.code === "P2002") message = "Duplicate value — email or admission number already exists";
//         if (err.code === "P2003") message = "Related record not found (check class/year names)";
//         results.push({ row: i + 1, success: false, error: message });
//       }
//     }

//     const failedCount = results.filter((r) => !r.success).length;
//     return res.status(200).json({
//       success: failedCount === 0,
//       total: students.length,
//       successCount,
//       failedCount,
//       results,
//     });
//   } catch (err) {
//     console.error("[bulkImportStudents]", err);
//     return res.status(500).json({ message: "Bulk import failed", detail: err.message });
//   }
// };

// ── parseIndianDate ───────────────────────────────────────────────────────────
const parseIndianDate = (dateStr) => {
  if (!dateStr) return undefined;
  if (dateStr instanceof Date) return dateStr;
  const parts = dateStr.toString().trim().split(/[-/]/);
  if (parts.length === 3) {
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    let y = parseInt(parts[2], 10);
    if (y < 100) y = y > 25 ? 1900 + y : 2000 + y;
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) return date;
  }
  return new Date(dateStr);
};

// ── createStudentFull ─────────────────────────────────────────────────────────
// async function createStudentFull(row, schoolId) {
//   const {
//     firstName, lastName, email, password, gender, dateOfBirth, phone,
//     address, city, state, zipCode, nationality, religion, casteCategory,
//     motherTongue, subcaste, domicileState, annualIncome, physicallyChallenged,
//     disabilityType, aadhaarNumber, panNumber, satsNumber,
//     admissionNumber, classSectionName, academicYearName, rollNumber, externalId,
//     admissionDate, status, previousSchoolName, previousSchoolBoard, udiseCode, lateralEntry,
//     parentName, parentPhone, parentEmail, parentPassword, parentOccupation, parentRelation,
//     emergencyContact,
//     bloodGroup, heightCm, weightKg, identifyingMarks, medicalConditions, allergies,
//   } = row;

//   const studentEmail = (row.loginEmail || email)?.toLowerCase().trim();
//   if (!studentEmail) throw new Error("Student login email is required.");
//   if (!admissionNumber) throw new Error("Admission Number is required.");

//   const exists = await prisma.student.findFirst({ where: { email: studentEmail, schoolId } });
//   if (exists) throw new Error(`Student email "${studentEmail}" is already registered.`);

//   // Resolve Class Section
//   const classSection = await prisma.classSection.findFirst({
//     where: {
//       schoolId,
//       OR: [
//         { name: { equals: classSectionName?.trim(), mode: "insensitive" } },
//         {
//           AND: [
//             { grade: { equals: classSectionName?.split(/[-\s]/)[0]?.trim(), mode: "insensitive" } },
//             { section: { equals: classSectionName?.split(/[-\s]/)[1]?.trim(), mode: "insensitive" } },
//           ],
//         },
//       ],
//     },
//   });
//   if (!classSection) throw new Error(`Class "${classSectionName}" not found in system.`);

//   // Resolve Academic Year — try exact match first, then strip spaces around dash
//   let academicYear = await prisma.academicYear.findFirst({
//     where: { schoolId, name: { equals: academicYearName?.trim(), mode: "insensitive" } },
//   });
//   // Fallback: normalise "2024 - 25" ↔ "2024-25" ↔ "2024 -25"
//   if (!academicYear && academicYearName) {
//     const normalized = academicYearName.trim().replace(/\s*-\s*/g, "-");
//     academicYear = await prisma.academicYear.findFirst({
//       where: { schoolId, name: { equals: normalized, mode: "insensitive" } },
//     });
//   }
//   if (!academicYear) {
//     // List what's available to help the admin fix it
//     const available = await prisma.academicYear.findMany({
//       where: { schoolId },
//       select: { name: true },
//       take: 10,
//     });
//     const names = available.map(y => `"${y.name}"`).join(", ");
//     throw new Error(
//       `Academic year "${academicYearName}" not found. Available years: ${names || "none"}`
//     );
//   }

//   // Pre-check Roll Number Conflict
//   if (rollNumber?.toString().trim()) {
//     const rollExists = await prisma.studentEnrollment.findFirst({
//       where: {
//         classSectionId: classSection.id,
//         academicYearId: academicYear.id,
//         rollNumber: rollNumber.toString().trim(),
//       },
//     });
//     if (rollExists) throw new Error(`Roll No ${rollNumber} already assigned in ${classSection.name}.`);
//   }

//   // ── Hash passwords BEFORE the transaction (bcrypt is slow and causes timeouts) ──
//   const hashedStudentPw = await bcrypt.hash(password.toString(), 10);
//   const rawParentPw = parentPassword?.toString().trim() || "Parent@123";
//   const hashedParentPw = await bcrypt.hash(rawParentPw, 10);

//   // timeout: 30s — plenty for 4 DB writes with no bcrypt inside
//   return await prisma.$transaction(async (tx) => {
//     // Step A: Register Student Base
//     const student = await tx.student.create({
//       data: {
//         name: `${firstName} ${lastName}`.trim(),
//         email: studentEmail,
//         password: hashedStudentPw,
//         schoolId,
//       },
//     });

//     // Step B: Personal & Health Info
//     const normalizedBlood = bloodGroupMap[bloodGroup?.toUpperCase().replace(/\s/g, "")] || undefined;

//     await tx.studentPersonalInfo.create({
//       data: {
//         studentId: student.id,
//         firstName, lastName,
//         dateOfBirth: parseIndianDate(dateOfBirth),
//         gender: toEnum(gender),
//         phone: phone?.toString(),
//         address, city, state,
//         zipCode: zipCode?.toString(),
//         nationality: nationality || "Indian",
//         religion,
//         aadhaarNumber: row.aadhaarNumber
//           ? row.aadhaarNumber.toString()
//               .replace(/\s/g, "")
//               .replace(/\.0$/, "")
//               .replace(/[^0-9]/g, "")
//               .slice(0, 12)
//           : null,
//         panNumber: panNumber?.toString().toUpperCase(),
//         satsNumber: satsNumber?.toString(),
//         casteCategory: toEnum(casteCategory),
//         motherTongue, subcaste,
//         domicileState: domicileState || "Karnataka",
//         annualIncome: annualIncome ? parseFloat(annualIncome) : null,
//         physicallyChallenged: physicallyChallenged === "true" || physicallyChallenged === true,
//         disabilityType,
//         bloodGroup: normalizedBlood,
//         heightCm: heightCm ? parseFloat(heightCm) : null,
//         weightKg: weightKg ? parseFloat(weightKg) : null,
//         identifyingMarks, medicalConditions, allergies,
//         parentName,
//         parentPhone: parentPhone?.toString(),
//         parentEmail,
//         emergencyContact: emergencyContact || parentPhone?.toString(),
//       },
//     });

//     // Step C: Enrollment
//     await tx.studentEnrollment.create({
//       data: {
//         studentId: student.id,
//         classSectionId: classSection.id,
//         academicYearId: academicYear.id,
//         admissionNumber: admissionNumber.toString(),
//         admissionDate: parseIndianDate(admissionDate) || new Date(),
//         rollNumber: rollNumber?.toString().trim() || null,
//         externalId: externalId?.toString(),
//         status: toEnum(status) || "ACTIVE",
//         previousSchoolName,
//         previousSchoolBoard: toEnum(previousSchoolBoard),
//         udiseCode: udiseCode?.toString(),
//         lateralEntry: lateralEntry === "true" || lateralEntry === true,
//       },
//     });

//     // Step D: Unified Parent Account
//     if (parentName && parentEmail) {
//       const pEmail = parentEmail.toLowerCase().trim();
//       let parent = await tx.parent.findFirst({ where: { email: pEmail, schoolId } });

//       if (!parent) {
//         parent = await tx.parent.create({
//           data: {
//             name: parentName,
//             email: pEmail,
//             password: hashedParentPw,   // hashed before transaction
//             phone: parentPhone?.toString(),
//             occupation: parentOccupation,
//             schoolId,
//           },
//         });
//       }

//       await tx.studentParent.create({
//         data: {
//           studentId: student.id,
//           parentId: parent.id,
//           relation: toEnum(parentRelation) || "GUARDIAN",
//           isPrimary: true,
//           emergencyContact: true,
//         },
//       });
//     }

//     return student;
//   }, { timeout: 30000 }); // 30 seconds — safe since bcrypt is now outside
// }
// ── createStudentFull ─────────────────────────────────────────────────────────
// FIXED: All lookups & validations happen BEFORE the transaction opens.
// If anything fails (missing class, wrong year, duplicate email, roll conflict)
// we throw BEFORE touching the DB — zero partial/orphan rows ever created.

async function createStudentFull(row, schoolId) {
  const {
    firstName, lastName, email, password, gender, dateOfBirth, phone,
    address, city, state, zipCode, nationality, religion, casteCategory,
    motherTongue, subcaste, domicileState, annualIncome, physicallyChallenged,
    disabilityType, aadhaarNumber, panNumber, satsNumber,
    admissionNumber, classSectionName, academicYearName, rollNumber, externalId,
    admissionDate, status, previousSchoolName, previousSchoolBoard, udiseCode, lateralEntry,
    // ── Father ──
    parentName, parentPhone, parentEmail, parentOccupation, fatherAadhaarNumber,
    // ── Mother ──
    motherName, motherPhone, motherEmail, motherOccupation, motherAadhaarNumber,
    // ── Guardian ──
    guardianName, guardianRelation, guardianPhone, guardianEmail, guardianOccupation,
    // ── Bank ──
    bankAccountNumber, ifscCode, bankName, bankBranch,
    // ── Boarding ──
    boardingType,
    // ── Login (only ONE parent — decided by loginFor) ──
    loginFor, parentPassword,
    emergencyContact,
    bloodGroup, heightCm, weightKg, identifyingMarks, medicalConditions, allergies,
  } = row;

  const studentEmail = (row.loginEmail || email)?.toLowerCase().trim() ||
    `student.${(admissionNumber || "").toString().toLowerCase().replace(/[^a-z0-9]/g,"")}.${schoolId.slice(0,6)}@noemail.local`;

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 1 — ALL VALIDATIONS & LOOKUPS (no DB writes yet)
  // Any failure here throws immediately → transaction never opens → zero orphans
  // ─────────────────────────────────────────────────────────────────────────────

  if (!password)         throw new Error("Password is required.");
  if (!admissionNumber)  throw new Error("Admission Number is required.");
  if (!classSectionName) throw new Error("Class Section is required.");
  if (!academicYearName) throw new Error("Academic Year is required.");
  if (!firstName)        throw new Error("First Name is required.");
  // if (!lastName)         throw new Error("Last Name is required.");

  // ── Login-for validation: only ONE parent (Father or Mother) may get a login ──
  const loginForUpper = (loginFor || "").toString().toUpperCase().trim();
  if (loginForUpper && !["FATHER", "MOTHER"].includes(loginForUpper)) {
    throw new Error(`"Login For" must be FATHER, MOTHER, or left blank. Got "${loginFor}".`);
  }
  if (loginForUpper === "FATHER" && !parentEmail) {
    throw new Error(`"Login For" is set to FATHER but Father Email is missing.`);
  }
  if (loginForUpper === "MOTHER" && !motherEmail) {
    throw new Error(`"Login For" is set to MOTHER but Mother Email is missing.`);
  }

  // 1. Duplicate email check — only block if SAME email AND SAME admission number
  //    (siblings can share a parent email — that is allowed)
  //    The real unique identifier is admission number per academic year (checked in step 5)
  const emailAndAdmExists = await prisma.student.findFirst({
    where: {
      email:     studentEmail,
      schoolId,
      deletedAt: null,
      enrollments: {
        some: {
          admissionNumber: admissionNumber.toString().trim(),
          academicYearId:  (await prisma.academicYear.findFirst({
            where: { schoolId, name: { equals: academicYearName?.trim(), mode: "insensitive" } },
            select: { id: true },
          }))?.id || "none",
        },
      },
    },
  });
  if (emailAndAdmExists) {
    throw new Error(
      `Student with email "${studentEmail}" and Admission No "${admissionNumber}" is already registered. ` +
      `This is an exact duplicate row.`
    );
  }

  // 2. Resolve Class Section
  const classSection = await prisma.classSection.findFirst({
    where: {
      schoolId,
      OR: [
        { name: { equals: classSectionName?.trim(), mode: "insensitive" } },
        {
          AND: [
            { grade:   { equals: classSectionName?.split(/[-\s]/)[0]?.trim(), mode: "insensitive" } },
            { section: { equals: classSectionName?.split(/[-\s]/)[1]?.trim(), mode: "insensitive" } },
          ],
        },
      ],
    },
  });
  if (!classSection)
    throw new Error(`Class "${classSectionName}" not found. Check the Class Section column in your Excel.`);

  // 3. Resolve Academic Year (handles "2026-27", "2026 - 27", "2026 -27" etc.)
  let academicYear = await prisma.academicYear.findFirst({
    where: { schoolId, name: { equals: academicYearName?.trim(), mode: "insensitive" } },
  });
  if (!academicYear && academicYearName) {
    const normalized = academicYearName.trim().replace(/\s*-\s*/g, "-");
    academicYear = await prisma.academicYear.findFirst({
      where: { schoolId, name: { equals: normalized, mode: "insensitive" } },
    });
  }
  if (!academicYear) {
    const available = await prisma.academicYear.findMany({
      where: { schoolId },
      select: { name: true },
      take: 10,
    });
    const names = available.map((y) => `"${y.name}"`).join(", ");
    throw new Error(
      `Academic year "${academicYearName}" not found. Available: ${names || "none — create one first in Settings"}`
    );
  }

  // 4. Roll number conflict
  if (rollNumber?.toString().trim()) {
    const rollExists = await prisma.studentEnrollment.findFirst({
      where: {
        classSectionId: classSection.id,
        academicYearId: academicYear.id,
        rollNumber:     rollNumber.toString().trim(),
      },
      include: {
        student:      { select: { name: true, email: true, personalInfo: { select: { firstName: true, lastName: true } } } },
        classSection: { select: { name: true } },
        academicYear: { select: { name: true } },
      },
    });
    if (rollExists) {
      const existingName  = rollExists.student?.name || `${rollExists.student?.personalInfo?.firstName || ""} ${rollExists.student?.personalInfo?.lastName || ""}`.trim() || "Unknown";
      const existingEmail = rollExists.student?.email || "—";
      throw new Error(
        `Roll No "${rollNumber}" is already assigned in ${classSection.name} for this year. ` +
        `[Existing student: ${existingName} | Email: ${existingEmail} | Class: ${rollExists.classSection?.name} | Year: ${rollExists.academicYear?.name}]`
      );
    }
  }

  // 5. Admission number conflict
  const admExists = await prisma.studentEnrollment.findFirst({
    where: {
      admissionNumber: admissionNumber.toString().trim(),
      academicYearId:  academicYear.id,
    },
    include: {
      student:      { select: { name: true, email: true, personalInfo: { select: { firstName: true, lastName: true } } } },
      classSection: { select: { name: true } },
      academicYear: { select: { name: true } },
    },
  });
  if (admExists) {
    const existingName  = admExists.student?.name || `${admExists.student?.personalInfo?.firstName || ""} ${admExists.student?.personalInfo?.lastName || ""}`.trim() || "Unknown";
    const existingEmail = admExists.student?.email || "—";
    const existingClass = admExists.classSection?.name  || "Unknown Class";
    const existingYear  = admExists.academicYear?.name  || "Unknown Year";
    throw new Error(
      `Admission No "${admissionNumber}" already exists for this academic year. ` +
      `[Existing student: ${existingName} | Email: ${existingEmail} | Class: ${existingClass} | Year: ${existingYear}]`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 2 — HASH PASSWORDS (outside transaction — bcrypt is slow)
  // ─────────────────────────────────────────────────────────────────────────────

  const hashedStudentPw = await bcrypt.hash(password.toString(), 10);
  const rawParentPw     = parentPassword?.toString().trim() || "Parent@123";
  const hashedParentPw  = await bcrypt.hash(rawParentPw, 10);

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 3 — ATOMIC TRANSACTION (all 4 writes or none)
  // Everything is validated above. Any failure auto-rolls back ALL writes.
  // ─────────────────────────────────────────────────────────────────────────────

  return await prisma.$transaction(async (tx) => {

    // Step A: Student base record
    const student = await tx.student.create({
      data: {
        name: [firstName, lastName].filter(Boolean).join(" "),
        email:    studentEmail,
        password: hashedStudentPw,
        schoolId,
      },
    });

    // Step B: Personal & Health info
    const normalizedBlood = bloodGroupMap[bloodGroup?.toUpperCase().replace(/\s/g, "")] || undefined;

    await tx.studentPersonalInfo.create({
      data: {
        studentId:            student.id,
        firstName,
        lastName,
        dateOfBirth:          parseIndianDate(dateOfBirth),
        gender:               toEnum(gender),
        phone:                phone?.toString(),
        address, city, state,
        zipCode:              zipCode?.toString(),
        nationality:          nationality || "Indian",
        religion,
        aadhaarNumber: row.aadhaarNumber
          ? row.aadhaarNumber.toString().replace(/\s/g,"").replace(/\.0$/,"").replace(/[^0-9]/g,"").slice(0,12)
          : null,
        panNumber:            panNumber?.toString().toUpperCase(),
        satsNumber:           satsNumber?.toString(),
        casteCategory:        toEnum(casteCategory),
        motherTongue, subcaste,
        domicileState:        domicileState || "Karnataka",
        annualIncome:         annualIncome ? parseFloat(annualIncome) : null,
        physicallyChallenged: physicallyChallenged === "true" || physicallyChallenged === true,
        disabilityType,
        bloodGroup:           normalizedBlood,
        heightCm:             heightCm ? parseFloat(heightCm) : null,
        weightKg:             weightKg ? parseFloat(weightKg) : null,
        identifyingMarks, medicalConditions, allergies,

        // ── Father — always saved, independent of login ──
        parentName,
        parentPhone:           parentPhone?.toString(),
        parentEmail,
        parentOccupation,
        fatherAadhaarNumber: fatherAadhaarNumber
          ? fatherAadhaarNumber.toString().replace(/\s/g,"").replace(/\.0$/,"").replace(/[^0-9]/g,"").slice(0,12)
          : null,
        emergencyContact:     emergencyContact || parentPhone?.toString(),

        // ── Mother — always saved, independent of login ──
        motherName,
        motherPhone:          motherPhone?.toString(),
        motherEmail,
        motherOccupation,
        motherAadhaarNumber: motherAadhaarNumber
          ? motherAadhaarNumber.toString().replace(/\s/g,"").replace(/\.0$/,"").replace(/[^0-9]/g,"").slice(0,12)
          : null,

        // ── Guardian — always saved ──
        guardianName,
        guardianRelation,
        guardianPhone:        guardianPhone?.toString(),
        guardianEmail,
        guardianOccupation,

        // ── Bank ──
        bankAccountNumber:    bankAccountNumber?.toString(),
        ifscCode:             ifscCode?.toString().toUpperCase(),
        bankName,
        bankBranch,

        // ── Boarding type ──
        boardingType: ["HOSTEL", "DAY_SCHOLAR"].includes((boardingType || "").toString().toUpperCase())
          ? (boardingType || "").toString().toUpperCase()
          : null,
      },
    });

    // Step C: Enrollment (uses IDs already resolved in Phase 1 — no lookup inside tx)
    await tx.studentEnrollment.create({
      data: {
        studentId:           student.id,
        classSectionId:      classSection.id,
        academicYearId:      academicYear.id,
        admissionNumber:     admissionNumber.toString(),
        admissionDate:       parseIndianDate(admissionDate) || new Date(),
        rollNumber:          rollNumber?.toString().trim() || null,
        externalId:          externalId?.toString(),
        status:              toEnum(status) || "ACTIVE",
        previousSchoolName,
        previousSchoolBoard: toEnum(previousSchoolBoard),
        udiseCode:           udiseCode?.toString(),
        lateralEntry:        lateralEntry === "true" || lateralEntry === true,
      },
    });

    // Step D: Parent LOGIN (optional — exactly ONE parent only, per "Login For" column)
    // Info above is ALWAYS saved regardless of this step.
    if (loginForUpper === "FATHER" && parentName && parentEmail) {
      const pEmail = parentEmail.toLowerCase().trim();
      let parent = await tx.parent.findFirst({ where: { email: pEmail, schoolId } });

      if (!parent) {
        parent = await tx.parent.create({
          data: {
            name:       parentName,
            email:      pEmail,
            password:   hashedParentPw,
            phone:      parentPhone?.toString(),
            occupation: parentOccupation,
            schoolId,
          },
        });
      }

      await tx.studentParent.create({
        data: {
          studentId:        student.id,
          parentId:         parent.id,
          relation:         "FATHER",
          isPrimary:        true,
          emergencyContact: true,
        },
      });
    } else if (loginForUpper === "MOTHER" && motherName && motherEmail) {
      const mEmail = motherEmail.toLowerCase().trim();
      let parent = await tx.parent.findFirst({ where: { email: mEmail, schoolId } });

      if (!parent) {
        parent = await tx.parent.create({
          data: {
            name:       motherName,
            email:      mEmail,
            password:   hashedParentPw,
            phone:      motherPhone?.toString(),
            occupation: motherOccupation,
            schoolId,
          },
        });
      }

      await tx.studentParent.create({
        data: {
          studentId:        student.id,
          parentId:         parent.id,
          relation:         "MOTHER",
          isPrimary:        true,
          emergencyContact: true,
        },
      });
    }
    // loginForUpper blank ("") → no login created at all; father/mother info still saved above.

    return student;

  }, { timeout: 30000 });
}

// ── bulkImportStudents ────────────────────────────────────────────────────────
export const bulkImportStudents = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId)
      return res.status(400).json({ message: "schoolId missing from token" });

    const students = Array.isArray(req.body.students) ? req.body.students : [];
    if (!students.length)
      return res.status(400).json({ message: "No students provided" });

    const limitCheck = await checkStudentLimit(schoolId, students.length);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        message: limitCheck.message,
        used:    limitCheck.used,
        limit:   limitCheck.limit,
        code:    "STUDENT_LIMIT_REACHED",
      });
    }

    const results      = [];
    let   successCount = 0;

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      try {
        const student = await createStudentFull(s, schoolId);
        successCount++;
        results.push({ row: i + 1, success: true, studentId: student.id });
      } catch (err) {
        let message = err.message || "Unknown error";
        if (err.code === "P2002") message = "Duplicate value — email or admission number already exists";
        if (err.code === "P2003") message = "Related record not found (check class/year names)";
        if (err.code === "P2028") message = "Transaction timeout — try a smaller batch";
        results.push({ row: i + 1, success: false, error: message });
      }
    }

    const failedCount = results.filter((r) => !r.success).length;
    return res.status(200).json({
      success: failedCount === 0,
      total:   students.length,
      successCount,
      failedCount,
      results,
    });
  } catch (err) {
    console.error("[bulkImportStudents]", err);
    return res.status(500).json({ message: "Bulk import failed", detail: err.message });
  }
};

// ── exportStudentsExcel ───────────────────────────────────────────────────────
export const exportStudentsExcel = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    const { classSectionId } = req.query;

    const students = await prisma.student.findMany({
      where: {
        schoolId,
        ...(classSectionId && { enrollments: { some: { classSectionId } } }),
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

    const exportDate = new Date().toLocaleDateString("en-IN", {
      day: "2-digit", month: "long", year: "numeric",
    });

    const filterLabel = classSectionId
      ? (students[0]?.enrollments?.[0]?.classSection?.name || "Filtered Class")
      : "All Classes";

    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    wb.creator = "School Management System";
    wb.created = new Date();
    wb.modified = new Date();

    const ws = wb.addWorksheet("Students", {
      pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true },
      views: [{ state: "frozen", ySplit: 6 }],
    });

    const C = {
      headerBg: "FF1E3A5F", headerFg: "FFFFFFFF",
      subHeaderBg: "FF2E86AB", subHeaderFg: "FFFFFFFF",
      metaBg: "FFE8F4FD", metaFg: "FF1E3A5F",
      colHeaderBg: "FF34495E", colHeaderFg: "FFFFFFFF",
      rowEven: "FFF8FBFF", rowOdd: "FFFFFFFF",
      borderCol: "FFB0C4DE",
      activeCell: "FFE8F5E9", inactiveCell: "FFFCE4E4",
      statusActive: { bg: "FF1A7A4A", fg: "FFFFFFFF" },
      statusInactive: { bg: "FFC62828", fg: "FFFFFFFF" },
      statusOther: { bg: "FFF57F17", fg: "FFFFFFFF" },
    };

    ws.columns = [
      { key: "rollNo",       width: 10 },
      { key: "admNo",        width: 16 },
      { key: "name",         width: 28 },
      { key: "gender",       width: 10 },
      { key: "phone",        width: 16 },
      { key: "email",        width: 30 },
      { key: "class",        width: 14 },
      { key: "academicYear", width: 18 },
      { key: "dob",          width: 16 },
      { key: "bloodGroup",   width: 12 },
      { key: "status",       width: 12 },
    ];

    const LAST_COL = "K";
    const TOTAL_COLS = 11;

    const thinBorder = (color = C.borderCol) => ({
      top:    { style: "thin", color: { argb: color } },
      left:   { style: "thin", color: { argb: color } },
      bottom: { style: "thin", color: { argb: color } },
      right:  { style: "thin", color: { argb: color } },
    });

    const fillSolid = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

    const addBanner = (text, bgArgb, fgArgb, fontSize, rowHeight) => {
      const row = ws.addRow([text]);
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

    addBanner("🎓  STUDENT LIST REPORT", C.headerBg, C.headerFg, 18, 36);
    addBanner(`Class: ${filterLabel}`, C.subHeaderBg, C.subHeaderFg, 13, 26);
    addBanner(
      `Exported on: ${exportDate}     |     Total Students: ${students.length}`,
      C.metaBg, C.metaFg, 10, 20,
    );

    const spacer = ws.addRow([]);
    spacer.height = 6;

    const headerLabels = [
      "Roll No", "Admission No", "Student Name", "Gender",
      "Phone", "Email", "Class", "Academic Year",
      "Date of Birth", "Blood Group", "Status",
    ];
    const hdrRow = ws.addRow(headerLabels);
    hdrRow.height = 28;
    hdrRow.eachCell((cell) => {
      cell.font      = { bold: true, size: 11, color: { argb: C.colHeaderFg }, name: "Calibri" };
      cell.fill      = fillSolid(C.colHeaderBg);
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border    = thinBorder("FF1A252F");
    });

    students.forEach((s, idx) => {
      const enroll   = s.enrollments?.[0];
      const info     = s.personalInfo;
      const status   = (enroll?.status || "UNKNOWN").toUpperCase();
      const isActive = status === "ACTIVE";

      const dobRaw = info?.dateOfBirth;
      const dobStr = dobRaw
        ? new Date(dobRaw).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
        : "";

      const fullName = [info?.firstName, info?.lastName].filter(Boolean).join(" ") || s.name || "";

      const bloodDisplay = (info?.bloodGroup || "")
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
        status,
      });
      dataRow.height = 22;

      dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
        const isStatusCol  = colNum === TOTAL_COLS;
        const isCenterCol  = colNum === 1 || colNum === 4 || colNum === 9 || colNum === 10;

        cell.font      = { size: 10, name: "Calibri", color: { argb: "FF1A1A2E" } };
        cell.alignment = { horizontal: isCenterCol || isStatusCol ? "center" : "left", vertical: "middle" };
        cell.border    = thinBorder(C.borderCol);

        if (!isStatusCol) {
          cell.fill = fillSolid(isActive ? C.activeCell : C.inactiveCell);
        }

        if (isStatusCol) {
          let sc = C.statusOther;
          if (status === "ACTIVE")   sc = C.statusActive;
          if (status === "INACTIVE") sc = C.statusInactive;
          cell.fill  = fillSolid(sc.bg);
          cell.font  = { bold: true, size: 10, name: "Calibri", color: { argb: sc.fg } };
          cell.alignment = { horizontal: "center", vertical: "middle" };
        }
      });
    });

    ws.addRow([]).height = 8;
    addBanner("SUMMARY", C.headerBg, C.headerFg, 11, 22);

    const activeCount   = students.filter((s) => (s.enrollments?.[0]?.status || "").toUpperCase() === "ACTIVE").length;
    const inactiveCount = students.length - activeCount;

    const statsLabels = [
      ["Total Students", students.length],
      ["Active", activeCount],
      ["Inactive", inactiveCount],
      ["Classes", [...new Set(students.map((s) => s.enrollments?.[0]?.classSection?.name).filter(Boolean))].length],
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

    ws.addRow([]).height = 6;
    addBanner(
      `This report was generated automatically on ${exportDate}. For official use only.`,
      "FFECF0F1", C.metaFg, 8, 18,
    );

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

// ── getStudentLimitStatus ─────────────────────────────────────────────────────
export const getStudentLimitStatus = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ message: "schoolId missing" });

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { universityId: true },
    });

    const payment = await prisma.payment.findFirst({
      where: {
        status: "SUCCESS",
        superAdmin: { universityId: school.universityId },
      },
      orderBy: { createdAt: "desc" },
      select: { studentCount: true },
    });

    const currentCount = await prisma.student.count({ where: { schoolId } });

    return res.json({
      used:  currentCount,
      limit: payment?.studentCount ?? null,
    });
  } catch (err) {
    console.error("[getStudentLimitStatus]", err);
    return res.status(500).json({ message: "Server error" });
  }
};