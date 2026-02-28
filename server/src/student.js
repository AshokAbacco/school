//server\src\student.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const student = express();

// middlewares
student.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
    credentials: true,
  }),
);
student.use(express.json());

// routes

export default student;
