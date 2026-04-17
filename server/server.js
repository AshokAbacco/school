// server/server.js
import "dotenv/config";

import { createServer } from "http";
import { Server } from "socket.io";

import "./src/utils/redis.js";
import app from "./src/app.js";   // login related
import staff from "./src/staff.js";
import finance from "./src/finance.js";
import student from "./src/student.js";
import parent from "./src/parent.js";
import gpsRoutes from "./src/gps-ingestion/gps.routes.js";
import paymentRoutes from "./src/payment/payment.routes.js";
import cors from "cors";

const PORT = process.env.PORT || 5000;

// ✅ read multiple origins from .env
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(",").map(o => o.trim())
  : [];

console.log("Allowed Origins:", allowedOrigins);

// ✅ CORS setup
app.use(cors({
  origin: function (origin, callback) {
    console.log("Request Origin:", origin);

    // allow Postman / server-to-server
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS blocked: " + origin));
    }
  },
  credentials: true
}));

// ✅ extra headers (helps in production)
app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(staff);
app.use(student);
app.use(finance);  
app.use("/api/parent", parent); 
app.use("/api/device", gpsRoutes);
app.use("/api/payment", paymentRoutes);

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

global.io = io;

io.on("connection", (socket) => {
  const userId = socket.handshake.auth?.userId;

  if (userId) {
    socket.join(String(userId));
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});