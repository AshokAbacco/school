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
// Upload Images  POST /gallery/albums/:albumId/images
// ─────────────────────────────────────────────────────────────────────────────
export const uploadGalleryImages = async (req, res) => {
  try {
    const { albumId } = req.params;
    const schoolId    = req.user.schoolId;
    const files       = req.files;

    if (!files?.length)
      return res.status(400).json({ message: "No images uploaded" });

    const album = await prisma.galleryAlbum.findFirst({ where: { id: albumId, schoolId } });
    if (!album) return res.status(404).json({ message: "Album not found" });

    const uploadedImages = [];

    for (const file of files) {
      // ── 1. Validate + process (WebP, EXIF strip, thumbnail) ───────────────
      let full, thumb;
      try {
        ({ full, thumb } = await processImage(file.buffer));
      } catch (err) {
        console.warn(`[gallery] Skipping "${file.originalname}": ${err.message}`);
        continue;
      }

      console.log(
        `[gallery] ${file.originalname}: ` +
        `${Math.round(file.size / 1024)} KB → ` +
        `${Math.round(full.buffer.length / 1024)} KB full + ` +
        `${Math.round(thumb.buffer.length / 1024)} KB thumb`
      );

      // ── 2. Build R2 keys ───────────────────────────────────────────────────
      const uid    = nanoid(10);
      const prefix = `schools/${schoolId}/gallery/${albumId}/${Date.now()}-${uid}`;
      const fullKey  = `${prefix}-full${full.ext}`;
      const thumbKey = `${prefix}-thumb${thumb.ext}`;

      // ── 3. Upload full + thumbnail in parallel ─────────────────────────────
      await Promise.all([
        uploadToR2(fullKey,  full.buffer,  full.mimetype),
        uploadToR2(thumbKey, thumb.buffer, thumb.mimetype),
      ]);

      // ── 4. Persist metadata ────────────────────────────────────────────────
      const image = await prisma.galleryImage.create({
        data: {
          albumId,
          fileKey:       fullKey,
          thumbKey,
          fileType:      full.mimetype,
          fileSizeBytes: full.buffer.length,
        },
      });

      // ── 5. Return thumb URL for immediate display ──────────────────────────
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
// Create Album  POST /gallery/albums
// ─────────────────────────────────────────────────────────────────────────────
export const createAlbum = async (req, res) => {
  try {
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
// List Albums  GET /gallery/albums
// ─────────────────────────────────────────────────────────────────────────────
export const listAlbums = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;

    const albums = await prisma.galleryAlbum.findMany({
      where:   { schoolId },
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
// (backward compat — frontend uses getAlbumImages for the paginated grid)
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
//
// Query params:
//   cursor  — ID of last image on previous page
//   limit   — per page (default 50, max 100)
//
// Response:
//   { album, images: [...], nextCursor, hasMore }
//
// Each image includes thumbUrl resolved via getBulkSignedUrls (MGET + pipeline).
// Full-res URL is only fetched on demand when lightbox opens.
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

    // Fetch one extra to detect next page
    const images = await prisma.galleryImage.findMany({
      where:   { albumId },
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

    // ── Resolve all thumbnail URLs in 2 Redis round-trips ────────────────────
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
// Delete Image  DELETE /gallery/images/:imageId
// ─────────────────────────────────────────────────────────────────────────────
export const deleteGalleryImage = async (req, res) => {
  try {
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

    await prisma.galleryImage.delete({ where: { id: imageId } });
    res.json({ message: "Image deleted" });
  } catch (error) {
    console.error("[deleteGalleryImage]", error);
    res.status(500).json({ message: "Failed to delete image" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Delete Album  DELETE /gallery/albums/:albumId
// ─────────────────────────────────────────────────────────────────────────────
export const deleteAlbum = async (req, res) => {
  try {
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

    if (!response.ok) {
      throw new Error("Failed to fetch file from R2");
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="image-${imageId}.webp"`
    );

    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") || "application/octet-stream"
    );

    res.send(buffer);

  } catch (error) {
    console.error("[downloadGalleryImage]", error);
    res.status(500).json({ message: "Download failed" });
  }
};