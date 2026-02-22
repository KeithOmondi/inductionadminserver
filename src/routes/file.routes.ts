import express, { Router } from "express";
import {
  uploadFile,
  getFiles,
  viewFile,
  downloadFile,
  deleteFile,
} from "../controllers/file.controller";
import { protect, authorize } from "../middlewares/authMiddleware";
import { upload } from "../middlewares/upload";

const router: Router = express.Router();

/**
 * @route   POST /api/files/upload
 * @desc    Admin Uploads a file to Cloudinary
 * @access  Private (Admin)
 */
router.post(
  "/upload", 
  protect, 
  authorize("admin"), 
  upload.single("file"), // Middleware captures the file in memory
  uploadFile             // Controller handles Cloudinary logic
);

/**
 * @route   GET /api/files/get
 * @desc    Fetch metadata for all files
 */
router.get("/get", protect, getFiles);

/**
 * @route   GET /api/files/:id/view
 * @desc    Get the secure URL for viewing
 */
router.get("/:id/view", protect, viewFile);

/**
 * @route   GET /api/files/:id/download
 * @desc    Trigger a file download URL
 */
router.get("/:id/download", protect, downloadFile);

/**
 * @route   DELETE /api/files/:id
 * @desc    Admin permanently deletes file
 */
router.delete("/:id", protect, authorize("admin"), deleteFile);

export default router;