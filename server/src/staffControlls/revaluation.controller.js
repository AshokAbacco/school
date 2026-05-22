import { prisma } from "../config/db.js";

export const getTeacherRevaluationRequests = async (req, res) => {

  try {

    const requests =
      await prisma.revaluationRequest.findMany({

        include: {
          student: {
            include: {
              personalInfo: true,
            },
          },

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

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch requests",
    });
  }
};