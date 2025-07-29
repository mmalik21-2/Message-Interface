/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import Message from "@/models/Message";
import mongoose from "mongoose";

export async function POST(req: Request) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId } = await req.json();
  if (!conversationId) {
    return NextResponse.json(
      { error: "Conversation ID required" },
      { status: 400 }
    );
  }

  try {
    await Message.updateMany(
      {
        conversationId: new mongoose.Types.ObjectId(conversationId),
        recipientId: new mongoose.Types.ObjectId(session.user.id),
        isRead: false,
      },
      { $set: { isRead: true } }
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST /api/messages/mark-read error:", error.message);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
