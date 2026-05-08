import axios from "axios";
import { prisma } from "../config/db.js";

/**
 * Utility: Clean phone number and ensure country code
 */
const formatPhone = (phone) => {
  let clean = phone?.replace(/\D/g, "");

  if (!clean) return null;

  // Add India code if missing
  if (clean.length === 10) {
    clean = "91" + clean;
  }

  return clean;
};

// ================= TEST MESSAGE =================
export const sendTestMessage = async (req, res) => {
  try {
    const { phone } = req.body;

    const cleanPhone = formatPhone(phone);
    if (!cleanPhone) {
      return res.status(400).json({ success: false, error: "Invalid phone" });
    }

    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
          name: "hello_world",
          language: { code: "en_US" }
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

// ================= MANUAL BIRTHDAY =================
export const sendBirthdayWish = async (req, res) => {
  try {
    const { phone, name, schoolName } = req.body;

    const cleanPhone = formatPhone(phone);
    if (!cleanPhone) {
      return res.status(400).json({ success: false, error: "Invalid phone" });
    }

    const response = await axios.post(
      `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: cleanPhone,
        type: "template",
        template: {
          name: "birthday_message",
          language: { code: "en_US" },
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

    res.json({ success: true, data: response.data });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message
    });
  }
};

// ================= TODAY BIRTHDAYS =================
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
        const cleanPhone = formatPhone(item.phone);
        if (!cleanPhone) continue;

        const name = `${item.firstName || ""} ${item.lastName || ""}`.trim();
        const schoolName = item.student?.school?.name || "Your School";

        await axios.post(
          `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            messaging_product: "whatsapp",
            to: cleanPhone,
            type: "template",
            template: {
              name: "birthday_message",
              language: { code: "en_US" },
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

        console.log(`✅ Birthday wish sent to ${name}`);
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