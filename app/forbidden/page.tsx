"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, LogOut, Home } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ForbiddenPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-[#060911] text-slate-900 dark:text-slate-100 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl p-8 text-center shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight mb-2">
          ไม่มีสิทธิ์เข้าถึง (Access Denied)
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          หน้าจัดการระบบนี้สงวนสิทธิ์เฉพาะผู้ใช้ระดับ{" "}
          <strong className="text-blue-600 dark:text-blue-400">Admin (ผู้ดูแลระบบ)</strong> เท่านั้น
          {user && (
            <span className="block mt-2 font-mono text-xs bg-slate-100 dark:bg-white/5 py-1 px-3 rounded-lg border border-slate-200 dark:border-white/10">
              บัญชีปัจจุบัน: {user.email} (Role: {user.role})
            </span>
          )}
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] transition-all shadow-sm"
          >
            <Home className="w-4 h-4" />
            <span>กลับหน้าหลัก</span>
          </Link>
          <button
            onClick={() => logout()}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </div>
  );
}
