"use client";

import React from "react";
import { UserPlus, Edit2, AlertTriangle, X, Check, RefreshCw } from "lucide-react";
import { UserItem } from "./AdminUserTable";

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: {
    name: string;
    email: string;
    password: string;
    role: "admin" | "user";
    is_active: boolean;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      email: string;
      password: string;
      role: "admin" | "user";
      is_active: boolean;
    }>
  >;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function CreateUserModal({
  isOpen,
  onClose,
  form,
  setForm,
  onSubmit,
  isSubmitting,
}: CreateUserModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              เพิ่มผู้ใช้งานใหม่ (Add User)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ชื่อ - นามสกุล *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="สมศรี มุ่งมั่น"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              อีเมล (Email) *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="somsri@company.com"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              รหัสผ่านเริ่มต้น * (ขั้นต่ำ 6 ตัวอักษร)
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                บทบาท (Role)
              </label>
              <select
                value={form.role}
                onChange={(e: any) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
              >
                <option value="user">User (ผู้ใช้ทั่วไป)</option>
                <option value="admin">Admin (ผู้ดูแลระบบ)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                สถานะการใช้งาน
              </label>
              <select
                value={form.is_active ? "active" : "inactive"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    is_active: e.target.value === "active",
                  })
                }
                className="w-full px-3 py-2.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
              >
                <option value="active">เปิดใช้งาน (Active)</option>
                <option value="inactive">ระงับ (Suspended)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-xl shadow-sm cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>บันทึกผู้ใช้</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditUserModalProps {
  editingUser: UserItem | null;
  onClose: () => void;
  form: {
    name: string;
    email: string;
    password: string;
    role: "admin" | "user";
    is_active: boolean;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      name: string;
      email: string;
      password: string;
      role: "admin" | "user";
      is_active: boolean;
    }>
  >;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function EditUserModal({
  editingUser,
  onClose,
  form,
  setForm,
  onSubmit,
  isSubmitting,
}: EditUserModalProps) {
  if (!editingUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Edit2 className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              แก้ไขข้อมูลผู้ใช้ (Edit User)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ชื่อ - นามสกุล *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              อีเมล (Email) *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ตั้งรหัสผ่านใหม่ (Reset Password)
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="เว้นว่างไว้หากไม่ต้องการเปลี่ยนรหัสผ่าน"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                บทบาท (Role)
              </label>
              <select
                value={form.role}
                onChange={(e: any) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
              >
                <option value="user">User (ผู้ใช้ทั่วไป)</option>
                <option value="admin">Admin (ผู้ดูแลระบบ)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                สถานะการใช้งาน
              </label>
              <select
                value={form.is_active ? "active" : "inactive"}
                onChange={(e) =>
                  setForm({
                    ...form,
                    is_active: e.target.value === "active",
                  })
                }
                className="w-full px-3 py-2.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
              >
                <option value="active">เปิดใช้งาน (Active)</option>
                <option value="inactive">ระงับ (Suspended)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-xl shadow-sm cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>บันทึกการแก้ไข</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DeleteUserModalProps {
  deletingUser: UserItem | null;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function DeleteUserModal({
  deletingUser,
  onClose,
  onConfirm,
  isSubmitting,
}: DeleteUserModalProps) {
  if (!deletingUser) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            ยืนยันการลบผู้ใช้งาน?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            คุณกำลังจะลบผู้ใช้{" "}
            <strong className="text-slate-800 dark:text-slate-200">
              {deletingUser.name}
            </strong>{" "}
            ({deletingUser.email}) การกระทำนี้ไม่สามารถย้อนกลับได้
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <span>ลบผู้ใช้</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
