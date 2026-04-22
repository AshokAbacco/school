// server/src/sharedRoutes/holidayRoute.js
// ─────────────────────────────────────────────────────────────────────────────
// READ-ONLY holiday route shared by: staff/teacher, finance, student, parent
// Mounted as:
//   staff.js    →  staff.use("/api/holidays",   holidayRoute);
//   finance.js  →  finance.use("/api/holidays", holidayRoute);
//   student.js  →  student.use("/holidays",     holidayRoute);
//   parent.js   →  parent.use("/holidays",      holidayRoute);
// ─────────────────────────────────────────────────────────────────────────────
import express from "express";
import { getHolidays, checkHoliday } from "../staffControlls/adminHolidayController.js";

// Each server uses its own auth middleware — accept it as a factory argument
// so this file stays server-agnostic.
//
// Usage:
//   import makeHolidayRouter from "./sharedRoutes/holidayRoute.js";
//   staff.use("/api/holidays", makeHolidayRouter(authMiddleware));

export default function makeHolidayRouter(authMiddleware) {
  const router = express.Router();

  // GET /check?date=YYYY-MM-DD  — is a specific date a holiday?
  router.get("/check", authMiddleware, checkHoliday);

  // GET /  — full holiday list (supports ?type=GOVERNMENT|SCHOOL &academicYearId=)
  router.get("/", authMiddleware, getHolidays);

  return router;
}