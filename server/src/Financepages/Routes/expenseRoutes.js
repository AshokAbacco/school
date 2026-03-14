import express from "express";
import { getExpenses, addExpense } from "../Controls/expenseController.js";

const router = express.Router();

router.get("/list", getExpenses);

router.post("/add", addExpense);

export default router;