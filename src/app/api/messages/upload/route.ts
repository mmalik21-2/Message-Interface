import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import Message from "@/models/Message";

export const config = {
  api: { bodyParser: false },
};

export async function POST(req: NextRequest) {
  await connectToDatabase();

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  const conversationId = formData.get("conversationId") as string;

  if (!(file instanceof Blob) || !conversationId) {
    return NextResponse.json(
      { error: "Missing or invalid file or conversationId" },
      { status: 400 }
    );
  }

  const blob = await put(`messages/${file.name}`, file, {
    access: "public",
  });

  const fileUrl = blob.url;

  const messageContent: {
    imageUrl?: string;
    videoUrl?: string;
    fileUrl?: string;
  } = {};

  if (file.type.startsWith("image/")) {
    messageContent.imageUrl = fileUrl;
  } else if (file.type.startsWith("video/")) {
    messageContent.videoUrl = fileUrl;
  } else {
    messageContent.fileUrl = fileUrl;
  }

  const message = await Message.create({
    conversationId,
    senderId: userId,
    ...messageContent,
  });

  return NextResponse.json(message);
}
