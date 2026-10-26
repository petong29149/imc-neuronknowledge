import Link from "next/link";
import { ArrowRight, ArrowUpRight, MessageSquare, Network } from "lucide-react";
import { CHAT_URL, HUB_PATH } from "@/lib/sales/links";

type Props = {
  /** hero = large buttons with a caption, compact = small buttons for the header */
  size?: "hero" | "compact";
  /** hero only: always stack the buttons (for narrow cards) */
  stack?: boolean;
  className?: string;
};

// The two entry points of the sales page. Chat leaves this app (new tab),
// the hub stays inside it and shows the original NeuronHub home.
export default function SalesCtaButtons({ size = "hero", stack = false, className = "" }: Props) {
  if (size === "compact") {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <a
          href={CHAT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-white bg-[#0055fa] hover:bg-[#0047d1] shadow-sm shadow-[#0055fa]/30 transition-colors"
        >
          <MessageSquare className="w-4 h-4" aria-hidden />
          IMC Chat
        </a>
        <Link
          href={HUB_PATH}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 bg-white dark:bg-white/5 border border-slate-300/80 dark:border-white/15 hover:border-[#0055fa]/60 hover:text-[#0055fa] dark:hover:text-[#60a5fa] transition-colors"
        >
          <Network className="w-4 h-4" aria-hidden />
          NeuronHub
        </Link>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${stack ? "" : "sm:flex-row"} gap-4 ${className}`}>
      <a
        href={CHAT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex-1 sm:flex-none sm:min-w-[260px] rounded-2xl px-6 py-4 text-left text-white bg-[#0055fa] hover:bg-[#0047d1] shadow-lg shadow-[#0055fa]/30 transition-all hover:-translate-y-0.5"
      >
        <span className="flex items-center justify-between gap-3 text-lg font-bold">
          <span className="flex items-center gap-2.5">
            <MessageSquare className="w-5 h-5" aria-hidden />
            เข้าสู่ IMC Chat
          </span>
          <ArrowUpRight className="w-5 h-5 opacity-80 group-hover:opacity-100 transition-opacity" aria-hidden />
        </span>
        <span className="mt-1 block text-sm text-blue-100">ผู้ช่วย AI สำหรับผู้ใช้งาน · เปิดในแท็บใหม่</span>
      </a>
      <Link
        href={HUB_PATH}
        className="group flex-1 sm:flex-none sm:min-w-[260px] rounded-2xl px-6 py-4 text-left bg-white dark:bg-white/5 text-slate-900 dark:text-white border border-slate-300/80 dark:border-white/15 hover:border-[#0055fa]/60 shadow-sm transition-all hover:-translate-y-0.5"
      >
        <span className="flex items-center justify-between gap-3 text-lg font-bold">
          <span className="flex items-center gap-2.5">
            <Network className="w-5 h-5 text-[#0055fa] dark:text-[#60a5fa]" aria-hidden />
            เข้าสู่ NeuronHub
          </span>
          <ArrowRight className="w-5 h-5 text-[#0055fa] dark:text-[#60a5fa] group-hover:translate-x-0.5 transition-transform" aria-hidden />
        </span>
        <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">Knowledge &amp; MCP Hub สำหรับองค์กร</span>
      </Link>
    </div>
  );
}
