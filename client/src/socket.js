// src/socket.js
 
import { io } from "socket.io-client";
 
const API_URL = import.meta.env.VITE_API_URL;
 
let socket = null;
 
export const connectSocket = (userId) => {
  if (!userId) {
    console.log("❌ No userId for socket");
    return null;
  }

  // already initialized
  if (socket) {
    return socket;
  }

  socket = io(API_URL, {
    transports: ["websocket"],
    withCredentials: true,

    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,

    timeout: 20000,

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
 
 