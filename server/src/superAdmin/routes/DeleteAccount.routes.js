import express from "express";

import {
  deleteAccount,
  sendDeleteAccountOtp,
} from "../controllers/DeleteAccount.controller.js";

import authMiddleware from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.post(
  "/send-otp",
  authMiddleware,
  sendDeleteAccountOtp
);

router.delete(
  "/",
  authMiddleware,
  deleteAccount
);

export default router;