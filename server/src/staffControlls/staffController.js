import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import cacheService from "../utils/cacheService.js";
import { randomUUID } from "crypto";
import { uploadToR2, deleteFromR2, generateSignedUrl } from "../lib/r2.js";


import { prisma } from "../config/db.js"; 
const SALT_ROUNDS = 10;

/* ─────────────────────────────────────────────────────────────
   Profile photo helpers (Cloudflare R2)
   • The DB stores only the R2 object key (staffProfile.profileImage)
   • Every read swaps the key for a short-lived signed URL
   • Uploads come from multer memoryStorage — nothing touches local disk
───────────────────────────────────────────────────────────── */
const PHOTO_URL_TTL = 60 * 60 * 24; // 24h signed URL
const EXT_BY_MIME = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const buildPhotoKey = (schoolId, staffId, mimetype) =>
  `schools/${schoolId}/staff/${staffId}/profile/${Date.now()}-${randomUUID().slice(0, 8)}.${EXT_BY_MIME[mimetype] || "jpg"}`;

const uploadStaffPhoto = async (schoolId, staffId, file) => {
  const key = buildPhotoKey(schoolId, staffId, file.mimetype);
  await uploadToR2(key, file.buffer, file.mimetype);
  return key;
};

// Best-effort delete — a failed cleanup must never fail the user's request
export const removeStaffPhotoFromR2 = async (key) => {
  if (!key || /^https?:\/\//i.test(key)) return;
  try {
    await deleteFromR2(key);
  } catch (err) {
    console.error("[staffPhoto] R2 delete failed:", key, err.message);
  }
};

// Returns a copy of the staff record with profileImage as a signed URL
const withSignedPhoto = async (staff) => {
  if (!staff?.profileImage) return staff;
  if (/^https?:\/\//i.test(staff.profileImage)) return staff;
  try {
    return { ...staff, profileImage: await generateSignedUrl(staff.profileImage, PHOTO_URL_TTL) };
  } catch (err) {
    console.error("[staffPhoto] sign failed:", err.message);
    return { ...staff, profileImage: null };
  }
};

const isTrue = (v) => v === true || v === "true" || v === "1";

// ➤ Create Staff
export async function createStaff(req, res) {
  try {
    const {
      firstName, lastName, employeeCode, phone, email, password,
      role, groupType, basicSalary, joiningDate,
      bankAccountNo, bankName, ifscCode,
    } = req.body;

    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: "schoolId missing from token" });

    // Pre-generate the id so the R2 key can live under this staff's folder
    const staffId = randomUUID();
    let photoKey = null;
    if (req.file) {
      try {
        photoKey = await uploadStaffPhoto(schoolId, staffId, req.file);
      } catch (err) {
        console.error("[createStaff] photo upload failed", err);
        return res.status(502).json({ error: "Failed to upload profile photo" });
      }
    }

    let staff;
    try {

    if (email && password) {
      staff = await prisma.$transaction(async (tx) => {
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const user = await tx.user.create({
          data: {
            name: `${firstName} ${lastName || ""}`.trim(),
            email,
            password: hashedPassword,
            role: "ADMIN",
            schoolId,
          },
        });

        return tx.staffProfile.create({
          data: {
            id: staffId,
            schoolId,
            userId: user.id,
            profileImage: photoKey,
            firstName,
            lastName: lastName || "",
            employeeCode: employeeCode || null,
            phone: phone || null,
            email,
            role,
            groupType,
            basicSalary: basicSalary ? Number(basicSalary) : null,
            joiningDate: new Date(joiningDate),
            bankAccountNo: bankAccountNo || null,
            bankName: bankName || null,
            ifscCode: ifscCode || null,
          },
          include: { user: { select: { id: true, email: true } } },
        });
        
      });
    } else {
      staff = await prisma.staffProfile.create({
        data: {
          id: staffId,
          schoolId,
          profileImage: photoKey,
          firstName,
          lastName: lastName || "",
          employeeCode: employeeCode || null,
          phone: phone || null,
          email: email || null,
          role,
          groupType,
          basicSalary: basicSalary ? Number(basicSalary) : null,
          joiningDate: new Date(joiningDate),
          bankAccountNo: bankAccountNo || null,
          bankName: bankName || null,
          ifscCode: ifscCode || null,
        },
      });
 
    }

    } catch (dbErr) {
      // DB insert failed → don't leave an orphaned photo in R2
      await removeStaffPhotoFromR2(photoKey);
      throw dbErr;
    }

    // ✅ Bust the cache so next GET reflects the new staff immediately
    await cacheService.invalidateSchool(schoolId);

    res.status(201).json({ data: await withSignedPhoto(staff) });
  } catch (err) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Email already exists in this school" });
    }
    console.error("[createStaff]", err);
    res.status(500).json({ error: "Failed to create staff" });
  }
}

// ➤ Get All Staff
export async function getStaff(req, res) {
  try {
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: "schoolId missing from token" });

    // ✅ Build a versioned cache key — version increments on every invalidation
    const cacheKey = await cacheService.buildKey(schoolId, "staff:list");

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      const list = await Promise.all(JSON.parse(cached).map(withSignedPhoto));
      return res.json({ data: list, fromCache: true });
    }

    const staff = await prisma.staffProfile.findMany({
      where: {
        schoolId,
        NOT: { status: "RESIGNED" },
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, isActive: true } },
      },
    });

    // ✅ Cache the raw result (R2 keys, not expiring signed URLs)
    await cacheService.set(cacheKey, staff);

    const signed = await Promise.all(staff.map(withSignedPhoto));
    res.json({ data: signed, fromCache: false });
  } catch (err) {
    console.error("[getStaff]", err);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
}

