// routes/file.routes.ts
import express from "express";
import {
  uploadFile,
  getFiles,
  viewFile,
  downloadFile,
  deleteFile,
} from "../controllers/file.controller";
import { authorize, protect } from "../middlewares/authMiddleware";
import { upload } from "../middlewares/upload";

const router = express.Router();

// Admin Upload
router.post("/upload", protect, authorize("admin"), upload.single("file"), uploadFile);

// Get All (Admin + User)
router.get("/get", protect, getFiles);

// View
router.get("/:id/view", protect, viewFile);

// Download
router.get("/:id/download", protect, downloadFile);

// Delete (Admin only)
router.delete("/:id", protect, authorize("admin"), deleteFile);

export default router;
