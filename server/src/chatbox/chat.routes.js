import express from "express";
import {
  createChat,
  sendMessage,
  getChats,
  getMessages,
  getUsersByRole,
  getParentTeachers,
  deleteChat,
  markMessagesSeen,
  groupSendMessage
} from "./chat.controller.js";

import authMiddleware from "../middlewares/authMiddleware.js"; // ✅ SAME AS YOUR WORKING FILE

const router = express.Router();

router.use(authMiddleware);
// ✅ CORRECT ORDER
router.get("/", getUsersByRole);
router.get("/list", getChats);
router.get("/parent-teachers", getParentTeachers);
router.post("/mark-seen", markMessagesSeen);
router.post("/create", createChat);
router.post("/send", sendMessage);
router.delete("/chat/:chatRoomId", deleteChat);
router.get("/:chatRoomId/messages", getMessages); // dynamic LAST
router.post("/group-send", groupSendMessage);
export default router;