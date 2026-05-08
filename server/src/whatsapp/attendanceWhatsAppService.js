import axios from "axios";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

/* ============================================================
   CLOUD FLARE R2
============================================================ */

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

/* ============================================================
   HELPERS
============================================================ */

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

/* ============================================================
   DAILY ATTENDANCE WHATSAPP
============================================================ */

export const sendAttendanceWhatsApp = async ({
  phone,
  studentName,
  status,
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
          name: "student_attendance",
          language: {
            code: "en_US",
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: cleanText(studentName),
                },
                {
                  type: "text",
                  text: cleanText(status),
                },
                {
                  type: "text",
                  text: cleanText(schoolName),
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
      `✅ Attendance WhatsApp sent to ${cleanPhone}`
    );
  } catch (err) {
    console.error(
      "❌ Attendance WhatsApp Error:",
      err.response?.data || err.message
    );
  }
};

/* ============================================================
   MONTHLY REPORT HTML
============================================================ */

const generateMonthlyHTML = ({
  studentName,
  className,
  rollNumber,
  academicYear,
  monthName,
  presentDays,
  absentDays,
  leaveDays,
  totalDays,
  attendancePercentage,
}) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <style>

      * {
        box-sizing: border-box;
        font-family: Arial, sans-serif;
      }

      body {
        margin: 0;
        padding: 20px;
        background: #f3f7ff;
      }

      .container {
        width: 1100px;
        background: white;
        border-radius: 24px;
        padding: 35px;
      }

      .title {
        text-align: center;
        font-size: 44px;
        font-weight: 800;
        color: #1e3a8a;
      }

      .month {
        text-align: center;
        margin-top: 10px;
        margin-bottom: 30px;
        font-size: 24px;
        font-weight: bold;
        color: #2563eb;
      }

      .top {
        display: flex;
        gap: 20px;
      }

      .card {
        flex: 1;
        border-radius: 20px;
        border: 2px solid #dbeafe;
        padding: 24px;
      }

      .card-title {
        font-size: 24px;
        font-weight: 800;
        margin-bottom: 20px;
        color: #1e3a8a;
      }

      .row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 14px;
        font-size: 20px;
      }

      .value {
        font-weight: bold;
        color: #111827;
      }

      .percent {
        text-align: center;
        font-size: 60px;
        font-weight: 800;
        color: #16a34a;
        margin-bottom: 20px;
      }

      .stats {
        margin-top: 30px;
        display: flex;
        gap: 16px;
      }

      .stat {
        flex: 1;
        background: #eff6ff;
        border-radius: 20px;
        padding: 24px;
        text-align: center;
      }

      .stat-value {
        font-size: 42px;
        font-weight: 800;
        color: #1e293b;
      }

      .stat-label {
        margin-top: 8px;
        font-size: 18px;
        color: #64748b;
        font-weight: 700;
      }

    </style>
  </head>

  <body>

    <div class="container">

      <div class="title">
        MONTHLY ATTENDANCE REPORT
      </div>

      <div class="month">
        ${monthName}
      </div>

      <div class="top">

        <div class="card">

          <div class="card-title">
            Student Details
          </div>

          <div class="row">
            <span>Student Name</span>
            <span class="value">${studentName}</span>
          </div>

          <div class="row">
            <span>Class</span>
            <span class="value">${className}</span>
          </div>

          <div class="row">
            <span>Roll Number</span>
            <span class="value">${rollNumber}</span>
          </div>

          <div class="row">
            <span>Academic Year</span>
            <span class="value">${academicYear}</span>
          </div>

        </div>

        <div class="card">

          <div class="card-title">
            Attendance Summary
          </div>

          <div class="percent">
            ${attendancePercentage}%
          </div>

          <div class="row">
            <span>Present Days</span>
            <span class="value">${presentDays}</span>
          </div>

          <div class="row">
            <span>Absent Days</span>
            <span class="value">${absentDays}</span>
          </div>

          <div class="row">
            <span>Leave Days</span>
            <span class="value">${leaveDays}</span>
          </div>

          <div class="row">
            <span>Total Days</span>
            <span class="value">${totalDays}</span>
          </div>

        </div>

      </div>

      <div class="stats">

        <div class="stat">
          <div class="stat-value">${presentDays}</div>
          <div class="stat-label">Present</div>
        </div>

        <div class="stat">
          <div class="stat-value">${absentDays}</div>
          <div class="stat-label">Absent</div>
        </div>

        <div class="stat">
          <div class="stat-value">${leaveDays}</div>
          <div class="stat-label">Leave</div>
        </div>

        <div class="stat">
          <div class="stat-value">${attendancePercentage}%</div>
          <div class="stat-label">Attendance</div>
        </div>

      </div>

    </div>

  </body>
  </html>
  `;
};

/* ============================================================
   GENERATE MONTHLY PNG
============================================================ */

export const generateMonthlyAttendanceReport =
  async ({
    studentName,
    className,
    rollNumber,
    academicYear,
    monthName,
    presentDays,
    absentDays,
    leaveDays,
    totalDays,
    attendancePercentage,
  }) => {

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });

    const page = await browser.newPage();

    page.setDefaultNavigationTimeout(0);

    const html = generateMonthlyHTML({
      studentName,
      className,
      rollNumber,
      academicYear,
      monthName,
      presentDays,
      absentDays,
      leaveDays,
      totalDays,
      attendancePercentage,
    });

    await page.setViewport({
      width: 1200,
      height: 800,
    });

    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 0,
    });

    await new Promise((resolve) =>
      setTimeout(resolve, 1000)
    );

    if (!fs.existsSync("uploads")) {
      fs.mkdirSync("uploads");
    }

    const fileName =
      `attendance-${Date.now()}.png`;

    const filePath =
      path.join("uploads", fileName);

    await page.screenshot({
      path: filePath,
      fullPage: true,
    });

    await browser.close();

    return {
      fileName,
      filePath,
    };
  };

/* ============================================================
   UPLOAD TO CLOUD FLARE R2
============================================================ */

export const uploadAttendanceReportToR2 =
  async (filePath, fileName) => {

    const fileBuffer =
      fs.readFileSync(filePath);

    const key =
      `attendance-reports/${fileName}`;

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: fileBuffer,
        ContentType: "image/png",
      })
    );

    fs.unlinkSync(filePath);

    return `${process.env.R2_PUBLIC_URL}/${key}`;
  };

/* ============================================================
   SEND MONTHLY REPORT WHATSAPP
============================================================ */

export const sendMonthlyAttendanceWhatsApp =
  async ({
    phone,
    imageUrl,
    studentName,
    monthName,
    schoolName,
  }) => {

    try {
      const cleanPhone =
        formatPhone(phone);

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
            name:
              "monthly_attendance_report",
            language: {
              code: "en_US",
            },
            components: [
              {
                type: "header",
                parameters: [
                  {
                    type: "image",
                    image: {
                      link: imageUrl,
                    },
                  },
                ],
              },
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: cleanText(studentName),
                  },
                  {
                    type: "text",
                    text: cleanText(monthName),
                  },
                  {
                    type: "text",
                    text: cleanText(schoolName),
                  },
                ],
              },
            ],
          },
        },
        {
          headers: {
            Authorization:
              `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type":
              "application/json",
          },
        }
      );

      console.log(
        `✅ Monthly report sent to ${cleanPhone}`
      );

    } catch (err) {

      console.error(
        "❌ Monthly Attendance WhatsApp Error:",
        err.response?.data || err.message
      );
    }
  };