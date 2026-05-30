import nodemailer from "nodemailer";
import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";

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
async function generateInvoicePDF(html, invoiceNumber) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
const logoPath = path.join(
  process.cwd(),
  "..",
  "client",
  "public",
  "Logo",
  "logo1.png"
);

console.log("LOGO PATH:", logoPath);

const logoBase64 = fs.readFileSync(logoPath, "base64");

const pdfHtml = html.replace(
  'cid:schoolcrm-logo',
  `data:image/png;base64,${logoBase64}`
);
await page.setViewport({
  width: 900,
  height: 1400,
  deviceScaleFactor: 1,
});
 await page.setContent(pdfHtml, {
    waitUntil: "networkidle0",
  });

  const pdfPath = path.join(
    process.cwd(),
    `${invoiceNumber}.pdf`
  );

await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  scale: 1,
  margin: {
    top: "0px",
    right: "0px",
    bottom: "0px",
    left: "0px",
  },
});

  await browser.close();

  return pdfPath;
}
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
   table, tr, td, div {
  page-break-inside: avoid !important;
}
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
     font-family: Arial, Helvetica, sans-serif;
      background: #f0f5fb;
      color: #384959;
      -webkit-font-smoothing: antialiased;
    }
    a { color: inherit; text-decoration: none; }
  </style>
</head>
<body style="background:#f0f5fb; padding:30px 0 0 0;">

 

  <!-- Existing Invoice -->
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center">
    <table
  width="760"
  cellpadding="0"
  cellspacing="0"
  role="presentation"
  style="
    width:100%;
    max-width:760px;
  "
