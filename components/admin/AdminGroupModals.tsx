"use client";

import React, { useMemo, useState } from "react";
import {
  UsersRound,
  Edit2,
  AlertTriangle,
  X,
  Check,
  RefreshCw,
  Search,
  Crown,
  UserMinus,
  UserPlus,
  Mail,
} from "lucide-react";
import Modal from "@/components/common/Modal";
import type { GroupItem, GroupMember } from "@/components/admin/AdminGroupTable";
import type { UserItem } from "@/components/admin/AdminUserTable";

export interface GroupForm {
  name: string;
  description: string;
  /** Knowledge Engine organization code; "" = this group is not an organization */
  org_id: string;
  is_active: boolean;
  member_ids: number[];
}

const PANEL =
  "w-full max-w-lg p-6 space-y-5 bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl";
const INPUT =
  "w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]";
const LABEL = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1";

/** Searchable checkbox list of users, shared by the form and the member editor. */
function MemberPicker({
  users,
  selectedIds,
  onToggle,
  label = "สมาชิกในกลุ่ม",
  emptyHint = "ไม่พบผู้ใช้งานที่ค้นหา",
}: {
  users: UserItem[];
  selectedIds: number[];
  onToggle: (userId: number) => void;
  label?: string;
  emptyHint?: string;
}) {
  const [term, setTerm] = useState("");

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (u) => u.name.toLowerCase().includes(needle) || u.email.toLowerCase().includes(needle)
    );
  }, [users, term]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className={LABEL}>{label}</label>
        <span className="text-[11px] text-slate-400">เลือกแล้ว {selectedIds.length} คน</span>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
        <div className="relative border-b border-slate-200 dark:border-white/10">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="ค้นหาชื่อ หรือ อีเมล..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
          {visible.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-slate-400">{emptyHint}</p>
          ) : (
            visible.map((u) => {
              const checked = selectedIds.includes(u.id);
              return (
                <label
                  key={u.id}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                    checked
                      ? "bg-blue-50/70 dark:bg-blue-500/10"
                      : "hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(u.id)}
                    className="w-3.5 h-3.5 accent-[#0055fa] cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {u.name}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                      <Mail className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{u.email}</span>
                    </div>
                  </div>
                  {u.role === "admin" && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 shrink-0">
                      Admin
                    </span>
                  )}
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

interface GroupFormModalProps {
  mode: "create" | "edit";
  users: UserItem[];
  onClose: () => void;
  form: GroupForm;
  setForm: React.Dispatch<React.SetStateAction<GroupForm>>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}

export function GroupFormModal({
  mode,
  users,
  onClose,
  form,
  setForm,
  onSubmit,
  isSubmitting,
}: GroupFormModalProps) {
  const isEdit = mode === "edit";

  const toggleMember = (userId: number) =>
    setForm((prev) => ({
      ...prev,
      member_ids: prev.member_ids.includes(userId)
        ? prev.member_ids.filter((id) => id !== userId)
        : [...prev.member_ids, userId],
    }));

  return (
    <Modal onClose={onClose} panelClassName={PANEL}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl ${
              isEdit
                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                : "bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400"
            }`}
          >
            {isEdit ? <Edit2 className="w-5 h-5" /> : <UsersRound className="w-5 h-5" />}
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isEdit ? "แก้ไขกลุ่มผู้ใช้งาน (Edit Group)" : "สร้างกลุ่มผู้ใช้งานใหม่ (Add Group)"}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={LABEL}>ชื่อกลุ่ม *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="ฝ่ายขาย"
            className={INPUT}
          />
        </div>

        <div>
          <label className={LABEL}>คำอธิบายกลุ่ม</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="หน้าที่และขอบเขตการใช้งานของกลุ่มนี้"
            className={`${INPUT} resize-none`}
          />
        </div>

        <div>
          <label className={LABEL}>รหัสองค์กรสำหรับคลังความรู้ (org_id)</label>
          <input
            type="text"
            value={form.org_id}
            onChange={(e) => setForm({ ...form, org_id: e.target.value.toLowerCase() })}
            placeholder="เช่น acme (เว้นว่างถ้ากลุ่มนี้ไม่ใช่องค์กร)"
            pattern="[a-z0-9][a-z0-9_\-]{1,62}"
            title="a-z ตัวเลข - หรือ _ ยาว 2–63 ตัว และขึ้นต้นด้วยตัวอักษรหรือตัวเลข"
            className={`${INPUT} font-mono`}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            สมาชิกของกลุ่มที่มีรหัสนี้จะอัปโหลดและค้นเอกสารในคลังความรู้ขององค์กรเดียวกัน
            {isEdit && " · เปลี่ยนรหัสแล้วเอกสารที่อัปโหลดไว้ภายใต้รหัสเดิมจะไม่แสดงในองค์กรนี้"}
          </p>
        </div>

        <div>
          <label className={LABEL}>สถานะการใช้งาน</label>
          <select
            value={form.is_active ? "active" : "inactive"}
            onChange={(e) => setForm({ ...form, is_active: e.target.value === "active" })}
            className="w-full px-3 py-2.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
          >
            <option value="active">เปิดใช้งาน (Active)</option>
            <option value="inactive">ระงับ (Suspended)</option>
          </select>
        </div>

        <MemberPicker users={users} selectedIds={form.member_ids} onToggle={toggleMember} />

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
            <span>{isEdit ? "บันทึกการแก้ไข" : "บันทึกกลุ่ม"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface ManageMembersModalProps {
  group: GroupItem;
  users: UserItem[];
  onClose: () => void;
  onAddMembers: (userIds: number[]) => Promise<void>;
  onRemoveMember: (member: GroupMember) => Promise<void>;
  onToggleMemberRole: (member: GroupMember) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Per-group membership editor: promote/demote and remove existing members,
 * and add anyone who is not in the group yet.
 */
export function ManageMembersModal({
  group,
  users,
  onClose,
  onAddMembers,
  onRemoveMember,
  onToggleMemberRole,
  isSubmitting,
}: ManageMembersModalProps) {
  const [pendingIds, setPendingIds] = useState<number[]>([]);

  const memberIds = useMemo(() => group.members.map((m) => m.id), [group.members]);
  const candidates = useMemo(
    () => users.filter((u) => !memberIds.includes(u.id)),
    [users, memberIds]
  );

  const togglePending = (userId: number) =>
    setPendingIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );

  const handleAdd = async () => {
    if (pendingIds.length === 0) return;
    await onAddMembers(pendingIds);
    setPendingIds([]);
  };

  return (
    <Modal onClose={onClose} panelClassName={PANEL}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400 shrink-0">
            <UsersRound className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
              สมาชิกกลุ่ม {group.name}
            </h2>
            <p className="text-[11px] text-slate-400">ทั้งหมด {group.members.length} คน</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer shrink-0"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Current members */}
      <div>
        <label className={LABEL}>สมาชิกปัจจุบัน</label>
        <div className="rounded-xl border border-slate-200 dark:border-white/10 max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
          {group.members.length === 0 ? (
            <p className="py-6 text-center text-[11px] text-slate-400">
              ยังไม่มีสมาชิกในกลุ่มนี้
            </p>
          ) : (
            group.members.map((m) => (
              <div key={m.id} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                    <span className="truncate">{m.name}</span>
                    {m.member_role === "owner" && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                        <Crown className="w-2.5 h-2.5" />
                        หัวหน้ากลุ่ม
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{m.email}</div>
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onToggleMemberRole(m)}
                  title={m.member_role === "owner" ? "ลดเป็นสมาชิกทั่วไป" : "ตั้งเป็นหัวหน้ากลุ่ม"}
                  className={`p-1 rounded-md transition-colors cursor-pointer disabled:opacity-50 ${
                    m.member_role === "owner"
                      ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                      : "text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => onRemoveMember(m)}
                  title="นำออกจากกลุ่ม"
                  className="p-1 rounded-md text-slate-500 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add new members */}
      <MemberPicker
        users={candidates}
        selectedIds={pendingIds}
        onToggle={togglePending}
        label="เพิ่มสมาชิกใหม่"
        emptyHint="ผู้ใช้งานทุกคนอยู่ในกลุ่มนี้แล้ว"
      />

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
        >
          ปิด
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={isSubmitting || pendingIds.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-xl shadow-sm cursor-pointer disabled:opacity-60"
        >
          {isSubmitting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <UserPlus className="w-4 h-4" />
          )}
          <span>เพิ่มสมาชิก{pendingIds.length > 0 ? ` (${pendingIds.length})` : ""}</span>
        </button>
      </div>
    </Modal>
  );
}

interface DeleteGroupModalProps {
  group: GroupItem;
  onClose: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
}

export function DeleteGroupModal({
  group,
  onClose,
  onConfirm,
  isSubmitting,
}: DeleteGroupModalProps) {
  return (
    <Modal
      onClose={onClose}
      panelClassName="w-full max-w-sm p-6 text-center space-y-4 bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl"
    >
      <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
        <AlertTriangle className="w-7 h-7" />
      </div>

      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">ยืนยันการลบกลุ่ม?</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
          คุณกำลังจะลบกลุ่ม{" "}
          <strong className="text-slate-800 dark:text-slate-200">{group.name}</strong>{" "}
          {group.member_count > 0
            ? `ซึ่งมีสมาชิกอยู่ ${group.member_count} คน สมาชิกจะถูกนำออกจากกลุ่มนี้ (บัญชีผู้ใช้ยังคงอยู่ในระบบ)`
            : "การกระทำนี้ไม่สามารถย้อนกลับได้"}
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
          {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>ลบกลุ่ม</span>}
        </button>
      </div>
    </Modal>
  );
}
