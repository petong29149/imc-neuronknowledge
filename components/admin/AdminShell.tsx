"use client";

import React, { useEffect } from "react";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminTabs from "@/components/admin/AdminTabs";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/app/theme-provider";

/**
 * Chrome shared by every /admin route. Lives in the admin layout so tab
 * navigation swaps only the page body — no full page load, no header remount.
 */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Admin tabs differ in height, so without a reserved scrollbar track the
  // centered layout jumps sideways by half a scrollbar on every tab change.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("admin-stable-scrollbar");
    return () => root.classList.remove("admin-stable-scrollbar");
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070b14]">
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-[#070b14]/85 backdrop-blur-xl shadow-xs">
        <AdminHeader currentUser={user} theme={theme} toggleTheme={toggleTheme} logout={logout} />
        <AdminTabs />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8">{children}</main>
    </div>
  );
}
