import express from "express";
import { sendVoiceReminder } from "../controllers/voice.controller.js";

const router = express.Router();

router.post("/send-fee-voice", sendVoiceReminder);

export default router;