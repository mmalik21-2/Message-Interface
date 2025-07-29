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
      console.error("POST /api/conversations: No user session");
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
        console.error("POST /api/conversations: Invalid participantIds", {
          participantIds,
        });
        return NextResponse.json(
          { error: "Group must have at least 2 participants" },
          { status: 400 }
        );
      }
      const participants = [...new Set([userId, ...participantIds])].map(
        (id: string) => {
          try {
            return new mongoose.Types.ObjectId(id);
          } catch (error) {
            console.error("POST /api/conversations: Invalid ObjectId", { id });
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
      console.log("Created group conversation:", populatedConvo);
      return NextResponse.json(populatedConvo);
    } else {
      if (!recipientId) {
        console.error("POST /api/conversations: Missing recipientId");
        return NextResponse.json(
          { error: "Recipient ID required" },
          { status: 400 }
        );
      }
      try {
        new mongoose.Types.ObjectId(recipientId);
      } catch (error) {
        console.error("POST /api/conversations: Invalid recipientId", {
          recipientId,
        });
        return NextResponse.json(
          { error: `Invalid recipient ID: ${recipientId}` },
          { status: 400 }
        );
      }
      const existing = await Conversation.findOne({
        participants: { $all: [session.user.id, recipientId], $size: 2 },
        isGroup: false,
      });
      if (existing) {
        const populatedConvo = await Conversation.findById(existing._id)
          .populate("participants", "firstName lastName")
          .lean();
        console.log("Found existing conversation:", populatedConvo);
        return NextResponse.json(populatedConvo);
      }
      const newConvo = await Conversation.create({
        participants: [session.user.id, recipientId].map(
          (id) => new mongoose.Types.ObjectId(id)
        ),
        isGroup: false,
      });
      const populatedConvo = await Conversation.findById(newConvo._id)
        .populate("participants", "firstName lastName")
        .lean();
      console.log("Created one-to-one conversation:", populatedConvo);
      return NextResponse.json(populatedConvo);
    }
  } catch (error: any) {
    console.error("POST /api/conversations error:", error.message, error.stack);
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
      console.error("GET /api/conversations: No user session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    try {
      new mongoose.Types.ObjectId(userId);
    } catch (error) {
      console.error("GET /api/conversations: Invalid userId", { userId });
      return NextResponse.json(
        { error: `Invalid user ID: ${userId}` },
        { status: 400 }
      );
    }

    const conversations = await Conversation.find({
      participants: new mongoose.Types.ObjectId(userId),
    })
      .populate("participants", "firstName lastName")
      .populate({
        path: "lastMessage",
        select: "text imageUrl videoUrl fileUrl createdAt",
        options: { strictPopulate: false },
      })
      .sort({ "lastMessage.createdAt": -1 })
      .lean();

    // Transform lastMessage to ensure a displayable text
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

    console.log(
      "Fetched conversations:",
      JSON.stringify(transformedConversations, null, 2)
    );
    return NextResponse.json(transformedConversations);
  } catch (error: any) {
    console.error("GET /api/conversations error:", error.message, error.stack);
    return NextResponse.json(
      { error: `Server error: ${error.message}` },
      { status: 500 }
    );
  }
}
