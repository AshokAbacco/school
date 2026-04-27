import express from "express";
import { PrismaClient } from "@prisma/client";
import authMiddleware from "../../middlewares/authMiddleware.js";

const router = express.Router();
const prisma = new PrismaClient();

router.get("/fees", authMiddleware, async (req, res) => {
  try {
    const parentId = req.user.id;

    // 1️⃣ Find children of this parent
    const children = await prisma.studentList.findMany({
      where: { parentId: parentId },
      select: { id: true }
    });

    const studentIds = children.map(c => c.id);

    // 2️⃣ Fetch finance data for those students
    const fees = await prisma.studentList.findMany({
      where: {
        id: { in: studentIds }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json(fees);

  } catch (err) {
    console.error("Parent fees error:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;