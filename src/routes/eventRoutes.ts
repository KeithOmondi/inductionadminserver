import express from "express";
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getPublicEvents,
  getPublicEventById,
} from "../controllers/eventController";
import { protect, authorize } from "../middlewares/authMiddleware";

const router = express.Router();

/* ===============================
   AUTHENTICATED USERS
================================ */

// Get all events (supports filter ?type=DEADLINE)
router.get("/get", protect, getEvents);

// Get single event
router.get("/get/:id", protect, getEventById);

/* ===============================
   ADMIN ROUTES
================================ */

// Create event
router.post("/create", protect, authorize("admin"), createEvent);

// Update event
router.put("/update/:id", protect, authorize("admin"), updateEvent);

// Delete event
router.delete("/delete/:id", protect, authorize("admin"), deleteEvent);

/* ===============================
   GUEST / PUBLIC ROUTES
================================ */
// Anyone can hit these
router.get("/public", protect, authorize("guest"), getPublicEvents);
router.get("/public/:id", protect, authorize("guest"), getPublicEventById);

export default router;