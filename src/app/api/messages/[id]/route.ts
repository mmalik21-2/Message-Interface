import { connectToDatabase } from "@/lib/db";
import Message from "@/models/Message";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  await connectToDatabase();

  const session = await getServerSession(authOptions);
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  // Extract ID from URL
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop(); // get the last segment of the path

  if (!id) {
    return new NextResponse("Message ID is required", { status: 400 });
  }

  const messages = await Message.find({ conversationId: id })
    .sort({ createdAt: 1 })
    .populate("senderId", "firstName lastName");

  return NextResponse.json(messages);
}
