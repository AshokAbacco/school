import nodemailer from "nodemailer";

// ─── Transporter ────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // ✅ Must be a Gmail App Password (not your login password)
                                   //    Generate at: myaccount.google.com → Security → App Passwords
  },
});

// ✅ Verify SMTP connection on startup so you catch credential issues immediately
transporter.verify((error) => {
  if (error) {
    console.error("❌ SMTP transporter verification failed:", error.message);
    console.error(
      "   → Make sure EMAIL_USER and EMAIL_PASS are set correctly.\n" +
      "   → EMAIL_PASS must be a Gmail App Password, NOT your Gmail login password.\n" +
      "   → Generate one at: myaccount.google.com → Security → App Passwords"
    );
  } else {
    console.log("✅ SMTP transporter is ready to send emails");
  }
});

// ─── Plan metadata ──────────────────────────────────────────────────────────
// Keyed by lowercase plan name (matches planName stored in DB: "Silver", "Gold", "Premium")
const PLAN_META = {
  silver:  { label: "Silver",  pricePerUser: 300 },
  gold:    { label: "Gold",    pricePerUser: 500 },
  premium: { label: "Premium", pricePerUser: 800 },
};

// ─── Invoice HTML ────────────────────────────────────────────────────────────
function buildInvoiceHTML({
  invoiceNumber,
  invoiceDate,
  fullName,
  schoolName,
  email,
  phone,
  address,
  planName,       // ✅ human-readable: "Silver" / "Gold" / "Premium"
  studentCount,
  teacherCount,
  userCount,
  amount,
  razorpayPaymentId,
  razorpayOrderId,
}) {
  // Look up by lowercase planName — never by UUID
  const key          = (planName || "").toLowerCase();
  const plan         = PLAN_META[key] || { label: planName || "—", pricePerUser: 0 };
  const pricePerUser = plan.pricePerUser;

  // Use individual counts if available, else fall back to userCount
  const students     = Number(studentCount) || 0;
  const teachers     = Number(teacherCount) || 0;
  const totalUsers   = students + teachers || Number(userCount) || 0;

  const studentSubtotal = pricePerUser * students;
  const teacherSubtotal = pricePerUser * teachers;
  const subtotal        = pricePerUser * totalUsers;
  const gst             = Math.round(subtotal * 0.12);
  const total           = subtotal + gst;

  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invoice #${invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', Arial, sans-serif;
      background: #f0f5fb;
      color: #384959;
      -webkit-font-smoothing: antialiased;
    }
    a { color: inherit; text-decoration: none; }
  </style>
