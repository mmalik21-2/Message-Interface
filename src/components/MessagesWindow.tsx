/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import clsx from "clsx";
import { Paperclip, SendHorizonal, Loader2, ArrowDown } from "lucide-react";
import Image from "next/image";
import { Textarea } from "@/components/ui/textarea";

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
}

interface Conversation {
  _id: string;
  isGroup: boolean;
  groupName?: string;
  participants: { _id: string; firstName: string; lastName: string }[];
}

export default function ChatPage() {
  const { id } = useParams();
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
        <div className="mb-4">
          <h2 className="text-lg font-bold">
            {conversation?.isGroup
              ? conversation.groupName
              : conversation?.participants
                  ?.filter((p) => p._id !== session?.user?.id)
                  .map((p) => `${p.firstName || "Unknown"} ${p.lastName || ""}`)
                  .join(", ")}
          </h2>

          {conversation?.isGroup && (
            <p className="text-sm text-gray-400 mt-1">
              {"You"}
              {conversation.participants
                .filter((p) => p._id !== session?.user?.id)
                .slice(0, 3)
                .map((p) => `, ${p.firstName || "Unknown"} ${p.lastName || ""}`)
                .join("")}
              {conversation.participants.length > 5 &&
                ` +${conversation.participants.length - 5}`}
            </p>
          )}
        </div>

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
                    <Image
                      width={500}
                      height={200}
                      src={msg.imageUrl}
                      alt="Uploaded"
                      className="rounded-lg max-w-[200px] border border-gray-700 cursor-pointer"
                      onClick={() => setSelectedImage(msg.imageUrl!)}
                    />
                  )}

                  {msg.videoUrl && (
                    <video
                      controls
                      className="rounded-lg max-w-[200px] border border-gray-700"
                    >
                      <source src={msg.videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
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
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </Card>

        {/* Image Modal */}
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
      </div>
    </div>
  );
}
