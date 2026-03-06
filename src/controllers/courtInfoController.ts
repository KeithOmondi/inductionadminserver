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
      // Sort primarily by 'order' ascending
      Division.find().sort({ order: 1, createdAt: -1 }),
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
    const { name, title, description, body, order } = req.body;
    const contentItems = [];

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
      contentItems.push({ type: "TEXT", body });
    }

    // Auto-calculate order if not provided
    let finalOrder = order;
    if (finalOrder === undefined) {
      const lastDiv = await Division.findOne().sort({ order: -1 });
      finalOrder = lastDiv ? (lastDiv.order || 0) + 1 : 0;
    }

    const division = await Division.create({
      name,
      title,
      description,
      content: contentItems,
      order: finalOrder
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
    const { name, title, description, body, order, swapWith } = req.body;

    const division = await Division.findById(id);
    if (!division)
      return res.status(404).json({ message: "Division not found" });

    // --- REORDERING LOGIC (Up/Down Drag/Button) ---
    if (swapWith) {
      const targetDivision = await Division.findById(swapWith);
      if (targetDivision) {
        const currentOrder = division.order || 0;
        const targetOrder = targetDivision.order || 0;

        division.order = targetOrder;
        targetDivision.order = currentOrder;

        // Save both before returning
        await Promise.all([division.save(), targetDivision.save()]);
        
        // Return full list so Redux can replace the whole divisions array
        const allDivisions = await Division.find().sort({ order: 1, createdAt: -1 });
        return res.json({ message: "Reordered", divisions: allDivisions });
      }
    }

    // Update Metadata
    if (name) division.name = name;
    if (title) division.title = title;
    if (description) division.description = description;
    if (order !== undefined) division.order = order;

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

//GUEST CONTROLLER
/* =====================================================
    PUBLIC COURT DATA (READ ONLY)
===================================================== */
/* =====================================================
    PUBLIC COURT DATA (READ ONLY)
===================================================== */
export const getPublicCourtInfo = async (_req: Request, res: Response) => {
  try {
    const [divisions, faqs, contacts] = await Promise.all([
      // Ensure we get the full 'content' array which contains the IMAGE/VIDEO URLs
      Division.find()
        .select("-__v") 
        .sort({ order: 1, createdAt: -1 }),

      FAQ.find()
        .select("-__v")
        .sort({ createdAt: -1 }),

      Contact.find()
        .select("-__v")
        .sort({ title: 1 }),
    ]);

    // Flattened response to match what the frontend expects
    res.status(200).json({
      divisions, // Now contains: name, title, description, content (media), etc.
      faqs,
      contacts,
    });
  } catch (err: any) {
    res.status(500).json({
      message: "Failed to fetch public court information",
      error: err.message,
    });
  }
};

/* =====================================================
    PUBLIC INDIVIDUAL ENDPOINTS
===================================================== */

export const getPublicDivisions = async (_req: Request, res: Response) => {
  try {
    // Explicitly ensuring we don't accidentally filter out the media content
    const divisions = await Division.find()
      .select("-__v")
      .sort({ order: 1, createdAt: -1 });

    res.json(divisions); // Return flat array
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getPublicFAQs = async (_req: Request, res: Response) => {
  try {
    const faqs = await FAQ.find()
      .select("-__v")
      .sort({ createdAt: -1 });

    res.json({ success: true, data: faqs });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const getPublicContacts = async (_req: Request, res: Response) => {
  try {
    const contacts = await Contact.find()
      .select("-__v")
      .sort({ title: 1 });

    res.json({ success: true, data: contacts });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/* =====================================================
    FAQs & CONTACTS (Generic Handlers)
===================================================== */
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