import { connectToDatabase } from "@/lib/db";
import Conversation from "@/models/Conversation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const { recipientId } = await req.json();

  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const existing = await Conversation.findOne({
    participants: { $all: [session.user.id, recipientId] },
  });

  if (existing) return Response.json(existing);

  const newConvo = await Conversation.create({
    participants: [session.user.id, recipientId],
  });

  return Response.json(newConvo);
}

export async function GET() {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const conversations = await Conversation.find({
    participants: session.user.id,
  }).populate("participants", "firstName lastName");

  return Response.json(conversations);
}
