// server/src/Financepages/Routes/studentFeeBulk.routes.js
// Bulk Excel fee upload — mounted under /api/finance (see src/finance.js)
import express from "express";
import multer from "multer";
import authMiddleware from "../../middlewares/authMiddleware.js";
import {
  downloadFeeTemplate,
  uploadFeeExcel,
} from "../Controls/studentFeeBulk.controller.js";

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (/\.xlsx$/i.test(file.originalname)) return cb(null, true);
    cb(new Error("Only .xlsx Excel files are allowed."));
  },
});

// Wrap multer so its errors come back as clean JSON messages.
const singleExcel = (req, res, next) =>
  upload.single("file")(req, res, (err) => {
    if (!err) return next();
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File is too large. Maximum size is 5 MB."
        : err.message || "File upload failed.";
    return res.status(400).json({ message });
  });

router.get("/bulkFee/template", authMiddleware, downloadFeeTemplate);
router.post("/bulkFee/upload", authMiddleware, singleExcel, uploadFeeExcel);

export default router;