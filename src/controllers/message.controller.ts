import { Response } from "express";
import { Message } from "../models/message.model";
import { Group } from "../models/group.model";
import mongoose from "mongoose";
import { getIO } from "../socket";
import { isUserOnline } from "../socket/presence";
import { getFCMTokensForUsers, sendPushNotification } from "../services/push.service";
import * as admin from "firebase-admin"; // ✅ this works for TS
import { User } from "../models/user.model";
import { uploadToCloudinary } from "../config/cloudinary";

const GUEST_DAILY_LIMIT = 5;

/**
 * Updated Helper: Upload Image 
 * Now uses our robust centralized Cloudinary utility
 */
const uploadImage = async (file: Express.Multer.File): Promise<string> => {
  try {
    // We pass the file and the specific folder name
    const result = await uploadToCloudinary(file, "messages");
    
    // We return the secure_url (optimized by our config's transformations)
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw new Error("Failed to upload image to cloud storage");
  }
};

/* ============================================================
   USER SEND MESSAGE (Strengthened)
============================================================ */
export const sendMessage = async (req: any, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const senderId: string = req.user.id;
    const senderRole: string = req.user.role;
    const { receiver, group, text } = req.body;

    if (!receiver && !group) return res.status(400).json({ message: "Receiver or group required" });

    // PEER-TO-PEER RESTRICTION
    if (receiver && senderRole !== "admin") {
      const targetUser = await User.findById(receiver).select("role").lean();
      if (!targetUser || targetUser.role !== "admin") {
        return res.status(403).json({ message: "Correspondence restricted to Admin contact." });
      }
    }

    // GROUP VALIDATION
    let groupMembers: string[] = [];
    if (group) {
      const groupDoc = await Group.findById(group).select("members isActive").lean();
      if (!groupDoc || !groupDoc.isActive) return res.status(404).json({ message: "Group inactive" });
      if (!groupDoc.members.some((m) => m.toString() === senderId)) return res.status(403).json({ message: "Unauthorized access to group" });
      groupMembers = groupDoc.members.map((m) => m.toString());
    }

    // GUEST LIMITS
    if (senderRole === "guest") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const count = await Message.countDocuments({ sender: senderId, createdAt: { $gte: today } });
      if (count >= GUEST_DAILY_LIMIT) return res.status(429).json({ message: "Daily record limit reached" });
    }

    let imageUrl: string | undefined;
    if (req.file) imageUrl = await uploadImage(req.file);

    const [newMessage] = await Message.create(
      [{
        sender: senderId,
        receiver,
        group,
        text,
        imageUrl,
        senderType: senderRole,
        readBy: [senderId],
        deliveryStatus: "sent",
      }],
      { session }
    );

    await session.commitTransaction();

    // Standardize the output: Same as Admin version
    const message = await Message.findById(newMessage._id)
      .populate("sender", "name role")
      .lean();

    if (!message) throw new Error("Processing failed");

    const io = getIO();
    
    if (group) {
      io.to(group).emit("message:new", message); 
      const offline = groupMembers.filter(id => id !== senderId && !isUserOnline(id));
      if (offline.length) {
        const tokens = await getFCMTokensForUsers(offline);
        if (tokens.length) {
          await admin.messaging().sendEachForMulticast({
            tokens,
            notification: { title: `New Registry Post`, body: text || "Attachment" },
            data: { messageId: message._id.toString(), groupId: group },
          });
        }
      }
    } else if (receiver) {
      io.to(receiver).emit("message:new", message);
      io.to(senderId).emit("message:sent", message);

      if (isUserOnline(receiver)) {
        await Message.findByIdAndUpdate(message._id, { deliveryStatus: "delivered" });
      } else {
        sendPushNotification(receiver, "New Official Correspondence", text || "Attachment", { 
          messageId: message._id.toString() 
        });
      }
    }

    return res.status(201).json(message);
  } catch (err: any) {
    await session.abortTransaction();
    return res.status(500).json({ message: err.message || "Failed to record message" });
  } finally {
    session.endSession();
  }
};

/* ================================
   EDIT MESSAGE (Typo Correction)
================================ */
export const editMessage = async (req: any, res: Response) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    const message = await Message.findOne({ _id: messageId, sender: userId });
    if (!message) return res.status(404).json({ message: "Message not found/unauthorized" });

    // Restrict editing to within 1 hour
    const expiry = 60 * 60 * 1000;
    if (Date.now() - new Date(message.createdAt).getTime() > expiry) {
      return res.status(400).json({ message: "Edit window expired" });
    }

    message.text = text;
    message.isEdited = true; 
    await message.save();

    const updatedMsg = await Message.findById(messageId).populate("sender", "name role");
    
    // Notify participants
    const io = getIO();
    if (message.group) io.to(message.group.toString()).emit("message:updated", updatedMsg);
    else io.to(message.receiver!.toString()).emit("message:updated", updatedMsg);

    return res.status(200).json(updatedMsg);
  } catch {
    return res.status(500).json({ message: "Edit failed" });
  }
};

