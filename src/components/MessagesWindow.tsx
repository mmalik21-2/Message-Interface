/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import clsx from "clsx";
import { Paperclip, SendHorizonal, Loader2, ArrowDown } from "lucide-react";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
  _id: string;
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  fileUrl?: string;
  senderId: {
    _id: string;
    firstName?: string;
    lastName?: string;
  };
  createdAt: string;
}

interface Conversation {
  _id: string;
  isGroup: boolean;
  groupName?: string;
  participants: {
    _id: string;
    firstName: string;
    lastName: string;
    profilePic?: string;
  }[];
}

export default function ChatPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  useEffect(() => {
    if (lastMessageRef.current) {
      lastMessageRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  useEffect(() => {
    if (!id) return;

    const fetchConversation = async () => {
      try {
        const res = await fetch(`/api/conversations/${id}`);
        if (!res.ok) throw new Error("Failed to fetch conversation");
        const data = await res.json();
        setConversation(data);
        setNewGroupName(data.groupName || "");
      } catch (err) {
        console.error("Failed to fetch conversation:", err);
      }
    };

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages/${id}`);
        if (!res.ok) throw new Error("Failed to fetch messages");
        const data = await res.json();
        setMessages(data);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    };

    fetchConversation();
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const sendMessage = async () => {
    if (!text.trim() || !id) return;

    setLoading(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id, text }),
      });
      if (!res.ok) throw new Error("Failed to send message");
      setText("");
      const updatedMessages = await fetch(`/api/messages/${id}`).then((res) =>
        res.json()
      );
      setMessages(updatedMessages);
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    if (file.size > 500 * 1024 * 1024) {
      alert("File too large (max 500MB)");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("conversationId", id.toString());

    setUploading(true);
    try {
      const res = await fetch("/api/messages/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("Upload failed:", data.error, data.details);
        alert(
          `Upload failed: ${data.details || data.error || "Unknown error"}`
        );
        return;
      }

      setMessages((prev) => [...prev, data]);
    } catch (error: any) {
      console.error("Upload error:", error.message);
      alert(`Upload error: ${error.message || "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  };

  const scrollToBottom = () => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col h-full p-4">
        {/* Header */}
        <div className="mb-4 flex justify-between items-start">
          <div className="flex items-center gap-3">
            {/* Profile Picture or Group Icon */}
            {conversation?.isGroup ? (
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm font-medium">
                {conversation.groupName?.[0]?.toUpperCase() || "G"}
              </div>
            ) : (
              conversation?.participants
                ?.filter((p) => p._id !== session?.user?.id)
                .map((p) => (
                  <Avatar key={p._id} className="w-10 h-10">
                    <AvatarImage
                      src={p.profilePic}
                      alt={`${p.firstName || "Unknown"} ${p.lastName || ""}`}
                    />
                    <AvatarFallback>
                      {(p.firstName?.[0] || "U") + (p.lastName?.[0] || "")}
                    </AvatarFallback>
                  </Avatar>
                ))
            )}
            <div>
              <h2 className="text-lg font-bold">
                {conversation?.isGroup
                  ? conversation.groupName
                  : conversation?.participants
                      ?.filter((p) => p._id !== session?.user?.id)
                      .map(
                        (p) => `${p.firstName || "Unknown"} ${p.lastName || ""}`
                      )
                      .join(", ")}
              </h2>
              {conversation?.isGroup && (
                <p className="text-sm text-gray-400 mt-1">
                  {"You"}
                  {conversation.participants
                    .filter((p) => p._id !== session?.user?.id)
                    .slice(0, 3)
                    .map(
                      (p) => `, ${p.firstName || "Unknown"} ${p.lastName || ""}`
                    )
                    .join("")}
                  {conversation.participants.length > 5 &&
                    ` +${conversation.participants.length - 5}`}
                </p>
              )}
            </div>
          </div>

          {conversation?.isGroup && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <span className="text-xl">⋯</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                  Edit Group Name
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-500"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  Delete Group
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Messages */}
        <Card className="flex-1 overflow-y-auto p-4 space-y-4 border-none">
          {messages.map((msg, index) => {
            const isSender = msg.senderId._id === session?.user?.id;

            return (
              <div
                key={msg._id}
                ref={index === messages.length - 1 ? lastMessageRef : null}
                className={clsx("flex", {
                  "justify-end": isSender,
                  "justify-start": !isSender,
                })}
              >
                <div
                  className={clsx("flex flex-col max-w-xs", {
                    "items-end": isSender,
                    "items-start": !isSender,
                  })}
                >
                  <span className="text-xs text-gray-400 mb-1">
                    {msg.senderId?.firstName || "Unknown"}{" "}
                    {msg.senderId?.lastName || ""}
                  </span>

                  {msg.imageUrl && (
                    <div className="flex flex-col">
                      <Image
                        width={500}
                        height={200}
                        src={msg.imageUrl}
                        alt="Uploaded"
                        className="rounded-lg max-w-[200px] border border-gray-700 cursor-pointer"
                        onClick={() => setSelectedImage(msg.imageUrl!)}
                      />
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  )}

                  {msg.videoUrl && (
                    <video
                      controls
                      className="rounded-lg max-w-[200px] border border-gray-700"
                    >
                      <source src={msg.videoUrl} type="video/mp4" />
                    </video>
                  )}

                  {msg.fileUrl && (
                    <a
                      href={msg.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline"
                    >
                      View File
                    </a>
                  )}

                  {!msg.imageUrl && !msg.videoUrl && !msg.fileUrl && (
                    <div
                      className={clsx(
                        "text-sm px-4 py-2 rounded-lg",
                        isSender
                          ? "bg-gradient-to-r from-cyan-400 to-green-300 text-black"
                          : "bg-gray-700 text-white"
                      )}
                    >
                      {msg.text}
                      <div className="text-xs text-gray-400 mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </Card>

        {/* Selected Image Modal */}
        {selectedImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
            <div className="relative max-w-[90vw] max-h-[90vh] overflow-hidden">
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-2 right-2 text-white bg-gray-800 hover:bg-gray-700 p-2 rounded-full z-50"
              >
                ✕
              </button>
              <button
                onClick={() => setZoomed((prev) => !prev)}
                className="absolute top-2 left-2 text-white bg-gray-800 hover:bg-gray-700 p-2 rounded-full z-50"
              >
                {zoomed ? "–" : "+"}
              </button>
              <div
                className={clsx("transition-transform duration-300", {
                  "scale-150": zoomed,
                  "scale-100": !zoomed,
                })}
                style={{ maxHeight: "90vh", maxWidth: "90vw" }}
              >
                <Image
                  src={selectedImage}
                  alt="Full View"
                  layout="intrinsic"
                  width={800}
                  height={600}
                  className="rounded-lg object-contain max-h-[90vh] max-w-[90vw]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Input Section */}
        <div className="mt-4 flex items-center gap-2">
          <Textarea
            className="flex-1 h-10 resize-none overflow-hidden border border-gray-700"
            placeholder="Type your message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            disabled={loading || uploading}
          />

          <Button
            variant="outline"
            className="border border-gray-600 hover:bg-gray-800"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Paperclip className="w-4 h-4" />
            )}
          </Button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip"
          />

          <Button
            className="bg-gradient-to-r from-cyan-400 to-green-300 text-black hover:opacity-90"
            onClick={sendMessage}
            disabled={loading || uploading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <SendHorizonal className="w-4 h-4" />
            )}
          </Button>

          <Button
            variant="outline"
            className="border border-gray-600 hover:bg-gray-800"
            onClick={scrollToBottom}
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
        </div>

        {/* Edit Group Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Group Name</DialogTitle>
            </DialogHeader>
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter new group name"
            />
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!conversation?._id || !newGroupName.trim()) return;
                  const previousName = conversation.groupName;

                  try {
                    // 1. Update group name
                    const res = await fetch(
                      `/api/conversations/${conversation._id}`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ groupName: newGroupName }),
                      }
                    );

                    if (!res.ok) {
                      const error = await res.text();
                      throw new Error(error || "Failed to update group name");
                    }

                    const updated = await res.json();

                    // 2. Send a regular message to the group
                    await fetch("/api/messages", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        conversationId: conversation._id,
                        text: ` changed the group name from "${previousName}" to "${newGroupName}"`,
                      }),
                    });

                    // 3. Refresh state
                    const updatedMessages = await fetch(
                      `/api/messages/${conversation._id}`
                    ).then((res) => res.json());
                    setMessages(updatedMessages);

                    setConversation((prev) =>
                      prev ? { ...prev, groupName: updated.groupName } : prev
                    );

                    setEditDialogOpen(false);
                  } catch (err: any) {
                    console.error(err);
                    alert(err.message || "Failed to update group name.");
                  }
                }}
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Group Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Group</DialogTitle>
            </DialogHeader>
            <p>
              Are you sure you want to delete this group? This action cannot be
              undone.
            </p>
            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  try {
                    const res = await fetch(
                      `/api/conversations/${conversation?._id}`,
                      {
                        method: "DELETE",
                      }
                    );
                    if (!res.ok) throw new Error("Failed to delete group");
                    setDeleteDialogOpen(false);
                    router.push("/dashboard/homePage");
                  } catch (err) {
                    console.error(err);
                    alert("Failed to delete group.");
                  }
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
