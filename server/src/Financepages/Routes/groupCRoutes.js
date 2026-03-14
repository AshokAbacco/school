import express from "express";
import {
  getAllGroupCStaff,
  createGroupCStaff,
  updateGroupCStaff,
  deleteGroupCStaff,
  paySalaryGroupC
} from "../Controls/groupCController.js";

const router = express.Router();

router.get("/list/all", getAllGroupCStaff);
router.post("/create", createGroupCStaff);
router.put("/update/:id", updateGroupCStaff);
router.delete("/delete/:id", deleteGroupCStaff);
router.patch("/pay/:id", paySalaryGroupC);

export default router;