import { Request, Response } from "express";
import Notice from "../models/noticeModel";
import { AuthRequest } from "../middlewares/authMiddleware";
import { uploadToCloudinary } from "../config/cloudinary";

// Helper to handle error messages safely
const getErrorMessage = (error: unknown) => 
  error instanceof Error ? error.message : "Internal Server Error";

// ----------------- CREATE NOTICE (ADMIN) -----------------
export const createNotice = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const { title, description, type, isUrgent } = req.body;

    // Upload file to Cloudinary
    const upload = await uploadToCloudinary(req.file, "notices");

    const notice = await Notice.create({
      title,
      description,
      fileUrl: upload.secure_url,
      fileName: upload.original_filename || req.file.originalname,
      fileSize: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
      type,
      isUrgent: isUrgent === 'true' || isUrgent === true, // Handle stringified booleans from FormData
      createdBy: userId,
    });

    res.status(201).json(notice);
  } catch (error) {
    res.status(500).json({ message: "Failed to create notice", error: getErrorMessage(error) });
  }
};

// ----------------- GET ALL NOTICES (ADMIN/INTERNAL) -----------------
export const getNotices = async (req: AuthRequest, res: Response) => {
  try {
    const { type, search } = req.query;
    let query: any = {};

    if (type && type !== "ALL") query.type = type;
    if (search) query.title = { $regex: search, $options: "i" };

    const notices = await Notice.find(query)
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email") // Optional: see who created it
      .lean();

    res.json(notices);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notices", error: getErrorMessage(error) });
  }
};

// ----------------- UPDATE NOTICE (ADMIN) -----------------
export const updateNotice = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, type, isUrgent } = req.body;
    
    const notice = await Notice.findById(id);
    if (!notice) return res.status(404).json({ message: "Notice not found" });

    // Handle File Update
    if (req.file) {
      const upload = await uploadToCloudinary(req.file, "notices");
      notice.fileUrl = upload.secure_url;
      notice.fileName = upload.original_filename || req.file.originalname;
      notice.fileSize = `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`;
    }

    // Update fields only if provided
    if (title) notice.title = title;
    if (description) notice.description = description;
    if (type) notice.type = type;
    if (isUrgent !== undefined) notice.isUrgent = isUrgent === 'true' || isUrgent === true;

    const updatedNotice = await notice.save();
    res.json(updatedNotice);
  } catch (error) {
    res.status(500).json({ message: "Failed to update notice", error: getErrorMessage(error) });
  }
};

// ----------------- DELETE NOTICE (ADMIN) -----------------
export const deleteNotice = async (req: AuthRequest, res: Response) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id);
    if (!notice) return res.status(404).json({ message: "Notice not found" });

    // Logic for deleting from Cloudinary could go here if needed
    
    res.json({ message: "Notice deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete notice", error: getErrorMessage(error) });
  }
};

// noticeController.ts

// 1. GET SINGLE NOTICE
export const getNoticeById = async (req: AuthRequest, res: Response) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ message: "Notice not found" });

    notice.views += 1;
    await notice.save();
    res.json(notice);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notice" });
  }
};

// 2. DOWNLOAD NOTICE
export const downloadNotice = async (req: AuthRequest, res: Response) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ message: "Notice not found" });

    notice.downloads += 1;
    await notice.save();
    res.json({ url: notice.fileUrl });
  } catch (error) {
    res.status(500).json({ message: "Download count update failed" });
  }
};

// ----------------- PUBLIC CONTROLLERS -----------------

export const getPublicNotices = async (req: Request, res: Response) => {
  try {
    const { type, search } = req.query;
    let query: any = {};

    if (type && type !== "ALL") query.type = type;
    if (search) query.title = { $regex: search, $options: "i" };

    const notices = await Notice.find(query)
      .sort({ isUrgent: -1, createdAt: -1 })
      .select("-__v -updatedAt")
      .lean();

    res.status(200).json(notices);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch public notices", error: getErrorMessage(error) });
  }
};

export const getPublicNoticeById = async (req: Request, res: Response) => {
  try {
    // findByIdAndUpdate is more atomic for view increments
    const notice = await Notice.findByIdAndUpdate(
      req.params.id, 
      { $inc: { views: 1 } }, 
      { new: true }
    ).select("-__v");

    if (!notice) return res.status(404).json({ message: "Notice not found" });

    res.status(200).json(notice);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notice details" });
  }
};