</head>
<body style="background:#f0f5fb; padding:32px 16px;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center">
        <table width="620" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:620px; width:100%;">

          <!-- ═══════════ HEADER ═══════════ -->
          <tr>
            <td style="
              background: linear-gradient(135deg, #384959 0%, #6A89A7 100%);
              border-radius: 16px 16px 0 0;
              padding: 36px 40px 32px;
            ">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle">
                    <!-- Logo placeholder (replace with a hosted image URL) -->
                    <div style="
                      width:52px; height:52px; border-radius:10px;
                      background:rgba(255,255,255,0.15);
                      border:2px solid rgba(255,255,255,0.25);
                      display:inline-block;
                    "></div>
                  </td>
                  <td valign="middle" align="right">
                    <div style="color:#BDDDFC; font-size:12px; font-weight:500; letter-spacing:1.4px; text-transform:uppercase; margin-bottom:4px;">Tax Invoice</div>
                    <div style="color:#fff; font-size:22px; font-weight:700;">#${invoiceNumber}</div>
                  </td>
                </tr>
              </table>

              <div style="margin-top:28px; border-top:1px solid rgba(189,221,252,0.25); padding-top:20px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <div style="color:rgba(255,255,255,0.6); font-size:11px; letter-spacing:0.8px; text-transform:uppercase; margin-bottom:4px;">Issue Date</div>
                      <div style="color:#fff; font-size:14px; font-weight:500;">${invoiceDate}</div>
                    </td>
                    <td align="right">
                      <div style="color:rgba(255,255,255,0.6); font-size:11px; letter-spacing:0.8px; text-transform:uppercase; margin-bottom:4px;">Payment ID</div>
                      <div style="color:#BDDDFC; font-size:13px; font-weight:500; font-family:monospace;">${razorpayPaymentId || "—"}</div>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>

          <!-- ═══════════ BODY ═══════════ -->
          <tr>
            <td style="background:#ffffff; padding: 0 40px;">

              <!-- Status pill -->
              <div style="padding:24px 0 0; display:block;">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="
                      background:#e8f5e9; color:#2e7d32;
                      font-size:12px; font-weight:600;
                      padding:6px 14px; border-radius:20px;
                      letter-spacing:0.5px;
                    ">✓ &nbsp;PAYMENT SUCCESSFUL</td>
                  </tr>
                </table>
              </div>

              <!-- Billed To + From -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
                <tr valign="top">
                  <td width="50%" style="padding-right:16px;">
                    <div style="font-size:10px; font-weight:600; color:#88BDF2; letter-spacing:1.2px; text-transform:uppercase; margin-bottom:10px;">Billed To</div>
                    <div style="font-size:15px; font-weight:600; color:#384959; margin-bottom:4px;">${fullName}</div>
                    <div style="font-size:13px; color:#6A89A7; margin-bottom:2px;">${schoolName}</div>
                    <div style="font-size:13px; color:#6A89A7; margin-bottom:2px;">${email}</div>
                    <div style="font-size:13px; color:#6A89A7; margin-bottom:2px;">${phone || ""}</div>
                    <div style="font-size:13px; color:#6A89A7;">${address}</div>
                  </td>
                  <td width="50%" style="padding-left:16px; border-left:2px solid #f0f5fb;">
                    <div style="font-size:10px; font-weight:600; color:#88BDF2; letter-spacing:1.2px; text-transform:uppercase; margin-bottom:10px;">From</div>
                    <div style="font-size:15px; font-weight:600; color:#384959; margin-bottom:4px;">School CRM</div>
                    <div style="font-size:13px; color:#6A89A7; margin-bottom:2px;">eduabaccotech@gmail.com</div>
                    <div style="font-size:13px; color:#6A89A7;">India</div>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="height:1px; background:linear-gradient(90deg,#BDDDFC,#f0f5fb); margin:28px 0;"></div>

              <!-- Line Items Table -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <!-- Head -->
                <tr style="background:#f7fafd;">
                  <td style="font-size:11px; font-weight:600; color:#6A89A7; letter-spacing:0.8px; text-transform:uppercase; padding:10px 14px; border-radius:8px 0 0 8px;">Description</td>
                  <td style="font-size:11px; font-weight:600; color:#6A89A7; letter-spacing:0.8px; text-transform:uppercase; padding:10px 8px; text-align:center;">Qty</td>
                  <td style="font-size:11px; font-weight:600; color:#6A89A7; letter-spacing:0.8px; text-transform:uppercase; padding:10px 8px; text-align:center;">Unit Price</td>
                  <td style="font-size:11px; font-weight:600; color:#6A89A7; letter-spacing:0.8px; text-transform:uppercase; padding:10px 14px; text-align:right; border-radius:0 8px 8px 0;">Amount</td>
                </tr>
                <!-- Row: Students -->
                <tr>
                  <td style="padding:16px 14px 6px;">
                    <div style="font-size:14px; font-weight:600; color:#384959;">${plan.label} Plan — Students</div>
                    <div style="font-size:12px; color:#88BDF2; margin-top:3px;">School CRM · Per student per year</div>
                  </td>
                  <td style="padding:16px 8px 6px; text-align:center; font-size:14px; color:#384959; font-weight:500;">${students}</td>
                  <td style="padding:16px 8px 6px; text-align:center; font-size:14px; color:#384959;">₹${pricePerUser.toLocaleString("en-IN")}</td>
                  <td style="padding:16px 14px 6px; text-align:right; font-size:14px; color:#384959; font-weight:600;">₹${studentSubtotal.toLocaleString("en-IN")}</td>
                </tr>
                <!-- Row: Teachers -->
                <tr style="background:#fafcfe;">
                  <td style="padding:6px 14px 16px;">
                    <div style="font-size:14px; font-weight:600; color:#384959;">${plan.label} Plan — Teachers</div>
                    <div style="font-size:12px; color:#88BDF2; margin-top:3px;">School CRM · Per teacher per year</div>
                  </td>
                  <td style="padding:6px 8px 16px; text-align:center; font-size:14px; color:#384959; font-weight:500;">${teachers}</td>
                  <td style="padding:6px 8px 16px; text-align:center; font-size:14px; color:#384959;">₹${pricePerUser.toLocaleString("en-IN")}</td>
                  <td style="padding:6px 14px 16px; text-align:right; font-size:14px; color:#384959; font-weight:600;">₹${teacherSubtotal.toLocaleString("en-IN")}</td>
                </tr>
                <!-- Total Users summary row -->
                <tr>
                  <td colspan="3" style="padding:4px 14px 8px; font-size:12px; color:#6A89A7;">
                    Total Users: <strong style="color:#384959;">${totalUsers}</strong> (${students} students + ${teachers} teachers)
                  </td>
                  <td></td>
                </tr>
              </table>

              <!-- Divider -->
              <div style="height:1px; background:#f0f5fb; margin:16px 0;"></div>

              <!-- Totals -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td></td>
                  <td width="240">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:13px; color:#6A89A7; padding:5px 0;">Subtotal</td>
                        <td style="font-size:13px; color:#384959; font-weight:500; text-align:right; padding:5px 0;">₹${subtotal.toLocaleString("en-IN")}</td>
                      </tr>
                      <tr>
                        <td style="font-size:13px; color:#6A89A7; padding:5px 0;">GST (12%)</td>
                        <td style="font-size:13px; color:#384959; font-weight:500; text-align:right; padding:5px 0;">₹${gst.toLocaleString("en-IN")}</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="height:1px; background:#BDDDFC; padding:0; margin:8px 0;"><div style="height:1px; background:#BDDDFC;"></div></td>
                      </tr>
                      <tr>
                        <td style="padding-top:10px;">
                          <div style="font-size:15px; font-weight:700; color:#384959;">Total Paid</div>
                        </td>
                        <td style="padding-top:10px; text-align:right;">
                          <div style="font-size:20px; font-weight:700; color:#384959;">₹${total.toLocaleString("en-IN")}</div>
                          <div style="font-size:10px; color:#88BDF2; text-align:right; margin-top:2px;">INR incl. GST</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Order Reference box -->
              <div style="
                background:#f7fafd; border:1px solid #BDDDFC;
                border-radius:10px; padding:16px 18px; margin:24px 0;
              ">
                <div style="font-size:11px; font-weight:600; color:#88BDF2; letter-spacing:1px; text-transform:uppercase; margin-bottom:10px;">Transaction Reference</div>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:12px; color:#6A89A7; padding-bottom:5px;">Order ID</td>
                    <td style="font-size:12px; color:#384959; font-weight:500; text-align:right; font-family:monospace; padding-bottom:5px;">${razorpayOrderId || "—"}</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px; color:#6A89A7;">Payment ID</td>
                    <td style="font-size:12px; color:#384959; font-weight:500; text-align:right; font-family:monospace;">${razorpayPaymentId || "—"}</td>
                  </tr>
                </table>
              </div>

            </td>
          </tr>

          <!-- ═══════════ FOOTER ═══════════ -->
          <tr>
            <td style="
              background:linear-gradient(135deg, #384959 0%, #6A89A7 100%);
              border-radius:0 0 16px 16px;
              padding:28px 40px;
              text-align:center;
            ">
              <div style="color:#BDDDFC; font-size:13px; margin-bottom:6px; font-weight:500;">
                Thank you for choosing School CRM 🎓
              </div>
              <div style="color:rgba(255,255,255,0.5); font-size:11px; line-height:1.6;">
                This is a system-generated invoice. For support write to
                <a href="mailto:eduabaccotech@gmail.com" style="color:#88BDF2;">eduabaccotech@gmail.com</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// ─── Public function ─────────────────────────────────────────────────────────
export async function sendInvoiceEmail(paymentData) {
  const {
    email,
    fullName,
    schoolName,
    phone,
    address,
    planName,         // ✅ "Silver" / "Gold" / "Premium" — stored in DB as planName
    userCount,
    studentCount,
    teacherCount,
    amount,
    razorpayPaymentId,
    razorpayOrderId,
  } = paymentData;

  // ✅ Guard: skip if critical fields are missing
  if (!email || !fullName || !planName) {
    console.error("❌ sendInvoiceEmail: Missing required fields (email, fullName, or planName). Skipping.");
    console.error("   Received:", { email, fullName, planName });
    return;
  }

  // Generate invoice number: INV-YYYYMMDD-XXXX
  const now           = new Date();
  const datePart      = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randPart      = Math.floor(1000 + Math.random() * 9000);
  const invoiceNumber = `INV-${datePart}-${randPart}`;
  const invoiceDate   = now.toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });

  const html = buildInvoiceHTML({
    invoiceNumber,
    invoiceDate,
    fullName,
    schoolName,
    email,
    phone,
    address,
    planName,                               // ✅ pass planName, never UUID
    studentCount: Number(studentCount) || 0,
    teacherCount: Number(teacherCount) || 0,
    userCount:    Number(userCount)    || 0,
    amount,
    razorpayPaymentId,
    razorpayOrderId,
  });

  // ✅ Throw on failure so the caller's .catch() logs the real error
  await transporter.sendMail({
    from:    `"School CRM" <${process.env.EMAIL_USER}>`,
    to:      email,
    subject: `Your Invoice ${invoiceNumber} — School CRM`,
    html,
  });

  console.log(`✅ Invoice ${invoiceNumber} sent to ${email}`);
}