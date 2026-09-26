"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Plus,
  Plug,
  Brain,
  CheckCircle,
  AlertTriangle,
  Server,
  Trash2,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Zap,
  TestTube,
  X,
  Star,
  ChevronDown,
  Globe,
  Key,
  Copy,
  ExternalLink,
  Search,
  Check,
  Sparkles,
} from "lucide-react";
import Modal from "@/components/common/Modal";

// ────────────── Types ──────────────

export interface LLMConnection {
  id: number;
  name: string;
  provider: string;
  base_url: string;
  api_key: string;
  is_active: boolean;
  priority: number;
  model_count: string;
  active_model_count: string;
  created_at: string;
  updated_at: string;
}

export interface Model {
  id: number | null;
  connection_id: number;
  model_id: string;
  display_name: string;
  description: string;
  context_length: number;
  max_tokens: number;
  temperature: number;
  top_p: number;
  is_active: boolean;
  is_default: boolean;
  capabilities: string[];
  connection_name: string;
  connection_provider: string;
  connection_base_url: string;
  connection_is_active: boolean;
  created_at?: string;
  in_db?: boolean;
}

type ModalState =
  | null
  | { type: "addConnection" }
  | { type: "editConnection"; connection: LLMConnection }
  | { type: "deleteConnection"; connection: LLMConnection }
  | { type: "addModel" }
  | { type: "editModel"; model: Model }
  | { type: "deleteModel"; model: Model }
  | { type: "testConnection" };

