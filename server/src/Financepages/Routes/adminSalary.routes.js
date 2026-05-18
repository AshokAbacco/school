// server/src/finance/adminSalary.routes.js

import express from "express";

import authMiddleware
from "../../middlewares/authMiddleware.js";

import adminSalaryController
from "../Controls/adminSalary.controller.js";

const router = express.Router();

// GET ADMINS BY SCHOOL
router.get(
  "/admins-by-school/:schoolId",
  authMiddleware,
  adminSalaryController.getAdminsBySchool
);

// CREATE
router.post(
  "/create",
  authMiddleware,
  adminSalaryController.createAdminSalary
);

// LIST
router.get(
  "/list/:schoolId",
  authMiddleware,
  adminSalaryController.getAdminsSalaryList
);

// HISTORY
router.get(
  "/history/:adminId",
  authMiddleware,
  adminSalaryController.getSalaryHistory
);

// SCHOOL HISTORY
router.get(
  "/history-by-school/:schoolId",
  authMiddleware,
  adminSalaryController.getAllSalaryHistoryBySchool
);

// PAY
router.patch(
  "/pay/:salaryId",
  authMiddleware,
  adminSalaryController.paySalary
);

// HOLD
router.patch(
  "/hold/:salaryId",
  authMiddleware,
  adminSalaryController.holdSalary
);

// UPDATE
router.put(
  "/update/:salaryId",
  authMiddleware,
  adminSalaryController.updateAdminSalary
);

// DELETE
router.delete(
  "/delete/:salaryId",
  authMiddleware,
  adminSalaryController.deleteAdminSalary
);

router.post(
  "/sendSalarySlip/:salaryId",
  authMiddleware,
  adminSalaryController.sendSalarySlip
);

export default router;