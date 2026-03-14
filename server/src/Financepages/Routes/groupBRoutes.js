import { Router } from "express";

import {
  getAllGroupBStaff,
  createGroupBStaff,
  updateGroupBStaff,
  deleteGroupBStaff,
  paySalaryGroupB
} from "../Controls/groupBController.js";

const router = Router();

router.get("/list/all", getAllGroupBStaff);
router.post("/create", createGroupBStaff);
router.put("/update/:id", updateGroupBStaff);
router.delete("/delete/:id", deleteGroupBStaff);
router.patch("/pay/:id", paySalaryGroupB);

export default router;