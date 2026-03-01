import { Router } from "express";
import {
  register,
  login,
  logout,
  logoutAll,
  forcePasswordReset,
  refreshHandler,
} from "../controllers/auth.controller";

import {
  protect,
  protectResetOnly,
} from "../middlewares/authMiddleware";

const router = Router();

/* ==============================
   1️⃣ Public Routes
============================== */
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshHandler);

// Used when admin sends one-time login link
//router.post("/temp-login", tempLogin);

/* ==============================
   2️⃣ Reset-Only Route (Scoped Token Required)
============================== */
// 🔐 Requires resetToken in Authorization header
router.post("/force-reset", protectResetOnly, forcePasswordReset);

/* ==============================
   3️⃣ Protected Routes
============================== */
router.post("/logout", protect, logout);
router.post("/logout-all", protect, logoutAll);

/* ==============================
   4️⃣ Admin Routes
============================== */
//router.post("/promote", protect, authorize("admin"),sendOneTimeLoginLink);

export default router;