import { sendFeeVoiceReminder } from "../services/voice.service.js";

export const sendVoiceReminder = async (req, res) => {
  try {
    const {
      phone,
      studentName,
      pendingAmount,
      schoolName,
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
    });

    return res.status(200).json({
      success: true,
      message: "Voice reminder sent successfully",
      data: result,
    });
  } catch (error) {
    console.error(
      "VOICE CALL ERROR:",
      error?.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message: "Failed to send voice reminder",
      error: error?.response?.data || error.message,
    });
  }
};