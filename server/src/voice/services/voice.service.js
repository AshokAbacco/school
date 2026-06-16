import axios from "axios";

const SUPPORTED_LANGUAGES = [
  "en",
  "en-in",
  "hi",
  "kn",
  "te",
  "ta",
];

function normalizePhone(phone) {
  let cleaned = String(phone).replace(/\D/g, "");

  if (cleaned.length === 10) {
    cleaned = `91${cleaned}`;
  }

  return cleaned;
}

function buildFeeReminder({
  studentName,
  pendingAmount,
  schoolName,
  language,
}) {
  switch (language) {
    case "hi":
      return `नमस्ते अभिभावक। यह ${schoolName} की ओर से शुल्क भुगतान अनुस्मारक कॉल है। छात्र ${studentName} की फीस अभी लंबित है। बकाया शुल्क राशि ${pendingAmount} रुपये है। कृपया जल्द से जल्द शुल्क का भुगतान करें। धन्यवाद।`;

    case "kn":
      return `ನಮಸ್ಕಾರ ಪೋಷಕರೇ. ಇದು ${schoolName} ಶಾಲೆಯಿಂದ ಶುಲ್ಕ ಪಾವತಿ ನೆನಪಿನ ಕರೆ. ವಿದ್ಯಾರ್ಥಿ ${studentName} ಅವರ ಶುಲ್ಕ ಇನ್ನೂ ಬಾಕಿಯಿದೆ. ಬಾಕಿ ಮೊತ್ತ ${pendingAmount} ರೂಪಾಯಿ. ದಯವಿಟ್ಟು ಶೀಘ್ರದಲ್ಲೇ ಶುಲ್ಕವನ್ನು ಪಾವತಿಸಿ. ಧನ್ಯವಾದಗಳು.`;

    case "te":
      return `నమస్కారం తల్లిదండ్రులారా. ఇది ${schoolName} నుండి ఫీజు రిమైండర్ కాల్. విద్యార్థి ${studentName} ఫీజు ఇంకా బకాయిగా ఉంది. బకాయి మొత్తం ${pendingAmount} రూపాయలు. దయచేసి త్వరలో చెల్లించండి. ధన్యవాదాలు.`;

    case "ta":
      return `வணக்கம் பெற்றோர்களே. இது ${schoolName} பள்ளியிலிருந்து கட்டண நினைவூட்டல் அழைப்பு. மாணவர் ${studentName} அவர்களின் கட்டணம் இன்னும் நிலுவையில் உள்ளது. நிலுவைத் தொகை ${pendingAmount} ரூபாய். தயவுசெய்து விரைவில் கட்டணத்தை செலுத்தவும். நன்றி.`;

    case "en":
      return `Hello Parent. This is a reminder call from ${schoolName}. Student ${studentName} has a pending school fee of Rupees ${pendingAmount}. Kindly complete the payment at the earliest. Thank you.`;

    case "en-in":
    default:
      return `Hello Parent. This is a reminder call from ${schoolName}. We would like to inform you that the school fee payment for student ${studentName} is currently pending. The outstanding fee amount is Rupees ${pendingAmount}. Kindly visit the school and complete the payment at the earliest. Thank you.`;
  }
}

export const sendFeeVoiceReminder = async ({
  phone,
  pendingAmount,
  studentName,
  schoolName,
  language = "en-in",
  message = null,
  voice = null,
}) => {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const normalizedPhone = normalizePhone(phone);

  const authString = Buffer.from(
    `${process.env.VOICE_USERNAME}:${process.env.VOICE_PASSWORD}`
  ).toString("base64");

  const text =
    message?.trim() ||
    buildFeeReminder({
      studentName,
      pendingAmount,
      schoolName,
      language,
    });

  const requestBody = {
    from: process.env.VOICE_SENDER,
    to: normalizedPhone,
    text,
    language,
  };

  if (voice?.name) {
    requestBody.voice = {
      name: voice.name,
      gender: voice.gender || "female",
    };
  }

  const requestId = `VOICE-${Date.now()}`;

  console.log(
    `[VOICE] Sending | ${requestId} | ${normalizedPhone} | ${language}`
  );

  try {
    const response = await axios.post(
      process.env.VOICE_API_URL,
      requestBody,
      {
        headers: {
          Authorization: `Basic ${authString}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 30000,
      }
    );

    const data = response.data;

    const messageData = data?.messages?.[0];

    console.log(
      `[VOICE] Success | ${requestId} | ${messageData?.messageId}`
    );

    return {
      bulkId: data?.bulkId || null,
      messageId: messageData?.messageId || null,
      status: messageData?.status?.groupName || "PENDING",
      providerResponse: data,
    };
  } catch (error) {
    console.error(
      `[VOICE] Failed | ${requestId}`,
      error?.response?.data || error.message
    );

    throw new Error(
      error?.response?.data?.requestError?.serviceException?.text ||
      error?.response?.data?.message ||
      error.message ||
      "Voice API request failed"
    );
  }
};