import express from "express";

import {
  upsertReEvaluationSetting,
  getReEvaluationSettings,
  deleteReEvaluationSetting,
} from "../staffControlls/reEvaluationController.js";

import authMiddleware from "../middlewares/authMiddleware.js";

const router =
  express.Router();

  router.use(authMiddleware);

router.post(
  "/settings",
  upsertReEvaluationSetting
);

router.get(
  "/settings",
  getReEvaluationSettings
);

router.delete(
  "/settings/:id",
  deleteReEvaluationSetting
);

export default router;