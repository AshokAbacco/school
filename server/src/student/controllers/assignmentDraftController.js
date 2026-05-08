// server/src/student/controllers/assignmentDraftController.js

import { prisma } from "../../config/db.js";
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

const ok  = (res, data, s = 200) => res.status(s).json({ success: true,  ...data });
const err = (res, msg, s = 400)  => res.status(s).json({ success: false, message: msg });

// ─────────────────────────────────────────────────────────────────────────────
// Helper: compute seconds remaining for this student's session.
// Returns null if no time limit, negative if expired.
// ─────────────────────────────────────────────────────────────────────────────
function secondsRemaining(assignment, draft) {
  if (!assignment.timeLimitMinutes) return null;           // unlimited
  if (!draft?.startedAt) return assignment.timeLimitMinutes * 60;
  const elapsed = (Date.now() - new Date(draft.startedAt).getTime()) / 1000;
  return Math.floor(assignment.timeLimitMinutes * 60 - elapsed);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/assignments/:id/start
// Records startedAt (only on first call), returns existing draft + timeLeft
// ─────────────────────────────────────────────────────────────────────────────
export async function startAssignment(req, res) {
  try {
    const studentId    = req.user?.id;
    const assignmentId = req.params.id;
    if (!studentId) return err(res, "Unauthorized", 401);

    // Guard: already submitted?
    const existing = await prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
    });
    if (existing) return err(res, "Already submitted", 409);

    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, status: "PUBLISHED", isArchived: false },
      select: { id: true, timeLimitMinutes: true },
    });
    if (!assignment) return err(res, "Assignment not found", 404);

    // Upsert draft — only set startedAt on creation.
    // Race-safe: if two concurrent requests both try to create, the loser
    // gets P2002 — just re-fetch the row the winner created.
    let draft;
    try {
      draft = await prisma.assignmentDraft.upsert({
        where:  { assignmentId_studentId: { assignmentId, studentId } },
        create: { assignmentId, studentId, startedAt: new Date() },
        update: {}, // don't touch startedAt on subsequent calls
      });
    } catch (upsertErr) {
      if (upsertErr?.code === 'P2002') {
        // Another request won the race — read what it created
        draft = await prisma.assignmentDraft.findUnique({
          where: { assignmentId_studentId: { assignmentId, studentId } },
        });
        if (!draft) throw upsertErr;
      } else {
        throw upsertErr;
      }
    }

    const secs = secondsRemaining(assignment, draft);

    // If time already expired, trigger auto-submit immediately
    if (secs !== null && secs <= 0) {
      return await autoSubmitFromDraft(res, assignmentId, studentId, draft);
    }

    return ok(res, {
      draft: {
        answers:   draft.answers,
        startedAt: draft.startedAt,
        timeLeft:  secs, // seconds, null = unlimited
      },
    });
  } catch (e) {
    console.error("[startAssignment]", e);
    return err(res, e.message, 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/assignments/:id/draft
// Returns current draft + seconds remaining (used on page reload)
// ─────────────────────────────────────────────────────────────────────────────
export async function getDraft(req, res) {
  try {
    const studentId    = req.user?.id;
    const assignmentId = req.params.id;
    if (!studentId) return err(res, "Unauthorized", 401);

    const [draft, assignment] = await Promise.all([
      prisma.assignmentDraft.findUnique({
        where: { assignmentId_studentId: { assignmentId, studentId } },
      }),
      prisma.assignment.findFirst({
        where:  { id: assignmentId },
        select: { timeLimitMinutes: true },
      }),
    ]);

    if (!draft) return ok(res, { draft: null });

    const secs = secondsRemaining(assignment, draft);

    // Expired — auto-submit
    if (secs !== null && secs <= 0) {
      return await autoSubmitFromDraft(res, assignmentId, studentId, draft);
    }

    return ok(res, {
      draft: {
        answers:   draft.answers,
        startedAt: draft.startedAt,
        timeLeft:  secs,
      },
    });
  } catch (e) {
    console.error("[getDraft]", e);
    return err(res, e.message, 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/assignments/:id/draft
// Body: { questionId, selectedIndex?, answerText?, fileKey? }
// Merges into the JSON blob — does NOT overwrite other questions
// ─────────────────────────────────────────────────────────────────────────────
export async function saveDraft(req, res) {
  try {
    const studentId    = req.user?.id;
    const assignmentId = req.params.id;
    if (!studentId) return err(res, "Unauthorized", 401);

    const { questionId, selectedIndex, answerText, fileKey } = req.body;
    if (!questionId) return err(res, "questionId required");

    // Guard: already submitted?
    const submitted = await prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId } },
    });
    if (submitted) return err(res, "Already submitted", 409);

    // Fetch current draft to check time
    const [existingDraft, assignment] = await Promise.all([
      prisma.assignmentDraft.findUnique({
        where: { assignmentId_studentId: { assignmentId, studentId } },
      }),
      prisma.assignment.findFirst({
        where:  { id: assignmentId },
        select: { timeLimitMinutes: true },
      }),
    ]);

    if (existingDraft) {
      const secs = secondsRemaining(assignment, existingDraft);
      if (secs !== null && secs <= 0) {
        // Auto-submit silently and reject save
        await autoSubmitFromDraft(res, assignmentId, studentId, existingDraft);
        return; // response already sent
      }
    }

    // Merge patch into existing answers JSON
    const current = (existingDraft?.answers || {});
    const patch   = {
      ...(selectedIndex !== undefined ? { selectedIndex } : {}),
      ...(answerText    !== undefined ? { answerText }    : {}),
      ...(fileKey       !== undefined ? { fileKey }       : {}),
    };

    const updated = await prisma.assignmentDraft.upsert({
      where:  { assignmentId_studentId: { assignmentId, studentId } },
      create: {
        assignmentId,
        studentId,
        answers:   { [questionId]: patch },
        startedAt: new Date(),
      },
      update: {
        answers: { ...current, [questionId]: { ...(current[questionId] || {}), ...patch } },
      },
    });

    const secs = secondsRemaining(assignment, updated);

    return ok(res, {
      saved: true,
      timeLeft: secs,
    });
  } catch (e) {
    console.error("[saveDraft]", e);
    return err(res, e.message, 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal: convert a draft into a real submission (called on timeout / reload)
// ─────────────────────────────────────────────────────────────────────────────
async function autoSubmitFromDraft(res, assignmentId, studentId, draft) {
  try {
    const assignment = await prisma.assignment.findFirst({
      where:   { id: assignmentId },
      include: { questions: { orderBy: { order: "asc" } } },
    });
    if (!assignment) return err(res, "Assignment not found", 404);

    const answers = (draft?.answers || {});
    const dueDate = assignment.dueDate;
    const isLate  = new Date() > new Date(dueDate);

    let mcqScore    = 0;
    let mcqMaxScore = 0;
    let writtenMaxScore = 0;

    const responseRows = assignment.questions.map((q) => {
      const ans = answers[q.id] || {};

      if (q.type === "MCQ") {
        mcqMaxScore += q.marks;
        const correct = ans.selectedIndex === q.correctIndex;
        if (correct) mcqScore += q.marks;
        return {
          questionId:    q.id,
          selectedIndex: ans.selectedIndex ?? null,
          isCorrect:     ans.selectedIndex !== undefined ? correct : false,
        };
      } else {
        writtenMaxScore += q.marks;
        return {
          questionId: q.id,
          answerText: ans.answerText || null,
          fileKey:    ans.fileKey    || null,
        };
      }
    });

    const totalMaxScore = mcqMaxScore + writtenMaxScore;
    const totalScore    = mcqScore; // written not graded yet
    const percentage    = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : null;

    function calcGrade(pct) {
      if (pct === null) return null;
      if (pct >= 90) return "A+";
      if (pct >= 80) return "A";
      if (pct >= 70) return "B";
      if (pct >= 60) return "C";
      if (pct >= 50) return "D";
      return "F";
    }

    // Use upsert so concurrent auto-submit calls don't crash on P2002.
    // If a submission already exists (race), we just return it.
    const submission = await prisma.$transaction(async (tx) => {
      // Check inside the transaction for true atomicity
      const alreadyInTx = await tx.assignmentSubmission.findUnique({
        where: { assignmentId_studentId: { assignmentId, studentId } },
        include: { responses: true },
      });
      if (alreadyInTx) return alreadyInTx;

      const sub = await tx.assignmentSubmission.create({
        data: {
          assignmentId,
          studentId,
          isLate,
          mcqScore,
          mcqMaxScore,
          writtenScore:    null,
          writtenMaxScore,
          totalScore,
          totalMaxScore,
          percentage,
          grade:  calcGrade(writtenMaxScore > 0 ? null : percentage),
          status: writtenMaxScore > 0 ? "SUBMITTED" : "GRADED",
          responses: {
            create: responseRows,
          },
        },
        include: { responses: true },
      });

      // Clean up draft
      await tx.assignmentDraft.deleteMany({
        where: { assignmentId, studentId },
      });

      return sub;
    });

    // Attach questionsWithAnswers for result screen
    const questionsWithAnswers = assignment.questions.map((q) => ({
      ...q,
      // hide correctIndex before grading for written, reveal for MCQ
      correctIndex: q.type === "MCQ" ? q.correctIndex : undefined,
    }));

    return res.status(200).json({
      success: true,
      autoSubmitted: true,
      data: {
        ...submission,
        questionsWithAnswers,
      },
    });
  } catch (e) {
    console.error("[autoSubmitFromDraft]", e);
    return res.status(500).json({ success: false, message: e.message });
  }
}

// Export for use in submit handler too
export { autoSubmitFromDraft };