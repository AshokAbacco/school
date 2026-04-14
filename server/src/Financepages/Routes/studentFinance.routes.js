import express from "express";
import { PrismaClient } from "@prisma/client";
import authMiddleware from "../../middlewares/authMiddleware.js";
const router = express.Router();
const prisma = new PrismaClient();

router.post("/addStudentFinance", authMiddleware, async (req, res) => {
  try {

    const schoolId = req.user?.schoolId; // ✅ FIX

    if (!schoolId) {
      return res.status(400).json({ message: "SchoolId missing in user" });
    }

    const {
      name, email, phone, course, fees,
      collegeFee, tuitionFee, examFee,
      transportFee, booksFee, labFee, miscFee, customFees
    } = req.body;

    const feeBreakdown = JSON.stringify({
      collegeFee: collegeFee || 0,
      tuitionFee: tuitionFee || 0,
      examFee: examFee || 0,
      transportFee: transportFee || 0,
      booksFee: booksFee || 0,
      labFee: labFee || 0,
      miscFee: miscFee || 0,
      customFees: customFees || [],
    });

    const student = await prisma.studentList.create({
      data: {
        name,
        email,
        phone,
        course: course || null,
        fees: fees ? parseFloat(fees) : null,
        feeBreakdown,
        schoolId, // ✅ NOW WORKS
      }
    });

    res.json(student);

  } catch (error) {
    console.error("Save Error:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/getStudentFinance", authMiddleware, async (req, res) => {
  try {

    const schoolId = req.user?.schoolId; // ✅ ADD THIS

    if (!schoolId) {
      return res.status(400).json({ message: "SchoolId missing in user" });
    }

    const students = await prisma.studentList.findMany({
      where: { schoolId }, // ✅ NOW WORKS
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json(students);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

router.put("/updateStudentFinance/:id", authMiddleware, async (req, res) => {
  try {

    const id = parseInt(req.params.id);
    const {
      name, email, phone, course, fees,
      collegeFee, tuitionFee, examFee, transportFee, booksFee, labFee, miscFee, customFees,
      paidAmount, paymentStatus, paymentMode, paymentDate
    } = req.body;

    // Build update object — only include fields that are present in the request
    const updateData = {};
    if (name   !== undefined) updateData.name   = name;
    if (email  !== undefined) updateData.email  = email;
    if (phone  !== undefined) updateData.phone  = phone;
    if (course !== undefined) updateData.course = course;
    if (fees   !== undefined) updateData.fees   = fees ? parseFloat(fees) : null;

    // Fee breakdown — only write if breakdown fields were sent
    if (collegeFee !== undefined || tuitionFee !== undefined || customFees !== undefined) {
      updateData.feeBreakdown = JSON.stringify({
        collegeFee:   collegeFee   || 0,
        tuitionFee:   tuitionFee   || 0,
        examFee:      examFee      || 0,
        transportFee: transportFee || 0,
        booksFee:     booksFee     || 0,
        labFee:       labFee       || 0,
        miscFee:      miscFee      || 0,
        customFees:   customFees   || [],
      });
    }

    // Payment tracking fields (sent from PayModal)
    if (paidAmount    !== undefined) updateData.paidAmount    = parseFloat(paidAmount) || 0;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (paymentMode   !== undefined) updateData.paymentMode   = paymentMode;
    if (paymentDate   !== undefined) updateData.paymentDate   = new Date(paymentDate);

    const updated = await prisma.studentList.update({
      where: { id },
      data: updateData,
    });

    res.json(updated);

  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: error.message });
  }
});
router.delete("/deleteStudentFinance/:id", authMiddleware, async (req, res) => {
  try {
    
    const id = parseInt(req.params.id);
    
    await prisma.studentList.delete({
      where: { id }
    });
    
    res.json({ message: "Deleted Successfully" });
    
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/studentsByClass", async (req, res) => {
  try {

    const { schoolId, classSectionId } = req.query;

    const students = await prisma.studentEnrollment.findMany({
      where: {
        classSectionId: classSectionId
      },
      include: {
        student: {
          include: {
            personalInfo: true
          }
        },
        classSection: true
      }
    });

    res.json(students);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});
router.get("/schools", async (req, res) => {
  const schools = await prisma.school.findMany({
    select: {
      id: true,
      name: true
    }
  });

  res.json(schools);
});
router.get("/classSections", async (req, res) => {

  const { schoolId } = req.query;

  const classes = await prisma.classSection.findMany({
    where: {
      schoolId
    },
    select: {
      id: true,
      grade: true,
      section: true,
      name: true
    }
  });

  res.json(classes);

});

router.get("/students", async (req, res) => {
  try {

    const students = await prisma.studentList.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json(students);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
router.delete("/deleteStudent/:id", async (req, res) => {
  try {

    const id = parseInt(req.params.id);

    await prisma.studentList.delete({
      where: { id }
    });

    res.json({ message: "Deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
// ── Student self-view: fetch MY fees by email ────────────────────────────────
router.get("/myFees", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "email is required" });

    const record = await prisma.studentList.findFirst({
      where: { email: email },
      orderBy: { createdAt: "desc" },
    });

    if (!record) return res.status(404).json({ message: "No fee record found" });
    res.json(record);
  } catch (error) {
    console.error("myFees error:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/classFee", async (req, res) => {
  try {
    const { classSectionId, academicYearId } = req.query;

    if (!classSectionId) {
      return res.status(400).json({ message: "classSectionId required" });
    }

    const fee = await prisma.classFee.findFirst({
      where: {
        classSectionId,
        ...(academicYearId && { academicYearId }),
      },
    });

    res.json(fee || null);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});
