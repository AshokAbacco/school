import { sendFeeVoiceReminder } from "../services/voice.service.js";

export const sendVoiceReminder = async (req, res) => {
  try {
    const {
      phone,
      studentName,
      pendingAmount,
      schoolName,
      language = "en-in",
      message = null,
      voice = null,
    } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const result = await sendFeeVoiceReminder({
      phone,
      studentName,
      pendingAmount,
      schoolName,
      language,
      message,
      voice,
    });

    return res.status(200).json({
      success: true,
      message: "Voice reminder sent successfully",
      messageId: result.messageId,
      bulkId: result.bulkId,
      status: result.status,
      providerResponse: result.providerResponse,
    });
  } catch (error) {
    console.error("[VOICE ERROR]", error.message);

    return res.status(500).json({
      success: false,
      message: error.message || "Voice reminder failed",
    });
  }
};