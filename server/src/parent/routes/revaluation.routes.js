//server\src\parent\routes\revaluation.routes.js
import express from "express";

import {
  createRevaluationRequest,
  getStudentRevaluationRequests,
} from "../controllers/revaluation.controller.js";

const router = express.Router();

router.post("/", createRevaluationRequest);

router.get("/:studentId", getStudentRevaluationRequests);

export default router;