>

          <!-- ═══════════ HEADER ═══════════ -->
          <tr>
            <td style="
              background: linear-gradient(135deg, #384959 0%, #6A89A7 100%);
              border-radius: 16px 16px 0 0;
            padding: 28px 32px 24px;
            ">
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>

    <!-- LEFT -->
    <td valign="top">

      <!-- Logo -->
   <!-- Logo -->
<div style="margin-bottom:14px;">
  <table
    cellpadding="0"
    cellspacing="0"
    style="
      width:74px;
      height:74px;
      background:rgba(255,255,255,0.12);
      border-radius:18px;
      box-shadow:
        inset 0 1px 2px rgba(255,255,255,0.08),
        0 8px 18px rgba(0,0,0,0.18);
    "
  >
    <tr>
      <td align="center" valign="middle">
        <img
          src="cid:schoolcrm-logo"
          alt="Education Management Software"
          style="
            width:60px;
            height:60px;
            object-fit:contain;
            display:block;
            border-radius:12px;
          "
        />
      </td>
    </tr>
  </table>
</div>

      <!-- Heading -->
      <div style="
        color:#ffffff;
        font-size:21px;
        font-weight:700;
        line-height:1.2;
        margin-bottom:6px;
        white-space:nowrap;
      ">
        Education Management Software
      </div>

      <!-- Subtitle -->
      <div style="
        color:#BDDDFC;
        font-size:13px;
        line-height:1.4;
      ">
        Smart School Management Solution
      </div>

    </td>

    <!-- RIGHT -->
    <td valign="top" align="right">

      <div style="
        color:#BDDDFC;
        font-size:11px;
        font-weight:600;
        letter-spacing:1.5px;
        text-transform:uppercase;
        margin-bottom:8px;
      ">
        Tax Invoice
      </div>

      <div style="
        color:#ffffff;
        font-size:20px;
        font-weight:700;
        white-space:nowrap;
      ">
        #${invoiceNumber}
      </div>

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
                      <div style="color:rgba(255,255,255,0.6); font-size:11px; letter-spacing:0.8px; text-transform:uppercase; margin-bottom:4px;">Order ID</div>
                      <div style="color:#BDDDFC; font-size:13px; font-weight:500; font-family:monospace;">${razorpayOrderId || "—"}</div>
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
              <div style="height:1px; background:linear-gradient(90deg,#BDDDFC,#f0f5fb); margin:18px 0;"></div>

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
                     <div style="
  font-size:10px;
  color:#88BDF2;
  text-align:right;
  margin-top:2px;
">
  INR incl. GST
</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Order Reference box -->
         

            </td>
          </tr>

          <!-- ═══════════ FOOTER ═══════════ -->
          <tr>
            <td style="
              background:linear-gradient(135deg, #384959 0%, #6A89A7 100%);
              border-radius:0 0 16px 16px;
             padding: 20px 32px;
              text-align:center;
            ">
              <div style="color:#BDDDFC; font-size:13px; margin-bottom:6px; font-weight:500;">
                Thank you for choosing Education Management Software 🎓
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

  return `
    <div style="font-family:Arial;padding:20px;">
      <h2>Invoice Generated</h2>

      <p>
        Hello ${fullName},
      </p>

      <p>
        Thank you for your purchase. Your invoice for
        <strong>${planName}</strong>
        has been generated.
      </p>

      <table border="1" cellpadding="10" cellspacing="0">
        <tr>
          <td><b>Invoice ID</b></td>
          <td>${invoiceNumber}</td>
        </tr>

        <tr>
          <td><b>Plan</b></td>
          <td>${planName}</td>
        </tr>

        <tr>
          <td><b>Total Amount</b></td>
          <td>₹${amount}</td>
        </tr>
      </table>

      <p>
        Please find the detailed invoice attached as PDF.
      </p>
    </div>
  `;
}
function buildPDFHTML({ invoiceNumber, fullName, planName, amount }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      background: #f0f5fb;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 40px;
    }
  </style>
</head>
<body>
<table width="500" cellpadding="0" cellspacing="0"
    style="background:#fff; border-radius:16px; overflow:hidden;
           box-shadow:0 4px 24px rgba(56,73,89,0.12); margin:0 auto;">

    <!-- Header -->
 <tr>
      <td style="
        background: linear-gradient(135deg, #384959 0%, #6A89A7 100%);
        padding: 28px 36px;
      ">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <!-- Logo on the left -->
            <td valign="middle" width="70">
              <table cellpadding="0" cellspacing="0" style="
                width:60px; height:60px;
                background:rgba(255,255,255,0.12);
                border-radius:14px;
                box-shadow: 0 8px 18px rgba(0,0,0,0.18);
              ">
                <tr>
                  <td align="center" valign="middle">
                    <img
                     src="cid:schoolcrm-logo"
                      alt="Logo"
                      style="width:48px; height:48px; object-fit:contain; display:block; border-radius:10px;"
                    />
                  </td>
                </tr>
              </table>
            </td>
            <!-- Title on the right -->
            <td valign="middle" align="right">
              <div style="color:#BDDDFC; font-size:11px; font-weight:600;
                          letter-spacing:1.5px; text-transform:uppercase;
                          margin-bottom:6px;">Invoice Generated</div>
              <div style="color:#fff; font-size:20px; font-weight:700;">#${invoiceNumber}</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 36px 36px 28px;">
        <p style="font-size:15px; color:#384959; margin-bottom:28px; line-height:1.6;">
          Hello <strong>${fullName}</strong>,<br/>
          Thank you for your purchase.
        </p>

        <!-- Info rows -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:12px 0; border-bottom:1px solid #f0f5fb;
                        font-size:13px; color:#6A89A7; font-weight:600;
                        letter-spacing:0.5px; text-transform:uppercase;">Invoice ID</td>
            <td style="padding:12px 0; border-bottom:1px solid #f0f5fb;
                        font-size:14px; color:#384959; font-weight:600;
                        text-align:right; font-family:monospace;">${invoiceNumber}</td>
          </tr>
          <tr>
            <td style="padding:12px 0; border-bottom:1px solid #f0f5fb;
                        font-size:13px; color:#6A89A7; font-weight:600;
                        letter-spacing:0.5px; text-transform:uppercase;">Plan</td>
            <td style="padding:12px 0; border-bottom:1px solid #f0f5fb;
                        font-size:14px; color:#384959; font-weight:600;
                        text-align:right;">${planName}</td>
          </tr>
          <tr>
            <td style="padding:16px 0 0;
                        font-size:13px; color:#6A89A7; font-weight:600;
                        letter-spacing:0.5px; text-transform:uppercase;">Amount</td>
            <td style="padding:16px 0 0;
                        font-size:22px; color:#384959; font-weight:700;
                        text-align:right;">₹${Number(amount).toLocaleString("en-IN")}</td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="
        background: linear-gradient(135deg, #384959 0%, #6A89A7 100%);
        padding: 18px 36px;
        text-align: center;
      ">
        <div style="color:#BDDDFC; font-size:12px; line-height:1.6;">
          Thank you for choosing Education Management Software 🎓
        </div>
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

 const invoiceHtml = buildInvoiceHTML({
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
// Read logo once, use in both PDF and email body
const logoPath = path.join(process.cwd(), "..", "client", "public", "Logo", "logo1.png");
const logoBase64 = fs.readFileSync(logoPath, "base64");
const logoSrc = `data:image/png;base64,${logoBase64}`;
const pdfPath = await generateInvoicePDF(invoiceHtml, invoiceNumber);  // ✅ big invoice → PDF

await transporter.sendMail({
  from: `"School CRM" <${process.env.EMAIL_USER}>`,
  to: email,
  subject: `Your Invoice ${invoiceNumber} — School CRM`,
  html: buildPDFHTML({ invoiceNumber, fullName, planName, amount }),
  attachments: [
    // Logo as inline CID attachment
    {
      filename: "logo.png",
      path: logoPath,
      cid: "schoolcrm-logo",   // ✅ this makes it available as cid:schoolcrm-logo in HTML
    },
    // PDF Invoice
    {
      filename: `${invoiceNumber}.pdf`,
      path: pdfPath,
      contentType: "application/pdf",
    },
  ],
});
// Delete temporary PDF
if (fs.existsSync(pdfPath)) {
  fs.unlinkSync(pdfPath);
}
  console.log(`✅ Invoice ${invoiceNumber} sent to ${email}`);
}