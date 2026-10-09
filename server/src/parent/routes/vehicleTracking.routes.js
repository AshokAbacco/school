// server/src/parent/routes/vehicleTracking.routes.js  (UPDATED)
// Mounted at /api/parent/vehicle-tracking (unchanged) · UPDATED: + bus alert endpoints

import express from "express";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import {
  getChildBusLocation,
  streamChildBus,
  getChildBusEta,
  getChildBusHistory,
  getChildBusHistoryDays,
  getBusNotifications,
  markBusNotificationsRead,
  streamBusNotifications,
  sendTestBusNotification,
  getBusAlertSettings,
  saveBusAlertSettings,
  registerPushToken,
  unregisterPushToken,
} from "../controllers/vehicleTracking.controller.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", getChildBusLocation); //                 ?studentId=   live snapshot + stops + ETA
router.get("/stream", streamChildBus); //                ?studentId=   SSE live push
router.get("/eta", getChildBusEta); //                   ?studentId=   stop-by-stop ETA
router.get("/history/days", getChildBusHistoryDays); //  ?studentId=   days with GPS data (last 14)
router.get("/history", getChildBusHistory);
router.get("/notifications", getBusNotifications); //              latest bus alerts
router.get("/notifications/stream", streamBusNotifications); //    SSE  (event: "alert")
router.patch("/notifications/read", markBusNotificationsRead); //  mark all read
router.post("/notifications/test", sendTestBusNotification); //    ?studentId=  send a test alert
router.get("/notifications/settings", getBusAlertSettings); //     { language }
router.put("/notifications/settings", saveBusAlertSettings); //    { language: en|hi|te }
router.post("/push/register", registerPushToken); //               { token, platform } from the app
router.post("/push/unregister", unregisterPushToken); //           { token } on logout //           ?studentId=&date=YYYY-MM-DD&session=PICKUP|DROP|ALL

export default router;
