"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  X,
  Check,
  PauseCircle,
} from "lucide-react";
import Modal from "@/components/common/Modal";
import {
  SKILL_CONTENT_MAX,
  SKILL_DESCRIPTION_MAX,
  SKILL_SLUG_PATTERN,
} from "@/lib/skills-constants";

interface SkillItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  content: string;
  is_active: boolean;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

interface SkillForm {
  slug: string;
  name: string;
  description: string;
  content: string;
  is_active: boolean;
}

type ModalState =
  | null
  | { type: "create" }
  | { type: "edit"; skill: SkillItem }
  | { type: "view"; skill: SkillItem }
  | { type: "delete"; skill: SkillItem };

const EMPTY_FORM: SkillForm = {
  slug: "",
  name: "",
  description: "",
  content: "",
  is_active: true,
};

const PANEL =
  "w-full bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl";
const INPUT =
  "w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]";
const LABEL = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1";

export default function AdminSkillsSection() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [form, setForm] = useState<SkillForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSkills = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/skills?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setSkills(data.skills || []);
        if (data.stats) setStats(data.stats);
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการโหลดข้อมูล Skills", "error");
      }
    } catch {
      showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal({ type: "create" });
  };

  const openEdit = (skill: SkillItem) => {
    setForm({
      slug: skill.slug,
      name: skill.name,
      description: skill.description,
      content: skill.content,
      is_active: skill.is_active,
    });
    setModal({ type: "edit", skill });
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal || (modal.type !== "create" && modal.type !== "edit")) return;

    setSubmitting(true);
    try {
      const isEdit = modal.type === "edit";
      const url = isEdit ? `/api/admin/skills/${modal.skill.id}` : "/api/admin/skills";
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "บันทึก skill เรียบร้อยแล้ว");
        setModal(null);
        setForm(EMPTY_FORM);
        fetchSkills();
      } else {
        showToast(data.error || "ไม่สามารถบันทึก skill ได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (skill: SkillItem) => {
    try {
      const res = await fetch(`/api/admin/skills/${skill.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !skill.is_active }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          `${!skill.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"} skill ${skill.name} แล้ว`
        );
        fetchSkills();
      } else {
        showToast(data.error || "ไม่สามารถเปลี่ยนสถานะได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาด", "error");
    }
  };

  const handleDelete = async () => {
    if (!modal || modal.type !== "delete") return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/skills/${modal.skill.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "ลบ skill เรียบร้อยแล้ว");
        setModal(null);
        fetchSkills();
      } else {
        showToast(data.error || "ไม่สามารถลบ skill ได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการลบ", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const metricCards = [
    {
      label: "Skills ทั้งหมด",
      value: stats.total,
      hint: "skill ในระบบ",
      icon: Sparkles,
      tone: "bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400",
      valueTone: "text-slate-900 dark:text-white",
    },
    {
      label: "เปิดใช้งาน",
      value: stats.active,
      hint: "AI โหลดใช้ได้",
      icon: CheckCircle,
      tone: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      valueTone: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "ปิดใช้งาน",
      value: stats.inactive,
      hint: "ซ่อนจาก AI",
      icon: PauseCircle,
      tone: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400",
      valueTone: "text-amber-600 dark:text-amber-400",
    },
  ];

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
            Skills ทั้งหมด
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            AI เห็นเฉพาะชื่อและคำอธิบาย แล้วจะโหลดเนื้อหาเต็มผ่าน tool load_skill เมื่องานตรงกับ skill
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchSkills}
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
            <span>สร้าง Skill ใหม่</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="p-3 sm:p-3.5 rounded-xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {card.label}
                </span>
                <div className={`p-1.5 rounded-lg ${card.tone}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="mt-1.5">
                <div
                  className={`text-xl sm:text-2xl font-bold tracking-tight leading-tight ${card.valueTone}`}
                >
                  {card.value}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">{card.hint}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search & Filter */}
      <div className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 rounded-xl p-2 sm:p-2.5 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหา slug ชื่อ หรือ คำอธิบาย..."
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
            <option value="inactive">ปิดใช้งาน</option>
          </select>
        </div>
      </div>

      {/* Skill Table */}
      <div className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-2 px-3 sm:px-4">Skill</th>
                <th className="py-2 px-3 hidden lg:table-cell">คำอธิบาย (ใช้เมื่อใด)</th>
                <th className="py-2 px-2.5 sm:px-3">สถานะ</th>
                <th className="py-2 px-3 hidden md:table-cell">แก้ไขล่าสุด</th>
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
              ) : skills.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    <Sparkles className="w-8 h-8 mx-auto mb-1.5 text-slate-400 opacity-60" />
                    <p className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                      ยังไม่มี Skill
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      สร้าง skill แรกเพื่อสอนวิธีทำงานเฉพาะทางให้ AI
                    </p>
                  </td>
                </tr>
              ) : (
                skills.map((skill) => (
                  <tr
                    key={skill.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors"
                  >
                    <td className="py-2 sm:py-2.5 px-3 sm:px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-xs text-white shrink-0 ${
                            skill.is_active
                              ? "bg-gradient-to-tr from-[#0055fa] to-indigo-600"
                              : "bg-gradient-to-tr from-slate-400 to-slate-500"
                          }`}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white text-xs truncate max-w-[180px] sm:max-w-[260px]">
                            {skill.name}
                          </div>
                          <code className="text-[10px] text-slate-400 font-mono">{skill.slug}</code>
                        </div>
                      </div>
                    </td>

                    <td className="py-2 sm:py-2.5 px-3 hidden lg:table-cell">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 max-w-md">
                        {skill.description}
                      </p>
                    </td>

                    <td className="py-2 sm:py-2.5 px-2.5 sm:px-3">
                      <button
                        onClick={() => handleToggleStatus(skill)}
                        title="คลิกเพื่อสลับสถานะ"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
                          skill.is_active
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100"
                            : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 hover:bg-rose-100"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            skill.is_active ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        <span>{skill.is_active ? "เปิดใช้" : "ปิดใช้"}</span>
                      </button>
                    </td>

                    <td className="py-2 sm:py-2.5 px-3 hidden md:table-cell text-[11px] text-slate-400">
                      {new Date(skill.updated_at).toLocaleDateString("th-TH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    <td className="py-2 sm:py-2.5 px-3 sm:px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setModal({ type: "view", skill })}
                          title="ดูเนื้อหา"
                          className="p-1 rounded-md text-slate-500 hover:text-[#0055fa] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEdit(skill)}
                          title="แก้ไข skill"
                          className="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setModal({ type: "delete", skill })}
                          title="ลบ skill"
                          className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {modal && (modal.type === "create" || modal.type === "edit") && (
        <SkillFormModal
          mode={modal.type}
          form={form}
          setForm={setForm}
          onClose={() => setModal(null)}
          onSubmit={handleSubmitForm}
          isSubmitting={submitting}
        />
      )}

      {modal && modal.type === "view" && (
        <Modal onClose={() => setModal(null)} panelClassName={`${PANEL} max-w-3xl p-6 space-y-4`}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {modal.skill.name}
              </h2>
              <code className="text-[11px] text-slate-400 font-mono">{modal.skill.slug}</code>
            </div>
            <button
              onClick={() => setModal(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 text-xs text-slate-700 dark:text-slate-300">
            <span className="font-semibold">ใช้เมื่อ: </span>
            {modal.skill.description}
          </div>
          <pre className="max-h-[55vh] overflow-y-auto p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-mono">
            {modal.skill.content}
          </pre>
        </Modal>
      )}

      {modal && modal.type === "delete" && (
        <Modal
          onClose={() => setModal(null)}
          panelClassName="w-full max-w-sm p-6 text-center space-y-4 bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl"
        >
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">ยืนยันการลบ Skill?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              คุณกำลังจะลบ skill{" "}
              <strong className="text-slate-800 dark:text-slate-200">{modal.skill.name}</strong>{" "}
              AI จะไม่สามารถโหลด skill นี้ได้อีก การกระทำนี้ไม่สามารถย้อนกลับได้
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModal(null)}
              className="w-full px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleDelete}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-60"
            >
              {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>ลบ Skill</span>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SkillFormModal({
  mode,
  form,
  setForm,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  mode: "create" | "edit";
  form: SkillForm;
  setForm: React.Dispatch<React.SetStateAction<SkillForm>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}) {
  const isEdit = mode === "edit";
  const slugInvalid = form.slug.length > 0 && !SKILL_SLUG_PATTERN.test(form.slug);

  return (
    <Modal onClose={onClose} panelClassName={`${PANEL} max-w-3xl p-6 space-y-5`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl ${
              isEdit
                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                : "bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400"
            }`}
          >
            {isEdit ? <Edit2 className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isEdit ? "แก้ไข Skill (Edit Skill)" : "สร้าง Skill ใหม่ (Add Skill)"}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL}>ชื่อ Skill *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="สรุปรายงานการประชุม"
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Slug (ชื่อที่ AI ใช้เรียก) *</label>
            <input
              type="text"
              required
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
              placeholder="meeting-summary"
              className={`${INPUT} font-mono ${slugInvalid ? "ring-2 ring-rose-500" : ""}`}
            />
            <p className={`text-[10px] mt-1 ${slugInvalid ? "text-rose-500" : "text-slate-400"}`}>
              a-z, 0-9 และขีดกลาง (-) เท่านั้น
            </p>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={LABEL}>คำอธิบาย: ควรใช้ skill นี้เมื่อใด *</label>
            <span className="text-[10px] text-slate-400">
              {form.description.length}/{SKILL_DESCRIPTION_MAX}
            </span>
          </div>
          <textarea
            rows={2}
            required
            maxLength={SKILL_DESCRIPTION_MAX}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="ใช้เมื่อผู้ใช้ส่งบันทึกการประชุมมาและต้องการสรุปมติหรือ action items"
            className={`${INPUT} resize-none`}
          />
          <p className="text-[10px] text-slate-400 mt-1">
            ข้อความนี้อยู่ใน system prompt ทุกครั้ง AI ใช้มันตัดสินใจว่าจะโหลด skill หรือไม่
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={LABEL}>เนื้อหาคำสั่ง (Markdown) *</label>
            <span className="text-[10px] text-slate-400">
              {form.content.length.toLocaleString()}/{SKILL_CONTENT_MAX.toLocaleString()}
            </span>
          </div>
          <textarea
            rows={14}
            required
            maxLength={SKILL_CONTENT_MAX}
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder={"# ชื่อ Skill\n\n## ขั้นตอน\n1. ...\n\n## รูปแบบคำตอบ\n..."}
            className={`${INPUT} font-mono text-xs leading-relaxed`}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="w-4 h-4 accent-[#0055fa] cursor-pointer"
          />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            เปิดใช้งาน skill นี้
          </span>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={isSubmitting || slugInvalid}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            <span>{isEdit ? "บันทึกการแก้ไข" : "สร้าง Skill"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
