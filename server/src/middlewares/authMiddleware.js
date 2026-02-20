// server/src/middlewares/authMiddleware.js
import { verifyToken } from "../modules/auth/auth.utils.js";

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Unauthorized - No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = verifyToken(token);

    // decoded = { id, role, userType, schoolId?, universityId? }
    req.user = decoded;
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ message: "Unauthorized - Invalid or expired token" });
  }
};

export default authMiddleware;
 