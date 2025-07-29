import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";

interface UpdateBody {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  profilePic?: string;
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
      }
      const user = await User.findById(id);
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        profilePic: user.profilePic,
        _id: user._id,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } else {
      // Fetch all users except the current user
      const users = await User.find({
        email: { $ne: session.user.email },
      }).select(
        "email firstName lastName phoneNumber profilePic _id createdAt updatedAt"
      );
      return NextResponse.json(users);
    }
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
