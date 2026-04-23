// src/socket.js

import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL;

let socket = null;

export const connectSocket = (userId) => {
  if (!userId) {
    console.log("❌ No userId for socket");
    return null;
  }

  // If already connected, return existing socket
  if (socket && socket.connected) {
    return socket;
  }

  // Remove old disconnected socket
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(API_URL, {
    transports: ["websocket", "polling"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
    auth: {
      userId: String(userId),
    },
  });

  socket.on("connect", () => {
    console.log("✅ Socket Connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket Disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.log("❌ Socket Connect Error:", err.message);
  });

  socket.io.on("reconnect", (attempt) => {
    console.log("🔁 Socket Reconnected after attempts:", attempt);
  });

  socket.io.on("reconnect_attempt", (attempt) => {
    console.log("⏳ Reconnect attempt:", attempt);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("🔌 Socket manually disconnected");
  }
};