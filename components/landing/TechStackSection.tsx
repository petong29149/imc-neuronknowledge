"use client";

import React, { useState } from "react";
import { 
  Cpu, 
  Database, 
  Terminal, 
  ShieldCheck, 
  Zap, 
  Layers, 
  Code, 
  Copy, 
  Check, 
  ExternalLink 
} from "lucide-react";

const STACK_ITEMS = [
  {
    name: "Next.js 16",
    role: "Fullstack Frontend & Backend",
    badge: "App Router & Server Actions",
    description: "สถาปัตยกรรม Fullstack ไร้รอยต่อ รองรับ Edge Token Streaming แสดงผลคำตอบแบบเรียลไทม์ และเก็บความลับ API Keys ฝั่ง Server อย่างปลอดภัยสูงสุด",
    stats: "Sub-50ms SSR & Edge Streaming",
    iconColor: "text-slate-900 dark:text-white"
  },
  {
    name: "PostgreSQL",
    role: "Enterprise Relational Database",
    badge: "Row-Level Security (RLS)",
    description: "ฐานข้อมูลหลักสำหรับบริหารจัดการ Users, Tenants, สิทธิ์การเข้าถึง (RBAC), Session ประวัติการสนทนา และบันทึก Audit Logs ทุกทรานแซกชันเพื่อการตรวจสอบ",
    stats: "ACID Compliance & Multi-tenant RLS",
    iconColor: "text-[#0055fa]"
  },
  {
    name: "Qdrant",
    role: "Vector Search Engine",
    badge: "Rust-Powered HNSW Index",
    description: "เวกเตอร์ดาต้าเบสสมรรถนะสูง รองรับการสืบค้นแบบ Dense และ Sparse Hybrid Search พร้อมตัวกรอง Payload Filtering แยกคอลเลกชันตาม Tenant อย่างเด็ดขาด",
    stats: "< 12ms Average Vector Retrieval",
    iconColor: "text-red-500"
  },
  {
    name: "OpenRouter",
    role: "Unified LLM Gateway",
    badge: "Multi-Model & Zero Lock-in",
    description: "ประตูเชื่อมต่อโมเดลปัญญาประดิษฐ์ชั้นนำของโลก (Claude 3.7, GPT-4o, DeepSeek R1, Gemini 2.5) พร้อมระบบ Failover สำรองอัตโนมัติเมื่อเกิดปัญหา",
    stats: "99.99% Availability & Auto-Failover",
    iconColor: "text-[#fec921]"
  }
];

const CODE_SNIPPET = `// app/api/chat/route.ts
import { NextRequest } from "next/server";
import { QdrantClient } from "@qdrant/js-client-rest";
import { db } from "@/lib/db"; // PostgreSQL with RLS
import { OpenRouterClient } from "@/lib/openrouter";

export async function POST(req: NextRequest) {
  const { tenantId, userQuery, agentId } = await req.json();

  // 1. Verify User & Tenant Scope in PostgreSQL
  const session = await db.verifySession(req, tenantId);
  
  // 2. Query Qdrant with Strict Tenant Payload Filtering
  const qdrant = new QdrantClient({ url: process.env.QDRANT_URL });
  const relevantChunks = await qdrant.search("tenant_knowledge", {
    vector: await generateEmbedding(userQuery),
    filter: {
      must: [
        { key: "tenant_id", match: { value: tenantId } },
        { key: "is_active", match: { value: true } }
      ]
    },
    limit: 4,
    with_payload: true
  });

  // 3. Assemble Grounded Context & Call OpenRouter
  const responseStream = await OpenRouterClient.chat.completions.create({
    model: "anthropic/claude-3-7-sonnet",
    stream: true,
    messages: [
      { role: "system", content: buildSystemPrompt(relevantChunks) },
      { role: "user", content: userQuery }
    ]
  });

  // 4. Log Audit Trail to PostgreSQL asynchronously
  db.auditLog.create({ tenantId, query: userQuery, chunksRetrieved: relevantChunks.length });

  return new Response(responseStream.toReadableStream());
}`;

export default function TechStackSection() {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(CODE_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="tech-stack" className="py-24 relative bg-slate-50/50 dark:bg-[#060a13] border-b border-slate-200/80 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-[#0055fa] dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 mb-3">
            <Zap className="w-3.5 h-3.5" />
            <span>Developer-Grade Tech Stack</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            สถาปัตยกรรมระดับ Production ไร้ Vendor Lock-in
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
            สร้างขึ้นด้วยเทคโนโลยีที่เสถียรที่สุดในปัจจุบัน ผสาน Next.js, PostgreSQL, Qdrant และ OpenRouter เข้าด้วยกันอย่างสมบูรณ์แบบ
          </p>
        </div>

        {/* 4 Stack Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {STACK_ITEMS.map((item, index) => (
            <div
              key={index}
              className="p-6 rounded-3xl bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-white/10">
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  {item.name}
                </h3>
                <div className="text-xs font-semibold text-[#0055fa] dark:text-blue-400 mt-0.5">
                  {item.role}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5">
                <div className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>{item.stats}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Code Snippet Card */}
        <div className="rounded-3xl border border-slate-300 dark:border-white/15 bg-white dark:bg-[#0a0f1d] shadow-2xl overflow-hidden">
          
          <div className="flex items-center justify-between px-6 py-4 bg-slate-100 dark:bg-[#080d18] border-b border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-3">
              <Code className="w-4 h-4 text-[#0055fa]" />
              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                app/api/chat/route.ts • Architecture Implementation
              </span>
            </div>
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <div className="p-6 font-mono text-xs text-slate-800 dark:text-slate-300 overflow-x-auto leading-relaxed bg-[#f8fafc] dark:bg-[#070b14]">
            <pre className="text-slate-800 dark:text-slate-200">
              <code>{CODE_SNIPPET}</code>
            </pre>
          </div>

        </div>

      </div>
    </section>
  );
}
