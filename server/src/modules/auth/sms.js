import axios from "axios";

const SMS_URL = "https://www.smsgatewayhub.com/api/mt/SendSMS";

const normalizePhone = (phone) => {
  if (!phone) return null;

  let mobile = String(phone).replace(/\D/g, "").trim();

  if (!mobile.startsWith("91")) {
    mobile = `91${mobile}`;
  }

  return mobile;
};

export const sendSmsOtp = async ({ phone, otp }) => {
  try {
    const mobile = normalizePhone(phone);

    if (!mobile) {
      throw new Error("Phone number is required");
    }

    const message = `${otp} is your OTP for Abacco Technology CRM login verification. OTP valid for 10 minutes. Do not share this OTP with anyone.`;

    const params = {
      APIKey: process.env.SMS_API_KEY,

      senderid: process.env.SMS_SENDER_ID,

      channel: 2,
      DCS: 0,
      flashsms: 0,

      number: mobile,

      text: message,

      route: process.env.SMS_ROUTE,

      EntityId: process.env.SMS_ENTITY_ID,

      dlttemplateid: process.env.SMS_TEMPLATE_ID,
    };

    console.log("[SMS] Sending OTP to:", mobile);

    const { data } = await axios.get(SMS_URL, {
      params,
      timeout: 15000,
    });

    console.log("[SMS] Response:", JSON.stringify(data));

    if (!data || data.ErrorCode !== "000") {
      throw new Error(data?.ErrorMessage || "SMS sending failed");
    }

    return {
      success: true,
      response: data,
    };
  } catch (error) {
    console.error("[SMS ERROR]", error?.response?.data || error.message);

    throw {
      status: 500,
      message:
        error?.response?.data?.ErrorMessage ||
        error.message ||
        "Failed to send SMS OTP",
    };
  }
};

export { normalizePhone };
