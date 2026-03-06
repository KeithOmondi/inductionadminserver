import { Router } from "express";
import {
  getProfile,
  updateProfile,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  subscribeToPush,
  createUser,       // new
} from "../controllers/user.controller";
import { authorize, protect } from "../middlewares/authMiddleware";

const router = Router();

/* =====================================
   👤 CURRENT USER ROUTES
===================================== */

// Get own profile
router.get("/me", protect, getProfile);

// Update own profile
router.patch("/update", protect, updateProfile);

/* =====================================
   🛡 ADMIN ROUTES
===================================== */

// Get all users
router.get("/get", protect, authorize("admin"), getAllUsers);

// Get user by ID
router.get("/:id", protect, authorize("admin"), getUserById);

// Create a new user (admin decides role: admin, judge, guest)
router.post("/create", protect, authorize("admin"), createUser);

// Update user (role, status, etc.)
router.patch("/:id", protect, authorize("admin"), updateUser);

// Delete user
router.delete("/:id", protect, authorize("admin"), deleteUser);

/* =====================================
   🔔 SUBSCRIPTIONS
===================================== */

router.post("/subscribe", protect, subscribeToPush);

export default router;