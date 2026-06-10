// src/biometric/biometric.controller.js

import { prisma } from "../config/db.js";

export const receivePunch = async (req, res) => {
  try {
    console.log("=================================");
    console.log("HEADERS:", req.headers);
    console.log("BODY:", JSON.stringify(req.body, null, 2));
    console.log("=================================");

    const records = Array.isArray(req.body)
      ? req.body
      : [req.body];

    for (const item of records) {
      await prisma.tran_MachineRawPunch.create({
        data: {
          CardNo:
            item.EmployeeCode ||
            item.CardNo ||
            item.EnrollmentID ||
            null,

          PunchDateTime:
            item.PunchDateAndTime
              ? new Date(item.PunchDateAndTime)
              : new Date(),

          P_Day: "P",

          ISManual: "N",

          PayCode: null,

          MachineNo:
            item.DevicesId?.toString() ||
            item.DeviceId?.toString() ||
            item.SerialNo?.toString() ||
            null,

          DateTime: new Date(),
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Punch stored successfully",
      received: records.length,
    });
  } catch (error) {
    console.error("BIOMETRIC ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};