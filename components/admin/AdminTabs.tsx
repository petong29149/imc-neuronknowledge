"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartColumn, Users, Brain, Server, Sparkles, Bot, ScrollText } from "lucide-react";

export interface AdminTab {
  href: string;
  label: string;
  shortLabel: string;
  icon: typeof Users;
}

export const ADMIN_TABS: AdminTab[] = [
  { href: "/admin/dashboard", label: "แดชบอร์ด", shortLabel: "Dashboard", icon: ChartColumn },
  { href: "/admin/users", label: "จัดการผู้ใช้งาน", shortLabel: "ผู้ใช้", icon: Users },
  { href: "/admin/llm", label: "LLM & Models", shortLabel: "LLM", icon: Brain },
  { href: "/admin/mcp", label: "MCP Servers", shortLabel: "MCP", icon: Server },
  { href: "/admin/agents", label: "AI Agents", shortLabel: "Agents", icon: Bot },
  { href: "/admin/skills", label: "Skills", shortLabel: "Skills", icon: Sparkles },
  { href: "/admin/prompts", label: "System Prompt", shortLabel: "Prompt", icon: ScrollText },
];

/** A tab stays active on its own route and on anything nested under it. */
export function isTabActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin Console"
      className="border-b border-slate-200/80 dark:border-white/10"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {ADMIN_TABS.map((tab) => {
            const active = isTabActive(pathname, tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`relative inline-flex items-center gap-1.5 shrink-0 px-3 sm:px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                  active
                    ? "text-[#0055fa] dark:text-blue-400"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
                <span
                  className={`absolute inset-x-2 sm:inset-x-3 -bottom-px h-0.5 rounded-full transition-colors ${
                    active ? "bg-[#0055fa] dark:bg-blue-400" : "bg-transparent"
                  }`}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
