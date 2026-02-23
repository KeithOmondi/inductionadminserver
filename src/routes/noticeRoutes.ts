import express from "express";
import {
  createNotice,
  getNotices,
  getNoticeById,
  downloadNotice,
  updateNotice,
  deleteNotice,
} from "../controllers/noticeController";
import { protect, authorize } from "../middlewares/authMiddleware";
import { upload } from "../middlewares/upload";

const router = express.Router();

/* ===============================
   PUBLIC / AUTHENTICATED USERS
================================ */

// Get all notices (filter + search supported)
router.get("/get", protect, getNotices);

// Get single notice (increments views)
router.get("/get/:id", protect, getNoticeById);

// Download notice (increments downloads)
router.get("/download/:id", protect, downloadNotice);

/* ===============================
   ADMIN ROUTES
================================ */

// Create notice with file upload
router.post(
  "/ceate",
  protect,
  authorize("admin"),
  upload.single("file"),
  createNotice,
);

// Update notice (optional new file)
router.put(
  "/update/:id",
  protect,
  authorize("admin"),
  upload.single("file"),
  updateNotice,
);

// Delete notice
router.delete("/delete/:id", protect, authorize("admin"), deleteNotice);

export default router;
