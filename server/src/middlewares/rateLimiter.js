import rateLimit from "express-rate-limit";

// 🌍 Global limiter
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 5000, // max 100 requests per IP
  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 🔐 Strict limiter (for login/auth)
export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 999999,
  skipSuccessfulRequests: false,
});