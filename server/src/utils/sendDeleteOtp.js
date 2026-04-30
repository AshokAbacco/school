//server\src\utils\sendDeleteOtp.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendDeleteOtp = async (email, otp) => {
  await transporter.sendMail({
    from: `"SchoolHub Security" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Account Deletion Verification OTP",
    html: `
      <div style="font-family:Arial,sans-serif;padding:20px">
        <h2 style="color:#dc2626">Account Deletion Request</h2>

        <p>We received a request to permanently delete your SchoolHub account.</p>

        <p style="margin-top:20px">
          Your verification OTP is:
        </p>

        <div style="
          font-size:32px;
          font-weight:bold;
          letter-spacing:8px;
          color:#111827;
          margin:20px 0;
        ">
          ${otp}
        </div>

        <p>
          This OTP will expire in 10 minutes.
        </p>

        <p style="color:#dc2626;font-weight:600">
          Warning: Account deletion is permanent and cannot be undone.
        </p>
      </div>
    `,
  });
};