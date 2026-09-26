"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  UsersRound,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  UserCheck,
  UserX,
} from "lucide-react";

import AdminGroupTable, {
  GroupItem,
  GroupMember,
} from "@/components/admin/AdminGroupTable";
import {
  GroupFormModal,
  ManageMembersModal,
  DeleteGroupModal,
  GroupForm,
} from "@/components/admin/AdminGroupModals";
import type { UserItem } from "@/components/admin/AdminUserTable";

export interface GroupStats {
  totalGroups: number;
  totalActive: number;
  totalInactive: number;
  totalAssignedUsers: number;
  totalUngroupedUsers: number;
}

type ModalState =
  | null
  | { type: "create" }
  | { type: "edit"; group: GroupItem }
  | { type: "members"; group: GroupItem }
  | { type: "delete"; group: GroupItem };

const EMPTY_FORM: GroupForm = {
  name: "",
  description: "",
  is_active: true,
  member_ids: [],
};

export default function AdminGroupsSection() {
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [stats, setStats] = useState<GroupStats>({
    totalGroups: 0,
    totalActive: 0,
    totalInactive: 0,
    totalAssignedUsers: 0,
    totalUngroupedUsers: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [form, setForm] = useState<GroupForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/groups?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setGroups(data.groups || []);
        if (data.stats) setStats(data.stats);
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการโหลดข้อมูลกลุ่ม", "error");
      }
    } catch {
      showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  // The member pickers need the full user list, unaffected by the group filters
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      // The picker degrades to empty; the group list itself still works
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  /** Re-read the group behind an open modal so its member list stays in sync. */
  const refreshOpenGroup = async (groupId: number) => {
    try {
      const res = await fetch(`/api/admin/groups/${groupId}`);
      if (!res.ok) return;
      const data = await res.json();
      const fresh = data.group;
      setModal((prev) =>
        prev && prev.type === "members" && prev.group.id === groupId
          ? {
              type: "members",
              group: { ...fresh, member_count: fresh.members.length },
            }
          : prev
      );
    } catch {
      // Leave the modal showing what it has; the table refresh still lands
    }
  };

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal({ type: "create" });
  };

  const openEdit = (group: GroupItem) => {
    setForm({
      name: group.name,
      description: group.description || "",
      is_active: group.is_active,
      member_ids: group.members.map((m) => m.id),
    });
    setModal({ type: "edit", group });
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal || (modal.type !== "create" && modal.type !== "edit")) return;

    setSubmitting(true);
    try {
      const isEdit = modal.type === "edit";
      const url = isEdit ? `/api/admin/groups/${modal.group.id}` : "/api/admin/groups";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "บันทึกกลุ่มเรียบร้อยแล้ว");
        setModal(null);
        setForm(EMPTY_FORM);
        fetchGroups();
      } else {
        showToast(data.error || "ไม่สามารถบันทึกกลุ่มได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (group: GroupItem) => {
    try {
      const res = await fetch(`/api/admin/groups/${group.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !group.is_active }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          `เปลี่ยนสถานะกลุ่ม ${group.name} เป็น ${
            !group.is_active ? "เปิดใช้งาน" : "ระงับการใช้งาน"
          } แล้ว`
        );
        fetchGroups();
      } else {
        showToast(data.error || "ไม่สามารถเปลี่ยนสถานะได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาด", "error");
    }
  };

  const handleDeleteGroup = async () => {
    if (!modal || modal.type !== "delete") return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/groups/${modal.group.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "ลบกลุ่มเรียบร้อยแล้ว");
        setModal(null);
        fetchGroups();
      } else {
        showToast(data.error || "ไม่สามารถลบกลุ่มได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการลบ", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddMembers = async (groupId: number, userIds: number[]) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_ids: userIds }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "เพิ่มสมาชิกเรียบร้อยแล้ว");
        await Promise.all([refreshOpenGroup(groupId), fetchGroups()]);
      } else {
        showToast(data.error || "ไม่สามารถเพิ่มสมาชิกได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเพิ่มสมาชิก", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (groupId: number, member: GroupMember) => {
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/admin/groups/${groupId}/members?user_id=${member.id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "นำสมาชิกออกจากกลุ่มเรียบร้อยแล้ว");
        await Promise.all([refreshOpenGroup(groupId), fetchGroups()]);
      } else {
        showToast(data.error || "ไม่สามารถนำสมาชิกออกได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการนำสมาชิกออก", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleMemberRole = async (groupId: number, member: GroupMember) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/groups/${groupId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: member.id,
          member_role: member.member_role === "owner" ? "member" : "owner",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "เปลี่ยนบทบาทสมาชิกเรียบร้อยแล้ว");
        await Promise.all([refreshOpenGroup(groupId), fetchGroups()]);
      } else {
        showToast(data.error || "ไม่สามารถเปลี่ยนบทบาทสมาชิกได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเปลี่ยนบทบาทสมาชิก", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-3.5 py-2.5 rounded-xl shadow-xl border animate-in slide-in-from-top duration-300 text-xs ${
            toast.type === "success"
              ? "bg-emerald-500 text-white border-emerald-400"
              : "bg-rose-600 text-white border-rose-500"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Title + Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div>
          <h2 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white">
            กลุ่มผู้ใช้งานทั้งหมด
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            จัดกลุ่มผู้ใช้งานตามทีมหรือหน่วยงาน เพื่อบริหารสมาชิกได้ในที่เดียว
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              fetchGroups();
              fetchUsers();
            }}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            <span>รีเฟรช</span>
          </button>

          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] active:scale-[0.99] rounded-lg shadow-sm shadow-[#0055fa]/25 hover:shadow-[#0055fa]/30 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>สร้างกลุ่มใหม่</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              กลุ่มทั้งหมด
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400">
              <UsersRound className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              {stats.totalGroups}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate">กลุ่มในระบบ</div>
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              กลุ่มที่เปิดใช้งาน
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
              {stats.totalInactive > 0 ? `ระงับ ${stats.totalInactive} กลุ่ม` : "ทุกกลุ่มพร้อมใช้"}
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              ผู้ใช้ที่มีกลุ่ม
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400 leading-tight">
              {stats.totalAssignedUsers}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
              ถูกกำหนดเข้ากลุ่มแล้ว
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              ผู้ใช้ที่ยังไม่มีกลุ่ม
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <UserX className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1.5">
            <div className="text-xl sm:text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400 leading-tight">
              {stats.totalUngroupedUsers}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
              {stats.totalUngroupedUsers > 0 ? "รอกำหนดกลุ่ม" : "ทุกคนมีกลุ่มแล้ว"}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 rounded-xl p-2 sm:p-2.5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อกลุ่ม หรือ คำอธิบาย..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1.5 focus:ring-[#0055fa] transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
            <Filter className="w-3 h-3" />
          </div>

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

      {/* Group Table */}
      <AdminGroupTable
        groups={groups}
        isLoading={isLoading}
        onToggleStatus={handleToggleStatus}
        onManageMembers={(group) => setModal({ type: "members", group })}
        onEditGroup={openEdit}
        onDeleteGroup={(group) => setModal({ type: "delete", group })}
      />

      {/* Modals */}
      {modal && (modal.type === "create" || modal.type === "edit") && (
        <GroupFormModal
          mode={modal.type}
          users={users}
          onClose={() => setModal(null)}
          form={form}
          setForm={setForm}
          onSubmit={handleSubmitForm}
          isSubmitting={submitting}
        />
      )}

      {modal && modal.type === "members" && (
        <ManageMembersModal
          group={modal.group}
          users={users}
          onClose={() => setModal(null)}
          onAddMembers={(userIds) => handleAddMembers(modal.group.id, userIds)}
          onRemoveMember={(member) => handleRemoveMember(modal.group.id, member)}
          onToggleMemberRole={(member) => handleToggleMemberRole(modal.group.id, member)}
          isSubmitting={submitting}
        />
      )}

      {modal && modal.type === "delete" && (
        <DeleteGroupModal
          group={modal.group}
          onClose={() => setModal(null)}
          onConfirm={handleDeleteGroup}
          isSubmitting={submitting}
        />
      )}
    </div>
  );
}