/* ================================
   GET MESSAGES (Includes Population)
================================ */
export const getMessages = async (req: any, res: Response) => {
  try {
    const { receiver, group } = req.query;
    const userId = req.user.id;
    const query: any = { isDeleted: false };

    if (group) {
      query.group = group;
    } else if (receiver) {
      query.group = { $exists: false };
      query.$or = [
        { sender: userId, receiver },
        { sender: receiver, receiver: userId },
      ];
    }

    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .populate("sender", "name role") // Standardizes the sender object
      .lean();

    // Production check: If a sender was deleted, the population might be null.
    // We filter or handle that to prevent frontend crashes.
    const cleanMessages = messages.map(msg => ({
      ...msg,
      // Ensure sender is always an object or at least has an ID string
      sender: msg.sender || { _id: "deleted_user", name: "Unknown" }
    }));

    return res.status(200).json(cleanMessages);
  } catch (err) {
    return res.status(500).json({ message: "Fetch failed" });
  }
};


// ... (previous sendMessage and getMessages code)

export const markAsRead = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    await Message.findByIdAndUpdate(messageId, {
      $addToSet: { readBy: userId },
    });
    return res.status(200).json({ message: "Read" });
  } catch {
    return res.status(500).json({ message: "Failed" });
  }
};

export const deleteMessage = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;
    const msg = await Message.findOne({ _id: messageId, sender: userId });
    if (!msg) return res.status(404).json({ message: "Not allowed" });
    msg.isDeleted = true;
    await msg.save();
    return res.status(200).json({ message: "Deleted" });
  } catch {
    return res.status(500).json({ message: "Failed" });
  }
};

export const getUserGroups = async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    const groups = await Group.find({ isActive: true, members: userId })
      .select("name description createdAt")
      .sort({ createdAt: -1 });
    return res.status(200).json(groups);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch groups" });
  }
};



/* ============================================================
   ADMIN CONTROLLERS
   These should be protected by an 'isAdmin' middleware
============================================================ */

/**
 * GET ALL MESSAGES (Global Monitor)
 * Allows admins to see all messages across the platform
 */
export const adminGetAllMessages = async (req: any, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 100;
    const { senderType, isDeleted } = req.query;

    const filter: any = {};
    if (senderType) filter.senderType = senderType;
    if (isDeleted !== undefined) filter.isDeleted = isDeleted === "true";

    const messages = await Message.find(filter)
      .populate("sender", "name email")
      .populate("receiver", "name email")
      .populate("group", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Message.countDocuments(filter);

    return res.status(200).json({
      total,
      page,
      pages: Math.ceil(total / limit),
      messages,
    });
  } catch (err) {
    console.error("AdminGetAllMessages Error:", err);
    return res.status(500).json({ message: "Admin: Failed to fetch all messages" });
  }
};

/**
 * HARD DELETE MESSAGE
 * Permanently removes a message from the database
 */
export const adminPermanentDelete = async (req: any, res: Response) => {
  try {
    const { messageId } = req.params;

    const deletedMessage = await Message.findByIdAndDelete(messageId);

    if (!deletedMessage) {
      return res.status(404).json({ message: "Message not found" });
    }

    return res.status(200).json({ message: "Message permanently purged" });
  } catch (err) {
    console.error("AdminPermanentDelete Error:", err);
    return res.status(500).json({ message: "Admin: Failed to purge message" });
  }
};

/**
 * GET SYSTEM STATS
 * Overview of message volume
 */
export const adminGetStats = async (req: any, res: Response) => {
  try {
    const stats = await Message.aggregate([
      { $group: { _id: "$senderType", count: { $sum: 1 } } },
    ]);

    const totalMessages = await Message.countDocuments();
    const deletedCount = await Message.countDocuments({ isDeleted: true });

    return res.status(200).json({
      totalMessages,
      deletedCount,
      byRole: stats,
    });
  } catch (err) {
    console.error("AdminGetStats Error:", err);
    return res.status(500).json({ message: "Admin: Failed to fetch stats" });
  }
};






/* =====================================================
   GROUP MANAGEMENT
===================================================== */

/**
 * CREATE GROUP (Admin Only)
 */
export const adminCreateGroup = async (req: any, res: Response) => {
  try {
    const adminId = req.user.id;
    const adminRole = req.user.role;
    const { name, description, members } = req.body;

    if (adminRole !== "admin") return res.status(403).json({ message: "Access denied. Admins only." });
    if (!name) return res.status(400).json({ message: "Group name is required" });

    const memberList = Array.isArray(members) ? members : [];
    if (!memberList.includes(adminId)) memberList.push(adminId);

    const newGroup = await Group.create({
      name,
      description,
      createdBy: adminId,
      members: memberList,
      isActive: true,
    });

    return res.status(201).json(newGroup);
  } catch (err) {
    console.error("AdminCreateGroup Error:", err);
    return res.status(500).json({ message: "Failed to create group" });
  }
};

