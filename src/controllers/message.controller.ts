import { Response } from "express";
import { Message } from "../models/message.model";
import { Group } from "../models/group.model";
import mongoose from "mongoose";
import { getIO } from "../socket";
import { isUserOnline } from "../socket/presence";
import { sendWebPush } from "../services/push.service"; // Updated Service
import { User } from "../models/user.model";
import { uploadToCloudinary } from "../config/cloudinary";
import { AuthRequest } from "../middlewares/authMiddleware";

const GUEST_DAILY_LIMIT = 5;

/**
 * Centralized Image Upload helper
 */
const uploadImage = async (file: Express.Multer.File): Promise<string> => {
  try {
    const result = await uploadToCloudinary(file, "messages");
    return result.secure_url;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    throw new Error("Failed to upload image to cloud storage");
  }
};

/* ============================================================
    USER SEND MESSAGE
============================================================ */
export const sendMessage = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const senderId = req.user!.id;
    const senderRole = req.user!.role;
    let { receiver, group, text, isBroadcast } = req.body;

    // 1. Parse isBroadcast (handles string "true" from FormData)
    const isTrueBroadcast = isBroadcast === "true" || isBroadcast === true;

    /* ================= VIRTUAL ID RESOLUTION ================= */
    // If a Judge clicks "Registry Admin" (id: admin_private),
    // we must find an actual Admin to receive the message.
    if (receiver === "admin_private") {
      const adminUser = await User.findOne({ role: "admin" })
        .select("_id")
        .lean();
      if (!adminUser)
        return res
          .status(404)
          .json({ message: "No Admin found to receive message" });
      receiver = adminUser._id.toString();
    }

    /* ================= POLICY ================= */
    if (isTrueBroadcast && senderRole !== "admin") {
      return res
        .status(403)
        .json({ message: "Only Admin can send broadcasts." });
    }

    if (group && senderRole !== "admin") {
      return res.status(403).json({ message: "Group messaging restricted." });
    }

    if (receiver && senderRole !== "admin") {
      const targetUser = await User.findById(receiver).select("role").lean();
      if (!targetUser || targetUser.role !== "admin") {
        return res
          .status(403)
          .json({ message: "Correspondence allowed only with Admin." });
      }
    }

    if (!receiver && !group && !isTrueBroadcast)
      return res
        .status(400)
        .json({ message: "Receiver, Group, or Broadcast flag required" });

    /* ================= IMAGE & CREATE ================= */
    let imageUrl: string | undefined;
    if (req.file) imageUrl = await uploadImage(req.file as Express.Multer.File);

    const [newMessage] = await Message.create(
      [
        {
          sender: senderId,
          receiver: isTrueBroadcast ? undefined : receiver,
          group,
          text,
          imageUrl,
          isBroadcast: isTrueBroadcast,
          senderType: senderRole,
          readBy: [senderId],
          status: "sent",
        },
      ],
      { session },
    );

    await session.commitTransaction();

    const message = await Message.findById(newMessage._id)
      .populate("sender", "name role")
      .populate("receiver", "name role") // Useful for admin-side UI
      .lean();

    if (!message) throw new Error("Processing failed");

    /* ================= SOCKET DELIVERY ================= */
    const io = getIO();

    if (isTrueBroadcast) {
      io.emit("message:broadcast", message);
    } else if (group) {
      io.to(group).emit("message:new", message);
    } else if (receiver) {
      // Send to the admin's personal room
      io.to(receiver).emit("message:new", message);
      // Send back to the sender so their UI updates
      io.to(senderId).emit("message:new", message);
    }

    return res.status(201).json(message);
  } catch (err: any) {
    if (session.inTransaction()) await session.abortTransaction();
    return res
      .status(500)
      .json({ message: err.message || "Failed to record message" });
  } finally {
    session.endSession();
  }
};

/* ================================
    EDIT MESSAGE
================================ */
export const editMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.user!.id;

    const message = await Message.findOne({ _id: messageId, sender: userId });
    if (!message)
      return res
        .status(404)
        .json({ message: "Message not found/unauthorized" });

    const expiry = 60 * 60 * 1000;
    if (Date.now() - new Date(message.createdAt).getTime() > expiry) {
      return res.status(400).json({ message: "Edit window expired" });
    }

    message.text = text;
    message.isEdited = true;
    await message.save();

    const updatedMsg = await Message.findById(messageId).populate(
      "sender",
      "name role",
    );

    const io = getIO();
    if (message.group)
      io.to(message.group.toString()).emit("message:updated", updatedMsg);
    else
      io.to(message.receiver!.toString()).emit("message:updated", updatedMsg);

    return res.status(200).json(updatedMsg);
  } catch {
    return res.status(500).json({ message: "Edit failed" });
  }
};

