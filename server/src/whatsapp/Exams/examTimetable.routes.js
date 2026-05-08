import express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";

import {
  sendExamTimetableToParents,
} from "./ExamTimetableWhatsApp.js";

const router = express.Router();

router.post(
  "/send/:groupId",
  authMiddleware,
  sendExamTimetableToParents
);

export default router;