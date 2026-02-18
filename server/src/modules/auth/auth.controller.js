// server/src/modules/auth/auth.controller.js
import {
  registerSuperAdminService,
  loginSuperAdminService,
  loginStaffService,
  loginStudentService,
  loginParentService,
} from "./auth.service.js";

const handle = (serviceFn) => async (req, res) => {
  try {
    const result = await serviceFn(req.body);
    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Server error";
    console.error(`[auth] ${message}`, err);
    return res.status(status).json({ success: false, message });
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
