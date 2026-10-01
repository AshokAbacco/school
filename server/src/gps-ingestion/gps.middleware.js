// server/src/gps/gps.middleware.js  (UPDATED)
// Old behaviour: token was checked but requests were ALWAYS accepted, so anyone
// could post fake bus positions. Now:
//   • GPS_STRICT_AUTH=true  → requests with a missing/wrong token are ignored
//     (still HTTP 200 so devices never retry-storm, but nothing is saved)
//   • GPS_STRICT_AUTH unset → old "safe mode" (accept + warn) for rollout.
// Turn strict mode on once every device is configured with the token.

const AUTH_TOKEN = process.env.AUTH_TOKEN;
const STRICT =
  String(process.env.GPS_STRICT_AUTH || "").toLowerCase() === "true";

if (!AUTH_TOKEN) console.warn("⚠️ AUTH_TOKEN is not set in environment");

export const validateToken = (req, res, next) => {
  try {
    const token = req.body?.api_token_data_auth;
    const ok = !!AUTH_TOKEN && token === AUTH_TOKEN;
    req.isAuthenticated = ok;

    if (!ok) {
      console.warn(
        `⚠️ GPS auth ${token ? "invalid" : "missing"} token from device ${req.body?.device_id || "?"}`,
      );
      if (STRICT && AUTH_TOKEN) {
        return res
          .status(200)
          .json({ status: "ignored", message: "Unauthorized device" });
      }
    }
    return next();
  } catch (err) {
    console.error("❌ Token Middleware Error:", err);
    return next();
  }
};
