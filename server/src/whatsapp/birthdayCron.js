import cron from "node-cron";
import axios from "axios";
import { prisma } from "../config/db.js";

cron.schedule("0 9 * * *", async () => {
  console.log("Birthday cron started");

  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const students = await prisma.studentPersonalInfo.findMany({
      where: {
        dateOfBirth: { not: null }
      }
    });

    for (const item of students) {
      const dob = new Date(item.dateOfBirth);

      if (
        dob.getMonth() + 1 === month &&
        dob.getDate() === day
      ) {
        const phone = item.phone;
        if (!phone) continue;

        const name =
          `${item.firstName || ""} ${item.lastName || ""}`.trim();

        const schoolName = "Sri Vignan School";

        await axios.post(
          `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: phone.replace(/\D/g, ""),
            type: "template",
            template: {
              name: "birthday",
              language: { code: "en" },
              components: [
                {
                  type: "body",
                  parameters: [
                    { type: "text", text: name },
                    { type: "text", text: schoolName }
                  ]
                }
              ]
            }
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
              "Content-Type": "application/json"
            }
          }
        );

        console.log(`Sent to ${name}`);
      }
    }
  } catch (error) {
    console.log(error.response?.data || error.message);
  }
});