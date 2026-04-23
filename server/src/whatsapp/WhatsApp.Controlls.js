import axios from "axios";
import { prisma } from "../config/db.js";

// Test message
export const sendTestMessage = async (req, res) => {
  try {
    const { phone } = req.body;

    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phone.replace(/\D/g, ""),
        type: "template",
        template: {
          name: "hello_world",
          language: { code: "en"}
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    res.json({ success: true, data: response.data });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
};

// Manual Birthday
export const sendBirthdayWish = async (req, res) => {
  try {
    const { phone, name } = req.body;

    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: phone.replace(/\D/g, ""),
        type: "template",
        template: {
          name: "birthday",
          language: { code: "en"},
          components: [
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: name
              },
              {
                type: "text",
                text: "ABC School"
              }
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

    res.json({ success: true, data: response.data });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
};

// Send today's birthdays manually
// Send today's birthdays manually
export const sendTodayBirthdays = async (req, res) => {
  try {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const students = await prisma.studentPersonalInfo.findMany({
      where: {
        dateOfBirth: { not: null }
      },
      include: {
        student: {
          include: {
            school: true
          }
        }
      }
    });

    let total = 0;

    for (const item of students) {
      const dob = new Date(item.dateOfBirth);

      if (
        dob.getMonth() + 1 === month &&
        dob.getDate() === day
      ) {
        const phone =
          item.phone?.replace(/\D/g, "");

        if (!phone) continue;

        const name =
          `${item.firstName || ""} ${item.lastName || ""}`.trim();

        // fetch school name from related student -> school
        const schoolName =
          item.student?.school?.name ||
          item.student?.school?.schoolName ||
          "ABC School";

        await axios.post(
          `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: phone,
            type: "template",
            template: {
              name: "birthday",
              language: { code: "en" },
              components: [
                {
                  type: "body",
                  parameters: [
                    {
                      type: "text",
                      text: name
                    },
                    {
                      type: "text",
                      text: schoolName
                    }
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

        total++;
      }
    }

    res.json({
      success: true,
      message: `${total} birthday wishes sent`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
};