"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface User {
  _id: string;
  firstName: string | null;
  lastName: string | null;
  hasUnread?: boolean;
}

export default function SideBar() {
  const [users, setUsers] = useState<User[]>([]);
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        if (!res.ok) throw new Error("Failed to fetch users");
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error("Fetch users error:", err);
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const startConversation = async (recipientId: string) => {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId }),
    });

    const conversation = await res.json();
    if (conversation?._id) {
      router.push(`/messages/${conversation._id}`);
    }
  };

  return (
    <aside className="w-64 h-screen bg-gray-100 p-4 border-r overflow-y-auto">
      <h2 className="text-xl font-semibold mb-4">Start a Chat</h2>
      <ul className="space-y-2">
        {users.map((user) => (
          <li
            key={user._id}
            onClick={() => startConversation(user._id)}
            className="cursor-pointer hover:bg-blue-100 p-2 rounded flex items-center justify-between"
          >
            <span>
              {user.firstName || "Unknown"} {user.lastName || ""}
            </span>
            {user.hasUnread && (
              <span className="text-blue-500 font-bold ml-2">★</span>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}
