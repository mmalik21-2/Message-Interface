"use client";
import SideBar from "@/components/SideBar";
import { useSession } from "next-auth/react";

export default function HomePage() {
  const { data: session } = useSession();
  return session ? (
    <div className="flex h-screen">
      <SideBar />
      {/* Optional placeholder if you want a default message panel */}
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Select a conversation to start chatting
      </div>
    </div>
  ) : null;
}
