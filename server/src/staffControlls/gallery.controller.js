// server/src/staffControlls/gallery.controller.js
import { nanoid }        from "nanoid";
import { prisma }        from "../config/db.js";
import { uploadToR2, deleteFromR2 } from "../lib/r2.js";
import { processImage }  from "../lib/imageProcessor.js";
import {
  getCachedSignedUrl,
  getBulkSignedUrls,
  invalidateCachedUrl,
  invalidateBulkCachedUrls,
} from "../lib/urlCache.js";

// ─────────────────────────────────────────────────────────────────────────────
// NOTE ON ROLE GATING
// ─────────────────────────────────────────────────────────────────────────────
// Only the school ADMIN may create/upload/delete gallery content. Every other
// role (STUDENT, PARENT, TEACHER, FINANCE, SUPER_ADMIN) can only read.
//
// This assumes req.user.role is set by authMiddleware to one of your role
// strings (e.g. "ADMIN", "TEACHER", "FINANCE", "STUDENT", "PARENT",
// "SUPER_ADMIN"). If your student/parent auth puts the role somewhere else
// (e.g. req.user.type or a separate token payload shape), adjust isAdmin()
// below to match — this is the one thing to double check against your real
// authMiddleware before deploying.
// ─────────────────────────────────────────────────────────────────────────────
const isAdmin = (req) => req.user?.role === "ADMIN";

const requireAdmin = (req, res) => {
  if (!isAdmin(req)) {
    res.status(403).json({ message: "Only school admins can manage the gallery" });
    return false;
  }
  return true;
};

