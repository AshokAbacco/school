import express from "express";
import { getExpenses, addExpense, deleteExpense, updateExpense, updateCategory } from "../Controls/expenseController.js";
import authMiddleware from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/list", authMiddleware, getExpenses);

router.post("/add", authMiddleware, addExpense);
router.delete("/delete/:id", authMiddleware, deleteExpense); // ✅
router.put("/update/:id", authMiddleware, updateExpense);   // ✅
router.put("/category/update/:id", authMiddleware, updateCategory);
export default router;
