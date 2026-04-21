// server/src/utils/logoRoutes.js
import express from "express";
import { getSchoolLogo } from "./logoController.js";

/**
 * Each portal passes its own authMiddleware when registering this router.
 *
 * Usage in each entry file:
 *   import logoRoutes from "./utils/logoRoutes.js";
 *   import { requireAuth } from "./middlewares/auth.middleware.js";  // your auth middleware
 *   app.use("/api", logoRoutes(requireAuth));
 *
 * This gives:  GET /api/school/logo
 */
export default function logoRoutes(authMiddleware) {
  const router = express.Router();
  router.get("/school/logo", authMiddleware, getSchoolLogo);
  return router;
}