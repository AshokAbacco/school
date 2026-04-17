import { processPayload } from "./gps.service.js";

export const handleLocation = async (req, res, next) => {
  try {
    const payload = req.body;

    // ⚠️ Minimal validation only
    if (!payload || typeof payload !== "object") {
      console.warn("⚠️ Invalid payload format");
      return res.status(200).json({
        status: "ignored",
        message: "Invalid payload format",
      });
    }

    if (!payload.device_id) {
      console.warn("⚠️ Missing device_id");
      return res.status(200).json({
        status: "ignored",
        message: "Missing device_id",
      });
    }

    // 🚀 Process payload (never trust devices)
    await processPayload(payload);

    return res.status(200).json({
      status: "success",
      message: "OK",
    });
  } catch (error) {
    console.error("❌ Controller Error:", error);

    // ⚠️ NEVER return 400/500 to device
    return res.status(200).json({
      status: "error",
      message: "Handled gracefully",
    });
  }
};
