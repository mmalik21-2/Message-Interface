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
      if (
        !participantIds ||
        !Array.isArray(participantIds) ||
        participantIds.length < 2
      ) {
        return NextResponse.json(
          { error: "Group must have at least 2 participants" },
          { status: 400 }
        );
      }

      const participants = [...new Set([userId, ...participantIds])].map(
        (id: string) => {
          try {
            return new mongoose.Types.ObjectId(id);
          } catch {
            throw new Error(`Invalid participant ID: ${id}`);
          }
        }
      );

      const newConvo = await Conversation.create({
        participants,
        isGroup: true,
        groupName: groupName || "Group Chat",
      });

      const populatedConvo = await Conversation.findById(newConvo._id)
        .populate("participants", "firstName lastName")
        .lean();

      return NextResponse.json(populatedConvo);
    }

    // One-to-one chat
    if (!recipientId) {
      return NextResponse.json(
        { error: "Recipient ID required" },
        { status: 400 }
      );
    }

    let recipientObjectId: mongoose.Types.ObjectId;
    let currentUserObjectId: mongoose.Types.ObjectId;

    try {
      recipientObjectId = new mongoose.Types.ObjectId(recipientId);
      currentUserObjectId = new mongoose.Types.ObjectId(userId);
    } catch {
      return NextResponse.json(
        { error: `Invalid recipient ID: ${recipientId}` },
        { status: 400 }
      );
    }

    // Check for existing conversation
    const existing = await Conversation.findOne({
      participants: {
        $all: [currentUserObjectId, recipientObjectId],
        $size: 2,
      },
      isGroup: false,
    });

    if (existing) {
      const populatedConvo = await Conversation.findById(existing._id)
        .populate("participants", "firstName lastName")
        .lean();

      return NextResponse.json(populatedConvo);
    }

    const newConvo = await Conversation.create({
      participants: [currentUserObjectId, recipientObjectId],
      isGroup: false,
    });

    const populatedConvo = await Conversation.findById(newConvo._id)
      .populate("participants", "firstName lastName")
      .lean();

    return NextResponse.json(populatedConvo);
  } catch (error: any) {
    console.error("POST /api/conversations error:", error.message);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    let userObjectId: mongoose.Types.ObjectId;

    try {
      userObjectId = new mongoose.Types.ObjectId(userId);
    } catch {
      return NextResponse.json(
        { error: `Invalid user ID: ${userId}` },
        { status: 400 }
      );
    }

    const conversations = await Conversation.find({
      participants: userObjectId,
    })
      .populate("participants", "firstName lastName")
      .populate({
        path: "lastMessage",
        select: "text imageUrl videoUrl fileUrl createdAt",
        options: { strictPopulate: false },
      })
      .sort({ "lastMessage.createdAt": -1 })
      .lean();

    const transformedConversations = conversations.map((conv) => ({
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

    return NextResponse.json(transformedConversations);
  } catch (error: any) {
    console.error("GET /api/conversations error:", error.message);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
