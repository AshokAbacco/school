import express from "express";

import {
  getTeacherRevaluationRequests,
} from "../staffControlls/revaluation.controller.js";

const router = express.Router();

router.get("/", getTeacherRevaluationRequests);

export default router;