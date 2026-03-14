//server\src\app.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./modules/auth/auth.routes.js";

import groupBRoutes from "./Financepages/Routes/groupBRoutes.js";
import groupCRoutes from "./Financepages/Routes/groupCRoutes.js";
import groupDRoutes from "./Financepages/Routes/groupDRoutes.js";


dotenv.config();

const app = express();


// middlewares
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());

// routes
app.use("/api/auth", authRoutes);

app.use("/api/groupb/salary", groupBRoutes);
app.use("/api/groupc/salary", groupCRoutes);
app.use("/api/groupd/salary", groupDRoutes);

export default app;
