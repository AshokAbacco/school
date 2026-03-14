import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import studentFinanceRoutes from "./Financepages/Routes/studentFinance.routes.js";
import expenseRoutes from "./Financepages/Routes/expenseRoutes.js";

dotenv.config();

const finance = express.Router();

// Middlewares
finance.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  })
);

finance.use(express.json());

// ✅ USE finance NOT app
finance.use("/", studentFinanceRoutes);
finance.use("/", expenseRoutes);
export default finance;