"use client";

import React from "react";
import {
  UsersRound,
  Edit2,
  Trash2,
  RefreshCw,
  Crown,
  UserCog,
} from "lucide-react";

export interface GroupMember {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  is_active: boolean;
  member_role: "owner" | "member";
}

export interface GroupItem {
  id: number;
  name: string;
  description: string;
  org_id: string | null;
  is_active: boolean;
  member_count: number;
  members: GroupMember[];
  created_at: string;
  updated_at: string;
}

interface AdminGroupTableProps {
  groups: GroupItem[];
  isLoading: boolean;
  onToggleStatus: (group: GroupItem) => void;
  onManageMembers: (group: GroupItem) => void;
  onEditGroup: (group: GroupItem) => void;
  onDeleteGroup: (group: GroupItem) => void;
}

/** How many member chips to render before collapsing into a "+N" pill. */
const VISIBLE_MEMBERS = 3;

export default function AdminGroupTable({
  groups,
  isLoading,
  onToggleStatus,
  onManageMembers,
  onEditGroup,
  onDeleteGroup,
}: AdminGroupTableProps) {
  return (
    <div className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 rounded-xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-2 px-3 sm:px-4">กลุ่มผู้ใช้งาน (Group)</th>
              <th className="py-2 px-2.5 sm:px-3">สมาชิก</th>
              <th className="py-2 px-2.5 sm:px-3">สถานะ</th>
              <th className="py-2 px-3 hidden md:table-cell">วันที่สร้าง</th>
              <th className="py-2 px-3 sm:px-4 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-white/5 text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1.5 text-[#0055fa]" />
                  <span className="text-xs">กำลังโหลดข้อมูล...</span>
                </td>
              </tr>
            ) : groups.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  <div className="max-w-xs mx-auto">
                    <UsersRound className="w-8 h-8 mx-auto mb-1.5 text-slate-400 opacity-60" />
                    <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                      ยังไม่มีกลุ่มผู้ใช้งาน
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      สร้างกลุ่มแรกเพื่อจัดหมวดหมู่ผู้ใช้งานในระบบ
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              groups.map((group) => {
                const initials = group.name ? group.name.charAt(0).toUpperCase() : "G";
                const shown = group.members.slice(0, VISIBLE_MEMBERS);
                const hidden = group.members.length - shown.length;

                return (
                  <tr
                    key={group.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors"
                  >
                    {/* Group identity */}
                    <td className="py-2 sm:py-2.5 px-3 sm:px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] shadow-xs text-white shrink-0 ${
                            group.is_active
                              ? "bg-gradient-to-tr from-[#0055fa] to-indigo-600"
                              : "bg-gradient-to-tr from-slate-400 to-slate-500"
                          }`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white text-xs">
                            <span className="truncate max-w-[160px] sm:max-w-none">{group.name}</span>
                            {group.org_id && (
                              <span
                                title="รหัสองค์กรในคลังความรู้"
                                className="px-1.5 py-0.5 text-[9px] font-mono font-semibold rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-500/20 shrink-0"
                              >
                                {group.org_id}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-[320px]">
                            {group.description || "ไม่มีคำอธิบาย"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Member chips */}
                    <td className="py-2 sm:py-2.5 px-2.5 sm:px-3">
                      <button
                        onClick={() => onManageMembers(group)}
                        title="คลิกเพื่อจัดการสมาชิกในกลุ่ม"
                        className="flex flex-wrap items-center gap-1 text-left cursor-pointer group/members"
                      >
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-300 border border-blue-200 dark:border-blue-500/20 group-hover/members:bg-blue-100 transition-colors">
                          <UsersRound className="w-3 h-3" />
                          {group.member_count} คน
                        </span>
                        {shown.map((m) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 max-w-[90px]"
                          >
                            {m.member_role === "owner" && (
                              <Crown className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                            )}
                            <span className="truncate">{m.name}</span>
                          </span>
                        ))}
                        {hidden > 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-white/5 text-slate-500">
                            +{hidden}
                          </span>
                        )}
                      </button>
                    </td>

                    {/* Status badge */}
                    <td className="py-2 sm:py-2.5 px-2.5 sm:px-3">
                      <button
                        onClick={() => onToggleStatus(group)}
                        title="คลิกเพื่อสลับสถานะ"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
                          group.is_active
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100"
                            : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 hover:bg-rose-100"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            group.is_active ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        <span>{group.is_active ? "ปกติ" : "ระงับ"}</span>
                      </button>
                    </td>

                    {/* Created At */}
                    <td className="py-2 sm:py-2.5 px-3 hidden md:table-cell text-[11px] text-slate-400">
                      {new Date(group.created_at).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-2 sm:py-2.5 px-3 sm:px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onManageMembers(group)}
                          title="จัดการสมาชิก"
                          className="p-1 rounded-md text-slate-500 hover:text-[#0055fa] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors cursor-pointer"
                        >
                          <UserCog className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onEditGroup(group)}
                          title="แก้ไขกลุ่ม"
                          className="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteGroup(group)}
                          title="ลบกลุ่ม"
                          className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
