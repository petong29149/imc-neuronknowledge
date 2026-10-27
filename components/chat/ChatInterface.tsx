"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SettingsModal, { PatchNotesModal, seenVersionKey } from "@/components/chat/SettingsModal";
import UserGuideModal, { guideSeenKey } from "@/components/chat/UserGuideModal";
import CitationModal, { CitationProvider, CitationMarks } from "@/components/chat/CitationModal";
import {
  hasCitationTags,
  splitCitationTags,
  stripCitationTags,
  type CitationSource,
} from "@/lib/citations";
import Link from "next/link";
import {
  Send,
  Plus,
  MessageSquare,
  Trash2,
  ChevronDown,
  ChevronRight,
  Bot,
  User as UserIcon,
  Brain,
  Sparkles,
  RefreshCw,
  PanelLeftClose,
  PanelLeft,
  BookOpen,
  LogOut,
  Settings,
  Search,
  ShieldCheck,
  Pencil,
  Check,
  X,
  Copy,
  MoreHorizontal,
  Code,
  CheckCircle2,
  AlertCircle,
  Clock,
  Terminal,
  LoaderCircle,
  ArrowDown,
  Square,
} from "lucide-react";

// ────────────── Types ──────────────

export interface ChatModel {
  id: number;
  model_id: string;
  display_name: string;
  description: string;
  context_length: number;
  max_tokens: number;
  is_default: boolean;
  connection_name: string;
  connection_provider: string;
  /** false = no tools/skills are sent to this model */
  supports_tools?: boolean;
}

export interface ChatAgent {
  id: number;
  slug: string;
  name: string;
  description: string;
  icon: string;
  default_model_id: number | null;
  is_default: boolean;
  skill_count: number;
  tool_count: number;
}

export interface Conversation {
  id: number;
  session_id?: string;
  title: string;
  model_id: number | null;
  model_name: string | null;
  model_id_str: string | null;
  effort_level?: "low" | "medium" | "high";
  tools_enabled?: boolean;
  user_message_count: number | string;
  created_at: string;
  updated_at: string;
  is_processing?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  model_id?: number | null;
  model_name?: string | null;
  tool_calls?: any[] | null;
  tool_call_id?: string | null;
  name?: string | null;
  finish_reason?: string | null;
  effort_level?: "low" | "medium" | "high" | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  total_tokens?: number | null;
  reasoning_content?: string | null;
  /** Numbered sources of an MCP tool result (tool messages only) */
  sources?: CitationSource[] | null;
  created_at: string;
}

export interface AgentToolCallItem {
  id: string;
  name: string;
  args: any;
  result?: string;
  /** What the answer can cite from this result, as [cite:N] */
  sources?: CitationSource[];
  status: "running" | "done" | "error";
  step?: number;
}

export interface AgentStepItem {
  step: number;
  reasoning?: string;
  tools: AgentToolCallItem[];
  status: "running" | "done";
}

export interface UnifiedAssistantTurn {
  id: string;
  role: "assistant";
  model_name?: string | null;
  created_at: string;
  steps: AgentStepItem[];
  finalContent: string;
  finalReasoning?: string | null;
  isStreaming?: boolean;
  currentLoop?: number;
  maxSteps?: number;
  statusMessage?: string;
  /** The user stopped this answer before it finished */
  stopped?: boolean;
}

export interface UserTurn {
  id: string;
  role: "user";
  content: string;
  created_at: string;
}

export type ConversationTurn = UserTurn | UnifiedAssistantTurn;

export type EffortLevel = "low" | "medium" | "high";

export const EFFORT_OPTIONS: { id: EffortLevel; label: string; icon: string; desc: string }[] = [
  { id: "low", label: "Low", icon: "⚡", desc: "รวดเร็ว กระชับ ใช้ Tool เท่าที่จำเป็น (5 steps)" },
  { id: "medium", label: "Medium", icon: "⚖️", desc: "สมดุล คิดเป็นขั้นเป็นตอน (10 steps)" },
  { id: "high", label: "High", icon: "🧠", desc: "คิดวิเคราะห์เชิงลึก สืบคืนรอบคอบ (20 steps)" },
];

// ────────────── Turn Grouping Helper ──────────────

export function groupMessagesIntoTurns(messages: ChatMessage[]): ConversationTurn[] {
  const turns: ConversationTurn[] = [];
  let currentAssistantTurn: UnifiedAssistantTurn | null = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (msg.role === "user") {
      if (currentAssistantTurn) {
        turns.push(currentAssistantTurn);
        currentAssistantTurn = null;
      }
      turns.push({
        id: msg.id,
        role: "user",
        content: msg.content,
        created_at: msg.created_at,
      });
    } else if (msg.role === "assistant") {
      if (!currentAssistantTurn) {
        currentAssistantTurn = {
          id: msg.id,
          role: "assistant",
          model_name: msg.model_name,
          created_at: msg.created_at,
          steps: [],
          finalContent: "",
          finalReasoning: null,
          isStreaming: false,
        };
      }

      // If this assistant message has tool_calls, it's an intermediate loop
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        const stepTools: AgentToolCallItem[] = msg.tool_calls.map((tc: any, tcIdx: number) => {
          let parsedArgs = tc.function?.arguments || tc.args || {};
          if (typeof parsedArgs === "string") {
            try {
              parsedArgs = JSON.parse(parsedArgs);
            } catch {
              // keep as string
            }
          }
          return {
            id: tc.id || `tool_${tcIdx}`,
            name: tc.function?.name || tc.name || "Tool",
            args: parsedArgs,
            result: undefined,
            status: "done",
            step: currentAssistantTurn!.steps.length + 1,
          };
        });

        currentAssistantTurn.steps.push({
          step: currentAssistantTurn.steps.length + 1,
          reasoning: msg.reasoning_content || undefined,
          tools: stepTools,
          status: "done",
        });
      } else {
        // Final assistant synthesized answer
        currentAssistantTurn.finalContent = msg.content;
        currentAssistantTurn.finalReasoning = msg.reasoning_content || null;
        currentAssistantTurn.stopped = msg.finish_reason === "stopped";
        if (msg.model_name) {
          currentAssistantTurn.model_name = msg.model_name;
        }
      }
    } else if (msg.role === "tool") {
      // Tool message: attach output result to matching tool_call
      if (currentAssistantTurn && currentAssistantTurn.steps.length > 0) {
        let matched = false;
        // Search in reverse from the most recent step
        for (let sIdx = currentAssistantTurn.steps.length - 1; sIdx >= 0; sIdx--) {
          const step = currentAssistantTurn.steps[sIdx];
          const tool = step.tools.find((t) => t.id === msg.tool_call_id || t.name === msg.name);
          if (tool) {
            tool.result = msg.content;
            tool.sources = msg.sources ?? undefined;
            matched = true;
            break;
          }
        }
        if (!matched && currentAssistantTurn.steps.length > 0) {
          const lastStep = currentAssistantTurn.steps[currentAssistantTurn.steps.length - 1];
          if (lastStep.tools.length > 0) {
            const lastTool = lastStep.tools[lastStep.tools.length - 1];
            lastTool.result = msg.content;
            lastTool.sources = msg.sources ?? undefined;
          }
        }
      }
    }
  }

  if (currentAssistantTurn) {
    turns.push(currentAssistantTurn);
  }

  return turns;
}

// ────────────── Main Chat Component ──────────────

// Sidebar history is loaded a page at a time as the user scrolls
const CONVERSATION_PAGE_SIZE = 30;
const CONVERSATION_MAX_REFRESH = 200;

