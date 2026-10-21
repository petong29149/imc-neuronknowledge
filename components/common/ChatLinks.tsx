import React from "react";
import Link from "next/link";
import { ExternalLink, FlaskConical } from "lucide-react";
import { CHAT_PRODUCTION_HOST, CHAT_PRODUCTION_URL, CHAT_TEST_PATH } from "@/lib/site-links";

type Variant = "primary" | "secondary" | "ghost";

// No display utility here: `display` is a prop so callers can hide a link on
// small screens ("hidden sm:inline-flex") without fighting a base `inline-flex`.
const BASE =
  "items-center justify-center gap-1.5 font-semibold whitespace-nowrap transition-all active:scale-[0.98]";

const SIZES = {
  sm: "px-2.5 xl:px-3 py-1.5 text-xs rounded-xl",
  md: "px-5 py-3 text-sm sm:text-base rounded-xl",
} as const;

const PRODUCTION_VARIANTS: Record<Variant, string> = {
  primary:
    "text-white bg-[#0055fa] hover:bg-[#0046d1] shadow-md shadow-[#0055fa]/20 hover:shadow-lg hover:shadow-[#0055fa]/30",
  secondary:
    "text-[#0055fa] dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/25",
  ghost:
    "text-slate-700 dark:text-slate-200 hover:text-[#0055fa] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-white/5",
};

const TEST_VARIANTS: Record<Variant, string> = {
  primary: "text-white bg-amber-500 hover:bg-amber-600 shadow-md shadow-amber-500/20",
  secondary:
    "text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-300/70 dark:border-amber-500/30",
  ghost:
    "text-slate-600 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-slate-100 dark:hover:bg-white/5",
};

interface ChatLinkProps {
  variant?: Variant;
  size?: keyof typeof SIZES;
  /** Display utilities, e.g. "hidden md:inline-flex". Defaults to always shown. */
  display?: string;
  className?: string;
  /** Overrides the default label. */
  children?: React.ReactNode;
  onClick?: () => void;
}

/**
 * Real chat for end users: the imc-chat-aiagent system. Leaves this app, so it
 * opens in a new tab.
 */
export function ProductionChatLink({
  variant = "primary",
  size = "sm",
  display = "inline-flex",
  className = "",
  children,
  onClick,
}: ChatLinkProps) {
  return (
    <a
      href={CHAT_PRODUCTION_URL}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      title={`ไปใช้งานแชทจริงที่ ${CHAT_PRODUCTION_HOST}`}
      className={`${display} ${BASE} ${SIZES[size]} ${PRODUCTION_VARIANTS[variant]} ${className}`}
    >
      <span>{children ?? "ใช้งานแชทจริง"}</span>
      <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
    </a>
  );
}

/**
 * Test console inside this app: for trying MCP tools and agents, not for
 * end users. Requires login (middleware redirects guests).
 */
export function TestChatLink({
  variant = "secondary",
  size = "sm",
  display = "inline-flex",
  className = "",
  children,
  onClick,
}: ChatLinkProps) {
  return (
    <Link
      href={CHAT_TEST_PATH}
      onClick={onClick}
      title="ทดสอบ MCP Tools / Agent ในหน้าแชททดสอบ (Test console)"
      className={`${display} ${BASE} ${SIZES[size]} ${TEST_VARIANTS[variant]} ${className}`}
    >
      <FlaskConical className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{children ?? "ทดสอบแชท"}</span>
    </Link>
  );
}
