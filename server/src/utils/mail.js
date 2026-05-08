// utils/mail.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// OTP EMAIL
export const sendEmail = async (to, otp) => {
  await transporter.sendMail({
    from: `"Education Management Software" <${process.env.EMAIL_USER}>`,
    to,
    subject: "[Education Management Software]Your OTP Code 🔐",
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="padding:30px 0;">
    <tr>
      <td align="center">

        <table width="500" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5eaf0;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#243340,#384959);padding:25px;text-align:center;">
              <h2 style="color:#ffffff;margin:0;">Education Management Software</h2>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:30px;text-align:center;">

              <h3 style="margin:0;color:#243340;">Your One-Time Password</h3>
              
              <p style="color:#6A89A7;font-size:14px;margin:15px 0;">
                Use the OTP below to complete your verification process.
              </p>

              <!-- OTP BOX -->
              <div style="
                display:inline-block;
                background:#EDF3FA;
                border:2px dashed #88BDF2;
                padding:15px 30px;
                border-radius:10px;
                font-size:26px;
                letter-spacing:5px;
                font-weight:bold;
                color:#243340;
                margin:20px 0;
              ">
                ${otp}
              </div>

              <p style="color:#8899aa;font-size:13px;">
                This OTP is valid for <b>10 minutes</b>.
              </p>

              <p style="color:#8899aa;font-size:12px;margin-top:20px;">
                If you did not request this, please ignore this email.
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f4f7fb;padding:15px;text-align:center;font-size:12px;color:#9aacbf;">
              © ${new Date().getFullYear()} Education Management Software · All rights reserved
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
    `,
  });
};

// WELCOME EMAIL → sent to the registered client/admin
export const sendWelcomeEmail = async ({
  to,
  name,
  universityName,
  universityCode,
  universityEmail,
  universityPhone,
  universityCity,
  universityState,
  loginEmail,
  loginPassword,
}) => {
  await transporter.sendMail({
    from: `"Education Management Software" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Welcome to Education Management Software 🎉",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to Education Management Software</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a2744 0%,#283e6a 60%,#1f3a5f 100%);padding:36px 40px 28px;text-align:center;">
              <!-- Logo -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
                <tr>
                  <td style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:8px 14px;vertical-align:middle;">
                    <span style="font-size:14px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">🎓 Education Management Software</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;line-height:1.3;">
                Welcome to Education Management Software! 🎉
              </h1>
              <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.65);">
                Your institution is now live on the platform
              </p>
              <!-- Decorative dots -->
              <table cellpadding="0" cellspacing="0" style="margin:18px auto 0;">
                <tr>
                  <td style="width:10px;height:10px;background:#5b9cf6;border-radius:3px;"></td>
                  <td style="width:8px;"></td>
                  <td style="width:10px;height:10px;background:#f6c25b;border-radius:3px;"></td>
                  <td style="width:8px;"></td>
                  <td style="width:10px;height:10px;background:#f65b7a;border-radius:3px;"></td>
                  <td style="width:8px;"></td>
                  <td style="width:10px;height:10px;background:#5bf6a1;border-radius:3px;"></td>
                  <td style="width:8px;"></td>
                  <td style="width:10px;height:10px;background:#c25bf6;border-radius:3px;"></td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 10px;font-size:17px;font-weight:600;color:#1a2744;">Hello, ${name} 👋</p>
              <p style="margin:0 0 24px;font-size:14px;color:#667788;line-height:1.8;">
                Congratulations! Your university <strong style="color:#1a2744;">${universityName}</strong> has been
                successfully registered on Education Management Software. You're all set to start managing
                your institution efficiently.
              </p>

              <!-- University Details Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f9fc;border:1px solid #dde6f0;border-radius:10px;margin-bottom:20px;">
                <tr>
                  <td style="padding:18px 22px;">
                    <p style="margin:0 0 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7a90aa;">🏫 University Details</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding:7px 0;border-bottom:1px solid #edf1f6;font-size:13px;color:#8899aa;">Name</td><td style="padding:7px 0;border-bottom:1px solid #edf1f6;font-size:13px;font-weight:600;color:#1a2744;text-align:right;">${universityName}</td></tr>
                      <tr><td style="padding:7px 0;border-bottom:1px solid #edf1f6;font-size:13px;color:#8899aa;">Code</td><td style="padding:7px 0;border-bottom:1px solid #edf1f6;font-size:13px;font-weight:600;color:#1a2744;text-align:right;">${universityCode}</td></tr>
                      <tr><td style="padding:7px 0;border-bottom:1px solid #edf1f6;font-size:13px;color:#8899aa;">Email</td><td style="padding:7px 0;border-bottom:1px solid #edf1f6;font-size:13px;font-weight:600;color:#1a2744;text-align:right;">${universityEmail}</td></tr>
                      <tr><td style="padding:7px 0;border-bottom:1px solid #edf1f6;font-size:13px;color:#8899aa;">Phone</td><td style="padding:7px 0;border-bottom:1px solid #edf1f6;font-size:13px;font-weight:600;color:#1a2744;text-align:right;">${universityPhone || "-"}</td></tr>
                      <tr><td style="padding:7px 0;border-bottom:1px solid #edf1f6;font-size:13px;color:#8899aa;">City</td><td style="padding:7px 0;border-bottom:1px solid #edf1f6;font-size:13px;font-weight:600;color:#1a2744;text-align:right;">${universityCity || "-"}</td></tr>
                      <tr><td style="padding:7px 0;font-size:13px;color:#8899aa;">State</td><td style="padding:7px 0;font-size:13px;font-weight:600;color:#1a2744;text-align:right;">${universityState || "-"}</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Login Credentials Box (dark) -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a2744;border-radius:10px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 14px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:rgba(255,255,255,0.45);">🔐 Super Admin Login Credentials</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;">
                          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.45);">Email address</p>
                          <p style="margin:2px 0 0;font-size:14px;font-weight:600;">
                            <span style="color:#ffffff !important; text-decoration:none !important;">
                              ${loginEmail}
                            </span>
                          </p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0 6px;">
                          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.45);">Password</p>
                          <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#ffffff;">${loginPassword}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="https://www.eduabaccotech.com/login"
                       style="display:inline-block;background:#2853a6;color:#ffffff;padding:14px 36px;border-radius:8px;
                              font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">
                      Login to Edu Dashboard →
                    </a>
                  </td>
                </tr>
              </table>

          
              <p style="margin:24px 0 0;font-size:13px;color:#8899aa;line-height:1.8;">
                Warm regards,<br/>
                <strong style="color:#1a2744;">Education Management Software Team</strong>
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f9f9f9;padding:18px 40px;text-align:center;border-top:1px solid #e5eaf0;">
              <p style="margin:0 0 6px;font-size:12px;color:#9aacbf;">
                © ${new Date().getFullYear()} Education Management Software. All rights reserved.
              </p>
              <p style="margin:0;font-size:12px;color:#9aacbf;">
                Questions? <a href="mailto:support@eduabaccotech.com" style="color:#7a90aa;text-decoration:underline;">support@eduabaccotech.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });
};

