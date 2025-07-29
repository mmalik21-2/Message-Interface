import { NextResponse } from "next/server";
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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const conversation = (await Conversation.findById(params.id)
    .populate("participants", "firstName lastName")
    .lean()) as unknown as Conversation;

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  if (
    !conversation.participants.some((p) => p._id.toString() === session.user.id)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(conversation);
}
