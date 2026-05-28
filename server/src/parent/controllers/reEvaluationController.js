// /server/src/parent/controllers/reEvaluationController.js
import { prisma } from "../../config/db.js";

// ── helper: get parent record from token email ─────────────────
// ✅ Token id IS the parentId directly
const getParentFromToken = async (req) => {
  return prisma.parent.findUnique({
    where: { id: req.user.id },  // was: email: req.user.email
  });
};

// GET FINAL EXAM SUBJECTS + MARKS + PRICE
export const getReEvaluationSubjects = async (req, res) => {
  try {
    const { studentId, assessmentGroupId } = req.query;

    if (!studentId || !assessmentGroupId) {
      return res.status(400).json({
        success: false,
        message: "studentId and assessmentGroupId are required",
      });
    }

    const student = await prisma.student.findFirst({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    const marks = await prisma.marks.findMany({
      where: {
        studentId,
        schedule: {
          assessmentGroupId,
        },
      },
      include: {
        schedule: {
          include: {
            subject: true,
            assessmentGroup: true,
          },
        },
      },
    });

    const subjectIds = marks.map((item) => item.schedule.subjectId);

    const settings = await prisma.reEvaluationSetting.findMany({
      where: {
        subjectId: { in: subjectIds },
        isActive: true,
      },
    });

    const formattedData = marks.map((item) => {
      const subject = item.schedule.subject;

      const setting = settings.find(
        (price) => price.subjectId === subject.id
      );

      return {
        marksId:               item.id,
        subjectId:             subject.id,
        subjectName:           subject.name,
        subjectCode:           subject.code,
        obtainedMarks:         item.marksObtained,
        maxMarks:              item.schedule.maxMarks,
        passMarks:             item.schedule.passingMarks,
        result:                item.isAbsent ? "ABSENT" : null,
        reEvaluationAmount:    setting?.amount || 0,
        reEvaluationSettingId: setting?.id     || null,
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error("GET RE-EVALUATION SUBJECTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch re-evaluation subjects",
    });
  }
};

// CREATE RE-EVALUATION REQUEST
export const createReEvaluationRequest = async (req, res) => {
  try {
    const { studentId, requests, assessmentGroupId, parentRemarks } = req.body;

    if (!studentId || !assessmentGroupId || !Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid request payload",
      });
    }

    // ✅ Get parent from token email
    const parent = await getParentFromToken(req);
    if (!parent) {
      return res.status(404).json({ success: false, message: "Parent not found" });
    }

    const createdRequests = [];

    for (const item of requests) {
      const { marksId, subjectId } = item;

      const marks = await prisma.marks.findUnique({
        where: { id: marksId },
        include: {
          student: {
            include: {
              enrollments: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
          schedule: true,
        },
      });

      if (!marks) continue;

      // ✅ Get academicYearId and classSectionId from enrollment (not Student directly)
      const enrollment = marks.student.enrollments?.[0];

      const pricing = await prisma.reEvaluationSetting.findFirst({
        where: {
          academicYearId: enrollment?.academicYearId,
          classSectionId: enrollment?.classSectionId,
          subjectId,
          isActive: true,
        },
      });

      const alreadyExists = await prisma.reEvaluationRequest.findFirst({
        where: { studentId, marksId },
      });

      if (alreadyExists) continue;

      const request = await prisma.reEvaluationRequest.create({
        data: {
          schoolId:              parent.schoolId,
          parentId:              parent.id,
          studentId,
          marksId,
          assessmentGroupId,
          subjectId,
          reEvaluationSettingId: pricing?.id     || null,
          requestedAmount:       pricing?.amount  || 0,
          parentRemarks,
          isPaid: false,
          status: "PENDING",
        },
      });

      createdRequests.push(request);
    }

    return res.status(201).json({
      success: true,
      message: "Re-evaluation request submitted successfully",
      data: createdRequests,
    });
  } catch (error) {
    console.error("CREATE RE-EVALUATION REQUEST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit re-evaluation request",
    });
  }
};

// GET MY RE-EVALUATION REQUESTS
export const getMyReEvaluationRequests = async (req, res) => {
  try {
    // ✅ Get parent from token email
    const parent = await getParentFromToken(req);
    if (!parent) {
      return res.status(404).json({ success: false, message: "Parent not found" });
    }

    const requests = await prisma.reEvaluationRequest.findMany({
      where: {
        parentId: parent.id,  // ✅ use parent.id not req.user.parentId
      },
      include: {
        student: {
          include: {
            personalInfo: true,  // ✅ firstName/lastName are in personalInfo
          },
        },
        subject: {
          select: {
            id:   true,
            name: true,
            code: true,
          },
        },
        assessmentGroup: {
          select: {
            id:   true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({
      success: true,
      data: requests,
    });
  } catch (error) {
    console.error("GET MY RE-EVALUATION REQUESTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch re-evaluation requests",
    });
  }
};