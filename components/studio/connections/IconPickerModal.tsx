"use client";

import React, { useRef, useState } from "react";
import { Check, ImageIcon, RefreshCw, Save, Sparkles, Upload } from "lucide-react";
import Modal from "@/components/common/Modal";
import { autoIcon, ICON_COLORS, ICON_PRESETS } from "@/lib/studio/connections/icons";
import type { ConnectionIcon, ConnectionView, IconKind } from "@/lib/studio/connections/types";
import ConnectionAvatar, { PRESET_ICONS } from "./ConnectionAvatar";
import { apiFetch, ghostButton, modalPanel, ModalHeader, primaryButton, secondaryButton } from "./ui";

const MAX_BYTES = 256 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";

export default function IconPickerModal({
  connection,
  onClose,
  onSaved,
}: {
  connection: ConnectionView;
  onClose: () => void;
  onSaved: (connection: ConnectionView) => void;
}) {
  const auto = autoIcon(connection.name, connection.database);
  const [kind, setKind] = useState<IconKind>(connection.icon.kind);
  const [preset, setPreset] = useState(connection.icon.kind === "preset" ? connection.icon.preset ?? "database" : auto.preset ?? "database");
  const [color, setColor] = useState(connection.icon.color);
  const [upload, setUpload] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const previewIcon: ConnectionIcon =
    kind === "auto"
      ? { kind, preset: auto.preset, color: auto.color, url: null }
      : kind === "preset"
        ? { kind, preset, color, url: null }
        : { kind, preset: null, color, url: upload ?? (connection.icon.kind === "custom" ? connection.icon.url : null) };

  const pickFile = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      setError("รองรับเฉพาะรูป PNG, JPG, WebP หรือ SVG");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("ไฟล์รูปใหญ่เกิน 256 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setUpload(String(reader.result));
    reader.onerror = () => setError("อ่านไฟล์ไม่สำเร็จ");
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (kind === "custom" && !previewIcon.url) {
      setError("กรุณาเลือกไฟล์รูป");
      return;
    }
    setSaving(true);
    setError(null);
    const body =
      kind === "auto"
        ? { kind }
        : kind === "preset"
          ? { kind, preset, color }
          : { kind, color, ...(upload ? { dataUrl: upload } : {}) };
    const res = await apiFetch<{ connection: ConnectionView }>(`/api/studio/connections/${connection.id}/icon`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) onSaved(res.data.connection);
    else setError(res.error);
  };

  const tabs: { id: IconKind; label: string; icon: React.ReactNode }[] = [
    { id: "auto", label: "อัตโนมัติ", icon: <Sparkles className="w-4 h-4" /> },
    { id: "preset", label: "เลือกไอคอน", icon: <ImageIcon className="w-4 h-4" /> },
    { id: "custom", label: "อัปโหลดรูป", icon: <Upload className="w-4 h-4" /> },
  ];

  return (
    <Modal onClose={() => {}} label="เปลี่ยนรูปของการเชื่อมต่อ" panelClassName={`max-w-xl ${modalPanel}`}>
      <ModalHeader icon={<ImageIcon className="w-5 h-5" />} title="รูปของการเชื่อมต่อ" onClose={onClose} />

      <div className="flex items-center gap-5 p-4 rounded-2xl bg-slate-50 dark:bg-white/5">
        <ConnectionAvatar connection={{ name: connection.name, type: connection.type, icon: previewIcon }} size="xl" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{connection.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            รูปของการเชื่อมต่อ + โลโก้ประเภทฐานข้อมูลที่มุมขวาล่าง
          </p>
        </div>
      </div>

      <div role="tablist" className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-white/5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={kind === t.id}
            onClick={() => {
              setKind(t.id);
              setError(null);
            }}
            className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-colors ${
              kind === t.id
                ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {kind === "auto" && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          ระบบเลือกไอคอนจากคำในชื่อการเชื่อมต่อและชื่อ database ให้เอง
          {auto.preset
            ? ` (ตรงกับหมวด "${ICON_PRESETS.find((p) => p.key === auto.preset)?.label}")`
            : " ถ้าไม่ตรงกับหมวดไหนจะใช้อักษรย่อของชื่อ"}
        </p>
      )}

      {(kind === "preset" || kind === "custom") && (
        <div className="space-y-4">
          {kind === "preset" && (
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {ICON_PRESETS.map((p) => {
                const Icon = PRESET_ICONS[p.key];
                const active = preset === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPreset(p.key)}
                    title={p.label}
                    aria-label={p.label}
                    aria-pressed={active}
                    className={`aspect-square flex items-center justify-center rounded-xl border cursor-pointer transition-colors ${
                      active
                        ? "border-[#0055fa] ring-2 ring-[#0055fa]/30 bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-300"
                        : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </div>
          )}

          {kind === "custom" && (
            <div
              className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/15 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pickFile(e.dataTransfer.files[0]);
              }}
            >
              <Upload className="w-6 h-6 text-slate-400" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">คลิกหรือลากไฟล์มาวาง</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">PNG, JPG, WebP หรือ SVG ไม่เกิน 256 KB • แนะนำรูปสี่เหลี่ยมจัตุรัส</p>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {kind === "preset" ? "สีพื้น" : "สีสำรอง (ใช้เมื่อรูปโหลดไม่ได้)"}
            </p>
            <div className="flex flex-wrap gap-2">
              {ICON_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`สี ${c}`}
                  aria-pressed={color === c}
                  className="w-8 h-8 rounded-full flex items-center justify-center ring-offset-2 ring-offset-white dark:ring-offset-[#0c1222] cursor-pointer"
                  style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }}
                >
                  {color === c && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-white/5">
        <button type="button" className={ghostButton} onClick={onClose}>ยกเลิก</button>
        {kind === "custom" && upload && (
          <button type="button" className={secondaryButton} onClick={() => setUpload(null)}>
            ล้างไฟล์ที่เลือก
          </button>
        )}
        <button type="button" className={primaryButton} onClick={save} disabled={saving}>
          {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          บันทึกรูป
        </button>
      </div>
    </Modal>
  );
}
