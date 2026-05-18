// ── Student Finance Routes ───────────────────────────────────────────────
import express from "express";
import { PrismaClient } from "@prisma/client";
import { saveBackup } from "../../utils/cloudBackup.js";
import { sendFeePendingWhatsApp } from "../../whatsapp/Fees/sendFeePendingWhatsApp.js";
import { sendFeeReceiptWhatsApp } from "../../whatsapp/Fees/sendFeeReceiptWhatsApp.js";

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
      studentId, name, email, phone, course, fees,
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
        studentId,
        name,
        email,
        phone,
        course: course || null,
        fees: fees ? parseFloat(fees) : null,
        feeBreakdown,
        schoolId, // ✅ NOW WORKS
      }
    });
await saveBackup({
 model: "studentList",
 refId: String(student.id),
  data: student,
  action: "create",
});
    // console.log("Saved student 👉", student);

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
    where: {
  schoolId,
  deletedAt: null
}, // ✅ NOW WORKS
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
      studentId,
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
await saveBackup({
  model: "finance_students",
  refId: String(updated.id),
  data: updated,
  action: "update",
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

    const deleted = await prisma.studentList.update({
      where: { id },
      data: {
        deletedAt: new Date()
      }
    });

    await saveBackup({
      model: "studentList",
      refId: String(id),
      data: deleted,
      action: "delete",
    });

    res.json({
      message: "Deleted Successfully"
    });

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
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

await prisma.studentList.update({
  where: { id },
  data: {
    deletedAt: new Date()
  }
});

    res.json({ message: "Deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── Return the school info for the logged-in user ────────────────────────────
router.get("/mySchool", authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ message: "schoolId missing" });

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, address: true, city: true, phone: true, email: true, logoUrl: true }
    });

    if (!school) return res.status(404).json({ message: "School not found" });
    res.json(school);
  } catch (error) {
    console.error("mySchool error:", error);
    res.status(500).json({ message: error.message });
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

// ── Parent: Get children fees ─────────────────────────────
router.get("/parentFees", authMiddleware, async (req, res) => {
  try {
    const parentId = req.user.id;

    // 1. Get children of parent
    const children = await prisma.studentParent.findMany({
      where: { parentId },
      select: { studentId: true }
    });

    const studentIds = children.map(c => c.studentId);

    // 2. Get finance data
 const fees = await prisma.studentList.findMany({
  where: {
    studentId: { in: studentIds },
    deletedAt: null
  }
});
    res.json(fees);

  } catch (err) {
    console.error("parentFees error:", err);
    res.status(500).json({ message: err.message });
  }
});


router.post(
  "/sendFeeReminder/:id",
  authMiddleware,
  async (req, res) => {
    try {

      const id = parseInt(req.params.id);

      // finance student
      const financeStudent = await prisma.studentList.findUnique({
        where: { id },
      });

      if (!financeStudent) {
        return res.status(404).json({
          message: "Student not found",
        });
      }

      const totalFees = Number(financeStudent.fees || 0);
      const paidAmount = Number(financeStudent.paidAmount || 0);

      const pendingAmount = totalFees - paidAmount;

      if (pendingAmount <= 0) {
        return res.status(400).json({
          message: "No pending fees",
        });
      }

      // REAL student
        const realStudent = await prisma.student.findFirst({
          where: {
            id: financeStudent.studentId,
          },
          include: {
            parentLinks: {
              include: {
                parent: true,
              },
            },
          },
        });

      if (!realStudent) {
        return res.status(404).json({
          message: "Real student record not found",
        });
      }

      // send to all parents
      for (const link of realStudent.parentLinks) {

        const parentPhone = link.parent?.phone;

        if (!parentPhone) continue;

        const school = await prisma.school.findUnique({
          where: {
            id: req.user.schoolId,
          },
        });

        await sendFeePendingWhatsApp({
          phone: parentPhone,
          pendingAmount,
          studentName: financeStudent.name,
          schoolName: school?.name || "School",
        });
      }

      res.json({
        success: true,
        message: "Fee reminder sent successfully",
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: error.message,
      });
    }
  }
);

router.post(
"/sendFeeReceipt/:id",
authMiddleware,
async (req, res) => {
try {
 
  const id = parseInt(req.params.id);

  const financeStudent = await prisma.studentList.findUnique({
    where: { id },
  });

  if (!financeStudent) {
    return res.status(404).json({
      message: "Student not found",
    });
  }

  const realStudent = await prisma.student.findFirst({
    where: {
      id: financeStudent.studentId,
    },
    include: {
      parentLinks: {
        include: {
          parent: true,
        },
      },
    },
  });

  if (!realStudent) {
    return res.status(404).json({
      message: "Real student not found",
    });
  }

  const school = await prisma.school.findUnique({
    where: {
      id: req.user.schoolId,
    },
  });

  // YOUR PDF URL
  const pdfUrl = req.body.pdfUrl;

  for (const link of realStudent.parentLinks) {

    const parentPhone = link.parent?.phone;

    if (!parentPhone) continue;

    await sendFeeReceiptWhatsApp({
      phone: parentPhone,
      studentName: financeStudent.name,
      schoolName: school?.name || "School",
      pdfUrl,
    });
  }

  res.json({
    success: true,
    message: "Fee receipt sent successfully",
  });

} catch (error) {

  console.log(error);

  res.status(500).json({
    message: error.message,
  });
}
 
});

 


// ── Upload fee receipt PDF to R2 ─────────────────────────────────────────────
import { uploadPdfToR2 } from "../../utils/uploadPdfToR2.js"; // adjust path as needed
 

router.post("/uploadFeeReceipt/:id", authMiddleware, async (req, res) => {
  try {
    const id = req.params.id;
    const chunks = [];

    req.on("data", chunk => chunks.push(chunk));
    req.on("end", async () => {
      try {
        const pdfBuffer = Buffer.concat(chunks);
        const fileName = `receipts/${id}_${Date.now()}.pdf`;
        const pdfUrl = await uploadPdfToR2(pdfBuffer, fileName);
        res.json({ success: true, pdfUrl });
      } catch (err) {
        console.error("R2 upload error:", err);
        res.status(500).json({ message: err.message });
      }
    });

    req.on("error", err => {
      console.error("Stream error:", err);
      res.status(500).json({ message: err.message });
    });

  } catch (error) {
    console.error("uploadFeeReceipt error:", error);
    res.status(500).json({ message: error.message });
  }
});