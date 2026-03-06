// src/controllers/guest.controller.ts

import { Request, Response } from "express";
import { User } from "../models/user.model";
import { AuthRequest } from "../middlewares/authMiddleware";

/* =====================================
   👁️ GUEST — VIEW OWN PROFILE (READ ONLY)
===================================== */
export const getGuestProfile = async (req: AuthRequest, res: Response) => {
  const guest = await User.findById(req.user!.id).select("-password");

  if (!guest || guest.role !== "guest") {
    return res.status(404).json({
      success: false,
      message: "Guest not found",
    });
  }

  return res.status(200).json({
    success: true,
    guest,
  });
};

/* =====================================
   👁️ GUEST — READ ONLY DATA
   (example registry viewing)
===================================== */
export const guestViewRegistry = async (_: AuthRequest, res: Response) => {
  // Replace with your actual data source
  const data = {
    message: "Guests can only view data",
  };

  return res.status(200).json({
    success: true,
    data,
  });
};

/* =====================================
   🧾 ADMIN — CREATE GUEST
===================================== */
export const createGuest = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: "User already exists",
    });
  }

  const guest = await User.create({
    name,
    email,
    password,
    role: "guest",
    isVerified: true,
    needsPasswordReset: true,
  });

  return res.status(201).json({
    success: true,
    message: "Guest created successfully",
    guest,
  });
};

/* =====================================
   🧾 ADMIN — GET ALL GUESTS
===================================== */
export const getAllGuests = async (_: Request, res: Response) => {
  const guests = await User.find({ role: "guest" }).select("-password");

  return res.status(200).json({
    success: true,
    guests,
  });
};

/* =====================================
   ❌ ADMIN — REMOVE GUEST
===================================== */
export const deleteGuest = async (req: Request, res: Response) => {
  const guest = await User.findOneAndDelete({
    _id: req.params.id,
    role: "guest",
  });

  if (!guest) {
    return res.status(404).json({
      success: false,
      message: "Guest not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Guest removed successfully",
  });
};
