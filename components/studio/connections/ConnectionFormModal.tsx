"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Database, PlugZap, RefreshCw, Save, XCircle } from "lucide-react";
import Modal from "@/components/common/Modal";
import type { ConnectionType } from "@/lib/studio/types";
import {
  CONNECTION_TYPES,
  DEFAULT_PORTS,
  DEFAULT_SSL,
  SUPPORTED_TYPES,
  TYPE_HINTS,
  TYPE_LABELS,
  type ConnectionView,
  type SslMode,
  type TestResult,
} from "@/lib/studio/connections/types";
import {
  apiFetch,
  ghostButton,
  inputClass,
  labelClass,
  modalPanel,
  ModalHeader,
  primaryButton,
  secondaryButton,
} from "./ui";
import DbLogo from "./DbLogo";

const SSL_LABELS: Record<SslMode, string> = {
  prefer: "ใช้ถ้ามี (prefer)",
  require: "บังคับใช้ SSL (require)",
  "verify-full": "บังคับและตรวจใบรับรอง (verify-full)",
  disable: "ไม่ใช้ SSL (disable)",
};

interface FormState {
  name: string;
  type: ConnectionType;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  sslMode: SslMode;
  description: string;
}

function initialState(connection: ConnectionView | null): FormState {
  if (!connection) {
    return {
      name: "",
      type: "postgresql",
      host: "",
      port: String(DEFAULT_PORTS.postgresql),
      database: "",
      username: "",
      password: "",
      sslMode: DEFAULT_SSL.postgresql,
      description: "",
    };
  }
  return {
    name: connection.name,
    type: connection.type,
    host: connection.host,
    port: String(connection.port),
    database: connection.database,
    username: connection.username,
    password: "",
    sslMode: connection.sslMode,
    description: connection.description,
  };
}

