// server/src/finance/adminSalary.controller.js

import { PrismaClient } from "@prisma/client";
import { uploadSalarySlipPdfToR2 }
from "../../utils/uploadSalarySlipPdfToR2.js";

import { sendSalarySlipWhatsApp }
from "../../whatsapp/sendSalarySlipWhatsApp.js";

const prisma = new PrismaClient();

const calcLeaveDeduction = (monthlySalary, leaveDays) => {
  const daily = (Number(monthlySalary) * 12) / 365;
  return Math.round(daily * Number(leaveDays) * 100) / 100;
};

class AdminSalaryController {

  // =====================================================
  // GET ADMINS BY SCHOOL
  // =====================================================
    async getAdminsBySchool(req, res) {

    try {

        const { schoolId } = req.params;

        if (!schoolId) {
        return res.status(400).json({
            message: "School ID required"
        });
        }

        const admins = await prisma.user.findMany({

        where: {

            schoolId,

            role: {
            in: ["ADMIN", "SUPER_ADMIN"]
            },

            // isActive: true,
        },

        include: {
            schoolAdminProfile: true,
        },

        orderBy: {
            createdAt: "desc"
        }
        });

        // 🔥 format response properly
        const formatted = admins.map((admin) => ({

        id: admin.id,

        name:
            admin.schoolAdminProfile?.adminName ||
            admin.name ||
            "Unnamed Admin",

        email:
            admin.email ||
            admin.schoolAdminProfile?.email ||
            "",

        role: admin.role,

        schoolId: admin.schoolId,

        schoolAdminProfile: {

            id:
            admin.schoolAdminProfile?.id,

            employeeId:
            admin.schoolAdminProfile?.employeeId,

            designation:
            admin.schoolAdminProfile?.designation,

            basicSalary:
            Number(
                admin.schoolAdminProfile?.basicSalary || 0
            ),

            phoneNumber:
            admin.schoolAdminProfile?.phoneNumber,

            address:
            admin.schoolAdminProfile?.address,
        }
        }));

        // console.log("ADMINS =>", formatted);

        res.status(200).json(formatted);

    } catch (e) {

        console.log("GET ADMINS ERROR =>", e);

        res.status(500).json({
        message: e.message
        });
    }
    }
  // =====================================================
  // CREATE ADMIN SALARY
  // =====================================================
  async createAdminSalary(req, res) {
    try {

      const {
        adminId,
        month,
        year,
        bonus = 0,
        deductions = 0,
        leaveDays = 0,
      } = req.body;

      const admin = await prisma.user.findUnique({
        where: { id: adminId },

        include: {
          schoolAdminProfile: true
        }
      });

      if (!admin) {
        return res.status(404).json({
          message: "Admin not found"
        });
      }

      const basicSalary =
        Number(admin.schoolAdminProfile?.basicSalary || 0);

      if (!basicSalary) {
        return res.status(400).json({
          message: "Admin salary not configured"
        });
      }

      const existing =
        await prisma.adminMonthlySalary.findFirst({
          where: {
            adminId,
            month,
            year,
          }
        });

      if (existing) {
        return res.status(400).json({
          message: "Salary already generated for this month"
        });
      }

      const leaveDeduction =
        calcLeaveDeduction(basicSalary, leaveDays);

      const totalDeductions =
        Number(deductions) + leaveDeduction;

      const netSalary =
        Number(basicSalary) +
        Number(bonus) -
        totalDeductions;

      const salary =
        await prisma.adminMonthlySalary.create({
          data: {

            adminId,
            schoolId: admin.schoolId,

            month,
            year,

            adminName: admin.name,
            adminEmail: admin.email,

            basicSalary,
            bonus: Number(bonus),

            deductions: totalDeductions,

            leaveDays: Number(leaveDays),
            leaveDeduction,

            netSalary,
          }
        });

      res.json(salary);

    } catch (e) {
      res.status(400).json({
        message: e.message
      });
    }
  }

