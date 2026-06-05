import axios from "axios";

export const sendFeeVoiceReminder = async ({
  phone,
  pendingAmount,
  studentName,
  schoolName,
}) => {

  const authString = Buffer.from(
    `${process.env.VOICE_USERNAME}:${process.env.VOICE_PASSWORD}`
  ).toString("base64");

  const text = `
    Hello Parent.

    This is a reminder call from ${schoolName}.

    We would like to inform you that the school fee payment for student ${studentName} is currently pending.

    The outstanding fee amount is Rupees ${pendingAmount}.

    Kindly visit the school and complete the payment at the earliest.

    Thank you.
    `;

  const response = await axios.post(
    process.env.VOICE_API_URL,
    {
      from: process.env.VOICE_SENDER,
      to: phone,
      text,
      language: "en",
    },
    {
        headers: {
        Authorization: `App ${process.env.VOICE_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        }
    }
  );

  return response.data;
};