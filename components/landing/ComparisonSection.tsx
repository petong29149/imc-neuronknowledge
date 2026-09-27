"use client";

import React from "react";
import { Check, X, ShieldAlert, Award, Sparkles } from "lucide-react";
import ScrollReveal from "@/components/common/ScrollReveal";

const COMPARISONS = [
  {
    feature: "ความถูกต้องและการป้องกันการตอบเพี้ยน (Anti-Hallucination)",
    publicAi: "มีความเสี่ยงสูง (แต่งข้อความและข้อมูลอ้างอิงเท็จ)",
    diyAi: "ปานกลาง (ขึ้นอยู่กับการเขียน Prompt ทั่วไป)",
    neuron: "สูงสุด (Strict Grounding Guardrails ไม่ออกคำตอบหากไม่มี Citation)",
    highlight: true
  },
  {
    feature: "การอ้างอิงแหล่งที่มา (Source Citation & Traceability)",
    publicAi: "ไม่มี หรืออ้างอิงเป็นลิงก์กว้างๆ",
    diyAi: "แสดงชื่อไฟล์ แต่ตรวจสอบตำแหน่งย่อหน้ายาก",
    neuron: "แม่นยำ 100% ระบุชื่อเอกสาร เลขหน้า และพารากราฟที่ดึงจาก Qdrant",
    highlight: true
  },
  {
    feature: "คลังความรู้พร้อมใช้งาน (Pre-built Domain Knowledge)",
    publicAi: "ไม่มี (รู้แบบกว้างแต่ไม่ลึกในข้อกำหนดเฉพาะทาง)",
    diyAi: "ไม่มี (ต้องเตรียม Ingest เอกสารเองตั้งแต่ศูนย์)",
    neuron: "มีพร้อมใช้ทันที (Medical CPG, ศุลกากร HS Code, PDPA, กฎหมายแรงงาน)",
    highlight: true
  },
  {
    feature: "การแยกแยะและรักษาความลับข้อมูล (Tenant Data Isolation)",
    publicAi: "เสี่ยงต่อการรั่วไหล ไม่รองรับ On-Premise",
    diyAi: "ต้องดูแลโครงสร้างดาต้าเบสเอง ขาด RLS",
    neuron: "ปลอดภัยขั้นสูงสุด (Qdrant Tenant Namespaces + PostgreSQL RLS)",
    highlight: false
  },
  {
    feature: "ความต่อเนื่องในการให้บริการ (Multi-LLM Redundancy)",
    publicAi: "ผูกขาดกับผู้ให้บริการรายเดียว",
    diyAi: "ระบบหยุดทำงานเมื่อ API Key หรือ Model เกิด Error",
    neuron: "ไร้รอยต่อผ่าน OpenRouter (สลับ Claude 3.7, GPT-4o, DeepSeek ทันที)",
    highlight: false
  },
  {
    feature: "การกำกับดูแลและการตรวจสอบ (RBAC & Audit Logging)",
    publicAi: "ไม่มีสำหรับงานกำกับดูแลระดับองค์กร",
    diyAi: "จำกัด ขาดระบบบันทึก Log สำหรับการตรวจประเมิน",
    neuron: "ครบถ้วนตามเกณฑ์มาตรฐานความปลอดภัยไซเบอร์และ PDPA",
    highlight: false
  }
];

export default function ComparisonSection() {
  return (
    <section className="py-24 relative overflow-hidden bg-white dark:bg-[#070b14] border-b border-slate-200/80 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <ScrollReveal variant="fade-up">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-[#0055fa] dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 mb-3">
              <Award className="w-3.5 h-3.5" />
              <span>Why Enterprise Chooses Us</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ทำไมต้อง NeuronKnowledge?
            </h2>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#0055fa] dark:text-blue-400 tracking-tight">
              แตกต่างจาก AI ทั่วไปอย่างไร
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
              เปรียบเทียบชัดเจนระหว่างการใช้ Public AI ทั่วไป กับแพลตฟอร์ม Enterprise Harness ที่ออกแบบมาเพื่อความแม่นยำทางธุรกิจ
            </p>
          </div>
        </ScrollReveal>

        {/* Comparison Table */}
        <ScrollReveal variant="fade-up" delay={120}>
          <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-white/10 shadow-lg">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-[#0d1424] border-b border-slate-200 dark:border-white/10 text-xs uppercase tracking-wider font-semibold">
                <th className="py-5 px-6 text-slate-600 dark:text-slate-300 w-2/5">คุณสมบัติและความสามารถ</th>
                <th className="py-5 px-4 text-slate-500 dark:text-slate-400 w-1/5">Public AI ทั่วไป</th>
                <th className="py-5 px-4 text-slate-500 dark:text-slate-400 w-1/5">DIY Open WebUI</th>
                <th className="py-5 px-6 text-[#0055fa] dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/30 font-bold w-1/5 border-l border-r border-[#0055fa]/20">
                  <div className="flex items-center gap-1.5">
                    <span>NeuronKnowledge</span>
                    <span className="w-2 h-2 rounded-full bg-[#fec921]"></span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-xs sm:text-sm">
              {COMPARISONS.map((row, index) => (
                <tr 
                  key={index}
                  className={`hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors ${
                    row.highlight ? "bg-slate-50/30 dark:bg-white/[0.01]" : ""
                  }`}
                >
                  <td className="py-4.5 px-6 font-semibold text-slate-900 dark:text-white">
                    {row.feature}
                  </td>
                  <td className="py-4.5 px-4 text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <X className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{row.publicAi}</span>
                    </div>
                  </td>
                  <td className="py-4.5 px-4 text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-[10px] shrink-0">~</span>
                      <span>{row.diyAi}</span>
                    </div>
                  </td>
                  <td className="py-4.5 px-6 font-semibold text-slate-900 dark:text-slate-100 bg-blue-50/40 dark:bg-blue-950/20 border-l border-r border-[#0055fa]/20">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{row.neuron}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </ScrollReveal>

      </div>
    </section>
  );
}
