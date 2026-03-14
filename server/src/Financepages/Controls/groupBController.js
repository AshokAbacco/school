import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// GET ALL
export const getAllGroupBStaff = async (req, res) => {
  try {
    const staff = await prisma.groupBStaffSalary.findMany();
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// CREATE
export const createGroupBStaff = async (req, res) => {
  try {
    const data = await prisma.groupBStaffSalary.create({
      data: req.body,
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
export const updateGroupBStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await prisma.groupBStaffSalary.update({
      where: { id: Number(id) },
      data: req.body,
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
export const deleteGroupBStaff = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.groupBStaffSalary.delete({
      where: { id: Number(id) },
    });

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PAY SALARY
export const paySalaryGroupB = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await prisma.groupBStaffSalary.update({
      where: { id: Number(id) },
      data: { salaryPaid: true },
    });

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};