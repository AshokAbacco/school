import axios from "axios";

const formatPhone = (phone) => {
  let clean = phone?.replace(/\D/g, "");

  if (!clean) return null;

  if (clean.length === 10) {
    clean = "91" + clean;
  }

  return clean;
};

export const sendSalarySlipWhatsApp = async ({
  phone,
  staffName,
  schoolName,
  monthYear,
  pdfUrl,
}) => {
  try {

    const cleanPhone = formatPhone(phone);

    if (!cleanPhone) {
      console.log("❌ Invalid phone");
      return;
    }

    console.log("PDF URL =>", pdfUrl);

    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",

        to: cleanPhone,

        type: "template",

        template: {
          name: "salary_slip",

          language: {
            code: "en",
          },

          components: [
            {
              type: "header",

              parameters: [
                {
                  type: "document",

                  document: {
                    link: pdfUrl,
                    filename: `${staffName}_Salary_Slip.pdf`,
                  },
                },
              ],
            },

            {
              type: "body",

              parameters: [
                {
                  type: "text",
                  text: staffName,
                },
                {
                  type: "text",
                  text: monthYear,
                },
                {
                  type: "text",
                  text: schoolName,
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

    console.log("✅ Salary slip sent to", cleanPhone);

    console.log("META RESPONSE =>", response.data);

  } catch (error) {

    console.log(
      "❌ WhatsApp Error:",
      error.response?.data || error.message
    );

  }
};