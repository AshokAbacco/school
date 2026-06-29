// server/src/whatsapp/birthdayCron.js

import cron from "node-cron";
import axios from "axios";
import { prisma } from "../config/db.js";

// Runs every day at 5:59 AM IST
cron.schedule(
  "59 5 * * *",
  async () => {
    console.log("🎂 Birthday cron started (5:59 AM IST)");

    try {
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();

      const students = await prisma.studentPersonalInfo.findMany({
        where: {
          dateOfBirth: {
            not: null,
          },
        },
        include: {
          student: {
            include: {
              school: true,
            },
          },
        },
      });

      for (const item of students) {
        const dob = new Date(item.dateOfBirth);

        if (
          dob.getMonth() + 1 === month &&
          dob.getDate() === day
        ) {
          const phone = item.phone;
          if (!phone) continue;

          const name = `${item.firstName || ""} ${
            item.lastName || ""
          }`.trim();

          const schoolName =
            item.student?.school?.name || "Your School";

          let cleanPhone = phone.replace(/\D/g, "");

          if (cleanPhone.length === 10) {
            cleanPhone = "91" + cleanPhone;
          }

          try {
            await axios.post(
              `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
              {
                messaging_product: "whatsapp",
                to: cleanPhone,
                type: "template",
                template: {
                  name: "birthday_message",
                  language: {
                    code: "en_US",
                  },
                  components: [
                    {
                      type: "body",
                      parameters: [
                        {
                          type: "text",
                          text: name,
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

            console.log(`✅ Birthday wish sent to ${name} (${cleanPhone})`);
          } catch (err) {
            console.error(
              `❌ Failed to send birthday wish to ${name}:`,
              err.response?.data || err.message
            );
          }
        }
      }

      console.log("🎉 Birthday cron completed.");
    } catch (error) {
      console.error(
        "❌ Birthday cron error:",
        error.response?.data || error.message
      );
    }
  },
  {
    timezone: "Asia/Kolkata",
  }
);