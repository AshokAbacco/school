// server/src/finance.js
import express from "express";
// import cors from "cors";
import dotenv from "dotenv";
import studentFinanceRoutes from "./Financepages/Routes/studentFinance.routes.js";
import expenseRoutes from "./Financepages/Routes/expenseRoutes.js";
import groupBRoutes from "./Financepages/Routes/groupBRoutes.js";
import groupCRoutes from "./Financepages/Routes/groupCRoutes.js";
import groupDRoutes from "./Financepages/Routes/groupDRoutes.js";
import teacherRoutes from "./Financepages/Routes/teacherRoutes.js";
import logoRoutes from "./utils/logoRoutes.js";
import { requireAuth } from "./middlewares/auth.middleware.js"; 

dotenv.config();

const finance = express();

// Middlewares
// finance.use(
//   cors({
//     origin: process.env.CLIENT_ORIGIN,
//     credentials: true,
//   })
// );

finance.use(express.json());

// Routes
finance.use("/api/finance", expenseRoutes);

finance.use("/api/finance", studentFinanceRoutes);

finance.use("/api/groupb", groupBRoutes);
finance.use("/api/groupc", groupCRoutes);

finance.use("/api/groupd/salary", groupDRoutes);

finance.use("/api/teachers", teacherRoutes);
finance.use("/api", logoRoutes(requireAuth));
export default finance;