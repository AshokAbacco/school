// financeSalary.routes.js

import express from "express";

import authMiddleware
from "../../middlewares/authMiddleware.js";

import financeSalaryController
from "../Controls/financeSalary.controller.js";

const router = express.Router();

router.get(
  "/finance-users/:schoolId",
  authMiddleware,
  financeSalaryController.getFinanceUsers
);

router.post(
  "/create",
  authMiddleware,
  financeSalaryController.createFinanceSalary
);

router.get(
  "/list/:schoolId",
  authMiddleware,
  financeSalaryController.getFinanceSalaryList
);

router.patch(
  "/pay/:salaryId",
  authMiddleware,
  financeSalaryController.paySalary
);

router.post(
  "/sendSalarySlip/:salaryId",
  authMiddleware,
  financeSalaryController.sendSalarySlip
);

export default router;