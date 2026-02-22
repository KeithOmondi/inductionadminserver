// src/controllers/user.controller.ts

import { Request, Response } from "express";
import { User } from "../models/user.model";

/* =====================================
   👤 GET CURRENT USER PROFILE
===================================== */
export const getProfile = async (req: any, res: Response) => {
  const user = await User.findById(req.user._id).select("-password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
    success: true,
    user,
  });
};

/* =====================================
   ✏️ UPDATE CURRENT USER PROFILE
===================================== */
export const updateProfile = async (req: any, res: Response) => {
  const updates = {
    name: req.body.name,
    email: req.body.email,
  };

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  }).select("-password");

  return res.status(200).json({
    success: true,
    user,
  });
};

/* =====================================
   🧾 ADMIN — GET ALL USERS
===================================== */
export const getAllUsers = async (_: Request, res: Response) => {
  const users = await User.find().select("-password");

  return res.status(200).json({
    success: true,
    users,
  });
};

/* =====================================
   🔎 ADMIN — GET USER BY ID
===================================== */
export const getUserById = async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
    success: true,
    user,
  });
};

/* =====================================
   🛠 ADMIN — UPDATE USER (ROLE / STATUS)
===================================== */
export const updateUser = async (req: Request, res: Response) => {
  const user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
    success: true,
    user,
  });
};

/* =====================================
   ❌ ADMIN — DELETE USER
===================================== */
export const deleteUser = async (req: Request, res: Response) => {
  const user = await User.findByIdAndDelete(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  return res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
};
