/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
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
    await User.create({
      email,
      password: password,
      firstName,
      lastName,
      phoneNumber,
      otp,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000), // OTP expires in 10 minutes
    });

    await sendOTPEmail(email, otp);

    return NextResponse.json(
      { message: "User registered, OTP sent" },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
