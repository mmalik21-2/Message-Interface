/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import Conversation from "@/models/Conversation";
import mongoose, { Document } from "mongoose";

interface IPopulatedConversation extends Document {
  _id: mongoose.Types.ObjectId;
  participants: {
    _id: string;
    firstName?: string;
    lastName?: string;
    profilePic?: string;
  }[];
  isGroup: boolean;
  groupName?: string;
  lastMessage?: mongoose.Types.ObjectId;
  __v: number;
}

export async function POST() {
  try {
    await connectToDatabase();
    const users = await User.find().select("_id");
    const userIds = users.map((user) => new mongoose.Types.ObjectId(user._id));

    if (userIds.length === 0) {
      console.warn("Migrate channel: No users found in database");
      return NextResponse.json(
        { message: "No users found to add to Channel" },
        { status: 200 }
      );
    }

    let channel = await Conversation.findOne({
      groupName: "Channel",
      isGroup: true,
    });
    if (!channel) {
      channel = await Conversation.create({
        participants: userIds,
        isGroup: true,
        groupName: "Channel",
      });
      console.log(
        "Migrate channel: Created Channel group with ID",
        channel._id.toString(),
        "Participants:",
        userIds.length
      );
    } else {
      const newParticipants = userIds.filter(
        (id: mongoose.Types.ObjectId) =>
          !channel.participants.some((p: mongoose.Types.ObjectId) =>
            p.equals(id)
          )
      );
      if (newParticipants.length > 0) {
        channel.participants = [...channel.participants, ...newParticipants];
        await channel.save();
        console.log(
          "Migrate channel: Added",
          newParticipants.length,
          "users to Channel group",
          channel._id.toString()
        );
      } else {
        console.log("Migrate channel: No new users to add to Channel group");
      }
    }

    const populatedChannel = await Conversation.findById(channel._id)
      .populate<{
        participants: {
          _id: string;
          firstName?: string;
          lastName?: string;
          profilePic?: string;
        }[];
      }>("participants", "firstName lastName profilePic")
      .lean<IPopulatedConversation>();

    console.log(
      "Migrate channel: Final Channel group",
      populatedChannel?._id.toString(),
      "Participants:",
      populatedChannel?.participants.length || 0
    );
    return NextResponse.json(populatedChannel || {});
  } catch (error: any) {
    console.error(
      "POST /api/migrate-channel error:",
      error.message,
      error.stack
    );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
