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
      const user = await User.findOne({ email: session.user.email });
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
    }
  } catch (error) {
    console.error("GET Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: UpdateBody = await req.json();
    console.log("PATCH Request Body:", body); // Debug request body

    const updateData: UpdateBody = {
      firstName: body.firstName ? body.firstName.trim() : undefined,
      lastName: body.lastName ? body.lastName.trim() : undefined,
      phoneNumber: body.phoneNumber ? body.phoneNumber.trim() : undefined,
      profilePic: body.profilePic !== undefined ? body.profilePic : "", // Explicitly handle profilePic
    };

    // Remove undefined fields from updateData
    const filteredUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(filteredUpdateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided" },
        { status: 400 }
      );
    }

    const user = await User.findOneAndUpdate(
      { email: session.user.email },
      { $set: { ...filteredUpdateData, updatedAt: new Date() } },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: "Profile updated",
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          profilePic: user.profilePic || "",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("PATCH Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
