// middlewares/apiKey.middleware.js
//
// 🔒 Simple shared-secret auth for server-to-server calls (Abacco Tech
// pulling referral data). Not a replacement for user auth (requireAuth) —
// this is specifically for machine-to-machine endpoints where there's no
// logged-in human/JWT involved.
//
// Usage: router.get("/referrals", verifyApiKey, getReferredUsers);

export const verifyApiKey = (req, res, next) => {
  const providedKey = req.headers["x-api-key"];

  const expectedKey = process.env.SCHOOL_CRM_API_KEY;

  if (!expectedKey) {
    // Fail closed: if the key isn't configured on this server, nobody gets in.
    console.error("❌ SCHOOL_CRM_API_KEY is not set in environment variables.");
    return res.status(500).json({ error: "Server misconfiguration: API key not set" });
  }

  if (!providedKey) {
    return res.status(401).json({ error: "Missing x-api-key header" });
  }

  if (providedKey !== expectedKey) {
    return res.status(403).json({ error: "Invalid API key" });
  }

  next();
};