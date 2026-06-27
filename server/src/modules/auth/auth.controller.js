// server/src/modules/auth/auth.controller.js
import {
  registerSuperAdminService,
  loginSuperAdminService,
  loginStaffService,
  loginStudentService,
  loginParentService,
  loginFinanceService,
  loginWithOtpService,
  verifyLoginOtpService,
  sendOtp,
  verifyOtp as verifyOtpService,
  resetPassword as resetPasswordService,
} from "./auth.service.js";

import { prisma } from "../../config/db.js";

const handle = (serviceFn) => async (req, res) => {
  try {
    const result = await serviceFn(req.body);
    return res.status(200).json({
      success: true,
      ...result,
      remainingAttempts: req.rateLimit?.remaining,
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Server error";
    console.error(`[auth] ${message}`, err);
    return res.status(status).json({
      success: false,
      message,
      remainingAttempts: req.rateLimit?.remaining,
    });
  }
};

// POST /api/auth/super-admin/register
export const registerSuperAdmin = handle(registerSuperAdminService);

// POST /api/auth/super-admin/login
export const loginSuperAdmin = handle(loginSuperAdminService);

// POST /api/auth/staff/login
export const loginStaff = handle(loginStaffService);

// POST /api/auth/student/login
export const loginStudent = handle(loginStudentService);

// POST /api/auth/parent/login
export const loginParent = handle(loginParentService);

// POST /api/auth/finance/login
export const loginFinance = handle(loginFinanceService);

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    // Accept both `phone` and legacy `identifier` field
    const phone = req.body.phone || req.body.identifier;
    if (!phone) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    // "sms" (default) | "email"
    const method = req.body.method === "email" ? "email" : "sms";

    const result = await sendOtp(phone, method);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// POST /api/auth/verify-otp
export const verifyOtp = async (req, res) => {
  try {
    const identifier = req.body.phone || req.body.identifier;
    const { otp } = req.body;
    const result = await verifyOtpService(identifier, otp);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const identifier = req.body.phone || req.body.identifier;
    const { newPassword } = req.body;
    const result = await resetPasswordService(identifier, newPassword);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /api/auth/login-with-otp
export const loginWithOtp = async (req, res) => {
  try {
    const result = await loginWithOtpService(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/verify-login-otp
export const verifyLoginOtp = async (req, res) => {
  try {
    // Support both `identifier` (student/parent) and `email` (staff/superAdmin)
    const result = await verifyLoginOtpService(req.body);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
};