import { Socket } from "socket.io";

/**
 * Map of userId -> Set of socketIds
 * Supports multi-device login
 */
const onlineUsers = new Map<string, Set<string>>();

export const addUser = (userId: string, socket: Socket) => {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }

  onlineUsers.get(userId)!.add(socket.id);
};

export const removeUser = (userId: string, socketId: string) => {
  const sockets = onlineUsers.get(userId);

  if (!sockets) return;

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineUsers.delete(userId);
  }
};

export const isUserOnline = (userId: string): boolean => {
  return onlineUsers.has(userId);
};

export const getUserSockets = (userId: string): string[] => {
  return Array.from(onlineUsers.get(userId) || []);
};

export const getOnlineUsers = () => {
  return Array.from(onlineUsers.keys());
};
