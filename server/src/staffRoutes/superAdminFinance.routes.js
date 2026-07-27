// server/src/staffRoutes/superAdminFinance.routes.js
import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";

import {
  getUniversityStudentFinance,
  getUniversityStaffSalary,
  getUniversityExpenses,
  debugUniversityChain,
  updateStudentFinance,
  recordStudentPayment,
  getStudentPaymentHistory,
} from "../staffControlls/superAdminFinance.controller.js";

const router = express.Router();

router.use(authMiddleware);

// Student Finance
router.get("/student-finance", getUniversityStudentFinance);
router.patch("/student-finance/:id", updateStudentFinance);
router.post("/student-finance/:id/payment", recordStudentPayment);
// NEW: date-wise payment transaction history (mirrors Finance login's
// GET /paymentHistory/:studentListId), scoped to the logged-in university.
router.get("/student-finance/:id/payment-history", getStudentPaymentHistory);

// Staff Salary
router.get("/staff-salary", getUniversityStaffSalary);

// Expenses
router.get("/expenses", getUniversityExpenses);

// Debug (remove once confirmed working in production)
router.get("/debug", debugUniversityChain);

export default router;