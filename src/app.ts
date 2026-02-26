import express, { Application, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { notFound } from "./middlewares/notFound";
import { errorHandler } from "./middlewares/errorHandler";
import authRoutes from "./routes/auth.routes";
import messageRoutes from "./routes/message.routes";
import userRoutes from "./routes/user.routes";
import filesRoutes from "./routes/file.routes";
import courtInfoRoutes from "./routes/courtInfoRoutes";
import guestsRoutes from "./routes/judgeGuestRoutes";
import noticeRoutes from "./routes/noticeRoutes";
import eventsRoutes from "./routes/eventRoutes";
import swearingPreferenceRoutes from "./routes/swearingPreferenceRoutes"
import { env } from "./config/env";

const app: Application = express();

/**
 * 1. PROXY CONFIGURATION
 * Must be set before routes. This allows Express to see the 'X-Forwarded-Proto' 
 * header from your host (Render/Heroku/Vercel) to verify HTTPS.
 */
if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

/**
 * 2. CORS CONFIGURATION
 * Note: env.FRONTEND_URL must be the full origin (e.g., https://myapp.vercel.app)
 * and should NOT have a trailing slash.
 */
const corsOptions = {
  origin: env.FRONTEND_URL, 
  credentials: true,        // Critical for cookie-based sessions
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

/**
 * 3. GLOBAL MIDDLEWARE
 */
app.use(express.json());
app.use(cookieParser());

/**
 * 4. HEALTH CHECK
 */
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV 
  });
});

/**
 * 5. API ROUTES
 */
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/chat", messageRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/files", filesRoutes);
app.use("/api/v1/courts", courtInfoRoutes);
app.use("/api/v1/guests", guestsRoutes);
app.use("/api/v1/notices", noticeRoutes);
app.use("/api/v1/events", eventsRoutes);
app.use("/api/v1/oath", swearingPreferenceRoutes);


/**
 * 6. ERROR HANDLING
 */
app.use(notFound);
app.use(errorHandler);

export default app;