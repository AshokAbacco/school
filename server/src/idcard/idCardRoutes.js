// server\src\idcard\idCardRoutes.js
// ─────────────────────────────────────────────────────────────────────────────
// Mount in app.js:
//   import idCardRoutes    from "./main_backend/idCardRoutes.js";
//   import noAuthRoutes    from "./no_auth_endpoints/noAuthRoutes.js";
//   app.use("/api/id-cards", noAuthRoutes);   // no auth
//   app.use("/api/id-cards", idCardRoutes);   // superadmin auth
// ─────────────────────────────────────────────────────────────────────────────

import express        from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import {
  getTemplates,
  deleteTemplate,
  placeOrder,
  updateOrderStatus,
  getOrderStats,
    getOrders,           // ← add
  createCodedTemplate, // ← add
} from "./idCardControlls.js";

const router = express.Router();

// ✅ CORRECT ORDER — specific routes BEFORE param routes
router.get("/templates",          authMiddleware, getTemplates);
router.post("/templates/coded",   authMiddleware, createCodedTemplate);  // ← BEFORE :id
router.delete("/templates/:id",   authMiddleware, deleteTemplate);        // ← AFTER

router.get("/orders",             authMiddleware, getOrders);
router.post("/orders/place",      authMiddleware, placeOrder);
router.patch("/orders/:id/status",authMiddleware, updateOrderStatus);
router.get("/stats",              authMiddleware, getOrderStats);

export default router;