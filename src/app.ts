// src/app.ts
import express, { Application, Request, Response } from "express";
import cors from "cors";
import { notFound } from "./middlewares/notFound";
import { errorHandler } from "./middlewares/errorHandler";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes";
import messageRoutes from "./routes/message.routes";
import userRoutes from "./routes/user.routes"
import filesRoutes from "./routes/file.routes"
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

// Dummy route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});


//ROUTES
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/chat", messageRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/files", filesRoutes);



app.use(notFound);       // 404 handler
app.use(errorHandler); 

export default app;
