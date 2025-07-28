// /app/api/messages/unread/route.ts (or /pages/api/messages/unread.ts if using pages)

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // adjust path to your auth config
import Message from "@/models/Message";
import { connectToDatabase } from "@/lib/db"; // adjust this if your connection util is named differently

export async function GET(req: NextRequest) {
  await connectToDatabase();

  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const unreadMessages = await Message.aggregate([
      {
        $match: {
          receiverId: new mongoose.Types.ObjectId(session.user.id),
          read: false,
        },
      },
      {
        $group: {
          _id: "$senderId",
        },
      },
    ]);

    const senderIds = unreadMessages.map((m) => ({ senderId: m._id }));

    return NextResponse.json(senderIds);
  } catch (error) {
    console.error("Unread message fetch error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
