// src/SMS/sms.helper.js
import { sendSMS } from "./sms.service.js";

const formatPhone = (phone) => {

  let clean = phone?.replace(/\D/g, "");

  if (!clean) return null;

  if (clean.length === 10) {
    clean = "91" + clean;
  }

  return clean;
};

export const sendAttendanceSMS = async ({
  mobile,
  studentName,
  schoolName,
}) => {
  try {
    const cleanPhone = formatPhone(mobile);

    if (!cleanPhone) return;

    const message =
      `Dear Parent, ${studentName} is marked Absent today at ${schoolName}.`;

    await sendSMS({
      mobile: cleanPhone,
      message,
      templateId:
        process.env.SMS_TEMPLATE_ABSENT,
    });

  } catch (error) {
    console.error(
      "❌ Attendance SMS Error:",
      error.message
    );
  }
};