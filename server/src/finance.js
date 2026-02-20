// server/src/staff.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const finance = express();

// Middlewares
finance.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  }),
);

finance.use(express.json());

export default finance;
