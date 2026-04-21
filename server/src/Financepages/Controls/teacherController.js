import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();

// ── Per-day salary = (monthly × 12) / 365 ──────────────────────────────────
const calcLeaveDeduction = (monthlySalary, leaveDays) => {
  const daily = (Number(monthlySalary) * 12) / 365;
  return Math.round(daily * Number(leaveDays) * 100) / 100; // 2 decimal places
};

class TeacherSalaryController {
  constructor() {
    this.getTeachersSalaryList      = this.getTeachersSalaryList.bind(this);
    this.getTeachersBySchool        = this.getTeachersBySchool.bind(this);
    this.createTeacherSalary        = this.createTeacherSalary.bind(this);
    this.getSalaryHistory           = this.getSalaryHistory.bind(this);
    this.paySalary                  = this.paySalary.bind(this);
    this.getSchools                 = this.getSchools.bind(this);
    this.updateTeacherSalary        = this.updateTeacherSalary.bind(this);
    this.deleteTeacherSalary        = this.deleteTeacherSalary.bind(this);
    this.holdSalary                 = this.holdSalary.bind(this);
    this.getAllSalaryHistoryBySchool = this.getAllSalaryHistoryBySchool.bind(this);
  }

  // =====================================================
  // 🔥 FETCH TEACHERS BY SCHOOL (for dropdown)
  // =====================================================
  async getTeachersBySchool(req, res) {
    try {
      const { schoolId } = req.params;
      if (req.user.schoolId !== schoolId && req.user.role !== "SUPER_ADMIN") {
        return res.status(403).json({ message: "Access denied" });
      }
      const teachers = await prisma.teacherProfile.findMany({
        where: { schoolId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          department: true,
          designation: true,
          qualification: true,
          salary: true,
          user: { select: { email: true } }
        }
      });

      res.json(teachers);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }

  // =====================================================
  // 🔥 CREATE MONTHLY SALARY
  //    Now stores: leaveDays, leaveDeduction,
  //                teacherName, teacherEmail
  // =====================================================
  async createTeacherSalary(req, res) {
    try {
      const {
        teacherId,
        month,
        year,
        bonus       = 0,
        deductions  = 0,   // extra deductions (non-leave)
        leaveDays   = 0,
      } = req.body;

      // ── Fetch teacher with user email ──────────────────
      const teacher = await prisma.teacherProfile.findUnique({
        where: { id: teacherId },
        include: { user: { select: { email: true } } }
      });

      if (!teacher)
        return res.status(404).json({ message: "Teacher not found" });

      if (!teacher.salary)
        return res.status(400).json({ message: "Teacher salary not defined" });

      // ── Prevent duplicate ──────────────────────────────
      const existing = await prisma.teacherMonthlySalary.findFirst({
        where: { teacherId, month, year }
      });
      if (existing)
        return res.status(400).json({ message: "Salary already generated for this month" });

      // ── Calculate leave deduction ──────────────────────
      const leaveDeduction = calcLeaveDeduction(teacher.salary, leaveDays);
      const totalDeductions = Number(deductions) + leaveDeduction;

      const netSalary =
        Number(teacher.salary.toString()) +
        Number(bonus) -
        totalDeductions;

      const salary = await prisma.teacherMonthlySalary.create({
        data: {
          teacherId,
          schoolId:      teacher.schoolId,
          month,
          year,

          // ── Snapshot identity at time of creation ──────
          teacherName:  `${teacher.firstName} ${teacher.lastName}`,
          teacherEmail: teacher.user?.email || "",

          basicSalary:    teacher.salary,
          bonus:          Number(bonus),
          deductions:     totalDeductions,
          netSalary,

          leaveDays:      Number(leaveDays),
          leaveDeduction,
        }
      });

      res.json(salary);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }

  // =====================================================
  // 🔥 SALARY HISTORY (for a single teacher — all months)
  // =====================================================
  async getSalaryHistory(req, res) {
    try {
      const { teacherId } = req.params;

      const history = await prisma.teacherMonthlySalary.findMany({
        where: { teacherId },
        orderBy: [{ year: "desc" }, { month: "desc" }]
      });

      res.json(history);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }

  // =====================================================
  // 🔥 PAY SALARY
  // =====================================================
  async paySalary(req, res) {
    try {
      const { salaryId } = req.params;

      const salaryRecord = await prisma.teacherMonthlySalary.findUnique({
        where: { id: salaryId }
      });
      if (!salaryRecord)
        return res.status(404).json({ message: "Salary record not found" });

      const salary = await prisma.teacherMonthlySalary.update({
        where: { id: salaryId },
        data: { status: "PAID", paymentDate: new Date() }
      });

      res.json(salary);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }

  // =====================================================
  // 🔥 GET SCHOOLS
  // =====================================================
  async getSchools(req, res) {
    try {
      const schools = await prisma.school.findMany({
        select: { id: true, name: true }
      });
      res.json(schools);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }

  // =====================================================
  // 🔥 GET CURRENT-MONTH SALARY LIST BY SCHOOL
  //    (only teachers who have a salary record this month)
  // =====================================================
  async getTeachersSalaryList(req, res) {
    try {
      const { schoolId } = req.params;
      const month = new Date().getMonth() + 1;
      const year  = new Date().getFullYear();

      const salaryRecords = await prisma.teacherMonthlySalary.findMany({
        where: { schoolId, month, year },
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              department: true,
              salary: true,
              user: { select: { email: true } }
            }
          }
        }
      });

      const formatted = salaryRecords.map(record => ({
        id:        record.id,
        salaryId:  record.id,
        teacherId: record.teacherId,

        teacher: {
          id:         record.teacher.id,
          firstName:  record.teacher.firstName,
          lastName:   record.teacher.lastName,
          department: record.teacher.department,
          user:       { email: record.teacher.user?.email }
        },

        // stored snapshots (always available even if teacher deleted)
        teacherName:  record.teacherName,
        teacherEmail: record.teacherEmail,

        month: record.month,
        year:  record.year,

        basicSalary:    Number(record.basicSalary?.toString()    || 0),
        bonus:          Number(record.bonus?.toString()           || 0),
        deductions:     Number(record.deductions?.toString()      || 0),
        leaveDays:      record.leaveDays ?? 0,
        leaveDeduction: Number(record.leaveDeduction?.toString()  || 0),
        netSalary:      Number(record.netSalary?.toString()       || 0),
        status:         record.status,
        paymentDate:    record.paymentDate
      }));

      res.json(formatted);
    } catch (e) {
      console.log("SALARY LIST ERROR 👉", e);
      res.status(400).json({ message: e.message });
    }
  }

  // =====================================================
  // 🔥 GET ALL SALARY HISTORY BY SCHOOL (all months)
  // =====================================================
  async getAllSalaryHistoryBySchool(req, res) {
    try {
      const { schoolId } = req.params;

      const history = await prisma.teacherMonthlySalary.findMany({
        where: { schoolId },
        include: {
          teacher: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              department: true,
              user: { select: { email: true } }
            }
          }
        },
        orderBy: [{ year: "desc" }, { month: "desc" }]
      });

      // Normalise every record so the frontend gets consistent shape
      const formatted = history.map(record => ({
        id:        record.id,
        teacherId: record.teacherId,

        teacher: {
          id:         record.teacher.id,
          firstName:  record.teacher.firstName,
          lastName:   record.teacher.lastName,
          department: record.teacher.department,
          user:       { email: record.teacher.user?.email }
        },

        // stored snapshots
        teacherName:  record.teacherName,
        teacherEmail: record.teacherEmail,

        month: record.month,
        year:  record.year,

        basicSalary:    Number(record.basicSalary?.toString()    || 0),
        bonus:          Number(record.bonus?.toString()           || 0),
        deductions:     Number(record.deductions?.toString()      || 0),
        leaveDays:      record.leaveDays ?? 0,
        leaveDeduction: Number(record.leaveDeduction?.toString()  || 0),
        netSalary:      Number(record.netSalary?.toString()       || 0),
        status:         record.status,
        paymentDate:    record.paymentDate
      }));

      res.json(formatted);
    } catch (e) {
      console.log("HISTORY ERROR 👉", e);
      res.status(400).json({ message: e.message });
    }
  }

