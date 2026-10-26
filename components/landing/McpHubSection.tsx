import React from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Bot,
  Database,
  FlaskConical,
  Network,
  Plug,
  RefreshCw,
  Search,
  Server,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import ScrollReveal from "@/components/common/ScrollReveal";

type Status = "ready" | "building" | "planned";

const STATUS_STYLE: Record<Status, { label: string; className: string }> = {
  ready: {
    label: "พร้อมใช้",
    className:
      "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-500/25",
  },
  building: {
    label: "กำลังพัฒนา",
    className:
      "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-300/70 dark:border-amber-500/30",
  },
  planned: {
    label: "Phase 2",
    className:
      "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10",
  },
};

function StatusChip({ status }: { status: Status }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${s.className}`}
    >
      {s.label}
    </span>
  );
}

const CAPABILITIES: { icon: LucideIcon; title: string; description: string; status: Status }[] = [
  {
    icon: Plug,
    title: "MCP Server Registry",
    description:
      "เชื่อม MCP Server ภายนอกได้ทั้ง Streamable HTTP, SSE และ Stdio พร้อมตั้ง header / token ต่อเซิร์ฟเวอร์",
    status: "ready",
  },
  {
    icon: RefreshCw,
    title: "Tool Sync & ทดสอบเรียกจริง",
    description:
      "ดึงรายการ Tools อัตโนมัติ เปิด/ปิดรายตัว และทดสอบเรียก Tool พร้อมส่ง arguments ได้ในหน้า Admin",
    status: "ready",
  },
  {
    icon: Bot,
    title: "Agent ↔ Tools",
    description:
      "กำหนดว่า Agent ตัวไหนใช้ Tools และ Skills อะไร พร้อมจำกัดสิทธิ์ตามกลุ่มผู้ใช้งาน",
    status: "ready",
  },
  {
    icon: Search,
    title: "NK MCP Server: search_knowledge",
    description:
      "เปิดคลังความรู้ของ NeuronKnowledge เป็น MCP tool ให้ระบบแชทค้นและอ้างอิงเอกสาร/หน้า/ข้อความได้ (เป้าหมาย Expo 5 พ.ย. 2026)",
    status: "building",
  },
  {
    icon: Network,
    title: "MCP Gateway",
    description:
      "รวมหลาย MCP ต้นทางเป็น server เดียว แยก token และสิทธิ์รายลูกค้า พร้อม rate limit และ audit",
    status: "planned",
  },
];

const TOOL_CATALOG: { name: string; description: string; where: string; status: Status | "chat" }[] = [
  {
    name: "search_knowledge",
    description: "ค้นคลังความรู้ + คืนแหล่งอ้างอิงมีโครงสร้าง",
    where: "NeuronKnowledge",
    status: "building",
  },
  {
    name: "Customs Dept. Import-Export Data",
    description: "ข้อมูลนำเข้า-ส่งออกกรมศุลกากร",
    where: "MCP ข้อมูลการค้า IMC",
    status: "chat",
  },
  {
    name: "Global Trade Atlas",
    description: "สถิติการค้าระหว่างประเทศ",
    where: "MCP ข้อมูลการค้า IMC",
    status: "chat",
  },
  {
    name: "MOC News",
    description: "ข่าวกระทรวงพาณิชย์",
    where: "MCP ข้อมูลการค้า IMC",
    status: "chat",
  },
  {
    name: "Trade Insight News",
    description: "ข่าวเชิงลึกด้านการค้า",
    where: "MCP ข้อมูลการค้า IMC",
    status: "chat",
  },
];

const FLOW: { icon: LucideIcon; label: string; title: string; items: string[]; accent: string }[] = [
  {
    icon: Database,
    label: "แหล่งความรู้และข้อมูล",
    title: "Knowledge Sources",
    items: ["เอกสาร PDF / DOC / Excel", "MCP ข้อมูลการค้า IMC", "เว็บ / ฐานข้อมูล (ภายหลัง)"],
    accent: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10",
  },
  {
    icon: Server,
    label: "ศูนย์กลาง",
    title: "NeuronKnowledge Hub",
    items: ["MCP Registry + Tool Sync", "search_knowledge (MCP server)", "Agent tools · Admin · Token"],
    accent: "text-[#0055fa] dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10",
  },
  {
    icon: BookOpen,
    label: "ผู้เรียกใช้ผ่าน MCP",
    title: "MCP Clients",
    items: ["แชทบอทและ LINE OA", "Claude Desktop / MCP client อื่น", "ระบบของลูกค้า"],
    accent: "text-amber-700 dark:text-[#fec921] bg-amber-50 dark:bg-amber-500/10",
  },
];

const CONTRACT_SNIPPET = `Transport : MCP Streamable HTTP
Endpoint  : /api/mcp
Auth      : Authorization: Bearer \${NK_MCP_TOKEN}
Tool      : search_knowledge
Input     : { query, collection?, top_k? }
Output    : { results: [{ id, title, source,
                          page, snippet, score }] }`;

// showAdminLink=false is used by the sales brochure page (/neuronknowledge), which must not lead into the working app
export default function McpHubSection({ showAdminLink = true }: { showAdminLink?: boolean } = {}) {
  return (
    <section
      id="mcp"
      className="py-24 relative overflow-hidden bg-white dark:bg-[#070b14] border-b border-slate-200/80 dark:border-white/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <ScrollReveal variant="fade-up">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-[#0055fa] dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 mb-3">
              <Plug className="w-3.5 h-3.5" />
              <span>MCP Hub</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ศูนย์กลาง MCP Server &amp; Tools
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
              NeuronKnowledge รวมเครื่องมือและคลังความรู้ไว้ที่เดียว แล้วให้ระบบแชทและ MCP client อื่นเรียกใช้ผ่านมาตรฐาน Model Context Protocol
            </p>
          </div>
        </ScrollReveal>

        {/* Flow: sources -> hub -> clients */}
        <ScrollReveal variant="fade-up" delay={80}>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-3 md:gap-2 mb-12">
            {FLOW.map((node, idx) => {
              const Icon = node.icon;
              const isHub = idx === 1;
              return (
                <React.Fragment key={node.title}>
                  <div
                    className={`p-5 rounded-2xl border shadow-xs ${
                      isHub
                        ? "bg-blue-50/70 dark:bg-blue-950/30 border-[#0055fa]/40 ring-2 ring-[#0055fa]/10"
                        : "bg-slate-50 dark:bg-[#0d1424] border-slate-200 dark:border-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`p-2 rounded-xl shrink-0 ${node.accent}`}>
                        <Icon className="w-5 h-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {node.label}
                        </div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{node.title}</div>
                      </div>
                    </div>
                    <ul className="space-y-1.5">
                      {node.items.map((item) => (
                        <li
                          key={item}
                          className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2"
                        >
                          <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {idx < FLOW.length - 1 && (
                    <div className="flex items-center justify-center text-slate-400 dark:text-slate-500">
                      <ArrowDown className="w-5 h-5 md:hidden" aria-hidden="true" />
                      <ArrowRight className="w-5 h-5 hidden md:block" aria-hidden="true" />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Capabilities */}
          <ScrollReveal variant="fade-right" delay={100} className="lg:col-span-7">
            <div className="space-y-3">
              {CAPABILITIES.map((cap) => {
                const Icon = cap.icon;
                return (
                  <div
                    key={cap.title}
                    className="flex items-start gap-4 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10 hover:border-[#0055fa]/40 transition-colors"
                  >
                    <span className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0055fa] dark:text-blue-400 shrink-0">
                      <Icon className="w-5 h-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                          {cap.title}
                        </h3>
                        <StatusChip status={cap.status} />
                      </div>
                      <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {cap.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollReveal>

          {/* Tool catalog + contract */}
          <ScrollReveal variant="fade-left" delay={150} className="lg:col-span-5">
            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-slate-50 dark:bg-[#0d1424] overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">ตัวอย่าง MCP Tools</h3>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">ที่ผู้ช่วย AI เรียกใช้ได้</span>
              </div>
              <ul className="divide-y divide-slate-200 dark:divide-white/10">
                {TOOL_CATALOG.map((tool) => (
                  <li key={tool.name} className="px-5 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold text-slate-900 dark:text-white break-words">
                        {tool.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {tool.description} · {tool.where}
                      </div>
                    </div>
                    {tool.status === "chat" ? (
                      <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap bg-blue-50 dark:bg-blue-500/10 text-[#0055fa] dark:text-blue-400 border-blue-200/80 dark:border-blue-500/25">
                        ใช้ในแชทจริง
                      </span>
                    ) : (
                      <StatusChip status={tool.status} />
                    )}
                  </li>
                ))}
              </ul>

              <div className="border-t border-slate-200 dark:border-white/10 bg-slate-900 dark:bg-black/40 px-5 py-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-mono text-slate-400">
                    contract · search_knowledge v1 (ร่าง)
                  </span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                </div>
                <pre className="text-[11px] leading-relaxed font-mono text-slate-200 overflow-x-auto">
                  {CONTRACT_SNIPPET}
                </pre>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {showAdminLink && (
          <>
            {/* Actions */}
            <ScrollReveal variant="fade-up" delay={120}>
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/admin/mcp"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 text-sm sm:text-base font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-xl shadow-md shadow-[#0055fa]/20 transition-all active:scale-[0.98]"
                >
                  <Server className="w-4 h-4" />
                  <span>จัดการ MCP ใน Admin Console</span>
                </Link>
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
                <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Admin Console สำหรับผู้ดูแลระบบเท่านั้น (ต้องเข้าสู่ระบบ)</span>
              </p>
            </ScrollReveal>
          </>
        )}
      </div>
    </section>
  );
}
