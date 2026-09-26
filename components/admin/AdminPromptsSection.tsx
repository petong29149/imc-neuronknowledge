"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Lock,
  LockOpen,
  UserRound,
  ShieldCheck,
  History,
  Eye,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  X,
  Check,
  RotateCcw,
  KeyRound,
} from "lucide-react";
import Modal from "@/components/common/Modal";

type PromptKey = "persona_prompt" | "core_prompt";

interface PromptSetting {
  key: PromptKey;
  value: string;
  is_customized: boolean;
  updated_at: string | null;
  updated_by_name: string | null;
}

interface Revision {
  id: number;
  value: string;
  created_at: string;
  updated_by_name: string | null;
}

interface AgentOption {
  id: number;
  name: string;
  icon: string;
  is_default: boolean;
  is_active: boolean;
}

type ModalState =
  | null
  | { type: "unlock" }
  | { type: "history"; key: PromptKey }
  | { type: "preview" };

const PANEL =
  "w-full bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl";
const TEXTAREA =
  "w-full px-3.5 py-3 rounded-xl text-xs leading-relaxed font-mono bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa] resize-y";
const BTN_SECONDARY =
  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
const BTN_PRIMARY =
  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });

export default function AdminPromptsSection() {
  const [settings, setSettings] = useState<Record<PromptKey, PromptSetting> | null>(null);
  const [defaults, setDefaults] = useState<Record<PromptKey, string> | null>(null);
  const [drafts, setDrafts] = useState<Record<PromptKey, string>>({ persona_prompt: "", core_prompt: "" });
  const [passwordConfigured, setPasswordConfigured] = useState(false);
  const [unlockedUntil, setUnlockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState<PromptKey | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const applySettings = (list: PromptSetting[]) => {
    const byKey = Object.fromEntries(list.map((s) => [s.key, s])) as Record<PromptKey, PromptSetting>;
    setSettings(byKey);
    setDrafts({ persona_prompt: byKey.persona_prompt.value, core_prompt: byKey.core_prompt.value });
  };

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/settings/prompts");
      const data = await res.json();
      if (res.ok) {
        applySettings(data.settings);
        setDefaults(data.defaults);
        setPasswordConfigured(data.core_password_configured);
        setUnlockedUntil(data.core_unlocked_until);
      } else {
        showToast(data.error || "โหลด System Prompt ไม่สำเร็จ", "error");
      }
    } catch {
      showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Tick the unlock countdown; drop back to locked when it runs out
  const unlocked = unlockedUntil !== null && unlockedUntil > now;
  useEffect(() => {
    if (unlockedUntil === null) return;
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= unlockedUntil) setUnlockedUntil(null);
    }, 1000);
    return () => clearInterval(timer);
  }, [unlockedUntil]);

  const secondsLeft = unlocked ? Math.max(0, Math.floor((unlockedUntil! - now) / 1000)) : 0;
  const countdown = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;

  const handleSave = async (key: PromptKey) => {
    setSaving(key);
    try {
      const res = await fetch("/api/admin/settings/prompts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: drafts[key] }),
      });
      const data = await res.json();
      if (res.ok) {
        const saved = data.settings.find((s: PromptSetting) => s.key === key);
        setSettings((prev) => (prev ? { ...prev, [key]: saved } : prev));
        setDrafts((prev) => ({ ...prev, [key]: saved.value }));
        showToast(data.message);
      } else {
        if (res.status === 403) setUnlockedUntil(null);
        showToast(data.error || "บันทึกไม่สำเร็จ", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setSaving(null);
    }
  };

  const handleLock = async () => {
    await fetch("/api/admin/settings/core-prompt/unlock", { method: "DELETE" }).catch(() => {});
    setUnlockedUntil(null);
    if (settings) setDrafts((prev) => ({ ...prev, core_prompt: settings.core_prompt.value }));
  };

  if (isLoading && !settings) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw className="w-5 h-5 text-[#0055fa] animate-spin" />
      </div>
    );
  }
  if (!settings || !defaults) return null;

  const dirty = (key: PromptKey) => drafts[key].trim() !== settings[key].value.trim();

  return (
    <div className="space-y-4">
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <p className="text-[11px] text-slate-400 max-w-2xl">
          ลำดับใน System Prompt: <strong>หลักการทำงาน</strong> → <strong>Persona</strong> → Prompt ของ Agent →
          Skills / Tools → วันเวลาปัจจุบัน หลักการทำงานมีผลเหนือส่วนอื่นทั้งหมด
        </p>
        <button onClick={() => setModal({ type: "preview" })} className={BTN_SECONDARY}>
          <Eye className="w-3.5 h-3.5" />
          ดู System Prompt ฉบับเต็ม
        </button>
      </div>

      {/* Core rules: locked behind the password */}
      <section
        className={`bg-white dark:bg-[#0c1222] border rounded-2xl p-4 shadow-xs space-y-3 ${
          unlocked
            ? "border-amber-300 dark:border-amber-500/40 ring-2 ring-amber-200/60 dark:ring-amber-500/10"
            : "border-slate-200/80 dark:border-white/10"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                unlocked
                  ? "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400"
              }`}
            >
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                หลักการทำงาน (Core Rules)
                {unlocked ? (
                  <LockOpen className="w-3.5 h-3.5 text-amber-500" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                )}
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                กฎที่ AI ต้องปฏิบัติเสมอ แก้ไขได้เฉพาะผู้ดูแลที่มีรหัสผ่าน
              </p>
              <SettingMeta setting={settings.core_prompt} />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button onClick={() => setModal({ type: "history", key: "core_prompt" })} className={BTN_SECONDARY}>
              <History className="w-3.5 h-3.5" />
              ประวัติ
            </button>
            {unlocked ? (
              <>
                <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 tabular-nums">
                  <LockOpen className="w-3 h-3" />
                  ปลดล็อกอยู่ {countdown}
                </span>
                <button onClick={handleLock} className={BTN_SECONDARY}>
                  <Lock className="w-3.5 h-3.5" />
                  ล็อก
                </button>
              </>
            ) : (
              <button
                onClick={() => setModal({ type: "unlock" })}
                disabled={!passwordConfigured}
                className={BTN_PRIMARY}
              >
                <KeyRound className="w-3.5 h-3.5" />
                ปลดล็อกเพื่อแก้ไข
              </button>
            )}
          </div>
        </div>

        {!passwordConfigured && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              ยังไม่ได้ตั้งรหัสผ่าน จึงแก้ไขหลักการทำงานไม่ได้ ให้รัน{" "}
              <code className="px-1 rounded bg-amber-100 dark:bg-amber-500/20 font-mono">
                npx tsx scripts/hash-core-password.ts
              </code>{" "}
              แล้วนำ <code className="font-mono">CORE_PROMPT_PASSWORD_HASH</code> ที่ได้ไปใส่ใน .env และรีสตาร์ทเซิร์ฟเวอร์
            </div>
          </div>
        )}

        <textarea
          rows={10}
          readOnly={!unlocked}
          value={drafts.core_prompt}
          onChange={(e) => setDrafts({ ...drafts, core_prompt: e.target.value })}
          className={`${TEXTAREA} ${unlocked ? "" : "opacity-75 cursor-not-allowed"}`}
        />

        {unlocked && (
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setDrafts({ ...drafts, core_prompt: defaults.core_prompt })}
              className={BTN_SECONDARY}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              ค่าเริ่มต้น
            </button>
            <button
              onClick={() => handleSave("core_prompt")}
              disabled={!dirty("core_prompt") || saving === "core_prompt"}
              className={BTN_PRIMARY}
            >
              {saving === "core_prompt" ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              บันทึกหลักการทำงาน
            </button>
          </div>
        )}
      </section>

      {/* Persona: any admin can edit */}
      <section className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400">
              <UserRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Persona</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                AI คือใคร มีบุคลิกและน้ำเสียงอย่างไร ใช้กับทุก Agent
              </p>
              <SettingMeta setting={settings.persona_prompt} />
            </div>
          </div>
          <button onClick={() => setModal({ type: "history", key: "persona_prompt" })} className={BTN_SECONDARY}>
            <History className="w-3.5 h-3.5" />
            ประวัติ
          </button>
        </div>

        <textarea
          rows={6}
          value={drafts.persona_prompt}
          onChange={(e) => setDrafts({ ...drafts, persona_prompt: e.target.value })}
          className={TEXTAREA}
        />

        <div className="flex items-center justify-end gap-2">
          {dirty("persona_prompt") && (
            <button
              onClick={() => setDrafts({ ...drafts, persona_prompt: settings.persona_prompt.value })}
              className={BTN_SECONDARY}
            >
              ยกเลิกการแก้ไข
            </button>
          )}
          <button
            onClick={() => setDrafts({ ...drafts, persona_prompt: defaults.persona_prompt })}
            className={BTN_SECONDARY}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            ค่าเริ่มต้น
          </button>
          <button
            onClick={() => handleSave("persona_prompt")}
            disabled={!dirty("persona_prompt") || !drafts.persona_prompt.trim() || saving === "persona_prompt"}
            className={BTN_PRIMARY}
          >
            {saving === "persona_prompt" ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            บันทึก Persona
          </button>
        </div>
      </section>

      {modal?.type === "unlock" && (
        <UnlockModal
          onClose={() => setModal(null)}
          onUnlocked={(until) => {
            setNow(Date.now());
            setUnlockedUntil(until);
            setModal(null);
            showToast("ปลดล็อกแล้ว แก้ไขได้ 15 นาที");
          }}
        />
      )}

      {modal?.type === "history" && (
        <HistoryModal
          promptKey={modal.key}
          canRestore={modal.key === "persona_prompt" || unlocked}
          onClose={() => setModal(null)}
          onRestore={(value) => {
            setDrafts((prev) => ({ ...prev, [modal.key]: value }));
            setModal(null);
            showToast("นำเวอร์ชันนี้มาใส่ในช่องแก้ไขแล้ว กด บันทึก เพื่อใช้งาน");
          }}
        />
      )}

      {modal?.type === "preview" && <PreviewModal onClose={() => setModal(null)} />}
    </div>
  );
}

