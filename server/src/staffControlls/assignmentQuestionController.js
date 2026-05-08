//server\src\staffControlls\assignmentQuestionController.js
import { prisma } from "../config/db.js";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";

const r2 = new S3Client({
  region: process.env.R2_REGION || "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});
const BUCKET = process.env.R2_BUCKET;

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const ok  = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const err = (res, msg, status = 400)  => res.status(status).json({ success: false, message: msg });

const schoolGuard = (req) => {
  const schoolId = req.user?.schoolId;
  if (!schoolId) throw new Error("No schoolId on token");
  return schoolId;
};

const teacherGuard = async (req) => {
  if (req.user?.teacherProfileId) return req.user.teacherProfileId;
  if (!req.user?.id) throw new Error("Unauthorized");
  const profile = await prisma.teacherProfile.findUnique({
    where: { userId: req.user.id },
    select: { id: true },
  });
  if (!profile) throw new Error("Teacher profile not found");
  req.user.teacherProfileId = profile.id;
  return profile.id;
};

// ── Determine allowed question types by grade ──────────────────
function getAllowedTypes(grade) {
  // grade is a string like "1", "5", "8", "11"
  const g = parseInt(grade, 10);
  if (isNaN(g))    return ["MCQ", "WRITTEN"];
  if (g <= 7)      return ["MCQ"];
  if (g <= 10)     return ["MCQ", "WRITTEN"];
  return ["WRITTEN"];
}

// ═══════════════════════════════════════════
//  TEACHER: Manage Questions
// ═══════════════════════════════════════════

export async function getQuestions(req, res) {
  try {
    const schoolId  = schoolGuard(req);
    const teacherId = await teacherGuard(req);
    const { assignmentId } = req.params;

    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, schoolId, teacherId, isArchived: false },
    });
    if (!assignment) return err(res, "Assignment not found", 404);

    const questions = await prisma.assignmentQuestion.findMany({
      where:   { assignmentId },
      orderBy: { order: "asc" },
    });

    return ok(res, { data: questions });
  } catch (e) {
    return err(res, e.message, 500);
  }
}

export async function upsertQuestions(req, res) {
  try {
    const schoolId  = schoolGuard(req);
    const teacherId = await teacherGuard(req);
    const { assignmentId } = req.params;

    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId, schoolId, teacherId, isArchived: false,
      },
      include: {
        sections: {
          include: { classSection: { select: { grade: true } } },
        },
      },
    });
    if (!assignment) return err(res, "Assignment not found", 404);

    // Detect grade from first section
    const grade = assignment.sections?.[0]?.classSection?.grade;
    const allowed = getAllowedTypes(grade);

    const { questions } = req.body; // array of question objects
    if (!Array.isArray(questions) || questions.length === 0)
      return err(res, "questions array is required");

    // Validate types
    for (const q of questions) {
      if (!allowed.includes(q.type))
        return err(res, `Grade ${grade} only allows: ${allowed.join(", ")} questions`);
      if (q.type === "MCQ") {
        if (!q.options || q.options.length < 2)
          return err(res, "MCQ questions need at least 2 options");
        if (q.correctIndex === undefined || q.correctIndex === null)
          return err(res, "MCQ questions need a correctIndex");
      }
    }

    // Replace all questions in transaction
    await prisma.$transaction(async (tx) => {
      await tx.assignmentQuestion.deleteMany({ where: { assignmentId } });
      await tx.assignmentQuestion.createMany({
        data: questions.map((q, i) => ({
          assignmentId,
          questionText: q.questionText,
          type:         q.type,
          order:        i,
          marks:        q.marks || 1,
          options:      q.type === "MCQ" ? (q.options || []) : [],
          correctIndex: q.type === "MCQ" ? q.correctIndex : null,
        })),
      });
    });

    const saved = await prisma.assignmentQuestion.findMany({
      where:   { assignmentId },
      orderBy: { order: "asc" },
    });

    return ok(res, { data: saved });
  } catch (e) {
    console.error("[upsertQuestions]", e);
    return err(res, e.message, 500);
  }
}

export async function deleteQuestion(req, res) {
  try {
    const schoolId  = schoolGuard(req);
    const teacherId = await teacherGuard(req);
    const { assignmentId, questionId } = req.params;

    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, schoolId, teacherId, isArchived: false },
    });
    if (!assignment) return err(res, "Assignment not found", 404);

    await prisma.assignmentQuestion.delete({ where: { id: questionId } });
    return ok(res, { message: "Question deleted" });
  } catch (e) {
    return err(res, e.message, 500);
  }
}

// ═══════════════════════════════════════════
//  TEACHER: View Submissions
// ═══════════════════════════════════════════