  // =====================================================
  // GET CURRENT MONTH LIST
  // =====================================================
  async getAdminsSalaryList(req, res) {
    try {

      const { schoolId } = req.params;

      const month =
        new Date().getMonth() + 1;

      const year =
        new Date().getFullYear();

      const salaryRecords =
        await prisma.adminMonthlySalary.findMany({

          where: {
            schoolId,
            month,
            year,
          },

          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true,

                schoolAdminProfile: {
                  select: {
                    designation: true,
                    employeeId: true,
                  }
                }
              }
            }
          }
        });

      const formatted = salaryRecords.map((record) => ({

        id: record.id,
        salaryId: record.id,

        adminId: record.adminId,

        admin: {
          id: record.admin.id,
          name: record.admin.name,
          email: record.admin.email,

          designation:
            record.admin.schoolAdminProfile?.designation,

          employeeId:
            record.admin.schoolAdminProfile?.employeeId,
        },

        month: record.month,
        year: record.year,

        basicSalary:
          Number(record.basicSalary || 0),

        bonus:
          Number(record.bonus || 0),

        deductions:
          Number(record.deductions || 0),

        leaveDays:
          record.leaveDays,

        leaveDeduction:
          Number(record.leaveDeduction || 0),

        netSalary:
          Number(record.netSalary || 0),

        status: record.status,
        paymentDate: record.paymentDate,
      }));

      res.json(formatted);

    } catch (e) {

      console.log(e);

      res.status(400).json({
        message: e.message
      });
    }
  }

  // =====================================================
  // PAY SALARY
  // =====================================================
  async paySalary(req, res) {

    try {

      const { salaryId } = req.params;

      const updated =
        await prisma.adminMonthlySalary.update({

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

      res.status(400).json({
        message: e.message
      });
    }
  }

  // =====================================================
  // HOLD SALARY
  // =====================================================
  async holdSalary(req, res) {

    try {

      const { salaryId } = req.params;

      const updated =
        await prisma.adminMonthlySalary.update({

          where: {
            id: salaryId
          },

          data: {
            status: "HOLD",
          }
        });

      res.json(updated);

    } catch (e) {

      res.status(400).json({
        message: e.message
      });
    }
  }

  // =====================================================
  // UPDATE SALARY
  // =====================================================
  async updateAdminSalary(req, res) {

    try {

      const { salaryId } = req.params;

      const {
        bonus = 0,
        deductions = 0,
        leaveDays = 0,
      } = req.body;

      const existing =
        await prisma.adminMonthlySalary.findUnique({
          where: {
            id: salaryId
          }
        });

      if (!existing) {
        return res.status(404).json({
          message: "Salary not found"
        });
      }

      const leaveDeduction =
        calcLeaveDeduction(
          existing.basicSalary,
          leaveDays
        );

      const totalDeductions =
        Number(deductions) + leaveDeduction;

      const netSalary =
        Number(existing.basicSalary) +
        Number(bonus) -
        totalDeductions;

      const updated =
        await prisma.adminMonthlySalary.update({

          where: {
            id: salaryId
          },

          data: {

            bonus: Number(bonus),

            deductions: totalDeductions,

            leaveDays: Number(leaveDays),

            leaveDeduction,

            netSalary,
          }
        });

      res.json(updated);

    } catch (e) {

      res.status(400).json({
        message: e.message
      });
    }
  }

  // =====================================================
  // DELETE SALARY
  // =====================================================
  async deleteAdminSalary(req, res) {

    try {

      const { salaryId } = req.params;

      await prisma.adminMonthlySalary.delete({
        where: {
          id: salaryId
        }
      });

      res.json({
        message: "Salary deleted"
      });

    } catch (e) {

      res.status(400).json({
        message: e.message
      });
    }
  }

  // =====================================================
  // HISTORY
  // =====================================================
  async getSalaryHistory(req, res) {

    try {

      const { adminId } = req.params;

      const history =
        await prisma.adminMonthlySalary.findMany({

          where: {
            adminId
          },

          orderBy: [
            { year: "desc" },
            { month: "desc" }
          ]
        });

      res.json(history);

    } catch (e) {

      res.status(400).json({
        message: e.message
      });
    }
  }

  // =====================================================
  // SCHOOL HISTORY
  // =====================================================
  async getAllSalaryHistoryBySchool(req, res) {

    try {

      const { schoolId } = req.params;

      const history =
        await prisma.adminMonthlySalary.findMany({

          where: {
            schoolId
          },

          include: {
            admin: {
              select: {
                id: true,
                name: true,
                email: true,
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

      res.status(400).json({
        message: e.message
      });
    }
  }

   // =====================================================
    // SEND SALARY SLIP WHATSAPP
    // =====================================================

    async sendSalarySlip(req, res) {

    try {

        const { salaryId } = req.params;

        const salary =
        await prisma.adminMonthlySalary.findUnique({

            where: {
            id: salaryId
            },

            include: {
            admin: {
                include: {
                schoolAdminProfile: true,
                school: true,
                }
            }
            }
        });

        if (!salary) {
        return res.status(404).json({
            message: "Salary record not found"
        });
        }

        const phone =
        salary.admin?.schoolAdminProfile?.phoneNumber;

        if (!phone) {
        return res.status(400).json({
            message: "Admin phone number missing"
        });
        }

        const pdfBuffer =
        Buffer.from(req.body.pdfBase64, "base64");

        const fileName =
        `salary-slips/admin-${salary.id}.pdf`;

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
            salary.admin?.name || "Admin",

        schoolName:
            salary.admin?.school?.name ||
            "School",

        monthYear,

        pdfUrl,
        });

        res.json({
        success: true,
        message:
            "Salary slip sent on WhatsApp",
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

export default new AdminSalaryController();

