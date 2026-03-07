import express from "express";
import {
  createNotice,
  getNotices,
  getNoticeById,
  downloadNotice,
  updateNotice,
  deleteNotice,
  getPublicNotices, // Added for public access
  getPublicNoticeById // Added for public access
} from "../controllers/noticeController";
import { protect, authorize } from "../middlewares/authMiddleware";
import { upload } from "../middlewares/upload";

const router = express.Router();

/* ===============================
   PUBLIC ROUTES (No Login Required)
================================ */

// Public listings (Urgent first, newest second)
router.get("/public", protect, authorize("guest"), getPublicNotices);

// Public single view (Increments views)
router.get("/public/:id", protect, authorize("guest"), getPublicNoticeById);


/* ===============================
   AUTHENTICATED USERS (Judges/Staff)
================================ */

// Internal view (might include more metadata)
router.get("/get", protect, getNotices);

// Specific detail view for logged-in users
router.get("/get/:id", protect, getNoticeById);

// Download notice (Increments downloads)
router.get("/download/:id", protect, downloadNotice);


/* ===============================
   ADMIN ROUTES
================================ */

// FIXED TYPO: "/ceate" -> "/create"
router.post(
  "/create",
  protect,
  authorize("admin"),
  upload.single("file"), // Key: ensure "file" matches your frontend FormData key
  createNotice,
);

// Update notice (Supports optional file replacement)
router.put(
  "/update/:id",
  protect,
  authorize("admin"),
  upload.single("file"),
  updateNotice,
);

// Delete notice
router.delete(
  "/delete/:id", 
  protect, 
  authorize("admin"), 
  deleteNotice
);

export default router;