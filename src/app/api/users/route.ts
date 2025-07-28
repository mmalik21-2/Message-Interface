import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
      }
      const user = await User.findById(id).select("firstName lastName _id");
      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      return NextResponse.json({
        _id: user._id.toString(),
        firstName: user.firstName || null,
        lastName: user.lastName || null,
      });
    } else {
      const users = await User.find({ _id: { $ne: session.user.id } }).select(
        "firstName lastName _id"
      );
      return NextResponse.json(
        users.map((user) => ({
          _id: user._id.toString(),
          firstName: user.firstName || null,
          lastName: user.lastName || null,
        }))
      );
    }
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { firstName, lastName, phoneNumber } = await req.json();

    if (
      !firstName ||
      !lastName ||
      !phoneNumber ||
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof phoneNumber !== "string"
    ) {
      return NextResponse.json(
        { error: "All fields are required and must be strings" },
        { status: 400 }
      );
    }

    const user = await User.findByIdAndUpdate(
      session.user.id,
      { firstName, lastName, phoneNumber },
      { new: true, runValidators: true }
    ).select("firstName lastName email _id");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Profile updated",
      user: {
        _id: user._id.toString(),
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        email: user.email || null,
      },
    });
  } catch (error) {
    console.error("PUT Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
