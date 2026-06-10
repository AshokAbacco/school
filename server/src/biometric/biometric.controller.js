// src/biometric/biometric.controller.js

import { prisma } from "../config/db.js";

export const receivePunch = async (req, res) => {
  try {
    console.log("========== BIOMETRIC REQUEST ==========");
    console.log("Headers:", req.headers);
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("======================================");

    if (!req.body) {
      return res.status(400).json({
        success: false,
        message: "Request body is empty",
      });
    }

    const punches = Array.isArray(req.body)
      ? req.body
      : [req.body];

    const records = [];

    for (const item of punches) {
      try {
        const record = await prisma.biometricPunch.create({
          data: {
            deviceId: item.DevicesId
              ? String(item.DevicesId)
              : null,

            employeeCode: item.EmployeeCode
              ? String(item.EmployeeCode)
              : null,

            serialNo: item.SerialNo
              ? String(item.SerialNo)
              : null,

            punchDateTime: item.PunchDateAndTime
              ? new Date(item.PunchDateAndTime)
              : null,

            punchDate: item.PunchDate
              ? new Date(item.PunchDate)
              : null,

            systemDate: item.SystemDate
              ? new Date(item.SystemDate)
              : null,

            lastPunchDateTime: item.LastPunchDateAndTime
              ? new Date(item.LastPunchDateAndTime)
              : null,

            deviceName: item.DeviceName || null,

            rawData: item,
          },
        });

        records.push(record);
      } catch (recordError) {
        console.error("Failed Record:", item);
        console.error(recordError);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Punch data received successfully",
      totalReceived: punches.length,
      totalSaved: records.length,
    });
  } catch (error) {
    console.error("Biometric Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};