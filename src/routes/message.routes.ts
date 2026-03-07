import { Router } from "express";
import * as ChatCtrl from "../controllers/message.controller";
import { authorize, protect } from "../middlewares/authMiddleware";
import { upload } from "../middlewares/upload";

const router = Router();

router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});

/* ============================================================
   GENERAL MESSAGE OPERATIONS (Judges & Admin)
============================================================ */

// Send message (Judge -> Admin, Judge -> Group)
router.post(
  "/messages", 
  protect, 
  authorize("admin", "judge"), // Restricted from guests
  upload.single("image"), 
  ChatCtrl.sendMessage
);

router.get("/messages", protect, ChatCtrl.getMessages);
router.patch("/messages/:messageId", protect, ChatCtrl.editMessage);
router.patch("/messages/:messageId/read", protect, ChatCtrl.markAsRead);
router.delete("/messages/:messageId", protect, ChatCtrl.deleteMessage);

/* ============================================================
   GROUP & CHANNEL RESOLUTION
============================================================ */

router.get("/my-groups", protect, ChatCtrl.getUserGroups);

/* ============================================================
   ADMIN MANAGEMENT (Multi-Select & System Control)
============================================================ */

// Updated: Admin sends to multi-receivers, groups, or broadcast
router.post(
  "/admin/send",
  protect,
  authorize("admin"),
  upload.single("image"),
  ChatCtrl.adminSendMessage 
);

router.get("/groups", protect, authorize("admin"), ChatCtrl.adminGetGroups);
router.post("/groups/create", protect, authorize("admin"), ChatCtrl.adminCreateGroup);
router.patch("/groups/:groupId", protect, authorize("admin"), ChatCtrl.adminUpdateGroup);
router.post("/groups/:groupId/members", protect, authorize("admin"), ChatCtrl.adminAddMembers);
router.delete("/groups/:groupId/members/:userId", protect, authorize("admin"), ChatCtrl.adminRemoveMember);

router.get("/admin/messages", protect, authorize("admin"), ChatCtrl.adminGetAllMessages);
router.get("/admin/stats", protect, authorize("admin"), ChatCtrl.adminGetStats);
router.delete("/admin/purge/:messageId", protect, authorize("admin"), ChatCtrl.adminPermanentDelete);
router.get("/chat/messages", protect, authorize("admin"), ChatCtrl.adminGetChatMessages);

/* ============================================================
   GUEST ROUTES (Read-Only Policy)
============================================================ */

// Fetch Guest-specific channels (Registry Admin & Broadcasts)
router.get(
  "/guest/channels",
  protect,
  authorize("guest"),
  ChatCtrl.guestGetChannels // New Controller
);

// Get messages for the logged-in guest (Inbox only)
router.get(
  "/guest/messages",
  protect,
  authorize("guest"),
  ChatCtrl.guestGetMessages
);

// Guests can still mark messages as read to clear notifications
router.patch(
  "/guest/read/:messageId",
  protect,
  authorize("guest"),
  ChatCtrl.guestMarkAsRead
);

// Add this near your other GET routes
router.get(
  "/conversations/active", 
  protect, 
  authorize("admin"), 
  ChatCtrl.getActiveConversations
);

// NOTE: router.post("/send") REMOVED to enforce Read-Only policy for guests

export default router;