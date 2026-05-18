import {
  listDeletedRecords,
  restoreSingleRecord,
  listSchoolBackups,
  restoreEntireSchool,
} from "./backup.service.js";
import cacheService from "../../utils/cacheService.js";

export async function getDeletedRecords(req, res) {

  try {

    const schoolId = req.user.schoolId;

    const data =
      await listDeletedRecords(schoolId);

    res.json({
      success: true,
      data,
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message,
    });

  }

}

export async function restoreRecord(req, res) {

  try {

    const { model, recordId } = req.params;

    const restored =
      await restoreSingleRecord({
        schoolId: req.user.schoolId,
        model,
        recordId,
      });

    // ✅ CLEAR CACHE AFTER RESTORE
    await cacheService.invalidateSchool(
      restored.schoolId
    );

    res.json({
      success: true,
      message: "Record restored",
    });

  } catch (err) {

    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });

  }

}

export async function getSchoolsBackups(req, res) {

  try {

    const data =
      await listSchoolBackups();

    res.json({
      success: true,
      data,
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message,
    });

  }

}

export async function restoreSchoolBackup(req, res) {

  try {

    const { schoolId } = req.params;

    await restoreEntireSchool(schoolId);
await cacheService.invalidateSchool(
  Number(schoolId)
);
    res.json({
      success: true,
      message: "School restored",
    });

  } catch (err) {

    res.status(500).json({
      success: false,
      message: err.message,
    });

  }

}
