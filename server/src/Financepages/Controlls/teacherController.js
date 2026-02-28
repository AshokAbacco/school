import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class TeacherSalaryController {
constructor() {
  this.getTeachersSalaryList =
    this.getTeachersSalaryList.bind(this);

  this.getTeachersBySchool =
    this.getTeachersBySchool.bind(this);

  this.createTeacherSalary =
    this.createTeacherSalary.bind(this);

  this.getSalaryHistory =
    this.getSalaryHistory.bind(this);

  this.paySalary =
    this.paySalary.bind(this);

  this.getSchools =
    this.getSchools.bind(this);
}

// =====================================================
// 🔥 FETCH TEACHERS BASED ON SCHOOL ID
// =====================================================
async getTeachersBySchool(req, res) {
  try {

    const { schoolId } = req.params;

    const teachers = await prisma.teacherProfile.findMany({
      where: {
        schoolId: schoolId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        salary: true
      }
    });

    console.log("Teachers Data:", teachers);  // 👈 ADD THIS

    res.json(teachers);

  } catch (e) {
    res.status(400).json({ message: e.message });
  }
}


// =====================================================
// 🔥 CREATE MONTHLY SALARY
// =====================================================

async createTeacherSalary(req, res) {

  try {

    const {
      teacherId,
      month,
      year,
      bonus = 0,
      deductions = 0
    } = req.body

    const teacher =
      await prisma.teacherProfile.findUnique({
        where: { id: teacherId }
      })

    if (!teacher)
      return res.status(404).json({
        message: "Teacher not found"
      })

    if (!teacher.salary)
      return res.status(400).json({
        message: "Teacher salary not defined"
      })


    // ❌ Prevent duplicate salary
    const existing =
      await prisma.teacherMonthlySalary.findFirst({
        where: {
          teacherId,
          month,
          year
        }
      })

    if (existing)
      return res.status(400).json({
        message: "Salary already generated for this month"
      })


    const netSalary =
      Number(teacher.salary) +
      Number(bonus) -
      Number(deductions)


    const salary =
      await prisma.teacherMonthlySalary.create({

        data: {

          teacherId,
          schoolId: teacher.schoolId,
          month,
          year,

          basicSalary: teacher.salary,
          bonus,
          deductions,
          netSalary

        }

      })

    res.json(salary)

  } catch (e) {
    res.status(400).json({ message: e.message })
  }
}


// =====================================================
// 🔥 SALARY HISTORY
// =====================================================

async getSalaryHistory(req, res) {

  try {

    const { teacherId } = req.params

    const history =
      await prisma.teacherMonthlySalary.findMany({

        where: { teacherId },

        orderBy: [
          { year: "desc" },
          { month: "desc" }
        ]

      })

    res.json(history)

  } catch (e) {
    res.status(400).json({ message: e.message })
  }
}


// =====================================================
// 🔥 PAY SALARY
// =====================================================

async paySalary(req, res) {

  try {

    const { salaryId } = req.params

    const salary =
      await prisma.teacherMonthlySalary.update({

        where: { id: salaryId },

        data: {
          status: "PAID",
          paymentDate: new Date()
        }

      })

    res.json(salary)

  } catch (e) {
    res.status(400).json({ message: e.message })
  }
}
async getSchools(req, res) {

  try {

    const schools =
      await prisma.school.findMany({
        select: {
          id: true,
          name: true
        }
      })

    res.json(schools)

  } catch (e) {
    res.status(400).json({ message: e.message })
  }
}
async getTeachersSalaryList(req, res) {

  try {

    const { schoolId } = req.params;

    const month = new Date().getMonth() + 1;
    const year = new Date().getFullYear();

    const teachers = await prisma.teacherProfile.findMany({
      where: { schoolId },
      include: {
        user: {
          select: { email: true }
        },
        TeacherMonthlySalary: {
          where: { month, year }
        }
      }
    });

    const formatted = teachers.map(t => {

      const salaryRecord = t.TeacherMonthlySalary[0];

     return {
  id: t.id,
  teacher: {
    firstName: t.firstName,
    lastName: t.lastName,
    department: t.department,
    user: { email: t.user?.email }
  },
  month,
  year,

  // 🔥 ADD THIS LINE
  basicSalary: salaryRecord?.basicSalary || t.salary || 0,

  bonus: salaryRecord?.bonus || 0,
  deductions: salaryRecord?.deductions || 0,
  netSalary: salaryRecord?.netSalary || 0,
  status: salaryRecord?.status || "PENDING"
};
    });

    res.json(formatted);

  } catch (e) {
    console.log("SALARY LIST ERROR 👉", e);
    res.status(400).json({ message: e.message });
  }
}
// ========================================
// 🔥 GET SALARY LIST BY SCHOOL
// ========================================
async getAllSalaryHistoryBySchool(req, res) {
  try {
    const { schoolId } = req.params;

    const history = await prisma.teacherMonthlySalary.findMany({
      where: { schoolId },
      include: {
        teacher: {
          include: {
            user: {
              select: { email: true }
            }
          }
        }
      },
      orderBy: [
        { year: "desc" },
        { month: "desc" }
      ]
    });

    res.json(history);

  } catch (e) {
    console.log("HISTORY ERROR 👉", e);
    res.status(400).json({ message: e.message });
  }
}

}

export default new TeacherSalaryController()