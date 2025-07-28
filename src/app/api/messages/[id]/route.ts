import { connectToDatabase } from "@/lib/db";
import Message from "@/models/Message";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = params;

  const messages = await Message.find({ conversationId: id })
    .sort({ createdAt: 1 })
    .populate("senderId", "firstName lastName");

  return NextResponse.json(messages);
}
