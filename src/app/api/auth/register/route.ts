/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import Conversation from "@/models/Conversation";
import mongoose from "mongoose";
import { generateOTP, sendOTPEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, phoneNumber } =
      await request.json();
    if (
      !firstName ||
      !email ||
      !password ||
      !lastName ||
      !phoneNumber ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      typeof firstName !== "string" ||
      typeof lastName !== "string" ||
      typeof phoneNumber !== "string"
    ) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    const otp = generateOTP();
    const user = await User.create({
      email,
      password, // Plain text, as per original
      firstName,
      lastName,
      phoneNumber,
      otp,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000), // OTP expires in 10 minutes
    });

    const userObjectId = new mongoose.Types.ObjectId(user._id);
    console.log("Register: Created user with ID", userObjectId.toString());

    let channel = await Conversation.findOne({
      groupName: "Channel",
      isGroup: true,
    });
    if (!channel) {
      channel = await Conversation.create({
        participants: [userObjectId],
        isGroup: true,
        groupName: "Channel",
      });
      console.log(
        "Register: Created Channel group with ID",
        channel._id.toString(),
        "Participants:",
        channel.participants.length
      );
    } else {
      if (
        !channel.participants.some((id: mongoose.Types.ObjectId) =>
          id.equals(userObjectId)
        )
      ) {
        channel.participants.push(userObjectId);
        await channel.save();
        console.log(
          "Register: Added user to Channel group",
          channel._id.toString(),
          "Participants:",
          channel.participants.length
        );
      } else {
        console.log(
          "Register: User already in Channel group",
          channel._id.toString()
        );
      }
    }

    await sendOTPEmail(email, otp);

    return NextResponse.json(
      { message: "User registered, OTP sent, added to Channel group" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error.message, error.stack);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