/**
 * UPDATE GROUP (Admin Only)
 */
export const adminUpdateGroup = async (req: any, res: Response) => {
  try {
    const { groupId } = req.params;
    const updates = req.body;

    const group = await Group.findByIdAndUpdate(groupId, updates, { new: true });

    if (!group) return res.status(404).json({ message: "Group not found" });

    return res.status(200).json(group);
  } catch (err) {
    console.error("AdminUpdateGroup Error:", err);
    return res.status(500).json({ message: "Failed to update group" });
  }
};

/**
 * ADD MEMBERS TO GROUP (Admin Only)
 */
export const adminAddMembers = async (req: any, res: Response) => {
  try {
    const { groupId } = req.params;
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "An array of userIds is required" });
    }

    const group = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: { $each: userIds } } },
      { new: true },
    ).populate("members", "name email");

    if (!group) return res.status(404).json({ message: "Group not found" });

    return res.status(200).json({ message: "Members added successfully", group });
  } catch (err) {
    console.error("AdminAddMembers Error:", err);
    return res.status(500).json({ message: "Admin: Failed to add members" });
  }
};

/**
 * REMOVE MEMBER FROM GROUP (Admin Only)
 */
export const adminRemoveMember = async (req: any, res: Response) => {
  try {
    const { groupId, userId } = req.params;

    const group = await Group.findByIdAndUpdate(groupId, { $pull: { members: userId } }, { new: true });

    if (!group) return res.status(404).json({ message: "Group not found" });

    return res.status(200).json({ message: "Member removed", group });
  } catch (err) {
    console.error("AdminRemoveMember Error:", err);
    return res.status(500).json({ message: "Admin: Failed to remove member" });
  }
};

/**
 * GET ALL GROUPS (Admin Only)
 */
export const adminGetGroups = async (req: any, res: Response) => {
  try {
    const groups = await Group.find({ isActive: true })
      .populate("members", "name email role")
      .sort({ createdAt: -1 });

    return res.status(200).json(groups);
  } catch (err) {
    console.error("AdminGetGroups Error:", err);
    return res.status(500).json({ message: "Failed to fetch groups" });
  }
};



/* ============================================================
   ADMIN SEND MESSAGE (Strengthened)
============================================================ */
export const adminSendMessage = async (req: any, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const adminId = req.user.id;
    const { receiver, group, text } = req.body;

    if (!receiver && !group) return res.status(400).json({ message: "Receiver or group required" });

    let imageUrl: string | undefined;
    if (req.file) imageUrl = await uploadImage(req.file);

    const [newMessage] = await Message.create(
      [
        {
          sender: adminId,
          receiver: receiver || undefined,
          group: group || undefined,
          text,
          imageUrl,
          senderType: "admin",
          readBy: [adminId],
          deliveryStatus: "sent",
        },
      ],
      { session }
    );

    await session.commitTransaction();

    // Standardize the output: Populate and Lean
    const message = await Message.findById(newMessage._id)
      .populate("sender", "name role")
      .lean();

    if (!message) throw new Error("Message creation failed");

    const io = getIO();
    const chatId = group || receiver;

    // Emit standardized object
    io.to(chatId).emit("message:new", { ...message, chatId });

    // Handle offline notifications
    if (!group && receiver && !isUserOnline(receiver)) {
      sendPushNotification(receiver, "New Official Message", text || "Image attachment", { 
        messageId: message._id.toString(), 
        chatId 
      });
    }

    return res.status(201).json(message);
  } catch (err: any) {
    await session.abortTransaction();
    console.error("AdminSendMessage Error:", err);
    return res.status(500).json({ message: err.message || "Admin send failed" });
  } finally {
    session.endSession();
  }
};

/**
 * GET CHAT MESSAGES FOR SINGLE USER OR GROUP
 */
export const adminGetChatMessages = async (req: any, res: Response) => {
  try {
    const adminId = req.user.id;
    const { receiverId, groupId, page = 1, limit = 50 } = req.query;

    if (!receiverId && !groupId) return res.status(400).json({ message: "receiverId or groupId required" });

    const query: any = { isDeleted: false };

    if (groupId) query.group = groupId;
    else if (receiverId) query.$or = [
      { sender: adminId, receiver: receiverId },
      { sender: receiverId, receiver: adminId },
    ];

    const messages = await Message.find(query)
      .populate("sender", "name role email")
      .populate("receiver", "name role email")
      .populate("group", "name")
      .sort({ createdAt: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const total = await Message.countDocuments(query);

    return res.status(200).json({
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      messages,
    });
  } catch (err: any) {
    console.error("AdminGetChatMessages Error:", err);
    return res.status(500).json({ message: "Failed to fetch chat messages" });
  }
};