// src/biometric/biometric.routes.js

import express from "express";
import { receivePunch } from "./biometric.controller.js";

const router = express.Router();

router.post("/punch", receivePunch);

router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Biometric API Working",
  });
});

export default router;