export default function ChatInterface({ initialSessionId }: { initialSessionId?: string }) {
  const router = useRouter();
  const params = useParams();
  const routeSessionId = (params?.id as string) || initialSessionId || null;

  const { user, loading: authLoading, logout } = useAuth();

  // Data
  const [models, setModels] = useState<ChatModel[]>([]);
  const [agents, setAgents] = useState<ChatAgent[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsCursor, setConversationsCursor] = useState<string | null>(null);
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [isSearchingChats, setIsSearchingChats] = useState(false);
  // The query the current list was fetched with (chatSearch is the live, undebounced input)
  const [activeChatSearch, setActiveChatSearch] = useState("");
  // Refs so fetchConversations stays stable (it is a dependency of many callbacks)
  const chatSearchRef = useRef("");
  const loadedConversationsRef = useRef(0);
  const loadingMoreRef = useRef(false);
  // Bumped by every refresh; a response from an older request is discarded
  const conversationsRequestRef = useRef(0);
  const conversationListRef = useRef<HTMLDivElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Settings & Identifiers for current chat
  const [activeSessionId, setActiveSessionId] = useState<string | null>(routeSessionId);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  // Agent for a new chat; an open chat shows the agent it started with (fixed for its lifetime)
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [conversationAgent, setConversationAgent] = useState<{ name: string; icon: string } | null>(null);
  const [effortLevel, setEffortLevel] = useState<EffortLevel>("medium");

  // Streaming Live Turn State
  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [liveStreamingTurn, setLiveStreamingTurn] = useState<UnifiedAssistantTurn | null>(null);
  const [isStopping, setIsStopping] = useState(false);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [effortPopoverOpen, setEffortPopoverOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  // The guide opens by itself the first time a user reaches the chat page
  const [guideAutoHandled, setGuideAutoHandled] = useState(false);
  // Patch notes open by themselves on the first visit after a version update
  const [patchNotesAutoHandled, setPatchNotesAutoHandled] = useState(false);
  const [editingTitle, setEditingTitle] = useState<number | string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // Follow new output only while the user is at the bottom; scrolling up stops following
  const followOutputRef = useRef(true);
  // True while our own smooth "jump to bottom" scroll is animating
  const autoScrollingRef = useRef(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const currentLoadedRef = useRef<string | null>(null);
  const loadConversationRef = useRef<((idOrSessionId: string | number) => Promise<void>) | null>(null);

  const turns = useMemo(() => groupMessagesIntoTurns(messages), [messages]);

  // Sources of every tool result in the open chat (including the answer being streamed), so a
  // [cite:N] marker resolves wherever it appears
  const citationSources = useMemo(() => {
    const byId = new Map<number, CitationSource>();
    const collect = (list: ConversationTurn[]) => {
      for (const turn of list) {
        if (turn.role !== "assistant") continue;
        for (const step of turn.steps) {
          for (const tool of step.tools) {
            for (const source of tool.sources ?? []) byId.set(source.id, source);
          }
        }
      }
    };
    collect(turns);
    if (liveStreamingTurn) collect([liveStreamingTurn]);
    return byId;
  }, [turns, liveStreamingTurn]);
  const [openCitationId, setOpenCitationId] = useState<number | null>(null);
  const citationContext = useMemo(
    () => ({ sources: citationSources, open: setOpenCitationId }),
    [citationSources]
  );
  const openCitation = openCitationId !== null ? citationSources.get(openCitationId) ?? null : null;

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    followOutputRef.current = true;
    setShowJumpToBottom(false);
    const el = scrollContainerRef.current;
    if (!el) return;
    if (behavior === "smooth") autoScrollingRef.current = true;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const handleMessagesScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (autoScrollingRef.current) {
      // Ignore the intermediate positions of our own smooth scroll
      if (!atBottom) return;
      autoScrollingRef.current = false;
    }
    followOutputRef.current = atBottom;
    setShowJumpToBottom(!atBottom);
  };

  // Keep the newest output in view, unless the user has scrolled up to read
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el && followOutputRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, liveStreamingTurn]);

  // ────── Data Fetching ──────

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/models");
      if (res.ok) {
        const data = await res.json();
        setModels(data.models || []);
        // Set default model
        const defaultModel = data.models?.find((m: ChatModel) => m.is_default);
        if (defaultModel && !selectedModelId) {
          setSelectedModelId(defaultModel.id);
        } else if (data.models?.length > 0 && !selectedModelId) {
          setSelectedModelId(data.models[0].id);
        }
      }
    } catch {
      // silent
    }
  }, [selectedModelId]);

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/agents");
      if (res.ok) {
        const data = await res.json();
        const list: ChatAgent[] = data.agents || [];
        setAgents(list);
        // Pre-select the default agent (the API lists it first) for a new chat
        setSelectedAgentId((prev) =>
          prev ?? (list.find((a) => a.is_default) ?? list[0])?.id ?? null
        );
      }
    } catch {
      // silent
    }
  }, []);

  const conversationsUrl = (limit: number, cursor?: string) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (chatSearchRef.current) params.set("q", chatSearchRef.current);
    if (cursor) params.set("cursor", cursor);
    return `/api/chat/conversations?${params}`;
  };

  // Reload the list from the top, keeping as many rows as are already loaded so a
  // refresh (new message, rename, polling) doesn't collapse a scrolled-down history.
  const fetchConversations = useCallback(async () => {
    const requestId = ++conversationsRequestRef.current;
    const limit = Math.min(
      Math.max(loadedConversationsRef.current, CONVERSATION_PAGE_SIZE),
      CONVERSATION_MAX_REFRESH
    );
    try {
      const res = await fetch(conversationsUrl(limit));
      if (!res.ok) return;
      const data = await res.json();
      if (requestId !== conversationsRequestRef.current) return;
      const list: Conversation[] = data.conversations || [];
      loadedConversationsRef.current = list.length;
      setConversations(list);
      setConversationsCursor(data.next_cursor ?? null);
    } catch {
      // silent
    } finally {
      if (requestId === conversationsRequestRef.current) setIsSearchingChats(false);
    }
  }, []);

  const loadMoreConversations = useCallback(async () => {
    if (!conversationsCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMoreConversations(true);
    // A refresh or new search started meanwhile makes this page stale
    const requestId = conversationsRequestRef.current;
    try {
      const res = await fetch(conversationsUrl(CONVERSATION_PAGE_SIZE, conversationsCursor));
      if (!res.ok) return;
      const data = await res.json();
      if (requestId !== conversationsRequestRef.current) return;
      const page: Conversation[] = data.conversations || [];
      loadedConversationsRef.current += page.length;
      setConversations((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...page.filter((c) => !seen.has(c.id))];
      });
      setConversationsCursor(data.next_cursor ?? null);
    } catch {
      // silent
    } finally {
      loadingMoreRef.current = false;
      setLoadingMoreConversations(false);
    }
  }, [conversationsCursor]);

  // Load the next page when the end of the history list scrolls into view
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !conversationsCursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMoreConversations();
      },
      { root: conversationListRef.current, rootMargin: "200px" }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [conversationsCursor, loadMoreConversations]);

  // Debounced server-side title search
  useEffect(() => {
    const q = chatSearch.trim();
    if (q === chatSearchRef.current) return;
    const timer = setTimeout(() => {
      chatSearchRef.current = q;
      setActiveChatSearch(q);
      loadedConversationsRef.current = 0;
      setIsSearchingChats(true);
      fetchConversations();
    }, 300);
    return () => clearTimeout(timer);
  }, [chatSearch, fetchConversations]);

  const closeChatSearch = () => {
    setChatSearch("");
    setChatSearchOpen(false);
  };

  // Mirrors a chat-run SSE stream (a fresh answer or a re-attached one) into the live turn,
  // then swaps in the saved messages once the turn is done.
  const consumeChatStream = useCallback(
    async (
      res: Response,
      controller: AbortController,
      initialRef: { chatId: number | null; sessionId: string | null }
    ) => {
      const reader = res.body?.getReader();
      if (!reader) {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsStreaming(false);
        }
        return;
      }

      const decoder = new TextDecoder();
      let sseBuffer = "";
      let currentSessionChatId = initialRef.chatId;
      let currentSessionUuid = initialRef.sessionId;
      let reachedEnd = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;
            const dataStr = trimmed.slice(6);
            if (dataStr === "[DONE]") continue;

            try {
              const data = JSON.parse(dataStr);

              if (data.type === "meta") {
                if (data.chat_id) {
                  currentSessionChatId = data.chat_id;
                  setActiveConversationId(data.chat_id);
                }
                if (data.session_id) {
                  currentSessionUuid = data.session_id;
                  currentLoadedRef.current = data.session_id;
                  setActiveSessionId(data.session_id);
                  // Dynamically update URL to /chat/session-id without unmounting
                  if (typeof window !== "undefined" && window.location.pathname !== `/chat/${data.session_id}`) {
                    window.history.replaceState(null, "", `/chat/${data.session_id}`);
                  }
                }
                setLiveStreamingTurn((prev) =>
                  prev
                    ? {
                        ...prev,
                        model_name: data.model_name || prev.model_name,
                        maxSteps: data.max_steps || prev.maxSteps,
                      }
                    : prev
                );
                // Show the (possibly new) chat in the sidebar with its processing indicator
                fetchConversations();
              } else if (data.type === "status") {
                setLiveStreamingTurn((prev) =>
                  prev
                    ? {
                        ...prev,
                        statusMessage: data.status_message || prev.statusMessage,
                        currentLoop: data.step || prev.currentLoop,
                      }
                    : prev
                );
              } else if (data.type === "reasoning") {
                setLiveStreamingTurn((prev) => {
                  if (!prev) return prev;
                  if (data.is_synthesis) {
                    return {
                      ...prev,
                      finalReasoning: (prev.finalReasoning || "") + data.content,
                    };
                  }
                  const stepNum = data.step || prev.currentLoop || 1;
                  const steps = [...prev.steps];
                  while (steps.length < stepNum) {
                    steps.push({
                      step: steps.length + 1,
                      reasoning: "",
                      tools: [],
                      status: "running",
                    });
                  }
                  steps[stepNum - 1] = {
                    ...steps[stepNum - 1],
                    reasoning: (steps[stepNum - 1].reasoning || "") + data.content,
                  };
                  return { ...prev, steps };
                });
              } else if (data.type === "tool_call_start") {
                setLiveStreamingTurn((prev) => {
                  if (!prev) return prev;
                  const stepNum = data.step || prev.currentLoop || 1;
                  const steps = [...prev.steps];
                  while (steps.length < stepNum) {
                    steps.push({
                      step: steps.length + 1,
                      reasoning: "",
                      tools: [],
                      status: "running",
                    });
                  }
                  const currentStepTools = [...steps[stepNum - 1].tools];
                  const existingIdx = currentStepTools.findIndex((t) => t.id === data.tool_call_id);
                  const toolItem: AgentToolCallItem = {
                    id: data.tool_call_id,
                    name: data.tool_name,
                    args: data.args,
                    status: "running",
                    step: data.step,
                  };
                  if (existingIdx >= 0) {
                    currentStepTools[existingIdx] = toolItem;
                  } else {
                    currentStepTools.push(toolItem);
                  }
                  steps[stepNum - 1] = {
                    ...steps[stepNum - 1],
                    tools: currentStepTools,
                  };
                  return { ...prev, steps };
                });
              } else if (data.type === "tool_call_result") {
                setLiveStreamingTurn((prev) => {
                  if (!prev) return prev;
                  const steps = prev.steps.map((s) => ({
                    ...s,
                    status: (s.step === data.step ? "done" : s.status) as "running" | "done",
                    tools: s.tools.map((t) =>
                      t.id === data.tool_call_id
                        ? {
                            ...t,
                            status: (data.is_error ? "error" : "done") as "done" | "error",
                            result: data.result,
                            sources: data.sources,
                          }
                        : t
                    ),
                  }));
                  return { ...prev, steps };
                });
              } else if (data.type === "content") {
                setLiveStreamingTurn((prev) =>
                  prev
                    ? {
                        ...prev,
                        finalContent: prev.finalContent + data.content,
                      }
                    : prev
                );
              } else if (data.type === "title") {
                // LLM-generated title for a new chat — refresh the sidebar to show it
                fetchConversations();
              } else if (data.type === "done") {
                reachedEnd = true;
                // Immediately collapse streaming pipeline
                setLiveStreamingTurn((prev) =>
                  prev
                    ? {
                        ...prev,
                        isStreaming: false,
                        statusMessage: "เสร็จสิ้น",
                      }
                    : prev
                );

                const targetChatRef =
                  data.session_id || currentSessionUuid || data.chat_id || currentSessionChatId;
                if (targetChatRef) {
                  try {
                    const convRes = await fetch(`/api/chat/conversations/${targetChatRef}`, {
                      signal: controller.signal,
                    });
                    if (convRes.ok) {
                      const convData = await convRes.json();
                      // The user may have switched to another chat meanwhile
                      if (controller.signal.aborted) return;
                      if (convData.messages) {
                        setMessages(convData.messages);
                      }
                      if (convData.conversation) {
                        setActiveConversationId(convData.conversation.id);
                        setActiveSessionId(convData.conversation.session_id);
                      }
                    }
                  } catch {
                    // silent
                  }
                }
                if (controller.signal.aborted) return;
                setLiveStreamingTurn(null);
                fetchConversations();
              } else if (data.type === "error") {
                reachedEnd = true;
                setLiveStreamingTurn((prev) =>
                  prev
                    ? {
                        ...prev,
                        isStreaming: false,
                        finalContent: prev.finalContent + `\n\n❌ LLM Error: ${data.error}`,
                      }
                    : null
                );
                fetchConversations();
              }
            } catch {
              // skip unparseable
            }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          reachedEnd = true;
          setLiveStreamingTurn((prev) =>
            prev
              ? {
                  ...prev,
                  isStreaming: false,
                  finalContent: prev.finalContent + "\n\n❌ เกิดข้อผิดพลาดในการเชื่อมต่อ",
                }
              : null
          );
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsStreaming(false);
        }
      }

      // The stream closed without finishing (e.g. server restarted or a proxy cut it):
      // reload the chat, which re-attaches if the answer is still being generated.
      const chatRef = currentSessionUuid || currentSessionChatId;
      if (!reachedEnd && !controller.signal.aborted && chatRef) {
        setLiveStreamingTurn(null);
        loadConversationRef.current?.(chatRef);
      }
    },
    [fetchConversations]
  );

  // Re-attach to an answer that is still being generated on the server
  // (after a refresh, a closed tab, or coming back from another page or chat).
  const resumeChatRun = useCallback(
    async (conversation: { id: number; session_id?: string | null; model_name?: string | null }) => {
      const chatRef = conversation.session_id || String(conversation.id);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsStreaming(true);
      setIsStopping(false);
      setLiveStreamingTurn({
        id: crypto.randomUUID(),
        role: "assistant",
        model_name: conversation.model_name || "AI Assistant",
        created_at: new Date().toISOString(),
        steps: [],
        finalContent: "",
        finalReasoning: null,
        isStreaming: true,
        currentLoop: 1,
        statusMessage: "กำลังเชื่อมต่อกับการประมวลผลที่ยังทำงานอยู่...",
      });

      let res: Response;
      try {
        res = await fetch(`/api/chat/conversations/${chatRef}/stream`, { signal: controller.signal });
      } catch (err: any) {
        if (err.name === "AbortError") return;
        res = new Response(null, { status: 503 });
      }

      if (res.status === 200) {
        await consumeChatStream(res, controller, {
          chatId: conversation.id,
          sessionId: conversation.session_id || null,
        });
        return;
      }

      if (abortRef.current !== controller) return;
      abortRef.current = null;
      setIsStreaming(false);
      setLiveStreamingTurn(null);
      if (res.status === 204) {
        // It finished in the meantime — load the saved answer
        loadConversationRef.current?.(chatRef);
      }
    },
    [consumeChatStream]
  );

  const loadConversation = useCallback(
    async (idOrSessionId: string | number) => {
      const requestedRef = String(idOrSessionId);
      // Detach from any stream being shown; the server keeps processing it
      abortRef.current?.abort();
      abortRef.current = null;
      setIsStreaming(false);
      setLiveStreamingTurn(null);
      // Open the chat at its latest message
      followOutputRef.current = true;
      setShowJumpToBottom(false);

      try {
        setIsChatLoading(true);
        const res = await fetch(`/api/chat/conversations/${idOrSessionId}`);
        // Ignore a response for a chat the user has already left
        if (currentLoadedRef.current !== null && currentLoadedRef.current !== requestedRef) return;
        if (res.ok) {
          const data = await res.json();
          const loadedMessages: ChatMessage[] = data.messages || [];
          if (data.conversation?.is_processing) {
            // Drop this turn's partially saved steps; replaying the run rebuilds them live
            const lastUserIdx = loadedMessages.map((m) => m.role).lastIndexOf("user");
            setMessages(lastUserIdx >= 0 ? loadedMessages.slice(0, lastUserIdx + 1) : loadedMessages);
          } else {
            setMessages(loadedMessages);
          }
          if (data.conversation) {
            setActiveConversationId(data.conversation.id);
            setActiveSessionId(data.conversation.session_id || String(data.conversation.id));
            currentLoadedRef.current = data.conversation.session_id || String(data.conversation.id);
            if (data.conversation.model_id) {
              setSelectedModelId(data.conversation.model_id);
            }
            if (data.conversation.effort_level) {
              setEffortLevel(data.conversation.effort_level);
            }
            // Chats from before agents existed have none yet; the server assigns
            // the default agent on their next message
            setSelectedAgentId(data.conversation.agent_id ?? null);
            setConversationAgent(
              data.conversation.agent_name
                ? { name: data.conversation.agent_name, icon: data.conversation.agent_icon || "🤖" }
                : null
            );
            if (data.conversation.is_processing) {
              resumeChatRun(data.conversation);
            }
          }
        } else if (res.status === 404) {
          // If session not found, reset to new chat
          if (typeof window !== "undefined") {
            window.history.replaceState(null, "", "/chat");
          }
          currentLoadedRef.current = null;
          setActiveConversationId(null);
          setActiveSessionId(null);
          setMessages([]);
        }
      } catch (err) {
        console.error("Failed to load conversation:", err);
      } finally {
        setIsChatLoading(false);
      }
    },
    [resumeChatRun]
  );
  useEffect(() => {
    loadConversationRef.current = loadConversation;
  }, [loadConversation]);

  // Detach from the stream when leaving the page (the server keeps processing)
  useEffect(() => () => abortRef.current?.abort(), []);

  // While any chat is still processing, keep the sidebar's status indicators fresh
  const hasProcessingChats = conversations.some((c) => c.is_processing);
  useEffect(() => {
    if (!hasProcessingChats) return;
    const timer = setInterval(fetchConversations, 4000);
    return () => clearInterval(timer);
  }, [hasProcessingChats, fetchConversations]);

  // Initial data loading
  useEffect(() => {
    if (!authLoading && user) {
      fetchModels();
      fetchAgents();
      fetchConversations();
    } else if (!authLoading && !user) {
      const currentPath = routeSessionId ? `/chat/${routeSessionId}` : "/chat";
      router.push(`/login?redirect=${encodeURIComponent(currentPath)}`);
    }
  }, [authLoading, user, fetchModels, fetchAgents, fetchConversations, router, routeSessionId]);

  // Initial load for session if present in URL
  useEffect(() => {
    if (routeSessionId && currentLoadedRef.current !== routeSessionId) {
      currentLoadedRef.current = routeSessionId;
      loadConversation(routeSessionId);
    }
  }, [routeSessionId, loadConversation]);

  // Handle browser Back / Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/chat\/([0-9a-f-]+|\d+)$/i);
      if (match && match[1]) {
        const targetId = match[1];
        if (currentLoadedRef.current !== targetId) {
          currentLoadedRef.current = targetId;
          loadConversation(targetId);
        }
      } else if (path === "/chat" || path === "/chat/") {
        handleNewChat(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [loadConversation]);

  // ────── Chat Actions ──────

  const handleNewChat = (updateHistory: boolean = true) => {
    if (isStreaming && abortRef.current) {
      abortRef.current.abort();
      setIsStreaming(false);
    }
    if (updateHistory && typeof window !== "undefined") {
      window.history.pushState(null, "", "/chat");
    }
    currentLoadedRef.current = null;
    setActiveConversationId(null);
    setActiveSessionId(null);
    setConversationAgent(null);
    setSelectedAgentId((agents.find((a) => a.is_default) ?? agents[0])?.id ?? null);
    setLiveStreamingTurn(null);
    setMessages([]);
    setInputMessage("");
    followOutputRef.current = true;
    setShowJumpToBottom(false);
    inputRef.current?.focus();
  };

  const handleSelectConversation = (conv: Conversation) => {
    const target = conv.session_id || conv.id;
    if (String(target) === String(activeSessionId || activeConversationId)) return;

    if (isStreaming && abortRef.current) {
      abortRef.current.abort();
      setIsStreaming(false);
    }
    setLiveStreamingTurn(null);

    // Instantly highlight in sidebar
    setActiveSessionId(conv.session_id || String(conv.id));
    setActiveConversationId(conv.id);

    // Update browser URL smoothly without unmounting or reloading UI
    if (typeof window !== "undefined") {
      window.history.pushState(null, "", `/chat/${target}`);
    }

    currentLoadedRef.current = String(target);
    loadConversation(target);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isStreaming) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setIsStreaming(true);
    setIsStopping(false);
    // Sending a message always jumps back to the latest output
    scrollToBottom();

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    const initialLiveTurn: UnifiedAssistantTurn = {
      id: crypto.randomUUID(),
      role: "assistant",
      model_name: selectedModel?.display_name || "AI Assistant",
      created_at: new Date().toISOString(),
      steps: [],
      finalContent: "",
      finalReasoning: null,
      isStreaming: true,
      currentLoop: 1,
      maxSteps: effortLevel === "low" ? 5 : effortLevel === "high" ? 20 : 10,
      statusMessage: "กำลังเริ่มวิเคราะห์...",
    };
    setLiveStreamingTurn(initialLiveTurn);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const currentConversationRef = activeSessionId || activeConversationId;

      const res = await fetch("/api/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: currentConversationRef,
          message: userMessage,
          model_id: selectedModelId,
          // Only read for a new chat; an existing chat keeps its agent
          agent_id: selectedAgentId,
          effort_level: effortLevel,
          tools_enabled: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
        setLiveStreamingTurn((prev) =>
          prev
            ? {
                ...prev,
                isStreaming: false,
                finalContent: `❌ Error: ${errorData.error || "Failed to get response"}`,
              }
            : null
        );
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsStreaming(false);
        }
        return;
      }

      await consumeChatStream(res, controller, {
        chatId: activeConversationId,
        sessionId: activeSessionId,
      });
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setLiveStreamingTurn((prev) =>
          prev
            ? {
                ...prev,
                isStreaming: false,
                finalContent: prev.finalContent + "\n\n❌ เกิดข้อผิดพลาดในการเชื่อมต่อ",
              }
            : null
        );
      }
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsStreaming(false);
      }
    }
  };

  // Ask the server to stop the answer being generated. The stream then ends normally,
  // with whatever was generated so far saved as the answer.
  const handleStopResponse = async () => {
    const chatRef = activeSessionId || activeConversationId;
    if (!chatRef || isStopping) return;
    setIsStopping(true);
    setLiveStreamingTurn((prev) => (prev ? { ...prev, statusMessage: "กำลังหยุดการตอบ..." } : prev));
    try {
      const res = await fetch(`/api/chat/conversations/${chatRef}/stop`, { method: "POST" });
      if (!res.ok) setIsStopping(false);
    } catch {
      setIsStopping(false);
    }
  };

  const handleDeleteConversation = async (conv: Conversation) => {
    const targetRef = conv.session_id || conv.id;
    try {
      const res = await fetch(`/api/chat/conversations/${targetRef}`, { method: "DELETE" });
      if (res.ok) {
        if (
          String(targetRef) === String(activeSessionId) ||
          Number(conv.id) === Number(activeConversationId)
        ) {
          handleNewChat(true);
        }
        fetchConversations();
      }
    } catch {
      // silent
    }
  };

  const handleRenameConversation = async (conv: Conversation) => {
    if (!editTitle.trim()) {
      setEditingTitle(null);
      return;
    }
    const targetRef = conv.session_id || conv.id;
    try {
      await fetch(`/api/chat/conversations/${targetRef}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      fetchConversations();
    } catch {
      // silent
    }
    setEditingTitle(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const selectedModel = models.find((m) => m.id === selectedModelId);
  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  // Once a chat exists its agent is fixed; the picker only works for a new chat
  const agentLocked = Boolean(activeSessionId || activeConversationId);
  const shownAgent = selectedAgent
    ? { name: selectedAgent.name, icon: selectedAgent.icon }
    : conversationAgent;

  const handleSelectAgent = (agent: ChatAgent) => {
    setSelectedAgentId(agent.id);
    if (agent.default_model_id && models.some((m) => m.id === agent.default_model_id)) {
      setSelectedModelId(agent.default_model_id);
    }
    setAgentDropdownOpen(false);
  };
  const effortIndex = EFFORT_OPTIONS.findIndex((e) => e.id === effortLevel);
  const currentEffort = EFFORT_OPTIONS[effortIndex] || EFFORT_OPTIONS[1];

  // Empty new chat: greeting and composer sit centered instead of docked at the bottom
  const isWelcome = !(isChatLoading && messages.length === 0) && turns.length === 0 && !liveStreamingTurn;

  const composer = (
    <div className="relative max-w-3xl mx-auto">
      {showJumpToBottom && (turns.length > 0 || liveStreamingTurn) && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className="absolute -top-12 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white/95 dark:bg-[#0d1322]/95 border border-slate-200 dark:border-white/10 shadow-lg shadow-slate-900/10 dark:shadow-black/30 hover:text-[#0055fa] dark:hover:text-blue-400 hover:border-[#0055fa]/30 transition-colors cursor-pointer"
          title="เลื่อนไปข้อความล่าสุด"
        >
          {isStreaming && <span className="w-1.5 h-1.5 rounded-full bg-[#0055fa] animate-pulse" />}
          <ArrowDown className="w-4 h-4" />
          {isStreaming && <span>ติดตามคำตอบ</span>}
        </button>
      )}
      <div className="relative bg-white dark:bg-white/[0.03] border border-slate-300/80 dark:border-white/10 rounded-2xl shadow-lg shadow-slate-900/8 dark:shadow-none focus-within:border-[#0055fa]/40 focus-within:ring-2 focus-within:ring-[#0055fa]/10 transition-all">
        <textarea
          ref={inputRef}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`ถาม ${shownAgent?.name || "AI"}... (Enter เพื่อส่ง, Shift+Enter ขึ้นบรรทัดใหม่)`}
          rows={1}
          className="block w-full px-4 pt-3 pb-1 text-sm bg-transparent outline-hidden resize-none max-h-40 placeholder:text-slate-500 dark:placeholder:text-slate-600"
          style={{
            height: "auto",
            minHeight: "40px",
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = Math.min(target.scrollHeight, 160) + "px";
          }}
        />

        {/* Composer Toolbar: Model, Effort, Send */}
        <div className="flex items-center gap-0.5 px-2 pb-2">
          {/* Model Selector */}
          <div className="relative min-w-0">
            <button
              type="button"
              onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
              aria-haspopup="listbox"
              aria-expanded={modelDropdownOpen}
              className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer ${
                modelDropdownOpen ? "bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white" : ""
              }`}
              title="เลือก Model"
            >
              <Brain className="w-3.5 h-3.5 text-[#0055fa] shrink-0" />
              <span className="max-w-[140px] sm:max-w-[220px] truncate">
                {selectedModel?.display_name || "เลือก Model"}
              </span>
              <ChevronDown
                className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${
                  modelDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {modelDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setModelDropdownOpen(false)}
                />
                <div
                  role="listbox"
                  className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-40 py-1 max-h-64 overflow-y-auto animate-popover"
                >
                  {models.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      role="option"
                      aria-selected={selectedModelId === model.id}
                      onClick={() => {
                        setSelectedModelId(model.id);
                        setModelDropdownOpen(false);
                      }}
                      className={`w-full flex items-start gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left cursor-pointer ${
                        selectedModelId === model.id ? "bg-[#0055fa]/5" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold truncate">
                            {model.display_name}
                          </span>
                          {model.is_default && (
                            <span className="px-1 text-[8px] font-bold bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded">
                              DEF
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          {model.connection_name}
                          {model.supports_tools === false && " · ไม่รองรับ Tools/Skills"}
                        </p>
                      </div>
                      {selectedModelId === model.id && (
                        <Check className="w-3.5 h-3.5 text-[#0055fa] shrink-0 mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Effort Level: compact trigger, slider in popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setEffortPopoverOpen(!effortPopoverOpen)}
              aria-haspopup="dialog"
              aria-expanded={effortPopoverOpen}
              className={`flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer ${
                effortPopoverOpen ? "bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white" : ""
              }`}
              title="ระดับความลึกในการคิด (Effort Level)"
            >
              <span>{currentEffort.icon}</span>
              <span>{currentEffort.label}</span>
            </button>

            {effortPopoverOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setEffortPopoverOpen(false)}
                />
                <div
                  role="dialog"
                  aria-label="Effort Level"
                  onKeyDown={(e) => {
                    if (e.key === "Escape" || e.key === "Enter") {
                      e.preventDefault();
                      setEffortPopoverOpen(false);
                      inputRef.current?.focus();
                    }
                  }}
                  className="absolute bottom-full left-0 mb-2 w-60 p-3 bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-40 animate-popover"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Reasoning Effort
                    </span>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {currentEffort.icon} {currentEffort.label}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={EFFORT_OPTIONS.length - 1}
                    step={1}
                    value={effortIndex}
                    onChange={(e) => setEffortLevel(EFFORT_OPTIONS[Number(e.target.value)].id)}
                    aria-label="ระดับความลึกในการคิด (Effort Level)"
                    aria-valuetext={`${currentEffort.label} Effort`}
                    autoFocus
                    className="w-full h-1.5 accent-[#0055fa] cursor-pointer"
                  />
                  <div className="grid grid-cols-3 mt-1 text-[10px]">
                    {EFFORT_OPTIONS.map((opt, idx) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setEffortLevel(opt.id)}
                        className={`cursor-pointer transition-colors ${
                          idx === 0 ? "text-left" : idx === EFFORT_OPTIONS.length - 1 ? "text-right" : "text-center"
                        } ${
                          effortLevel === opt.id
                            ? "font-semibold text-[#0055fa] dark:text-blue-400"
                            : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                    {currentEffort.desc}
                  </p>
                </div>
              </>
            )}
          </div>

          {isStreaming ? (
            <button
              type="button"
              onClick={handleStopResponse}
              disabled={isStopping || !(activeSessionId || activeConversationId)}
              className="ml-auto p-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              title={isStopping ? "กำลังหยุด..." : "หยุดการตอบ"}
              aria-label="หยุดการตอบ"
            >
              {isStopping ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Square className="w-4 h-4 fill-current" />
              )}
            </button>
          ) : (
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="ml-auto p-1.5 rounded-lg bg-[#0055fa] text-white hover:bg-[#0046d1] disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="ส่งข้อความ"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const hasSeenGuide = (userId: number) => {
    try {
      return localStorage.getItem(guideSeenKey(userId)) === "1";
    } catch {
      return true; // storage unavailable: don't nag on every visit
    }
  };
  const hasSeenCurrentVersion = (userId: number) => {
    try {
      return localStorage.getItem(seenVersionKey(userId)) === process.env.APP_VERSION;
    } catch {
      return true;
    }
  };
  const markCurrentVersionSeen = () => {
    try {
      if (user) localStorage.setItem(seenVersionKey(user.id), process.env.APP_VERSION || "");
    } catch {
      // ignore
    }
  };

  const guidePending = !guideAutoHandled && !!user && !hasSeenGuide(user.id);
  const showGuide = guideOpen || guidePending;
  // New users get the guide instead; patch notes are for returning users after an update
  const showPatchNotes =
    !patchNotesAutoHandled && !!user && !guidePending && !hasSeenCurrentVersion(user.id);

  const closeGuide = () => {
    try {
      if (user) localStorage.setItem(guideSeenKey(user.id), "1");
    } catch {
      // ignore
    }
    // Someone who just read the guide is already on the current version
    if (guidePending) {
      markCurrentVersionSeen();
      setPatchNotesAutoHandled(true);
    }
    setGuideOpen(false);
    setGuideAutoHandled(true);
  };
  const closePatchNotes = () => {
    markCurrentVersionSeen();
    setPatchNotesAutoHandled(true);
  };

  // ────── Loading ──────

  if (authLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-[#060911]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#0055fa] animate-spin" />
          <p className="text-sm text-slate-500">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  // ────────────── Render ──────────────

  return (
    <div className="h-screen flex bg-slate-100 dark:bg-[#060911] text-slate-900 dark:text-slate-100 font-sans overflow-hidden">
      {/* ═══════════ SIDEBAR ═══════════ */}
      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-0"
        } shrink-0 bg-white dark:bg-[#0a0f1e] border-r border-slate-200 dark:border-white/8 flex flex-col transition-all duration-300 overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-white/8 flex items-center justify-between shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#0055fa] to-[#2670ff] text-white flex items-center justify-center">
              <BookOpen className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-bold tracking-tight">
              Neuron<span className="text-[#0055fa]">Chat</span>
            </span>
          </Link>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => (chatSearchOpen ? closeChatSearch() : setChatSearchOpen(true))}
              aria-pressed={chatSearchOpen}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                chatSearchOpen
                  ? "bg-slate-100 text-slate-900 dark:bg-white/5 dark:text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/5"
              }`}
              title="ค้นหาแชท"
              aria-label="ค้นหาแชท"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/5 transition-all cursor-pointer"
              title="ซ่อนแถบด้านข้าง"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="px-3 py-3 shrink-0">
          <button
            onClick={() => handleNewChat(true)}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-xl shadow-md shadow-[#0055fa]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>

          {chatSearchOpen && (
            <div className="relative mt-2 animate-popover">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="search"
                autoFocus
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") closeChatSearch();
                }}
                placeholder="ค้นหาชื่อแชท..."
                aria-label="ค้นหาชื่อแชท"
                className="w-full pl-8 pr-8 py-2 text-xs rounded-xl bg-slate-100 dark:bg-white/5 border border-transparent focus:border-[#0055fa]/40 focus:bg-white dark:focus:bg-white/[0.07] outline-hidden placeholder:text-slate-400 transition-colors [&::-webkit-search-cancel-button]:hidden"
              />
              {isSearchingChats ? (
                <RefreshCw className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 animate-spin" />
              ) : (
                <button
                  type="button"
                  onClick={closeChatSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  title="ปิดการค้นหา"
                  aria-label="ปิดการค้นหา"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Conversations List */}
        <div ref={conversationListRef} className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5">
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              {activeChatSearch ? (
                <>
                  <Search className="w-8 h-8 text-slate-400 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-600 px-4 break-words">
                    ไม่พบแชทที่ตรงกับ “{activeChatSearch}”
                  </p>
                </>
              ) : (
                <>
                  <MessageSquare className="w-8 h-8 text-slate-400 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-600">ยังไม่มีประวัติแชท</p>
                </>
              )}
            </div>
          ) : (
            conversations.map((conv) => {
              const isSelected =
                (activeSessionId && conv.session_id === activeSessionId) ||
                (activeConversationId && conv.id === activeConversationId);
              const isProcessing = conv.is_processing || (isSelected && isStreaming);

              return (
                <div
                  key={conv.session_id || conv.id}
                  className={`group flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-all text-xs ${
                    isSelected
                      ? "bg-[#0055fa]/10 text-[#0046d1] dark:text-blue-400 border border-[#0055fa]/30 dark:border-[#0055fa]/20 font-semibold"
                      : "hover:bg-slate-100 hover:border-slate-200 dark:hover:bg-white/5 dark:hover:border-transparent text-slate-700 dark:text-slate-400 border border-transparent"
                  }`}
                  onClick={() => handleSelectConversation(conv)}
                >
                  {isProcessing ? (
                    <LoaderCircle
                      className="w-3.5 h-3.5 shrink-0 animate-spin text-[#0055fa] dark:text-blue-400"
                      aria-label="กำลังประมวลผล"
                    />
                  ) : (
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "" : "text-slate-400 dark:text-inherit"}`} />
                  )}
                  {editingTitle === (conv.session_id || conv.id) ? (
                    <div className="flex-1 flex items-center gap-1">
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRenameConversation(conv);
                          if (e.key === "Escape") setEditingTitle(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 px-1.5 py-0.5 text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded outline-hidden"
                        autoFocus
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameConversation(conv);
                        }}
                        className="p-0.5 text-emerald-600 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        className={`flex-1 truncate ${isProcessing ? "animate-title-shimmer" : ""}`}
                        title={isProcessing ? "กำลังประมวลผลคำตอบ..." : undefined}
                      >
                        {conv.title}
                      </span>
                      <div className="hidden group-hover:flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTitle(conv.session_id || conv.id);
                            setEditTitle(conv.title);
                          }}
                          className="rounded text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-300"
                          title="เปลี่ยนชื่อแชท"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConversation(conv);
                          }}
                          className="rounded text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-500"
                          title="ลบแชท"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}

          {/* Infinite scroll: reaching this sentinel loads the next page */}
          {conversationsCursor && (
            <div ref={loadMoreSentinelRef} className="flex justify-center py-3">
              {loadingMoreConversations && <RefreshCw className="w-3.5 h-3.5 text-slate-400 animate-spin" />}
            </div>
          )}
        </div>

        {/* Sidebar Footer / User Menu */}
        <div className="relative p-2.5 border-t border-slate-200 dark:border-white/8 shrink-0 bg-slate-50/50 dark:bg-transparent">
          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute bottom-full left-2 right-2 mb-2 p-1.5 bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl z-40 space-y-1 animate-popover">
                {user?.role === "admin" && (
                  <Link
                    href="/admin/mcp"
                    onClick={() => setUserMenuOpen(false)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#0055fa] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all cursor-pointer text-left"
                  >
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Admin Console</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    setSettingsOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer text-left"
                >
                  <Settings className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
                  <span>ตั้งค่า</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    setGuideOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all cursor-pointer text-left"
                >
                  <BookOpen className="w-4 h-4 shrink-0 text-slate-500 dark:text-slate-400" />
                  <span>คู่มือการใช้งาน</span>
                </button>

                <div className="pt-1 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer text-left"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>ออกจากระบบ</span>
                  </button>
                </div>
              </div>
            </>
          )}

          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user?.name || "ผู้ใช้งาน"}
                </div>
                <div className="text-[10px] text-slate-400 truncate font-mono">
                  {user?.role === "admin" ? "Admin Console ⚡" : user?.email}
                </div>
              </div>
            </div>
            <MoreHorizontal className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </aside>

      {/* ═══════════ MAIN CHAT AREA ═══════════ */}
      <div className="relative flex-1 flex flex-col min-w-0">
        {/* Top-left controls: sidebar toggle + agent selector */}
        <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 bg-white/90 dark:bg-[#0a0f1e]/90 border border-slate-200 dark:border-white/10 shadow-sm hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-white/10 transition-all cursor-pointer"
              title="เปิดแถบด้านข้าง"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}

          {/* Agent Selector: pick for a new chat, read-only once the chat exists */}
          {shownAgent && (
            <div className="relative">
              <button
                type="button"
                onClick={() => !agentLocked && setAgentDropdownOpen(!agentDropdownOpen)}
                disabled={agentLocked}
                aria-haspopup="listbox"
                aria-expanded={agentDropdownOpen}
                className={`flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 bg-white/90 dark:bg-[#0a0f1e]/90 border shadow-sm backdrop-blur transition-all ${
                  agentLocked
                    ? "border-slate-200 dark:border-white/10 cursor-default"
                    : "border-[#0055fa]/40 dark:border-blue-400/40 hover:border-[#0055fa] hover:bg-blue-50/60 dark:hover:bg-[#0055fa]/10 cursor-pointer"
                } ${agentDropdownOpen ? "ring-2 ring-[#0055fa]/30" : ""}`}
                title={agentLocked ? "AI Agent ของแชทนี้ (เปลี่ยนได้เมื่อเริ่มแชทใหม่)" : "เลือก AI Agent"}
              >
                {!agentLocked && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-md bg-[#0055fa] text-white">
                    Agent
                  </span>
                )}
                <span className="text-base leading-none">{shownAgent.icon}</span>
                <span className="max-w-[160px] sm:max-w-[240px] truncate">{shownAgent.name}</span>
                {!agentLocked && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform ${
                      agentDropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                )}
              </button>

              {agentDropdownOpen && !agentLocked && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setAgentDropdownOpen(false)} />
                  <div
                    role="listbox"
                    className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-[#0d1322] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl z-40 py-1 max-h-80 overflow-y-auto animate-popover"
                  >
                    <div className="px-3 pt-1.5 pb-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      เลือก AI Agent
                    </div>
                    {agents.map((agent) => (
                      <button
                        key={agent.id}
                        type="button"
                        role="option"
                        aria-selected={selectedAgentId === agent.id}
                        onClick={() => handleSelectAgent(agent)}
                        className={`w-full flex items-start gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-all text-left cursor-pointer ${
                          selectedAgentId === agent.id ? "bg-[#0055fa]/5" : ""
                        }`}
                      >
                        <span className="text-lg leading-none mt-0.5">{agent.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold truncate">{agent.name}</div>
                          {agent.description && (
                            <p className="text-[10px] text-slate-400 line-clamp-2">{agent.description}</p>
                          )}
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {agent.skill_count} Skills · {agent.tool_count} MCP Tools
                          </p>
                        </div>
                        {selectedAgentId === agent.id && (
                          <Check className="w-3.5 h-3.5 text-[#0055fa] shrink-0 mt-0.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>


        {/* Messages Scroll Area */}
        <div
          ref={scrollContainerRef}
          onScroll={handleMessagesScroll}
          onWheel={() => (autoScrollingRef.current = false)}
          onTouchStart={() => (autoScrollingRef.current = false)}
          className="flex-1 basis-0 min-h-0 flex flex-col overflow-y-auto relative"
        >
          {/* Subtle top progress bar when loading chat */}
          {isChatLoading && (
            <div className="sticky top-0 left-0 right-0 z-20 h-0.5 w-full bg-gradient-to-r from-[#0055fa] via-indigo-500 to-[#0055fa] animate-pulse" />
          )}

          {isChatLoading && messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 text-[#0055fa] animate-spin" />
                <span className="text-xs text-slate-400">กำลังโหลดบทสนทนา...</span>
              </div>
            </div>
          ) : isWelcome ? (
            /* Welcome greeting: pinned just above the composer (mt-auto keeps it scrollable if tall) */
            <div className="mt-auto w-full px-4 pt-16 pb-6">
                <div className={`text-center mx-auto ${agents.length > 1 ? "max-w-2xl" : "max-w-lg"}`}>
                  <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-[#0055fa] to-violet-500 text-white flex items-center justify-center shadow-lg shadow-[#0055fa]/20 text-2xl">
                    {selectedAgent ? selectedAgent.icon : <Sparkles className="w-7 h-7" />}
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight mb-2">
                    สวัสดี, {user?.name?.split(" ")[0] || "User"} 👋
                  </h2>

                  {agents.length > 1 ? (
                    /* Agent picker cards: the first choice a user makes in a new chat */
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                        เลือกผู้ช่วย AI ที่เหมาะกับงานของคุณ
                      </p>
                      <div role="radiogroup" aria-label="เลือก AI Agent" className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                        {agents.map((agent) => {
                          const active = selectedAgentId === agent.id;
                          return (
                            <button
                              key={agent.id}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              onClick={() => {
                                handleSelectAgent(agent);
                                inputRef.current?.focus();
                              }}
                              className={`relative flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                active
                                  ? "border-[#0055fa] bg-blue-50/70 dark:bg-[#0055fa]/10 ring-2 ring-[#0055fa]/20 shadow-sm"
                                  : "border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.03] hover:border-[#0055fa]/40 hover:bg-blue-50/40 dark:hover:bg-[#0055fa]/5"
                              }`}
                            >
                              <span className="text-2xl leading-none mt-0.5">{agent.icon}</span>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate pr-5">
                                  {agent.name}
                                </div>
                                {agent.description && (
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                                    {agent.description}
                                  </p>
                                )}
                              </div>
                              {active && (
                                <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#0055fa] text-white flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5" />
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {selectedAgent?.description || "วันนี้ให้ช่วยอะไรดี?"}
                    </p>
                  )}
                </div>
            </div>
          ) : (
            /* Unified Chat Turns Area */
            <CitationProvider value={citationContext}>
              <div className="w-full max-w-3xl mx-auto px-4 pt-16 pb-6 space-y-6 animate-chat-enter">
                {turns.map((turn) =>
                  turn.role === "user" ? (
                    <UserBubble key={turn.id} turn={turn} userName={user?.name || "User"} />
                  ) : (
                    <UnifiedAssistantBubble
                      key={turn.id}
                      turn={turn}
                      onCopy={handleCopyMessage}
                    />
                  )
                )}

                {/* Real-Time Live Streaming Turn */}
                {liveStreamingTurn && (
                  <UnifiedAssistantBubble
                    turn={liveStreamingTurn}
                    isLive={true}
                    onCopy={handleCopyMessage}
                  />
                )}
              </div>
            </CitationProvider>
          )}
        </div>

        {/* Input Box Area: one persistent composer. On a new chat the spacer below grows to match the
            messages area so the composer sits centered; after the first message the spacer collapses
            and the composer glides down to the bottom (flex-grow transition). */}
        <div className="shrink-0 px-4 pb-3 pt-1">{composer}</div>

        <div
          aria-hidden={!isWelcome}
          className={`basis-0 min-h-0 overflow-y-auto px-4 transition-[flex-grow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
            isWelcome ? "grow" : "grow-0"
          }`}
        >
          {isWelcome && (
            /* Recommended prompts */
            <ul className="max-w-3xl mx-auto divide-y divide-slate-200/70 dark:divide-white/5">
              {[
                "ช่วยค้นหาข้อมูลและสรุปเอกสาร",
                "วิเคราะห์โค้ดและทดสอบ Function",
                "คำนวณและประมวลผลข้อมูล",
                "แนะนำกลยุทธ์ Knowledge Management",
              ].map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    onClick={() => {
                      setInputMessage(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left text-slate-600 dark:text-slate-400 rounded-lg hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 shrink-0 text-slate-400" />
                    <span className="truncate">{suggestion}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {openCitation && <CitationModal source={openCitation} onClose={() => setOpenCitationId(null)} />}
      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}
      {showGuide && !settingsOpen && <UserGuideModal onClose={closeGuide} />}
      {showPatchNotes && !showGuide && !settingsOpen && <PatchNotesModal onClose={closePatchNotes} />}
    </div>
  );
}

// ────────────── User Bubble ──────────────

function UserBubble({ turn, userName }: { turn: UserTurn; userName: string }) {
  return (
    <div className="flex gap-3 justify-end group">
      <div className="max-w-[85%] sm:max-w-[80%] order-1">
        <div className="bg-[#0055fa] text-white px-4 py-3 rounded-2xl rounded-tr-md text-sm leading-relaxed shadow-sm shadow-[#0055fa]/10 break-words whitespace-pre-wrap">
          {turn.content}
        </div>
      </div>
      <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white text-[10px] font-bold flex items-center justify-center order-2 shadow-xs">
        {userName.charAt(0).toUpperCase()}
      </div>
    </div>
  );
}

// ────────────── Unified Assistant Bubble ──────────────

function UnifiedAssistantBubble({
  turn,
  isLive = false,
  onCopy,
}: {
  turn: UnifiedAssistantTurn;
  isLive?: boolean;
  onCopy: (content: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  // While streaming: open by default. When finished: collapsed by default!
  const [pipelineExpanded, setPipelineExpanded] = useState<boolean>(isLive);

  // Auto-collapse when transition from streaming to finished
  useEffect(() => {
    if (!isLive && !turn.isStreaming) {
      setPipelineExpanded(false);
    }
  }, [isLive, turn.isStreaming]);

  const handleCopy = () => {
    // The [cite:N] markers only make sense inside the chat (as buttons), so they are left out of the copy
    onCopy(stripCitationTags(turn.finalContent));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalToolCalls = useMemo(() => {
    return turn.steps.reduce((acc, s) => acc + s.tools.length, 0);
  }, [turn.steps]);

  const hasPipeline = turn.steps.length > 0 || Boolean(turn.finalReasoning);

  return (
    <div className="flex gap-3 group">
      {/* Bot Icon */}
      <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
        <Bot className="w-4 h-4" />
      </div>

      {/* Unified Bubble Card */}
      <div className="flex-1 min-w-0 bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm shadow-slate-900/10 dark:shadow-slate-900/5 space-y-3 transition-all">
        {/* Header bar: Model, Status & Copy */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-white/5 pb-2.5">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {turn.model_name || "AI Agent"}
            </span>

            {/* Live Streaming Loop Beacon / Finished badge */}
            {isLive || turn.isStreaming ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-500/15 text-[#0055fa] dark:text-blue-300 border border-blue-200/80 dark:border-blue-500/30 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0055fa] animate-ping" />
                <span>
                  Loop {turn.currentLoop || 1}/{turn.maxSteps || 10}
                </span>
                {turn.statusMessage && (
                  <span className="hidden sm:inline opacity-80 truncate max-w-[220px]">
                    • {turn.statusMessage}
                  </span>
                )}
              </span>
            ) : turn.stopped ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20">
                <Square className="w-2.5 h-2.5 fill-current" />
                <span>
                  หยุดการตอบแล้ว
                  {turn.steps.length > 0 && ` • ${turn.steps.length} ขั้นตอน`}
                </span>
              </span>
            ) : hasPipeline ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-transparent">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>
                  ประมวลผล {turn.steps.length} ขั้นตอน
                  {totalToolCalls > 0 && ` (${totalToolCalls} Tools)`}
                </span>
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {turn.finalContent && (
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-transparent rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-all cursor-pointer"
                title="คัดลอกคำตอบ"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span className="hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── Reasoning & Tool Execution Pipeline (Collapsible) ─── */}
        {hasPipeline && (
          <div className="rounded-xl border border-purple-200 dark:border-purple-500/20 bg-purple-50/70 dark:bg-purple-950/15 overflow-hidden transition-all">
            {/* Pipeline Accordion Toggle Bar */}
            <button
              type="button"
              onClick={() => setPipelineExpanded(!pipelineExpanded)}
              className="w-full flex items-center justify-between px-3.5 py-2 hover:bg-purple-100/70 dark:hover:bg-purple-900/20 transition-colors text-left cursor-pointer select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-lg bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400">
                  <Brain className="w-3.5 h-3.5" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <span className="text-xs font-semibold text-purple-900 dark:text-purple-200">
                    {isLive || turn.isStreaming
                      ? "กำลังคิดวิเคราะห์และเรียกใช้เครื่องมือ..."
                      : "กระบวนการคิดและเรียกใช้เครื่องมือ"}
                  </span>
                  <span className="text-[10px] text-purple-700/80 dark:text-purple-300/80 font-mono">
                    ({turn.steps.length} ขั้นตอน
                    {totalToolCalls > 0 ? `, ${totalToolCalls} Tools` : ""})
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-purple-600 dark:text-purple-400">
                <span className="hidden sm:inline text-[10px] font-normal opacity-80">
                  {pipelineExpanded ? "ย่อ" : "คลิกดูขั้นตอน"}
                </span>
                {pipelineExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </div>
            </button>

            {/* Expanded Timeline Content */}
            {pipelineExpanded && (
              <div className="p-3.5 pt-2 border-t border-purple-200 dark:border-purple-500/20 space-y-4 text-xs">
                {turn.steps.map((step) => (
                  <div key={step.step} className="relative pl-4 border-l-2 border-purple-300 dark:border-purple-800/50 space-y-2">
                    {/* Step Beacon Header */}
                    <div className="flex items-center gap-2 -ml-[23px]">
                      <div className="w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] font-bold shadow-xs">
                        {step.step}
                      </div>
                      <span className="font-semibold text-purple-950 dark:text-purple-200 font-mono text-[11px]">
                        รอบที่ {step.step} (Loop {step.step})
                      </span>
                      {step.status === "running" && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-100 dark:bg-blue-500/20 text-[#0055fa] animate-pulse">
                          กำลังประมวลผล...
                        </span>
                      )}
                    </div>

                    {/* Step Thinking Process */}
                    {step.reasoning && (
                      <div className="rounded-lg bg-white dark:bg-[#070b16] border border-purple-200 dark:border-purple-900/30 p-2.5 text-slate-700 dark:text-slate-300 leading-relaxed font-sans space-y-1">
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-purple-700 dark:text-purple-400">
                          <Brain className="w-3 h-3" />
                          <span>ความคิดวิเคราะห์ (Thinking):</span>
                        </div>
                        <div className="text-xs whitespace-pre-wrap">
                          <InlineMarkdown text={step.reasoning} />
                        </div>
                      </div>
                    )}

                    {/* Step Tool Calls Execution Cards */}
                    {step.tools.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                          เครื่องมือที่เรียกใช้ (Tools Executed):
                        </div>
                        {step.tools.map((tool) => (
                          <StepToolCard key={tool.id} tool={tool} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {/* Final Synthesis Reasoning (if present) */}
                {turn.finalReasoning && (
                  <div className="relative pl-4 border-l-2 border-emerald-400 dark:border-emerald-800/50 space-y-1.5">
                    <div className="flex items-center gap-2 -ml-[23px]">
                      <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold">
                        ✓
                      </div>
                      <span className="font-semibold text-emerald-900 dark:text-emerald-300 text-[11px]">
                        การวิเคราะห์และสังเคราะห์คำตอบสุดท้าย (Final Synthesis)
                      </span>
                    </div>
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 p-2.5 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      <InlineMarkdown text={turn.finalReasoning} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Final Synthesized Answer (คำตอบสรุป) ─── */}
        <div>
          {turn.finalContent ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-slate-900 dark:text-slate-100">
              <MessageContent content={turn.finalContent} />
              {(isLive || turn.isStreaming) && (
                <span className="inline-block w-2 h-4 bg-[#0055fa] rounded-xs animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          ) : isLive || turn.isStreaming ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 py-1">
              <RefreshCw className="w-3.5 h-3.5 text-[#0055fa] animate-spin" />
              <span>
                {turn.steps.length > 0
                  ? "รวบรวมข้อมูลเสร็จแล้ว กำลังเรียบเรียงคำตอบสรุป..."
                  : turn.statusMessage || "AI กำลังคิดและประมวลผล..."}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ────────────── Step Tool Card ──────────────

function StepToolCard({ tool }: { tool: AgentToolCallItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`rounded-xl border p-2.5 text-xs transition-all ${
        tool.status === "running"
          ? "bg-blue-50/80 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/25"
          : tool.status === "error"
          ? "bg-rose-50/80 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/25"
          : "bg-white dark:bg-[#070b16] border-slate-300/70 dark:border-white/10 shadow-xs dark:shadow-none"
      }`}
    >
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {tool.status === "running" ? (
            <RefreshCw className="w-3.5 h-3.5 text-[#0055fa] animate-spin shrink-0" />
          ) : tool.status === "error" ? (
            <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          )}

          <span className="font-semibold font-mono text-slate-800 dark:text-slate-200 truncate">
            🔧 {tool.name}
          </span>

          <span
            className={`px-1.5 py-0.2 text-[9px] font-semibold rounded uppercase ${
              tool.status === "running"
                ? "bg-blue-100 dark:bg-blue-500/20 text-[#0055fa]"
                : tool.status === "error"
                ? "bg-rose-100 dark:bg-rose-500/20 text-rose-600"
                : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600"
            }`}
          >
            {tool.status === "running" ? "กำลังเรียกใช้..." : tool.status === "error" ? "Error" : "เสร็จสิ้น"}
          </span>
        </div>

        <button className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 p-0.5">
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-white/10 space-y-2 font-mono text-[11px]">
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans mb-1">Arguments:</div>
            <pre className="p-2 bg-slate-900 text-slate-200 rounded-lg overflow-x-auto">
              {JSON.stringify(tool.args, null, 2)}
            </pre>
          </div>

          {tool.result && (
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-sans mb-1">Output Result:</div>
              <pre className="p-2 bg-slate-900 text-emerald-400 rounded-lg overflow-x-auto max-h-48 whitespace-pre-wrap">
                {tool.result}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────── Enhanced Message Content Renderer ──────────────

function MessageContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = "";

  // Table buffering
  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (keyIndex: number) => {
    if (tableRows.length === 0) return;
    const headerRow = tableRows[0];
    const bodyRows = tableRows.slice(1);

    elements.push(
      <div key={`table-${keyIndex}`} className="my-3 overflow-x-auto rounded-xl border border-slate-300/70 dark:border-white/10 shadow-xs">
        <table className="w-full text-xs text-left border-collapse">
          {headerRow && (
            <thead className="bg-slate-100 dark:bg-white/5 border-b border-slate-300/70 dark:border-white/10 text-slate-700 dark:text-slate-200 font-semibold">
              <tr>
                {headerRow.map((col, cIdx) => (
                  <th key={cIdx} className="px-3 py-2">
                    <InlineMarkdown text={col.trim()} />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody className="divide-y divide-slate-200 dark:divide-white/5">
            {bodyRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                {row.map((col, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 text-slate-700 dark:text-slate-300">
                    <InlineMarkdown text={col.trim()} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle Code Blocks
    if (line.startsWith("```")) {
      if (inTable) flushTable(i);

      if (inCodeBlock) {
        // Close code block
        elements.push(
          <CodeBlock
            key={`code-${i}`}
            code={codeBuffer.join("\n")}
            language={codeLang}
          />
        );
        codeBuffer = [];
        codeLang = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Handle Markdown Tables (lines starting with |)
    const isTableRow = line.trim().startsWith("|") && line.trim().endsWith("|");
    if (isTableRow) {
      const isDivider = line.replace(/\||-|:|\s/g, "").length === 0;
      if (!isDivider) {
        const cols = line
          .trim()
          .slice(1, -1)
          .split("|")
          .map((c) => c.trim());
        tableRows.push(cols);
        inTable = true;
      }
      continue;
    } else if (inTable) {
      flushTable(i);
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="font-bold text-base mt-4 mb-1.5 text-slate-900 dark:text-slate-100">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="font-bold text-lg mt-5 mb-2 text-slate-900 dark:text-slate-100">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="font-bold text-xl mt-6 mb-2 text-slate-900 dark:text-slate-100">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} className="ml-4 list-disc text-sm my-0.5 text-slate-700 dark:text-slate-200">
          <InlineMarkdown text={line.slice(2)} />
        </li>
      );
    } else if (/^\d+\. /.test(line)) {
      const match = line.match(/^(\d+)\. (.*)$/);
      if (match) {
        elements.push(
          <li key={i} className="ml-4 list-decimal text-sm my-0.5 text-slate-700 dark:text-slate-200">
            <InlineMarkdown text={match[2]} />
          </li>
        );
      }
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-sm my-1 leading-relaxed text-slate-800 dark:text-slate-200">
          <InlineMarkdown text={line} />
        </p>
      );
    }
  }

  if (inTable) {
    flushTable(lines.length);
  }

  if (inCodeBlock && codeBuffer.length > 0) {
    elements.push(
      <CodeBlock
        key="code-unclosed"
        code={codeBuffer.join("\n")}
        language={codeLang}
      />
    );
  }

  return <>{elements}</>;
}

// ────────────── Code Block Component with Copy ──────────────

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-300/70 dark:border-white/10 shadow-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-500 bg-slate-200/60 dark:bg-white/5 border-b border-slate-300/70 dark:border-white/10">
        <span>{language || "code"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="px-4 py-3 text-xs font-mono overflow-x-auto bg-slate-100/70 dark:bg-[#070b16] text-slate-800 dark:text-slate-200 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ────────────── Inline Markdown Renderer ──────────────

function InlineMarkdown({ text }: { text: string }) {
  // [cite:N] markers become buttons that open the source; the text around them is rendered as usual
  if (hasCitationTags(text)) {
    return (
      <>
        {splitCitationTags(text).map((segment, index) =>
          segment.type === "cite" ? (
            <CitationMarks key={index} ids={segment.ids} />
          ) : (
            <InlineMarkdown key={index} text={segment.text} />
          )
        )}
      </>
    );
  }

  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/);
    if (codeMatch) {
      if (codeMatch[1]) parts.push(<span key={key++}>{codeMatch[1]}</span>);
      parts.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 text-xs font-mono bg-slate-100 dark:bg-white/10 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-transparent rounded"
        >
          {codeMatch[2]}
        </code>
      );
      remaining = codeMatch[3];
      continue;
    }

    const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*(.*)$/);
    if (boldMatch) {
      if (boldMatch[1]) parts.push(<span key={key++}>{boldMatch[1]}</span>);
      parts.push(
        <strong key={key++} className="font-semibold text-slate-900 dark:text-white">
          {boldMatch[2]}
        </strong>
      );
      remaining = boldMatch[3];
      continue;
    }

    parts.push(<span key={key++}>{remaining}</span>);
    break;
  }

  return <>{parts}</>;
}
