/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";
import mongoose from "mongoose";

// Define Conversation type to match the model
interface User {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profilePic?: string;
}

interface PopulatedConversation {
  _id: string;
  isGroup: boolean;
  groupName?: string;
  participants: User[];
  lastMessage?: mongoose.Types.ObjectId;
}

export async function POST(req: Request) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const { conversationId, text, recipientId } = await req.json();

  if (!session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!conversationId || !text)
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );

  try {
    const conversation = await Conversation.findById(conversationId)
      .populate("participants", "firstName lastName email")
      .lean<PopulatedConversation>();
    if (!conversation)
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );

    const newMessage = await Message.create({
      conversationId,
      senderId: session.user.id,
      recipientId: conversation.isGroup ? null : recipientId,
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

    // Emit WebSocket events
    const io = (req as any).socket?.server?.io;
    if (io) {
      // Emit message to conversation room
      io.to(conversationId).emit("message", populatedMessage);

      // Detect mentions in the message text (e.g., @username)
      const mentionRegex = /@(\w+)/g;
      const mentions = text.match(mentionRegex) || [];

      // Notify mentioned users
      for (const participant of conversation.participants) {
        if (participant._id.toString() === session.user.id) continue;
        const username =
          participant.firstName?.toLowerCase() ||
          (participant.email
            ? participant.email.split("@")[0].toLowerCase()
            : `user_${participant._id}`);
        const isMentioned = mentions.some(
          (mention: string) => mention.toLowerCase() === `@${username}`
        );

        if (isMentioned) {
          io.to(participant._id.toString()).emit("mention", { conversationId });
        }

        // Emit conversation-update for unread count
        const unreadCount = await Message.countDocuments({
          conversationId,
          isRead: false,
          senderId: { $ne: participant._id },
        });
        io.to(participant._id.toString()).emit("conversation-update", {
          conversationId,
          unreadCount,
        });
      }
    }

    return NextResponse.json(populatedMessage);
  } catch (error: any) {
    console.error("POST /api/messages error:", error.message);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
