import { Request, Response } from "express";
import SwearingPreference from "../models/SwearingPreference";

/* =========================================================
   USER CONTROLLERS
========================================================= */

/* ================= CREATE OR UPDATE ================= */
export const saveSwearingPreference = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { ceremonyChoice, religiousText } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (ceremonyChoice === "oath" && !religiousText) {
      return res.status(400).json({
        message: "Religious text is required when choosing oath.",
      });
    }

    const preference = await SwearingPreference.findOneAndUpdate(
      { user: userId },
      {
        ceremonyChoice,
        religiousText: ceremonyChoice === "oath" ? religiousText : undefined,
      },
      { new: true, upsert: true },
    );

    res.status(200).json(preference);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

/* ================= GET MY PREFERENCE ================= */
export const getMySwearingPreference = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const preference = await SwearingPreference.findOne({
      user: userId,
    }).populate("user", "name email");

    res.status(200).json(preference);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

/* =========================================================
   ADMIN CONTROLLERS
   (Require admin middleware in routes)
========================================================= */

/* ================= GET ALL PREFERENCES ================= */
export const getAllSwearingPreferences = async (
  req: Request,
  res: Response,
) => {
  try {
    const preferences = await SwearingPreference.find()
      .populate("user", "name email role")
      .sort({ createdAt: -1 });

    res.status(200).json(preferences);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

/* ================= GET SINGLE USER PREFERENCE ================= */
export const getSwearingPreferenceByUser = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = req.params;

    const preference = await SwearingPreference.findOne({
      user: userId,
    }).populate("user", "name email role");

    if (!preference) {
      return res.status(404).json({
        message: "Swearing preference not found for this user.",
      });
    }

    res.status(200).json(preference);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

/* ================= ADMIN UPDATE USER PREFERENCE ================= */
export const adminUpdateSwearingPreference = async (
  req: Request,
  res: Response,
) => {
  try {
    const { userId } = req.params;
    const { ceremonyChoice, religiousText } = req.body;

    if (ceremonyChoice === "oath" && !religiousText) {
      return res.status(400).json({
        message: "Religious text is required when choosing oath.",
      });
    }

    const preference = await SwearingPreference.findOneAndUpdate(
      { user: userId },
      {
        ceremonyChoice,
        religiousText: ceremonyChoice === "oath" ? religiousText : undefined,
      },
      { new: true },
    );

    if (!preference) {
      return res.status(404).json({
        message: "Preference not found.",
      });
    }

    res.status(200).json(preference);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

/* ================= DELETE USER PREFERENCE ================= */
export const deleteSwearingPreference = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const deleted = await SwearingPreference.findOneAndDelete({
      user: userId,
    });

    if (!deleted) {
      return res.status(404).json({
        message: "Preference not found.",
      });
    }

    res.status(200).json({
      message: "Swearing preference deleted successfully.",
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};
