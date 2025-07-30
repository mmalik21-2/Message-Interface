/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();
    if (
      !email ||
      !otp ||
      typeof email !== "string" ||
      typeof otp !== "string"
    ) {
      return NextResponse.json(
        { error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ email });
    if (!user || user.otp !== otp || user.otpExpires < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // Mark user as verified
    await User.updateOne(
      { email },
      { $set: { otp: null, otpExpires: null, isVerified: true } }
    );

    return NextResponse.json({ message: "OTP verified" }, { status: 200 });
  } catch (error: any) {
    console.error("OTP verification error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
