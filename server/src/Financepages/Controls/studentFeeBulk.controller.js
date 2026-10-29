// server/src/Financepages/Controls/studentFeeBulk.controller.js
import {
  buildFeeTemplate,
  processFeeUpload,
  BulkFeeError,
} from "../Services/studentFeeBulk.service.js";

const fail = (res, err, tag) => {
  if (err instanceof BulkFeeError)
    return res.status(err.status).json({ message: err.message });
  console.error(`[bulkFee:${tag}]`, err);
  return res
    .status(500)
    .json({ message: "Something went wrong. No records were saved. Please try again." });
};

// GET /api/finance/bulkFee/template?classSectionId=...
export const downloadFeeTemplate = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ message: "SchoolId missing in user" });

    const { buffer, fileName } = await buildFeeTemplate({
      schoolId,
      classSectionId: req.query.classSectionId,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    res.send(Buffer.from(buffer));
  } catch (err) {
    fail(res, err, "template");
  }
};

// POST /api/finance/bulkFee/upload   (multipart: file, classSectionId, defaultFeeDate, dryRun)
export const uploadFeeExcel = async (req, res) => {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ message: "SchoolId missing in user" });

    const result = await processFeeUpload({
      schoolId,
      userId: req.user?.id,
      classSectionId: req.body?.classSectionId,
      defaultFeeDate: req.body?.defaultFeeDate,
      dryRun: String(req.body?.dryRun) === "true",
      fileBuffer: req.file?.buffer,
    });

    const s = result.summary;
    result.message = result.dryRun
      ? `${s.ready} record(s) ready to save, ${s.duplicates} duplicate(s), ${s.invalid} invalid.`
      : s.added > 0
        ? `${s.added} fee record(s) added successfully.`
        : "No new fee records were added.";

    res.json(result);
  } catch (err) {
    fail(res, err, "upload");
  }
};