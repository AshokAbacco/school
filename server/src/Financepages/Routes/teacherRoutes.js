import { Router } from "express"
import salaryController from "../Controls/teacherController.js"
import authMiddleware from "../../middlewares/authMiddleware.js"
const router = Router()

router.get(
  "/salary/schools",
  authMiddleware,

  salaryController.getSchools
)
// ==============================
// 🔥 FETCH TEACHERS BY SCHOOL ID
// ==============================
router.get(
  "/salary/teachers-by-school/:schoolId",
  authMiddleware,
  salaryController.getTeachersBySchool
)


// ==============================
// 🔥 CREATE SALARY
// ==============================
router.post(
  "/salary/create",
  authMiddleware,
  salaryController.createTeacherSalary
)


// ==============================
// 🔥 GET TEACHER SALARY HISTORY
// ==============================
router.get(
  "/salary/history/:teacherId",
  authMiddleware,

  salaryController.getSalaryHistory
)


// ==============================
// 🔥 PAY SALARY
// ==============================
router.patch(
  "/salary/hold/:salaryId",
  authMiddleware,
  salaryController.holdSalary
)
router.patch(
  "/salary/pay/:salaryId",
  authMiddleware,
  salaryController.paySalary
)
router.get(
 "/salary/list/:schoolId",
 salaryController.getTeachersSalaryList
)
router.get(
  "/salary/history-by-school/:schoolId",
  authMiddleware,
  salaryController.getAllSalaryHistoryBySchool
);

// ==============================
// 🔥 UPDATE SALARY
// ==============================
router.put(
  "/salary/update/:salaryId",
  authMiddleware,
  salaryController.updateTeacherSalary
);

// ==============================
// 🔥 DELETE SALARY
// ==============================
router.delete(
  "/salary/delete/:salaryId",
  authMiddleware,
  salaryController.deleteTeacherSalary
);

export default router