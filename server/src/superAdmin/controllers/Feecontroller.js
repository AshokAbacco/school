// server/src/staffControlls/feeController.js

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


// ✅ NEW: UNIVERSAL FILTER (SUPER_ADMIN + ADMIN)
function getFilter(req) {
  if (req.user.role === "SUPER_ADMIN") {
    return {
      school: {
        universityId: req.user.universityId,
      },
    };
  }
  return {
    schoolId: req.user.schoolId,
  };
}


// ─────────────────────────────────────────────────────────────
// GET CLASSES FOR DROPDOWN
// ─────────────────────────────────────────────────────────────
export const getClassesForFee = async (req, res) => {
  try {
    const { academicYearId, schoolId } = req.query;

    let where = {};

    // ✅ SUPER ADMIN → must pass schoolId
    if (req.user.role === "SUPER_ADMIN") {
      if (!schoolId) {
        return res.status(400).json({
          message: "schoolId is required for SUPER_ADMIN",
        });
      }

      where.schoolId = schoolId;
    }

    // ✅ ADMIN → use logged-in school
    else if (req.user.role === "ADMIN") {
      where.schoolId = req.user.schoolId;
    }

    // ✅ (optional safety fallback)
    else {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    const classSections = await prisma.classSection.findMany({
      where,
      orderBy: [{ grade: "asc" }, { section: "asc" }],

      include: {
        stream: { select: { id: true, name: true } },
        course: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },

        // ✅ Academic Year filter
        academicYearLinks: {
          where: academicYearId ? { academicYearId } : {},
          include: {
            academicYear: {
              select: { id: true, name: true, isActive: true },
            },
          },
        },

        // ✅ Fees filter
        classFees: {
          where: academicYearId ? { academicYearId } : {},
          select: {
            id: true,
            feeAmount: true,
            status: true,
            academicYearId: true,
          },
        },
      },
    });

    return res.json({ classSections });

  } catch (err) {
    console.error("[getClassesForFee]", err);
    return res.status(500).json({
      message: "Failed to fetch classes",
    });
  }
};


// ─────────────────────────────────────────────────────────────
// GET ACADEMIC YEARS
// ─────────────────────────────────────────────────────────────
export const getAcademicYearsForFee = async (req, res) => {
  try {
    const filter = getFilter(req);

    const years = await prisma.academicYear.findMany({
      where: filter,
      orderBy: { startDate: "desc" },
    });

    return res.json({ academicYears: years });

  } catch (err) {
    console.error("[getAcademicYearsForFee]", err);
    return res.status(500).json({ message: "Failed to fetch academic years" });
  }
};


// ─────────────────────────────────────────────────────────────
// GET FEES LIST
// ─────────────────────────────────────────────────────────────
export const getFees = async (req, res) => {
  try {
    const filter = getFilter(req);

    const {
      academicYearId,
      status,
      search,
      page = "1",
      limit = "10",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const where = {
      ...filter,
      ...(academicYearId && { academicYearId }),
      ...(status && { status: status.toUpperCase() }),
      ...(search && {
        classSection: {
          name: { contains: search, mode: "insensitive" },
        },
      }),
    };

    const [fees, total] = await Promise.all([
      prisma.classFee.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          classSection: true,
          academicYear: true,
        },
      }),
      prisma.classFee.count({ where }),
    ]);

    return res.json({
      fees,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });

  } catch (err) {
    console.error("[getFees]", err);
    return res.status(500).json({ message: "Failed to fetch fees" });
  }
};


// ─────────────────────────────────────────────────────────────
// CREATE FEE
// ─────────────────────────────────────────────────────────────
export const createFee = async (req, res) => {
  try {
    const { classSectionId, academicYearId, feeAmount, status = "ACTIVE" } = req.body;

    const classSection = await prisma.classSection.findUnique({
      where: { id: classSectionId },
    });

    if (!classSection) {
      return res.status(404).json({ message: "Class not found" });
    }

    // ✅ FIX HERE
    let createdById = null;

    if (req.user.role !== "SUPER_ADMIN") {
      createdById = req.user.id;
    }

    const fee = await prisma.classFee.create({
      data: {
        schoolId: classSection.schoolId,
        classSectionId,
        academicYearId,
        feeAmount: Number(feeAmount),
        status,
        createdById, // ✅ SAFE NOW
      },
    });

    return res.status(201).json({ fee, message: "Fee created successfully" });

  } catch (err) {
    console.error("[createFee]", err);
    return res.status(500).json({ message: "Failed to create fee" });
  }
};

// ─────────────────────────────────────────────────────────────
// UPDATE FEE
// ─────────────────────────────────────────────────────────────
export const updateFee = async (req, res) => {
  try {
    const { id } = req.params;
    const { feeAmount, status } = req.body;

    const fee = await prisma.classFee.update({
      where: { id },
      data: {
        ...(feeAmount && { feeAmount: Number(feeAmount) }),
        ...(status && { status }),
      },
    });

    return res.json({ fee, message: "Fee updated successfully" });

  } catch (err) {
    console.error("[updateFee]", err);
    return res.status(500).json({ message: "Failed to update fee" });
  }
};


// ─────────────────────────────────────────────────────────────
// DELETE FEE
// ─────────────────────────────────────────────────────────────
export const deleteFee = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.classFee.delete({ where: { id } });

    return res.json({ message: "Fee deleted successfully" });

  } catch (err) {
    console.error("[deleteFee]", err);
    return res.status(500).json({ message: "Failed to delete fee" });
  }
};


// ─────────────────────────────────────────────────────────────
// STATS
// ─────────────────────────────────────────────────────────────
export const getFeeStats = async (req, res) => {
  try {
    const filter = getFilter(req);

    const total = await prisma.classFee.count({ where: filter });

    return res.json({
      totalClasses: total,
      activeCount: total,
      totalRevenuePotential: 0,
    });

  } catch (err) {
    console.error("[getFeeStats]", err);
    return res.status(500).json({ message: "Failed to fetch stats" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET SINGLE FEE
// ─────────────────────────────────────────────────────────────
export const getFeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const fee = await prisma.classFee.findUnique({
      where: { id },
      include: {
        classSection: true,
        academicYear: true,
      },
    });

    if (!fee) {
      return res.status(404).json({ message: "Fee not found" });
    }

    return res.json({ fee });

  } catch (err) {
    console.error("[getFeeById]", err);
    return res.status(500).json({ message: "Failed to fetch fee" });
  }
};