import rateLimit from "express-rate-limit";

// 🌍 Global limiter
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 1000, // max 100 requests per IP
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔐 Strict limiter (for login/auth)
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 5, // only 5 attempts
  message: {
    success: false,
    message: "Too many login attempts. Try again later.",
  },
});