export default function ConnectionFormModal({
  connection,
  onClose,
  onSaved,
}: {
  /** null = create */
  connection: ConnectionView | null;
  onClose: () => void;
  onSaved: (connection: ConnectionView) => void;
}) {
  const [form, setForm] = useState<FormState>(() => initialState(connection));
  const [test, setTest] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acknowledgeWritable, setAcknowledgeWritable] = useState(false);

  const isEdit = connection !== null;
  const writable = test?.ok === true && !test.readOnly;
  const typeHint = TYPE_HINTS[form.type];

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      // Keep port and SSL in step with the type unless the user changed them.
      if (key === "type") {
        const type = value as ConnectionType;
        if (prev.port === String(DEFAULT_PORTS[prev.type])) next.port = String(DEFAULT_PORTS[type]);
        if (prev.sslMode === DEFAULT_SSL[prev.type]) next.sslMode = DEFAULT_SSL[type];
      }
      return next;
    });
    // Any change makes the last test result stale.
    setTest(null);
    setAcknowledgeWritable(false);
    setError(null);
  };

  /** The test endpoint takes the id so an edit can reuse the stored password. */
  const payload = (withId: boolean) => ({
    ...(withId && isEdit ? { id: connection.id } : {}),
    name: form.name,
    type: form.type,
    host: form.host,
    port: form.port === "" ? "" : Number(form.port),
    database: form.database,
    username: form.username,
    password: form.password,
    sslMode: form.sslMode,
    description: form.description,
  });

  const runTest = async () => {
    setTesting(true);
    setError(null);
    const res = await apiFetch<TestResult>("/api/studio/connections/test", {
      method: "POST",
      body: JSON.stringify(payload(true)),
    });
    setTesting(false);
    if (res.ok) {
      setTest(res.data);
    } else {
      setTest(null);
      setError(res.error);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await apiFetch<{ connection: ConnectionView; test: TestResult }>(
      isEdit ? `/api/studio/connections/${connection.id}` : "/api/studio/connections",
      {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify({ ...payload(false), acknowledgeWritable }),
      }
    );
    setSaving(false);
    if (res.ok) {
      onSaved(res.data.connection);
      return;
    }
    if (res.body.code === "writable" && res.body.test) {
      setTest(res.body.test as TestResult);
    }
    setError(res.error);
  };

  const canSave = !saving && !testing && (!writable || acknowledgeWritable);

  return (
    // Backdrop clicks and Escape must not discard a half-filled form; only the X and "ยกเลิก" buttons close it.
    <Modal onClose={() => {}} label={isEdit ? "แก้ไขการเชื่อมต่อ" : "เพิ่มการเชื่อมต่อ"} panelClassName={`max-w-2xl ${modalPanel}`}>
      <ModalHeader
        icon={<Database className="w-5 h-5" />}
        title={isEdit ? "แก้ไขการเชื่อมต่อ" : "เพิ่มการเชื่อมต่อ"}
        onClose={onClose}
      />

      <form onSubmit={save} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="conn-name">ชื่อการเชื่อมต่อ</label>
          <input
            id="conn-name"
            className={inputClass}
            value={form.name}
            maxLength={120}
            required
            placeholder="เช่น ฐานข้อมูลสินค้า (อ่านอย่างเดียว)"
            onChange={(e) => update("name", e.target.value)}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="conn-desc">
            คำอธิบาย <span className="font-normal text-slate-400">(แสดงให้ผู้ใช้และ AI เห็นว่าฐานข้อมูลนี้มีข้อมูลอะไร)</span>
          </label>
          <textarea
            id="conn-desc"
            rows={2}
            className={inputClass}
            value={form.description}
            maxLength={1000}
            placeholder="เช่น สถิติการค้าระหว่างประเทศรายเดือน แยกตามพิกัดสินค้าและประเทศ"
            onChange={(e) => update("description", e.target.value)}
          />
        </div>

        <fieldset>
          <legend className={labelClass}>ประเภทฐานข้อมูล</legend>
          <div role="radiogroup" aria-label="ประเภทฐานข้อมูล" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {CONNECTION_TYPES.filter((type) => SUPPORTED_TYPES.includes(type)).map((type) => {
              const selected = form.type === type;
              return (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => update("type", type)}
                  className={`relative flex flex-col items-center gap-2 px-2 pt-3 pb-2.5 rounded-2xl border text-center text-xs font-semibold cursor-pointer transition-all ${
                    selected
                      ? "border-[#0055fa] ring-2 ring-[#0055fa]/25 bg-blue-50/70 dark:bg-blue-500/10 text-slate-900 dark:text-white shadow-sm"
                      : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  {selected && (
                    <CheckCircle2 className="absolute top-1.5 right-1.5 w-4 h-4 text-[#0055fa] dark:text-blue-400" aria-hidden="true" />
                  )}
                  <DbLogo type={type} size="md" />
                  <span className="leading-tight">{TYPE_LABELS[type]}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className={labelClass} htmlFor="conn-host">Host</label>
            <input
              id="conn-host"
              className={inputClass}
              value={form.host}
              required
              maxLength={255}
              placeholder="db.example.com หรือ 203.0.113.10"
              autoComplete="off"
              onChange={(e) => update("host", e.target.value.trim())}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="conn-port">Port</label>
            <input
              id="conn-port"
              className={inputClass}
              inputMode="numeric"
              value={form.port}
              onChange={(e) => update("port", e.target.value.replace(/\D/g, ""))}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="conn-db">{typeHint?.database ?? "Database"}</label>
          <input
            id="conn-db"
            className={inputClass}
            value={form.database}
            required
            maxLength={255}
            onChange={(e) => update("database", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="conn-user">ชื่อผู้ใช้</label>
            <input
              id="conn-user"
              className={inputClass}
              value={form.username}
              required
              maxLength={255}
              autoComplete="off"
              onChange={(e) => update("username", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="conn-pass">รหัสผ่าน</label>
            <input
              id="conn-pass"
              type="password"
              className={inputClass}
              value={form.password}
              maxLength={1024}
              autoComplete="new-password"
              placeholder={isEdit && connection.hasPassword ? "เว้นว่าง = ใช้รหัสเดิม" : ""}
              onChange={(e) => update("password", e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="conn-ssl">SSL</label>
          <select
            id="conn-ssl"
            className={inputClass}
            value={form.sslMode}
            onChange={(e) => update("sslMode", e.target.value as SslMode)}
          >
            {(Object.keys(SSL_LABELS) as SslMode[]).map((mode) => (
              <option key={mode} value={mode}>{SSL_LABELS[mode]}</option>
            ))}
          </select>
        </div>

        {typeHint?.hint && <p className="text-xs text-slate-500 dark:text-slate-400">{typeHint.hint}</p>}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          แนะนำให้ใช้บัญชีที่มีสิทธิ์อ่านอย่างเดียว (SELECT) เท่านั้น
        </p>

        {test && <TestResultBox test={test} />}

        {writable && (
          <label className="flex items-start gap-2 text-xs text-red-700 dark:text-red-400 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 accent-red-600"
              checked={acknowledgeWritable}
              onChange={(e) => setAcknowledgeWritable(e.target.checked)}
            />
            ฉันเข้าใจความเสี่ยง และยืนยันจะใช้บัญชีที่เขียนข้อมูลได้
          </label>
        )}

        {error && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
          <button type="button" className={secondaryButton} onClick={runTest} disabled={testing || saving}>
            {testing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <PlugZap className="w-4 h-4" />}
            ทดสอบการเชื่อมต่อ
          </button>
          <div className="flex items-center justify-end gap-2">
            <button type="button" className={ghostButton} onClick={onClose}>ยกเลิก</button>
            <button type="submit" className={primaryButton} disabled={!canSave}>
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              บันทึก
            </button>
          </div>
        </div>
        {saving && (
          <p className="text-xs text-slate-500 dark:text-slate-400 text-right">
            กำลังทดสอบและบันทึก (อาจใช้เวลาถึง 10 วินาที)
          </p>
        )}
      </form>
    </Modal>
  );
}

export function TestResultBox({ test }: { test: TestResult }) {
  if (!test.ok) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-xl text-xs bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200/60 dark:border-red-500/20">
        <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>เชื่อมต่อไม่สำเร็จ: {test.error}</span>
      </div>
    );
  }
  if (!test.readOnly) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-xl text-xs bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-500/40">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>
          <strong className="font-semibold">เชื่อมต่อได้ แต่บัญชีนี้เขียนหรือแก้ไขข้อมูลได้</strong> — ควรสร้างบัญชีที่มีสิทธิ์
          SELECT อย่างเดียวแล้วใช้บัญชีนั้นแทน
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl text-xs bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20">
      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
      <span>เชื่อมต่อได้ และเป็นบัญชีอ่านอย่างเดียว</span>
    </div>
  );
}
