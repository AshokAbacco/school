import crypto from "crypto";
import { prisma } from "../../config/db.js";
import { sendDeleteOtp } from "../../utils/sendDeleteOtp.js";

// ── SEND OTP ──────────────────────────────────────────────────────────────
export const sendDeleteAccountOtp = async (req, res) => {
  try {
    const superAdminId = req.user.id;

    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: superAdminId },
    });

    if (!superAdmin) {
      return res.status(404).json({
        message: "SuperAdmin not found",
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();

    const expiresAt = new Date(
      Date.now() + 10 * 60 * 1000
    );

    // Remove old OTPs
    await prisma.otp.deleteMany({
      where: {
        identifier: superAdmin.email,
      },
    });

    // Create new OTP
    await prisma.otp.create({
      data: {
        identifier: superAdmin.email,
        otp,
        expiresAt,
      },
    });

    // Send OTP email
    await sendDeleteOtp(superAdmin.email, otp, {
      message60Days: true,
      supportEmail: "support@eduabaccotech.com",
    });

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("SEND DELETE OTP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

// ── DEACTIVATE UNIVERSITY ACCOUNT ─────────────────────────────────────────
export const deleteAccount = async (req, res) => {
  try {
    const superAdminId = req.user.id;

    const { otp, confirmationText } = req.body;

    // ✅ Updated confirmation text
    if (confirmationText !== "DELETE MY UNIVERSITY ACCOUNT") {
      return res.status(400).json({
        success: false,
        message: "Confirmation text mismatch",
      });
    }

    // Get SuperAdmin
    const superAdmin = await prisma.superAdmin.findUnique({
      where: {
        id: superAdminId,
      },
      include: {
        university: true,
      },
    });

    if (!superAdmin) {
      return res.status(404).json({
        success: false,
        message: "SuperAdmin not found",
      });
    }

    // University check
    if (!superAdmin.university) {
      return res.status(404).json({
        success: false,
        message: "University not found",
      });
    }

    // Already deactivated
    if (superAdmin.university.isDeactivated) {
      return res.status(400).json({
        success: false,
        message: "University already deactivated",
      });
    }

    // Validate OTP
    const storedOtp = await prisma.otp.findFirst({
      where: {
        identifier: superAdmin.email,
        verified: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!storedOtp) {
      return res.status(400).json({
        success: false,
        message: "OTP not found. Please request a new one.",
      });
    }

    // OTP expired
    if (new Date() > storedOtp.expiresAt) {
      await prisma.otp.delete({
        where: {
          id: storedOtp.id,
        },
      });

      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new one.",
      });
    }

    // Invalid OTP
    if (storedOtp.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Transaction
    await prisma.$transaction([
      // Delete OTP
      prisma.otp.delete({
        where: {
          id: storedOtp.id,
        },
      }),

      // Deactivate University
      prisma.university.update({
        where: {
          id: superAdmin.universityId,
        },
        data: {
          isDeactivated: true,
          deactivatedAt: new Date(),
        },
      }),

      // Disable SuperAdmin
      prisma.superAdmin.update({
        where: {
          id: superAdminId,
        },
        data: {
          isActive: false,
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "University account deactivated successfully",
    });
  } catch (error) {
    console.error("DEACTIVATE UNIVERSITY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate university account",
    });
  }
};