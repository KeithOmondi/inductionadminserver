import { Request, Response } from "express";
import Division from "../models/divisionModel";
import FAQ from "../models/faqModel";
import Contact from "../models/contactModel";
import { uploadToCloudinary } from "../config/cloudinary";

/* =====================================================
    READ ALL (Unified Court Data)
===================================================== */
export const getCourtInfo = async (_req: Request, res: Response) => {
  try {
    const [divisions, faqs, contacts] = await Promise.all([
      Division.find().sort({ createdAt: -1 }),
      FAQ.find().sort({ createdAt: -1 }),
      Contact.find().sort({ title: 1 }),
    ]);
    res.json({ divisions, faqs, contacts });
  } catch (err: any) {
    res
      .status(500)
      .json({ message: "Failed to fetch registry data", error: err.message });
  }
};

/* =====================================================
    DIVISIONS (Handles Person Info & Media)
===================================================== */
export const createDivision = async (req: Request, res: Response) => {
  try {
    const { name, title, description, body } = req.body;
    const contentItems = [];

    // Handle File Upload if present
    if (req.file) {
      const result = await uploadToCloudinary(req.file, "court_divisions");
      const mime = req.file.mimetype;

      const type = mime.startsWith("video")
        ? "VIDEO"
        : mime.startsWith("image")
          ? "IMAGE"
          : "FILE";

      contentItems.push({
        type,
        url: result.secure_url,
        publicId: result.public_id,
        fileName: req.file.originalname,
        body: body || "",
        thumbnailUrl:
          type === "VIDEO" ? result.eager?.[0]?.secure_url : undefined,
      });
    } else if (body) {
      // Text-only entry
      contentItems.push({ type: "TEXT", body });
    }

    const division = await Division.create({
      name,
      title,
      description,
      content: contentItems,
    });

    res.status(201).json(division);
  } catch (err: any) {
    res
      .status(500)
      .json({ message: "Failed to create division entry", error: err.message });
  }
};

export const updateDivision = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, title, description, body } = req.body;

    const division = await Division.findById(id);
    if (!division)
      return res.status(404).json({ message: "Division not found" });

    // Update Core Metadata
    if (name) division.name = name;
    if (title) division.title = title;
    if (description) division.description = description;

    // Handle new text-body updates or file updates
    if (body || req.file) {
      if (req.file) {
        const result = await uploadToCloudinary(req.file, "court_divisions");
        const isVideo = req.file.mimetype.startsWith("video");

        division.content.push({
          type: isVideo ? "VIDEO" : "IMAGE",
          url: result.secure_url,
          publicId: result.public_id,
          fileName: req.file.originalname,
          body: body || "",
          thumbnailUrl: isVideo ? result.eager?.[0]?.secure_url : undefined,
          createdAt: new Date(),
        });
      } else if (body) {
        // If just body is sent, we update the first content item or push a new one
        if (division.content.length > 0) {
          division.content[0].body = body;
        } else {
          division.content.push({ type: "TEXT", body, createdAt: new Date() });
        }
      }
    }

    await division.save();
    res.json(division);
  } catch (err: any) {
    res.status(500).json({ message: "Update failed", error: err.message });
  }
};

export const deleteDivision = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const division = await Division.findByIdAndDelete(id);
    if (!division)
      return res.status(404).json({ message: "Division not found" });
    res.json({ message: "Division deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ message: "Deletion failed", error: err.message });
  }
};

/* =====================================================
    FAQs & CONTACTS (Generic Handlers)
===================================================== */

// Helper to handle simple CRUD to keep file clean
const handleSimpleAction =
  (Model: any, action: "create" | "update" | "delete") =>
  async (req: Request, res: Response) => {
    try {
      let data;
      if (action === "create") data = await Model.create(req.body);
      if (action === "update")
        data = await Model.findByIdAndUpdate(req.params.id, req.body, {
          new: true,
        });
      if (action === "delete")
        data = await Model.findByIdAndDelete(req.params.id);

      if (!data && action !== "create")
        return res.status(404).json({ message: "Item not found" });
      res.json(data || { message: "Deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ message: "Action failed", error: err.message });
    }
  };

export const createFAQ = handleSimpleAction(FAQ, "create");
export const updateFAQ = handleSimpleAction(FAQ, "update");
export const deleteFAQ = handleSimpleAction(FAQ, "delete");

export const createContact = handleSimpleAction(Contact, "create");
export const updateContact = handleSimpleAction(Contact, "update");
export const deleteContact = handleSimpleAction(Contact, "delete");
