import express from "express";
import {
  createChat,
  sendMessage,
  getChats,
  getMessages,
  getUsersByRole,
  getParentTeachers,
  deleteChat,
} from "./chat.controller.js";

import authMiddleware from "../middlewares/authMiddleware.js"; // ✅ SAME AS YOUR WORKING FILE

const router = express.Router();

router.use(authMiddleware);

// Create chat
router.post("/create", createChat);

router.delete("/chat/:chatRoomId", deleteChat);
// Send message
router.post("/send", sendMessage);

// Chat list
router.get("/list", getChats);

// Messages
router.get("/:chatRoomId/messages", getMessages);

router.get("/", getUsersByRole);
router.get("/parent-teachers", getParentTeachers);
export default router;