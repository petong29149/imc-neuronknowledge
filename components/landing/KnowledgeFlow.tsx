"use client";

import React, { useState } from "react";
import { 
  Database, 
  Cpu, 
  Layers, 
  FileText, 
  HardDrive, 
  Sparkles, 
  Bot, 
  Workflow,
  BookOpen,
  ShieldCheck,
  Zap
} from "lucide-react";
import ScrollReveal from "@/components/common/ScrollReveal";

interface FlowNode {
  id: string;
  title: string;
  subtitle: string;
  category: "input" | "engine" | "factory" | "output";
  specs: { label: string; value: string }[];
  description: string;
}

const FLOW_NODES: Record<string, FlowNode> = {
  "our-knowledge": {
    id: "our-knowledge",
    title: "Our Knowledge (Ready Knowledge)",
    subtitle: "คลังความรู้สำเร็จรูปของ IMC Institute",
    category: "input",
    description: "คลังข้อมูลที่ถูกกลั่นกรองและตรวจสอบโดยผู้เชี่ยวชาญ ครอบคลุมกฎหมาย, การแพทย์, ศุลกากร, การเงิน และมาตรฐานอุตสาหกรรม พร้อมใช้งานทันทีโดยไม่ต้องเริ่มต้นเทรนใหม่",
    specs: [
      { label: "Domains", value: "Medical, Trade, Legal, Finance, HR" },
      { label: "Curation", value: "IMC Domain Experts" },
      { label: "Update Frequency", value: "Real-time Regulatory Updates" },
      { label: "Data Quality", value: "Gold-standard Structured Chunks" }
    ]
  },
  "your-knowledge": {
    id: "your-knowledge",
    title: "Your Knowledge (Enterprise Data)",
    subtitle: "ข้อมูลเฉพาะขององค์กรคุณ",
    category: "input",
    description: "นำเข้าเอกสารลับและระบบงานภายในของคุณอย่างปลอดภัย ทั้งคู่มือปฏิบัติการ (SOP), สัญญา, ฐานข้อมูลองค์กร, REST API และ Intranet Portal",
    specs: [
      { label: "File Formats", value: "PDF, DOCX, XLSX, Markdown, JSON" },
      { label: "Data Sources", value: "PostgreSQL, MySQL, Oracle, S3" },
      { label: "Connectors", value: "REST API, Webhook, Crawler" },
      { label: "Security", value: "Tenant-isolated encryption at rest" }
    ]
  },
  "knowledge-engine": {
    id: "knowledge-engine",
    title: "Knowledge Engine & Qdrant Vector DB",
    subtitle: "เครื่องยนต์ประมวลผล RAG อัจฉริยะ",
    category: "engine",
    description: "ทำการแปลงเอกสาร (Ingestion), ตัดแบ่งท่อนแบบเข้าใจไวยากรณ์ (Semantic Chunking), สร้างเวกเตอร์ผ่าน Dense & Sparse Embeddings และจัดเก็บลง Qdrant พร้อมตัวกรอง Payload ระดับ Tenant",
    specs: [
      { label: "Vector Database", value: "Qdrant (HNSW Indexing)" },
      { label: "Search Mode", value: "Hybrid (Dense Vector + BM25 Sparse)" },
      { label: "Query Latency", value: "< 12ms Average Retrieval" },
      { label: "Tenant Filter", value: "Row-Level & Collection Isolation" }
    ]
  },
  "agent-factory": {
    id: "agent-factory",
    title: "AI Agent Factory (OpenRouter Orchestration)",
    subtitle: "ศูนย์สร้างและกำกับ Agent เฉพาะทาง",
    category: "factory",
    description: "ผสาน Prompt Engineering, Guardrails ป้องกัน Hallucination และส่งต่อให้ OpenRouter เพื่อกระจายงานไปยังโมเดลที่เหมาะสมที่สุด (Claude 3.7, GPT-4o, DeepSeek R1) พร้อมระบบ Auto-Failover",
    specs: [
      { label: "LLM Gateway", value: "OpenRouter Multi-model Engine" },
      { label: "Guardrail", value: "Strict Grounding & Citation Enforcer" },
      { label: "Failover", value: "Automatic zero-downtime routing" },
      { label: "Tool Calling", value: "Function calling & API triggers" }
    ]
  },
  "agent-output": {
    id: "agent-output",
    title: "Deployment & Enterprise Endpoints",
    subtitle: "ช่องทางส่งมอบ Agent สู่ผู้ใช้งาน",
    category: "output",
    description: "ใช้งานได้หลากหลายรูปแบบ ทั้ง Open WebUI-style Web Harness, REST API สำหรับต่อยอดระบบเดิม, และเชื่อมต่อเข้ากับ Slack, Microsoft Teams, หรือ LINE OA ขององค์กร",
    specs: [
      { label: "Web Harness", value: "Next.js 16 Responsive UI" },
      { label: "Developer API", value: "OpenAPI 3.1 & SDKs" },
      { label: "Chat Integrations", value: "LINE OA, Teams, Slack, Web Widget" },
      { label: "Governance", value: "PostgreSQL RBAC + Full Audit Logs" }
    ]
  }
};

