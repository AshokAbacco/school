import express from "express";
import {
  sendTestMessage,
  sendBirthdayWish,
  sendTodayBirthdays
} from "./WhatsApp.Controlls.js";

const router = express.Router();

router.post("/test", sendTestMessage);
router.post("/birthday", sendBirthdayWish);
router.post("/today-birthdays", sendTodayBirthdays);

export default router;