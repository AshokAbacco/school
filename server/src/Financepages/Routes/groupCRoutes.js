import { Router } from "express";
import {
  getGroupCStaff,
  createGroupCSalary,
  getGroupCSalaryList,
  getGroupCSalaryHistoryBySchool,
  getGroupCStaffHistory,
  updateGroupCSalary,
  payGroupCSalary,
  holdGroupCSalary,
  deleteGroupCSalary,
} from "../Controls/groupCController.js";
import authMiddleware from "../../middlewares/authMiddleware.js";

const router = Router();

// ── Staff list (from StaffProfile, groupType = "Group C") ──────────────────
router.get("/staff/:schoolId", authMiddleware, getGroupCStaff);

// ── Salary CRUD ───────────────────────────────────────────────────────────
router.post("/salary/create", authMiddleware, createGroupCSalary);
router.get("/salary/list/:schoolId", authMiddleware, getGroupCSalaryList);
router.get("/salary/history-by-school/:schoolId", authMiddleware, getGroupCSalaryHistoryBySchool);
router.get("/salary/history/:staffId", authMiddleware, getGroupCStaffHistory);
router.put("/salary/update/:salaryId", authMiddleware, updateGroupCSalary);
router.patch("/salary/pay/:salaryId", authMiddleware, payGroupCSalary);
router.patch("/salary/hold/:salaryId", authMiddleware, holdGroupCSalary);
router.delete("/salary/delete/:salaryId", authMiddleware, deleteGroupCSalary);

export default router;