  // =====================================================
  // 🔥 UPDATE SALARY (bonus, deductions, leaveDays)
  // =====================================================
  async updateTeacherSalary(req, res) {
    try {
      const { salaryId } = req.params;
      const {
        bonus      = 0,
        deductions = 0,   // extra deductions only (non-leave)
        leaveDays  = 0,
      } = req.body;

      const existing = await prisma.teacherMonthlySalary.findUnique({
        where: { id: salaryId },
        include: { teacher: { select: { salary: true } } }
      });
      if (!existing)
        return res.status(404).json({ message: "Salary record not found" });

      const leaveDeduction  = calcLeaveDeduction(existing.teacher.salary, leaveDays);
      const totalDeductions = Number(deductions) + leaveDeduction;

      const netSalary =
        Number(existing.teacher.salary.toString()) +
        Number(bonus) -
        totalDeductions;

      const updated = await prisma.teacherMonthlySalary.update({
        where: { id: salaryId },
        data: {
          bonus:          Number(bonus),
          deductions:     totalDeductions,
          leaveDays:      Number(leaveDays),
          leaveDeduction,
          netSalary,
        }
      });

      res.json(updated);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }

  // =====================================================
  // 🔥 HOLD SALARY
  // =====================================================
  async holdSalary(req, res) {
    try {
      const { salaryId } = req.params;
      const existing = await prisma.teacherMonthlySalary.findUnique({ where: { id: salaryId } });
      if (!existing) return res.status(404).json({ message: "Salary record not found" });
      const salary = await prisma.teacherMonthlySalary.update({
        where: { id: salaryId },
        data: { status: "HOLD" }
      });
      res.json(salary);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }

  // =====================================================
  // 🔥 DELETE SALARY
  // =====================================================
  async deleteTeacherSalary(req, res) {
    try {
      const { salaryId } = req.params;
      const existing = await prisma.teacherMonthlySalary.findUnique({
        where: { id: salaryId }
      });
      if (!existing)
        return res.status(404).json({ message: "Salary record not found" });

      await prisma.teacherMonthlySalary.delete({ where: { id: salaryId } });
      res.json({ message: "Salary record deleted successfully" });
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  }
}

export default new TeacherSalaryController();
