import express from "express";
import {
  getAwards,
  createAward,
  updateAward,
  deleteAward,
} from "../staffControlls/Adminawardcontroller.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

// GET    /api/admin/awards          → list all award types for this school
router.get("/", getAwards);

// POST   /api/admin/awards          → create new award type
router.post("/", createAward);

// PUT    /api/admin/awards/:id      → update award type
router.put("/:id", updateAward);

// DELETE /api/admin/awards/:id      → delete award type
router.delete("/:id", deleteAward);

export default router;