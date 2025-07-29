"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ModeToggle } from "./ModeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, LogOut } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import Image from "next/image";

interface User {
  _id: string;
  firstName?: string | null;
  lastName?: string | null;
  profilePic?: string | null;
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
  const userId = session?.user?.id;
  const firstName = session?.user?.firstName || "";
  const lastName = session?.user?.lastName || "";
  const profilePic = session?.user?.profilePic || "";

  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const router = useRouter();
  const params = useParams();
  const activeId = params?.id;

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.filter((user: User) => user._id !== userId));
    };

    const fetchConversations = async () => {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      const sorted = data.sort((a: Conversation, b: Conversation) => {
        const aTime = new Date(a.lastMessage?.createdAt || 0).getTime();
        const bTime = new Date(b.lastMessage?.createdAt || 0).getTime();
        return bTime - aTime;
      });
      setConversations(sorted);
    };

    let interval: NodeJS.Timeout;
    if (status === "authenticated" && userId) {
      fetchUsers();
      fetchConversations();
      interval = setInterval(fetchConversations, 5000);
    }
    return () => clearInterval(interval);
  }, [status, userId]);

  const startConversation = async (recipientId: string) => {
    const existingConv = conversations.find(
      (conv) =>
        !conv.isGroup &&
        conv.participants.some((p) => p._id === recipientId) &&
        conv.participants.some((p) => p._id === userId)
    );
    if (existingConv)
      return router.push(`/dashboard/messages/${existingConv._id}`);

    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId }),
    });

    const conversation = await res.json();
    setConversations((prev) => [conversation, ...prev]);
    router.push(`/dashboard/messages/${conversation._id}`);
  };

  const createGroupConversation = async () => {
    if (selectedUsers.length < 2) return alert("Select at least 2 users");

    setCreatingGroup(true);
    const selectedNames = users
      .filter((u) => selectedUsers.includes(u._id))
      .map((u) => `${u.firstName || "Unknown"} ${u.lastName || ""}`)
      .slice(0, 3)
      .join(", ");

    const finalGroupName =
      groupName.trim() ||
      `${selectedNames}${selectedUsers.length > 3 ? "..." : ""}`;

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
    setCreatingGroup(false);
    router.push(`/dashboard/messages/${newConversation._id}`);
  };

  const renderProfileImage = (user: User) => {
    if (user.profilePic) {
      return (
        <Image
          src={user.profilePic}
          alt="Profile"
          width={32}
          height={32}
          className="rounded-full object-cover"
        />
      );
    }
    const initials = `${user.firstName?.[0] || "U"}${user.lastName?.[0] || ""}`;
    return (
      <div className="w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center text-sm font-medium">
        {initials}
      </div>
    );
  };

  return (
    <>
      {/* Group Modal */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
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
                  className={clsx(
                    "flex items-center gap-3 p-3 cursor-pointer border-b hover:bg-gray-100 dark:hover:bg-gray-800",
                    isSelected &&
                      "bg-gradient-to-r from-cyan-400 to-green-300 text-white"
                  )}
                >
                  {renderProfileImage(user)}
                  <span>
                    {user.firstName || "Unknown"} {user.lastName || ""}
                  </span>
                </div>
              );
            })}
          </div>
          <Button
            onClick={createGroupConversation}
            className="w-full"
            disabled={creatingGroup || selectedUsers.length < 2}
          >
            {creatingGroup ? "Creating..." : "Create Group"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Sidebar */}
      <aside className="w-64 h-screen border-r overflow-y-auto">
        <div className="px-4 py-4 border-b">
          <div className="flex items-center justify-between gap-2">
            <Link href={`/dashboard/profile/${userId}`}>
              {profilePic ? (
                <Image
                  src={profilePic}
                  alt={`${firstName} ${lastName}`}
                  width={40}
                  height={40}
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center text-white">
                  {(firstName?.[0] || "U") + (lastName?.[0] || "")}
                </div>
              )}
            </Link>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsGroupModalOpen(true)}
              >
                <Plus className="w-5 h-5" />
              </Button>
              <div className="w-9 h-9">
                <ModeToggle />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: "/" })}
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="px-4 py-4">
          <ul className="space-y-4">
            <li>
              <h3 className="text-lg font-medium mb-2">Users</h3>
              <ul className="space-y-1">
                {users.map((user) => (
                  <li
                    key={user._id}
                    onClick={() => startConversation(user._id)}
                    className="cursor-pointer hover:bg-gradient-to-r from-cyan-400 to-green-300 p-2 rounded flex items-center gap-2"
                  >
                    {renderProfileImage(user)}
                    <span>
                      {user.firstName || "Unknown"} {user.lastName || ""}
                    </span>
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
                        .filter((p) => p._id !== userId)
                        .map(
                          (p) =>
                            `${p.firstName || "Unknown"} ${p.lastName || ""}`
                        )
                        .join(", ");

                  const displayPic =
                    !conv.isGroup &&
                    conv.participants.find((p) => p._id !== userId);

                  return (
                    <li key={conv._id}>
                      <Link
                        href={`/dashboard/messages/${conv._id}`}
                        className={clsx(
                          "cursor-pointer hover:bg-gradient-to-r from-cyan-400 to-green-300 p-2 rounded block",
                          activeId === conv._id &&
                            "bg-gradient-to-r from-cyan-400 to-green-300"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {displayPic && renderProfileImage(displayPic)}
                          <div>
                            <span className="font-medium">{displayName}</span>
                            {conv.isGroup && (
                              <span className="ml-2 text-xs bg-gray-700 text-white px-2 py-1 rounded">
                                Group
                              </span>
                            )}
                            <p className="text-sm text-gray-400 truncate">
                              {conv.lastMessage?.text || "No messages yet"}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
}
