"use client";

import React, { useState } from "react";
import { X, Palette, UserCircle, Info, Sun, Moon, Check, RefreshCw, BookOpen } from "lucide-react";
import Modal from "@/components/common/Modal";
import { useTheme, type FontSize } from "@/app/theme-provider";
import { useAuth } from "@/context/AuthContext";

export type SettingsTab = "ui" | "profile" | "about";

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "ui", label: "การแสดงผล", icon: Palette },
  { id: "profile", label: "โปรไฟล์", icon: UserCircle },
  { id: "about", label: "เกี่ยวกับระบบ", icon: Info },
];

const FONT_SIZES: { id: FontSize; label: string; sample: string }[] = [
  { id: "small", label: "เล็ก", sample: "text-xs" },
  { id: "default", label: "ปกติ", sample: "text-sm" },
  { id: "large", label: "ใหญ่", sample: "text-base" },
];

const inputClass =
  "w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]";
const labelClass = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1";
const primaryButtonClass =
  "inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0055fa] text-white hover:bg-[#0046d1] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer";

export default function SettingsModal({
  initialTab = "ui",
  onClose,
  onOpenGuide,
}: {
  initialTab?: SettingsTab;
  onClose: () => void;
  onOpenGuide: () => void;
}) {
  const [tab, setTab] = useState<SettingsTab>(initialTab);

  return (
    <Modal
      onClose={onClose}
      label="การตั้งค่า"
      panelClassName="w-full max-w-2xl bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-white/5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">การตั้งค่า</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:h-[420px]">
        {/* Tab list: horizontal on phones, vertical rail from sm up */}
        <div
          role="tablist"
          aria-label="หมวดการตั้งค่า"
          className="flex sm:flex-col gap-1 p-2 sm:p-3 sm:w-48 shrink-0 border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-white/5 overflow-x-auto"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? "bg-blue-50 dark:bg-[#0055fa]/10 text-[#0055fa] dark:text-blue-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" className="flex-1 min-w-0 p-6 overflow-y-auto">
          {tab === "ui" && <UISettings />}
          {tab === "profile" && <ProfileSettings />}
          {tab === "about" && <AboutSection onOpenGuide={onOpenGuide} />}
        </div>
      </div>
    </Modal>
  );
}

// ────────────── UI Settings ──────────────

function UISettings() {
  const { theme, setTheme, fontSize, setFontSize } = useTheme();

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">ธีม</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">เลือกโหมดสีของหน้าจอ</p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "light", label: "โหมดสว่าง", icon: Sun },
              { id: "dark", label: "โหมดมืด", icon: Moon },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <OptionCard key={id} active={theme === id} onClick={() => setTheme(id)}>
              <Icon className={`w-4 h-4 ${id === "light" ? "text-amber-500" : "text-[#0055fa]"}`} />
              <span>{label}</span>
            </OptionCard>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">ขนาดตัวอักษร</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">ปรับขนาดตัวอักษรทั้งระบบ</p>
        <div className="grid grid-cols-3 gap-2">
          {FONT_SIZES.map(({ id, label, sample }) => (
            <OptionCard key={id} active={fontSize === id} onClick={() => setFontSize(id)} stacked>
              <span className={`${sample} font-bold`}>ก Aa</span>
              <span className="text-[11px]">{label}</span>
            </OptionCard>
          ))}
        </div>
      </section>
    </div>
  );
}

function OptionCard({
  active,
  onClick,
  stacked = false,
  children,
}: {
  active: boolean;
  onClick: () => void;
  stacked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`relative flex items-center justify-center gap-2 px-3 py-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
        stacked ? "flex-col gap-1" : ""
      } ${
        active
          ? "border-[#0055fa] bg-blue-50/70 dark:bg-[#0055fa]/10 ring-2 ring-[#0055fa]/20 text-slate-900 dark:text-white"
          : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-[#0055fa]/40"
      }`}
    >
      {children}
      {active && (
        <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full bg-[#0055fa] text-white flex items-center justify-center">
          <Check className="w-2.5 h-2.5" />
        </span>
      )}
    </button>
  );
}

// ────────────── Profile Settings ──────────────

type Status = { type: "success" | "error"; text: string } | null;

