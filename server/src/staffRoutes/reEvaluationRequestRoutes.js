import express from "express";

import authMiddleware from "../middlewares/authMiddleware.js";

import upload from "../middlewares/upload.js";

import {
  getReEvaluationRequests,
  updatePaymentStatus,
  uploadAnswerSheet,
  getAnswerSheetUrl,
} from "../staffControlls/reEvaluationRequestController.js";

const router =
  express.Router();

router.use(authMiddleware);

router.get(
  "/requests",
  getReEvaluationRequests
);

router.patch(
  "/requests/:id/payment",
  updatePaymentStatus
);

router.post(
  "/requests/:id/upload-answer-sheet",
  upload.single("file"),
  uploadAnswerSheet
);

router.get(
  "/requests/:id/answer-sheet",
  getAnswerSheetUrl
);

export default router;