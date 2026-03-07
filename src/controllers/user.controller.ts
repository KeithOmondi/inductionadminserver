import { Request, Response } from "express";
import { User } from "../models/user.model";
import { AuthRequest } from "../middlewares/authMiddleware";

export const getProfile = async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.id).select("-password");
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }
  return res.status(200).json({ success: true, user });
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  const updates = {
    name: req.body.name,
    email: req.body.email,
  };

  const user = await User.findByIdAndUpdate(req.user!.id, updates, {
    new: true,
    runValidators: true,
  }).select("-password");

  return res.status(200).json({ success: true, user });
};

/* =====================================
   🧾 ADMIN — GET ALL USERS
===================================== */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });

    // Explicitly return an empty array if no users exist to avoid frontend 'map' errors
    return res.status(200).json({
      success: true,
      count: users.length,
      users: users || [],
    });
  } catch (err: any) {
    return res
      .status(500)
      .json({ success: false, message: "Registry retrieval failed" });
  }
};

/* =====================================
   🔎 ADMIN — GET USER BY ID
===================================== */
export const getUserById = async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });
  return res.status(200).json({ success: true, user });
};

/* =====================================
   ➕ ADMIN — CREATE NEW USER
===================================== */
export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password required",
      });
    }

    if (!["admin", "judge", "guest"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be admin, judge, or guest",
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already in use" });
    }

    // ✅ Let the schema hook handle password hashing
    const newUser = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password, // plain password, hashed automatically
      role,
      isActive: true,
      loginAttempts: 0,
      needsPasswordReset: false,
    });

    return res.status(201).json({
      success: true,
      user: { ...newUser.toObject(), password: undefined },
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to create user",
    });
  }
};

/* =====================================
   🛠 ADMIN — UPDATE USER (ROLE / STATUS)
===================================== */
export const updateUser = async (req: Request, res: Response) => {
  try {
    const allowedUpdates: any = {};
    if (req.body.name) allowedUpdates.name = req.body.name;
    if (req.body.email) allowedUpdates.email = req.body.email;
    if (req.body.role && ["admin", "judge", "guest"].includes(req.body.role))
      allowedUpdates.role = req.body.role;
    if (req.body.isActive !== undefined)
      allowedUpdates.isActive = req.body.isActive;

    const user = await User.findByIdAndUpdate(req.params.id, allowedUpdates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });

    return res.status(200).json({ success: true, user });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to update user",
    });
  }
};

/* =====================================
   ❌ ADMIN — DELETE USER
===================================== */
export const deleteUser = async (req: Request, res: Response) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });
  return res
    .status(200)
    .json({ success: true, message: "User deleted successfully" });
};

/* =====================================
   🔔 SUBSCRIBE TO WEB PUSH
===================================== */
export const subscribeToPush = async (req: AuthRequest, res: Response) => {
  try {
    const { subscription } = req.body;
    const userId = req.user!.id;

    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ message: "Invalid subscription object" });
    }

    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { webPushSubscriptions: subscription } },
      { returnDocument: "after" },
    );

    return res.status(200).json({ message: "Secure Registry alerts enabled." });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Failed to link browser to Registry" });
  }
};
