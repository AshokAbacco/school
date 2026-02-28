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

const compact = (obj) =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== ""),
  );

// ── registerStudent ───────────────────────────────────────────────────────────
// FIX: admissionNumber is now accepted here and saved to Student model
// (it's a required unique field — omitting it was causing a DB crash)
export const registerStudent = async (req, res) => {
  try {
    const { name, email, password, admissionNumber } = req.body;

    if (!email || !password || !name)
      return res
        .status(400)
        .json({ message: "name, email and password are required" });

    // FIX: admissionNumber is required at registration time
    if (!admissionNumber?.trim())
      return res.status(400).json({ message: "admissionNumber is required" });

    const schoolId = req.user?.schoolId;
    if (!schoolId)
      return res.status(400).json({ message: "schoolId missing from token" });

    // Check duplicate email
    const exists = await prisma.student.findFirst({
      where: { email, schoolId },
    });
    if (exists)
      return res.status(409).json({
        message: "A student with this email already exists in this school",
      });

    // Check duplicate admissionNumber
    const admExists = await prisma.student.findFirst({
      where: { admissionNumber: admissionNumber.trim(), schoolId },
    });
    if (admExists)
      return res.status(409).json({
        message: "A student with this admission number already exists",
      });

    const hashed = await bcrypt.hash(password, 10);
    const student = await prisma.student.create({
      data: {
        name,
        email,
        password: hashed,
        schoolId,
        admissionNumber: admissionNumber.trim(), // FIX: now included
      },
      select: {
        id: true,
        name: true,
        email: true,
        admissionNumber: true,
        createdAt: true,
      },
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
      classSectionId,
      academicYearId,
      rollNumber,
      externalId,
    } = req.body;

    if (!firstName || !lastName)
      return res
        .status(400)
        .json({ message: "firstName and lastName are required" });
    if (!admissionDate)
      return res.status(400).json({ message: "admissionDate is required" });

    // FIX: rollNumber is now truly optional — removed the hard block
    // It can be assigned later when admin allocates roll numbers

    let profileImageUrl;
    if (req.file) {
      const key = `students/${studentId}/profile/${Date.now()}-${req.file.originalname}`;
      profileImageUrl = await uploadToR2(
        key,
        req.file.buffer,
        req.file.mimetype,
      );
    }

    const rawBloodGroup = toEnum(bloodGroup)
      ?.replace(/\+/g, "_PLUS")
      .replace(/-/g, "_MINUS");
    const fixedBloodGroup = bloodGroupMap[rawBloodGroup] || rawBloodGroup;

    const data = compact({
      firstName,
      lastName,
      phone,
      address,
      city,
      state,
      zipCode,
      admissionDate: admissionDate ? new Date(admissionDate) : undefined,
      status: toEnum(status) || "ACTIVE",
      parentName,
      parentEmail,
      parentPhone,
      emergencyContact,
      bloodGroup: fixedBloodGroup,
      medicalConditions,
      allergies,
      ...(profileImageUrl ? { profileImage: profileImageUrl } : {}),
      ...(dateOfBirth ? { dateOfBirth: new Date(dateOfBirth) } : {}),
      ...(gender ? { gender: toEnum(gender) } : {}),
    });

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
          studentId,
          classSectionId,
          academicYearId,
          rollNumber: rollNumber?.trim() || null, // FIX: null allowed
          externalId: externalId?.trim() || null,
          status: toEnum(status) || "ACTIVE",
        },
        update: {
          classSectionId,
          rollNumber: rollNumber?.trim() || null, // FIX: null allowed
          externalId: externalId?.trim() || null,
          status: toEnum(status) || "ACTIVE",
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

    const created = await Promise.all(
      req.files.map(async (file, idx) => {
        const { documentName, customLabel } = metadata[idx];
        const key = `students/${studentId}/documents/${Date.now()}-${file.originalname}`;
        await uploadToR2(key, file.buffer, file.mimetype);
        return prisma.studentDocumentInfo.create({
          data: {
            studentId,
            documentName,
            customLabel: customLabel || null,
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
// FIX: classSection now includes stream, combination, course, branch
// so PUC and Degree student views show full context
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
        admissionNumber: true,
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
                // FIX: include stream for PUC
                streamId: true,
                stream: {
                  select: { id: true, name: true, hasCombinations: true },
                },
                // FIX: include combination for PUC
                combinationId: true,
                combination: { select: { id: true, name: true, code: true } },
                // FIX: include course for Degree/Diploma/PG
                courseId: true,
                course: {
                  select: {
                    id: true,
                    name: true,
                    hasBranches: true,
                    totalSemesters: true,
                  },
                },
                // FIX: include branch for Degree/Diploma/PG
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
// FIX: classSection now includes id + stream/course/branch context
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

    const baseKey = `students:list:${schoolId}:${JSON.stringify({
      page,
      limit,
      search,
      classSectionId,
      academicYearId,
      status,
    })}`;

    const key = await cacheService.buildKey(schoolId, baseKey);

    const cached = await cacheService.get(key);
    if (cached) return res.json({ ...JSON.parse(cached), fromCache: true });

    const statusFilter = status
      ? {
          OR: [
            { enrollments: { some: { status } } },
            {
              AND: [
                { enrollments: { none: {} } },
                { personalInfo: { status } },
              ],
            },
          ],
        }
      : {};

    const where = {
      ...(schoolId ? { schoolId } : {}),
      ...statusFilter,
      ...(classSectionId || academicYearId
        ? {
            enrollments: {
              some: {
                ...(classSectionId ? { classSectionId } : {}),
                ...(academicYearId ? { academicYearId } : {}),
                ...(status && (classSectionId || academicYearId)
                  ? { status }
                  : {}),
              },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              {
                personalInfo: {
                  firstName: { contains: search, mode: "insensitive" },
                },
              },
              {
                personalInfo: {
                  lastName: { contains: search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    };

    const [total, students] = await prisma.$transaction([
      prisma.student.count({ where }),
      prisma.student.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          admissionNumber: true,
          createdAt: true,
          personalInfo: {
            select: {
              firstName: true,
              lastName: true,
              status: true,
              profileImage: true,
              phone: true,
              admissionDate: true,
            },
          },
          enrollments: {
            where: academicYearId ? { academicYearId } : {},
            select: {
              rollNumber: true,
              externalId: true,
              status: true,
              classSection: {
                select: {
                  id: true, // FIX: id was missing — edit from list was broken
                  name: true,
                  grade: true,
                  section: true,
                  // FIX: include context for PUC and Degree
                  streamId: true,
                  stream: { select: { id: true, name: true } },
                  combinationId: true,
                  combination: { select: { id: true, name: true, code: true } },
                  courseId: true,
                  course: { select: { id: true, name: true } },
                  branchId: true,
                  branch: { select: { id: true, name: true, code: true } },
                },
              },
              academicYear: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: { select: { documents: true } },
        },
      }),
    ]);

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

    const expiresIn = 86400;
    const signedUrl = await generateSignedUrl(
      student.personalInfo.profileImage,
      expiresIn,
    );
    return res.json({ url: signedUrl, expiresIn });
  } catch (err) {
    console.error("[getProfileImage]", err);
    return res.status(500).json({ message: "Server error" });
  }
};