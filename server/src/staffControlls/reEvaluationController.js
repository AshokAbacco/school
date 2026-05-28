import { prisma } from "../config/db.js";

// CREATE OR UPDATE RE-EVALUATION PRICE
export const upsertReEvaluationSetting = async (
  req,
  res
) => {
  try {
    const {
      academicYearId,
      classSectionId,
      subjectId,
      amount,
      isActive = true,
    } = req.body;

    if (
      !academicYearId ||
      !classSectionId ||
      !subjectId ||
      amount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "academicYearId, classSectionId, subjectId and amount are required",
      });
    }

    const schoolId = req.user.schoolId;

    const parsedAmount =
      Number(amount);

    if (
      Number.isNaN(parsedAmount)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid amount",
      });
    }

    const setting =
      await prisma.reEvaluationSetting.upsert({
        where: {
          academicYearId_classSectionId_subjectId:
            {
              academicYearId,
              classSectionId,
              subjectId,
            },
        },
        update: {
          amount: parsedAmount,
          isActive,
        },
        create: {
          schoolId,
          academicYearId,
          classSectionId,
          subjectId,
          amount: parsedAmount,
          isActive,
        },
        include: {
          academicYear: true,
          classSection: true,
          subject: true,
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Re-evaluation pricing saved successfully",
      data: setting,
    });
  } catch (error) {
    console.error(
      "UPSERT RE-EVALUATION SETTING ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to save re-evaluation pricing",
    });
  }
};

// GET ALL RE-EVALUATION SETTINGS
export const getReEvaluationSettings = async (
  req,
  res
) => {
  try {
    const schoolId =
      req.user.schoolId;

    const {
      academicYearId,
      classSectionId,
    } = req.query;

    const settings =
      await prisma.reEvaluationSetting.findMany({
        where: {
          schoolId,
          ...(academicYearId
            ? { academicYearId }
            : {}),
          ...(classSectionId
            ? { classSectionId }
            : {}),
        },
        include: {
          academicYear: {
            select: {
              id: true,
              name: true,
            },
          },
          classSection: {
            select: {
              id: true,
              name: true,
              grade: true,
              section: true,
            },
          },
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: [
          {
            createdAt: "desc",
          },
        ],
      });

    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error(
      "GET RE-EVALUATION SETTINGS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch re-evaluation settings",
    });
  }
};

// DELETE RE-EVALUATION SETTING
export const deleteReEvaluationSetting = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    await prisma.reEvaluationSetting.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      success: true,
      message:
        "Re-evaluation pricing deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE RE-EVALUATION SETTING ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete re-evaluation pricing",
    });
  }
};