// ADMIN NOTIFICATION EMAIL → sent to your company when a new university registers
export const sendAdminNotificationEmail = async ({
  universityName,
  universityCode,
  universityEmail,
  universityPhone,
  universityCity,
  universityState,
  adminName,
  adminEmail,
  adminPhone,
  adminPassword,   // ← added this (was missing from old destructure)
}) => {
  await transporter.sendMail({
    from: `"Education Management Software" <${process.env.EMAIL_USER}>`,
    to: "support@eduabaccotech.com",
    subject: "🎉 New University Registered on Education Management Software",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>New University Registered</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">

          <!-- HEADER (green theme for admin) -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f3028 0%,#1a5244 60%,#0d4035 100%);padding:28px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.2);border-radius:10px;padding:10px 12px;vertical-align:middle;">
                          <span style="font-size:22px;">🛡️</span>
                        </td>
                        <td style="width:16px;"></td>
                        <td style="vertical-align:middle;">
                          <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;line-height:1.3;">New University Registered</p>
                          <p style="margin:3px 0 0;font-size:12px;color:rgba(255,255,255,0.55);">A new institution has joined the platform</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:28px 36px;">

              <!-- New badge -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <td style="background:#e8f5ee;border:1px solid #b8dfc9;border-radius:20px;padding:5px 14px;">
                    <span style="font-size:12px;font-weight:600;color:#1a6040;">
                      ● New Registration · ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Two-column: University | Admin -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                  <!-- University Details -->
                  <td width="48%" valign="top" style="background:#f7f9fc;border:1px solid #dde6f0;border-radius:10px;padding:16px 18px;">
                    <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7a90aa;">🏫 University</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding:5px 0;border-bottom:1px solid #edf1f6;font-size:12px;color:#8899aa;">Name</td><td style="padding:5px 0;border-bottom:1px solid #edf1f6;font-size:12px;font-weight:600;color:#1a2744;text-align:right;">${universityName}</td></tr>
                      <tr><td style="padding:5px 0;border-bottom:1px solid #edf1f6;font-size:12px;color:#8899aa;">Code</td><td style="padding:5px 0;border-bottom:1px solid #edf1f6;font-size:12px;font-weight:600;color:#1a2744;text-align:right;">${universityCode}</td></tr>
                      <tr><td style="padding:5px 0;border-bottom:1px solid #edf1f6;font-size:12px;color:#8899aa;">Email</td><td style="padding:5px 0;border-bottom:1px solid #edf1f6;font-size:12px;font-weight:600;color:#1a2744;text-align:right;">${universityEmail}</td></tr>
                      <tr><td style="padding:5px 0;border-bottom:1px solid #edf1f6;font-size:12px;color:#8899aa;">Phone</td><td style="padding:5px 0;border-bottom:1px solid #edf1f6;font-size:12px;font-weight:600;color:#1a2744;text-align:right;">${universityPhone || "-"}</td></tr>
                      <tr><td style="padding:5px 0;border-bottom:1px solid #edf1f6;font-size:12px;color:#8899aa;">City</td><td style="padding:5px 0;border-bottom:1px solid #edf1f6;font-size:12px;font-weight:600;color:#1a2744;text-align:right;">${universityCity || "-"}</td></tr>
                      <tr><td style="padding:5px 0;font-size:12px;color:#8899aa;">State</td><td style="padding:5px 0;font-size:12px;font-weight:600;color:#1a2744;text-align:right;">${universityState || "-"}</td></tr>
                    </table>
                  </td>
                  <td width="4%"></td>
                  <!-- Admin Details -->
                  <td width="48%" valign="top" style="background:#f7f9fc;border:1px solid #dde6f0;border-radius:10px;padding:16px 18px;">
                    <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#7a90aa;">👤 Admin</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding:5px 0;border-bottom:1px solid #edf1f6;font-size:12px;color:#8899aa;">Name</td><td style="padding:5px 0;border-bottom:1px solid #edf1f6;font-size:12px;font-weight:600;color:#1a2744;text-align:right;">${adminName}</td></tr>
                      <tr><td style="padding:5px 0;border-bottom:1px solid #edf1f6;font-size:12px;color:#8899aa;">Email</td><td style="padding:5px 0;border-bottom:1px solid #edf1f6;font-size:12px;font-weight:600;color:#1a2744;text-align:right;">${adminEmail}</td></tr>
                      <tr><td style="padding:5px 0;border-bottom:1px solid #edf1f6;font-size:12px;color:#8899aa;">Phone</td><td style="padding:5px 0;border-bottom:1px solid #edf1f6;font-size:12px;font-weight:600;color:#1a2744;text-align:right;">${adminPhone || "-"}</td></tr>
                      <tr><td style="padding:5px 0;font-size:12px;color:#8899aa;">Password</td><td style="padding:5px 0;font-size:12px;font-weight:600;color:#1a2744;text-align:right;">${adminPassword || "-"}</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Info note -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#f4fdf8;border:1px solid #c8e6d8;border-radius:10px;padding:14px 18px;">
                    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#1a4d38;">This institution is now live on the platform.</p>
                    <p style="margin:0;font-size:12px;color:#5a8a72;">Review the registration and reach out if any follow-up is needed.</p>
                  </td>
                </tr>
              </table>

              <p style="margin:22px 0 0;font-size:13px;color:#8899aa;">— Education Management Software System</p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#f0f4f8;padding:16px 36px;text-align:center;border-top:1px solid #e5eaf0;">
              <p style="margin:0;font-size:12px;color:#9aacbf;">
                This is an automated internal notification · © ${new Date().getFullYear()} Education Management Software
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });
};