/* ================================
    GET MESSAGES
================================ */
export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    // 1. Get isBroadcast from query
    const { receiver, isBroadcast } = req.query;

    const query: any = { isDeleted: false };

    // 2. Separate logic for Broadcast vs. Private
    if (isBroadcast === "true") {
      query.isBroadcast = true;
    } else {
      // Logic for Private Thread with Admin
      query.isBroadcast = { $ne: true }; // Filter out broadcasts

      if (userRole !== "admin") {
        // Users can only chat with admins.
        // We find messages where user is sender/receiver
        // AND the other party is an admin.
        query.$or = [{ sender: userId }, { receiver: userId }];
      } else {
        // Admin viewing a specific user
        if (!receiver)
          return res.status(400).json({ message: "Receiver ID required" });
        query.$or = [
          { sender: userId, receiver: receiver },
          { sender: receiver, receiver: userId },
        ];
      }
    }

    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .populate("sender", "name role")
      .populate("receiver", "name role")
      .lean();

    return res.status(200).json(messages);
  } catch (err) {
    return res.status(500).json({ message: "Fetch failed" });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { messageId } = req.params;

    // FIXED: Deprecation warning fixed
    await Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { readBy: userId } },
      { returnDocument: "after" },
    );

    return res.status(200).json({ message: "Read" });
  } catch {
    return res.status(500).json({ message: "Failed" });
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { messageId } = req.params;
    const msg = await Message.findOne({ _id: messageId, sender: userId });
    if (!msg) return res.status(404).json({ message: "Not allowed" });
    msg.isDeleted = true;
    await msg.save();

    // Notify clients via Socket
    const io = getIO();
    if (msg.group) io.to(msg.group.toString()).emit("message:updated", msg);
    else io.to(msg.receiver!.toString()).emit("message:updated", msg);

    return res.status(200).json({ message: "Deleted" });
  } catch {
    return res.status(500).json({ message: "Failed" });
  }
};

export const getUserGroups = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // 1. Fetch real groups the user is actually a member of
    const dbGroups = await Group.find({
      isActive: true,
      members: userId,
    })
      .select("name description createdAt type")
      .lean();

    // 2. Define the "Virtual" channels every Judge should see
    const virtualChannels = [
      {
        _id: "global_broadcast", // Static ID for the frontend to recognize
        name: "Official Announcements",
        description: "Registry-wide broadcasts",
        type: "broadcast",
        isReadOnly: true,
      },
      {
        _id: "admin_private", // Static ID for private chat with admin
        name: "Registry Admin",
        description: "Direct correspondence with Registry",
        type: "private",
        isReadOnly: false,
      },
    ];

    // Combine them: Virtual channels first, then specific groups
    return res.status(200).json([...virtualChannels, ...dbGroups]);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch groups" });
  }
};

/* ============================================================
    ADMIN CONTROLLERS
============================================================ */

export const adminGetAllMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { isBroadcast, receiverId, page = 1, limit = 100 } = req.query;

    const filter: any = { isDeleted: false };

    if (isBroadcast === "true") {
      // Specifically requesting ONLY broadcasts
      filter.isBroadcast = true;
    } else if (receiverId) {
      // Admin viewing specific user thread
      filter.isBroadcast = false;
      filter.$or = [
        { sender: req.user!.id, receiver: receiverId },
        { sender: receiverId, receiver: req.user!.id },
      ];
    } else {
      // GLOBAL VIEW: Fetch everything (Direct, Group, and Broadcast)
      // Remove any specific isBroadcast filter so everything shows up in logs
    }

    const messages = await Message.find(filter)
      .populate("sender", "name role")
      .populate("receiver", "name role")
      .sort({ createdAt: -1 }) // Sort by NEWEST first for history logs
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const total = await Message.countDocuments(filter);

    return res.status(200).json({
      messages,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    return res.status(500).json({ message: "Admin: Failed to fetch messages" });
  }
};

export const adminPermanentDelete = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const deletedMessage = await Message.findByIdAndDelete(messageId);
    if (!deletedMessage)
      return res.status(404).json({ message: "Message not found" });
    return res.status(200).json({ message: "Message permanently purged" });
  } catch (err) {
    return res.status(500).json({ message: "Admin: Failed to purge message" });
  }
};

export const adminGetStats = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await Message.aggregate([
      { $group: { _id: "$senderType", count: { $sum: 1 } } },
    ]);
    const totalMessages = await Message.countDocuments();
    const deletedCount = await Message.countDocuments({ isDeleted: true });
    return res.status(200).json({ totalMessages, deletedCount, byRole: stats });
  } catch (err) {
    return res.status(500).json({ message: "Admin: Failed to fetch stats" });
  }
};