function SettingMeta({ setting }: { setting: PromptSetting }) {
  return (
    <p className="text-[10px] text-slate-400 mt-1">
      {setting.is_customized && setting.updated_at
        ? `แก้ไขล่าสุด ${formatDate(setting.updated_at)}${
            setting.updated_by_name ? ` โดย ${setting.updated_by_name}` : ""
          }`
        : "ใช้ค่าเริ่มต้นของระบบ"}
    </p>
  );
}

function ModalHeader({ icon, title, onClose }: { icon: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400">
          {icon}
        </div>
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
      </div>
      <button
        onClick={onClose}
        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

function UnlockModal({ onClose, onUnlocked }: { onClose: () => void; onUnlocked: (until: number) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/core-prompt/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) {
        onUnlocked(data.unlocked_until);
      } else {
        setError(data.error || "ปลดล็อกไม่สำเร็จ");
        setPassword("");
      }
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose} panelClassName={`${PANEL} max-w-sm p-6 space-y-4`} label="ปลดล็อกหลักการทำงาน">
      <ModalHeader icon={<KeyRound className="w-5 h-5" />} title="ปลดล็อกหลักการทำงาน" onClose={onClose} />
      <form onSubmit={handleSubmit} className="space-y-3">
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          ใส่รหัสผ่านสำหรับแก้ไขหลักการทำงาน การปลดล็อกมีผล 15 นาทีเฉพาะบัญชีของคุณ
        </p>
        <input
          type="password"
          autoFocus
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="รหัสผ่าน"
          className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]"
        />
        {error && (
          <p className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-3.5 h-3.5" />
            {error}
          </p>
        )}
        <button type="submit" disabled={!password || submitting} className={`${BTN_PRIMARY} w-full justify-center py-2.5`}>
          {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LockOpen className="w-4 h-4" />}
          ปลดล็อก
        </button>
      </form>
    </Modal>
  );
}

