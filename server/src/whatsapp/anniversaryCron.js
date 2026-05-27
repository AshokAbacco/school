import cron from "node-cron";
import axios from "axios";
import { prisma } from "../config/db.js";

const formatPhone = (phone) => {

  let clean = phone?.replace(/\D/g, "");

  if (!clean) return null;

  if (clean.length === 10) {
    clean = "91" + clean;
  }

  return clean;
};

cron.schedule("30 3 * * *", async () => {

  console.log("Anniversary cron started");

  try {

    const today = new Date();

    const month = today.getMonth() + 1;

    const day = today.getDate();

    const parents = await prisma.parent.findMany({
      where: {
        anniversaryDate: {
          not: null
        }
      },
      include: {
        school: true
      }
    });

    for (const parent of parents) {

      const ann = new Date(parent.anniversaryDate);

      if (
        ann.getMonth() + 1 === month &&
        ann.getDate() === day
      ) {

        const cleanPhone =
          formatPhone(parent.phone);

        if (!cleanPhone) continue;

        await axios.post(
          `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: cleanPhone,
            type: "template",
            template: {
              name: "anniversary_message",
              language: {
                code: "en"
              },
              components: [
                {
                  type: "body",
                  parameters: [
                    {
                      type: "text",
                      text: parent.name || "Parent"
                    },
                    {
                      type: "text",
                      text:
                        parent.school?.name ||
                        "Your School"
                    }
                  ]
                }
              ]
            }
          },
          {
            headers: {
              Authorization:
                `Bearer ${process.env.WHATSAPP_TOKEN}`,
              "Content-Type": "application/json"
            }
          }
        );

        console.log(
          `✅ Anniversary wish sent to ${parent.name}`
        );
      }
    }

  } catch (error) {

    console.log(
      error.response?.data || error.message
    );

  }

});