import { Request, Response } from "express";
import JudgeGuest from "../models/judgeGuest";
import { AuthRequest } from "../middlewares/authMiddleware";

const MAX_GUESTS = 5;

/* =====================================================
   CREATE OR SAVE AS DRAFT (UPSERT)
===================================================== */
export const saveGuestList = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { guests } = req.body;

    if (guests && guests.length > MAX_GUESTS) {
      return res.status(400).json({
        message: `Maximum of ${MAX_GUESTS} guests allowed.`,
      });
    }

    const guestList = await JudgeGuest.findOneAndUpdate(
      { user: userId },
      {
        guests,
        status: "DRAFT",
      },
      {
        upsert: true,
        new: true,
        runValidators: false, // Draft should not enforce strict validation
      }
    );

    res.status(200).json(guestList);
  } catch (err) {
    res.status(500).json({
      message: "Failed to save guest list",
      error: err,
    });
  }
};

/* =====================================================
   SUBMIT GUEST LIST (STRICT VALIDATION)
===================================================== */
export const submitGuestList = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { guests } = req.body;

    if (!guests || guests.length === 0) {
      return res.status(400).json({
        message: "You must add at least one guest before submitting.",
      });
    }

    if (guests.length > MAX_GUESTS) {
      return res.status(400).json({
        message: `Maximum of ${MAX_GUESTS} guests allowed.`,
      });
    }

    const guestList = await JudgeGuest.findOneAndUpdate(
      { user: userId },
      {
        guests,
        status: "SUBMITTED",
      },
      {
        upsert: true,
        new: true,
        runValidators: true, // 🔥 Enforce strict validation here
      }
    );

    res.status(200).json({
      message: "Guest list submitted successfully",
      data: guestList,
    });
  } catch (err: any) {
    res.status(400).json({
      message: err.message || "Submission failed",
    });
  }
};

/* =====================================================
   GET MY GUEST LIST
===================================================== */
export const getMyGuestList = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const guestList = await JudgeGuest.findOne({ user: userId });

    if (!guestList) {
      return res.status(404).json({ message: "No guest list found" });
    }

    res.json(guestList);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch guest list",
      error: err,
    });
  }
};

/* =====================================================
   ADD MORE GUESTS (AFTER SUBMISSION ALLOWED)
===================================================== */
export const addGuests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { guests } = req.body; // new guests to add

    const existing = await JudgeGuest.findOne({ user: userId });

    if (!existing) {
      return res.status(404).json({ message: "No guest list found" });
    }

    const totalGuests = existing.guests.length + guests.length;

    if (totalGuests > MAX_GUESTS) {
      return res.status(400).json({
        message: `You can only have a maximum of ${MAX_GUESTS} guests.`,
      });
    }

    existing.guests.push(...guests);

    // If already submitted, keep it submitted
    await existing.save();

    res.json({
      message: "Guests added successfully",
      data: existing,
    });
  } catch (err: any) {
    res.status(400).json({
      message: err.message || "Failed to add guests",
    });
  }
};

/* =====================================================
   DELETE MY GUEST LIST (ONLY IF DRAFT)
===================================================== */
export const deleteGuestList = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const existing = await JudgeGuest.findOne({ user: userId });

    if (!existing)
      return res.status(404).json({ message: "No guest list found" });

    if (existing.status === "SUBMITTED") {
      return res.status(400).json({
        message: "Cannot delete a submitted guest list.",
      });
    }

    await existing.deleteOne();

    res.json({ message: "Guest list deleted successfully" });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete guest list",
      error: err,
    });
  }
};

/* =====================================================
   ADMIN: GET ALL GUEST LISTS
===================================================== */
export const getAllGuestLists = async (_req: Request, res: Response) => {
  try {
    const guestLists = await JudgeGuest.find().populate(
      "user",
      "name email role"
    );

    res.json(guestLists);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch guest lists",
      error: err,
    });
  }
};
