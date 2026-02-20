// server/src/superAdmin/routes/users.Routes.js
import express from "express";
import authMiddleware from "../../middlewares/authMiddleware.js";
import { getAllUsers } from "../controllers/users.controller.js";

const router = express.Router();

router.get("/all", authMiddleware, getAllUsers);

export default router;