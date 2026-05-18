import { PrismaClient } from "@prisma/client";
import { uploadSalarySlipPdfToR2 }
from "../../utils/uploadSalarySlipPdfToR2.js";

import { sendSalarySlipWhatsApp }
from "../../whatsapp/sendSalarySlipWhatsApp.js";


const prisma = new PrismaClient();

const calcLeaveDeduction = (
  monthlySalary,
  leaveDays
) => {

  const daily =
    (Number(monthlySalary) * 12) / 365;

  return Math.round(
    daily * Number(leaveDays)
  );
};

class FinanceSalaryController {

  // ===================================================
  // GET FINANCE USERS
  // ===================================================

  async getFinanceUsers(req, res) {

    try {

      const { schoolId } = req.params;

      const financeUsers =
        await prisma.user.findMany({

          where: {
            schoolId,
            role: "FINANCE",
            isActive: true,
          },

          include: {
            financeProfile: true,
          },

          orderBy: {
            createdAt: "desc"
          }
        });

      const formatted =
        financeUsers.map((f) => ({

          id: f.id,

          name:
            f.financeProfile?.name ||
            f.name,

          email:
            f.financeProfile?.email ||
            f.email,

          financeProfile: {
            designation:
              f.financeProfile?.designation,

            employeeCode:
              f.financeProfile?.employeeCode,

            salary:
              Number(
                f.financeProfile?.salary || 0
              ),
          }
        }));

      res.json(formatted);

    } catch (e) {

      console.log(e);

      res.status(500).json({
        message: e.message
      });
    }
  }

  // ===================================================
  // CREATE SALARY
  // ===================================================

  async createFinanceSalary(req, res) {

    try {

      const {
        financeId,
        month,
        year,
        bonus = 0,
        deductions = 0,
        leaveDays = 0,
      } = req.body;

      const finance =
        await prisma.user.findUnique({

          where: {
            id: financeId
          },

          include: {
            financeProfile: true
          }
        });

      if (!finance) {
        return res.status(404).json({
          message: "Finance user not found"
        });
      }

      const basicSalary =
        Number(
          finance.financeProfile?.salary || 0
        );

      if (!basicSalary) {
        return res.status(400).json({
          message:
            "Finance salary not configured"
        });
      }

      const existing =
        await prisma.financeMonthlySalary.findFirst({

          where: {
            financeId,
            month,
            year,
          }
        });

      if (existing) {
        return res.status(400).json({
          message:
            "Salary already created"
        });
      }

      const leaveDeduction =
        calcLeaveDeduction(
          basicSalary,
          leaveDays
        );

      const totalDeductions =
        Number(deductions) +
        leaveDeduction;

      const netSalary =
        Number(basicSalary) +
        Number(bonus) -
        totalDeductions;

      const created =
        await prisma.financeMonthlySalary.create({

          data: {

            financeId,

            schoolId:
              finance.schoolId,

            month,
            year,

            financeName:
              finance.name,

            financeEmail:
              finance.email,

            basicSalary,

            bonus:
              Number(bonus),

            deductions:
              totalDeductions,

            leaveDays:
              Number(leaveDays),

            leaveDeduction,

            netSalary,
          }
        });

      res.json(created);

    } catch (e) {

      console.log(e);

      res.status(500).json({
        message: e.message
      });
    }
  }

  // ===================================================
  // LIST
  // ===================================================

  async getFinanceSalaryList(req, res) {

    try {

      const { schoolId } = req.params;

      const month =
        new Date().getMonth() + 1;

      const year =
        new Date().getFullYear();

      const list =
        await prisma.financeMonthlySalary.findMany({

          where: {
            schoolId,
            month,
            year,
          },

          include: {

            finance: {

              select: {

                id: true,
                name: true,
                email: true,

                financeProfile: {
                  select: {
                    designation: true,
                    employeeCode: true,
                  }
                }
              }
            }
          },

          orderBy: {
            createdAt: "desc"
          }
        });

      res.json(list);

    } catch (e) {

      console.log(e);

      res.status(500).json({
        message: e.message
      });
    }
  }

  // ===================================================
  // PAY
  // ===================================================

  async paySalary(req, res) {

    try {

      const { salaryId } = req.params;

      const updated =
        await prisma.financeMonthlySalary.update({

          where: {
            id: salaryId
          },

          data: {
            status: "PAID",
            paymentDate: new Date(),
          }
        });

      res.json(updated);

    } catch (e) {

      res.status(500).json({
        message: e.message
      });
    }
  }

  // ===================================================
// SEND WHATSAPP SALARY SLIP
// ===================================================

async sendSalarySlip(req, res) {

  try {

    const { salaryId } = req.params;

    const salary =
      await prisma.financeMonthlySalary.findUnique({

        where: {
          id: salaryId
        },

        include: {

          finance: {

            include: {
              financeProfile: true,
              school: true,
            }
          }
        }
      });

    if (!salary) {
      return res.status(404).json({
        message: "Salary not found"
      });
    }

    const phone =
      salary.finance?.financeProfile?.phone;

    if (!phone) {
      return res.status(400).json({
        message:
          "Finance phone number missing"
      });
    }

    const pdfBuffer =
      Buffer.from(req.body.pdfBase64, "base64");

    const fileName =
      `salary-slips/finance-${salary.id}.pdf`;

    const pdfUrl =
      await uploadSalarySlipPdfToR2(
        pdfBuffer,
        fileName
      );

    const monthYear =
      `${new Date(
        salary.year,
        salary.month - 1
      ).toLocaleString("default", {
        month: "long"
      })} ${salary.year}`;

    await sendSalarySlipWhatsApp({

      phone,

      staffName:
        salary.finance?.name || "Finance",

      schoolName:
        salary.finance?.school?.name ||
        "School",

      monthYear,

      pdfUrl,
    });

    res.json({
      success: true,
      message:
        "WhatsApp salary slip sent",
      pdfUrl,
    });

  } catch (e) {

    console.log(e);

    res.status(500).json({
      message: e.message
    });
  }
}


}

export default new FinanceSalaryController();