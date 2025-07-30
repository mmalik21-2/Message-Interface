/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import Conversation from "@/models/Conversation";
import mongoose from "mongoose";

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recipientId, participantIds, isGroup, groupName } =
      await req.json();
    const userId = session.user.id;

    if (isGroup) {
      if (!participantIds || participantIds.length < 2) {
        return NextResponse.json(
          { error: "Group must have at least 2 participants" },
          { status: 400 }
        );
      }

      const participants = [...new Set([userId, ...participantIds])].map(
        (id: string) => new mongoose.Types.ObjectId(id)
      );

      if (groupName === "Channel") {
        return NextResponse.json(
          { error: "Cannot create group named 'Channel'" },
          { status: 400 }
        );
      }

      const newConvo = await Conversation.create({
        participants,
        isGroup: true,
        groupName: groupName || "Group Chat",
      });

      const populated = await Conversation.findById(newConvo._id)
        .populate("participants", "firstName lastName profilePic")
        .lean();

      return NextResponse.json(populated);
    }

    if (!recipientId) {
      return NextResponse.json(
        { error: "Recipient ID required" },
        { status: 400 }
      );
    }

    const recipientObjectId = new mongoose.Types.ObjectId(recipientId);
    const currentUserObjectId = new mongoose.Types.ObjectId(userId);

    const existing = await Conversation.findOne({
      participants: {
        $all: [currentUserObjectId, recipientObjectId],
        $size: 2,
      },
      isGroup: false,
    });

    if (existing) {
      const populated = await Conversation.findById(existing._id)
        .populate("participants", "firstName lastName profilePic")
        .lean();
      return NextResponse.json(populated);
    }

    const newConvo = await Conversation.create({
      participants: [currentUserObjectId, recipientObjectId],
      isGroup: false,
    });

    const populated = await Conversation.findById(newConvo._id)
      .populate("participants", "firstName lastName profilePic")
      .lean();

    return NextResponse.json(populated);
  } catch (error: any) {
    console.error("POST /api/conversations error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.error("GET /api/conversations: No user ID in session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const conversations = await Conversation.find({
      participants: userObjectId,
    })
      .populate("participants", "firstName lastName profilePic")
      .populate({
        path: "lastMessage",
        select: "text imageUrl videoUrl fileUrl createdAt",
        options: { strictPopulate: false },
      })
      .sort({ updatedAt: -1 })
      .lean();

    console.log(
      "GET /api/conversations: Fetched conversations for user",
      userId,
      conversations
    );

    const transformed = conversations.map((conv) => ({
      ...conv,
      lastMessage: conv.lastMessage
        ? {
            text:
              conv.lastMessage.text ||
              (conv.lastMessage.imageUrl
                ? "Image"
                : conv.lastMessage.videoUrl
                  ? "Video"
                  : conv.lastMessage.fileUrl
                    ? "File"
                    : "No content"),
            createdAt: conv.lastMessage.createdAt,
          }
        : null,
    }));

    return NextResponse.json(transformed);
  } catch (error: any) {
    console.error("GET /api/conversations error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
