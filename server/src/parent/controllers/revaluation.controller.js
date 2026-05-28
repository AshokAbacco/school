//server\src\parent\controllers\revaluation.controller.js
import prisma from "../../lib/prisma.js";

export const createRevaluationRequest = async (req, res) => {
  try {
    const {
      studentId,
      markId,
      subjectId,
      currentMarks,
      reason,
    } = req.body;

    // validation
    if (!studentId || !markId || !subjectId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // check duplicate
    const existing = await prisma.revaluationRequest.findFirst({
      where: {
        studentId,
        markId,
      },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Already applied for revaluation",
      });
    }

    const request = await prisma.revaluationRequest.create({
      data: {
        studentId,
        markId,
        subjectId,
        currentMarks,
        reason,
      },

      include: {
        student: true,
        subject: true,
        mark: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Revaluation request submitted",
      data: request,
    });

  } catch (error) {
    console.error("Revaluation Request Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit request",
    });
  }
};

export const getStudentRevaluationRequests = async (req, res) => {
  try {
    const { studentId } = req.params;

    const requests = await prisma.revaluationRequest.findMany({
      where: {
        studentId,
      },

      include: {
        subject: true,
        mark: true,
      },

      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      success: true,
      data: requests,
    });

  } catch (error) {
    console.error("Fetch Revaluation Requests Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch requests",
    });
  }
};