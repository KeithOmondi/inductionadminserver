import { Socket } from "socket.io";

/**
 * Join a room
 */
export const joinRoom = (socket: Socket, roomId: string) => {
  socket.join(roomId);
  console.log(`Socket ${socket.id} joined room ${roomId}`);
};

/**
 * Leave a room
 */
export const leaveRoom = (socket: Socket, roomId: string) => {
  socket.leave(roomId);
  console.log(`Socket ${socket.id} left room ${roomId}`);
};

/**
 * Get rooms a socket is in
 */
export const getSocketRooms = (socket: Socket) => {
  return Array.from(socket.rooms);
};
