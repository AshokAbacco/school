import axios from "axios";

const formatPhone = (phone) => {
  let clean = phone?.replace(/\D/g, "");

  if (!clean) return null;

  if (clean.length === 10) {
    clean = "91" + clean;
  }

  return clean;
};

const cleanText = (text) => {
  return (text || "")
    .replace(/\n/g, " ")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const sendFeePendingWhatsApp = async ({
  phone,
  pendingAmount,
  studentName,
  schoolName,
}) => {
  try {
    const cleanPhone = formatPhone(phone);

    if (!cleanPhone) {
      console.log("❌ Invalid phone");
      return;
    }

    await axios.post(
      `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
          name: "fee_pending_reminder",
          language: {
            code: "en_US",
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: cleanText(String(pendingAmount)),
                },
                {
                  type: "text",
                  text: cleanText(studentName),
                },
                {
                  type: "text",
                  text: cleanText(schoolName || "School"),
                },
              ],
            },
          ],
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`✅ Fee reminder sent to ${cleanPhone}`);
  } catch (error) {
    console.log(
      "❌ WhatsApp Error:",
      error.response?.data || error.message
    );
  }
};