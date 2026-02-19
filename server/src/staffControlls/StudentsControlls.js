// server/src/staffControlls/StudentsControlls.js
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { uploadToR2, generateSignedUrl } from "../lib/r2.js";
import { getExpiryByRole } from "../utils/fileAccessPolicy.js";

const prisma = new PrismaClient();

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

// ── registerStudent ────────────────────────────────────────────────────────
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

    return res.status(201).json({ student });
  } catch (err) {
    console.error("[registerStudent]", err);
    return res
      .status(500)
      .json({ message: "Server error", detail: err.message });
  }
};

// ── createParentLogin ──────────────────────────────────────────────────────
// Creates a Parent account and links to student via StudentParent junction.
// relation: FATHER | MOTHER | GUARDIAN
// If parent email already exists in school → reuses that account and just
// creates/updates the StudentParent link (same parent, multiple kids).
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

    // Check if this relation already exists for this student
    const existingLink = await prisma.studentParent.findUnique({
      where: { studentId_relation: { studentId, relation: relationEnum } },
    });
    if (existingLink)
      return res.status(409).json({
        message: `This student already has a ${relationEnum} linked. Remove it first to replace.`,
      });

    // Check if parent account exists in this school (reuse if same person has siblings)
    let parent = await prisma.parent.findUnique({
      where: { email_schoolId: { email, schoolId } },
    });

    if (!parent) {
      // New parent — create account
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

    // Create the Student ↔ Parent link with relation type
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

// ── savePersonalInfo ───────────────────────────────────────────────────────
// ✅ Removed grade/className — class assignment is done via StudentEnrollment
// ✅ Added optional enrollment creation: classSectionId + academicYearId + rollNumber
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
      // ✅ Enrollment fields (optional — can be set separately)
      classSectionId,
      academicYearId,
      rollNumber,
    } = req.body;

    if (!firstName || !lastName)
      return res
        .status(400)
        .json({ message: "firstName and lastName are required" });

    if (!admissionDate)
      return res.status(400).json({ message: "admissionDate is required" });

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

    // ✅ If classSectionId + academicYearId provided, upsert enrollment too
    let enrollment = null;
    if (classSectionId && academicYearId) {
      enrollment = await prisma.studentEnrollment.upsert({
        where: { studentId_academicYearId: { studentId, academicYearId } },
        create: {
          studentId,
          classSectionId,
          academicYearId,
          rollNumber: rollNumber || null,
          status: toEnum(status) || "ACTIVE",
        },
        update: {
          classSectionId,
          rollNumber: rollNumber || null,
          status: toEnum(status) || "ACTIVE",
        },
      });
    }

    return res.status(200).json({ personalInfo, enrollment });
  } catch (err) {
    console.error("[savePersonalInfo]", err);
    return res
      .status(500)
      .json({ message: "Server error", detail: err.message });
  }
};

// ── uploadDocumentsBulk ────────────────────────────────────────────────────
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

    return res.status(201).json({ documents: created });
  } catch (err) {
    console.error("[uploadDocumentsBulk]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── getStudent ─────────────────────────────────────────────────────────────
// ✅ Now includes enrollment → classSection so frontend knows which class
export const getStudent = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        personalInfo: true,
        documents: { orderBy: { createdAt: "desc" } },
        // ✅ Return current enrollments with class info
        enrollments: {
          include: {
            classSection: {
              select: { id: true, grade: true, section: true, name: true },
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
    return res.json({ student });
  } catch (err) {
    console.error("[getStudent]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── listStudents ───────────────────────────────────────────────────────────
// ✅ Removed grade/className from select — now pulls class via enrollments
// ✅ Supports optional filter by classSectionId or academicYearId
export const listStudents = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1"));
    const limit = Math.min(100, parseInt(req.query.limit || "20"));
    const search = req.query.search?.trim() || "";
    const classSectionId = req.query.classSectionId || null;
    const academicYearId = req.query.academicYearId || null;

    const schoolId = req.user?.schoolId;

    const where = {
      ...(schoolId ? { schoolId } : {}),
      // ✅ Filter by class/year via enrollments relation
      ...(classSectionId || academicYearId
        ? {
            enrollments: {
              some: {
                ...(classSectionId ? { classSectionId } : {}),
                ...(academicYearId ? { academicYearId } : {}),
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
          createdAt: true,
          personalInfo: {
            select: {
              firstName: true,
              lastName: true,
              status: true,
              profileImage: true,
              admissionDate: true,
            },
          },
          // ✅ Return active enrollment for display (grade/section)
          enrollments: {
            where: academicYearId ? { academicYearId } : {},
            select: {
              rollNumber: true,
              status: true,
              classSection: {
                select: { name: true, grade: true, section: true },
              },
              academicYear: { select: { name: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 1, // most recent enrollment
          },
          _count: { select: { documents: true } },
        },
      }),
    ]);

    return res.json({
      students,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[listStudents]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── deleteStudent ──────────────────────────────────────────────────────────
export const deleteStudent = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.studentDocumentInfo.findMany({
      where: { studentId: id },
      select: { fileKey: true },
    });
    await prisma.student.delete({ where: { id } });
    return res.json({ message: "Student deleted" });
  } catch (err) {
    if (err.code === "P2025")
      return res.status(404).json({ message: "Student not found" });
    console.error("[deleteStudent]", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── viewStudentDocument ────────────────────────────────────────────────────
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

// ── getProfileImage ────────────────────────────────────────────────────────
// 1 day expiry (86400 seconds)
export const getProfileImage = async (req, res) => {
  try {
    if (!req.user?.role)
      return res.status(401).json({ message: "Unauthorized" });

    const { id: studentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        personalInfo: {
          select: { profileImage: true },
        },
      },
    });

    if (!student?.personalInfo?.profileImage)
      return res.status(404).json({ message: "Profile image not found" });

    // 1 day = 24 * 60 * 60
    const expiresIn = 86400;

    const signedUrl = await generateSignedUrl(
      student.personalInfo.profileImage,
      expiresIn,
    );

    return res.json({
      url: signedUrl,
      expiresIn,
    });
  } catch (err) {
    console.error("[getProfileImage]", err);
    return res.status(500).json({ message: "Server error" });
  }
};
