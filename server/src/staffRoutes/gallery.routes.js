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
  addGalleryVideo,
  listGalleryVideos,
  deleteGalleryVideo,
} from "../staffControlls/gallery.controller.js";

const router = express.Router();

// ── Auth on every gallery route ───────────────────────────────────────────────
// (Role-level admin-vs-viewer gating for mutating actions is handled inside
// each controller function via requireAdmin(), since req.user shape differs
// slightly across staff / student / parent auth.)
router.use(authMiddleware);

// ── Upload rate limiter ───────────────────────────────────────────────────────
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    if (req.user?.schoolId) return `school:${req.user.schoolId}`;
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
router.get   ("/albums",         listAlbums);        // any role
router.post  ("/albums",         createAlbum);        // admin only (gated in controller)
router.get   ("/albums/:albumId", getAlbum);          // any role
router.delete("/albums/:albumId", deleteAlbum);       // admin only

// ── Paginated image list for an album ─────────────────────────────────────────
router.get("/albums/:albumId/images", getAlbumImages); // any role

// ── Image upload (rate limited, admin only) ───────────────────────────────────
router.post(
  "/albums/:albumId/images",
  uploadLimiter,
  upload.array("images", 20),
  uploadGalleryImages
);

router.get("/images/:imageId/download", downloadGalleryImage);   // any role

// ── Single image operations ───────────────────────────────────────────────────
router.get   ("/images/:imageId/url", getImageSignedUrl);        // any role
router.delete("/images/:imageId",     deleteGalleryImage);       // admin only

// ── Videos (YouTube) — separate top-level section, school-wide ───────────────
router.get   ("/videos",           listGalleryVideos);  // any role
router.post  ("/videos",           addGalleryVideo);     // admin only
router.delete("/videos/:videoId",  deleteGalleryVideo);  // admin only

export default router;