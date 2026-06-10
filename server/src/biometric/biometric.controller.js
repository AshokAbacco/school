import { prisma } from "../config/db.js";

export const receivePunch = async (req, res) => {
  try {
    console.log("Biometric Data:", req.body);

    const data = Array.isArray(req.body)
      ? req.body
      : [req.body];

    for (const item of data) {
      await prisma.tran_MachineRawPunch.create({
        data: {
          CardNo: item.EmployeeCode || item.CardNo || null,

          PunchDateTime: item.PunchDateAndTime
            ? new Date(item.PunchDateAndTime)
            : null,

          P_Day: "P",

          ISManual: "N",

          PayCode: item.PayCode || null,

          MachineNo: item.DevicesId
            ? String(item.DevicesId)
            : null,

          DateTime: new Date(),
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Punch stored successfully",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};