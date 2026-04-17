const AUTH_TOKEN = process.env.AUTH_TOKEN;

// ⚠️ Do NOT crash server if missing
if (!AUTH_TOKEN) {
  console.warn("⚠️ AUTH_TOKEN is not set in environment");
}

export const validateToken = (req, res, next) => {
  try {
    const token = req.body?.api_token_data_auth;

    // 🔓 Allow requests even if token missing (IoT safe mode)
    if (!token) {
      console.warn("⚠️ Missing api_token_data_auth");
      req.isAuthenticated = false;
      return next();
    }

    // 🔐 Validate if AUTH_TOKEN is configured
    if (AUTH_TOKEN && token !== AUTH_TOKEN) {
      console.warn("⚠️ Invalid api_token_data_auth:", token);
      req.isAuthenticated = false;
      return next(); // ✅ DO NOT block
    }

    // ✅ Valid token
    req.isAuthenticated = true;

    next();
  } catch (err) {
    console.error("❌ Token Middleware Error:", err);

    // ⚠️ Never block device
    return next();
  }
};
