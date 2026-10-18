import { useState } from "react";
import DashboardHeader from "./DashboardHeader";
import DashboardSidebar from "./DashboardSidebar";

export default function DashboardLayout({
  children,
  user,
  attentionCount = 0,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-on-background">
      {/* Sidebar (persistent on lg screens, off-canvas drawer on mobile) */}
      <DashboardSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={user?.role}
        attentionCount={attentionCount}
      />

      {/* Main app container */}
      <div className="flex flex-1 flex-col min-w-0">
        <DashboardHeader
          user={user}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />

        <main className="flex-1 w-full max-w-container-max mx-auto px-gutter py-md sm:py-lg">
          {children}
        </main>
      </div>
    </div>
  );
}
