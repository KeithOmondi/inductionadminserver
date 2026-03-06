import { Router } from "express";
import {
  getGuestProfile,
  guestViewRegistry,
  createGuest,
  getAllGuests,
  deleteGuest,
} from "../controllers/guest.controller";

import { protect, authorize } from "../middlewares/authMiddleware";

const router = Router();

/* ================================
   GUEST ACCESS (READ ONLY)
================================ */

router.get(
  "/profile",
  protect,
  authorize("guest"),
  getGuestProfile
);

router.get(
  "/registry",
  protect,
  authorize("guest"),
  guestViewRegistry
);

/* ================================
   ADMIN MANAGE GUESTS
================================ */

router.post(
  "/create",
  protect,
  authorize("admin"),
  createGuest
);

router.get(
  "/all",
  protect,
  authorize("admin"),
  getAllGuests
);

router.delete(
  "/:id",
  protect,
  authorize("admin"),
  deleteGuest
);

export default router;
