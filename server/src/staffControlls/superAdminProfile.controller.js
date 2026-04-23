import { prisma } from "../config/db.js";
import bcrypt from "bcryptjs";
import { uploadToR2, generateSignedUrl,deleteFromR2  } from "../lib/r2.js";

// ─────────────────────────────────────────
// ✅ GET PROFILE
// ─────────────────────────────────────────
export const getProfile = async (req, res) => {
  try {
    const user = await prisma.superAdmin.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    res.json(user);
  } catch (err) {
    console.error("[getProfile]", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────
// ✅ UPDATE PROFILE
// ─────────────────────────────────────────
export const updateProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const updated = await prisma.superAdmin.update({
      where: { id: req.user.id },
      data: { name, phone },
    });

    res.json(updated);
  } catch (err) {
    console.error("[updateProfile]", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────
// ✅ CHANGE PASSWORD
// ─────────────────────────────────────────
export const changePassword = async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: "New password required" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.superAdmin.update({
      where: { id: req.user.id },
      data: { password: hashed },
    });

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("[changePassword]", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────
// ✅ UPLOAD SCHOOL LOGO (PRIVATE R2)
// ─────────────────────────────────────────
export const updateSchoolLogo = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "Logo file required" });
    }

    // 1️⃣ Get school linked to super admin
    const access = await prisma.superAdminSchoolAccess.findFirst({
      where: { superAdminId: req.user.id },
      select: { schoolId: true },
    });

    if (!access?.schoolId) {
      return res.status(400).json({ message: "No school linked" });
    }

    const schoolId = access.schoolId;

        // 2️⃣ Generate unique file key
      const extMap = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };

      if (!file.mimetype.startsWith("image/")) {
        return res.status(400).json({ message: "Only image files allowed" });
      }

    const fileExt = extMap[file.mimetype] || "jpg";
    const fileKey = `schools/${schoolId}/logo-${Date.now()}.${fileExt}`;

    // 3️⃣ Upload to R2 (private)
// get existing logo
const existing = await prisma.school.findUnique({
  where: { id: schoolId },
  select: { logoUrl: true },
});

// upload new
await uploadToR2(fileKey, file.buffer, file.mimetype);

// delete old (if exists)
if (existing?.logoUrl) {
  try {
    await deleteFromR2(existing.logoUrl);
  } catch (e) {
    console.warn("Old logo delete failed:", e.message);
  }
}

// save new key
await prisma.school.update({
  where: { id: schoolId },
  data: { logoUrl: fileKey },
});

    res.json({
      message: "Logo uploaded successfully",
      key: fileKey,
    });
  } catch (err) {
    console.error("[updateSchoolLogo]", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────
// ✅ GET SCHOOL LOGO (SIGNED URL)
// ─────────────────────────────────────────
export const getSchoolLogo = async (req, res) => {
  try {
    const access = await prisma.superAdminSchoolAccess.findFirst({
      where: { superAdminId: req.user.id },
      select: { schoolId: true },
    });

    if (!access?.schoolId) {
      return res.json({ logoUrl: null });
    }

    const school = await prisma.school.findUnique({
      where: { id: access.schoolId },
      select: { logoUrl: true },
    });

    if (!school?.logoUrl) {
      return res.json({ logoUrl: null });
    }

    // 🔥 Generate signed URL (private access)
    const signedUrl = await generateSignedUrl(school.logoUrl, 300); // 5 mins

    res.json({ logoUrl: signedUrl });
  } catch (err) {
    console.error("[getSchoolLogo]", err);
    res.status(500).json({ message: "Server error" });
  }
};