// server/src/staffRoutes/timetableEntryRoutes.js
import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  getTimetableEntries,
  saveTimetableEntries,
  deleteTimetableEntry,
} from "../staffControlls/timetableEntryController.js";

const router = express.Router({ mergeParams: true });
router.get("/", authMiddleware, getTimetableEntries);
router.post("/", authMiddleware, saveTimetableEntries);
router.delete("/entry/:entryId", authMiddleware, deleteTimetableEntry);
export default router;
