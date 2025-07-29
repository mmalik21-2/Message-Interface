// app/messages/[id]/page.tsx
"use client";
import ChatPage from "@/components/MessagesWindow";
import { useSession } from "next-auth/react";

export default function MessagePage() {
  const { data: session } = useSession();

  return session ? <ChatPage /> : null;
}
