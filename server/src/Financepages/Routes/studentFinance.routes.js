import express from "express";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

router.post("/addStudentFinance", async (req, res) => {
  try {

    console.log("POST BODY 👉", req.body);

    const { name, email, phone, course, fees, address } = req.body;

    const student = await prisma.studentList.create({
      data: {
        name,
        email,
        phone,
        course: course || null,
        fees: fees ? parseFloat(fees) : null,
        address: address || null
      }
    });

    console.log("Saved student 👉", student);

    res.json(student);

  } catch (error) {
    console.error("Save Error:", error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/getStudentFinance", async (req, res) => {
  try {

   const students = await prisma.studentList.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json(students);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

router.put("/updateStudentFinance/:id", async (req, res) => {
  try {

    const id = parseInt(req.params.id);
    const { name, email, phone, course, fees, address } = req.body;

    const updated = await prisma.studentList.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        course,
        fees: fees ? parseFloat(fees) : null,
        address
      }
    });

    res.json(updated);

  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: error.message });
  }
});
router.delete("/deleteStudentFinance/:id", async (req, res) => {
  try {
    
    const id = parseInt(req.params.id);
    
    await prisma.studentList.delete({
      where: { id }
    });
    
    res.json({ message: "Deleted Successfully" });
    
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.get("/studentsByClass", async (req, res) => {
  try {

    const { schoolId, classSectionId } = req.query;

    const students = await prisma.studentEnrollment.findMany({
      where: {
        classSectionId: classSectionId
      },
      include: {
        student: {
          include: {
            personalInfo: true
          }
        },
        classSection: true
      }
    });

    res.json(students);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});
router.get("/schools", async (req, res) => {
  const schools = await prisma.school.findMany({
    select: {
      id: true,
      name: true
    }
  });

  res.json(schools);
});
router.get("/classSections", async (req, res) => {

  const { schoolId } = req.query;

  const classes = await prisma.classSection.findMany({
    where: {
      schoolId
    },
    select: {
      id: true,
      grade: true,
      section: true,
      name: true
    }
  });

  res.json(classes);

});

router.get("/students", async (req, res) => {
  try {

    const students = await prisma.studentList.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });

    res.json(students);

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});
router.delete("/deleteStudent/:id", async (req, res) => {
  try {

    const id = parseInt(req.params.id);

    await prisma.studentList.delete({
      where: { id }
    });

    res.json({ message: "Deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;