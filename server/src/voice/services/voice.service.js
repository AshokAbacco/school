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

  const text = `Hello Parent.

This is a reminder call from ${schoolName}.

We would like to inform you that the school fee payment for student ${studentName} is currently pending.

The outstanding fee amount is Rupees ${pendingAmount}.

Kindly visit the school and complete the payment at the earliest.

Thank you.`;

  const requestBody = {
    from: process.env.VOICE_SENDER,
    to: phone,
    text,
    language: "en",
    voice: {
      name: "Joanna",
      gender: "female",
    },
  };

  const requestId = `VOICE-${Date.now()}`;

  console.log("\n========================================");
  console.log(`[${requestId}] VOICE REQUEST STARTED`);
  console.log("========================================");
  console.log("Phone:", phone);
  console.log("Student:", studentName);
  console.log("School:", schoolName);
  console.log("Amount:", pendingAmount);
  console.log("Sender:", process.env.VOICE_SENDER);
  console.log("API URL:", process.env.VOICE_API_URL);

  try {
    const response = await axios.post(
      process.env.VOICE_API_URL,
      requestBody,
      {
        headers: {
          Authorization: `Basic ${authString}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 30000,
      }
    );

    console.log("\n========================================");
    console.log(`[${requestId}] VOICE RESPONSE`);
    console.log("========================================");
    console.log("Status:", response.status);
    console.log("Provider Response:", response.data);

    if (response.status !== 200) {
      throw new Error(
        response.data?.requestError?.serviceException?.text ||
        "Voice API request failed"
      );
    }

    return response.data;
  } catch (error) {
    console.log("\n========================================");
    console.log(`[${requestId}] VOICE ERROR`);
    console.log("========================================");

    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Response:", error.response.data);

      throw new Error(
        error.response.data?.requestError?.serviceException?.text ||
        error.response.data?.message ||
        "Voice API request failed"
      );
    }

    console.log("Message:", error.message);
    throw error;
  }
};