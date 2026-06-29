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

// Runs every day at 5:59 AM IST
cron.schedule(
  "59 5 * * *",
  async () => {
    console.log("💍 Anniversary cron started (5:59 AM IST)");

    try {
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();

      const parents = await prisma.parent.findMany({
        where: {
          anniversaryDate: {
            not: null,
          },
        },
        include: {
          school: true,
        },
      });

      for (const parent of parents) {
        const ann = new Date(parent.anniversaryDate);

        if (
          ann.getMonth() + 1 === month &&
          ann.getDate() === day
        ) {
          const cleanPhone = formatPhone(parent.phone);

          if (!cleanPhone) continue;

          try {
            await axios.post(
              `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
              {
                messaging_product: "whatsapp",
                to: cleanPhone,
                type: "template",
                template: {
                  name: "anniversary_message",
                  language: {
                    code: "en",
                  },
                  components: [
                    {
                      type: "body",
                      parameters: [
                        {
                          type: "text",
                          text: parent.name || "Parent",
                        },
                        {
                          type: "text",
                          text:
                            parent.school?.name ||
                            "Your School",
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

            console.log(
              `✅ Anniversary wish sent to ${parent.name} (${cleanPhone})`
            );
          } catch (err) {
            console.error(
              `❌ Failed to send anniversary wish to ${parent.name}:`,
              err.response?.data || err.message
            );
          }
        }
      }

      console.log("🎉 Anniversary cron completed.");
    } catch (error) {
      console.error(
        "❌ Anniversary cron error:",
        error.response?.data || error.message
      );
    }
  },
  {
    timezone: "Asia/Kolkata",
  }
);