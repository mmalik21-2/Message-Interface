"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const Home = () => {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-cyan-400 to-green-300 px-4 text-white">
      {/* Avatar Circle */}
      <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center shadow-lg">
        <span className="text-4xl font-bold text-white">👤</span>
      </div>

      {/* Title */}
      <h1 className="mt-6 text-4xl font-extrabold text-center drop-shadow-md">
        Message-Interface
      </h1>

      {/* Subtitle */}
      <p className="mt-3 text-md text-center text-white/90 max-w-md">
        Seamless chat experience with powerful messaging features. Sign up to
        get started or log in to continue.
      </p>

      {/* Sign Up Button */}
      <Button
        onClick={() => router.push("/register")}
        className="mt-10 bg-black hover:bg-white text-white hover:text-black font-semibold px-8 py-3 rounded-xl transition duration-300 shadow-md w-64"
      >
        Sign Up
      </Button>

      {/* OR separator */}
      <h2 className="mt-5 text-lg font-semibold">or</h2>

      {/* Log In Button */}
      <Button
        onClick={() => router.push("/login")}
        className="mt-5 bg-black hover:bg-white text-white hover:text-black font-semibold px-8 py-3 rounded-xl transition duration-300 shadow-md w-64"
      >
        Log In
      </Button>
    </div>
  );
};

export default Home;
