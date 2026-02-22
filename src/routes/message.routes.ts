import { Router } from "express";
import * as ChatCtrl from "../controllers/message.controller";
import { authorize, protect } from "../middlewares/authMiddleware";
import { upload } from "../middlewares/upload";

const router = Router();

/* ============================================================
   MESSAGE OPERATIONS (Users & Admin)
============================================================ */

// Send message (User -> Admin, User -> Group, or Admin -> User)
router.post(
  "/messages", 
  protect, 
  upload.single("image"), 
  ChatCtrl.sendMessage
);

// Get conversation history (Private or Group)
router.get(
  "/messages", 
  protect, 
  ChatCtrl.getMessages
);

// EDIT Message (New: For typo corrections within the time window)
router.patch(
  "/messages/:messageId", 
  protect, 
  ChatCtrl.editMessage
);

// Mark as read
router.patch(
  "/messages/:messageId/read", 
  protect, 
  ChatCtrl.markAsRead
);

// Soft delete sender's own message
router.delete(
  "/messages/:messageId", 
  protect, 
  ChatCtrl.deleteMessage
);


/* ============================================================
   GROUP & USER SPECIFIC FETCHING
============================================================ */

// Fetch groups the current logged-in user belongs to
router.get(
  "/my-groups",
  protect,
  ChatCtrl.getUserGroups
);


/* ============================================================
   GROUP MANAGEMENT (Strictly Admin Only)
============================================================ */

// Create a new group
router.post(
  "/groups/create",
  protect,
  authorize("admin"),
  ChatCtrl.adminCreateGroup
);

// Update group details (Name/Status)
router.patch(
  "/groups/:groupId",
  protect,
  authorize("admin"),
  ChatCtrl.adminUpdateGroup
);

// Add members to a group
router.post(
  "/groups/:groupId/members",
  protect,
  authorize("admin"),
  ChatCtrl.adminAddMembers
);

// Remove a member from a group
router.delete(
  "/groups/:groupId/members/:userId",
  protect,
  authorize("admin"),
  ChatCtrl.adminRemoveMember
);

// Fetch all groups (Master list for Admin dashboard)
router.get(
  "/groups",
  protect,
  authorize("admin"),
  ChatCtrl.adminGetGroups
);

/* ============================================================
   SYSTEM MONITORING & MESSAGING (Admin Only)
============================================================ */

// Global monitor: fetch all messages
router.get(
  "/admin/messages",
  protect,
  authorize("admin"),
  ChatCtrl.adminGetAllMessages
);

// Fetch messaging statistics
router.get(
  "/admin/stats",
  protect,
  authorize("admin"),
  ChatCtrl.adminGetStats
);

// Permanently delete a message
router.delete(
  "/admin/purge/:messageId",
  protect,
  authorize("admin"),
  ChatCtrl.adminPermanentDelete
);

// Send a message (group or private)
router.post(
  "/admin/send",
  protect,
  authorize("admin"),
  upload.single("image"),
  ChatCtrl.adminSendMessage
);

// Fetch messages for a specific chat (user or group)
router.get(
  "/chat/messages",
  protect,
  authorize("admin"),
  ChatCtrl.adminGetChatMessages
);

export default router;