"use client";

import React from "react";
import { Search, Filter } from "lucide-react";

interface AdminUserFilterProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  roleFilter: "all" | "admin" | "user";
  setRoleFilter: (val: "all" | "admin" | "user") => void;
  statusFilter: "all" | "active" | "inactive";
  setStatusFilter: (val: "all" | "active" | "inactive") => void;
}

export default function AdminUserFilter({
  searchQuery,
  setSearchQuery,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
}: AdminUserFilterProps) {
  return (
    <div className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 rounded-xl p-2 sm:p-2.5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
      {/* Search box */}
      <div className="relative flex-1">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาชื่อ หรือ อีเมล..."
          className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1.5 focus:ring-[#0055fa] transition-all"
        />
      </div>

      {/* Filter Dropdowns */}
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
          <Filter className="w-3 h-3" />
        </div>

        <select
          value={roleFilter}
          onChange={(e: any) => setRoleFilter(e.target.value)}
          className="flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1.5 focus:ring-[#0055fa]"
        >
          <option value="all">ทุกบทบาท</option>
          <option value="admin">เฉพาะ Admin</option>
          <option value="user">เฉพาะ User</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e: any) => setStatusFilter(e.target.value)}
          className="flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1.5 focus:ring-[#0055fa]"
        >
          <option value="all">ทุกสถานะ</option>
          <option value="active">เปิดใช้งาน</option>
          <option value="inactive">ระงับใช้งาน</option>
        </select>
      </div>
    </div>
  );
}
