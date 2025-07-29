import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import Conversation from "@/models/Conversation";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
}

interface Conversation {
  _id: string;
  participants: User[];
  isGroup: boolean;
  groupName?: string;
  lastMessage?: { _id: string; text: string; createdAt: string };
}

export async function GET(request: NextRequest) {
  await connectToDatabase();

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Extract ID from URL
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop(); // get the last segment of the path

  if (!id) {
    return new NextResponse("Conversation ID is required", { status: 400 });
  }

  const conversation = (await Conversation.findById(id)
    .populate("participants", "firstName lastName")
    .lean()) as unknown as Conversation;

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  const isAuthorized = conversation.participants.some(
    (p) => p._id.toString() === session.user.id
  );

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(conversation);
}
