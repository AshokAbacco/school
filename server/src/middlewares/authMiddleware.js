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

// import jwt from "jsonwebtoken";

// const authMiddleware = (req, res, next) => {
//   try {
//     // Get token from request header
//     const authHeader = req.headers.authorization;

//     if (!authHeader) {
//       return res.status(401).json({
//         message: "No token provided",
//       });
//     }

//     // Token format: Bearer TOKEN
//     const token = authHeader.split(" ")[1];

//     if (!token) {
//       return res.status(401).json({
//         message: "Invalid token format",
//       });
//     }

//     // Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     // Attach user info to request
//     req.user = decoded;

//     next();
//   } catch (error) {
//     return res.status(401).json({
//       message: "Unauthorized: Invalid token",
//     });
//   }
// };

// export default authMiddleware;
