import axios from "axios";

export const sendSMS = async ({
  mobile,
  message,
  templateId,
}) => {
  try {

    console.log("📤 Sending SMS...");
    console.log("📱 Mobile:", mobile);
    console.log("📝 Message:", message);
    console.log("🆔 Template ID:", templateId);

    const response = await axios.get(
      process.env.SMS_API_URL,
      {
        params: {
          APIKey: process.env.SMS_API_KEY,
          senderid: process.env.SMS_SENDER_ID,

          // channel: 1,
          channel: process.env.SMS_CHANNEL,

          DCS: 0,
          flashsms: 0,

          number: mobile,

          text: message,

          route: process.env.SMS_ROUTE,

          EntityId: process.env.SMS_ENTITY_ID,

          dlttemplateid: templateId,
        },
      }
    );

    console.log(`✅ SMS Sent To ${mobile}`);
    console.log("📨 SMS Response:", response.data);

    return response.data;

  } catch (error) {

    console.error(
      "❌ SMS Error:",
      error.response?.data || error.message
    );

    return null;
  }
};