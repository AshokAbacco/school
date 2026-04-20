import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  createStaff,
  getStaff,
  getStaffById,   // ← add this
  updateStaff,
  deleteStaff,
} from "../staffControlls/staffController.js";

const router = express.Router();

router.get("/",     authMiddleware, getStaff);
router.get("/:id",  authMiddleware, getStaffById);  // ← add this
router.post("/",    authMiddleware, createStaff);
router.patch("/:id", authMiddleware, updateStaff);
router.delete("/:id", authMiddleware, deleteStaff);

export default router;