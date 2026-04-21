import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();

export const getAllGroupDStaff = async (req, res) => {
  try {
    const staff = await prisma.groupDStaffSalary.findMany({
      orderBy: { id: "desc" }
    });

    res.json(staff);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch Group D staff" });
  }
};

export const createGroupDStaff = async (req, res) => {
  try {
    const data = await prisma.groupDStaffSalary.create({
      data: req.body
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Create failed" });
  }
};

export const updateGroupDStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await prisma.groupDStaffSalary.update({
      where: { id: Number(id) },
      data: req.body
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Update failed" });
  }
};

export const deleteGroupDStaff = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.groupDStaffSalary.delete({
      where: { id: Number(id) }
    });

    res.json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Delete failed" });
  }
};

export const paySalaryGroupD = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await prisma.groupDStaffSalary.update({
      where: { id: Number(id) },
      data: { salaryPaid: true }
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Payment failed" });
  }
};