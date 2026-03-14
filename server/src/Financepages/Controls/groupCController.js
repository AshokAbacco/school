import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getAllGroupCStaff = async (req, res) => {
  try {
    const staff = await prisma.groupCStaffSalary.findMany({
      orderBy: { id: "desc" }
    });

    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch Group C staff" });
  }
};

export const createGroupCStaff = async (req, res) => {
  try {
    const data = await prisma.groupCStaffSalary.create({
      data: req.body
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Create failed" });
  }
};

export const updateGroupCStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await prisma.groupCStaffSalary.update({
      where: { id: Number(id) },
      data: req.body
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};

export const deleteGroupCStaff = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.groupCStaffSalary.delete({
      where: { id: Number(id) }
    });

    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed" });
  }
};

export const paySalaryGroupC = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await prisma.groupCStaffSalary.update({
      where: { id: Number(id) },
      data: { salaryPaid: true }
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Payment failed" });
  }
};