import { prisma } from "../config/db.js";
import { uploadToR2, generateSignedUrl } from "../lib/r2.js";
import { nanoid } from "nanoid";

// GET ALL REQUESTS
export const getReEvaluationRequests = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const requests = await prisma.reEvaluationRequest.findMany({
      where: { schoolId },
      include: {
        parent: true,

        student: {
          include: {
            personalInfo: true,
            enrollments: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: {
                classSection: true,
                academicYear: true,
              },
            },
          },
        },

        subject: true,
        assessmentGroup: true,

        marks: {
          include: {
            schedule: {
              include: {
                assessmentGroup: true,
                classSection: true,
                subject: true,
              },
            },
          },
        },

        setting: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({
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

// UPDATE PAYMENT STATUS
export const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isPaid } = req.body;

    const updated = await prisma.reEvaluationRequest.update({
      where: { id },
      data: {
        isPaid,
        status: isPaid ? "PAID" : "PENDING",
      },
    });

    return res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to update payment status",
    });
  }
};

// UPLOAD ANSWER SHEET
export const uploadAnswerSheet = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required",
      });
    }

    const request = await prisma.reEvaluationRequest.findUnique({
      where: { id },
      include: {
        student: true,
        subject: true,
      },
    });

    if (!request) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    const ext = req.file.originalname.split(".").pop();
    const key = `re-evaluation/${request.studentId}/${Date.now()}-${nanoid()}.${ext}`;

    await uploadToR2(key, req.file.buffer, req.file.mimetype);

    const updated = await prisma.reEvaluationRequest.update({
      where: { id },
      data: {
        answerSheetFileKey: key,
        answerSheetUploadedAt: new Date(),
        status: "ANSWER_SHEET_UPLOADED",
      },
    });

    return res.status(200).json({
      success: true,
      message: "Answer sheet uploaded successfully",
      data: updated,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload answer sheet",
    });
  }
};

// GET ANSWER SHEET URL
export const getAnswerSheetUrl = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await prisma.reEvaluationRequest.findUnique({
      where: { id },
    });

    if (!request || !request.answerSheetFileKey) {
      return res.status(404).json({
        success: false,
        message: "Answer sheet not found",
      });
    }

    const url = await generateSignedUrl(request.answerSheetFileKey);

    return res.status(200).json({
      success: true,
      url,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch answer sheet",
    });
  }
};