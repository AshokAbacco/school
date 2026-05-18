import axios from "axios";

const formatPhone = (phone) => {
let clean = phone?.replace(/\D/g, "");

if (!clean) return null;

if (clean.length === 10) {
clean = "91" + clean;
}

return clean;
};

export const sendFeeReceiptWhatsApp = async ({
phone,
studentName,
schoolName,
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
      name: "fee_receipt",
      language: {
        code: "en_US",
      },
      components: [
        {
          type: "header",
          parameters: [
            {
              type: "document",
              document: {
                link: pdfUrl,
                filename: `${studentName}_Fee_Receipt.pdf`,
              },
            },
          ],
        },
        {
          type: "body",
          parameters: [
            {
              type: "text",
              text: studentName,
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

console.log("✅ Fee receipt sent to", cleanPhone);

console.log("META RESPONSE =>", response.data);


} catch (error) {

console.log(
  "❌ WhatsApp Error:",
  error.response?.data || error.message
);


}
};
