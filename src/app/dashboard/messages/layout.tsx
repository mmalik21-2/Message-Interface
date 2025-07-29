// app/messages/layout.tsx
import SideBar from "@/components/SideBar";
import { ReactNode } from "react";

export default function MessagesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen">
      <SideBar />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
