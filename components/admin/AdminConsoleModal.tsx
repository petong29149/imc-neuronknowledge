"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Brain,
  Shield,
  X,
  Sparkles,
  Server,
} from "lucide-react";
import AdminUsersSection from "@/components/admin/AdminUsersSection";
import AdminLLMSection from "@/components/admin/AdminLLMSection";
import AdminMCPSection from "@/components/admin/AdminMCPSection";

interface AdminConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "users" | "llm" | "mcp";
}

export default function AdminConsoleModal({
  isOpen,
  onClose,
  defaultTab = "users",
}: AdminConsoleModalProps) {
  const [activeTab, setActiveTab] = useState<"users" | "llm" | "mcp">(defaultTab);

  // Sync activeTab when defaultTab changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/65 backdrop-blur-md animate-modal-backdrop">
      {/* Modal Dialog Container - Fixed Size & Spring Entrance Animation */}
      <div
        className="relative w-full max-w-5xl h-[94vh] sm:h-[88vh] min-h-[520px] max-h-[920px] flex flex-col bg-slate-50 dark:bg-[#070b14] border border-slate-200/90 dark:border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-modal-content"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Bar */}
        <div className="shrink-0 flex items-center justify-between px-3.5 sm:px-5 py-2.5 sm:py-3 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0f1d]">
          {/* Left Brand & Title */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-tr from-[#0055fa] to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-none">
                  Admin Console
                </h2>
                <span className="px-1.5 py-0.2 text-[9px] font-semibold rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20 hidden sm:inline-block">
                  Enterprise
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block mt-0.5">
                ศูนย์กลางจัดการผู้ใช้ และ AI Models
              </p>
            </div>
          </div>

          {/* Center Tabs Navigation */}
          <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setActiveTab("users")}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "users"
                  ? "bg-white dark:bg-[#0055fa] text-[#0055fa] dark:text-white shadow-xs border border-slate-200/80 dark:border-[#0055fa]"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">จัดการผู้ใช้งาน</span>
              <span className="sm:hidden">ผู้ใช้</span>
            </button>

            <button
              onClick={() => setActiveTab("llm")}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "llm"
                  ? "bg-white dark:bg-[#0055fa] text-[#0055fa] dark:text-white shadow-xs border border-slate-200/80 dark:border-[#0055fa]"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>LLM & Models</span>
            </button>

            <button
              onClick={() => setActiveTab("mcp")}
              className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === "mcp"
                  ? "bg-white dark:bg-[#0055fa] text-[#0055fa] dark:text-white shadow-xs border border-slate-200/80 dark:border-[#0055fa]"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>MCP Servers</span>
            </button>
          </div>

          {/* Right Close Button */}
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              title="ปิดหน้าต่าง (Esc)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-5 space-y-3.5">
          {activeTab === "users" && (
            <div className="animate-in fade-in duration-150">
              <AdminUsersSection />
            </div>
          )}

          {activeTab === "llm" && (
            <div className="animate-in fade-in duration-150">
              <AdminLLMSection />
            </div>
          )}

          {activeTab === "mcp" && (
            <div className="animate-in fade-in duration-150">
              <AdminMCPSection />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
