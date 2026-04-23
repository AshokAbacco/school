import express from "express";
import { getParentFees } from "../controllers/fees.controller.js";
import authMiddleware from "../../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getParentFees);

export default router;