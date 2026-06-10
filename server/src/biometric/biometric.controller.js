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

    for (const item of records) {
      await prisma.biometricLog.create({
        data: {
          employeeCode:
            item.EmployeeCode || null,

          enrollmentId:
            item.EnrollmentId ||
            item.EnrollmentID ||
            null,

          deviceId:
            item.DevicesId?.toString() ||
            null,

          deviceName:
            item.DeviceName || null,

          serialNo:
            item.SerialNo || null,

          punchMode:
            item.PunchMode || null,

          punchDateTime:
            item.PunchDateAndTime
              ? new Date(item.PunchDateAndTime)
              : null,

          rawData: item,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Biometric data stored",
      received: records.length,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};