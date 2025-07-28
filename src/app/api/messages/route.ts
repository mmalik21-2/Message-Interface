import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import Message from "@/models/Message";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const conversationId = formData.get("conversationId") as string;

  if (!file || !conversationId) {
    return NextResponse.json(
      { error: "Missing file or conversationId" },
      { status: 400 }
    );
  }

  const blob = await put(`messages/${file.name}`, file, {
    access: "public",
  });

  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  const messageContent: {
    videoUrl?: string;
    imageUrl?: string;
    fileUrl?: string;
  } = {};

  if (isVideo) {
    messageContent.videoUrl = blob.url;
  } else if (isImage) {
    messageContent.imageUrl = blob.url;
  } else {
    messageContent.fileUrl = blob.url;
  }

  const message = await Message.create({
    conversationId,
    senderId: userId,
    ...messageContent,
  });

  return NextResponse.json(message);
}
