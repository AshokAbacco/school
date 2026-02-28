import { Router } from "express"
import salaryController from "../Controlls/teacherController.js"

const router = Router()
router.get(
  "/salary/schools",
  salaryController.getSchools
)
// ==============================
// 🔥 FETCH TEACHERS BY SCHOOL ID
// ==============================
router.get(
  "/salary/teachers-by-school/:schoolId",
  salaryController.getTeachersBySchool
)


// ==============================
// 🔥 CREATE SALARY
// ==============================
router.post(
  "/salary/create",
  salaryController.createTeacherSalary
)


// ==============================
// 🔥 GET TEACHER SALARY HISTORY
// ==============================
router.get(
  "/salary/history/:teacherId",
  salaryController.getSalaryHistory
)


// ==============================
// 🔥 PAY SALARY
// ==============================
router.patch(
  "/salary/pay/:salaryId",
  salaryController.paySalary
)
router.get(
  "/salary/list/:schoolId",
  salaryController.getTeachersSalaryList
)
router.get(
  "/salary/history-by-school/:schoolId",
  salaryController.getAllSalaryHistoryBySchool
);
export default router