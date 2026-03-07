import { Response } from "express";
import { Gallery } from "../models/gallery.model";
import { AuthRequest } from "../middlewares/authMiddleware";
import cloudinary, { uploadToCloudinary } from "../config/cloudinary";

// -------------------- Upload media - admin only --------------------
export const uploadMedia = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Only admins can upload media" });
    }

    const { title, description, category } = req.body;
    if (!req.file) return res.status(400).json({ message: "No file provided" });

    const folder = category === "evidence" ? "gallery/evidence" : "gallery/general";
    const result = await uploadToCloudinary(req.file, folder);

    const media = await Gallery.create({
      title,
      description,
      category,
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type, // 'image' or 'video'
      uploadedBy: req.user!.id,
    });

    return res.status(201).json(media);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

// -------------------- Fetch gallery - all roles --------------------
export const getGallery = async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    
    const media = await Gallery.find(filter)
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name role");
      
    return res.status(200).json(media);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

// -------------------- Admin fetch gallery - admin only --------------------
export const getGalleryAdmin = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Only admins can access this endpoint" });
    }

    const { category } = req.query;
    const filter = category ? { category } : {};
    
    const media = await Gallery.find(filter)
      .sort({ createdAt: -1 })
      .populate("uploadedBy", "name email role"); // admins get email too

    return res.status(200).json(media);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

// -------------------- Delete media - admin only --------------------
export const deleteMedia = async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role !== "admin") {
      return res.status(403).json({ message: "Only admins can delete media" });
    }

    const { id } = req.params;
    const media = await Gallery.findById(id);

    if (!media) return res.status(404).json({ message: "Media not found" });

    await cloudinary.uploader.destroy(media.publicId, {
      resource_type: media.resourceType,
    });

    await media.deleteOne();

    return res.status(200).json({ message: "Media deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};
