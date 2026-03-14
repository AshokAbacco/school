// server/src/routes/gallery.routes.js
import express      from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import authMiddleware from "../middlewares/authMiddleware.js";
import { upload }   from "../middlewares/uploadMemory.js";
import {
  listAlbums,
  getAlbum,
  getAlbumImages,
  createAlbum,
  uploadGalleryImages,
  getImageSignedUrl,
  downloadGalleryImage,
  deleteGalleryImage,
  deleteAlbum,
} from "../staffControlls/gallery.controller.js";

const router = express.Router();

// ── Auth on every gallery route ───────────────────────────────────────────────
router.use(authMiddleware);

// ── Upload rate limiter ───────────────────────────────────────────────────────
// Max 10 upload requests per minute, keyed by schoolId (not raw IP) so that
// a school with many staff members is not blocked by a single heavy uploader.
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,

  keyGenerator: (req) => {
    // Prefer schoolId (multi-tenant safe)
    if (req.user?.schoolId) return `school:${req.user.schoolId}`;

    // Fallback to normalized IP
    return ipKeyGenerator(req);
  },

  handler: (_req, res) =>
    res.status(429).json({
      message: "Too many upload requests. Please wait a moment and try again.",
    }),

  standardHeaders: true,
  legacyHeaders: false,
});

// ── Albums ────────────────────────────────────────────────────────────────────
router.get   ("/albums",         listAlbums);
router.post  ("/albums",         createAlbum);
router.get   ("/albums/:albumId", getAlbum);        // metadata only (backward compat)
router.delete("/albums/:albumId", deleteAlbum);

// ── Paginated image list for an album ─────────────────────────────────────────
// GET /gallery/albums/:albumId/images?cursor=<id>&limit=50
router.get("/albums/:albumId/images", getAlbumImages);

// ── Image upload (rate limited) ───────────────────────────────────────────────
// POST /gallery/albums/:albumId/images
// multer handles up to 20 files, 15 MB each; Sharp validates content
router.post(
  "/albums/:albumId/images",
  uploadLimiter,
  upload.array("images", 20),
  uploadGalleryImages
);

router.get(
  "/images/:imageId/download",
  downloadGalleryImage
);

// ── Single image operations ───────────────────────────────────────────────────
router.get   ("/images/:imageId/url", getImageSignedUrl);
router.delete("/images/:imageId",     deleteGalleryImage);


export default router;