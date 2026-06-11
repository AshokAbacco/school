import { prisma } from "../config/db.js";

export const receivePunch = async (req, res) => {
  try {
    console.log(
      "BODY:",
      JSON.stringify(req.body, null, 2)
    );

    const records = Array.isArray(req.body)
      ? req.body
      : [req.body];

    let inserted = 0;
    let skipped = 0;

    for (const item of records) {
      const employeeCode =
        item.EmployeeCode || null;

      const enrollmentId =
        item.EnrollmentId ||
        item.EnrollmentID ||
        null;

      const deviceId =
        item.DevicesId?.toString() ||
        null;

      const deviceName =
        item.DeviceName || null;

      const serialNo =
        item.SerialNo || null;

      const punchMode =
        item.PunchMode || null;

      const punchDateTime =
        item.PunchDateAndTime
          ? new Date(item.PunchDateAndTime)
          : null;

      const existing =
        await prisma.biometricLog.findFirst({
          where: {
            employeeCode,
            enrollmentId,
            deviceId,
            deviceName,
            serialNo,
            punchMode,
            punchDateTime,
          },
        });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.biometricLog.create({
        data: {
          employeeCode,
          enrollmentId,
          deviceId,
          deviceName,
          serialNo,
          punchMode,
          punchDateTime,
          rawData: item,
        },
      });

      inserted++;
    }

    return res.status(200).json({
      success: true,
      message: "Biometric data processed",
      inserted,
      skipped,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};