/* =====================================================
    GROUP MANAGEMENT (Admin Only)
===================================================== */

export const adminCreateGroup = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.id;
    const adminRole = req.user!.role;
    const { name, description, members } = req.body;

    if (adminRole !== "admin")
      return res.status(403).json({ message: "Access denied. Admins only." });
    if (!name)
      return res.status(400).json({ message: "Group name is required" });

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
    return res.status(500).json({ message: "Failed to create group" });
  }
};

export const adminUpdateGroup = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    // FIXED: returnDocument instead of new: true
    const group = await Group.findByIdAndUpdate(groupId, req.body, {
      returnDocument: "after",
    });
    if (!group) return res.status(404).json({ message: "Group not found" });
    return res.status(200).json(group);
  } catch (err) {
    return res.status(500).json({ message: "Failed to update group" });
  }
};

export const adminAddMembers = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId } = req.params;
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0)
      return res.status(400).json({ message: "userIds required" });

    // FIXED: returnDocument
    const group = await Group.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: { $each: userIds } } },
      { returnDocument: "after" },
    ).populate("members", "name email");

    if (!group) return res.status(404).json({ message: "Group not found" });
    return res.status(200).json({ message: "Members added", group });
  } catch (err) {
    return res.status(500).json({ message: "Admin: Failed to add members" });
  }
};

export const adminRemoveMember = async (req: AuthRequest, res: Response) => {
  try {
    const { groupId, userId } = req.params;
    // FIXED: returnDocument
    const group = await Group.findByIdAndUpdate(
      groupId,
      { $pull: { members: userId } },
      { returnDocument: "after" },
    );
    if (!group) return res.status(404).json({ message: "Group not found" });
    return res.status(200).json({ message: "Member removed", group });
  } catch (err) {
    return res.status(500).json({ message: "Admin: Failed to remove member" });
  }
};

export const adminGetGroups = async (req: AuthRequest, res: Response) => {
  try {
    const groups = await Group.find({ isActive: true })
      .populate("members", "name email role")
      .sort({ createdAt: -1 });
    return res.status(200).json(groups);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch groups" });
  }
};

export const adminSendMessage = async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const adminId = req.user!.id;

    let { receivers, receiver, group, text, isBroadcast } = req.body;

    const isTrueBroadcast = isBroadcast === true || isBroadcast === "true";

    /* =========================================
       NORMALIZE RECEIVERS
    ========================================= */

    let targetIds: string[] = [];

    if (Array.isArray(receivers)) {
      targetIds = receivers;
    } else if (typeof receivers === "string") {
      targetIds = [receivers];
    } else if (receiver) {
      targetIds = [receiver];
    }

    /* =========================================
       IMAGE UPLOAD
    ========================================= */

    let imageUrl: string | undefined;

    if (req.file) {
      const upload = await uploadToCloudinary(req.file, "messages");
      imageUrl = upload.secure_url;
    }

    const io = getIO();

    /* =========================================
       BROADCAST MESSAGE
    ========================================= */

    if (isTrueBroadcast) {
      const [message] = await Message.create(
        [
          {
            sender: adminId,
            text,
            imageUrl,
            senderType: "admin",
            isBroadcast: true,
            readBy: [adminId],
            status: "sent",
          },
        ],
        { session },
      );

      await session.commitTransaction();

      io.emit("message:broadcast", message);

      return res.status(201).json(message);
    }

    /* =========================================
       GROUP MESSAGE
    ========================================= */

    if (group) {
      const [message] = await Message.create(
        [
          {
            sender: adminId,
            group,
            text,
            imageUrl,
            senderType: "admin",
            readBy: [adminId],
            status: "sent",
          },
        ],
        { session },
      );

      await session.commitTransaction();

      io.to(group).emit("message:new", message);

      return res.status(201).json(message);
    }

    /* =========================================
       PRIVATE MESSAGE (FAST BULK)
    ========================================= */

    if (targetIds.length > 0) {
      const messages = targetIds.map((id) => ({
        sender: adminId,
        receiver: id,
        text,
        imageUrl,
        senderType: "admin",
        readBy: [adminId],
        status: "sent",
      }));

      const createdMessages = await Message.insertMany(messages, { session });

      await session.commitTransaction();

      for (const msg of createdMessages) {
        if (!msg.receiver) continue;

        const receiverId = msg.receiver.toString();

        io.to(receiverId).emit("message:new", msg);

        io.to(adminId).emit("message:new", msg);

        if (!isUserOnline(receiverId)) {
          sendWebPush(receiverId, "New Message", text || "New attachment");
        }
      }

      return res
        .status(201)
        .json(
          createdMessages.length === 1 ? createdMessages[0] : createdMessages,
        );
    }

    return res.status(400).json({
      message: "No valid destination provided",
    });
  } catch (err: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    return res.status(500).json({
      message: err.message,
    });
  } finally {
    session.endSession();
  }
};


