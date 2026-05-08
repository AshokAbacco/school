// server/src/finance.js  (UPDATED — added shared read-only holiday route)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import studentFinanceRoutes from "./Financepages/Routes/studentFinance.routes.js";
import expenseRoutes from "./Financepages/Routes/expenseRoutes.js";
import groupBRoutes from "./Financepages/Routes/groupBRoutes.js";
import groupCRoutes from "./Financepages/Routes/groupCRoutes.js";
import groupDRoutes from "./Financepages/Routes/groupDRoutes.js";
import teacherRoutes from "./Financepages/Routes/teacherRoutes.js";
import logoRoutes from "./utils/logoRoutes.js";
import { requireAuth } from "./middlewares/auth.middleware.js";

// ── NEW: shared read-only holiday route ───────────────────────────────────────
import makeHolidayRouter from "./sharedRoutes/holidayRoute.js";
// Finance server uses requireAuth (from auth.middleware.js) — pass it directly
// ─────────────────────────────────────────────────────────────────────────────

dotenv.config();

const finance = express();

// finance.use(
//   cors({
//     origin: process.env.CLIENT_ORIGIN,
//     credentials: true,
//   })
// );
finance.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.CLIENT_ORIGIN.split(",");

      // allow requests without origin (mobile apps, Postman)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS blocked: " + origin));
    },
    credentials: true,
  }),
);

// finance.use(express.json());
finance.use(express.json({
  limit: "50mb",
}));

finance.use(express.urlencoded({
  extended: true,
  limit: "50mb",
}));

// existing routes
finance.use("/api/finance", expenseRoutes);
finance.use("/api/finance", studentFinanceRoutes);
finance.use("/api/groupb", groupBRoutes);
finance.use("/api/groupc", groupCRoutes);
finance.use("/api/groupd/salary", groupDRoutes);
finance.use("/api/teachers", teacherRoutes);

// ── Finance read-only holidays  (GET / and GET /check) ───────────────────────
finance.use("/api/holidays", makeHolidayRouter(requireAuth));
// ─────────────────────────────────────────────────────────────────────────────

finance.use("/api", logoRoutes(requireAuth));

export default finance;