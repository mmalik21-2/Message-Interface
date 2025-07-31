import { Server } from "socket.io";
import { createServer } from "http";
import { NextResponse } from "next/server";

let io: Server | null = null;

export async function GET(req: Request) {
  if (!io) {
    const httpServer = createServer();
    io = new Server(httpServer, {
      path: "/api/socket",
      cors: { origin: "*" },
    });

    io.on("connection", (socket) => {
      console.log("User connected:", socket.id);
      socket.on("sendMessage", (message) => {
        io?.emit("newMessage", message);
      });
      socket.on("markMessagesRead", (conversationId) => {
        io?.emit("messagesRead", conversationId);
      });
    });
  }
  return new Response("Socket.IO server running");
}
