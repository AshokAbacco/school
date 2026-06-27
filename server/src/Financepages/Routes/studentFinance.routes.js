// ── Student Finance Routes ───────────────────────────────────────────────
import express from "express";
import { PrismaClient } from "@prisma/client";
import { saveSchoolBackup } from "../../utils/schoolBackup.service.js";
import { sendFeePendingWhatsApp } from "../../whatsapp/Fees/sendFeePendingWhatsApp.js";
import { sendFeeReceiptWhatsApp } from "../../whatsapp/Fees/sendFeeReceiptWhatsApp.js";
import { sendFeeVoiceReminder } from "../../voice/services/voice.service.js";
import authMiddleware from "../../middlewares/authMiddleware.js";
const router = express.Router();
const prisma = new PrismaClient();

// ── Check if new fee-category tables exist in DB ──────────────────────────────
// After running `npx prisma migrate dev --name add_fee_categories`
// set this to true (or it will auto-detect on first call).
let FEE_CATEGORIES_MIGRATED = null; // null = not yet checked

async function checkMigrated() {
  if (FEE_CATEGORIES_MIGRATED !== null) return FEE_CATEGORIES_MIGRATED;
  try {
    await prisma.$queryRaw`SELECT 1 FROM "fee_categories" LIMIT 1`;
    FEE_CATEGORIES_MIGRATED = true;
  } catch {
    FEE_CATEGORIES_MIGRATED = false;
  }
  return FEE_CATEGORIES_MIGRATED;
}

