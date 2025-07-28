"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  _id: string;
  firstName: string | null;
  lastName: string | null;
}

export default function SideBar() {
  const [users, setUsers] = useState<User[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch("/api/users");
      if (!res.ok) return;
      const data = await res.json();
      setUsers(data);
    };

    fetchUsers();
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
    <aside className="w-64 h-screen  p-4 border-r overflow-y-auto">
      <h2 className="text-xl font-semibold mb-4">Start a Chat</h2>
      <ul className="space-y-2">
        {users.map((user) => (
          <li
            key={user._id}
            onClick={() => startConversation(user._id)}
            className="cursor-pointer hover:bg-gradient-to-r from-cyan-400 to-green-300  p-2 rounded"
          >
            {user.firstName || "Unknown"} {user.lastName || ""}
          </li>
        ))}
      </ul>
    </aside>
  );
}