// Extracts an 11-char YouTube video ID from any common URL shape
// (watch?v=, youtu.be/, /embed/, /shorts/). Returns null if not a valid ID.
const extractYoutubeId = (input) => {
  if (!input) return null;
  const trimmed = input.trim();

  const patterns = [
    /(?:youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/,
    /(?:youtu\.be\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const match = trimmed.match(re);
    if (match) return match[1];
  }
  // Allow a bare 11-char ID too
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Upload Images  POST /gallery/albums/:albumId/images   (admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const uploadGalleryImages = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { albumId } = req.params;
    const schoolId    = req.user.schoolId;
    const files       = req.files;

    if (!files?.length)
      return res.status(400).json({ message: "No images uploaded" });

    const album = await prisma.galleryAlbum.findFirst({ where: { id: albumId, schoolId } });
    if (!album) return res.status(404).json({ message: "Album not found" });

    const uploadedImages = [];

    for (const file of files) {
      let full, thumb;
      try {
        ({ full, thumb } = await processImage(file.buffer));
      } catch (err) {
        console.warn(`[gallery] Skipping "${file.originalname}": ${err.message}`);
        continue;
      }

      const uid    = nanoid(10);
      const prefix = `schools/${schoolId}/gallery/${albumId}/${Date.now()}-${uid}`;
      const fullKey  = `${prefix}-full${full.ext}`;
      const thumbKey = `${prefix}-thumb${thumb.ext}`;

      await Promise.all([
        uploadToR2(fullKey,  full.buffer,  full.mimetype),
        uploadToR2(thumbKey, thumb.buffer, thumb.mimetype),
      ]);

      const image = await prisma.galleryImage.create({
        data: {
          albumId,
          fileKey:       fullKey,
          thumbKey,
          fileType:      full.mimetype,
          fileSizeBytes: full.buffer.length,
        },
      });

      const thumbUrl = await getCachedSignedUrl(schoolId, thumbKey, 3600);
      uploadedImages.push({ ...image, thumbUrl });
    }

    res.json(uploadedImages);
  } catch (error) {
    console.error("[uploadGalleryImages]", error);
    res.status(500).json({ message: "Upload failed" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Create Album  POST /gallery/albums   (admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const createAlbum = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { title, description } = req.body;
    const album = await prisma.galleryAlbum.create({
      data: { title, description, schoolId: req.user.schoolId, createdById: req.user.id },
    });
    res.json(album);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create album" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// List Albums  GET /gallery/albums   (any authenticated school member)
// ─────────────────────────────────────────────────────────────────────────────
export const listAlbums = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const albums = await prisma.galleryAlbum.findMany({
      where:   { schoolId, isPublished: true, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { images: true } },
        images: {
          take:    1,
          orderBy: { uploadedAt: "desc" },
          select:  { id: true, fileKey: true, thumbKey: true },
        },
      },
    });

    const albumsWithCovers = await Promise.all(
      albums.map(async (album) => {
        let coverImageUrl = null;
        const cover = album.images[0];
        if (cover) {
          const coverKey = cover.thumbKey ?? cover.fileKey;
          try { coverImageUrl = await getCachedSignedUrl(schoolId, coverKey, 3600); } catch {}
        }
        return { ...album, coverImageUrl, images: undefined };
      })
    );

    res.json({ albums: albumsWithCovers });
  } catch (error) {
    console.error("[listAlbums]", error);
    res.status(500).json({ message: "Failed to fetch albums" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Album metadata only  GET /gallery/albums/:albumId
// ─────────────────────────────────────────────────────────────────────────────
export const getAlbum = async (req, res) => {
  try {
    const { albumId } = req.params;
    const schoolId    = req.user.schoolId;
    const album = await prisma.galleryAlbum.findFirst({
      where:   { id: albumId, schoolId },
      include: { _count: { select: { images: true } } },
    });
    if (!album) return res.status(404).json({ message: "Album not found" });
    res.json(album);
  } catch (error) {
    console.error("[getAlbum]", error);
    res.status(500).json({ message: "Failed to fetch album" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Album Images — PAGINATED  GET /gallery/albums/:albumId/images
// ─────────────────────────────────────────────────────────────────────────────
export const getAlbumImages = async (req, res) => {
  try {
    const { albumId } = req.params;
    const schoolId    = req.user.schoolId;
    const limit       = Math.min(Number(req.query.limit) || 50, 100);
    const cursor      = req.query.cursor ?? null;

    const album = await prisma.galleryAlbum.findFirst({
      where:  { id: albumId, schoolId },
      select: { id: true, title: true, description: true, createdAt: true },
    });
    if (!album) return res.status(404).json({ message: "Album not found" });

    const images = await prisma.galleryImage.findMany({
      where:   { albumId, deletedAt: null },
      take:    limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { uploadedAt: "desc" },
      select: {
        id: true, fileKey: true, thumbKey: true,
        fileType: true, fileSizeBytes: true,
        caption: true, uploadedAt: true,
      },
    });

    const hasMore    = images.length > limit;
    const page       = hasMore ? images.slice(0, -1) : images;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    const thumbKeys = page.map((img) => img.thumbKey ?? img.fileKey).filter(Boolean);
    const urlMap    = await getBulkSignedUrls(schoolId, thumbKeys, 3600);

    const imagesWithUrls = page.map((img) => {
      const key = img.thumbKey ?? img.fileKey;
      return { ...img, thumbUrl: urlMap[key] ?? null };
    });

    res.json({ album, images: imagesWithUrls, nextCursor, hasMore });
  } catch (error) {
    console.error("[getAlbumImages]", error);
    res.status(500).json({ message: "Failed to fetch images" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Signed URL (full-res)  GET /gallery/images/:imageId/url
// ─────────────────────────────────────────────────────────────────────────────
export const getImageSignedUrl = async (req, res) => {
  try {
    const { imageId } = req.params;
    const schoolId    = req.user.schoolId;
    const image = await prisma.galleryImage.findFirst({
      where: { id: imageId, album: { schoolId } },
    });
    if (!image) return res.status(404).json({ message: "Image not found" });
    const url = await getCachedSignedUrl(schoolId, image.fileKey, 3600);
    res.json({ url, expiresIn: 3600 });
  } catch (error) {
    console.error("[getImageSignedUrl]", error);
    res.status(500).json({ message: "Failed to generate URL" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Delete Image  DELETE /gallery/images/:imageId   (admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteGalleryImage = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { imageId } = req.params;
    const schoolId    = req.user.schoolId;
    const image = await prisma.galleryImage.findFirst({
      where: { id: imageId, album: { schoolId } },
    });
    if (!image) return res.status(404).json({ message: "Image not found" });

    const keysToDelete = [image.fileKey, image.thumbKey].filter(Boolean);

    await Promise.allSettled([
      ...keysToDelete.map((k) => deleteFromR2(k)),
      invalidateBulkCachedUrls(schoolId, keysToDelete),
    ]);

    await prisma.galleryImage.update({
      where: { id: imageId },
      data: { deletedAt: new Date() },
    });
    res.json({ message: "Image deleted" });
  } catch (error) {
    console.error("[deleteGalleryImage]", error);
    res.status(500).json({ message: "Failed to delete image" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Delete Album  DELETE /gallery/albums/:albumId   (admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteAlbum = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { albumId } = req.params;
    const schoolId    = req.user.schoolId;
    const album = await prisma.galleryAlbum.findFirst({
      where:   { id: albumId, schoolId },
      include: { images: { select: { fileKey: true, thumbKey: true } } },
    });
    if (!album) return res.status(404).json({ message: "Album not found" });

    const allKeys = album.images.flatMap((img) =>
      [img.fileKey, img.thumbKey].filter(Boolean)
    );

    await Promise.allSettled([
      ...allKeys.map((k) => deleteFromR2(k)),
      invalidateBulkCachedUrls(schoolId, allKeys),
    ]);

    await prisma.galleryAlbum.delete({ where: { id: albumId } });
    res.json({ message: "Album deleted" });
  } catch (error) {
    console.error("[deleteAlbum]", error);
    res.status(500).json({ message: "Failed to delete album" });
  }
};

// GET /gallery/images/:imageId/download
export const downloadGalleryImage = async (req, res) => {
  try {
    const { imageId } = req.params;
    const schoolId = req.user.schoolId;

    const image = await prisma.galleryImage.findFirst({
      where: { id: imageId, album: { schoolId } },
    });

    if (!image) {
      return res.status(404).json({ message: "Image not found" });
    }

    const url = await getCachedSignedUrl(schoolId, image.fileKey, 3600);
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch file from R2");

    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Disposition", `attachment; filename="image-${imageId}.webp"`);
    res.setHeader("Content-Type", response.headers.get("content-type") || "application/octet-stream");
    res.send(buffer);
  } catch (error) {
    console.error("[downloadGalleryImage]", error);
    res.status(500).json({ message: "Download failed" });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// GALLERY VIDEOS (YouTube) — separate top-level section, school-wide
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Add Video  POST /gallery/videos   (admin only)
// body: { title, description?, url }
// ─────────────────────────────────────────────────────────────────────────────
export const addGalleryVideo = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { title, description, url } = req.body;
    if (!title?.trim()) return res.status(400).json({ message: "Title is required" });

    const youtubeId = extractYoutubeId(url);
    if (!youtubeId)
      return res.status(400).json({ message: "That doesn't look like a valid YouTube link" });

    const video = await prisma.galleryVideo.create({
      data: {
        title: title.trim(),
        description: description?.trim() || undefined,
        youtubeId,
        schoolId: req.user.schoolId,
        addedById: req.user.id,
      },
    });

    res.json(video);
  } catch (error) {
    console.error("[addGalleryVideo]", error);
    res.status(500).json({ message: "Failed to add video" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// List Videos  GET /gallery/videos   (any authenticated school member)
// ─────────────────────────────────────────────────────────────────────────────
export const listGalleryVideos = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const videos = await prisma.galleryVideo.findMany({
      where:   { schoolId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, title: true, description: true,
        youtubeId: true, createdAt: true,
      },
    });
    res.json({ videos });
  } catch (error) {
    console.error("[listGalleryVideos]", error);
    res.status(500).json({ message: "Failed to fetch videos" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Delete Video  DELETE /gallery/videos/:videoId   (admin only)
// ─────────────────────────────────────────────────────────────────────────────
export const deleteGalleryVideo = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { videoId } = req.params;
    const schoolId    = req.user.schoolId;
    const video = await prisma.galleryVideo.findFirst({ where: { id: videoId, schoolId } });
    if (!video) return res.status(404).json({ message: "Video not found" });

    await prisma.galleryVideo.update({
      where: { id: videoId },
      data: { deletedAt: new Date() },
    });
    res.json({ message: "Video deleted" });
  } catch (error) {
    console.error("[deleteGalleryVideo]", error);
    res.status(500).json({ message: "Failed to delete video" });
  }
};