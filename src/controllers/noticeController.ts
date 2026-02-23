import { Response } from "express";
import Notice from "../models/noticeModel";
import { AuthRequest } from "../middlewares/authMiddleware";
import { uploadToCloudinary } from "../config/cloudinary";

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
      fileName: upload.original_filename,
      fileSize: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`,
      type,
      isUrgent,
      createdBy: userId,
    });

    res.status(201).json(notice);
  } catch (error) {
    res.status(500).json({ message: "Failed to create notice", error });
  }
};

// ----------------- GET ALL NOTICES (PUBLIC / JUDGE) -----------------
export const getNotices = async (req: AuthRequest, res: Response) => {
  try {
    const { type, search } = req.query;

    let query: any = {};

    if (type && type !== "ALL") {
      query.type = type;
    }

    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    const notices = await Notice.find(query).sort({ publishDate: -1 }).lean();

    res.json(notices);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notices", error });
  }
};

// ----------------- GET SINGLE NOTICE -----------------
export const getNoticeById = async (req: AuthRequest, res: Response) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) return res.status(404).json({ message: "Notice not found" });

    // increment views
    notice.views += 1;
    await notice.save();

    res.json(notice);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch notice", error });
  }
};

// ----------------- DOWNLOAD NOTICE (increment downloads) -----------------
export const downloadNotice = async (req: AuthRequest, res: Response) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ message: "Notice not found" });

    notice.downloads += 1;
    await notice.save();

    res.json({ url: notice.fileUrl });
  } catch (error) {
    res.status(500).json({ message: "Download failed", error });
  }
};

// ----------------- UPDATE NOTICE (ADMIN) -----------------
export const updateNotice = async (req: AuthRequest, res: Response) => {
  try {
    const notice = await Notice.findById(req.params.id);
    if (!notice) return res.status(404).json({ message: "Notice not found" });

    const { title, description, type, isUrgent } = req.body;

    if (req.file) {
      const upload = await uploadToCloudinary(req.file, "notices");
      notice.fileUrl = upload.secure_url;
      notice.fileName = upload.original_filename;
      notice.fileSize = `${(req.file.size / 1024 / 1024).toFixed(2)} MB`;
    }

    notice.title = title ?? notice.title;
    notice.description = description ?? notice.description;
    notice.type = type ?? notice.type;
    notice.isUrgent = isUrgent ?? notice.isUrgent;

    await notice.save();

    res.json(notice);
  } catch (error) {
    res.status(500).json({ message: "Failed to update notice", error });
  }
};

// ----------------- DELETE NOTICE (ADMIN) -----------------
export const deleteNotice = async (req: AuthRequest, res: Response) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id);
    if (!notice) return res.status(404).json({ message: "Notice not found" });

    res.json({ message: "Notice deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete notice", error });
  }
};
