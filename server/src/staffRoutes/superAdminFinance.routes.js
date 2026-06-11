//server\src\staffRoutes\superAdminFinance.routes.js
import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";

import {
  getUniversityStudentFinance,
  getUniversityStaffSalary,
  getUniversityExpenses,
  debugUniversityChain,
    updateStudentFinance,      // ← ADD
  recordStudentPayment,      // ← ADD 
} from "../staffControlls/superAdminFinance.controller.js";

const router = express.Router();

router.use(authMiddleware);

// Student Finance
router.get(
  "/student-finance",
  getUniversityStudentFinance
);
router.patch("/student-finance/:id",         updateStudentFinance);
router.post("/student-finance/:id/payment",  recordStudentPayment);
// Staff Salary
router.get(
  "/staff-salary",
  getUniversityStaffSalary
);

// Expenses
router.get(
  "/expenses",
  getUniversityExpenses
);
router.get("/debug", debugUniversityChain); 

export default router;