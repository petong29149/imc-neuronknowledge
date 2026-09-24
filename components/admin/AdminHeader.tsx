"use client";

import React from "react";
import Link from "next/link";
import { BookOpen, Shield, Home, Sun, Moon, LogOut, Brain, Sparkles, Users } from "lucide-react";
import { User } from "@/context/AuthContext";

interface AdminHeaderProps {
  currentUser: User | null;
  theme: string | undefined;
  toggleTheme: () => void;
  logout: () => void;
  activeTab?: "users" | "llm";
  onTabChange?: (tab: "users" | "llm") => void;
}

export default function AdminHeader({
  currentUser,
  theme,
  toggleTheme,
  logout,
  activeTab = "users",
  onTabChange,
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#070b14]/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-8 py-3.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-[#0055fa] to-[#2670ff] text-white shadow-xs">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tight text-slate-900 dark:text-white">
              Neuron<span className="text-[#0055fa] dark:text-[#3b82f6]">Knowledge</span>
            </span>
          </Link>

          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20">
            <Shield className="w-3.5 h-3.5" />
            Admin Console
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">

          <Link
            href="/chat"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-xl shadow-xs transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Chat AI</span>
          </Link>

          <Link
            href="/"
            title="กลับสู่หน้าหลัก"
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
          >
            <Home className="w-3.5 h-3.5" />
          </Link>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-[#fec921]" />
            ) : (
              <Moon className="w-4 h-4 text-[#0055fa]" />
            )}
          </button>

          {/* Admin User Profile Tag */}
          <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200 dark:border-white/10">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {currentUser?.name?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                {currentUser?.name}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {currentUser?.email}
              </div>
            </div>
            <button
              onClick={logout}
              title="ออกจากระบบ"
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
