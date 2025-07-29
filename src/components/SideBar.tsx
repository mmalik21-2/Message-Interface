/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ModeToggle } from "./ModeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface User {
  _id: string;
  firstName: string | null;
  lastName: string | null;
}

interface Conversation {
  _id: string;
  participants: User[];
  isGroup: boolean;
  groupName?: string;
  lastMessage?: { text: string; createdAt: Date };
}

export default function SideBar() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) throw new Error(`Failed to fetch users`);
        const data = await res.json();
        setUsers(data.filter((user: User) => user._id !== session?.user?.id));
      } catch (error: any) {
        console.error("Error fetching users:", error.message);
      }
    };

    const fetchConversations = async () => {
      try {
        const res = await fetch("/api/conversations");
        if (!res.ok) throw new Error(`Failed to fetch conversations`);
        const data = await res.json();
        setConversations(data);
      } catch (error: any) {
        console.error("Error fetching conversations:", error.message);
      }
    };

    if (status === "authenticated" && session?.user?.id) {
      fetchUsers();
      fetchConversations();
      const interval = setInterval(fetchConversations, 5000);
      return () => clearInterval(interval);
    }
  }, [session, status]);

  const startConversation = async (recipientId: string) => {
    try {
      const existingConv = conversations.find(
        (conv) =>
          !conv.isGroup &&
          conv.participants.some((p) => p._id === recipientId) &&
          conv.participants.some((p) => p._id === session?.user?.id)
      );

      if (existingConv) {
        router.push(`/messages/${existingConv._id}`);
        return;
      }

      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId }),
      });

      const conversation = await res.json();
      setConversations((prev) => [conversation, ...prev]);
      router.push(`/messages/${conversation._id}`);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const createGroupConversation = async () => {
    if (selectedUsers.length < 2) {
      alert("Select at least 2 users for a group chat");
      return;
    }

    const selectedNames = users
      .filter((u) => selectedUsers.includes(u._id))
      .map((u) => `${u.firstName || "Unknown"} ${u.lastName || ""}`)
      .slice(0, 3)
      .join(", ");

    const finalGroupName =
      groupName.trim() ||
      `${selectedNames}${selectedUsers.length > 3 ? "..." : ""}`;

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: selectedUsers,
          isGroup: true,
          groupName: finalGroupName,
        }),
      });

      const newConversation = await res.json();
      setConversations((prev) => [newConversation, ...prev]);
      setSelectedUsers([]);
      setGroupName("");
      setIsGroupModalOpen(false);
      router.push(`/messages/${newConversation._id}`);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <>
      {/* Full-screen Group Modal */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="w-10 h-10 rounded-full"
          ></Button>
        </DialogTrigger>

        <DialogContent className="w-full sm:max-w-2xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Group</DialogTitle>
            <DialogDescription>
              Select users and optionally name your group.
            </DialogDescription>
          </DialogHeader>

          <Input
            placeholder="Group name (optional)"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="mb-4"
          />

          <div className="mb-4 max-h-[300px] overflow-y-auto border rounded-lg">
            {users.map((user) => {
              const isSelected = selectedUsers.includes(user._id);
              return (
                <div
                  key={user._id}
                  onClick={() =>
                    setSelectedUsers((prev) =>
                      isSelected
                        ? prev.filter((id) => id !== user._id)
                        : [...prev, user._id]
                    )
                  }
                  className={`flex justify-between items-center p-3 cursor-pointer border-b hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    isSelected
                      ? "bg-gradient-to-r from-cyan-400 to-green-300 text-white"
                      : ""
                  }`}
                >
                  <span>
                    {user.firstName || "Unknown"} {user.lastName || ""}
                  </span>
                  <span
                    className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${
                      isSelected
                        ? "bg-green-500 border-green-500"
                        : "border-gray-400"
                    }`}
                  >
                    {isSelected && (
                      <span className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <Button onClick={createGroupConversation} className="w-full">
            Create Group
          </Button>
        </DialogContent>
      </Dialog>

      {/* Sidebar */}
      <aside className="w-64 h-screen p-4 border-r overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Chats</h2>
          <div className="flex items-center gap-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsGroupModalOpen(true)}
              className="w-10 h-10 rounded-full"
            >
              <Plus className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-full">
              <ModeToggle />
            </div>
          </div>
        </div>

        <ul className="space-y-2">
          <li>
            <h3 className="text-lg font-medium mb-2">Users</h3>
            <ul className="space-y-1">
              {users.map((user) => (
                <li
                  key={user._id}
                  onClick={() => startConversation(user._id)}
                  className="cursor-pointer hover:bg-gradient-to-r from-cyan-400 to-green-300 p-2 rounded"
                >
                  {user.firstName || "Unknown"} {user.lastName || ""}
                </li>
              ))}
            </ul>
          </li>

          <li>
            <h3 className="text-lg font-medium mb-2">Conversations</h3>
            <ul className="space-y-1">
              {conversations.map((conv) => {
                const displayName = conv.isGroup
                  ? conv.groupName || "Group Chat"
                  : conv.participants
                      .filter((p) => p._id !== session?.user?.id)
                      .map(
                        (p) => `${p.firstName || "Unknown"} ${p.lastName || ""}`
                      )
                      .join(", ");

                return (
                  <li key={conv._id}>
                    <Link
                      href={`/messages/${conv._id}`}
                      className="cursor-pointer hover:bg-gradient-to-r from-cyan-400 to-green-300 p-2 rounded block"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{displayName}</span>
                        {conv.isGroup && (
                          <span className="text-xs bg-gray-700 text-white px-2 py-1 rounded">
                            Group
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 truncate">
                        {conv.lastMessage?.text
                          ? conv.lastMessage.text
                          : "No messages yet"}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </li>
        </ul>
      </aside>
    </>
  );
}
