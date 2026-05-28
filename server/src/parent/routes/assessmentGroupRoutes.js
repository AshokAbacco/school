//server\src\parent\routes\assessmentGroupRoutes.js
import express from "express";
import { prisma } from "../../config/db.js";

const router = express.Router();

router.get(
  "/final",
  async (req, res) => {
    try {
      const data =
        await prisma.assessmentGroup.findMany({
          where: {
            isPublished: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        });

      return res.json({
        success: true,
        data,
      });
    } catch (error) {
      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch exams",
      });
    }
  }
);

export default router;