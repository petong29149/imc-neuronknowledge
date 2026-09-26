"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bot,
  Plus,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Edit2,
  Trash2,
  X,
  Check,
  Sparkles,
  Wrench,
  UsersRound,
  Star,
  Search,
  Globe,
  MessageSquare,
} from "lucide-react";
import Modal from "@/components/common/Modal";
import { AGENT_PROMPT_MAX, AGENT_SLUG_PATTERN } from "@/lib/agent-validation";

interface AgentItem {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  system_prompt: string;
  default_model_id: number | null;
  default_model_name: string | null;
  is_active: boolean;
  is_default: boolean;
  skill_ids: number[];
  tool_ids: number[];
  group_ids: number[];
  chat_count: number;
}

interface SkillOption {
  id: number;
  slug: string;
  name: string;
  is_active: boolean;
}

interface ToolOption {
  id: number;
  name: string;
  description: string;
  server_id: number;
  server_name: string;
  is_enabled: boolean;
  server_active: boolean;
}

interface GroupOption {
  id: number;
  name: string;
  is_active: boolean;
  member_count: number;
}

interface ModelOption {
  id: number;
  display_name: string;
  connection_name: string;
}

interface AgentForm {
  slug: string;
  name: string;
  description: string;
  icon: string;
  system_prompt: string;
  default_model_id: number | null;
  is_active: boolean;
  is_default: boolean;
  skill_ids: number[];
  tool_ids: number[];
  group_ids: number[];
}

type ModalState =
  | null
  | { type: "create" }
  | { type: "edit"; agent: AgentItem }
  | { type: "delete"; agent: AgentItem };

const EMPTY_FORM: AgentForm = {
  slug: "",
  name: "",
  description: "",
  icon: "🤖",
  system_prompt: "",
  default_model_id: null,
  is_active: true,
  is_default: false,
  skill_ids: [],
  tool_ids: [],
  group_ids: [],
};

const INPUT =
  "w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0055fa]";
const LABEL = "block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1";

const toggleId = (ids: number[], id: number) =>
  ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];