export default function KnowledgeFlow() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("knowledge-engine");
  const selectedNode = FLOW_NODES[selectedNodeId] || FLOW_NODES["knowledge-engine"];

  return (
    <section id="architecture" className="py-24 relative overflow-hidden bg-white dark:bg-[#070b14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <ScrollReveal variant="fade-up">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-[#0055fa] dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 mb-3">
              <Workflow className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "12s" }} />
              <span>Interactive Knowledge Flow</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              โครงสร้างการทำงาน (Knowledge Flow Architecture)
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
              สถาปัตยกรรมระดับองค์กรที่เชื่อมต่อจากแหล่งข้อมูลดิบ สู่ Qdrant Vector Engine และส่งมอบผ่าน OpenRouter ได้อย่างไร้รอยต่อ
              <span className="block text-sm text-[#0055fa] dark:text-blue-400 mt-1 font-medium">
                (คลิกที่แต่ละบล็อกเพื่อดูสเปกและกลไกเชิงลึก)
              </span>
            </p>
          </div>
        </ScrollReveal>

        {/* Visual Architecture Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left / Center Diagram Nodes */}
          <ScrollReveal variant="fade-right" delay={100} className="lg:col-span-7 space-y-3">
            
            {/* Step 1: Input Dual Lanes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Lane A: Our Knowledge */}
              <button
                onClick={() => setSelectedNodeId("our-knowledge")}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                  selectedNodeId === "our-knowledge"
                    ? "bg-blue-50/80 dark:bg-blue-950/40 border-[#0055fa] shadow-md ring-2 ring-[#0055fa]/20 scale-[1.01]"
                    : "bg-slate-50 dark:bg-[#0d1424] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:-translate-y-0.5"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[#0055fa] dark:text-blue-400 uppercase tracking-wider mb-2">
                  <BookOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>OUR KNOWLEDGE</span>
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  Ready Knowledge (IMC)
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Medical • Trade • Legal • Finance • HR
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono">
                    Pre-curated
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-mono">
                    Regulatory
                  </span>
                </div>
              </button>

              {/* Lane B: Your Knowledge */}
              <button
                onClick={() => setSelectedNodeId("your-knowledge")}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                  selectedNodeId === "your-knowledge"
                    ? "bg-blue-50/80 dark:bg-blue-950/40 border-[#0055fa] shadow-md ring-2 ring-[#0055fa]/20 scale-[1.01]"
                    : "bg-slate-50 dark:bg-[#0d1424] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:-translate-y-0.5"
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  <HardDrive className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                  <span>YOUR KNOWLEDGE</span>
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  Custom Enterprise Data
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  PDF • Docs • Database • REST API • Web
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-mono">
                    Multi-source
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-mono">
                    Tenant Isolated
                  </span>
                </div>
              </button>

            </div>

            {/* Connecting Flow Indicator with Animated Data Beam */}
            <div className="relative flex items-center justify-center py-1">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/50 text-[10px] font-mono text-[#0055fa] dark:text-blue-400 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#fec921] animate-ping"></span>
                <span>Ingestion Stream ➔ Qdrant Vector Engine</span>
                <span className="animate-pulse">⚡</span>
              </div>
            </div>

            {/* Step 2: Knowledge Engine & Qdrant */}
            <button
              onClick={() => setSelectedNodeId("knowledge-engine")}
              className={`w-full p-6 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                selectedNodeId === "knowledge-engine"
                  ? "bg-blue-50/80 dark:bg-blue-950/40 border-[#0055fa] shadow-md ring-2 ring-[#0055fa]/20 scale-[1.01]"
                  : "bg-slate-50 dark:bg-[#0d1424] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:-translate-y-0.5"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0055fa] dark:text-blue-400 uppercase tracking-wider">
                  <Database className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  <span>CORE KNOWLEDGE ENGINE</span>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[#fec921]/15 text-[#b48206] dark:text-[#fec921] border border-[#fec921]/30">
                  Qdrant Vector DB
                </span>
              </div>
              <div className="font-extrabold text-base text-slate-900 dark:text-white">
                Ingestion • Smart Chunking • Embedding • Vector Indexing • Hybrid RAG
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                ทำการสกัดโครงสร้างข้อความ คัดแยกตารางและย่อหน้า แปลงเป็น Dense Vector ใน Qdrant พร้อมจัดเก็บ Source Metadata สำหรับ Citation
              </p>
            </button>

            {/* Connecting Flow Indicator with Animated Data Beam */}
            <div className="relative flex items-center justify-center py-1">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/50 text-[10px] font-mono text-[#0055fa] dark:text-blue-400 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Hybrid RAG Context ➔ Agent Factory</span>
                <span className="animate-pulse">⚡</span>
              </div>
            </div>

            {/* Step 3: AI Agent Factory (OpenRouter) */}
            <button
              onClick={() => setSelectedNodeId("agent-factory")}
              className={`w-full p-6 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                selectedNodeId === "agent-factory"
                  ? "bg-blue-50/80 dark:bg-blue-950/40 border-[#0055fa] shadow-md ring-2 ring-[#0055fa]/20 scale-[1.01]"
                  : "bg-slate-50 dark:bg-[#0d1424] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:-translate-y-0.5"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0055fa] dark:text-blue-400 uppercase tracking-wider">
                  <Cpu className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  <span>AI AGENT FACTORY</span>
                </div>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-[#0055fa] dark:text-blue-300 border border-blue-300/40">
                  OpenRouter Gateway
                </span>
              </div>
              <div className="font-extrabold text-base text-slate-900 dark:text-white">
                Guardrails • System Prompt Orchestration • Multi-LLM Routing
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                ประกอบบริบทจาก Vector Context เข้ากับคำสั่งกำกับความปลอดภัย ส่งต่อให้ Claude 3.7, GPT-4o, หรือ DeepSeek R1 โดยตรง
              </p>
            </button>

            {/* Connecting Flow Indicator with Animated Data Beam */}
            <div className="relative flex items-center justify-center py-1">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/50 text-[10px] font-mono text-[#0055fa] dark:text-blue-400 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#fec921] animate-ping"></span>
                <span>Active Inference ➔ Open WebUI & API</span>
                <span className="animate-pulse">⚡</span>
              </div>
            </div>

            {/* Step 4: Tri-Agent Output & Delivery */}
            <button
              onClick={() => setSelectedNodeId("agent-output")}
              className={`w-full p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedNodeId === "agent-output"
                  ? "bg-blue-50/80 dark:bg-blue-950/40 border-[#0055fa] shadow-md ring-2 ring-[#0055fa]/20 scale-[1.01]"
                  : "bg-slate-50 dark:bg-[#0d1424] border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 hover:-translate-y-0.5"
              }`}
            >
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                DEPLOYED AGENTS & INTERFACES
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 rounded-xl bg-white dark:bg-[#131d33] border border-slate-200 dark:border-white/10 hover:border-[#0055fa]/40 transition-colors">
                  <div className="text-lg mb-1">🚀</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Ready Agent</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">ใช้คลังความรู้เรา</div>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-[#131d33] border border-slate-200 dark:border-white/10 hover:border-emerald-500/40 transition-colors">
                  <div className="text-lg mb-1">📁</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Custom Agent</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">ใช้ข้อมูลองค์กร</div>
                </div>
                <div className="p-3 rounded-xl bg-white dark:bg-[#131d33] border border-slate-200 dark:border-white/10 hover:border-amber-500/40 transition-colors">
                  <div className="text-lg mb-1">⚡</div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Hybrid Agent</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">ผสานสองขุมพลัง</div>
                </div>
              </div>
            </button>

          </ScrollReveal>

          {/* Right: Interactive Node Inspector Panel */}
          <ScrollReveal variant="fade-left" delay={200} className="lg:col-span-5 sticky top-28">
            <div className="p-6 sm:p-7 rounded-3xl bg-slate-50/90 dark:bg-[#0d1424] border border-slate-300/80 dark:border-white/15 shadow-xl transition-all">
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0055fa] dark:text-[#60a5fa] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 animate-spin" style={{ animationDuration: "8s" }} />
                  <span>Architecture Deep Dive</span>
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                  Node: {selectedNode.id}
                </span>
              </div>

              <div className="mt-5">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {selectedNode.title}
                </h3>
                <p className="text-xs font-medium text-[#0055fa] dark:text-blue-400 mt-1">
                  {selectedNode.subtitle}
                </p>

                <p className="mt-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {selectedNode.description}
                </p>

                {/* Tech Specs Table */}
                <div className="mt-6 pt-5 border-t border-slate-200 dark:border-white/10">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                    Technical Specifications
                  </div>

                  <div className="space-y-2.5">
                    {selectedNode.specs.map((spec, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-[#121c32] border border-slate-200/80 dark:border-white/5 text-xs hover:border-[#0055fa]/30 transition-colors"
                      >
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          {spec.label}
                        </span>
                        <span className="font-semibold text-slate-900 dark:text-slate-200 font-mono">
                          {spec.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assurance Callout */}
                <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-[#0055fa]/20 text-[#0055fa] dark:text-blue-300 text-xs flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 shrink-0 text-[#0055fa] dark:text-blue-400 mt-0.5" />
                  <div className="leading-snug">
                    <span className="font-bold">Enterprise Guardrail:</span> ทุกข้อมูลในกระบวนการทำงานนี้ถูกควบคุมด้วย PostgreSQL RBAC และ Qdrant Payload Filter ป้องกันข้อมูลรั่วไหลข้ามแผนก 100%
                  </div>
                </div>

              </div>

            </div>
          </ScrollReveal>

        </div>

      </div>
    </section>
  );
}