// ── ADD STUDENT FINANCE ───────────────────────────────────────────────────────
router.post("/addStudentFinance", authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ message: "SchoolId missing in user" });

    const {
      studentId, name, email, phone, course, fees,
      collegeFee, tuitionFee, examFee,
      transportFee, booksFee, labFee, miscFee,
      customFees, feeDate, feeBreakdownDetails,
    } = req.body;

    const feeBreakdown = JSON.stringify({
      collegeFee:          collegeFee   || 0,
      tuitionFee:          tuitionFee   || 0,
      examFee:             examFee      || 0,
      transportFee:        transportFee || 0,
      booksFee:            booksFee     || 0,
      labFee:              labFee       || 0,
      miscFee:             miscFee      || 0,
      customFees:          customFees   || [],
      feeBreakdownDetails: feeBreakdownDetails || {},
    });

    const existing = studentId
      ? await prisma.studentList.findFirst({ where: { studentId, schoolId, deletedAt: null } })
      : null;

    let student;

    if (existing) {
      student = await prisma.studentList.update({
        where: { id: existing.id },
        data: { name, email, phone, course: course || null, fees: fees ? parseFloat(fees) : null, feeBreakdown, feeDate: feeDate ? new Date(feeDate) : new Date() },
      });

      // Only sync categories if migration has been run
      if (await checkMigrated()) {
        await syncFeeCategories(schoolId, student.id, { collegeFee, tuitionFee, examFee, transportFee, booksFee, labFee, miscFee, customFees });
      }

      await saveSchoolBackup({ schoolId, module: "studentList", recordId: String(student.id), data: student, action: "update" });
      return res.json({ ...student, _upserted: true });
    }

    student = await prisma.studentList.create({
      data: {
        studentId, name, email, phone,
        course: course || null,
        fees: fees ? parseFloat(fees) : null,
        feeBreakdown,
        feeDate: feeDate ? new Date(feeDate) : new Date(),
        schoolId,
      },
    });

    if (await checkMigrated()) {
      await syncFeeCategories(schoolId, student.id, { collegeFee, tuitionFee, examFee, transportFee, booksFee, labFee, miscFee, customFees });
    }

    await saveSchoolBackup({ schoolId, module: "studentList", recordId: String(student.id), data: student, action: "create" });
    res.json(student);
  } catch (error) {
    console.error("Save Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ── Helper: upsert FeeCategory + StudentFeeCategory rows ──────────────────────
// Only called after migration is confirmed
async function syncFeeCategories(schoolId, studentListId, breakdown) {
  const {
    collegeFee = 0, tuitionFee = 0, examFee = 0,
    transportFee = 0, booksFee = 0, labFee = 0, miscFee = 0,
    customFees = [],
  } = breakdown;

  const STANDARD = [
    { name: "School Fee",    amount: collegeFee,   order: 1 },
    { name: "Tuition Fee",   amount: tuitionFee,   order: 2 },
    { name: "Exam Fee",      amount: examFee,      order: 3 },
    { name: "Transport Fee", amount: transportFee, order: 4 },
    { name: "Books Fee",     amount: booksFee,     order: 5 },
    { name: "Lab Fee",       amount: labFee,       order: 6 },
    { name: "Miscellaneous", amount: miscFee,      order: 7 },
  ];

  const customEntries = (Array.isArray(customFees) ? customFees : [])
    .filter(c => Number(c.amount || c.total || 0) > 0)
    .map((c, i) => ({ name: c.label || `Custom Fee ${i + 1}`, amount: Number(c.amount || c.total || 0), order: 10 + i }));

  const allEntries = [...STANDARD, ...customEntries].filter(e => Number(e.amount) > 0);

  for (const entry of allEntries) {
    const cat = await prisma.feeCategory.upsert({
      where:  { name_schoolId: { name: entry.name, schoolId } },
      create: { name: entry.name, order: entry.order, schoolId },
      update: { order: entry.order, isActive: true },
    });

    const existing = await prisma.studentFeeCategory.findUnique({
      where: { studentListId_categoryId: { studentListId, categoryId: cat.id } },
    });

    if (existing) {
      await prisma.studentFeeCategory.update({
        where: { id: existing.id },
        data:  { totalAmount: entry.amount },
      });
    } else {
      await prisma.studentFeeCategory.create({
        data: { studentListId, categoryId: cat.id, totalAmount: entry.amount, paidAmount: 0, schoolId },
      });
    }
  }
}

// ── GET STUDENT FINANCE LIST ──────────────────────────────────────────────────
router.get("/getStudentFinance", authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ message: "SchoolId missing in user" });

    const migrated = await checkMigrated();

    const students = await prisma.studentList.findMany({
      where:   { schoolId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      // Only include feeCategories if the migration has been run
      ...(migrated && {
        include: {
          feeCategories: {
            include:  { category: true },
            orderBy:  { category: { order: "asc" } },
          },
        },
      }),
    });

    res.json(students);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

// ── GET STUDENT FEE CATEGORIES (for a single student) ────────────────────────
router.get("/studentFeeCategories/:studentListId", authMiddleware, async (req, res) => {
  try {
    if (!(await checkMigrated())) return res.json([]);

    const studentListId = parseInt(req.params.studentListId);
    const categories = await prisma.studentFeeCategory.findMany({
      where:   { studentListId },
      include: { category: true, payments: { orderBy: { paidAt: "desc" } } },
      orderBy: { category: { order: "asc" } },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET FEE CATEGORIES MASTER LIST ───────────────────────────────────────────
router.get("/feeCategories", authMiddleware, async (req, res) => {
  try {
    if (!(await checkMigrated())) return res.json([]);

    const schoolId  = req.user?.schoolId;
    const categories = await prisma.feeCategory.findMany({
      where:   { schoolId, isActive: true },
      orderBy: { order: "asc" },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── RECORD CATEGORY PAYMENT ───────────────────────────────────────────────────
router.post("/recordCategoryPayment", authMiddleware, async (req, res) => {
  try {
    if (!(await checkMigrated())) {
      return res.status(400).json({ message: "Fee category tables not yet migrated. Run: npx prisma migrate dev --name add_fee_categories" });
    }

    const schoolId = req.user?.schoolId;
    const { studentListId, categoryId, amount, paymentMode } = req.body;

    if (!studentListId || !categoryId || !amount || amount <= 0) {
      return res.status(400).json({ message: "studentListId, categoryId and amount are required" });
    }

    const sfc = await prisma.studentFeeCategory.findUnique({
      where: { studentListId_categoryId: { studentListId: parseInt(studentListId), categoryId } },
    });

    if (!sfc) return res.status(404).json({ message: "Fee category record not found for this student" });

    const pending = Number(sfc.totalAmount) - Number(sfc.paidAmount);
    const payAmt  = Math.min(Number(amount), pending);

    if (payAmt <= 0) return res.status(400).json({ message: "Fee already fully paid for this category" });

    await prisma.$transaction([
      prisma.studentFeeCategory.update({
        where: { id: sfc.id },
        data:  { paidAmount: { increment: payAmt } },
      }),
      prisma.studentFeeCategoryPayment.create({
        data: {
          studentFeeCategoryId: sfc.id,
          amount:      payAmt,
          paymentMode: paymentMode || "Cash",
          createdBy:   req.user?.id || null,
        },
      }),
    ]);

    // Recalculate aggregate paidAmount on StudentList
    const allCats = await prisma.studentFeeCategory.findMany({
      where: { studentListId: parseInt(studentListId) },
    });
    const newTotalPaid = allCats.reduce((sum, c) => sum + Number(c.paidAmount), 0) + payAmt;

    const studentListRecord = await prisma.studentList.findUnique({ where: { id: parseInt(studentListId) } });
    const totalFees = Number(studentListRecord?.fees || 0);

    await prisma.studentList.update({
      where: { id: parseInt(studentListId) },
      data: {
        paidAmount:    newTotalPaid,
        paymentMode:   paymentMode || "Cash",
        paymentDate:   new Date(),
        paymentStatus: newTotalPaid >= totalFees ? "PAID" : "PARTIAL",
      },
    });

    res.json({ success: true, newTotalPaid });
  } catch (error) {
    console.error("recordCategoryPayment error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ── UPDATE STUDENT FINANCE ────────────────────────────────────────────────────
router.put("/updateStudentFinance/:id", authMiddleware, async (req, res) => {
  try {
    const id       = parseInt(req.params.id);
    const schoolId = req.user?.schoolId;

    const {
      studentId, name, email, phone, course, fees,
      collegeFee, tuitionFee, examFee,
      transportFee, booksFee, labFee, miscFee, customFees,
      paidAmount, schoolFeePaid, tuitionFeePaid, examFeePaid, transportFeePaid, booksFeePaid, labFeePaid, miscFeePaid,
      paymentStatus, paymentMode, paymentDate,
      feeDate, feeBreakdownDetails,
    } = req.body;

    const updateData = {};
    if (name   !== undefined) updateData.name   = name;
    if (email  !== undefined) updateData.email  = email;
    if (phone  !== undefined) updateData.phone  = phone;
    if (course !== undefined) updateData.course = course;
    if (fees   !== undefined) updateData.fees   = fees ? parseFloat(fees) : null;
    if (feeDate !== undefined) updateData.feeDate = new Date(feeDate);

    if (collegeFee !== undefined || tuitionFee !== undefined || customFees !== undefined) {
      updateData.feeBreakdown = JSON.stringify({
        collegeFee:          collegeFee   || 0,
        tuitionFee:          tuitionFee   || 0,
        examFee:             examFee      || 0,
        transportFee:        transportFee || 0,
        booksFee:            booksFee     || 0,
        labFee:              labFee       || 0,
        miscFee:             miscFee      || 0,
        customFees:          customFees   || [],
        feeBreakdownDetails: feeBreakdownDetails || {},
      });

      if (await checkMigrated()) {
        await syncFeeCategories(schoolId, id, { collegeFee, tuitionFee, examFee, transportFee, booksFee, labFee, miscFee, customFees });
      }
    }

    if (paidAmount     !== undefined) updateData.paidAmount     = parseFloat(paidAmount)     || 0;
    if (schoolFeePaid  !== undefined) updateData.schoolFeePaid  = parseFloat(schoolFeePaid)  || 0;
    if (tuitionFeePaid  !== undefined) updateData.tuitionFeePaid  = parseFloat(tuitionFeePaid)  || 0;
    if (examFeePaid     !== undefined) updateData.examFeePaid     = parseFloat(examFeePaid)     || 0;
    if (transportFeePaid !== undefined) updateData.transportFeePaid = parseFloat(transportFeePaid) || 0;
    if (booksFeePaid    !== undefined) updateData.booksFeePaid    = parseFloat(booksFeePaid)    || 0;
    if (labFeePaid      !== undefined) updateData.labFeePaid      = parseFloat(labFeePaid)      || 0;
    if (miscFeePaid     !== undefined) updateData.miscFeePaid     = parseFloat(miscFeePaid)     || 0;
    if (paymentStatus  !== undefined) updateData.paymentStatus  = paymentStatus;
    if (paymentMode    !== undefined) updateData.paymentMode    = paymentMode;
    if (paymentDate    !== undefined) updateData.paymentDate    = new Date(paymentDate);

    const updated = await prisma.studentList.update({ where: { id }, data: updateData });

    await saveSchoolBackup({ schoolId, module: "studentList", recordId: String(updated.id), data: updated, action: "update" });
    res.json(updated);
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ── DELETE STUDENT FINANCE (soft delete) ─────────────────────────────────────
router.delete("/deleteStudentFinance/:id", authMiddleware, async (req, res) => {
  try {
    const id       = parseInt(req.params.id);
    const schoolId = req.user?.schoolId;

    const deleted = await prisma.studentList.update({
      where: { id },
      data:  { deletedAt: new Date() },
    });

    await saveSchoolBackup({ schoolId, module: "studentList", recordId: String(deleted.id), data: deleted, action: "delete" });
    res.json({ message: "Deleted Successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── STUDENTS BY CLASS ─────────────────────────────────────────────────────────
// router.get("/studentsByClass", async (req, res) => {
//   try {
//     const { classSectionId } = req.query;
//     if (!classSectionId) return res.status(400).json({ message: "classSectionId required" });

//     const enrollments = await prisma.studentEnrollment.findMany({
//       where:   { classSectionId },
//       include: { student: { include: { personalInfo: true } } },
//     });

//     const students = enrollments.map(e => ({
//       id:    e.student.id,
//       name:  e.student.personalInfo
//         ? `${e.student.personalInfo.firstName} ${e.student.personalInfo.lastName}`
//         : e.student.name,
//       email: e.student.email,
//       phone: e.student.personalInfo?.phone || "",
//     }));

//     res.json(students);
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ message: error.message });
//   }
// });
// ── STUDENTS BY CLASS ─────────────────────────────────────────────────────────
router.get("/studentsByClass", async (req, res) => {
  try {
    const { classSectionId } = req.query;
    if (!classSectionId) return res.status(400).json({ message: "classSectionId required" });

    const enrollments = await prisma.studentEnrollment.findMany({
      where: { classSectionId, status: "ACTIVE" },
      include: {
        student: { include: { personalInfo: true } },
        classSection: {
          select: { id: true, name: true, grade: true, section: true },
        },
      },
      orderBy: { student: { name: "asc" } },
    });

    res.json(enrollments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// ── CLASS SECTIONS ────────────────────────────────────────────────────────────
router.get("/classSections", authMiddleware, async (req, res) => {
  try {
    const schoolId = req.query.schoolId || req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ message: "schoolId required" });

    const sections = await prisma.classSection.findMany({
      where:   { schoolId, deletedAt: null },
      select:  { id: true, name: true, grade: true, section: true },
      orderBy: [{ grade: "asc" }, { section: "asc" }],
    });

    res.json(sections);
  } catch (error) {
    console.error("classSections error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ── MY SCHOOL ─────────────────────────────────────────────────────────────────
router.get("/mySchool", authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ message: "schoolId missing" });

    const school = await prisma.school.findUnique({
      where:  { id: schoolId },
      select: { id: true, name: true, address: true, city: true, phone: true, email: true, logoUrl: true },
    });

    if (!school) return res.status(404).json({ message: "School not found" });
    res.json(school);
  } catch (error) {
    console.error("mySchool error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ── MY FEES (student self-view by email) ──────────────────────────────────────
router.get("/myFees", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ message: "email is required" });

    const migrated = await checkMigrated();

    const record = await prisma.studentList.findFirst({
      where:   { email },
      orderBy: { createdAt: "desc" },
      ...(migrated && {
        include: {
          feeCategories: { include: { category: true }, orderBy: { category: { order: "asc" } } },
        },
      }),
    });

    if (!record) return res.status(404).json({ message: "No fee record found" });
    res.json(record);
  } catch (error) {
    console.error("myFees error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ── CLASS FEE ─────────────────────────────────────────────────────────────────
router.get("/classFee", async (req, res) => {
  try {
    const { classSectionId, academicYearId } = req.query;
    if (!classSectionId) return res.status(400).json({ message: "classSectionId required" });

    const fee = await prisma.classFee.findFirst({
      where: { classSectionId, ...(academicYearId && { academicYearId }) },
    });

    res.json(fee || null);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// ── PARENT FEES ───────────────────────────────────────────────────────────────
router.get("/parentFees", authMiddleware, async (req, res) => {
  try {
    const parentId = req.user.id;
    const migrated = await checkMigrated();

    const children = await prisma.studentParent.findMany({
      where:  { parentId },
      select: { studentId: true },
    });

    const studentIds = children.map(c => c.studentId);

    const fees = await prisma.studentList.findMany({
      where: { studentId: { in: studentIds }, deletedAt: null },
      ...(migrated && {
        include: {
          feeCategories: { include: { category: true }, orderBy: { category: { order: "asc" } } },
        },
      }),
    });

    res.json(fees);
  } catch (err) {
    console.error("parentFees error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ── SEND FEE REMINDER (WhatsApp) ──────────────────────────────────────────────
router.post("/sendFeeReminder/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const financeStudent = await prisma.studentList.findUnique({ where: { id } });
    if (!financeStudent) return res.status(404).json({ message: "Student not found" });

    const totalFees     = Number(financeStudent.fees       || 0);
    const paidAmount    = Number(financeStudent.paidAmount  || 0);
    const pendingAmount = totalFees - paidAmount;
    if (pendingAmount <= 0) return res.status(400).json({ message: "No pending fees" });

    const realStudent = await prisma.student.findFirst({
      where:   { id: financeStudent.studentId },
      include: { parentLinks: { include: { parent: true } } },
    });
    if (!realStudent) return res.status(404).json({ message: "Real student record not found" });

    const school = await prisma.school.findUnique({ where: { id: req.user.schoolId } });

    for (const link of realStudent.parentLinks) {
      const parentPhone = link.parent?.phone;
      if (!parentPhone) continue;
      await sendFeePendingWhatsApp({ phone: parentPhone, pendingAmount, studentName: financeStudent.name, schoolName: school?.name || "School" });
    }

    res.json({ success: true, message: "Fee reminder sent successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

// ── SEND FEE RECEIPT (WhatsApp PDF) ──────────────────────────────────────────
router.post("/sendFeeReceipt/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const financeStudent = await prisma.studentList.findUnique({ where: { id } });
    if (!financeStudent) return res.status(404).json({ message: "Student not found" });

    const realStudent = await prisma.student.findFirst({
      where:   { id: financeStudent.studentId },
      include: { parentLinks: { include: { parent: true } } },
    });
    if (!realStudent) return res.status(404).json({ message: "Real student not found" });

    const school  = await prisma.school.findUnique({ where: { id: req.user.schoolId } });
    const pdfUrl  = req.body.pdfUrl;

    for (const link of realStudent.parentLinks) {
      const parentPhone = link.parent?.phone;
      if (!parentPhone) continue;
      await sendFeeReceiptWhatsApp({ phone: parentPhone, studentName: financeStudent.name, schoolName: school?.name || "School", pdfUrl });
    }

    res.json({ success: true, message: "Fee receipt sent successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

// ── UPLOAD FEE RECEIPT PDF TO R2 ─────────────────────────────────────────────
import { uploadPdfToR2 } from "../../utils/uploadPdfToR2.js";

router.post("/uploadFeeReceipt/:id", authMiddleware, async (req, res) => {
  try {
    const id     = req.params.id;
    const chunks = [];

    req.on("data",  chunk => chunks.push(chunk));
    req.on("end",   async () => {
      try {
        const pdfBuffer = Buffer.concat(chunks);
        const fileName  = `receipts/${id}_${Date.now()}.pdf`;
        const pdfUrl    = await uploadPdfToR2(pdfBuffer, fileName);
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

// ── SEND FEE VOICE REMINDER ───────────────────────────────────────────────────
router.post("/sendFeeVoiceReminder/:id", authMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const financeStudent = await prisma.studentList.findUnique({ where: { id } });
    if (!financeStudent) return res.status(404).json({ message: "Student not found" });

    const totalFees     = Number(financeStudent.fees       || 0);
    const paidAmount    = Number(financeStudent.paidAmount  || 0);
    const pendingAmount = totalFees - paidAmount;
    if (pendingAmount <= 0) return res.status(400).json({ message: "No pending fees" });

    const realStudent = await prisma.student.findFirst({
      where:   { id: financeStudent.studentId },
      include: { parentLinks: { include: { parent: true } } },
    });
    if (!realStudent) return res.status(404).json({ message: "Real student not found" });

    const school = await prisma.school.findUnique({ where: { id: req.user.schoolId } });

    for (const link of realStudent.parentLinks) {
      const parentPhone = link.parent?.phone;
      if (!parentPhone) continue;
      await sendFeeVoiceReminder({ phone: parentPhone, pendingAmount, studentName: financeStudent.name, schoolName: school?.name || "School" });
    }

    res.json({ success: true, message: "Voice reminder sent successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});



// ─────────────────────────────────────────────────────────────────────────────
// SIMPLE PAYMENT LOG SYSTEM
// Works directly with StudentList fields.
// No dependency on fee_categories or student_fee_categories tables.
// ─────────────────────────────────────────────────────────────────────────────

// Check if student_payment_log table exists
let PAYMENT_LOG_MIGRATED = null;
async function checkPaymentLogMigrated() {
  if (PAYMENT_LOG_MIGRATED !== null) return PAYMENT_LOG_MIGRATED;
  try {
    await prisma.$queryRaw`SELECT 1 FROM "student_payment_log" LIMIT 1`;
    PAYMENT_LOG_MIGRATED = true;
  } catch {
    PAYMENT_LOG_MIGRATED = false;
  }
  return PAYMENT_LOG_MIGRATED;
}

// ── RECORD SIMPLE PAYMENT ─────────────────────────────────────────────────────
// Called by PayModal instead of (or in addition to) updateStudentFinance.
// Writes one row to StudentPaymentLog per payment action.
router.post("/recordSimplePayment", authMiddleware, async (req, res) => {
  try {
    const {
      studentListId,
      amount,
      paymentMode,
      sessionLogId,           // if set → UPDATE existing row (same session)
      schoolFeePaid    = 0,
      tuitionFeePaid   = 0,
      examFeePaid      = 0,
      transportFeePaid = 0,
      booksFeePaid     = 0,
      labFeePaid       = 0,
      miscFeePaid      = 0,
    } = req.body;

    if (!studentListId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "studentListId and amount are required" });
    }

    const hasTable = await checkPaymentLogMigrated();
    if (!hasTable) {
      console.warn("[recordSimplePayment] student_payment_log table missing — skipping log write");
      return res.json({ success: true, logged: false, message: "Run migration to enable history." });
    }

    // ── If sessionLogId provided, UPDATE that row (same modal session) ──────
    // This groups all category payments in one PayModal open into ONE receipt.
    if (sessionLogId) {
      const existing = await prisma.studentPaymentLog.findUnique({
        where: { id: parseInt(sessionLogId) },
      });

      if (existing && existing.studentListId === parseInt(studentListId)) {
        const updated = await prisma.studentPaymentLog.update({
          where: { id: parseInt(sessionLogId) },
          data: {
            amount:           Number(amount),           // frontend sends running total
            paymentMode:      paymentMode || "Cash",
            schoolFeePaid:    Number(schoolFeePaid),
            tuitionFeePaid:   Number(tuitionFeePaid),
            examFeePaid:      Number(examFeePaid),
            transportFeePaid: Number(transportFeePaid),
            booksFeePaid:     Number(booksFeePaid),
            labFeePaid:       Number(labFeePaid),
            miscFeePaid:      Number(miscFeePaid),
          },
        });
        console.log("[recordSimplePayment] ✅ Updated existing log:", updated.id, "total now:", amount);
        return res.json({ success: true, logged: true, logId: updated.id, action: "updated" });
      }
    }

    // ── No sessionLogId (or not found) → CREATE new row ─────────────────────
    const log = await prisma.studentPaymentLog.create({
      data: {
        studentListId:    parseInt(studentListId),
        amount:           Number(amount),
        paymentMode:      paymentMode || "Cash",
        schoolFeePaid:    Number(schoolFeePaid),
        tuitionFeePaid:   Number(tuitionFeePaid),
        examFeePaid:      Number(examFeePaid),
        transportFeePaid: Number(transportFeePaid),
        booksFeePaid:     Number(booksFeePaid),
        labFeePaid:       Number(labFeePaid),
        miscFeePaid:      Number(miscFeePaid),
        createdBy:        req.user?.id ? String(req.user.id) : null,
      },
    });

    console.log("[recordSimplePayment] ✅ Created new log:", log.id, "amount:", amount, "student:", studentListId);
    res.json({ success: true, logged: true, logId: log.id, action: "created" });
  } catch (error) {
    console.error("[recordSimplePayment] error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ── PAYMENT HISTORY ───────────────────────────────────────────────────────────
// GET /api/finance/paymentHistory/:studentListId
// Returns per-transaction payment history, newest first.
// Uses StudentPaymentLog if available, otherwise legacy fallback from StudentList.
router.get("/paymentHistory/:studentListId", authMiddleware, async (req, res) => {
  try {
    const studentListId = parseInt(req.params.studentListId);
    console.log("[paymentHistory] studentListId:", studentListId);

    const hasTable = await checkPaymentLogMigrated();
    console.log("[paymentHistory] student_payment_log table exists:", hasTable);

    // ── Path A: StudentPaymentLog table exists ────────────────────────────────
    if (hasTable) {
      const logs = await prisma.studentPaymentLog.findMany({
        where:   { studentListId },
        orderBy: { paidAt: "desc" },
      });

      console.log("[paymentHistory] log rows found:", logs.length);

      if (logs.length > 0) {
        // Get category totals from StudentList for pending calculation
        const studentRecord = await prisma.studentList.findUnique({
          where: { id: studentListId },
          ...(await checkMigrated() && {
            include: {
              feeCategories: { include: { category: true } },
            },
          }),
        });

        // Get feeBreakdown for total amounts per category
        let bd = {};
        try { bd = studentRecord?.feeBreakdown ? JSON.parse(studentRecord.feeBreakdown) : {}; } catch {}

        const getTotal = (key) => {
          const e = bd[key];
          return e ? Number(typeof e === "object" ? (e.total ?? e.amount ?? 0) : e) : 0;
        };

        // Build cumulative running totals going oldest→newest
        const orderedLogs = [...logs].reverse(); // oldest first
        const runningTotals = {
          schoolFee:    0,
          tuitionFee:   0,
          examFee:      0,
          transportFee: 0,
          booksFee:     0,
          labFee:       0,
          miscFee:      0,
        };

        const enriched = orderedLogs.map((log) => {
          runningTotals.schoolFee    += Number(log.schoolFeePaid    || 0);
          runningTotals.tuitionFee   += Number(log.tuitionFeePaid   || 0);
          runningTotals.examFee      += Number(log.examFeePaid      || 0);
          runningTotals.transportFee += Number(log.transportFeePaid || 0);
          runningTotals.booksFee     += Number(log.booksFeePaid     || 0);
          runningTotals.labFee       += Number(log.labFeePaid       || 0);
          runningTotals.miscFee      += Number(log.miscFeePaid      || 0);

          return {
            ...log,
            cumulativeSchoolFee:    runningTotals.schoolFee,
            cumulativeTuitionFee:   runningTotals.tuitionFee,
            cumulativeExamFee:      runningTotals.examFee,
            cumulativeTransportFee: runningTotals.transportFee,
            cumulativeBooksFeee:    runningTotals.booksFee,
            cumulativeLabFee:       runningTotals.labFee,
            cumulativeMiscFee:      runningTotals.miscFee,
          };
        });

        // Reverse back to newest-first for dropdown
        enriched.reverse();

        const result = enriched.map((log, idx) => {
          const date    = new Date(log.paidAt);
          const dateKey = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

          // ALL categories shown — paid = 0 if not paid in this transaction
          const pairs = [
            { catName: "School Fee",    paid: Number(log.schoolFeePaid    || 0), cumPaid: log.cumulativeSchoolFee,    totalKey: "collegeFee"   },
            { catName: "Tuition Fee",   paid: Number(log.tuitionFeePaid   || 0), cumPaid: log.cumulativeTuitionFee,   totalKey: "tuitionFee"   },
            { catName: "Exam Fee",      paid: Number(log.examFeePaid      || 0), cumPaid: log.cumulativeExamFee,      totalKey: "examFee"      },
            { catName: "Transport Fee", paid: Number(log.transportFeePaid || 0), cumPaid: log.cumulativeTransportFee, totalKey: "transportFee" },
            { catName: "Books Fee",     paid: Number(log.booksFeePaid     || 0), cumPaid: log.cumulativeBooksFeee,    totalKey: "booksFee"     },
            { catName: "Lab Fee",       paid: Number(log.labFeePaid       || 0), cumPaid: log.cumulativeLabFee,       totalKey: "labFee"       },
            { catName: "Miscellaneous", paid: Number(log.miscFeePaid      || 0), cumPaid: log.cumulativeMiscFee,      totalKey: "miscFee"      },
          ];

          const items = [];
          for (const p of pairs) {
            const total = getTotal(p.totalKey);
            if (total <= 0) continue; // skip categories this student doesn't have
            const pending = Math.max(0, total - p.cumPaid);
            items.push({
              studentFeeCategoryId: null,
              categoryName:         p.catName,
              amount:               p.paid,        // 0 if not paid this txn
              cumulativePaid:       p.cumPaid,
              totalAmount:          total,
              pending,
              paymentMode:          log.paymentMode,
            });
          }

          // Fallback: if feeBreakdown has no categories, show one total row
          if (items.length === 0) {
            items.push({
              studentFeeCategoryId: null,
              categoryName:         "Total Fees",
              amount:               Number(log.amount),
              cumulativePaid:       Number(log.amount),
              totalAmount:          Number(studentRecord?.fees || 0),
              pending:              0,
              paymentMode:          log.paymentMode,
            });
          }

          return {
            id:        `log_${log.id}`,
            label:     dateKey,
            date:      date.toISOString(),
            receiptNo: log.id,
            items,
          };
        });

        // Deduplicate labels for same-day payments
        const dateCounts = {};
        result.forEach(r => { dateCounts[r.label] = (dateCounts[r.label] || 0) + 1; });
        const dateOcc = {};
        result.forEach(r => {
          if (dateCounts[r.label] > 1) {
            dateOcc[r.label] = (dateOcc[r.label] || 0) + 1;
            r.label = `${r.label} • Receipt #${r.receiptNo}`;
          }
        });

        console.log("[paymentHistory] ✅ Returning", result.length, "transactions from StudentPaymentLog");
        return res.json(result);
      }
    }

    // ── Path B: Legacy fallback — synthesise from StudentList fields ──────────
    console.log("[paymentHistory] Using legacy fallback from StudentList");
    const studentRecord = await prisma.studentList.findUnique({ where: { id: studentListId } });
    const paidAmount    = Number(studentRecord?.paidAmount || 0);
    console.log("[paymentHistory] StudentList.paidAmount:", paidAmount, "| paymentDate:", studentRecord?.paymentDate);

    if (!studentRecord || paidAmount <= 0) {
      console.log("[paymentHistory] No payment data at all — returning []");
      return res.json([]);
    }

    let bd = {};
    try { bd = studentRecord.feeBreakdown ? JSON.parse(studentRecord.feeBreakdown) : {}; } catch {}
    const getTotal = (key) => {
      const e = bd[key];
      return e ? Number(typeof e === "object" ? (e.total ?? e.amount ?? 0) : e) : 0;
    };

    // Build items from per-category paid fields on StudentList
    const legacyItems = [];
    const legacyPairs = [
      { catName: "School Fee",    paid: Number(studentRecord.schoolFeePaid    || 0), total: getTotal("collegeFee")   },
      { catName: "Tuition Fee",   paid: Number(studentRecord.tuitionFeePaid   || 0), total: getTotal("tuitionFee")   },
      { catName: "Exam Fee",      paid: Number(studentRecord.examFeePaid      || 0), total: getTotal("examFee")      },
      { catName: "Transport Fee", paid: Number(studentRecord.transportFeePaid || 0), total: getTotal("transportFee") },
      { catName: "Books Fee",     paid: Number(studentRecord.booksFeePaid     || 0), total: getTotal("booksFee")     },
      { catName: "Lab Fee",       paid: Number(studentRecord.labFeePaid       || 0), total: getTotal("labFee")       },
      { catName: "Miscellaneous", paid: Number(studentRecord.miscFeePaid      || 0), total: getTotal("miscFee")      },
    ];

    for (const p of legacyPairs) {
      if (p.total <= 0) continue; // skip categories this student doesn't have
      legacyItems.push({
        studentFeeCategoryId: null,
        categoryName:         p.catName,
        amount:               p.paid,                          // 0 if never paid
        cumulativePaid:       p.paid,
        totalAmount:          p.total,
        pending:              Math.max(0, p.total - p.paid),
        paymentMode:          studentRecord.paymentMode || "Cash",
      });
    }

    if (legacyItems.length === 0) {
      legacyItems.push({
        studentFeeCategoryId: null,
        categoryName:         "Total Fees",
        amount:               paidAmount,
        cumulativePaid:       paidAmount,
        totalAmount:          Number(studentRecord.fees || 0),
        pending:              Math.max(0, Number(studentRecord.fees || 0) - paidAmount),
        paymentMode:          studentRecord.paymentMode || "Cash",
      });
    }

    const payDate  = studentRecord.paymentDate ? new Date(studentRecord.paymentDate) : new Date(studentRecord.updatedAt || studentRecord.createdAt);
    const dateLabel = payDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    const legacyResult = [{
      id:        "legacy_0",
      label:     dateLabel,
      date:      payDate.toISOString(),
      receiptNo: null,
      isLegacy:  true,
      items:     legacyItems,
    }];

    console.log("[paymentHistory] ✅ Returning legacy result:", JSON.stringify(legacyResult));
    return res.json(legacyResult);

  } catch (error) {
    console.error("[paymentHistory] ❌ error:", error);
    res.status(500).json({ message: error.message });
  }
});


export default router;
// ── CLEANUP: merge duplicate same-day log rows into one ──────────────────────
// POST /api/finance/mergePaymentLogs/:studentListId
// Call this once per student to fix the duplicate receipts created before
// the session-grouping fix was applied.
router.post("/mergePaymentLogs/:studentListId", authMiddleware, async (req, res) => {
  try {
    const studentListId = parseInt(req.params.studentListId);
    const hasTable = await checkPaymentLogMigrated();
    if (!hasTable) return res.json({ merged: 0 });

    const logs = await prisma.studentPaymentLog.findMany({
      where:   { studentListId },
      orderBy: { paidAt: "asc" },
    });

    if (logs.length <= 1) return res.json({ merged: 0, message: "Nothing to merge" });

    // Group logs that fall within 10 minutes of each other into one bucket
    const TEN_MIN = 10 * 60 * 1000;
    const buckets = [];
    for (const log of logs) {
      const last = buckets[buckets.length - 1];
      if (!last || (new Date(log.paidAt) - new Date(last[0].paidAt)) > TEN_MIN) {
        buckets.push([log]);
      } else {
        last.push(log);
      }
    }

    let merged = 0;
    for (const bucket of buckets) {
      if (bucket.length <= 1) continue;

      // Keep the first log, update it with summed values, delete the rest
      const keeper = bucket[0];
      const merged_data = {
        amount:           bucket.reduce((s, l) => s + Number(l.amount),           0),
        schoolFeePaid:    bucket.reduce((s, l) => s + Number(l.schoolFeePaid),    0),
        tuitionFeePaid:   bucket.reduce((s, l) => s + Number(l.tuitionFeePaid),   0),
        examFeePaid:      bucket.reduce((s, l) => s + Number(l.examFeePaid),      0),
        transportFeePaid: bucket.reduce((s, l) => s + Number(l.transportFeePaid), 0),
        booksFeePaid:     bucket.reduce((s, l) => s + Number(l.booksFeePaid),     0),
        labFeePaid:       bucket.reduce((s, l) => s + Number(l.labFeePaid),       0),
        miscFeePaid:      bucket.reduce((s, l) => s + Number(l.miscFeePaid),      0),
      };

      await prisma.studentPaymentLog.update({
        where: { id: keeper.id },
        data:  merged_data,
      });

      const idsToDelete = bucket.slice(1).map(l => l.id);
      await prisma.studentPaymentLog.deleteMany({
        where: { id: { in: idsToDelete } },
      });

      merged += idsToDelete.length;
      console.log(`[mergePaymentLogs] student ${studentListId}: merged ${bucket.length} logs → 1`);
    }

    res.json({ success: true, merged, message: `Merged ${merged} duplicate log(s)` });
  } catch (error) {
    console.error("[mergePaymentLogs] error:", error);
    res.status(500).json({ message: error.message });
  }
});

// ── PAYMENT LOGS BY DATE RANGE ────────────────────────────────────────────────
// GET /api/finance/paymentLogsByDateRange?from=2026-06-26&to=2026-06-26
// Returns actual payment log rows for a date range.
// Each row = what was paid in ONE payment action on that date.
// Used by the date-wise Excel download — shows ACTUAL paid amounts, not cumulative.
router.get("/paymentLogsByDateRange", authMiddleware, async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ message: "from and to dates are required (YYYY-MM-DD)" });
    }

    const fromDate = new Date(from + "T00:00:00.000Z");
    const toDate   = new Date(to   + "T23:59:59.999Z");

    const hasTable = await checkPaymentLogMigrated();

    if (hasTable) {
      // ── Path A: Use StudentPaymentLog (accurate per-transaction data) ────────
      const logs = await prisma.studentPaymentLog.findMany({
        where: {
          paidAt: { gte: fromDate, lte: toDate },
          studentList: { schoolId, deletedAt: null },
        },
        include: {
          studentList: {
            select: { id: true, name: true, email: true, course: true, fees: true },
          },
        },
        orderBy: { paidAt: "asc" },
      });

      const result = logs.map(log => ({
        logId:           log.id,
        studentListId:   log.studentListId,
        studentName:     log.studentList?.name     || "",
        email:           log.studentList?.email    || "",
        course:          log.studentList?.course   || "",
        totalFees:       Number(log.studentList?.fees || 0),
        amount:          Number(log.amount           || 0),
        schoolFeePaid:   Number(log.schoolFeePaid    || 0),
        tuitionFeePaid:  Number(log.tuitionFeePaid   || 0),
        examFeePaid:     Number(log.examFeePaid      || 0),
        transportFeePaid:Number(log.transportFeePaid || 0),
        booksFeePaid:    Number(log.booksFeePaid     || 0),
        labFeePaid:      Number(log.labFeePaid       || 0),
        miscFeePaid:     Number(log.miscFeePaid      || 0),
        paymentMode:     log.paymentMode || "Cash",
        paidAt:          log.paidAt,
      }));

      console.log(`[paymentLogsByDateRange] ${from} → ${to}: ${result.length} logs`);
      return res.json(result);
    }

    // ── Path B: Legacy — fall back to StudentList.paymentDate ────────────────
    // Less accurate (cumulative paidAmount, not per-transaction)
    const students = await prisma.studentList.findMany({
      where: {
        schoolId,
        deletedAt: null,
        paymentDate: { gte: fromDate, lte: toDate },
        paidAmount: { gt: 0 },
      },
      orderBy: { paymentDate: "asc" },
    });

    const legacyResult = students.map(s => ({
      studentListId:   s.id,
      studentName:     s.name,
      email:           s.email,
      course:          s.course || "",
      totalFees:       Number(s.fees || 0),
      amount:          Number(s.paidAmount || 0),
      schoolFeePaid:   Number(s.schoolFeePaid    || 0),
      tuitionFeePaid:  Number(s.tuitionFeePaid   || 0),
      examFeePaid:     Number(s.examFeePaid      || 0),
      transportFeePaid:Number(s.transportFeePaid || 0),
      booksFeePaid:    Number(s.booksFeePaid     || 0),
      labFeePaid:      Number(s.labFeePaid       || 0),
      miscFeePaid:     Number(s.miscFeePaid      || 0),
      paymentMode:     s.paymentMode || "Cash",
      paidAt:          s.paymentDate,
    }));

    console.log(`[paymentLogsByDateRange] legacy fallback: ${legacyResult.length} records`);
    res.json(legacyResult);

  } catch (error) {
    console.error("[paymentLogsByDateRange] error:", error);
    res.status(500).json({ message: error.message });
  }
});