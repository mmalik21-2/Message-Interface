/* eslint-disable @typescript-eslint/no-unused-vars */
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
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

interface RouteContext {
  id: string;
}

export async function GET(
  req: NextRequest,
  { routeContext }: { routeContext: RouteContext }
) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = routeContext;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const user = await User.findOne({ _id: id, email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { error: "User not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber,
      profilePic: user.profilePic || "",
      _id: user._id,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { routeContext }: { routeContext: RouteContext }
) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = routeContext;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const body: UpdateBody = await req.json();
    const updateData: UpdateBody = {
      firstName: body.firstName?.trim(),
      lastName: body.lastName?.trim(),
      phoneNumber: body.phoneNumber?.trim(),
      profilePic: body.profilePic?.trim() || "",
    };

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
      { _id: id, email: session.user.email },
      { $set: { ...filteredUpdateData, updatedAt: new Date() } },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: "User not found or unauthorized" },
        { status: 404 }
      );
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
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