export async function getSubmissions(req, res) {
  try {
    const schoolId  = schoolGuard(req);
    const teacherId = await teacherGuard(req);
    const { assignmentId } = req.params;

    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, schoolId, teacherId, isArchived: false },
    });
    if (!assignment) return err(res, "Assignment not found", 404);

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: {
        student: {
          include: {
            personalInfo: { select: { firstName: true, lastName: true, profileImage: true } },
          },
        },
        responses: {
          include: { question: true },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    // Add signed URLs for written responses
    const enriched = await Promise.all(submissions.map(async (sub) => {
      const responses = await Promise.all(sub.responses.map(async (r) => {
        if (r.fileKey) {
          const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: r.fileKey });
          r.signedUrl = await getSignedUrl(r2, cmd, { expiresIn: 3600 });
        }
        return r;
      }));
      return { ...sub, responses };
    }));

    return ok(res, { data: enriched });
  } catch (e) {
    return err(res, e.message, 500);
  }
}

export async function gradeSubmission(req, res) {
  try {
    const schoolId  = schoolGuard(req);
    const teacherId = await teacherGuard(req);
    const { assignmentId, submissionId } = req.params;

    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, schoolId, teacherId, isArchived: false },
    });
    if (!assignment) return err(res, "Assignment not found", 404);

    const { writtenScore, teacherFeedback } = req.body;

    const submission = await prisma.assignmentSubmission.findFirst({
      where: { id: submissionId, assignmentId },
    });
    if (!submission) return err(res, "Submission not found", 404);

    const total = (submission.mcqScore || 0) + (parseFloat(writtenScore) || 0);
    const max   = (submission.mcqMaxScore || 0) + (submission.writtenMaxScore || 0);

    const updated = await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        writtenScore:    parseFloat(writtenScore) || 0,
        teacherFeedback: teacherFeedback || null,
        totalScore:      total,
        totalMaxScore:   max,
        percentage:      max > 0 ? (total / max) * 100 : null,
        grade:           calcGrade(max > 0 ? (total / max) * 100 : 0),
        gradedAt:        new Date(),
        status:          "GRADED",
      },
    });

    return ok(res, { data: updated });
  } catch (e) {
    return err(res, e.message, 500);
  }
}

// ═══════════════════════════════════════════
//  STUDENT: Get Assignment + Submit
// ═══════════════════════════════════════════

export async function getAssignmentForStudent(req, res) {
  try {
    const { assignmentId } = req.params;
    const studentId = req.user?.id;

    if (!studentId) {
      return err(res, "Unauthorized", 401);
    }

    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, isArchived: false, status: "PUBLISHED" },
      include: {
        subject:      { select: { name: true } },
        academicYear: { select: { name: true } },
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true, questionText: true, type: true,
            order: true, marks: true,
            options: true,
            // ⚠️ correctIndex NOT sent before submission
          },
        },
      },
    });
    if (!assignment) return err(res, "Assignment not found", 404);

    // Check if already submitted
    const existing = await prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
      include: {
        responses: {
          select: {
            id: true,
            questionId: true,
            selectedIndex: true,
            isCorrect: true,
            answerText: true,
          },
        },
      },
    });

    // ✅ If already submitted, safe to send correctIndex
    let questionsWithAnswers = null;
    if (existing) {
      questionsWithAnswers = await prisma.assignmentQuestion.findMany({
        where: { assignmentId },
        select: {
          id: true, questionText: true, type: true,
          order: true, marks: true,
          options: true,
          correctIndex: true, // ✅ revealed only after submission
        },
        orderBy: { order: "asc" },
      });
    }

    return ok(res, {
      data: {
        assignment,
        submission: existing || null,
        questionsWithAnswers, // null if not yet submitted
      },
    });
  } catch (e) {
    return err(res, e.message, 500);
  }
}

