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
    const { name, phone, email } = req.body;

    const updated = await prisma.superAdmin.update({
      where: { id: req.user.id },
      data: { name, phone, email },
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
// export const updateSchoolLogo = async (req, res) => {
//   try {
//     const file = req.file;

//     if (!file) {
//       return res.status(400).json({ message: "Logo file required" });
//     }

//     // 1️⃣ Get school linked to super admin
//     const access = await prisma.superAdminSchoolAccess.findFirst({
//       where: { superAdminId: req.user.id },
//       select: { schoolId: true },
//     });

//     if (!access?.schoolId) {
//       return res.status(400).json({ message: "No school linked" });
//     }

//     const schoolId = access.schoolId;

//         // 2️⃣ Generate unique file key
//       const extMap = {
//       "image/jpeg": "jpg",
//       "image/png": "png",
//       "image/webp": "webp",
//     };

//       if (!file.mimetype.startsWith("image/")) {
//         return res.status(400).json({ message: "Only image files allowed" });
//       }

//     const fileExt = extMap[file.mimetype] || "jpg";
//     const fileKey = `schools/${schoolId}/logo-${Date.now()}.${fileExt}`;

//     // 3️⃣ Upload to R2 (private)
// // get existing logo
// const existing = await prisma.school.findUnique({
//   where: { id: schoolId },
//   select: { logoUrl: true },
// });

// // upload new
// await uploadToR2(fileKey, file.buffer, file.mimetype);

// // delete old (if exists)
// if (existing?.logoUrl) {
//   try {
//     await deleteFromR2(existing.logoUrl);
//   } catch (e) {
//     console.warn("Old logo delete failed:", e.message);
//   }
// }

// // save new key
// await prisma.school.update({
//   where: { id: schoolId },
//   data: { logoUrl: fileKey },
// });

//     res.json({
//       message: "Logo uploaded successfully",
//       key: fileKey,
//     });
//   } catch (err) {
//     console.error("[updateSchoolLogo]", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };
// ─────────────────────────────────────────
// ✅ UPLOAD UNIVERSITY LOGO (PRIVATE R2)
// ─────────────────────────────────────────
export const updateSchoolLogo = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "Logo file required" });

    if (!file.mimetype.startsWith("image/")) {
      return res.status(400).json({ message: "Only image files allowed" });
    }

    // 1️⃣ Get universityId directly from SuperAdmin (no school access needed)
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: req.user.id },
      select: { universityId: true },
    });

    if (!superAdmin?.universityId) {
      return res.status(400).json({ message: "No university linked to this admin" });
    }

    const universityId = superAdmin.universityId;

    // 2️⃣ Build R2 key
    const extMap = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/heic": "heic",
      "image/heif": "heif",
      "image/avif": "avif",
    };
    const fileExt =
      extMap[file.mimetype] ||
      file.originalname.split(".").pop()?.toLowerCase() ||
      "jpg";

    const fileKey = `universities/${universityId}/logo-${Date.now()}.${fileExt}`;

    // 3️⃣ Get existing logo to delete later
    const existing = await prisma.university.findUnique({
      where: { id: universityId },
      select: { logoUrl: true },
    });

    // 4️⃣ Upload new logo to R2
    await uploadToR2(fileKey, file.buffer, file.mimetype);

    // 5️⃣ Delete old logo from R2 (non-fatal)
    if (existing?.logoUrl) {
      try {
        await deleteFromR2(existing.logoUrl);
      } catch (e) {
        console.warn("Old logo delete failed:", e.message);
      }
    }

    // 6️⃣ Save new key to University table
    await prisma.university.update({
      where: { id: universityId },
      data: { logoUrl: fileKey },
    });

    return res.json({
      success: true,
      message: "Logo uploaded successfully",
      key: fileKey,
    });
  } catch (err) {
    console.error("[updateSchoolLogo]", err);
    return res.status(500).json({ message: err.message || "Server error" });
  }
};

// ─────────────────────────────────────────
// ✅ GET UNIVERSITY LOGO (SIGNED URL)
// ─────────────────────────────────────────
export const getSchoolLogo = async (req, res) => {
  try {
    // 1️⃣ Get universityId directly from SuperAdmin
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: req.user.id },
      select: { universityId: true },
    });

    if (!superAdmin?.universityId) return res.json({ logoUrl: null });

    // 2️⃣ Get logo key from University
    const university = await prisma.university.findUnique({
      where: { id: superAdmin.universityId },
      select: { logoUrl: true },
    });

    if (!university?.logoUrl) return res.json({ logoUrl: null });

    // 3️⃣ Generate signed URL (5 mins)
    const signedUrl = await generateSignedUrl(university.logoUrl, 300);

    return res.json({ logoUrl: signedUrl });
  } catch (err) {
    console.error("[getSchoolLogo]", err);
    res.status(500).json({ message: "Server error" });
  }
};