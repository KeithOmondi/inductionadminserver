import { Server, Socket } from "socket.io";
import { joinRoom } from "./rooms";
import { addUser, removeUser, isUserOnline, getOnlineUsers } from "./presence";

export const registerSocketHandlers = (io: Server, socket: Socket) => {
  let currentUserId: string | null = null;

  // --- 1. SETUP: Triggered when user logs in/opens app ---
  socket.on("setup", (userData: { _id: string }) => {
    currentUserId = userData._id;
    
    // Join a private room named after the userId (for 1-on-1 notifications)
    socket.join(currentUserId);
    addUser(currentUserId, socket);

    socket.broadcast.emit("presence:online", { userId: currentUserId });
    socket.emit("connected", { onlineUsers: getOnlineUsers() });
    
    console.log(`📡 Socket ${socket.id} mapped to User ${currentUserId}`);
  });

  // --- 2. ROOM MANAGEMENT: Joining a specific chat group ---
  socket.on("join_chat", (roomId: string) => {
    socket.join(roomId);
    console.log(`👥 User ${currentUserId} joined room: ${roomId}`);
  });

  // --- 3. MESSAGE RELAY: This makes it "Real-Time" ---
  socket.on("message:send", (newMessage: any) => {
    // Extract the ID of the group/chat
    const roomId = newMessage.group?._id || newMessage.group;

    if (!roomId) return;

    // .to(roomId) sends to everyone in that room EXCEPT the sender
    socket.to(roomId).emit("message:new", newMessage);
  });

  // --- 4. TYPING: Visual feedback ---
  socket.on("typing", (roomId: string) => {
    socket.to(roomId).emit("typing", { userId: currentUserId, roomId });
  });

  socket.on("stop_typing", (roomId: string) => {
    socket.to(roomId).emit("stop_typing", { userId: currentUserId, roomId });
  });

  // --- 5. DISCONNECT: Cleanup ---
  socket.on("disconnect", () => {
    if (!currentUserId) return;

    removeUser(currentUserId, socket.id);

    // If the user has no more active socket connections, they are "offline"
    if (!isUserOnline(currentUserId)) {
      io.emit("presence:offline", { 
        userId: currentUserId, 
        lastSeen: new Date() 
      });
    }
    console.log(`🔌 User ${currentUserId} disconnected`);
  });
};