export const adminGetChatMessages = async (req: AuthRequest, res: Response) => {
  try {
    const adminId = req.user!.id;
    // Add isBroadcast to the destructuring
    const {
      receiverId,
      groupId,
      isBroadcast,
      page = 1,
      limit = 50,
    } = req.query;

    // Updated validation: allow if it's a broadcast
    if (!receiverId && !groupId && isBroadcast !== "true") {
      return res
        .status(400)
        .json({ message: "receiverId, groupId, or broadcast flag required" });
    }

    const query: any = { isDeleted: false };

    if (isBroadcast === "true") {
      // Fetch all messages where isBroadcast is true
      query.isBroadcast = true;
    } else if (groupId) {
      query.group = groupId;
    } else if (receiverId) {
      query.$or = [
        { sender: adminId, receiver: receiverId },
        { sender: receiverId, receiver: adminId },
      ];
      // Important: exclude broadcasts from private chat history
      query.isBroadcast = { $ne: true };
    }

    const messages = await Message.find(query)
      .populate("sender", "name role email")
      .populate("receiver", "name role email")
      .populate("group", "name")
      .sort({ createdAt: 1 }) // Keep chronological order
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
    return res.status(500).json({ message: "Failed to fetch chat messages" });
  }
};

/**
 * Guest: Get Channels
 * Shows "Broadcasts" and "Private Inbox" but UI should hide the input field
 */
export const guestGetChannels = async (req: AuthRequest, res: Response) => {
  try {
    const virtualChannels = [
      {
        _id: "global_broadcast",
        name: "Registry Announcements",
        description: "Official broadcast updates (Read-only)",
        type: "broadcast",
        isReadOnly: true,
      },
      {
        _id: "admin_private",
        name: "Inbox from Registry",
        description: "Messages sent to you by Admin",
        type: "private",
        isReadOnly: true, // Guest cannot reply
      },
    ];

    return res.status(200).json(virtualChannels);
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch channels" });
  }
};

/**
 * Guest: Get Messages
 * Guests can see broadcasts and messages where they are the receiver.
 */
export const guestGetMessages = async (req: AuthRequest, res: Response) => {
  try {
    const guestId = req.user!.id;
    const { isBroadcast } = req.query;

    const query: any = { isDeleted: false };

    if (isBroadcast === "true") {
      query.isBroadcast = true;
    } else {
      // Guests only see what the admin sent them (They can't send, so no 'sender: guestId')
      query.receiver = guestId;
      query.isBroadcast = { $ne: true };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: 1 })
      .populate("sender", "name role")
      .lean();

    return res.status(200).json(messages);
  } catch (err) {
    return res.status(500).json({ message: "Fetch failed" });
  }
};

// message.controller.ts

// Change "export const markAsRead = ..." to:
export const guestMarkAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const guestId = req.user!.id;
    const { messageId } = req.params;

    await Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { readBy: guestId } },
      { returnDocument: "after" },
    );

    return res.status(200).json({ message: "Marked as read" });
  } catch {
    return res.status(500).json({ message: "Failed to mark read" });
  }
};

export const getActiveConversations = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const adminId = req.user!.id;

    // Find all private messages where admin is involved
    const messages = await Message.find({
      $or: [{ sender: adminId }, { receiver: adminId }],
      isBroadcast: { $ne: true }, // Exclude broadcasts
      group: { $exists: false }, // Exclude group chats
    })
      .sort({ createdAt: -1 })
      .populate("sender receiver", "name role email")
      .lean();

    const contactsMap = new Map();

    messages.forEach((msg: any) => {
      // Determine who the "other" person is (the Judge/Guest)
      const otherUser =
        msg.sender._id.toString() === adminId ? msg.receiver : msg.sender;

      // Only add unique users and skip if user was deleted
      if (
        otherUser &&
        otherUser._id &&
        !contactsMap.has(otherUser._id.toString())
      ) {
        contactsMap.set(otherUser._id.toString(), {
          _id: otherUser._id,
          name: otherUser.name,
          role: otherUser.role,
          lastMessage: msg.text,
          updatedAt: msg.createdAt,
          type: "private",
        });
      }
    });

    return res.status(200).json(Array.from(contactsMap.values()));
  } catch (err: any) {
    return res
      .status(500)
      .json({ message: "Failed to fetch active conversations" });
  }
};
