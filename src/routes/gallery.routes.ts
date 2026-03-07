import { Router } from "express";
import {
  uploadMedia,
  getGallery,
  getGalleryAdmin,
  deleteMedia
} from "../controllers/gallery.controller";
import { authorize, protect } from "../middlewares/authMiddleware";
import { upload } from "../middlewares/upload";

const router = Router();

// -------------------- PUBLIC FETCH --------------------
// Judges and guests can fetch gallery
router.get("/", protect, getGallery);

// -------------------- ADMIN ROUTES --------------------
// Admin fetch (with extra info if needed)
router.get("/admin", protect, authorize("admin"), getGalleryAdmin);

// Upload new media
router.post(
  "/upload", 
  protect, 
  authorize("admin"), 
  upload.single("file"), // <--- This parses req.body and req.file
  uploadMedia
);

// Delete media
router.delete("/:id", protect, authorize("admin"), deleteMedia);

export default router;
