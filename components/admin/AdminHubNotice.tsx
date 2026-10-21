import React from "react";
import { Info } from "lucide-react";
import { ProductionChatLink, TestChatLink } from "@/components/common/ChatLinks";

/**
 * Explains, on admin pages, that chat here is a test console and where the
 * real chat lives. Keeps admins from mistaking NeuronKnowledge for the
 * end-user chat product.
 */
export default function AdminHubNotice({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="note"
      className="mb-5 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4 p-3.5 sm:p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/25 border border-blue-200/70 dark:border-blue-500/20"
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <span className="p-1.5 rounded-lg bg-white dark:bg-white/5 text-[#0055fa] dark:text-blue-400 shrink-0">
          <Info className="w-4 h-4" aria-hidden="true" />
        </span>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{children}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <TestChatLink variant="secondary">ทดสอบแชท</TestChatLink>
        <ProductionChatLink variant="primary">ใช้งานจริง</ProductionChatLink>
      </div>
    </div>
  );
}
