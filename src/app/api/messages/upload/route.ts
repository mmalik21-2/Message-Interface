/* eslint-disable @typescript-eslint/no-explicit-any */
import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import Message, { IMessage } from "@/models/Message";
import { Types } from "mongoose";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const conversationId = formData.get("conversationId") as string;

    if (!file || !file.type || !conversationId) {
      return NextResponse.json(
        { error: "Missing or invalid file or conversationId" },
        { status: 400 }
      );
    }

    if (file.size > 500 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 500MB)" },
        { status: 400 }
      );
    }

    if (!Types.ObjectId.isValid(conversationId)) {
      return NextResponse.json(
        { error: "Invalid conversationId" },
        { status: 400 }
      );
    }

    const uniqueFileName = `messages/${Date.now()}-${file.name}`;
    const blob = await put(uniqueFileName, file, {
      access: "public",
    });

    const fileUrl = blob.url;

    const messageContent: Partial<IMessage> = {
      conversationId: new Types.ObjectId(conversationId),
      senderId: new Types.ObjectId(userId),
    };

    if (file.type.startsWith("image/")) {
      messageContent.imageUrl = fileUrl;
    } else if (file.type.startsWith("video/")) {
      messageContent.videoUrl = fileUrl;
    } else {
      messageContent.fileUrl = fileUrl;
    }

    const message = await Message.create(messageContent);
    const populatedMessage = await Message.findById(message._id).populate(
      "senderId",
      "firstName lastName"
    );

    return NextResponse.json(populatedMessage);
  } catch (error: any) {
    console.error("Upload or DB error:", error.message, error.stack);
    return NextResponse.json(
      { error: "Upload failed", details: error.message },
      { status: 500 }
    );
  }
}
