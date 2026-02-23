// src/app.ts
import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { notFound } from "./middlewares/notFound";
import { errorHandler } from "./middlewares/errorHandler";
import authRoutes from "./routes/auth.routes";
import messageRoutes from "./routes/message.routes";
import userRoutes from "./routes/user.routes"
import filesRoutes from "./routes/file.routes"
import courtInfoRoutes from "./routes/courtInfoRoutes"
import guestsRoutes from "./routes/judgeGuestRoutes"
import noticeRoutes from "./routes/noticeRoutes"
import eventsRoutes from "./routes/eventRoutes"
import { env } from "./config/env";

const app: Application = express();

// Middleware
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser());

// Dummy route - Added explicit types here to fix TS7006
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// ROUTES
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/chat", messageRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/files", filesRoutes);
app.use("/api/v1/courts", courtInfoRoutes);
app.use("/api/v1/guests", guestsRoutes);
app.use("/api/v1/notices", noticeRoutes);
app.use("/api/v1/events", eventsRoutes);

app.use(notFound);       // 404 handler
app.use(errorHandler); 

export default app;