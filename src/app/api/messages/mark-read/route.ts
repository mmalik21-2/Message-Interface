/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import Message from "@/models/Message";
import mongoose from "mongoose";
import socket from "@/lib/socket";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { conversationId } = await req.json();
    const userId = session.user.id;

    // Update all messages in the conversation to include the user in readBy
    const result = await Message.updateMany(
      {
        conversationId: new mongoose.Types.ObjectId(conversationId),
        senderId: { $ne: new mongoose.Types.ObjectId(userId) },
        readBy: { $nin: [new mongoose.Types.ObjectId(userId)] },
      },
      { $addToSet: { readBy: new mongoose.Types.ObjectId(userId) } }
    );

    // Emit messagesRead event to notify clients
    socket.emit("messagesRead", conversationId);

    return NextResponse.json({ success: true, updated: result.modifiedCount });
  } catch (error: any) {
    console.error("POST /api/messages/mark-read error:", error.message);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