function HistoryModal({
  promptKey,
  canRestore,
  onClose,
  onRestore,
}: {
  promptKey: PromptKey;
  canRestore: boolean;
  onClose: () => void;
  onRestore: (value: string) => void;
}) {
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/admin/settings/prompts/revisions?key=${promptKey}`)
      .then((res) => res.json())
      .then((data) => setRevisions(data.revisions || []))
      .catch(() => setRevisions([]));
  }, [promptKey]);

  return (
    <Modal onClose={onClose} panelClassName={`${PANEL} max-w-2xl p-6 space-y-4`}>
      <ModalHeader
        icon={<History className="w-5 h-5" />}
        title={`ประวัติ${promptKey === "core_prompt" ? "หลักการทำงาน" : " Persona"}`}
        onClose={onClose}
      />
      {!canRestore && (
        <p className="text-[11px] text-slate-400">ปลดล็อกก่อนจึงจะนำเวอร์ชันเก่ากลับมาใช้ได้</p>
      )}
      <div className="max-h-[60vh] overflow-y-auto space-y-2">
        {revisions === null ? (
          <div className="py-8 flex justify-center">
            <RefreshCw className="w-5 h-5 text-[#0055fa] animate-spin" />
          </div>
        ) : revisions.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">ยังไม่มีการแก้ไข (ใช้ค่าเริ่มต้นของระบบ)</p>
        ) : (
          revisions.map((rev, idx) => (
            <div key={rev.id} className="border border-slate-200 dark:border-white/10 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{formatDate(rev.created_at)}</span>
                  {rev.updated_by_name && ` · ${rev.updated_by_name}`}
                  {idx === 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      ปัจจุบัน
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setExpanded(expanded === rev.id ? null : rev.id)}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {expanded === rev.id ? "ย่อ" : "ดู"}
                  </button>
                  {idx > 0 && (
                    <button
                      onClick={() => onRestore(rev.value)}
                      disabled={!canRestore}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0055fa] dark:text-blue-400 hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                    >
                      <RotateCcw className="w-3 h-3" />
                      ใช้เวอร์ชันนี้
                    </button>
                  )}
                </div>
              </div>
              <pre
                className={`text-[11px] leading-relaxed whitespace-pre-wrap font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/5 rounded-lg p-2 ${
                  expanded === rev.id ? "" : "line-clamp-3"
                }`}
              >
                {rev.value}
              </pre>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

function PreviewModal({ onClose }: { onClose: () => void }) {
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [agentId, setAgentId] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ prompt: string; tools: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/agents")
      .then((res) => res.json())
      .then((data) => {
        const list: AgentOption[] = (data.agents || []).filter((a: AgentOption) => a.is_active);
        setAgents(list);
        setAgentId((list.find((a) => a.is_default) ?? list[0])?.id ?? null);
      })
      .catch(() => setError("โหลดรายชื่อ Agent ไม่สำเร็จ"));
  }, []);

  useEffect(() => {
    if (agentId === null) return;
    let cancelled = false;
    fetch(`/api/admin/settings/prompts/preview?agent_id=${agentId}`)
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (res.ok) {
          setPreview(data);
          setError(null);
        } else {
          setError(data.error || "สร้างตัวอย่างไม่สำเร็จ");
        }
      })
      .catch(() => !cancelled && setError("เกิดข้อผิดพลาดในการเชื่อมต่อ"));
    return () => {
      cancelled = true;
    };
  }, [agentId]);

  return (
    <Modal onClose={onClose} panelClassName={`${PANEL} max-w-3xl p-6 space-y-4`}>
      <ModalHeader icon={<Eye className="w-5 h-5" />} title="System Prompt ฉบับเต็ม" onClose={onClose} />
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Agent:</label>
        <select
          value={agentId ?? ""}
          onChange={(e) => {
            setPreview(null);
            setAgentId(Number(e.target.value));
          }}
          className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none"
        >
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.icon} {a.name}
            </option>
          ))}
        </select>
        <span className="text-[10px] text-slate-400">ตัวอย่างแชทใหม่ · Effort: Medium · เปิด Tools</span>
      </div>
      {preview && (
        <div className="flex flex-wrap gap-1">
          {preview.tools.map((t) => (
            <span
              key={t}
              className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-300"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      {error ? (
        <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : (
        <pre className="max-h-[60vh] overflow-y-auto p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-[11px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-mono">
          {preview ? preview.prompt : "กำลังสร้างตัวอย่าง..."}
        </pre>
      )}
    </Modal>
  );
}
