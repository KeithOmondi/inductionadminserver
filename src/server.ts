import http from "http";
import app from "./app";
import { env } from "./config/env";
import { connectDB } from "./config/db";
import { initSocket } from "./socket"; 

const PORT = env.PORT || 8000;

const startServer = async () => {
  try {
    // 1. Connect Database
    await connectDB();

    // 2. Create the HTTP server instance
    const server = http.createServer(app);

    // 3. Initialize Sockets (AWAIT this to ensure Redis is ready)
    await initSocket(server);

    // 4. Start listening
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Critical Server Failure:", error);
    process.exit(1);
  }
};

startServer();