export async function submitAssignment(req, res) {
  try {
    const { assignmentId } = req.params;
    const studentId = req.user?.id;

    if (!studentId) {
      return err(res, "Unauthorized", 401);
    }

    // Check duplicate
    const existing = await prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
    });
    if (existing) return err(res, "Already submitted", 409);

    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        isArchived: false,
        status: "PUBLISHED",
      },
      include: {
        questions: true,
        subject: {
          select: {
            id: true,
            name: true,
          },
        },
        sections: {
          include: {
            classSection: {
              select: {
                grade: true,
              },
            },
          },
        },
      },
    });
    if (!assignment) return err(res, "Assignment not found", 404);

    const isLate = new Date() > new Date(assignment.dueDate);

    const responses = JSON.parse(req.body.responses || "[]");
    const files = req.files || [];

    const fileMap = {};
    for (const file of files) {
      fileMap[file.fieldname] = file;
    }

    let mcqScore   = 0;
    let mcqMax     = 0;
    let writtenMax = 0;

    const responseData = [];

    for (const q of assignment.questions) {
      const resp = responses.find((r) => r.questionId === q.id);

      if (q.type === "MCQ") {
        mcqMax += q.marks;
        const selectedIndex = resp?.selectedIndex ?? null;
        const isCorrect = selectedIndex !== null && selectedIndex === q.correctIndex;
        if (isCorrect) mcqScore += q.marks;

        responseData.push({
          questionId:    q.id,
          selectedIndex,
          isCorrect,
          answerText:    null,
          fileKey:       null,
          fileType:      null,
        });
      } else {
        writtenMax += q.marks;
        let fileKey  = null;
        let fileType = null;

        const file = fileMap[q.id];
        if (file) {
          fileKey  = `submissions/${assignmentId}/${studentId}/${uuidv4()}-${file.originalname}`;
          fileType = file.mimetype;
          await r2.send(new PutObjectCommand({
            Bucket:      BUCKET,
            Key:         fileKey,
            Body:        file.buffer,
            ContentType: fileType,
          }));
        }

        responseData.push({
          questionId:    q.id,
          selectedIndex: null,
          isCorrect:     null,
          answerText:    resp?.answerText || null,
          fileKey,
          fileType,
        });
      }
    }

    const isFullyAutoGraded = assignment.questions.every((q) => q.type === "MCQ");
    const totalMax   = mcqMax + writtenMax;
    const totalScore = isFullyAutoGraded ? mcqScore : null;
    const pct        = (isFullyAutoGraded && totalMax > 0) ? (mcqScore / totalMax) * 100 : null;

    const submission = await prisma.$transaction(async (tx) => {
      const sub = await tx.assignmentSubmission.create({
        data: {
          assignmentId,
          studentId,
          isLate,
          mcqScore,
          mcqMaxScore:     mcqMax,
          writtenMaxScore: writtenMax,
          totalScore,
          totalMaxScore:   totalMax,
          percentage:      pct,
          grade:           pct !== null ? calcGrade(pct) : null,
          status:          isFullyAutoGraded ? "GRADED" : "SUBMITTED",
          responses: {
            create: responseData,
          },
        },
        include: {
          responses: {
            include: {
              question: true,
            },
          },
        },
      });
      return sub;
    });

    // ✅ After submission, safe to reveal correctIndex
    const questionsWithAnswers = await prisma.assignmentQuestion.findMany({
      where: { assignmentId },
      select: {
        id:           true,
        questionText: true,
        type:         true,
        order:        true,
        marks:        true,
        options:      true,
        correctIndex: true, // ✅ only exposed after submission
      },
      orderBy: { order: "asc" },
    });

    // ======================================================
    // TUTORIAL RECOMMENDATION ANALYSIS
    // ======================================================
    if (pct !== null) {
      const recentSubmissions = await prisma.assignmentSubmission.findMany({
        where: {
          studentId,
          assignment: {
            subjectId: assignment.subject.id,
          },
        },
        orderBy: { submittedAt: "desc" },
        take: 5,
      });

      const averagePercentage =
        recentSubmissions.length > 0
          ? recentSubmissions.reduce((sum, item) => sum + (item.percentage || 0), 0) /
            recentSubmissions.length
          : 0;

      if (averagePercentage < 60) {
        const studentGrade = assignment.sections?.[0]?.classSection?.grade;

        const tutorialTeachers = await prisma.teacherTutorialProfile.findMany({
          where: {
            schoolId: assignment.schoolId,
            isActive: true,
            subjects: { has: assignment.subject.name },
            grades:   { has: String(studentGrade) },
          },
          include: {
            teacher: {
              select: {
                firstName:   true,
                lastName:    true,
                designation: true,
                profileImage: true,
              },
            },
          },
          orderBy: [
            { rankingScore:    "desc" },
            { adminPriority:   "desc" },
          ],
          take: 5,
        });

        await prisma.studentTutorialRecommendation.upsert({
          where: {
            studentId_subjectId: {
              studentId,
              subjectId: assignment.subject.id,
            },
          },
          update: {
            averageScore:        averagePercentage,
            status:              "ACTIVE",
            recommendedTeachers: tutorialTeachers,
            lastAnalysedAt:      new Date(),
          },
          create: {
            studentId,
            subjectId:           assignment.subject.id,
            averageScore:        averagePercentage,
            status:              "ACTIVE",
            recommendedTeachers: tutorialTeachers,
            lastAnalysedAt:      new Date(),
          },
        });
      } else {
        await prisma.studentTutorialRecommendation.updateMany({
          where: {
            studentId,
            subjectId: assignment.subject.id,
          },
          data: {
            status:        "RESOLVED",
            averageScore:  averagePercentage,
            lastAnalysedAt: new Date(),
          },
        });
      }
    }

    // ✅ Return submission + questionsWithAnswers together
    return ok(res, {
      data: {
        ...submission,
        questionsWithAnswers,
      },
    }, 201);

  } catch (e) {
    console.error("[submitAssignment]", e);
    return err(res, e.message, 500);
  }
}

function calcGrade(pct) {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B+";
  if (pct >= 60) return "B";
  if (pct >= 50) return "C";
  if (pct >= 35) return "D";
  return "F";
}