// ➤ Get Single Staff by ID
export async function getStaffById(req, res) {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;
    if (!schoolId) return res.status(400).json({ error: "schoolId missing from token" });

    // ✅ Per-record versioned cache key
    const cacheKey = await cacheService.buildKey(schoolId, `staff:${id}`);

    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return res.json({ data: await withSignedPhoto(JSON.parse(cached)), fromCache: true });
    }

    const staff = await prisma.staffProfile.findFirst({
      where: { id, schoolId },
      include: {
        user: { select: { id: true, email: true, isActive: true } },
      },
    });

    if (!staff) return res.status(404).json({ error: "Staff not found" });

    // ✅ Cache individual record
    await cacheService.set(cacheKey, staff);

    res.json({ data: await withSignedPhoto(staff), fromCache: false });
  } catch (err) {
    console.error("[getStaffById]", err);
    res.status(500).json({ error: "Failed to fetch staff member" });
  }
}

// ➤ Update Staff
export async function updateStaff(req, res) {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    const existing = await prisma.staffProfile.findFirst({ where: { id, schoolId } });
    if (!existing) return res.status(404).json({ error: "Staff not found" });

    const {
      firstName, lastName, employeeCode, phone, email,
      role, groupType, basicSalary, joiningDate,
      bankAccountNo, bankName, ifscCode,
      removeProfileImage,
    } = req.body;

    // ── Photo: replace (new file) / remove (flag) / untouched (neither)
    let newPhotoKey;            // undefined → leave column as is
    let oldPhotoKeyToDelete = null;
    if (req.file) {
      try {
        newPhotoKey = await uploadStaffPhoto(schoolId, id, req.file);
      } catch (err) {
        console.error("[updateStaff] photo upload failed", err);
        return res.status(502).json({ error: "Failed to upload profile photo" });
      }
      oldPhotoKeyToDelete = existing.profileImage;
    } else if (isTrue(removeProfileImage)) {
      newPhotoKey = null;
      oldPhotoKeyToDelete = existing.profileImage;
    }

    let updated;
    try {
    updated = await prisma.staffProfile.update({
      where: { id },
      data: {
        ...(newPhotoKey !== undefined && { profileImage: newPhotoKey }),
        firstName,
        lastName: lastName || "",
        employeeCode: employeeCode || null,
        phone: phone || null,
        email: email || null,
        role,
        groupType,
        basicSalary: basicSalary ? Number(basicSalary) : null,
        joiningDate: joiningDate ? new Date(joiningDate) : undefined,
        bankAccountNo: bankAccountNo || null,
        bankName: bankName || null,
        ifscCode: ifscCode || null,
      },
    });
    } catch (dbErr) {
      // DB update failed → drop the freshly uploaded photo, keep the old one
      if (newPhotoKey) await removeStaffPhotoFromR2(newPhotoKey);
      throw dbErr;
    }

    // Only now that the DB points at the new photo, remove the old object
    if (oldPhotoKeyToDelete && oldPhotoKeyToDelete !== newPhotoKey) {
      await removeStaffPhotoFromR2(oldPhotoKeyToDelete);
    }

    // ✅ Bust entire school cache — list + individual record both go stale
    await cacheService.invalidateSchool(schoolId);

    res.json({ data: await withSignedPhoto(updated) });
  } catch (err) {
    console.error("[updateStaff]", err);
    res.status(500).json({ error: "Failed to update staff" });
  }
}

// ➤ Delete (soft delete)
export async function deleteStaff(req, res) {

  try {

    const { id } = req.params;

    const schoolId =
      req.user?.schoolId;

    const existing =
      await prisma.staffProfile.findFirst({

        where: {
          id,
          schoolId,
        },
      });

    if (!existing) {

      return res.status(404).json({
        error: "Staff not found",
      });

    }

    // ✅ SOFT DELETE STAFF
    // Profile photo is intentionally kept in R2 so a restore from the
    // recycle bin brings it back; it is removed on permanent delete.
    await prisma.staffProfile.update({

      where: { id },

      data: {

        status: "RESIGNED",

        deletedAt: new Date(),
      },
    });

    // ✅ OPTIONAL:
    // deactivate linked user

    if (existing.userId) {

      await prisma.user.update({

        where: {
          id: existing.userId,
        },

        data: {

          deletedAt: new Date(),

          isActive: false,
        },
      });

    }

    // ✅ CLEAR CACHE
    await cacheService.invalidateSchool(
      schoolId
    );

    res.json({
      message:
        "Staff moved to recycle bin",
    });

  } catch (err) {

    console.error(
      "[deleteStaff]",
      err
    );

    res.status(500).json({
      error:
        "Failed to delete staff",
    });

  }
}

// ➤ Remove profile photo only  (DELETE /api/staff/profiles/:id/profile-image)
export async function deleteStaffProfileImage(req, res) {
  try {
    const { id } = req.params;
    const schoolId = req.user?.schoolId;

    const existing = await prisma.staffProfile.findFirst({
      where: { id, schoolId },
      select: { id: true, profileImage: true },
    });
    if (!existing) return res.status(404).json({ error: "Staff not found" });

    if (existing.profileImage) {
      await prisma.staffProfile.update({ where: { id }, data: { profileImage: null } });
      await removeStaffPhotoFromR2(existing.profileImage);
      await cacheService.invalidateSchool(schoolId);
    }

    res.json({ message: "Profile photo removed" });
  } catch (err) {
    console.error("[deleteStaffProfileImage]", err);
    res.status(500).json({ error: "Failed to remove profile photo" });
  }
}