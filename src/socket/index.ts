import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { pubClient, subClient, connectRedis } from "../config/redis";
import { registerSocketHandlers } from "./handler";
import { env } from "../config/env";

let io: Server;

export const initSocket = async (server: any) => {
  // Connect Redis
  await connectRedis();

  io = new Server(server, {
    cors: {
      origin: env.FRONTEND_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Enable multi-server broadcasting
  io.adapter(createAdapter(pubClient, subClient));

  io.on("connection", (socket) => {
    registerSocketHandlers(io, socket);
  });

  console.log("✅ Socket.IO initialized with Redis adapter");
};

// Helper to access io instance elsewhere (controllers)
export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};