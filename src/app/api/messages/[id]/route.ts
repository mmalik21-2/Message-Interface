import { connectToDatabase } from "@/lib/db";
import Message from "@/models/Message";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, context: { params: { id: string } }) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const { id } = context.params;

  const messages = await Message.find({ conversationId: id })
    .sort({ createdAt: 1 })
    .populate("senderId", "firstName lastName");

  return Response.json(messages);
}
