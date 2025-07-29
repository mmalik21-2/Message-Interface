/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import Conversation from "@/models/Conversation";
import type { Types } from "mongoose";

// GET a conversation by ID
export async function GET(request: NextRequest) {
  await connectToDatabase();
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();

  if (!id) {
    return new NextResponse("Conversation ID is required", { status: 400 });
  }

  const raw = await Conversation.findById(id)
    .populate("participants", "firstName lastName profilePic")
    .lean();

  if (!raw || Array.isArray(raw)) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  const isParticipant = raw.participants.some(
    (p: any) => p._id.toString() === session.user.id
  );

  if (!isParticipant) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(raw);
}

// PATCH to rename a group
export async function PATCH(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.pathname.split("/").pop();

    const { groupName } = await request.json();

    if (!groupName?.trim()) {
      return NextResponse.json(
        { error: "Group name required" },
        { status: 400 }
      );
    }

    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.isGroup) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const isParticipant = conversation.participants.some(
      (p: any) => p.toString() === session.user.id
    );

    if (!isParticipant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    conversation.groupName = groupName;
    await conversation.save();

    return NextResponse.json({ message: "Group name updated", groupName });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE a group conversation
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.pathname.split("/").pop();

    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.isGroup) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const isParticipant = conversation.participants.some(
      (p: any) => p.toString() === session.user.id
    );

    if (!isParticipant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await Conversation.findByIdAndDelete(id);
    return NextResponse.json({ message: "Group deleted" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
