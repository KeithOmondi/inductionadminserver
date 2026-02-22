// src/routes/auth.routes.ts
import { Router } from "express";
import {
  register,
  login,
  logout,
  logoutAll,
  refreshHandler,
  sendOneTimeLoginLink,
  tempLogin,
} from "../controllers/auth.controller";
import { protect, authorize } from "../middlewares/authMiddleware";

const router = Router();

/* ==============================
   1️⃣ Public Routes
============================== */
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshHandler);
router.post("/temp-login", tempLogin); // One-time login link endpoint

/* ==============================
   2️⃣ Protected Routes
============================== */
router.post("/logout", protect, logout);
router.post("/logout-all", protect, logoutAll);

/* ==============================
   3️⃣ Admin Routes
============================== */
// Only admin can promote users and send them login links
router.post("/promote", protect, authorize("admin"), sendOneTimeLoginLink);

export default router;
