"use client";

import React from "react";
import {
  Users,
  ShieldCheck,
  Edit2,
  Trash2,
  RefreshCw,
  Mail,
  Crown,
} from "lucide-react";
import { User } from "@/context/AuthContext";

export interface UserGroupRef {
  id: number;
  name: string;
  member_role: "owner" | "member";
}

export interface UserItem {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  is_active: boolean;
  /** Groups this user belongs to, aggregated by the users API. */
  groups?: UserGroupRef[];
  created_at: string;
  updated_at: string;
}

/** How many group chips to render before collapsing into a "+N" pill. */
const VISIBLE_GROUPS = 2;

interface AdminUserTableProps {
  users: UserItem[];
  isLoading: boolean;
  currentUser: User | null;
  onToggleRole: (user: UserItem) => void;
  onToggleStatus: (user: UserItem) => void;
  onEditUser: (user: UserItem) => void;
  onDeleteUser: (user: UserItem) => void;
}

export default function AdminUserTable({
  users,
  isLoading,
  currentUser,
  onToggleRole,
  onToggleStatus,
  onEditUser,
  onDeleteUser,
}: AdminUserTableProps) {
  return (
    <div className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 rounded-xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-2 px-3 sm:px-4">ผู้ใช้งาน (User)</th>
              <th className="py-2 px-2.5 sm:px-3">บทบาท</th>
              <th className="py-2 px-2.5 sm:px-3">กลุ่ม</th>
              <th className="py-2 px-2.5 sm:px-3">สถานะ</th>
              <th className="py-2 px-3 hidden md:table-cell">วันที่สร้าง</th>
              <th className="py-2 px-3 sm:px-4 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 dark:divide-white/5 text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1.5 text-[#0055fa]" />
                  <span className="text-xs">กำลังโหลดข้อมูล...</span>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  <div className="max-w-xs mx-auto">
                    <Users className="w-8 h-8 mx-auto mb-1.5 text-slate-400 opacity-60" />
                    <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                      ไม่พบข้อมูลผู้ใช้งาน
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      ลองปรับคำค้นหาหรือตัวกรอง
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((item) => {
                const isSelf = currentUser?.id === item.id;
                const initials = item.name ? item.name.charAt(0).toUpperCase() : "U";
                const groups = item.groups ?? [];
                const shownGroups = groups.slice(0, VISIBLE_GROUPS);
                const hiddenGroups = groups.length - shownGroups.length;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors"
                  >
                    {/* User identity */}
                    <td className="py-2 sm:py-2.5 px-3 sm:px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] shadow-xs text-white shrink-0 ${
                            item.role === "admin"
                              ? "bg-gradient-to-tr from-[#0055fa] to-indigo-600"
                              : "bg-gradient-to-tr from-slate-600 to-slate-700"
                          }`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                            <span className="truncate max-w-[120px] sm:max-w-none">{item.name}</span>
                            {isSelf && (
                              <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-blue-100 dark:bg-blue-500/20 text-[#0055fa] dark:text-blue-300 shrink-0">
                                คุณ
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 truncate max-w-[150px] sm:max-w-none">
                            <Mail className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                            <span className="truncate">{item.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="py-2 sm:py-2.5 px-2.5 sm:px-3">
                      <button
                        onClick={() => onToggleRole(item)}
                        title="คลิกเพื่อสลับบทบาท Admin / User"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border transition-all cursor-pointer ${
                          item.role === "admin"
                            ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100"
                            : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-200/80"
                        }`}
                      >
                        {item.role === "admin" ? (
                          <>
                            <ShieldCheck className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                            <span>Admin</span>
                          </>
                        ) : (
                          <>
                            <Users className="w-3 h-3 text-slate-500" />
                            <span>User</span>
                          </>
                        )}
                      </button>
                    </td>

                    {/* Group chips */}
                    <td className="py-2 sm:py-2.5 px-2.5 sm:px-3">
                      {groups.length === 0 ? (
                        <span className="text-[11px] text-slate-400">ไม่มีกลุ่ม</span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1 max-w-[180px]">
                          {shownGroups.map((g) => (
                            <span
                              key={g.id}
                              title={g.name}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-300 border border-blue-200 dark:border-blue-500/20 max-w-[110px]"
                            >
                              {g.member_role === "owner" && (
                                <Crown className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                              )}
                              <span className="truncate">{g.name}</span>
                            </span>
                          ))}
                          {hiddenGroups > 0 && (
                            <span
                              title={groups.map((g) => g.name).join(", ")}
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-white/5 text-slate-500"
                            >
                              +{hiddenGroups}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-2 sm:py-2.5 px-2.5 sm:px-3">
                      <button
                        onClick={() => onToggleStatus(item)}
                        title="คลิกเพื่อสลับสถานะ"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
                          item.is_active
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100"
                            : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 hover:bg-rose-100"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.is_active ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        <span>{item.is_active ? "ปกติ" : "ระงับ"}</span>
                      </button>
                    </td>

                    {/* Created At */}
                    <td className="py-2 sm:py-2.5 px-3 hidden md:table-cell text-[11px] text-slate-400">
                      {new Date(item.created_at).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="py-2 sm:py-2.5 px-3 sm:px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditUser(item)}
                          title="แก้ไขข้อมูล"
                          className="p-1 rounded-md text-slate-500 hover:text-[#0055fa] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => onDeleteUser(item)}
                          disabled={isSelf}
                          title={
                            isSelf
                              ? "ไม่สามารถลบบัญชีของคุณเองได้"
                              : "ลบผู้ใช้งาน"
                          }
                          className={`p-1 rounded-md transition-colors cursor-pointer ${
                            isSelf
                              ? "text-slate-300 dark:text-slate-600 cursor-not-allowed"
                              : "text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                          }`}
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
