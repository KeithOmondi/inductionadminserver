import http from "http";
import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import { initSocket } from "./socket"; // ⭐ NEW

const PORT = env.PORT || 8000;

const startServer = async () => {
  await connectDB();

  // Create HTTP server
  const server = http.createServer(app);

  // ⭐ Initialize Socket.IO using our new structure
  initSocket(server);

  // Start server
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
};

startServer();