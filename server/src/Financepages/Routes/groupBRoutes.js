import { Router } from "express";
import {
  getGroupBStaff,
  createGroupBSalary,
  getGroupBSalaryList,
  getGroupBSalaryHistoryBySchool,
  getGroupBStaffHistory,
  updateGroupBSalary,
  payGroupBSalary,
  holdGroupBSalary,
  deleteGroupBSalary,
  uploadSalarySlip,
  sendSalarySlip,
} from "../Controls/groupBController.js";

const router = Router();
import authMiddleware from "../../middlewares/authMiddleware.js";
// ── Staff list (from StaffProfile, groupType = "Group B") ──────────────────
router.get("/staff/:schoolId", authMiddleware, getGroupBStaff);

// ── Salary CRUD ───────────────────────────────────────────────────────────
router.post("/salary/create", authMiddleware, createGroupBSalary);
router.get("/salary/list/:schoolId", authMiddleware, getGroupBSalaryList);
router.get("/salary/history-by-school/:schoolId", authMiddleware, getGroupBSalaryHistoryBySchool);
router.get("/salary/history/:staffId", authMiddleware, getGroupBStaffHistory);
router.put("/salary/update/:salaryId", authMiddleware, updateGroupBSalary);
router.patch("/salary/pay/:salaryId", authMiddleware, payGroupBSalary);
router.patch("/salary/hold/:salaryId", authMiddleware, holdGroupBSalary);
router.delete("/salary/delete/:salaryId", authMiddleware, deleteGroupBSalary);

router.post(
  "/salary/uploadSalarySlip/:id",
  authMiddleware,
  uploadSalarySlip
);

router.post(
  "/salary/sendSalarySlip/:salaryId",
  authMiddleware,
  sendSalarySlip
);

export default router;