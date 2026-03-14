import express from "express";
import {
  getAllGroupDStaff,
  createGroupDStaff,
  updateGroupDStaff,
  deleteGroupDStaff,
  paySalaryGroupD
} from "../Controls/groupDController.js";

const router = express.Router();

router.get("/list/all", getAllGroupDStaff);
router.post("/create", createGroupDStaff);
router.put("/update/:id", updateGroupDStaff);
router.delete("/delete/:id", deleteGroupDStaff);
router.patch("/pay/:id", paySalaryGroupD);

export default router;