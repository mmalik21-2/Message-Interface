import { connectToDatabase } from "@/lib/db";
import Message from "@/models/Message";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  const { conversationId, text } = await req.json();

  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const message = await Message.create({
    conversationId,
    senderId: session.user.id,
    text,
  });

  return Response.json(message);
}
