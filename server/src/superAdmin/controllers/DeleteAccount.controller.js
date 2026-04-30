import crypto from "crypto";
import { prisma } from "../../config/db.js";
import { sendDeleteOtp } from "../../utils/sendDeleteOtp.js";

/*
|--------------------------------------------------------------------------
| SEND OTP
|--------------------------------------------------------------------------
*/
export const sendDeleteAccountOtp = async (req, res) => {
  try {
    const superAdminId = req.user.id; // authMiddleware sets req.user

    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: superAdminId },
    });

    if (!superAdmin) {
      return res.status(404).json({ message: "SuperAdmin not found" });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Use DB-backed OTP store (your Otp model) instead of in-memory Map
    await prisma.otp.deleteMany({
      where: { identifier: superAdmin.email },
    });

    await prisma.otp.create({
      data: {
        identifier: superAdmin.email,
        otp,
        expiresAt,
      },
    });

    await sendDeleteOtp(superAdmin.email, otp);

    return res.json({ success: true, message: "OTP sent successfully" });

  } catch (error) {
    console.error("SEND DELETE OTP ERROR:", error);
    return res.status(500).json({ message: "Failed to send OTP" });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE ACCOUNT
|--------------------------------------------------------------------------
*/
export const deleteAccount = async (req, res) => {
  try {
    const superAdminId = req.user.id;
    const { otp, confirmationText } = req.body;

    if (confirmationText !== "DELETE MY SCHOOL ACCOUNT") {
      return res.status(400).json({ message: "Confirmation text mismatch" });
    }

    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: superAdminId },
    });

    if (!superAdmin) {
      return res.status(404).json({ message: "SuperAdmin not found" });
    }

    // Validate OTP
    const storedOtp = await prisma.otp.findFirst({
      where: { identifier: superAdmin.email, verified: false },
      orderBy: { createdAt: "desc" },
    });

    if (!storedOtp) {
      return res.status(400).json({ message: "OTP not found. Please request a new one." });
    }

    if (new Date() > storedOtp.expiresAt) {
      await prisma.otp.delete({ where: { id: storedOtp.id } });
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }

    if (storedOtp.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await prisma.otp.delete({ where: { id: storedOtp.id } });

    const schoolId = superAdmin.schoolId;

    if (schoolId) {
      // Delete in dependency order — children before parents
      // These are the models that have RESTRICT or no onDelete set

      await prisma.teacherTutorialProfile.deleteMany({ where: { schoolId } });

      await prisma.studentTutorialRecommendation.deleteMany({
        where: { student: { schoolId } },
      });

      // Submissions → Responses
      await prisma.assignmentResponse.deleteMany({
        where: { submission: { assignment: { schoolId } } },
      });
      await prisma.assignmentSubmission.deleteMany({
        where: { assignment: { schoolId } },
      });
      await prisma.assignmentQuestion.deleteMany({
        where: { assignment: { schoolId } },
      });

      // Chat
      await prisma.message.deleteMany({
        where: { chatRoom: { participants: { some: {} } } }, // handled by ChatRoom cascade if set
      });

      // Transport fee entries
      await prisma.transportFeeEntry.deleteMany({
        where: { studentTransport: { schoolId } },
      });

      // Device locations
      await prisma.deviceLocation.deleteMany({
        where: { device: { student: { schoolId } } },
      });

      // Certificates
      await prisma.certificate.deleteMany({
        where: { student: { schoolId } },
      });

      // Result summaries
      await prisma.resultSummary.deleteMany({
        where: { student: { schoolId } },
      });

      // Marks
      await prisma.marks.deleteMany({
        where: { student: { schoolId } },
      });

      // Now delete the school — Cascade handles the rest
      await prisma.school.delete({ where: { id: schoolId } });

    } else {
      await prisma.superAdmin.delete({ where: { id: superAdminId } });
    }

    return res.json({ success: true, message: "Account deleted successfully" });

  } catch (error) {
    console.error("DELETE ACCOUNT ERROR:", error);
    return res.status(500).json({ message: "Failed to delete account" });
  }
};