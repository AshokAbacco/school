// server/src/whatsapp/meetingReminderCron.js
import cron from "node-cron";
import axios from "axios";
import { prisma } from "../config/db.js";

/* ─── helpers ─────────────────────────────────────────────────── */
const formatPhone = (phone) => {
  let clean = phone?.replace(/\D/g, "");
  if (!clean) return null;
  if (clean.length === 10) clean = "91" + clean;
  return clean;
};

const cleanText = (text) => {
  return (text || "")
    .replace(/\n/g, " ")
    .replace(/\t/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

/**
 * Combines a meetingDate (Date stored as midnight in DB)
 * with a startTime string like "01:37" or "13:05"
 * Returns a proper Date for that day + time.
 */
  const getMeetingDateTime = (meetingDate, startTime) => {
    if (!startTime) return null;

    const [hours, minutes] = startTime.split(":").map(Number);

    // force IST date
    const baseDate = new Date(
      new Date(meetingDate).toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      })
    );

    baseDate.setHours(hours, minutes, 0, 0);

    return baseDate;
  };

/* ═══════════════════════════════════════════════════════════════
   CRON — runs every minute
   ─────────────────────────────────────────────────────────────
   Root cause fix:
   meetingDate in DB is stored as midnight (date only).
   startTime is a separate string like "01:37".
   So we cannot filter by meetingDate window in Prisma —
   instead we fetch today's pending meetings broadly, then
   reconstruct the real datetime = meetingDate + startTime
   and check if it falls within now → now+2min.
═══════════════════════════════════════════════════════════════ */
cron.schedule("* * * * *", async () => {
  try {
    console.log("⏰ Running meeting reminder cron...");

  // IST time
  const now = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Kolkata",
    })
  );

  // reminder exactly 1 hour before
  const reminderWindowStart = new Date(now.getTime() + 59 * 60 * 1000);
  const reminderWindowEnd   = new Date(now.getTime() + 61 * 60 * 1000);

    // Fetch today's meetings where schedule was sent but reminder was not
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const meetings = await prisma.meeting.findMany({
      where: {
        scheduledSentAt: { not: null }, // admin already sent the schedule msg
        reminderSentAt:  null,          // reminder not yet sent
        meetingDate: { gte: todayStart, lte: todayEnd }, // today only
      },
      include: {
        school: true,
        participants: {
          include: {
            user: {
              include: {
                teacherProfile: true,
                StaffProfile: true,
              },
            },
            parent: true,
          },
        },
        students: {
          include: {
            student: {
              include: {
                parentLinks: {
                  include: { parent: true },
                },
              },
            },
          },
        },
      },
    });

    console.log("📌 Candidate meetings today (schedule sent, reminder pending):", meetings.length);

    for (const meeting of meetings) {
      // Reconstruct the real meeting start datetime from date + startTime string
      const meetingDateTime = getMeetingDateTime(meeting.meetingDate, meeting.startTime);

      if (!meetingDateTime) {
        console.log(`⚠️  Cannot parse startTime for "${meeting.title}" (value: "${meeting.startTime}")`);
        continue;
      }

      console.log(
        `🕐 "${meeting.title}" starts at ${meetingDateTime.toLocaleTimeString()} | ` +
        `now=${now.toLocaleTimeString()} | reminder_start=${reminderWindowStart.toLocaleTimeString()} | ` +
        `reminder_end=${reminderWindowEnd.toLocaleTimeString()}`
      );

      // Only fire if meeting start is within the next 2 minutes
      if (
          meetingDateTime < reminderWindowStart ||
          meetingDateTime > reminderWindowEnd
        ){
        console.log(`⏩ Skipping "${meeting.title}" — outside 2-minute window`);
        continue;
      }

      console.log(`🔔 Sending reminder for: "${meeting.title}"`);

      const schoolName = meeting.school?.name || "School";
      const date       = new Date(meeting.meetingDate).toLocaleDateString("en-IN");
      const formatTime12Hour = (time24) => {
      if (!time24) return "";

        const [hours, minutes] = time24.split(":");

        const date = new Date();
        date.setHours(hours);
        date.setMinutes(minutes);

        return date.toLocaleTimeString("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      };

    const time = formatTime12Hour(meeting.startTime);
      const location   =
        meeting.venueType === "ONLINE"
          ? meeting.meetingLink || "Online"
          : meeting.venueDetail || "School";
      const topic = meeting.description || "Meeting Discussion";

      const sendReminderMessage = async (phone, name) => {
        const cleanPhone = formatPhone(phone);
        if (!cleanPhone) return;
        try {
          await axios.post(
            `https://graph.facebook.com/v23.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
              messaging_product: "whatsapp",
              to: cleanPhone,
              type: "template",
              template: {
                name: "meeting_reminder",
                language: { code: "en_US" },
                components: [
                  {
                    type: "body",
                    parameters: [
                      { type: "text", text: cleanText(name || "User") },
                      { type: "text", text: cleanText(meeting.title) },
                      { type: "text", text: cleanText(topic) },
                      { type: "text", text: cleanText(date) },
                      { type: "text", text: cleanText(time) },
                      { type: "text", text: cleanText(location) },
                      { type: "text", text: cleanText(schoolName) },
                      { type: "text", text: cleanText(meeting.contactNumber || "N/A") },
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
          console.log(`✅ Reminder sent to ${cleanPhone} (${name})`);
        } catch (err) {
          console.error(`❌ WhatsApp error for ${cleanPhone}:`, err.response?.data || err.message);
        }
      };

      // Send to USERS (Teachers + Staff)
      for (const p of meeting.participants) {
        if (p.type === "USER") {
          const phone = p.user?.teacherProfile?.phone || p.user?.StaffProfile?.phone;
          if (phone) await sendReminderMessage(phone, p.user?.name);
        }
        if (p.type === "PARENT") {
          if (p.parent?.phone) await sendReminderMessage(p.parent.phone, p.parent.name);
        }
      }

      // Send to STUDENTS → via their parents
      for (const s of meeting.students) {
        for (const link of s.student.parentLinks || []) {
          if (link.parent?.phone) {
            await sendReminderMessage(link.parent.phone, link.parent.name);
          }
        }
      }

      // Mark as sent so this never fires again for this meeting
      await prisma.meeting.update({
        where: { id: meeting.id },
        data:  { reminderSentAt: new Date() },
      });

      console.log(`✅ reminderSentAt stamped for: "${meeting.title}"`);
    }
  } catch (err) {
    console.error("❌ Cron Error:", err);
  }
});