export default function AdminAgentsSection() {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [skills, setSkills] = useState<SkillOption[]>([]);
  const [tools, setTools] = useState<ToolOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [form, setForm] = useState<AgentForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/agents");
      const data = await res.json();
      if (res.ok) {
        setAgents(data.agents || []);
      } else {
        showToast(data.error || "เกิดข้อผิดพลาดในการโหลดข้อมูล Agents", "error");
      }
    } catch {
      showToast("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
    }
  }, []);

  // Options for the binding pickers; each degrades to empty on failure
  const fetchOptions = useCallback(async () => {
    const load = async (url: string, key: string) => {
      try {
        const res = await fetch(url);
        return res.ok ? (await res.json())[key] || [] : [];
      } catch {
        return [];
      }
    };
    const [s, t, g, m] = await Promise.all([
      load("/api/admin/skills", "skills"),
      load("/api/admin/mcp-tools", "tools"),
      load("/api/admin/groups", "groups"),
      load("/api/chat/models", "models"),
    ]);
    setSkills(s);
    setTools(t);
    setGroups(g);
    setModels(m);
  }, []);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([fetchAgents(), fetchOptions()]);
    setIsLoading(false);
  }, [fetchAgents, fetchOptions]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const skillById = useMemo(() => new Map(skills.map((s) => [s.id, s])), [skills]);
  const toolById = useMemo(() => new Map(tools.map((t) => [t.id, t])), [tools]);
  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setModal({ type: "create" });
  };

  const openEdit = (agent: AgentItem) => {
    setForm({
      slug: agent.slug,
      name: agent.name,
      description: agent.description,
      icon: agent.icon,
      system_prompt: agent.system_prompt,
      default_model_id: agent.default_model_id,
      is_active: agent.is_active,
      is_default: agent.is_default,
      skill_ids: agent.skill_ids,
      tool_ids: agent.tool_ids,
      group_ids: agent.group_ids,
    });
    setModal({ type: "edit", agent });
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal || (modal.type !== "create" && modal.type !== "edit")) return;

    setSubmitting(true);
    try {
      const isEdit = modal.type === "edit";
      const res = await fetch(isEdit ? `/api/admin/agents/${modal.agent.id}` : "/api/admin/agents", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "บันทึก agent เรียบร้อยแล้ว");
        setModal(null);
        fetchAgents();
      } else {
        showToast(data.error || "ไม่สามารถบันทึก agent ได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการเชื่อมต่อ", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const updateAgent = async (agent: AgentItem, patch: Partial<AgentForm>, success: string) => {
    try {
      const res = await fetch(`/api/admin/agents/${agent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(success);
        fetchAgents();
      } else {
        showToast(data.error || "ไม่สามารถอัปเดต agent ได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาด", "error");
    }
  };

  const handleDelete = async () => {
    if (!modal || modal.type !== "delete") return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/agents/${modal.agent.id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || "ลบ agent เรียบร้อยแล้ว");
        setModal(null);
        fetchAgents();
      } else {
        showToast(data.error || "ไม่สามารถลบ agent ได้", "error");
      }
    } catch {
      showToast("เกิดข้อผิดพลาดในการลบ", "error");
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
            AI Agents ทั้งหมด
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Agent แต่ละตัวใช้ได้เฉพาะ Skills และ MCP Tools ที่ผูกไว้ ส่วน Built-in Tools ใช้ได้ทุกตัว
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchAll}
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
            <span>สร้าง Agent ใหม่</span>
          </button>
        </div>
      </div>

      {/* Agent Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-5 h-5 text-[#0055fa] animate-spin" />
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-white/[0.02] rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-6">
          <Bot className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white">ยังไม่มี AI Agent</h3>
          <p className="text-xs text-slate-400 mt-1">สร้าง agent แรกเพื่อให้ผู้ใช้เริ่มแชทได้</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {agents.map((agent) => {
            const agentSkills = agent.skill_ids.map((id) => skillById.get(id)).filter(Boolean) as SkillOption[];
            const agentTools = agent.tool_ids.map((id) => toolById.get(id)).filter(Boolean) as ToolOption[];
            const agentGroups = agent.group_ids.map((id) => groupById.get(id)).filter(Boolean) as GroupOption[];

            return (
              <div
                key={agent.id}
                className={`bg-white dark:bg-[#0c1222] border rounded-2xl p-4 shadow-xs space-y-3 transition-all ${
                  agent.is_active
                    ? "border-slate-200/80 dark:border-white/10"
                    : "border-slate-200/50 dark:border-white/5 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center text-xl shrink-0">
                      {agent.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {agent.name}
                        </h3>
                        {agent.is_default && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400">
                            <Star className="w-2.5 h-2.5 fill-current" />
                            ค่าเริ่มต้น
                          </span>
                        )}
                      </div>
                      <code className="text-[10px] text-slate-400 font-mono">{agent.slug}</code>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {agent.description || "ไม่มีคำอธิบาย"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() =>
                        updateAgent(
                          agent,
                          { is_active: !agent.is_active },
                          `${!agent.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"} ${agent.name} แล้ว`
                        )
                      }
                      title="คลิกเพื่อสลับสถานะ"
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all cursor-pointer ${
                        agent.is_active
                          ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                          : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          agent.is_active ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      {agent.is_active ? "เปิดใช้" : "ปิดใช้"}
                    </button>
                    {!agent.is_default && (
                      <button
                        onClick={() =>
                          updateAgent(agent, { is_default: true }, `ตั้ง ${agent.name} เป็นค่าเริ่มต้นแล้ว`)
                        }
                        title="ตั้งเป็น agent เริ่มต้น"
                        className="p-1 rounded-md text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(agent)}
                      title="แก้ไข agent"
                      className="p-1 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {!agent.is_default && (
                      <button
                        onClick={() => setModal({ type: "delete", agent })}
                        title="ลบ agent"
                        className="p-1 rounded-md text-slate-600 dark:text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5 text-[11px]">
                  <ChipRow icon={Sparkles} label="Skills" empty="ไม่มี skill">
                    {agentSkills.map((s) => (
                      <Chip key={s.id} muted={!s.is_active}>
                        {s.name}
                      </Chip>
                    ))}
                  </ChipRow>
                  <ChipRow icon={Wrench} label="MCP Tools" empty="ใช้ได้เฉพาะ Built-in Tools">
                    {agentTools.map((t) => (
                      <Chip key={t.id} muted={!t.is_enabled || !t.server_active} mono>
                        {t.name}
                      </Chip>
                    ))}
                  </ChipRow>
                  <ChipRow icon={UsersRound} label="กลุ่ม" empty="">
                    {agentGroups.length === 0 ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <Globe className="w-3 h-3" />
                        ทุกคนใช้ได้
                      </span>
                    ) : (
                      agentGroups.map((g) => (
                        <Chip key={g.id} muted={!g.is_active}>
                          {g.name}
                        </Chip>
                      ))
                    )}
                  </ChipRow>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-400">
                  <span>Model: {agent.default_model_name || "ตามที่ผู้ใช้เลือก"}</span>
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {agent.chat_count} แชท
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {modal && (modal.type === "create" || modal.type === "edit") && (
        <AgentFormModal
          mode={modal.type}
          form={form}
          setForm={setForm}
          skills={skills}
          tools={tools}
          groups={groups}
          models={models}
          onClose={() => setModal(null)}
          onSubmit={handleSubmitForm}
          isSubmitting={submitting}
        />
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
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">ยืนยันการลบ Agent?</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              คุณกำลังจะลบ{" "}
              <strong className="text-slate-800 dark:text-slate-200">{modal.agent.name}</strong>{" "}
              {modal.agent.chat_count > 0
                ? `แชท ${modal.agent.chat_count} รายการที่ใช้ agent นี้จะเปลี่ยนไปใช้ agent เริ่มต้นแทน (ประวัติแชทยังอยู่)`
                : "การกระทำนี้ไม่สามารถย้อนกลับได้"}
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
              {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>ลบ Agent</span>}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ChipRow({
  icon: Icon,
  label,
  empty,
  children,
}: {
  icon: typeof Bot;
  label: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = React.Children.count(children) > 0;
  return (
    <div className="flex items-start gap-2">
      <span className="inline-flex items-center gap-1 w-20 shrink-0 text-slate-400 font-medium pt-0.5">
        <Icon className="w-3 h-3" />
        {label}
      </span>
      <div className="flex flex-wrap gap-1 min-w-0">
        {hasChildren ? children : <span className="text-slate-400 italic pt-0.5">{empty}</span>}
      </div>
    </div>
  );
}

function Chip({ children, muted, mono }: { children: React.ReactNode; muted?: boolean; mono?: boolean }) {
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[10px] font-medium max-w-[180px] truncate ${
        mono ? "font-mono" : ""
      } ${
        muted
          ? "bg-slate-100 dark:bg-white/5 text-slate-400 line-through"
          : "bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-300"
      }`}
    >
      {children}
    </span>
  );
}

/** Checkbox list with a search box, used for skills and groups. */
function CheckList<T extends { id: number }>({
  items,
  selected,
  onToggle,
  render,
  searchText,
  emptyHint,
}: {
  items: T[];
  selected: number[];
  onToggle: (id: number) => void;
  render: (item: T) => React.ReactNode;
  searchText: (item: T) => string;
  emptyHint: string;
}) {
  const [term, setTerm] = useState("");
  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return needle ? items.filter((i) => searchText(i).toLowerCase().includes(needle)) : items;
  }, [items, term, searchText]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
      {items.length > 6 && (
        <div className="relative border-b border-slate-200 dark:border-white/10">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="ค้นหา..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>
      )}
      <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
        {visible.length === 0 ? (
          <p className="py-5 text-center text-[11px] text-slate-400">{emptyHint}</p>
        ) : (
          visible.map((item) => {
            const checked = selected.includes(item.id);
            return (
              <label
                key={item.id}
                className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                  checked ? "bg-blue-50/70 dark:bg-blue-500/10" : "hover:bg-slate-50 dark:hover:bg-white/5"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(item.id)}
                  className="w-3.5 h-3.5 accent-[#0055fa] cursor-pointer"
                />
                <div className="min-w-0 flex-1 text-xs">{render(item)}</div>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}

function AgentFormModal({
  mode,
  form,
  setForm,
  skills,
  tools,
  groups,
  models,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  mode: "create" | "edit";
  form: AgentForm;
  setForm: React.Dispatch<React.SetStateAction<AgentForm>>;
  skills: SkillOption[];
  tools: ToolOption[];
  groups: GroupOption[];
  models: ModelOption[];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
}) {
  const isEdit = mode === "edit";
  const slugInvalid = form.slug.length > 0 && !AGENT_SLUG_PATTERN.test(form.slug);

  // MCP tools grouped by server, for per-server "select all"
  const toolsByServer = useMemo(() => {
    const map = new Map<number, { name: string; tools: ToolOption[] }>();
    for (const t of tools) {
      if (!map.has(t.server_id)) map.set(t.server_id, { name: t.server_name, tools: [] });
      map.get(t.server_id)!.tools.push(t);
    }
    return [...map.entries()];
  }, [tools]);

  const toggleServer = (serverTools: ToolOption[]) => {
    const ids = serverTools.map((t) => t.id);
    const allSelected = ids.every((id) => form.tool_ids.includes(id));
    setForm((prev) => ({
      ...prev,
      tool_ids: allSelected
        ? prev.tool_ids.filter((id) => !ids.includes(id))
        : [...new Set([...prev.tool_ids, ...ids])],
    }));
  };

  return (
    <Modal
      onClose={onClose}
      containerClassName="p-3 sm:p-4"
      panelClassName="w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl"
    >
      <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl ${
              isEdit
                ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                : "bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400"
            }`}
          >
            {isEdit ? <Edit2 className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {isEdit ? "แก้ไข AI Agent" : "สร้าง AI Agent ใหม่"}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
          <div className="grid grid-cols-[4.5rem_1fr_1fr] gap-3">
            <div>
              <label className={LABEL}>ไอคอน</label>
              <input
                type="text"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                className={`${INPUT} text-center text-lg`}
              />
            </div>
            <div>
              <label className={LABEL}>ชื่อ Agent *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="ผู้ช่วยฝ่ายขาย"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Slug *</label>
              <input
                type="text"
                required
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                placeholder="sales-assistant"
                className={`${INPUT} font-mono ${slugInvalid ? "ring-2 ring-rose-500" : ""}`}
              />
            </div>
          </div>

          <div>
            <label className={LABEL}>คำอธิบาย (ผู้ใช้เห็นตอนเลือก agent)</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="ช่วยตอบคำถามเรื่องสินค้าและร่างใบเสนอราคา"
              className={INPUT}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={LABEL}>System Prompt ของ Agent</label>
              <span className="text-[10px] text-slate-400">
                {form.system_prompt.length.toLocaleString()}/{AGENT_PROMPT_MAX.toLocaleString()}
              </span>
            </div>
            <textarea
              rows={6}
              maxLength={AGENT_PROMPT_MAX}
              value={form.system_prompt}
              onChange={(e) => setForm({ ...form, system_prompt: e.target.value })}
              placeholder="บทบาท ขอบเขตงาน และสไตล์การตอบของ agent นี้"
              className={`${INPUT} font-mono text-xs leading-relaxed`}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              ต่อท้ายจาก Global Persona และอยู่ภายใต้หลักการทำงานหลักของระบบเสมอ
            </p>
          </div>

          <div>
            <label className={LABEL}>Model เริ่มต้น</label>
            <select
              value={form.default_model_id ?? ""}
              onChange={(e) =>
                setForm({ ...form, default_model_id: e.target.value ? Number(e.target.value) : null })
              }
              className={INPUT}
            >
              <option value="">ตามที่ผู้ใช้เลือก</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.display_name} ({m.connection_name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={LABEL}>Skills</label>
                <span className="text-[10px] text-slate-400">เลือกแล้ว {form.skill_ids.length}</span>
              </div>
              <CheckList
                items={skills}
                selected={form.skill_ids}
                onToggle={(id) => setForm((p) => ({ ...p, skill_ids: toggleId(p.skill_ids, id) }))}
                searchText={(s) => `${s.name} ${s.slug}`}
                emptyHint="ยังไม่มี skill"
                render={(s) => (
                  <>
                    <div className={`font-semibold truncate ${s.is_active ? "text-slate-900 dark:text-white" : "text-slate-400 line-through"}`}>
                      {s.name}
                    </div>
                    <code className="text-[10px] text-slate-400">{s.slug}</code>
                  </>
                )}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className={LABEL}>กลุ่มที่ใช้ได้</label>
                <span className="text-[10px] text-slate-400">
                  {form.group_ids.length === 0 ? "ไม่เลือก = ทุกคนใช้ได้" : `${form.group_ids.length} กลุ่ม`}
                </span>
              </div>
              <CheckList
                items={groups}
                selected={form.group_ids}
                onToggle={(id) => setForm((p) => ({ ...p, group_ids: toggleId(p.group_ids, id) }))}
                searchText={(g) => g.name}
                emptyHint="ยังไม่มีกลุ่มผู้ใช้งาน"
                render={(g) => (
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-semibold truncate ${g.is_active ? "text-slate-900 dark:text-white" : "text-slate-400 line-through"}`}>
                      {g.name}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">{g.member_count} คน</span>
                  </div>
                )}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={LABEL}>MCP Tools</label>
              <span className="text-[10px] text-slate-400">
                เลือกแล้ว {form.tool_ids.length} · Built-in Tools ใช้ได้เสมอ
              </span>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-white/10 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
              {toolsByServer.length === 0 ? (
                <p className="py-5 text-center text-[11px] text-slate-400">ยังไม่มี MCP Tools</p>
              ) : (
                toolsByServer.map(([serverId, server]) => {
                  const allSelected = server.tools.every((t) => form.tool_ids.includes(t.id));
                  return (
                    <div key={serverId}>
                      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-white/5">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                          {server.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleServer(server.tools)}
                          className="text-[10px] font-semibold text-[#0055fa] dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          {allSelected ? "ยกเลิกทั้ง server" : "เลือกทั้ง server"}
                        </button>
                      </div>
                      {server.tools.map((t) => {
                        const checked = form.tool_ids.includes(t.id);
                        const unavailable = !t.is_enabled || !t.server_active;
                        return (
                          <label
                            key={t.id}
                            className={`flex items-start gap-2.5 px-3 py-2 cursor-pointer transition-colors ${
                              checked ? "bg-blue-50/70 dark:bg-blue-500/10" : "hover:bg-slate-50 dark:hover:bg-white/5"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setForm((p) => ({ ...p, tool_ids: toggleId(p.tool_ids, t.id) }))
                              }
                              className="w-3.5 h-3.5 mt-0.5 accent-[#0055fa] cursor-pointer"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-semibold font-mono truncate ${unavailable ? "text-slate-400" : "text-slate-900 dark:text-white"}`}>
                                  {t.name}
                                </span>
                                {unavailable && (
                                  <span className="text-[9px] text-amber-600 dark:text-amber-400 shrink-0">
                                    (ปิดอยู่)
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 line-clamp-1">{t.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center gap-5 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 accent-[#0055fa] cursor-pointer"
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">เปิดใช้งาน</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_default}
                // The current default can only change by making another agent default
                disabled={isEdit && form.is_default}
                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                className="w-4 h-4 accent-amber-500 cursor-pointer disabled:cursor-not-allowed"
              />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                ตั้งเป็น agent เริ่มต้น
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100 dark:border-white/5 shrink-0">
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
            {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            <span>{isEdit ? "บันทึกการแก้ไข" : "สร้าง Agent"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