function StatusText({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p
      role={status.type === "error" ? "alert" : "status"}
      className={`text-xs ${status.type === "error" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}
    >
      {status.text}
    </p>
  );
}

function ProfileSettings() {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [nameStatus, setNameStatus] = useState<Status>(null);

  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingName(true);
    setNameStatus(null);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNameStatus({ type: "error", text: data.error || "บันทึกไม่สำเร็จ" });
      } else {
        setNameStatus({ type: "success", text: data.message });
        await refreshUser();
      }
    } catch {
      setNameStatus({ type: "error", text: "เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย" });
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (passwords.next !== passwords.confirm) {
      setPasswordStatus({ type: "error", text: "รหัสผ่านใหม่และการยืนยันไม่ตรงกัน" });
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordStatus({ type: "error", text: data.error || "เปลี่ยนรหัสผ่านไม่สำเร็จ" });
      } else {
        setPasswordStatus({ type: "success", text: data.message });
        setPasswords({ current: "", next: "", confirm: "" });
      }
    } catch {
      setPasswordStatus({ type: "error", text: "เกิดข้อผิดพลาดในการเชื่อมต่อเครือข่าย" });
    } finally {
      setSavingPassword(false);
    }
  };

  const nameUnchanged = name.trim() === (user?.name || "") || !name.trim();

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">ข้อมูลส่วนตัว</h3>
        <form onSubmit={handleSaveName} className="space-y-3">
          <div>
            <label htmlFor="settings-email" className={labelClass}>อีเมล</label>
            <input
              id="settings-email"
              type="email"
              value={user?.email || ""}
              disabled
              className={`${inputClass} opacity-60 cursor-not-allowed`}
            />
          </div>
          <div>
            <label htmlFor="settings-name" className={labelClass}>ชื่อที่แสดง</label>
            <input
              id="settings-name"
              type="text"
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={savingName || nameUnchanged} className={primaryButtonClass}>
              {savingName && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              บันทึกชื่อ
            </button>
            <StatusText status={nameStatus} />
          </div>
        </form>
      </section>

      <section className="pt-5 border-t border-slate-100 dark:border-white/5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">เปลี่ยนรหัสผ่าน</h3>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label htmlFor="settings-current-password" className={labelClass}>รหัสผ่านปัจจุบัน</label>
            <input
              id="settings-current-password"
              type="password"
              required
              autoComplete="current-password"
              value={passwords.current}
              onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="settings-new-password" className={labelClass}>รหัสผ่านใหม่ (อย่างน้อย 6 ตัว)</label>
              <input
                id="settings-new-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={passwords.next}
                onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="settings-confirm-password" className={labelClass}>ยืนยันรหัสผ่านใหม่</label>
              <input
                id="settings-confirm-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingPassword || !passwords.current || !passwords.next || !passwords.confirm}
              className={primaryButtonClass}
            >
              {savingPassword && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              เปลี่ยนรหัสผ่าน
            </button>
            <StatusText status={passwordStatus} />
          </div>
        </form>
      </section>
    </div>
  );
}

// ────────────── About ──────────────

function AboutSection({ onOpenGuide }: { onOpenGuide: () => void }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0055fa] to-violet-500 text-white flex items-center justify-center shadow-lg shadow-[#0055fa]/20">
          <BookOpen className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Neuron<span className="text-[#0055fa]">Knowledge</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Enterprise Domain Knowledge Agent Platform</p>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        NeuronKnowledge คือแพลตฟอร์มผู้ช่วย AI สำหรับองค์กร ที่รวมความรู้เฉพาะทาง (Domain Knowledge)
        เข้ากับ AI Agent หลายตัว ซึ่งสามารถเรียกใช้เครื่องมือ (MCP Tools) และทักษะ (Skills)
        เพื่อค้นหา วิเคราะห์ และสรุปข้อมูลให้ตรงกับงานของคุณ
      </p>

      <dl className="divide-y divide-slate-100 dark:divide-white/5 rounded-2xl border border-slate-200 dark:border-white/10 text-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-slate-500 dark:text-slate-400">เวอร์ชัน</dt>
          <dd className="font-mono font-semibold text-slate-900 dark:text-white">v{process.env.APP_VERSION}</dd>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <dt className="text-slate-500 dark:text-slate-400">พัฒนาโดย</dt>
          <dd className="font-semibold text-slate-900 dark:text-white">IMC Institute</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={onOpenGuide}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0055fa] dark:text-blue-400 hover:underline cursor-pointer"
      >
        <BookOpen className="w-3.5 h-3.5" />
        เปิดคู่มือการใช้งาน
      </button>
    </div>
  );
}
