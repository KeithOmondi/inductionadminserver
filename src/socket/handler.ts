import { Server, Socket } from "socket.io";
import { joinRoom } from "./rooms";
import { addUser, removeUser, isUserOnline, getOnlineUsers } from "./presence";

export const registerSocketHandlers = (io: Server, socket: Socket) => {
  console.log("Connected:", socket.id);

  let userId: string | null = null;

  /* ===============================
     USER SETUP
  =============================== */
  socket.on("setup", (userData: { _id: string }) => {
    userId = userData._id;

    joinRoom(socket, userId);
    addUser(userId, socket);

    socket.broadcast.emit("presence:online", { userId });

    socket.emit("connected", {
      onlineUsers: getOnlineUsers(),
    });

    console.log(`User ${userId} is online`);
  });

  /* ===============================
     JOIN GROUP CHAT
  =============================== */
  socket.on("join_chat", (roomId: string) => {
    joinRoom(socket, roomId);
  });

  /* ===============================
     TYPING INDICATOR
  =============================== */
  socket.on("typing", (roomId: string) => {
    socket.to(roomId).emit("typing", { userId });
  });

  socket.on("stop_typing", (roomId: string) => {
    socket.to(roomId).emit("stop_typing", { userId });
  });

  /* ===============================
     ⭐ MESSAGE DELIVERED ACK
     Client confirms message arrived
  =============================== */
  socket.on("message:delivered", ({ messageId, senderId }) => {
    if (!userId) return;

    // Notify sender (all devices)
    io.to(senderId).emit("message:delivered", {
      messageId,
      userId,
    });
  });

  /* ===============================
     ⭐ MESSAGE READ ACK
     When user opens chat
  =============================== */
  socket.on("message:read", ({ messageId, senderId }) => {
    if (!userId) return;

    io.to(senderId).emit("message:read", {
      messageId,
      userId,
    });
  });

  /* ===============================
     PRESENCE CHECK
  =============================== */
  socket.on("presence:check", (targetUserId: string, cb) => {
    cb({ online: isUserOnline(targetUserId) });
  });

  /* ===============================
     DISCONNECT
  =============================== */
  socket.on("disconnect", () => {
    if (!userId) return;

    removeUser(userId, socket.id);

    if (!isUserOnline(userId)) {
      io.emit("presence:offline", {
        userId,
        lastSeen: new Date(),
      });
    }

    console.log(`User ${userId} disconnected`);
  });
};
