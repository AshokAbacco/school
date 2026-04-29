import express from "express";
import nodemailer from "nodemailer";

const router = express.Router();

// POST /api/contact
router.post("/", async (req, res) => {
  try {
    const { firstName, lastName, email, subject, message } = req.body;

    if (!email || !message) {
      return res.status(400).json({ error: "Email and message are required." });
    }

    // ── Transporter (Gmail App Password) ──────────────────────────────────────
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,           // STARTTLS
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.verify();

    const displayName = [firstName, lastName].filter(Boolean).join(" ") || "Anonymous";
    const displaySubject = subject || "General Inquiry";
    const sentAt = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "long",
      timeStyle: "short",
    });

    // ── Professional HTML email ────────────────────────────────────────────────
    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>New Contact Message</title>
</head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4F8;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(30,45,61,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#384959 0%,#6A89A7 60%,#88BDF2 100%);padding:36px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.65);">Education Management Software</p>
              <h1 style="margin:0;font-size:24px;font-weight:700;color:#ffffff;">New Contact Message</h1>
              <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Received via the website contact form</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">

              <!-- Sender summary card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#EDF5FE;border:1px solid #D6E8FA;border-radius:12px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6A89A7;">From</p>
                    <p style="margin:0;font-size:20px;font-weight:700;color:#1E2D3D;">${displayName}</p>
                    <p style="margin:4px 0 0;font-size:14px;color:#6A89A7;">
                      <a href="mailto:${email}" style="color:#6A89A7;text-decoration:none;">${email}</a>
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Details grid -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td width="50%" style="padding-right:8px;padding-bottom:12px;vertical-align:top;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7FAFD;border:1px solid #E2EDF6;border-radius:10px;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <p style="margin:0 0 3px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9BAEC0;">Subject</p>
                          <p style="margin:0;font-size:14px;font-weight:600;color:#1E2D3D;">${displaySubject}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="50%" style="padding-left:8px;padding-bottom:12px;vertical-align:top;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7FAFD;border:1px solid #E2EDF6;border-radius:10px;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <p style="margin:0 0 3px;font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#9BAEC0;">Received At</p>
                          <p style="margin:0;font-size:14px;font-weight:600;color:#1E2D3D;">${sentAt} IST</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Message -->
              <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#6A89A7;">Message</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td style="background:#F7FAFD;border:1px solid #E2EDF6;border-left:4px solid #88BDF2;border-radius:10px;padding:20px 22px;">
                    <p style="margin:0;font-size:15px;line-height:1.8;color:#384959;white-space:pre-wrap;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="mailto:${email}?subject=Re: ${encodeURIComponent(displaySubject)}"
                       style="display:inline-block;background:linear-gradient(135deg,#6A89A7,#88BDF2);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:13px 32px;border-radius:100px;letter-spacing:0.02em;">
                      ✉&nbsp; Reply to ${firstName || "Sender"}
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F7FAFD;border-top:1px solid #E2EDF6;padding:22px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9BAEC0;">
                This message was sent from the <strong style="color:#6A89A7;">Education Management Software</strong> contact form.<br />
                © ${new Date().getFullYear()} Education Management Software. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
      from: `"EduAbacco Contact Form" <${process.env.EMAIL_USER}>`,
      to: "support@eduabaccotech.com",
      replyTo: email,
      subject: `[EduAbacco] ${displaySubject} — from ${displayName}`,
      html: htmlBody,
    });

    res.json({ success: true });

  } catch (err) {
    console.error("Contact route error:", err);
    res.status(500).json({ error: "Failed to send email. Please try again." });
  }
});

export default router;