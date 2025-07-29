// app/page.tsx
import SideBar from "@/components/SideBar";

export default function HomePage() {
  return (
    <div className="flex h-screen">
      <SideBar />
      {/* Optional placeholder if you want a default message panel */}
      <div className="flex-1 flex items-center justify-center text-gray-500">
        Select a conversation to start chatting
      </div>
    </div>
  );
}
