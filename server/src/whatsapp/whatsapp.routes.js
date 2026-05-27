// server/src/whatsapp/whatsapp.routes.js
import express from "express";
import {
  sendTestMessage,
  sendBirthdayWish,
  sendTodayBirthdays,
  sendTodayAnniversaries
} from "./WhatsApp.Controlls.js";

const router = express.Router();

router.post("/test", sendTestMessage);
router.post("/birthday", sendBirthdayWish);
router.post("/today-birthdays", sendTodayBirthdays);
router.post("/today-anniversaries", sendTodayAnniversaries);
export default router;