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
  return { success: false, error: "Invalid phone number" };
}

// WhatsApp Cloud API needs a PUBLICLY reachable https:// URL for the
// header document (it fetches the file itself). A missing scheme, an
// http:// link, or a localhost/private URL will fail silently on Meta's
// side unless we check it here.
if (!/^https:\/\//i.test(pdfUrl || "")) {
  console.log("❌ Invalid pdfUrl (must be a public https:// link):", pdfUrl);
  return { success: false, error: "pdfUrl must be a public https:// URL" };
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

return { success: true, data: response.data };

} catch (error) {

const metaError = error.response?.data?.error;

console.log(
  "❌ WhatsApp Error:",
  error.response?.data || error.message
);

// Common causes worth surfacing explicitly:
// - "fee_receipt" template not approved / doesn't match this component shape
// - phone number not on WhatsApp or not opted-in
// - pdfUrl not publicly downloadable by Meta's servers within a few seconds
return {
  success: false,
  error: metaError?.message || error.message,
  code: metaError?.code,
};

}
};