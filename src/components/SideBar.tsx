/* eslint-disable @typescript-eslint/no-explicit-any */
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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import Image from "next/image";
import socket from "@/lib/socket";

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
  unreadCount?: number;
}

interface FormData {
  phoneNumber: string;
  firstName: string;
  lastName: string;
  profilePic: string;
}

export default function SideBar() {
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const { data: session, status } = useSession();
  const userId = session?.user?.id;
  const firstName = session?.user?.firstName || "";
  const lastName = session?.user?.lastName || "";
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    phoneNumber: "",
    firstName: "",
    lastName: "",
    profilePic: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const router = useRouter();
  const params = useParams();
  const activeId = params?.id;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) throw new Error(`Failed to fetch users: ${res.status}`);
        const data = await res.json();
        setUsers(data.filter((user: User) => user._id !== userId));
      } catch (err: any) {
        setError(`Failed to load users: ${err.message}`);
      }
    };

    const fetchConversations = async () => {
      try {
        const res = await fetch("/api/conversations");
        if (!res.ok) throw new Error(`Failed to fetch conversations`);
        const data = await res.json();
        const sorted = data.sort((a: Conversation, b: Conversation) => {
          if (a.groupName === "Channel") return -1;
          if (b.groupName === "Channel") return 1;
          const aTime = new Date(a.lastMessage?.createdAt || 0).getTime();
          const bTime = new Date(b.lastMessage?.createdAt || 0).getTime();
          return bTime - aTime;
        });
        setConversations(sorted);
      } catch (err: any) {
        setError(`Failed to load conversations: ${err.message}`);
      }
    };

    if (status === "authenticated" && userId) {
      fetchUsers();
      fetchConversations();
      const interval = setInterval(fetchConversations, 5000);
      return () => clearInterval(interval);
    }
  }, [status, userId]);

  useEffect(() => {
    socket.on("newMessage", (message: any) => {
      if (message.conversationId !== activeId) {
        setConversations((prev) =>
          prev.map((conv) =>
            conv._id === message.conversationId
              ? { ...conv, unreadCount: (conv.unreadCount || 0) + 1 }
              : conv
          )
        );
      }
    });

    socket.on("messagesRead", (conversationId: string) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv
        )
      );
    });

    socket.on("newConversation", (conversation: Conversation) => {
      if (conversation.participants.some((p) => p._id === userId)) {
        setConversations((prev) => [
          { ...conversation, unreadCount: 0 },
          ...prev,
        ]);
      }
    });

    return () => {
      socket.off("newMessage");
      socket.off("messagesRead");
      socket.off("newConversation");
    };
  }, [activeId, userId]);

  const startConversation = async (recipientId: string) => {
    const existingConv = conversations.find(
      (conv) =>
        !conv.isGroup &&
        conv.participants.some((p) => p._id === recipientId) &&
        conv.participants.some((p) => p._id === userId)
    );
    if (existingConv)
      return router.push(`/dashboard/messages/${existingConv._id}`);

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId }),
      });
      const conversation = await res.json();
      setConversations((prev) => [
        { ...conversation, unreadCount: 0 },
        ...prev,
      ]);
      router.push(`/dashboard/messages/${conversation._id}`);
    } catch (err: any) {
      setError(`Failed to start conversation: ${err.message}`);
    }
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

    if (finalGroupName === "Channel") {
      alert("Cannot create group named 'Channel'");
      setCreatingGroup(false);
      return;
    }

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
      setConversations((prev) => [
        { ...newConversation, unreadCount: 0 },
        ...prev,
      ]);
      setSelectedUsers([]);
      setGroupName("");
      setIsGroupModalOpen(false);
      router.push(`/dashboard/messages/${newConversation._id}`);
    } catch (err: any) {
      setError(`Failed to create group: ${err.message}`);
    } finally {
      setCreatingGroup(false);
    }
  };

  const renderProfileImage = (user: User) => {
    if (user.profilePic) {
      return (
        <div className="h-8 w-8 rounded-full overflow-hidden border border-white shadow-sm">
          <Image
            src={user.profilePic}
            alt="Profile"
            width={32}
            height={32}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }
    const initials = `${user.firstName?.[0] || "U"}${user.lastName?.[0] || ""}`;
    return (
      <div className="w-8 h-8 rounded-full bg-gray-600 text-white flex items-center justify-center text-sm font-medium">
        {initials}
      </div>
    );
  };

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      fetch(`/api/user/${session.user.id}`)
        .then(async (res) => {
          if (!res.ok) throw new Error("User fetch failed");
          return res.json();
        })
        .then((data) => {
          setFormData({
            phoneNumber: data.phoneNumber || "",
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            profilePic: data.profilePic || "",
          });
          setPreview(data.profilePic || null);
        })
        .catch((err) => setError(`Failed to load profile: ${err.message}`));
    } else if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [session, status, router]);

  return (
    <>
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

      <aside className="w-64 h-screen border-r overflow-y-auto">
        <div className="px-4 py-4 border-b">
          <div className="flex items-center justify-between gap-2">
            <Link href={`/dashboard/profile/${userId}`}>
              {preview ? (
                <div className="h-10 w-10 rounded-full overflow-hidden border border-white shadow-sm">
                  <Image
                    src={preview}
                    alt={`${firstName} ${lastName}`}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center text-white">
                  {(firstName?.[0] || "U") + (lastName?.[0] || "")}
                </div>
              )}
            </Link>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Plus className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-48">
                  <DropdownMenuItem onClick={() => setIsUserDropdownOpen(true)}>
                    Start New Chat
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => setIsGroupModalOpen(true)}>
                    Create Group
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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

        {isUserDropdownOpen && (
          <div className="px-4 py-2 border-b space-y-2">
            {users
              .filter(
                (user) =>
                  !conversations.some(
                    (conv) =>
                      !conv.isGroup &&
                      conv.participants.some((p) => p._id === user._id) &&
                      conv.participants.some((p) => p._id === userId)
                  )
              )
              .map((user) => (
                <div
                  key={user._id}
                  onClick={() => {
                    startConversation(user._id);
                    setIsUserDropdownOpen(false);
                  }}
                  className="cursor-pointer hover:bg-gradient-to-r from-cyan-400 to-green-300 p-2 rounded flex items-center gap-2"
                >
                  {renderProfileImage(user)}
                  <span>
                    {user.firstName || "Unknown"} {user.lastName || ""}
                  </span>
                </div>
              ))}
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setIsUserDropdownOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}

        <div className="px-4 py-4">
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <ul className="space-y-4">
            <li>
              <h3 className="text-lg font-medium mb-2">Conversations</h3>
              <ul className="space-y-1">
                {conversations.length > 0 ? (
                  conversations.map((conv) => {
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
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-medium">
                                  {displayName}
                                </span>
                                {conv.unreadCount ? (
                                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">
                                    {conv.unreadCount}
                                  </span>
                                ) : null}
                              </div>
                              {conv.groupName === "Channel" ? (
                                <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-1 rounded">
                                  Channel
                                </span>
                              ) : (
                                conv.isGroup && (
                                  <span className="ml-2 text-xs bg-gray-700 text-white px-2 py-1 rounded">
                                    Group
                                  </span>
                                )
                              )}
                              <p className="text-sm text-gray-400 truncate">
                                {conv.lastMessage?.text || "No messages yet"}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-400">
                    No conversations available
                  </p>
                )}
              </ul>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
}
