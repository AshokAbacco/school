// server/src/modules/auth/auth.utils.js
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "change-me";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export const generateToken = (payload) =>
  jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });

export const verifyToken = (token) => jwt.verify(token, SECRET);
