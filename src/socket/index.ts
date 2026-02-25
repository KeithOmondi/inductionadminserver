import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { pubClient, subClient, connectRedis } from "../config/redis";
import { registerSocketHandlers } from "./handler";
import { env } from "../config/env";

let io: Server;

export const initSocket = async (server: any) => {
  // Connect Redis Clients
  await connectRedis();

  io = new Server(server, {
    cors: {
      origin: env.FRONTEND_URL, // e.g., "http://localhost:5173"
      methods: ["GET", "POST"],
      credentials: true,
    },
    // Adding ping settings helps detect dead connections faster
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Enable Redis Adapter for scaling/multi-server support
  io.adapter(createAdapter(pubClient, subClient));

  io.on("connection", (socket) => {
    // Pass the 'io' instance and the specific 'socket' to handlers
    registerSocketHandlers(io, socket);
  });

  console.log("✅ Socket.IO logic attached to server");
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};