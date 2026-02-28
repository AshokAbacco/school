import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

router.post("/addStudentFinance", async (req, res) => {
    try {

        const { name, email, phone, course, fees, address } = req.body;

        const student = await prisma.studentFinance.create({
            data: {
                name,
                email,
                phone,
                course,
                fees: parseFloat(fees),
                address
            }
        });

        res.json(student);

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
});

router.get("/getStudentFinance", async (req, res) => {
    try {

        const students = await prisma.studentFinance.findMany({
            orderBy: { id: "desc" }
        });

        res.json(students);

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

export default router;
router.put("/updateStudentFinance/:id", async (req, res) => {
  try {

    const id = parseInt(req.params.id);
    const { name, email, phone, course, fees, address } = req.body;

    const updated = await prisma.studentFinance.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        course,
        fees: parseFloat(fees),
        address
      }
    });

    res.json(updated);

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.delete("/deleteStudentFinance/:id", async (req, res) => {
  try {

    const id = parseInt(req.params.id);

    await prisma.studentFinance.delete({
      where: { id }
    });

    res.json({ message: "Deleted Successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});