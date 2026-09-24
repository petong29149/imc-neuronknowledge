"use client";

import React from "react";
import { Users, ShieldCheck, CheckCircle } from "lucide-react";

export interface Stats {
  totalUsers: number;
  totalAdmins: number;
  totalRegularUsers: number;
  totalActive: number;
  totalInactive: number;
}

interface AdminMetricCardsProps {
  stats: Stats;
}

export default function AdminMetricCards({ stats }: AdminMetricCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
      <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            ผู้ใช้ทั้งหมด
          </span>
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400">
            <Users className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1.5">
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
            {stats.totalUsers}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">บัญชีในระบบ</div>
        </div>
      </div>

      <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            ผู้ดูแลระบบ (Admin)
          </span>
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1.5">
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 leading-tight">
            {stats.totalAdmins}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">สิทธิ์ผู้ดูแลระบบ</div>
        </div>
      </div>

      <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            ผู้ใช้ทั่วไป (User)
          </span>
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">
            <Users className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1.5">
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
            {stats.totalRegularUsers}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">ผู้ใช้ทั่วไป</div>
        </div>
      </div>

      <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            สถานะพร้อมใช้งาน
          </span>
          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1.5">
          <div className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 leading-tight">
            {stats.totalActive}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate">
            {stats.totalInactive > 0 ? `ระงับ ${stats.totalInactive} บัญชี` : "ทุกบัญชีพร้อมใช้"}
          </div>
        </div>
      </div>
    </div>
  );
}
