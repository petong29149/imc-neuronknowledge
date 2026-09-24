"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Wrench,
  Server,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Play,
  Trash2,
  Pencil,
  Copy,
  Check,
  Search,
  ChevronDown,
  ChevronRight,
  Sliders,
  Radio,
  Terminal,
  Globe,
  Zap,
  Info,
  Layers,
  Code,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  X,
  ExternalLink,
} from "lucide-react";

export interface MCPServer {
  id: number;
  name: string;
  transport_type: "sse" | "streamable_http" | "stdio";
  url: string;
  command: string;
  args: any;
  env: any;
  headers: any;
  is_active: boolean;
  last_sync_at: string | null;
  status: "connected" | "error" | "untested";
  error_message: string;
  created_at: string;
  updated_at: string;
  tool_count?: string | number;
  active_tool_count?: string | number;
}

export interface MCPTool {
  id: number;
  server_id: number;
  server_name: string;
  transport_type: string;
  server_active: boolean;
  name: string;
  description: string;
  input_schema: any;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

type ModalState =
  | null
  | { type: "addServer" }
  | { type: "editServer"; server: MCPServer }
  | { type: "deleteServer"; server: MCPServer }
  | { type: "testTool"; tool: MCPTool };

// Preset templates for quick server addition
const SERVER_PRESETS = [
  {
    name: "mcp-essentials (Docker)",
    transport_type: "streamable_http",
    url: "http://localhost:8000/mcp",
    command: "",
    args: "",
    description: "Docker Streamable HTTP: get_date, calculator (Port 8000)",
  },
  {
    name: "Custom Remote SSE Server",
    transport_type: "sse",
    url: "http://localhost:8000/sse",
    command: "",
    args: "",
    description: "เชื่อมต่อ MCP Server ผ่าน Server-Sent Events (SSE)",
  },
  {
    name: "Filesystem MCP",
    transport_type: "stdio",
    url: "",
    command: "npx",
    args: "-y @modelcontextprotocol/server-filesystem .",
    description: "อนุญาตให้ AI อ่านและเขียนไฟล์ในไดเรกทอรีที่กำหนด",
  },
  {
    name: "Fetch & Webpage MCP",
    transport_type: "stdio",
    url: "",
    command: "npx",
    args: "-y @modelcontextprotocol/server-fetch",
    description: "เปิดให้ AI สามารถดึงข้อมูลและเนื้อหาจาก URL บนอินเทอร์เน็ตได้",
  },
  {
    name: "Memory Graph MCP",
    transport_type: "stdio",
    url: "",
    command: "npx",
    args: "-y @modelcontextprotocol/server-memory",
    description: "ระบบจดจำบริบทและความรู้แบบ Knowledge Graph",
  },
  {
    name: "PostgreSQL Database MCP",
    transport_type: "stdio",
    url: "",
    command: "npx",
    args: "-y @modelcontextprotocol/server-postgres postgres://postgres:1234@localhost:5432/imc-neuronknowledge",
    description: "เชื่อมต่อ Query และวิเคราะห์ฐานข้อมูล PostgreSQL",
  },
];

export default function AdminMCPSection() {
  // Data
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"servers" | "tools">("servers");

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [syncingServerId, setSyncingServerId] = useState<number | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Tools filters
  const [toolSearch, setToolSearch] = useState("");
  const [toolServerFilter, setToolServerFilter] = useState<number | "all">("all");
  const [toolStatusFilter, setToolStatusFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [expandedToolId, setExpandedToolId] = useState<number | null>(null);

  // Tool Test Execution state
  const [testToolArgs, setTestToolArgs] = useState("{}");
  const [testToolRunning, setTestToolRunning] = useState(false);
  const [testToolResult, setTestToolResult] = useState<any>(null);

  // Server Form
  const [serverForm, setServerForm] = useState({
    name: "",
    transport_type: "sse" as "sse" | "stdio" | "streamable_http",
    url: "",
    command: "",
    args: "",
    env: "{}",
    headers: "{}",
    is_active: true,
    auto_sync: true,
  });

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ────── Data Fetching ──────

  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/mcp-servers");
      if (res.ok) {
        const data = await res.json();
        setServers(data.servers || []);
      }
    } catch {
      showToast("ไม่สามารถโหลด MCP Servers ได้", "error");
    }
  }, []);

  const fetchTools = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/mcp-tools");
      if (res.ok) {
        const data = await res.json();
        setTools(data.tools || []);
      }
    } catch {
      showToast("ไม่สามารถโหลด MCP Tools ได้", "error");
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchServers(), fetchTools()]);
    setIsLoading(false);
  }, [fetchServers, fetchTools]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ────── Server Actions ──────

  const handleCreateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let parsedArgs: any = serverForm.args;
      if (serverForm.transport_type === "stdio" && typeof serverForm.args === "string") {
        parsedArgs = serverForm.args.split(" ").filter(Boolean);
      }

      let parsedEnv = {};
      try {
        parsedEnv = JSON.parse(serverForm.env || "{}");
      } catch {
        parsedEnv = {};
      }

      let parsedHeaders = {};
      try {
        parsedHeaders = JSON.parse(serverForm.headers || "{}");
      } catch {
        parsedHeaders = {};
      }

      const res = await fetch("/api/admin/mcp-servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: serverForm.name,
          transport_type: serverForm.transport_type,
          url: serverForm.url,
          command: serverForm.command,
          args: parsedArgs,
          env: parsedEnv,
          headers: parsedHeaders,
          is_active: serverForm.is_active,
          auto_sync: serverForm.auto_sync,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "เพิ่ม MCP Server เรียบร้อยแล้ว");
        setModal(null);
        resetServerForm();
        await fetchAll();
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการสร้าง MCP Server", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modal?.type !== "editServer") return;
    setSubmitting(true);
    try {
      let parsedArgs: any = serverForm.args;
      if (serverForm.transport_type === "stdio" && typeof serverForm.args === "string") {
        parsedArgs = serverForm.args.split(" ").filter(Boolean);
      }

      let parsedEnv = {};
      try {
        parsedEnv = JSON.parse(serverForm.env || "{}");
      } catch {
        parsedEnv = {};
      }

      let parsedHeaders = {};
      try {
        parsedHeaders = JSON.parse(serverForm.headers || "{}");
      } catch {
        parsedHeaders = {};
      }

      const res = await fetch(`/api/admin/mcp-servers/${modal.server.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: serverForm.name,
          transport_type: serverForm.transport_type,
          url: serverForm.url,
          command: serverForm.command,
          args: parsedArgs,
          env: parsedEnv,
          headers: parsedHeaders,
          is_active: serverForm.is_active,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "อัปเดตเรียบร้อยแล้ว");
        setModal(null);
        await fetchAll();
      } else {
        showToast(data.error || "ไม่สามารถอัปเดตได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteServer = async () => {
    if (modal?.type !== "deleteServer") return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/mcp-servers/${modal.server.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "ลบ MCP Server เรียบร้อยแล้ว");
        setModal(null);
        await fetchAll();
      } else {
        showToast(data.error || "ไม่สามารถลบได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาด", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleServerActive = async (server: MCPServer) => {
    try {
      const res = await fetch(`/api/admin/mcp-servers/${server.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !server.is_active }),
      });
      if (res.ok) {
        showToast(`${server.name}: ${!server.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}`);
        await fetchAll();
      }
    } catch {
      showToast("เกิดข้อผิดพลาด", "error");
    }
  };

  const handleSyncServer = async (server: MCPServer) => {
    setSyncingServerId(server.id);
    try {
      const res = await fetch(`/api/admin/mcp-servers/${server.id}/sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        showToast(
          `เชื่อมต่อ "${server.name}" สำเร็จ: พบ ${data.result?.tools_count || 0} tools (${data.result?.latency_ms || 0}ms)`
        );
        await fetchAll();
      } else {
        showToast(`Sync "${server.name}" ล้มเหลว: ${data.error}`, "error");
        await fetchServers();
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setSyncingServerId(null);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      for (const server of servers.filter((s) => s.is_active)) {
        await fetch(`/api/admin/mcp-servers/${server.id}/sync`, { method: "POST" });
      }
      showToast("Sync MCP Servers ทั้งหมดเรียบร้อยแล้ว");
      await fetchAll();
    } catch {
      showToast("เกิดข้อผิดพลาดในการ Sync", "error");
    } finally {
      setSyncingAll(false);
    }
  };

  // ────── Tool Actions ──────

  const handleToggleTool = async (tool: MCPTool) => {
    const nextState = !tool.is_enabled;

    // Optimistic update
    setTools((prev) =>
      prev.map((t) => (t.id === tool.id ? { ...t, is_enabled: nextState } : t))
    );

    try {
      const res = await fetch(`/api/admin/mcp-tools/${tool.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: nextState }),
      });
      if (res.ok) {
        showToast(`${tool.name}: ${nextState ? "เปิดใช้งาน" : "ปิดใช้งาน"}`);
        await fetchServers(); // Update active count on server cards
      } else {
        // Rollback
        setTools((prev) =>
          prev.map((t) => (t.id === tool.id ? { ...t, is_enabled: !nextState } : t))
        );
        showToast("ไม่สามารถเปลี่ยนสถานะ Tool ได้", "error");
      }
    } catch {
      // Rollback
      setTools((prev) =>
        prev.map((t) => (t.id === tool.id ? { ...t, is_enabled: !nextState } : t))
      );
      showToast("เกิดข้อผิดพลาด", "error");
    }
  };

  const handleBulkToggleServerTools = async (serverId: number, enable: boolean) => {
    try {
      const res = await fetch("/api/admin/mcp-tools", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ server_id: serverId, is_enabled: enable }),
      });
      if (res.ok) {
        showToast(`${enable ? "เปิดใช้งาน" : "ปิดใช้งาน"} Tools ทั้งหมดในเซิร์ฟเวอร์เรียบร้อย`);
        await fetchAll();
      }
    } catch {
      showToast("เกิดข้อผิดพลาด", "error");
    }
  };

  const handleOpenTestTool = (tool: MCPTool) => {
    // Generate initial test arguments template from input_schema
    const schema =
      typeof tool.input_schema === "string"
        ? JSON.parse(tool.input_schema || "{}")
        : tool.input_schema || {};

    const initialArgs: Record<string, any> = {};
    if (schema.properties) {
      Object.keys(schema.properties).forEach((key) => {
        const prop = schema.properties[key];
        if (prop.default !== undefined) {
          initialArgs[key] = prop.default;
        } else if (prop.type === "string") {
          initialArgs[key] = "";
        } else if (prop.type === "number" || prop.type === "integer") {
          initialArgs[key] = 0;
        } else if (prop.type === "boolean") {
          initialArgs[key] = false;
        } else if (prop.type === "array") {
          initialArgs[key] = [];
        } else {
          initialArgs[key] = {};
        }
      });
    }

    setTestToolArgs(JSON.stringify(initialArgs, null, 2));
    setTestToolResult(null);
    setModal({ type: "testTool", tool });
  };

  const handleRunToolTest = async () => {
    if (modal?.type !== "testTool") return;
    setTestToolRunning(true);
    setTestToolResult(null);

    let parsedArgs = {};
    try {
      parsedArgs = JSON.parse(testToolArgs || "{}");
    } catch {
      showToast("รูปแบบ JSON Arguments ไม่ถูกต้อง", "error");
      setTestToolRunning(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/mcp-tools/test-execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_name: modal.tool.name,
          arguments: parsedArgs,
        }),
      });

      const data = await res.json();
      setTestToolResult(data);
    } catch (err: any) {
      setTestToolResult({
        success: false,
        error: err.message || "Failed to execute tool",
      });
    } finally {
      setTestToolRunning(false);
    }
  };

  // ────── Helpers ──────

  const resetServerForm = () => {
    setServerForm({
      name: "",
      transport_type: "sse",
      url: "",
      command: "",
      args: "",
      env: "{}",
      headers: "{}",
      is_active: true,
      auto_sync: true,
    });
  };

  const handlePresetSelect = (preset: (typeof SERVER_PRESETS)[0]) => {
    setServerForm((prev) => ({
      ...prev,
      name: preset.name,
      transport_type: preset.transport_type as any,
      url: preset.url,
      command: preset.command,
      args: preset.args,
    }));
  };

  const copyToClipboard = (text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Filtered tools
  const filteredTools = useMemo(() => {
    return tools.filter((t) => {
      if (toolServerFilter !== "all" && t.server_id !== toolServerFilter) return false;
      if (toolStatusFilter === "enabled" && !t.is_enabled) return false;
      if (toolStatusFilter === "disabled" && t.is_enabled) return false;

      if (toolSearch.trim()) {
        const q = toolSearch.toLowerCase().trim();
        const matchName = t.name?.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchServer = t.server_name?.toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchServer) return false;
      }

      return true;
    });
  }, [tools, toolServerFilter, toolStatusFilter, toolSearch]);

  const totalConnected = useMemo(
    () => servers.filter((s) => s.status === "connected").length,
    [servers]
  );
  const totalEnabledTools = useMemo(() => tools.filter((t) => t.is_enabled).length, [tools]);

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
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

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-medium">MCP Servers</span>
            <Server className="w-4 h-4 text-[#0055fa]" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {servers.length}
          </div>
          <span className="text-[10px] text-slate-400">
            {totalConnected} ออนไลน์พร้อมใช้งาน
          </span>
        </div>

        <div className="bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-medium">Total Tools</span>
            <Wrench className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-white">
            {tools.length}
          </div>
          <span className="text-[10px] text-slate-400">
            ค้นพบจากเซิร์ฟเวอร์ทั้งหมด
          </span>
        </div>

        <div className="bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-medium">Active Tools</span>
            <Zap className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
            {totalEnabledTools}
          </div>
          <span className="text-[10px] text-slate-400">
            เปิดให้ AI เรียกใช้งานได้
          </span>
        </div>

        <div className="bg-white dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-medium">Transports</span>
            <Radio className="w-4 h-4 text-violet-500" />
          </div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
            SSE / Stdio / HTTP
          </div>
          <span className="text-[10px] text-slate-400">
            Standard MCP Host Protocol
          </span>
        </div>
      </div>

      {/* Sub Tabs: Servers vs Tools */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex gap-1 p-0.5 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 w-fit">
          <button
            onClick={() => setActiveSubTab("servers")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === "servers"
                ? "bg-white dark:bg-[#0055fa] text-[#0055fa] dark:text-white shadow-xs border border-slate-200/80 dark:border-[#0055fa]"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>MCP Servers ({servers.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab("tools")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeSubTab === "tools"
                ? "bg-white dark:bg-[#0055fa] text-[#0055fa] dark:text-white shadow-xs border border-slate-200/80 dark:border-[#0055fa]"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Tools Catalog ({tools.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeSubTab === "servers" && (
            <>
              <button
                onClick={handleSyncAll}
                disabled={syncingAll || isLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg transition-all shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? "animate-spin" : ""}`} />
                <span>Sync ทั้งหมด</span>
              </button>
              <button
                onClick={() => {
                  resetServerForm();
                  setModal({ type: "addServer" });
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-lg shadow-sm shadow-[#0055fa]/25 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่ม MCP Server</span>
              </button>
            </>
          )}

          {activeSubTab === "tools" && (
            <button
              onClick={() => fetchTools()}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>รีเฟรช Tools</span>
            </button>
          )}
        </div>
      </div>

      {/* ═══════════ SUB-TAB 1: MCP SERVERS ═══════════ */}
      {activeSubTab === "servers" && (
        <div className="space-y-3">
          <p className="text-[11px] text-slate-400">
            จัดการการเชื่อมต่อ Model Context Protocol (MCP) เพื่อดึง Functions & Tools ให้ LLM เรียกใช้งานแบบเรียลไทม์
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-5 h-5 text-[#0055fa] animate-spin" />
            </div>
          ) : servers.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-white/[0.02] rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-6">
              <Server className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                ยังไม่มีการเชื่อมต่อ MCP Server
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
                เชื่อมต่อเซิร์ฟเวอร์ MCP เพื่อเพิ่มความสามารถให้ AI เรียกใช้ระบบภายนอก เช่น ค้นหาไฟล์, รันคำสั่ง, Query Database, หรือสืบค้นข้อมูล
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => {
                    resetServerForm();
                    setModal({ type: "addServer" });
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-xl shadow-sm shadow-[#0055fa]/25 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  เพิ่ม MCP Server แรก
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {servers.map((server) => {
                const isSyncing = syncingServerId === server.id;
                const toolCount = Number(server.tool_count) || 0;
                const activeToolCount = Number(server.active_tool_count) || 0;

                return (
                  <div
                    key={server.id}
                    className={`group relative bg-white dark:bg-white/[0.03] border rounded-2xl p-4 transition-all hover:shadow-md ${
                      server.is_active
                        ? "border-slate-200 dark:border-white/10 hover:border-[#0055fa]/30 dark:hover:border-[#0055fa]/30"
                        : "border-slate-200/50 dark:border-white/5 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
                      {/* Left Server Details */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                            server.status === "connected"
                              ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                              : server.status === "error"
                              ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                              : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10"
                          }`}
                        >
                          {server.transport_type === "stdio" ? (
                            <Terminal className="w-5 h-5" />
                          ) : (
                            <Globe className="w-5 h-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm text-slate-900 dark:text-white">
                              {server.name}
                            </h3>

                            {/* Transport Type Badge */}
                            <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 uppercase">
                              {server.transport_type}
                            </span>

                            {/* Status Badge */}
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded-full border ${
                                server.status === "connected"
                                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                                  : server.status === "error"
                                  ? "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                                  : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  server.status === "connected"
                                    ? "bg-emerald-500 animate-pulse"
                                    : server.status === "error"
                                    ? "bg-rose-500"
                                    : "bg-slate-400"
                                }`}
                              />
                              <span>
                                {server.status === "connected"
                                  ? "เชื่อมต่อสำเร็จ"
                                  : server.status === "error"
                                  ? "เชื่อมต่อล้มเหลว"
                                  : "ยังไม่ได้ทดสอบ"}
                              </span>
                            </span>

                            {/* Active Toggle Badge */}
                            <button
                              onClick={() => handleToggleServerActive(server)}
                              title={server.is_active ? "คลิกเพื่อปิดใช้งาน" : "คลิกเพื่อเปิดใช้งาน"}
                              className={`px-1.5 py-0.2 text-[9px] font-semibold rounded border cursor-pointer transition-colors ${
                                server.is_active
                                  ? "bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400 border-blue-200 dark:border-blue-500/20"
                                  : "bg-slate-100 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10"
                              }`}
                            >
                              {server.is_active ? "Active" : "Disabled"}
                            </button>
                          </div>

                          {/* Endpoint / Command View */}
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
                            <span className="truncate max-w-sm sm:max-w-md">
                              {server.transport_type === "stdio"
                                ? `${server.command} ${
                                    Array.isArray(server.args)
                                      ? server.args.join(" ")
                                      : server.args || ""
                                  }`
                                : server.url}
                            </span>
                            <button
                              onClick={(e) =>
                                copyToClipboard(
                                  server.transport_type === "stdio"
                                    ? `${server.command} ${
                                        Array.isArray(server.args)
                                          ? server.args.join(" ")
                                          : server.args || ""
                                      }`
                                    : server.url,
                                  e
                                )
                              }
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                              title="คัดลอก Connection String"
                            >
                              {copiedText ===
                              (server.transport_type === "stdio"
                                ? `${server.command} ${
                                    Array.isArray(server.args)
                                      ? server.args.join(" ")
                                      : server.args || ""
                                  }`
                                : server.url) ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Error message display if any */}
                          {server.status === "error" && server.error_message && (
                            <div className="mt-1.5 text-[11px] text-rose-500 flex items-center gap-1 bg-rose-50/50 dark:bg-rose-500/10 px-2 py-0.5 rounded border border-rose-200/50 dark:border-rose-500/20">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              <span className="truncate">{server.error_message}</span>
                            </div>
                          )}

                          {/* Meta: Tools & Last sync */}
                          <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                            <button
                              onClick={() => {
                                setToolServerFilter(server.id);
                                setActiveSubTab("tools");
                              }}
                              className="hover:text-[#0055fa] dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1 font-medium"
                            >
                              <Wrench className="w-3 h-3 text-indigo-500" />
                              <span>
                                {activeToolCount} / {toolCount} Tools เปิดใช้งาน
                              </span>
                            </button>

                            {server.last_sync_at && (
                              <span>
                                ซิงค์ล่าสุด:{" "}
                                {new Date(server.last_sync_at).toLocaleTimeString("th-TH", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0 self-start sm:self-center">
                        <button
                          onClick={() => handleSyncServer(server)}
                          disabled={isSyncing}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg transition-all shadow-xs cursor-pointer"
                          title="ทดสอบการเชื่อมต่อและดึง Tools ล่าสุด"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 text-[#0055fa] ${
                              isSyncing ? "animate-spin" : ""
                            }`}
                          />
                          <span className="hidden sm:inline">
                            {isSyncing ? "กำลังซิงค์..." : "ทดสอบ & ซิงค์"}
                          </span>
                        </button>

                        <button
                          onClick={() => {
                            setToolServerFilter(server.id);
                            setActiveSubTab("tools");
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                          title="จัดการ Tools ของเซิร์ฟเวอร์นี้"
                        >
                          <Sliders className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            setServerForm({
                              name: server.name,
                              transport_type: server.transport_type,
                              url: server.url || "",
                              command: server.command || "",
                              args: Array.isArray(server.args)
                                ? server.args.join(" ")
                                : server.args || "",
                              env:
                                typeof server.env === "object"
                                  ? JSON.stringify(server.env, null, 2)
                                  : server.env || "{}",
                              headers:
                                typeof server.headers === "object"
                                  ? JSON.stringify(server.headers, null, 2)
                                  : server.headers || "{}",
                              is_active: server.is_active,
                              auto_sync: false,
                            });
                            setModal({ type: "editServer", server });
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                          title="แก้ไขการตั้งค่า"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setModal({ type: "deleteServer", server })}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                          title="ลบเซิร์ฟเวอร์"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ SUB-TAB 2: TOOLS CATALOG ═══════════ */}
      {activeSubTab === "tools" && (
        <div className="space-y-3.5">
          {/* Tool Filters & Bulk Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-1 flex-wrap sm:flex-nowrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="ค้นหา Tools ตามชื่อ หรือคำอธิบาย..."
                  value={toolSearch}
                  onChange={(e) => setToolSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#0055fa] text-slate-800 dark:text-slate-200"
                />
              </div>

              {/* Server Filter Dropdown */}
              <select
                value={toolServerFilter}
                onChange={(e) =>
                  setToolServerFilter(e.target.value === "all" ? "all" : Number(e.target.value))
                }
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="all">เซิร์ฟเวอร์ทั้งหมด ({servers.length})</option>
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={toolStatusFilter}
                onChange={(e) => setToolStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-hidden cursor-pointer"
              >
                <option value="all">สถานะทั้งหมด</option>
                <option value="enabled">เปิดใช้งานอยู่ (Enabled)</option>
                <option value="disabled">ปิดใช้งาน (Disabled)</option>
              </select>
            </div>

            {/* Bulk Toggle for Filtered Server */}
            {typeof toolServerFilter === "number" && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleBulkToggleServerTools(toolServerFilter, true)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-500/20 rounded-lg transition-colors cursor-pointer"
                >
                  เปิดทั้งหมด
                </button>
                <button
                  onClick={() => handleBulkToggleServerTools(toolServerFilter, false)}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 border border-slate-200 dark:border-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  ปิดทั้งหมด
                </button>
              </div>
            )}
          </div>

          {/* Tools Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-5 h-5 text-[#0055fa] animate-spin" />
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="text-center py-12 bg-white dark:bg-white/[0.02] rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-6">
              <Wrench className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                ไม่พบ Tools ที่ตรงตามเงื่อนไข
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
                ตรวจสอบว่าได้เพิ่ม MCP Server และทำการ Sync Tools แล้ว
              </p>
            </div>
          ) : (
            <div className="grid gap-2.5">
              {filteredTools.map((tool) => {
                const schema =
                  typeof tool.input_schema === "string"
                    ? JSON.parse(tool.input_schema || "{}")
                    : tool.input_schema || {};

                const propKeys = schema.properties ? Object.keys(schema.properties) : [];
                const isExpanded = expandedToolId === tool.id;

                return (
                  <div
                    key={tool.id}
                    className={`bg-white dark:bg-white/[0.03] border rounded-xl p-3.5 transition-all ${
                      tool.is_enabled
                        ? "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                        : "border-slate-200/50 dark:border-white/5 opacity-65"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Tool Icon */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                            tool.is_enabled
                              ? "bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400 border-blue-200/80 dark:border-blue-500/20"
                              : "bg-slate-100 dark:bg-white/5 text-slate-400 border-slate-200 dark:border-white/10"
                          }`}
                        >
                          <Code className="w-4 h-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white font-mono">
                              {tool.name}
                            </h4>

                            {/* Server Tag */}
                            <span className="px-1.5 py-0.2 text-[9px] font-medium rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                              {tool.server_name}
                            </span>

                            {/* Parameters count badge */}
                            <span className="px-1.5 py-0.2 text-[9px] font-medium rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
                              {propKeys.length} Params
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {tool.description || "ไม่มีคำอธิบายสำหรับ Tool นี้"}
                          </p>

                          {/* Quick Parameter Badges */}
                          {propKeys.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              {propKeys.slice(0, 5).map((param) => {
                                const isRequired =
                                  Array.isArray(schema.required) &&
                                  schema.required.includes(param);
                                return (
                                  <span
                                    key={param}
                                    className={`px-1.5 py-0.5 text-[9px] font-mono rounded border ${
                                      isRequired
                                        ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 font-semibold"
                                        : "bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10"
                                    }`}
                                  >
                                    {param}
                                    {isRequired ? "*" : ""}
                                  </span>
                                );
                              })}
                              {propKeys.length > 5 && (
                                <span className="text-[9px] text-slate-400">
                                  +{propKeys.length - 5} เพิ่มเติม
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Action: Toggle Switch & Test Button */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleOpenTestTool(tool)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg transition-all shadow-xs cursor-pointer"
                          title="ทดสอบเรียกใช้ Tool"
                        >
                          <Play className="w-3 h-3 text-[#0055fa] fill-[#0055fa]" />
                          <span className="hidden sm:inline">ทดสอบ</span>
                        </button>

                        <button
                          onClick={() =>
                            setExpandedToolId(isExpanded ? null : tool.id)
                          }
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
                          title="ดู Schema อย่างละเอียด"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>

                        <button
                          onClick={() => handleToggleTool(tool)}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                            tool.is_enabled ? "bg-[#0055fa]" : "bg-slate-300 dark:bg-slate-700"
                          }`}
                          role="switch"
                          aria-checked={tool.is_enabled}
                          title={tool.is_enabled ? "ปิดการใช้งาน Tool" : "เปิดการใช้งาน Tool"}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              tool.is_enabled ? "translate-x-5" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Expandable JSON Schema details */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-white/10 text-xs animate-in fade-in duration-150">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                            Input Schema (JSON Schema):
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(JSON.stringify(schema, null, 2))
                            }
                            className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                            คัดลอก Schema
                          </button>
                        </div>
                        <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed max-h-56">
                          {JSON.stringify(schema, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ MODAL: ADD / EDIT SERVER ═══════════ */}
      {(modal?.type === "addServer" || modal?.type === "editServer") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-xl bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400 flex items-center justify-center">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                    {modal.type === "addServer" ? "เพิ่ม MCP Server ใหม่" : "แก้ไขการตั้งค่า MCP Server"}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    กำหนด Transport Protocol และ Parameter ในการเชื่อมต่อ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form
              onSubmit={modal.type === "addServer" ? handleCreateServer : handleUpdateServer}
              className="flex-1 overflow-y-auto p-5 space-y-4 text-xs"
            >
              {/* Presets Selector (Add Server mode only) */}
              {modal.type === "addServer" && (
                <div>
                  <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                    เทมเพลตเริ่มต้น (Presets)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {SERVER_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handlePresetSelect(preset)}
                        className="text-left p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#0055fa] dark:hover:border-[#0055fa] bg-slate-50/50 dark:bg-white/[0.02] hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all cursor-pointer group"
                      >
                        <div className="font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#0055fa] flex items-center justify-between">
                          <span>{preset.name}</span>
                          <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                            {preset.transport_type}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {preset.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  ชื่อ MCP Server *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น Filesystem MCP หรือ Internal Tools Server"
                  value={serverForm.name}
                  onChange={(e) => setServerForm({ ...serverForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#0055fa] text-slate-900 dark:text-white"
                />
              </div>

              {/* Transport Type */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  รูปแบบ Transport Protocol *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setServerForm({ ...serverForm, transport_type: "streamable_http" })}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      serverForm.transport_type === "streamable_http"
                        ? "border-[#0055fa] bg-blue-50/50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400 font-semibold"
                        : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Streamable HTTP</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      POST /mcp (Docker, Express)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setServerForm({ ...serverForm, transport_type: "sse" })}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      serverForm.transport_type === "sse"
                        ? "border-[#0055fa] bg-blue-50/50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400 font-semibold"
                        : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      <span>SSE Remote</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      Server-Sent Events (/sse)
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setServerForm({ ...serverForm, transport_type: "stdio" })}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                      serverForm.transport_type === "stdio"
                        ? "border-[#0055fa] bg-blue-50/50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400 font-semibold"
                        : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Local Stdio</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                      CLI Process (Stdin/Stdout)
                    </p>
                  </button>
                </div>
              </div>

              {/* Conditional: SSE or Streamable HTTP URL */}
              {(serverForm.transport_type === "sse" || serverForm.transport_type === "streamable_http") && (
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Server URL ({serverForm.transport_type === "streamable_http" ? "POST Endpoint" : "SSE Endpoint"}) *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder={
                      serverForm.transport_type === "streamable_http"
                        ? "http://localhost:8000/mcp หรือ http://127.0.0.1:8000/mcp"
                        : "http://localhost:8000/sse หรือ https://your-domain.com/sse"
                    }
                    value={serverForm.url}
                    onChange={(e) => setServerForm({ ...serverForm, url: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#0055fa] text-slate-900 dark:text-white font-mono"
                  />
                </div>
              )}

              {/* Conditional: Stdio Command & Args */}
              {serverForm.transport_type === "stdio" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Command *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น npx, node, python, uvx"
                      value={serverForm.command}
                      onChange={(e) => setServerForm({ ...serverForm, command: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#0055fa] text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Arguments (คั่นด้วยวรรค หรือ JSON Array)
                    </label>
                    <input
                      type="text"
                      placeholder="-y @modelcontextprotocol/server-filesystem C:\Path"
                      value={serverForm.args}
                      onChange={(e) => setServerForm({ ...serverForm, args: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#0055fa] text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Environment Variables (Optional) */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Environment Variables (JSON)
                </label>
                <textarea
                  rows={2}
                  placeholder='{"API_KEY": "secret_value"}'
                  value={serverForm.env}
                  onChange={(e) => setServerForm({ ...serverForm, env: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#0055fa] text-slate-900 dark:text-white font-mono text-[11px]"
                />
              </div>

              {/* Custom HTTP Headers (Optional, e.g. Authorization) */}
              {(serverForm.transport_type === "sse" || serverForm.transport_type === "streamable_http") && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                      Custom HTTP Headers (JSON)
                    </label>
                    <span className="text-[10px] text-slate-400">
                      เช่น Authorization Bearer token หรือ API Key
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    placeholder='{"Authorization": "Bearer your_token_here", "X-API-Key": "secret"}'
                    value={serverForm.headers}
                    onChange={(e) => setServerForm({ ...serverForm, headers: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#0055fa] text-slate-900 dark:text-white font-mono text-[11px]"
                  />
                </div>
              )}

              {/* Checkboxes */}
              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={serverForm.is_active}
                    onChange={(e) =>
                      setServerForm({ ...serverForm, is_active: e.target.checked })
                    }
                    className="rounded border-slate-300 text-[#0055fa] focus:ring-[#0055fa]"
                  />
                  <span>เปิดใช้งานเซิร์ฟเวอร์นี้ (Active)</span>
                </label>

                {modal.type === "addServer" && (
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-medium">
                    <input
                      type="checkbox"
                      checked={serverForm.auto_sync}
                      onChange={(e) =>
                        setServerForm({ ...serverForm, auto_sync: e.target.checked })
                      }
                      className="rounded border-slate-300 text-[#0055fa] focus:ring-[#0055fa]"
                    />
                    <span>ทดสอบและค้นหา Tools ทันที</span>
                  </label>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-xl shadow-sm shadow-[#0055fa]/25 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{modal.type === "addServer" ? "บันทึกและเชื่อมต่อ" : "บันทึกการแก้ไข"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════ MODAL: DELETE SERVER ═══════════ */}
      {modal?.type === "deleteServer" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  ยืนยันการลบ MCP Server
                </h3>
                <p className="text-xs text-slate-400">
                  การกระทำนี้ไม่สามารถย้อนกลับได้
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              คุณต้องการลบเซิร์ฟเวอร์{" "}
              <strong className="text-slate-900 dark:text-white">
                {modal.server.name}
              </strong>{" "}
              หรือไม่? ข้อมูล Tools ทั้งหมดที่เกี่ยวข้องจะถูกนำออกจากระบบ
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteServer}
                disabled={submitting}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>ลบเซิร์ฟเวอร์</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ MODAL: TEST RUN TOOL ═══════════ */}
      {modal?.type === "testTool" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-white/10 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400 flex items-center justify-center">
                  <Play className="w-4 h-4 fill-[#0055fa]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white font-mono">
                      {modal.tool.name}
                    </h3>
                    <span className="px-1.5 py-0.2 text-[9px] rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
                      {modal.tool.server_name}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    ทดสอบเรียกใช้ Function Tool พร้อมส่งอาร์กิวเมนต์แบบสด
                  </p>
                </div>
              </div>

              <button
                onClick={() => setModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Tool Description */}
              {modal.tool.description && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300">
                  <span className="font-semibold text-slate-800 dark:text-white mr-1.5">
                    คำอธิบาย:
                  </span>
                  {modal.tool.description}
                </div>
              )}

              {/* Arguments Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Arguments (JSON Object)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    ระบุค่าตาม Parameters ของ Schema
                  </span>
                </div>
                <textarea
                  rows={6}
                  value={testToolArgs}
                  onChange={(e) => setTestToolArgs(e.target.value)}
                  className="w-full p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl focus:outline-hidden focus:ring-1 focus:ring-[#0055fa] border border-slate-700 leading-relaxed"
                />
              </div>

              {/* Execution Result */}
              {testToolResult && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <span>ผลลัพธ์การรัน (Execution Result):</span>
                      {testToolResult.is_error ? (
                        <span className="text-[10px] text-rose-500 font-medium">
                          (Error)
                        </span>
                      ) : (
                        <span className="text-[10px] text-emerald-500 font-medium">
                          (สำเร็จ: {testToolResult.execution_time_ms}ms)
                        </span>
                      )}
                    </span>
                  </div>

                  <pre
                    className={`p-3 rounded-xl font-mono text-[11px] leading-relaxed max-h-56 overflow-auto border ${
                      testToolResult.is_error
                        ? "bg-rose-950/30 text-rose-300 border-rose-800/40"
                        : "bg-slate-900 text-slate-200 border-slate-800"
                    }`}
                  >
                    {testToolResult.output ||
                      testToolResult.error ||
                      JSON.stringify(testToolResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-white/10 shrink-0 bg-slate-50 dark:bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
              <button
                type="button"
                onClick={handleRunToolTest}
                disabled={testToolRunning}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-xl shadow-sm shadow-[#0055fa]/25 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {testToolRunning ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>กำลังประมวลผล...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>รันคำสั่งทดสอบ</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