export default function AdminLLMSection() {
  // Data
  const [connections, setConnections] = useState<LLMConnection[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"connections" | "models">("connections");

  // UI
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Models Filter, Search & Pagination
  const [modelFilter, setModelFilter] = useState<"all" | "active" | "inactive">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConnFilter, setSelectedConnFilter] = useState<number | "all">("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [syncingModels, setSyncingModels] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Test connection
  const [testResult, setTestResult] = useState<{
    success: boolean;
    models?: { id: string; name: string }[];
    error?: string;
  } | null>(null);
  const [testing, setTesting] = useState(false);

  // Forms
  const [connForm, setConnForm] = useState({
    name: "",
    provider: "openai" as "openai" | "ollama",
    base_url: "",
    api_key: "",
    is_active: true,
    priority: 0,
  });

  const [modelForm, setModelForm] = useState({
    connection_id: 0,
    model_id: "",
    display_name: "",
    description: "",
    context_length: 4096,
    max_tokens: 2048,
    temperature: 0.7,
    top_p: 1.0,
    is_active: true,
    is_default: false,
  });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ────── Data Fetching ──────

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/llm-connections");
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || []);
      }
    } catch {
      showToast("ไม่สามารถโหลดข้อมูล Connections", "error");
    }
  }, []);

  const fetchModels = useCallback(async (refresh = false) => {
    try {
      const res = await fetch(`/api/admin/models${refresh ? "?refresh=true" : ""}`);
      if (res.ok) {
        const data = await res.json();
        setModels(data.models || []);
      }
    } catch {
      showToast("ไม่สามารถโหลดข้อมูล Models", "error");
    }
  }, []);

  const fetchAll = useCallback(async (refresh = false) => {
    setIsLoading(true);
    await Promise.all([fetchConnections(), fetchModels(refresh)]);
    setIsLoading(false);
  }, [fetchConnections, fetchModels]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ────── Connection CRUD ──────

  const handleCreateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/llm-connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(connForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "เพิ่ม Connection เรียบร้อย");
        setModal(null);
        resetConnForm();
        await fetchConnections();
        await fetchModels(true);
      } else {
        showToast(data.error || "ไม่สามารถสร้าง Connection ได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาด", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modal?.type !== "editConnection") return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/llm-connections/${modal.connection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(connForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "อัปเดตเรียบร้อย");
        setModal(null);
        fetchConnections();
        fetchModels(true);
      } else {
        showToast(data.error || "ไม่สามารถอัปเดตได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาด", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConnection = async () => {
    if (modal?.type !== "deleteConnection") return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/llm-connections/${modal.connection.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "ลบเรียบร้อย");
        setModal(null);
        fetchAll(true);
      } else {
        showToast(data.error || "ไม่สามารถลบได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาด", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleConnectionActive = async (conn: LLMConnection) => {
    try {
      const res = await fetch(`/api/admin/llm-connections/${conn.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !conn.is_active }),
      });
      if (res.ok) {
        showToast(`${conn.name}: ${!conn.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}`);
        fetchConnections();
        fetchModels(true);
      }
    } catch {
      showToast("เกิดข้อผิดพลาด", "error");
    }
  };

  // ────── Test Connection ──────

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/llm-connections/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_url: connForm.base_url,
          api_key: connForm.api_key,
          provider: connForm.provider,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, error: "Connection failed" });
    } finally {
      setTesting(false);
    }
  };

  // ────── Model CRUD ──────

  const handleCreateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modelForm),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "เพิ่ม Model เรียบร้อย");
        setModal(null);
        resetModelForm();
        fetchModels();
      } else {
        showToast(data.error || "ไม่สามารถเพิ่ม Model ได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาด", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modal?.type !== "editModel") return;
    setSubmitting(true);
    try {
      if (modal.model.id) {
        const res = await fetch(`/api/admin/models/${modal.model.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(modelForm),
        });
        const data = await res.json();
        if (res.ok) {
          showToast(data.message || "อัปเดตเรียบร้อย");
          setModal(null);
          fetchModels();
        } else {
          showToast(data.error || "ไม่สามารถอัปเดตได้", "error");
        }
      } else {
        const res = await fetch("/api/admin/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...modelForm,
            connection_id: modal.model.connection_id,
            model_id: modal.model.model_id,
            is_active: true,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          showToast("บันทึกการตั้งค่า Model ลง Database เรียบร้อย");
          setModal(null);
          fetchModels();
        } else {
          showToast(data.error || "ไม่สามารถบันทึกได้", "error");
        }
      }
    } catch {
      showToast("เกิดข้อผิดพลาด", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteModel = async () => {
    if (modal?.type !== "deleteModel") return;
    setSubmitting(true);
    try {
      if (modal.model.id) {
        const res = await fetch(`/api/admin/models/${modal.model.id}`, {
          method: "DELETE",
        });
        const data = await res.json();
        if (res.ok) {
          showToast(data.message || "ลบออกจาก Database เรียบร้อย");
          setModal(null);
          setModels((prev) =>
            prev.map((m) =>
              m.connection_id === modal.model.connection_id && m.model_id === modal.model.model_id
                ? { ...m, id: null, in_db: false, is_active: false, is_default: false }
                : m
            )
          );
        } else {
          showToast(data.error || "ไม่สามารถลบได้", "error");
        }
      } else {
        setModal(null);
      }
    } catch {
      showToast("เกิดข้อผิดพลาด", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleModelDefault = async (model: Model) => {
    try {
      if (!model.is_default) {
        if (!model.id) {
          const res = await fetch("/api/admin/models", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              connection_id: model.connection_id,
              model_id: model.model_id,
              display_name: model.display_name,
              context_length: model.context_length,
              is_active: true,
              is_default: true,
            }),
          });
          const data = await res.json();
          if (res.ok && data.model) {
            setModels((prev) =>
              prev.map((m) => {
                if (m.connection_id === model.connection_id && m.model_id === model.model_id) {
                  return { ...m, id: data.model.id, in_db: true, is_active: true, is_default: true };
                }
                return { ...m, is_default: false };
              })
            );
            showToast(`${model.display_name}: ตั้งเป็น Default และเปิดใช้งานแล้ว`);
          }
        } else {
          const res = await fetch(`/api/admin/models/${model.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_default: true, is_active: true }),
          });
          if (res.ok) {
            setModels((prev) =>
              prev.map((m) => {
                if (m.id === model.id) {
                  return { ...m, is_default: true, is_active: true };
                }
                return { ...m, is_default: false };
              })
            );
            showToast(`${model.display_name}: ตั้งเป็น Default แล้ว`);
          }
        }
      } else {
        if (model.id) {
          const res = await fetch(`/api/admin/models/${model.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_default: false }),
          });
          if (res.ok) {
            setModels((prev) =>
              prev.map((m) => (m.id === model.id ? { ...m, is_default: false } : m))
            );
            showToast(`${model.display_name}: ยกเลิก Default`);
          }
        }
      }
    } catch {
      showToast("เกิดข้อผิดพลาด", "error");
    }
  };

  const handleToggleModelActive = async (model: Model) => {
    const nextState = !model.is_active;

    setModels((prev) =>
      prev.map((m) =>
        m.connection_id === model.connection_id && m.model_id === model.model_id
          ? { ...m, is_active: nextState }
          : m
      )
    );

    try {
      if (nextState) {
        if (!model.id) {
          const res = await fetch("/api/admin/models", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              connection_id: model.connection_id,
              model_id: model.model_id,
              display_name: model.display_name,
              context_length: model.context_length,
              is_active: true,
            }),
          });
          const data = await res.json();
          if (res.ok && data.model) {
            setModels((prev) =>
              prev.map((m) =>
                m.connection_id === model.connection_id && m.model_id === model.model_id
                  ? { ...m, id: data.model.id, in_db: true, is_active: true }
                  : m
              )
            );
            showToast(`${model.display_name}: เปิดใช้งานแล้ว (บันทึกลง Database)`);
          } else {
            setModels((prev) =>
              prev.map((m) =>
                m.connection_id === model.connection_id && m.model_id === model.model_id
                  ? { ...m, is_active: false }
                  : m
              )
            );
            showToast(data.error || "ไม่สามารถบันทึกได้", "error");
          }
        } else {
          const res = await fetch(`/api/admin/models/${model.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: true }),
          });
          if (res.ok) {
            showToast(`${model.display_name}: เปิดใช้งานแล้ว`);
          }
        }
      } else {
        if (model.id) {
          const res = await fetch(`/api/admin/models/${model.id}`, {
            method: "DELETE",
          });
          if (res.ok) {
            setModels((prev) =>
              prev.map((m) =>
                m.connection_id === model.connection_id && m.model_id === model.model_id
                  ? { ...m, id: null, in_db: false, is_active: false, is_default: false }
                  : m
              )
            );
            showToast(`${model.display_name}: ปิดใช้งานแล้ว (นำออกจาก Database)`);
          } else {
            setModels((prev) =>
              prev.map((m) =>
                m.connection_id === model.connection_id && m.model_id === model.model_id
                  ? { ...m, is_active: true }
                  : m
              )
            );
            showToast("ไม่สามารถปิดใช้งานได้", "error");
          }
        }
      }
    } catch {
      setModels((prev) =>
        prev.map((m) =>
          m.connection_id === model.connection_id && m.model_id === model.model_id
            ? { ...m, is_active: !nextState }
            : m
        )
      );
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    }
  };

  const handleRefreshModels = async () => {
    setSyncingModels(true);
    try {
      await fetchModels(true);
      showToast("ดึงข้อมูลโมเดลล่าสุดจาก Connection สำเร็จ");
    } catch {
      showToast("ไม่สามารถรีเฟรชโมเดลได้", "error");
    } finally {
      setSyncingModels(false);
    }
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered & Paginated Models
  const filteredModels = React.useMemo(() => {
    return models.filter((m) => {
      if (modelFilter === "active" && !m.is_active) return false;
      if (modelFilter === "inactive" && m.is_active) return false;
      if (selectedConnFilter !== "all" && m.connection_id !== selectedConnFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = m.display_name?.toLowerCase().includes(q);
        const matchId = m.model_id?.toLowerCase().includes(q);
        const matchConn = m.connection_name?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchConn) return false;
      }

      return true;
    });
  }, [models, modelFilter, selectedConnFilter, searchQuery]);

  const activeCount = React.useMemo(() => models.filter((m) => m.is_active).length, [models]);
  const inactiveCount = models.length - activeCount;

  const totalPages = Math.ceil(filteredModels.length / pageSize) || 1;
  const paginatedModels = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredModels.slice(start, start + pageSize);
  }, [filteredModels, page, pageSize]);

  // ────── Form Helpers ──────

  const resetConnForm = () => {
    setConnForm({
      name: "",
      provider: "openai",
      base_url: "",
      api_key: "",
      is_active: true,
      priority: 0,
    });
    setTestResult(null);
  };

  const resetModelForm = () => {
    setModelForm({
      connection_id: connections[0]?.id || 0,
      model_id: "",
      display_name: "",
      description: "",
      context_length: 4096,
      max_tokens: 2048,
      temperature: 0.7,
      top_p: 1.0,
      is_active: true,
      is_default: false,
    });
  };

  const openAddConnection = () => {
    resetConnForm();
    setModal({ type: "addConnection" });
  };

  const openEditConnection = (conn: LLMConnection) => {
    setConnForm({
      name: conn.name,
      provider: conn.provider as "openai" | "ollama",
      base_url: conn.base_url,
      api_key: conn.api_key,
      is_active: conn.is_active,
      priority: conn.priority,
    });
    setTestResult(null);
    setModal({ type: "editConnection", connection: conn });
  };

  const openAddModel = () => {
    resetModelForm();
    setModal({ type: "addModel" });
  };

  const openEditModel = (model: Model) => {
    setModelForm({
      connection_id: model.connection_id,
      model_id: model.model_id,
      display_name: model.display_name,
      description: model.description || "",
      context_length: model.context_length,
      max_tokens: model.max_tokens,
      temperature: model.temperature,
      top_p: model.top_p,
      is_active: model.is_active,
      is_default: model.is_default,
    });
    setModal({ type: "editModel", model });
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border animate-in slide-in-from-top duration-300 ${
            toast.type === "success"
              ? "bg-emerald-500 text-white border-emerald-400"
              : "bg-rose-600 text-white border-rose-500"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Sub-Tabs (Connections vs Models) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 w-fit">
          <button
            onClick={() => setActiveSubTab("connections")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === "connections"
                ? "bg-white dark:bg-[#0055fa] text-[#0055fa] dark:text-white shadow-xs border border-slate-200/80 dark:border-[#0055fa]"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <Plug className="w-3.5 h-3.5" />
            <span>Connections ({connections.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab("models")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === "models"
                ? "bg-white dark:bg-[#0055fa] text-[#0055fa] dark:text-white shadow-xs border border-slate-200/80 dark:border-[#0055fa]"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Models Catalog ({models.length})</span>
          </button>
        </div>

        <button
          onClick={() => fetchAll(true)}
          disabled={isLoading}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg transition-all shadow-xs cursor-pointer w-fit"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
          <span>รีเฟรช</span>
        </button>
      </div>

      {/* ═══════════ CONNECTIONS TAB ═══════════ */}
      {activeSubTab === "connections" && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-[11px] text-slate-400">
              เชื่อมต่อ LLM Endpoints เพื่อใช้งานระบบ Chat — รองรับ OpenAI-compatible API และ Ollama
            </p>
            <button
              onClick={openAddConnection}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-lg shadow-sm shadow-[#0055fa]/25 transition-all cursor-pointer shrink-0 w-fit"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่ม Connection</span>
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-5 h-5 text-[#0055fa] animate-spin" />
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-14 bg-white dark:bg-white/[0.03] rounded-xl border border-dashed border-slate-300 dark:border-white/10">
              <Server className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                ยังไม่มี LLM Connection
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                เพิ่ม Connection เพื่อเริ่มใช้งานระบบ Chat
              </p>
              <button
                onClick={openAddConnection}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0055fa] bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                เพิ่ม Connection แรก
              </button>
            </div>
          ) : (
            <div className="grid gap-2.5">
              {connections.map((conn) => (
                <div
                  key={conn.id}
                  className={`group relative bg-white dark:bg-white/[0.03] border rounded-xl p-3 sm:p-3.5 transition-all hover:shadow-md ${
                    conn.is_active
                      ? "border-slate-200 dark:border-white/10 hover:border-[#0055fa]/30 dark:hover:border-[#0055fa]/30"
                      : "border-slate-200/50 dark:border-white/5 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          conn.provider === "ollama"
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                            : "bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400 border border-blue-200 dark:border-blue-500/20"
                        }`}
                      >
                        {conn.provider === "ollama" ? (
                          <span className="text-base">🦙</span>
                        ) : (
                          <Plug className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">{conn.name}</h3>
                          <span
                            className={`px-1.5 py-0.2 text-[9px] font-semibold rounded border ${
                              conn.provider === "ollama"
                                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                                : "bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400 border-blue-200 dark:border-blue-500/20"
                            }`}
                          >
                            {conn.provider === "ollama" ? "Ollama" : "OpenAI-compatible"}
                          </span>
                          <span
                            className={`px-1.5 py-0.2 text-[9px] font-semibold rounded border ${
                              conn.is_active
                                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-500/20"
                                : "bg-slate-100 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10"
                            }`}
                          >
                            {conn.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-mono truncate max-w-[280px] sm:max-w-md">
                          <span>{conn.base_url}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
                      <button
                        onClick={() => {
                          setSelectedConnFilter(conn.id);
                          setActiveSubTab("models");
                        }}
                        title="ดูโมเดลจาก Connection นี้"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#0055fa] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all cursor-pointer"
                      >
                        <Brain className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleToggleConnectionActive(conn)}
                        title={conn.is_active ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all cursor-pointer"
                      >
                        {conn.is_active ? (
                          <ToggleRight className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => openEditConnection(conn)}
                        title="แก้ไข"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#0055fa] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setModal({ type: "deleteConnection", connection: conn })}
                        title="ลบ"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ MODELS TAB ═══════════ */}
      {activeSubTab === "models" && (
        <div className="space-y-3">
          {/* Top Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 bg-white dark:bg-white/[0.03] p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => {
                  setModelFilter("all");
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                  modelFilter === "all"
                    ? "bg-[#0055fa] border-[#0055fa] text-white shadow-xs"
                    : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                }`}
              >
                ทั้งหมด ({models.length})
              </button>
              <button
                onClick={() => {
                  setModelFilter("active");
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                  modelFilter === "active"
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                    : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-emerald-600 dark:text-emerald-400 hover:border-emerald-500/30"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                เปิดใช้งาน ({activeCount})
              </button>
              <button
                onClick={() => {
                  setModelFilter("inactive");
                  setPage(1);
                }}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${
                  modelFilter === "inactive"
                    ? "bg-slate-700 border-slate-700 text-white shadow-xs"
                    : "bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-slate-300"
                }`}
              >
                ปิดใช้งาน ({inactiveCount})
              </button>

              {/* Connection Filter dropdown */}
              {connections.length > 1 && (
                <select
                  value={selectedConnFilter}
                  onChange={(e) => {
                    setSelectedConnFilter(e.target.value === "all" ? "all" : Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 text-[11px] font-medium rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 outline-none cursor-pointer"
                >
                  <option value="all">ทุก Connection ({connections.length})</option>
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Right Side: Search + Action Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
              {/* Search input */}
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="ค้นหาชื่อ หรือ model ID..."
                  className="w-full pl-7 pr-6 py-1 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-[#0055fa] focus:ring-1 focus:ring-[#0055fa] transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setPage(1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              {/* Live Fetch / Refresh Models Button */}
              <button
                onClick={handleRefreshModels}
                disabled={syncingModels || connections.length === 0}
                title="ดึงรายการโมเดลล่าสุดจาก Connection สดๆ"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#0055fa] bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 rounded-lg transition-all cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3 h-3 ${syncingModels ? "animate-spin" : ""}`} />
                <span>{syncingModels ? "กำลังดึง..." : "ดึงโมเดลสด"}</span>
              </button>

              {/* Add Custom Model Button */}
              <button
                onClick={openAddModel}
                disabled={connections.length === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-lg shadow-xs transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3" />
                <span>เพิ่ม Model</span>
              </button>
            </div>
          </div>

          {connections.length === 0 && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400">
              ⚠️ กรุณาเพิ่ม LLM Connection ก่อน จึงจะสามารถเพิ่มหรือดึงรายชื่อ Model ได้
            </div>
          )}

          {/* Model Items */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 text-[#0055fa] animate-spin" />
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-white/[0.03] rounded-2xl border border-dashed border-slate-300 dark:border-white/10">
              <Brain className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {models.length === 0
                  ? "ยังไม่มีโมเดลในระบบ"
                  : "ไม่พบโมเดลที่ตรงกับเงื่อนไขการค้นหา"}
              </p>
              {models.length === 0 ? (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <p className="text-xs text-slate-400">
                    กดปุ่มด้านล่างเพื่อดึงโมเดลทั้งหมดจาก Connection ที่เชื่อมต่อไว้
                  </p>
                  <button
                    onClick={() => handleRefreshModels()}
                    disabled={syncingModels || connections.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingModels ? "animate-spin" : ""}`} />
                    {syncingModels ? "กำลังดึงข้อมูลโมเดล..." : "ดึงโมเดลทั้งหมดจาก Connection (Live Fetch)"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setModelFilter("all");
                    setSearchQuery("");
                    setSelectedConnFilter("all");
                    setPage(1);
                  }}
                  className="mt-2 text-xs text-[#0055fa] hover:underline cursor-pointer"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {paginatedModels.map((model) => (
                <div
                  key={`${model.connection_id}-${model.model_id}`}
                  className={`group bg-white dark:bg-white/[0.03] border rounded-xl p-2.5 sm:p-3 transition-all hover:shadow-sm ${
                    model.is_active && model.connection_is_active
                      ? "border-slate-200 dark:border-white/10 hover:border-[#0055fa]/30"
                      : "border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap">
                    {/* Left: Icon & Info */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                          model.is_default
                            ? "bg-gradient-to-tr from-amber-400 to-orange-500 text-white shadow-xs"
                            : model.is_active
                            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20"
                            : "bg-slate-100 dark:bg-white/5 text-slate-400"
                        }`}
                      >
                        {model.is_default ? (
                          <Star className="w-3.5 h-3.5 fill-white" />
                        ) : (
                          <Brain className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3
                            className={`font-semibold text-xs sm:text-sm truncate max-w-[140px] sm:max-w-xs ${
                              model.is_active
                                ? "text-slate-900 dark:text-slate-100"
                                : "text-slate-500 dark:text-slate-400"
                            }`}
                          >
                            {model.display_name}
                          </h3>

                          {/* Model ID with copy button */}
                          <div className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-1.5 py-0.2 rounded border border-slate-200/50 dark:border-white/5 max-w-[130px] sm:max-w-xs truncate">
                            <span className="truncate">{model.model_id}</span>
                            <button
                              type="button"
                              onClick={(e) => handleCopyId(model.model_id, e)}
                              title="คัดลอก Model ID"
                              className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
                            >
                              {copiedId === model.model_id ? (
                                <Check className="w-2.5 h-2.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>

                          {model.is_default && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 rounded">
                              DEFAULT
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 flex-wrap">
                          <span className="inline-flex items-center gap-1">
                            <Plug className="w-2.5 h-2.5" />
                            {model.connection_name}
                          </span>
                          {model.context_length > 0 && (
                            <span>ctx: {(model.context_length / 1024).toFixed(0)}K</span>
                          )}
                          <span>temp: {model.temperature}</span>
                          <span>max: {model.max_tokens}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Switch & Actions */}
                    <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                      {/* Status Label & Switch */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[11px] font-medium hidden sm:inline ${
                            model.is_active
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-slate-400"
                          }`}
                        >
                          {model.is_active ? "เปิด" : "ปิด"}
                        </span>
                        <ToggleSwitch
                          checked={model.is_active}
                          onChange={() => handleToggleModelActive(model)}
                          title={model.is_active ? "คลิกเพื่อปิดใช้งาน" : "คลิกเพื่อเปิดใช้งาน"}
                        />
                      </div>

                      {/* Divider */}
                      <div className="h-4 w-px bg-slate-200 dark:border-white/10 hidden sm:block" />

                      {/* Extra Actions */}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleToggleModelDefault(model)}
                          title={model.is_default ? "โมเดลเริ่มต้น (Default)" : "ตั้งเป็นโมเดลเริ่มต้น"}
                          className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            model.is_default
                              ? "text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                              : "text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10"
                          }`}
                        >
                          <Star className={`w-3.5 h-3.5 ${model.is_default ? "fill-amber-500" : ""}`} />
                        </button>
                        <button
                          onClick={() => openEditModel(model)}
                          title="แก้ไขการตั้งค่าโมเดล"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#0055fa] hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setModal({ type: "deleteModel", model })}
                          title="ลบโมเดล"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 px-2">
                  <p className="text-xs text-slate-500">
                    แสดง {(page - 1) * pageSize + 1} -{" "}
                    {Math.min(page * pageSize, filteredModels.length)} จากทั้งหมด{" "}
                    {filteredModels.length} โมเดล
                    {modelFilter === "active" ? " (เฉพาะที่เปิดใช้งาน)" : ""}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                    >
                      ก่อนหน้า
                    </button>
                    <span className="text-xs font-semibold px-2">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
                    >
                      ถัดไป
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ MODALS ═══════════ */}

      {/* Connection Modal (Add / Edit) */}
      {(modal?.type === "addConnection" || modal?.type === "editConnection") && (
        <ModalOverlay onClose={() => setModal(null)}>
          <form
            onSubmit={modal.type === "addConnection" ? handleCreateConnection : handleUpdateConnection}
            className="space-y-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] flex items-center justify-center">
                <Plug className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">
                  {modal.type === "addConnection" ? "เพิ่ม LLM Connection ใหม่" : "แก้ไข Connection"}
                </h2>
                <p className="text-xs text-slate-500">ตั้งค่า Endpoint สำหรับเชื่อมต่อ LLM Provider</p>
              </div>
            </div>

            <div className="space-y-4">
              <InputField
                label="ชื่อ Connection"
                value={connForm.name}
                onChange={(v) => setConnForm({ ...connForm, name: v })}
                placeholder="e.g. OpenRouter, Local Ollama"
                required
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Provider
                </label>
                <div className="flex gap-2">
                  {(["openai", "ollama"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setConnForm({ ...connForm, provider: p })}
                      className={`flex-1 px-4 py-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                        connForm.provider === p
                          ? "bg-[#0055fa]/10 border-[#0055fa]/30 text-[#0055fa]"
                          : "bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      {p === "openai" ? "🔥 OpenAI-compatible" : "🦙 Ollama"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <InputField
                  label="Base URL"
                  value={connForm.base_url}
                  onChange={(v) => setConnForm({ ...connForm, base_url: v })}
                  placeholder={
                    connForm.provider === "ollama"
                      ? "http://localhost:11434"
                      : "https://openrouter.ai/api/v1"
                  }
                  required
                  icon={<Globe className="w-4 h-4" />}
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                  {connForm.provider === "ollama"
                    ? "เช่น http://localhost:11434 หรือ http://localhost:11434/v1"
                    : "เช่น https://openrouter.ai/api/v1 หรือ https://api.openai.com/v1 (ระบบจะปรับ path ให้อัตโนมัติ)"}
                </p>
              </div>

              {connForm.provider === "openai" && (
                <InputField
                  label="API Key"
                  value={connForm.api_key}
                  onChange={(v) => setConnForm({ ...connForm, api_key: v })}
                  placeholder="sk-..."
                  type="password"
                  icon={<Key className="w-4 h-4" />}
                />
              )}

              <InputField
                label="Priority (ยิ่งสูง ยิ่ง preferred)"
                value={String(connForm.priority)}
                onChange={(v) => setConnForm({ ...connForm, priority: parseInt(v) || 0 })}
                type="number"
              />

              {/* Test Connection Button */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={!connForm.base_url || testing}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-500/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {testing ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <TestTube className="w-3.5 h-3.5" />
                  )}
                  ทดสอบการเชื่อมต่อ
                </button>
                {testResult && (
                  <span
                    className={`text-xs font-medium ${
                      testResult.success ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {testResult.success
                      ? `✓ เชื่อมต่อสำเร็จ — พบ ${testResult.models?.length || 0} models`
                      : `✗ ${testResult.error}`}
                  </span>
                )}
              </div>

              {/* Show discovered models */}
              {testResult?.success && testResult.models && testResult.models.length > 0 && (
                <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl p-3 max-h-40 overflow-y-auto">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Available Models ({testResult.models.length})
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {testResult.models.map((m) => (
                      <span
                        key={m.id}
                        className="text-xs font-mono text-slate-600 dark:text-slate-400 px-2 py-1 bg-white dark:bg-white/5 rounded border border-slate-100 dark:border-white/5 truncate"
                      >
                        {m.id}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {modal.type === "addConnection" ? "บันทึก Connection" : "อัปเดต"}
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* Delete Connection Modal */}
      {modal?.type === "deleteConnection" && (
        <ModalOverlay onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-rose-600">ลบ LLM Connection</h2>
                <p className="text-xs text-slate-500">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              คุณแน่ใจหรือไม่ว่าต้องการลบ Connection{" "}
              <strong className="text-slate-900 dark:text-white">
                &ldquo;{modal.connection.name}&rdquo;
              </strong>
              ? Model ทั้งหมดที่เชื่อมโยงกับ Connection นี้จะถูกลบไปด้วย
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteConnection}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Model Modal (Add / Edit) */}
      {(modal?.type === "addModel" || modal?.type === "editModel") && (
        <ModalOverlay onClose={() => setModal(null)}>
          <form
            onSubmit={modal.type === "addModel" ? handleCreateModel : handleUpdateModel}
            className="space-y-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">
                  {modal.type === "addModel" ? "เพิ่ม Model ใหม่" : "แก้ไข Model"}
                </h2>
                <p className="text-xs text-slate-500">กำหนดค่าการทำงานของโมเดลสำหรับระบบ Chat</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Connection <span className="text-rose-500">*</span>
                </label>
                <select
                  value={modelForm.connection_id}
                  onChange={(e) =>
                    setModelForm({ ...modelForm, connection_id: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2.5 text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:border-[#0055fa] outline-none"
                  required
                >
                  <option value={0}>-- เลือก Connection --</option>
                  {connections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.provider})
                    </option>
                  ))}
                </select>
              </div>

              <InputField
                label="Model ID"
                value={modelForm.model_id}
                onChange={(v) => setModelForm({ ...modelForm, model_id: v })}
                placeholder="e.g. gpt-4o, llama3:latest, claude-3-5-sonnet"
                required
              />

              <InputField
                label="ชื่อแสดงผล"
                value={modelForm.display_name}
                onChange={(v) => setModelForm({ ...modelForm, display_name: v })}
                placeholder="e.g. GPT-4o, LLaMA 3 8B, Claude 3.5 Sonnet"
                required
              />

              <InputField
                label="คำอธิบาย (Optional)"
                value={modelForm.description}
                onChange={(v) => setModelForm({ ...modelForm, description: v })}
                placeholder="e.g. โมเดลขนาดใหญ่ ฉลาด เหมาะกับการเขียนโค้ด"
              />

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Context Length"
                  value={String(modelForm.context_length)}
                  onChange={(v) =>
                    setModelForm({ ...modelForm, context_length: parseInt(v) || 4096 })
                  }
                  type="number"
                />
                <InputField
                  label="Max Tokens"
                  value={String(modelForm.max_tokens)}
                  onChange={(v) =>
                    setModelForm({ ...modelForm, max_tokens: parseInt(v) || 2048 })
                  }
                  type="number"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InputField
                  label="Temperature (0-2)"
                  value={String(modelForm.temperature)}
                  onChange={(v) =>
                    setModelForm({ ...modelForm, temperature: parseFloat(v) || 0.7 })
                  }
                  type="number"
                />
                <InputField
                  label="Top P (0-1)"
                  value={String(modelForm.top_p)}
                  onChange={(v) => setModelForm({ ...modelForm, top_p: parseFloat(v) || 1.0 })}
                  type="number"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modelForm.is_active}
                    onChange={(e) => setModelForm({ ...modelForm, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-[#0055fa] focus:ring-[#0055fa]"
                  />
                  <span className="text-xs font-semibold">เปิดใช้งานทันที</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modelForm.is_default}
                    onChange={(e) => setModelForm({ ...modelForm, is_default: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-xs font-semibold">ตั้งเป็น Model เริ่มต้น</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {modal.type === "addModel" ? "บันทึก Model" : "อัปเดต"}
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {/* Delete Model Modal */}
      {modal?.type === "deleteModel" && (
        <ModalOverlay onClose={() => setModal(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-rose-600">ลบ Model</h2>
                <p className="text-xs text-slate-500">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              คุณแน่ใจหรือไม่ว่าต้องการลบ Model{" "}
              <strong className="text-slate-900 dark:text-white">
                &ldquo;{modal.model.display_name}&rdquo;
              </strong>{" "}
              ออกจากระบบ?
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteModel}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}

// ────────────── Sub-Components ──────────────

function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal
      onClose={onClose}
      panelClassName="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
      {children}
    </Modal>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`w-full ${
            icon ? "pl-9" : "pl-3"
          } pr-3 py-2.5 text-sm bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:border-[#0055fa] focus:ring-1 focus:ring-[#0055fa]/30 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600`}
        />
      </div>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  title,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title={title}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onChange();
      }}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0055fa] focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-white/20"
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
