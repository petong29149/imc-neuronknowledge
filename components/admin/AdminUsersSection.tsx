"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  UserPlus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

import AdminMetricCards, { Stats } from "@/components/admin/AdminMetricCards";
import AdminUserFilter from "@/components/admin/AdminUserFilter";
import AdminUserTable, { UserItem } from "@/components/admin/AdminUserTable";
import {
  CreateUserModal,
  EditUserModal,
  DeleteUserModal,
} from "@/components/admin/AdminUserModals";

export default function AdminUsersSection() {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalAdmins: 0,
    totalRegularUsers: 0,
    totalActive: 0,
    totalInactive: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "admin" | "user",
    is_active: true,
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "admin" | "user",
    is_active: true,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        if (data.stats) setStats(data.stats);
      } else {
        const err = await res.json();
        showToast(err.error || "เกิดข้อผิดพลาดในการโหลดข้อมูล", "error");
      }
    } catch {
      showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "เพิ่มผู้ใช้เรียบร้อยแล้ว");
        setIsCreateModalOpen(false);
        setCreateForm({
          name: "",
          email: "",
          password: "",
          role: "user",
          is_active: true,
        });
        fetchUsers();
      } else {
        showToast(data.error || "ไม่สามารถสร้างผู้ใช้ได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (user: UserItem) => {
    setEditingUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      is_active: user.is_active,
    });
  };

  // Handle Update User
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditSubmitting(true);
    try {
      const payload: any = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        is_active: editForm.is_active,
      };
      if (editForm.password) {
        payload.password = editForm.password;
      }

      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว");
        setEditingUser(null);
        fetchUsers();
      } else {
        showToast(data.error || "ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Handle Quick Status Toggle
  const handleToggleStatus = async (user: UserItem) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          `เปลี่ยนสถานะของ ${user.name} เป็น ${
            !user.is_active ? "เปิดใช้งาน" : "ระงับการใช้งาน"
          } แล้ว`
        );
        fetchUsers();
      } else {
        showToast(data.error || "ไม่สามารถเปลี่ยนสถานะได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาด", "error");
    }
  };

  // Handle Quick Role Toggle
  const handleToggleRole = async (user: UserItem) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`เปลี่ยนบทบาทของ ${user.name} เป็น ${nextRole.toUpperCase()} เรียบร้อย`);
        fetchUsers();
      } else {
        showToast(data.error || "ไม่สามารถเปลี่ยนบทบาทได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาด", "error");
    }
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleteSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "ลบผู้ใช้งานสำเร็จ");
        setDeletingUser(null);
        fetchUsers();
      } else {
        showToast(data.error || "ไม่สามารถลบผู้ใช้งานได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการลบ", "error");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-xl shadow-xl border animate-in slide-in-from-top duration-300 text-xs ${
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
            รายชื่อผู้ใช้งานทั้งหมด
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            จัดการสิทธิ์การเข้าถึง เพิ่ม แก้ไข และกำหนดบทบาทผู้ใช้งานในระบบ
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchUsers()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
            <span>รีเฟรช</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] active:scale-[0.99] rounded-lg shadow-sm shadow-[#0055fa]/25 hover:shadow-[#0055fa]/30 transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>เพิ่มผู้ใช้ใหม่</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Component */}
      <AdminMetricCards stats={stats} />

      {/* Search & Filter Component */}
      <AdminUserFilter
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      {/* User Table Component */}
      <AdminUserTable
        users={users}
        isLoading={isLoading}
        currentUser={currentUser}
        onToggleRole={handleToggleRole}
        onToggleStatus={handleToggleStatus}
        onEditUser={openEditModal}
        onDeleteUser={(user: UserItem) => setDeletingUser(user)}
      />

      {/* User Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        form={createForm}
        setForm={setCreateForm}
        onSubmit={handleCreateUser}
        isSubmitting={createSubmitting}
      />

      <EditUserModal
        editingUser={editingUser}
        onClose={() => setEditingUser(null)}
        form={editForm}
        setForm={setEditForm}
        onSubmit={handleUpdateUser}
        isSubmitting={editSubmitting}
      />

      <DeleteUserModal
        deletingUser={deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={handleDeleteUser}
        isSubmitting={deleteSubmitting}
      />
    </div>
  );
}
