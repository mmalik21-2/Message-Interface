/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";

export async function POST(req: Request) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const { conversationId, text, recipientId } = await req.json();

  if (!session?.user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!conversationId || !text)
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );

  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation)
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );

    const newMessage = await Message.create({
      conversationId,
      senderId: session.user.id,
      recipientId: conversation.isGroup ? null : recipientId, // Set recipientId for direct messages
      text,
      isRead: false,
    });

    // Update lastMessage in conversation
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: newMessage._id,
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate("senderId", "firstName lastName")
      .lean();

    return NextResponse.json(populatedMessage);
  } catch (error: any) {
    console.error("POST /api/messages error:", error.message);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
