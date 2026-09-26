"use client";

import React, { useState } from "react";
import { Users, UsersRound } from "lucide-react";
import AdminUsersSection from "@/components/admin/AdminUsersSection";
import AdminGroupsSection from "@/components/admin/AdminGroupsSection";

type SubTab = "users" | "groups";

const SUB_TABS: { id: SubTab; label: string; icon: typeof Users }[] = [
  { id: "users", label: "ผู้ใช้งาน (Users)", icon: Users },
  { id: "groups", label: "กลุ่มผู้ใช้งาน (Groups)", icon: UsersRound },
];

/**
 * Users tab body. Keeps both panes mounted-on-demand behind a sub-tab switcher
 * so users and groups share one admin tab without a route change.
 */
export default function AdminUsersWorkspace() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("users");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 w-fit">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              aria-current={active ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                active
                  ? "bg-white dark:bg-[#0055fa] text-[#0055fa] dark:text-white shadow-xs border border-slate-200/80 dark:border-[#0055fa]"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeSubTab === "users" ? <AdminUsersSection /> : <AdminGroupsSection />}
    </div>
  );
}
