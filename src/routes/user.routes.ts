import { Router } from "express";
import {
  getProfile,
  updateProfile,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/user.controller";
import { authorize, protect } from "../middlewares/authMiddleware";

const router = Router();

/* =====================================
   👤 CURRENT USER ROUTES
===================================== */

// Get own profile
router.get("/me", protect, getProfile);

// Update own profile
router.patch("/me", protect, updateProfile);

/* =====================================
   🛡 ADMIN ROUTES
===================================== */

// Get all users
router.get("/", protect, authorize("admin"), getAllUsers);

// Get user by ID
router.get("/:id", protect, authorize("admin"), getUserById);

// Update user (role, status, etc.)
router.patch("/:id", protect, authorize("admin"), updateUser);

// Delete user
router.delete("/:id", protect, authorize("admin"), deleteUser);

export default router;
