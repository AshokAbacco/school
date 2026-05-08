// server/src/whatsapp/Exams/ExamTimetableWhatsApp.js

import axios from "axios";
import { prisma } from "../../config/db.js";

import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

// ✅ S3-compatible client for Cloudflare R2
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

/* ============================================================
   R2 CLIENT  (uses your existing .env vars)
============================================================ */

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

/* ============================================================
   HELPERS
============================================================ */

const formatPhone = (phone) => {
  let clean = phone?.replace(/\D/g, "");
  if (!clean) return null;
  if (clean.length === 10) clean = "91" + clean;
  return clean;
};

const formatTime = (date) => {
  if (!date) return "";
  try {
    return new Date(date).toISOString().substring(11, 16);
  } catch {
    return "";
  }
};

/* ============================================================
   GENERATE HTML
============================================================ */

const generateTimetableHTML = (studentName, examName, schedules) => {
  const rows = schedules
    .map((item, index) => {
      const date = new Date(item.examDate).toLocaleDateString("en-IN");
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${item.subject?.name || "-"}</td>
          <td>${date}</td>
          <td>${formatTime(item.startTime)}</td>
          <td>${formatTime(item.endTime)}</td>
        </tr>
      `;
    })
    .join("");

  return `
  <html>
  <head>
    <style>
      body { font-family: Arial; padding: 30px; background: #eef4ff; }
      .card { background: white; border-radius: 18px; padding: 25px; width: 900px; }
      h1 { color: #1e3a8a; margin-bottom: 8px; }
      p { font-size: 18px; }
      table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      th { background: #1e3a8a; color: white; padding: 14px; font-size: 16px; }
      td { border: 1px solid #ddd; padding: 12px; text-align: center; font-size: 15px; }
      tr:nth-child(even) { background: #f9fafb; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${examName}</h1>
      <p>Student : <b>${studentName}</b></p>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Subject</th><th>Date</th>
            <th>Start Time</th><th>End Time</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </body>
  </html>
  `;
};

/* ============================================================
   GENERATE IMAGE  →  saves locally, returns filePath + fileName
============================================================ */

const generateTimetableImage = async (
  studentName,
  examName,
  schedules
) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // ✅ increase timeout
  page.setDefaultNavigationTimeout(0);

  const html = generateTimetableHTML(
    studentName,
    examName,
    schedules
  );

  await page.setViewport({
    width: 1100,
    height: 1000,
  });

  // ✅ changed from networkidle0
  await page.setContent(html, {
    waitUntil: "domcontentloaded",
    timeout: 0,
  });

  // ✅ small delay for rendering
  await new Promise((resolve) =>
    setTimeout(resolve, 1000)
  );

  if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
  }

  const fileName = `timetable-${Date.now()}.png`;
  const filePath = path.join("uploads", fileName);

  await page.screenshot({
    path: filePath,
    fullPage: true,
  });

  await browser.close();

  return { fileName, filePath };
};

/* ============================================================
   ✅ UPLOAD PNG TO R2  →  returns a public HTTPS URL
============================================================ */

const uploadToR2 = async (filePath, fileName) => {
  const fileBuffer = fs.readFileSync(filePath);

  const key = `exam-timetables/${fileName}`;

  await r2.send(
    new PutObjectCommand({
      Bucket:      process.env.R2_BUCKET,
      Key:         key,
      Body:        fileBuffer,
      ContentType: "image/png",
    })
  );

  // Delete local temp file after upload
  fs.unlinkSync(filePath);

  // ✅ Return the public R2 URL
  // Format: https://<accountId>.r2.cloudflarestorage.com/<bucket>/<key>
  // OR use your custom public domain if you have one set in R2
  return `${process.env.R2_PUBLIC_URL}/${key}`
};

/* ============================================================
   SEND EXAM TIMETABLE TO PARENTS
============================================================ */

export const sendExamTimetableToParents = async (req, res) => {
  try {
    const { groupId } = req.params;
    const schoolId = req.user?.schoolId;

    // Fetch all schedules for this exam group
    const schedules = await prisma.assessmentSchedule.findMany({
      where: { assessmentGroupId: groupId },
      include: {
        subject: true,
        classSection: true,
        assessmentGroup: true,
      },
      orderBy: { examDate: "asc" },
    });

    if (!schedules.length) {
      return res.status(404).json({ success: false, error: "No schedules found" });
    }

    // Group schedules by classSectionId
    const groupedSchedules = {};
    for (const sc of schedules) {
      if (!groupedSchedules[sc.classSectionId]) {
        groupedSchedules[sc.classSectionId] = [];
      }
      groupedSchedules[sc.classSectionId].push(sc);
    }

    let totalSent = 0;

    // Process each class section
    for (const classSectionId of Object.keys(groupedSchedules)) {
      const classSchedules = groupedSchedules[classSectionId];

      // ✅ Fixed: filter via enrollments relation using status enum
      const students = await prisma.student.findMany({
        where: {
          schoolId,
          enrollments: {
            some: {
              classSectionId,
              status: "ACTIVE",
            },
          },
        },
        include: {
          personalInfo: true,
          school: true,
          parentLinks: { include: { parent: true } },
        },
      });

      // Process each student
      for (const student of students) {
        const studentName = [
          student.personalInfo?.firstName || "",
          student.personalInfo?.lastName  || "",
        ]
          .join(" ")
          .trim();

        const examName =
          classSchedules[0]?.assessmentGroup?.name || "Exam";

        // Generate PNG locally
        const { fileName, filePath } = await generateTimetableImage(
          studentName,
          examName,
          classSchedules
        );

        // ✅ Upload to R2 → get public URL Meta can reach
        let imageUrl;
        try {
          imageUrl = await uploadToR2(filePath, fileName);
        } catch (uploadErr) {
          console.error("❌ R2 upload failed:", uploadErr.message);
          continue; // skip this student if upload fails
        }

        console.log(`📎 Image URL: ${imageUrl}`);

        // Send to each parent
        for (const link of student.parentLinks || []) {
          const parent     = link.parent;
          const cleanPhone = formatPhone(parent?.phone);

          if (!cleanPhone) continue;

          try {
            await axios.post(
              `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
              {
                messaging_product: "whatsapp",
                to:   cleanPhone,
                type: "template",
                template: {
                  name:     "exam_timetable",
                  language: { code: "en_US" },
                  components: [
                    {
                      type: "header",
                      parameters: [
                        {
                          type:  "image",
                          image: { link: imageUrl }, // ✅ now a real public HTTPS URL
                        },
                      ],
                    },
                    {
                      type: "body",
                      parameters: [
                        { type: "text", text: studentName },
                        { type: "text", text: student.school?.name || "School" },
                      ],
                    },
                  ],
                },
              },
              {
                headers: {
                  Authorization:  `Bearer ${process.env.WHATSAPP_TOKEN}`,
                  "Content-Type": "application/json",
                },
              }
            );

            console.log(`✅ Timetable sent to ${cleanPhone}`);
            totalSent++;

          } catch (err) {
            console.error(
              "❌ META ERROR:",
              JSON.stringify(err.response?.data, null, 2)
            );
          }
        }
      }
    }

    await prisma.assessmentGroup.update({
      where: { id: groupId },
      data: {
        timetableSent: true,
      },
    });

    return res.json({
      success: true,
      message: "Exam timetable sent successfully",
      totalSent,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};