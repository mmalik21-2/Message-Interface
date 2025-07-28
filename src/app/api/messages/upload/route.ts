import { writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
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
  const file = formData.get("file") as File;
  const conversationId = formData.get("conversationId") as string;

  if (!file || !conversationId) {
    return NextResponse.json(
      { error: "Missing file or conversationId" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name?.split(".").pop() || "dat";
  const filename = `${uuidv4()}.${ext}`;
  const filePath = path.join(process.cwd(), "public/uploads", filename);

  await writeFile(filePath, buffer);

  const fileUrl = `/uploads/${filename}`;
  let messageContent: {
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
