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

export const sendAttendanceSMS = async ({ mobile, studentName, schoolName, status = "ABSENT" }) => {
  const cleanPhone = formatPhone(mobile);
  if (!cleanPhone) return;

  // ✅ One message format for BOTH Present and Absent
  const message = `Dear Parent, attendance status of ${studentName} is ${status === "ABSENT" ? "Absent" : "Present"} today at ${schoolName}.`;

  await sendSMS({
    mobile: cleanPhone,
    message,
    templateId: process.env.SMS_TEMPLATE_ATTENDANCE, // ✅ Use same template for both
  });
};