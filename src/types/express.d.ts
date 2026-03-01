import { UserRole } from "../middlewares/authMiddleware";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role?: UserRole;     // 🔹 optional now
        resetOnly?: boolean; // 🔹 added for reset tokens
      };
    }
  }
}

export {};