"use client";

import React, { useEffect } from "react";
import { LayoutDashboard, Database, Library, Bot } from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminTabs, { type AdminTab } from "@/components/admin/AdminTabs";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/app/theme-provider";

// Use cases live under a Knowledge Set and the playground under an Agent, so they have no tab of their own.
export const STUDIO_TABS: AdminTab[] = [
  { href: "/studio", label: "ภาพรวม", shortLabel: "ภาพรวม", icon: LayoutDashboard, exact: true },
  { href: "/studio/connections", label: "แหล่งข้อมูล", shortLabel: "Data", icon: Database },
  { href: "/studio/knowledge", label: "Knowledge Sets", shortLabel: "Knowledge", icon: Library },
  { href: "/studio/agents", label: "Agents", shortLabel: "Agents", icon: Bot },
];

/** Chrome shared by every /studio route (same header and tab style as the admin console). */
export default function StudioShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("admin-stable-scrollbar");
    return () => root.classList.remove("admin-stable-scrollbar");
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14]">
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#070b14]/85 backdrop-blur-xl shadow-xs">
        <AdminHeader
          currentUser={user}
          theme={theme}
          toggleTheme={toggleTheme}
          logout={logout}
          badge="Creator Studio"
        />
        <AdminTabs tabs={STUDIO_TABS} ariaLabel="Creator Studio" />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">{children}</main>
    </div>
  );
}
