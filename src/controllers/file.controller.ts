// controllers/file.controller.ts
import { Request, Response } from "express";
import File from "../models/files.model"; // Ensure path matches your file structure
import cloudinary, { uploadToCloudinary } from "../config/cloudinary";

/**
 * 🔹 Upload File to Cloudinary
 */
export const uploadFile = async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });

    // 1. Upload to Cloudinary using our helper
    const cloudRes = await uploadToCloudinary(file, "app_uploads");

    // 2. Save metadata to MongoDB
    const newFile = await File.create({
      url: cloudRes.secure_url,
      publicId: cloudRes.public_id,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadedBy: (req as any).user.id,
    });

    res.status(201).json(newFile);
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Upload failed", error });
  }
};

/**
 * 🔹 Get All Files
 */
export const getFiles = async (_req: Request, res: Response) => {
  try {
    const files = await File.find().sort({ createdAt: -1 });
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: "Error fetching files" });
  }
};

/**
 * 🔹 View/Download File
 * Since Cloudinary handles delivery via URL, "viewing" is usually done
 * by the frontend using the URL. This endpoint now redirects to the URL.
 */
export const viewFile = async (req: Request, res: Response) => {
  const file = await File.findById(req.params.id);
  if (!file) return res.status(404).json({ message: "File not found" });

  // Simply redirect to the Cloudinary URL
  res.redirect(file.url);
};

/**
 * 🔹 Delete File from Cloudinary and DB
 */
export const deleteFile = async (req: Request, res: Response) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ message: "File not found" });

    // 1. Delete from Cloudinary using the publicId
    await cloudinary.uploader.destroy(file.publicId);

    // 2. Delete from MongoDB
    await file.deleteOne();

    res.json({ message: "File deleted successfully from cloud and database" });
  } catch (error) {
    res.status(500).json({ message: "Deletion failed", error });
  }
};

// Add this to controllers/file.controller.ts

/**
 * 🔹 Download File
 * Generates a Cloudinary URL that forces a download
 */
export const downloadFile = async (req: Request, res: Response) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ message: "File not found" });

    // Use Cloudinary's private_download or simply add the attachment flag to the URL
    // This creates a version of the URL that triggers a 'Save As' dialog
    const downloadUrl = cloudinary.utils.private_download_url(
      file.publicId,
      file.mimetype.split("/")[1],
      {
        attachment: true,
      },
    );

    // Alternatively, for simple images, you can just append 'fl_attachment' to the URL path:
    const forcedDownloadUrl = file.url.replace(
      "/upload/",
      "/upload/fl_attachment/",
    );

    res.redirect(forcedDownloadUrl);
  } catch (error) {
    res.status(500).json({ message: "Download failed", error });
  }
};
