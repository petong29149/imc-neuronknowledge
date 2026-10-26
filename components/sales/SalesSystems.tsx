import React from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock, MessageSquare, Network, Plug } from "lucide-react";
import ScrollReveal from "@/components/common/ScrollReveal";
import SectionHeading from "@/components/sales/SectionHeading";
import { NEURONHUB_PATH, NEURONKNOWLEDGE_PATH } from "@/lib/sales/links";

const HUB_FEATURES = [
  "ถาม-ตอบพร้อมอ้างอิงแหล่งที่มา กดดูเอกสาร หน้า และข้อความต้นทางได้",
  "Agent เลือกเรียก Tools / MCP ตามคำถามเอง",
  "Skills โหลดเมื่อจำเป็น ประหยัด token",
  "กราฟที่ระบบวาดจากข้อมูลจริง ไม่ให้โมเดลเขียนโค้ด",
  "ค้นประวัติ เก็บถาวร และแชร์บทสนทนา",
  "Embed Widget ฝังช่องแชทในเว็บไซต์ขององค์กร",
  "Prompt & Skill Market: สมาชิกเสนอ แอดมินอนุมัติ แล้วติดตั้งใช้ได้",
  "สิทธิ์ตามกลุ่ม โควตา Rate limit และ Audit Log",
];

const KNOWLEDGE_CORE = [
  "MCP Hub: ทะเบียนและเรียกใช้ Tools (Streamable HTTP, SSE, Stdio)",
  "Multi-LLM: ต่อโมเดลแบบ OpenAI-compatible สลับได้โดยไม่ต้อง Restart",
  "Agents & Skills พร้อมสิทธิ์ตามกลุ่มผู้ใช้",
  "Admin Console, Token Analytics และส่งออก Excel",
];

const KNOWLEDGE_SOON = [
  "Studio สำหรับ Creator: เชื่อมฐานข้อมูล สร้าง Knowledge Set เพิ่ม Use case และสร้าง Agent",
  "Knowledge Engine: ตัดคำไทย Hybrid RAG และ Citation",
  "Playground และชุดสอบวัดความแม่นยำก่อนเผยแพร่",
];

export default function SalesSystems() {
  return (
    <section id="systems" className="scroll-mt-24 py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="fade-up">
          <SectionHeading
            eyebrow="แพ็กเกจ 3 และ 4"
            title="สองระบบที่ทำงานร่วมกัน"
            subtitle="NeuronHub คือหน้าแชท AI ของผู้ใช้งาน ส่วน NeuronKnowledge คือศูนย์รวม MCP Server และความรู้ — กดดูรายละเอียดได้จากปุ่มในแต่ละการ์ด"
          />
        </ScrollReveal>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* NeuronHub */}
          <ScrollReveal variant="fade-right" className="h-full">
            <article className="h-full flex flex-col rounded-3xl p-7 sm:p-8 bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#0055fa] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#0055fa]/30">
                  <MessageSquare className="w-7 h-7" aria-hidden />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">แพ็กเกจ 3 · หน้าแชท AI สำหรับผู้ใช้งาน</div>
                  <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">NeuronHub</h3>
                </div>
              </div>

              <p className="mt-5 text-slate-600 dark:text-slate-300 leading-relaxed">
                หน้าแชทผู้ช่วย AI ที่ถามเป็นภาษาไทยได้ Agent เรียกใช้เครื่องมือและความรู้เอง แล้วตอบพร้อมแหล่งอ้างอิงที่ตรวจย้อนกลับได้
                เหมาะกับพนักงาน ลูกค้า และผู้เข้าร่วมงานที่ต้องการคำตอบเร็วและเชื่อถือได้
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {["ใช้ร่วม (Shared)", "แยกของตัวเอง (Dedicated): โดเมน SSO Widget"].map((e) => (
                  <span key={e} className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-[#0055fa] dark:text-blue-300">
                    {e}
                  </span>
                ))}
              </div>

              <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm text-slate-600 dark:text-slate-300">
                {HUB_FEATURES.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#0055fa] dark:text-[#3b82f6]" aria-hidden />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-8">
                <Link
                  href={NEURONHUB_PATH}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-base font-bold text-white bg-[#0055fa] hover:bg-[#0047d1] shadow-lg shadow-[#0055fa]/30 transition-colors"
                >
                  ดูหน้า NeuronHub <ArrowRight className="w-5 h-5" aria-hidden />
                </Link>
              </div>
            </article>
          </ScrollReveal>

          {/* NeuronKnowledge */}
          <ScrollReveal variant="fade-left" className="h-full">
            <article className="h-full flex flex-col rounded-3xl p-7 sm:p-8 bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#fec921] text-slate-900 flex items-center justify-center shrink-0 shadow-md shadow-[#fec921]/30">
                  <Network className="w-7 h-7" aria-hidden />
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">แพ็กเกจ 4 · ศูนย์รวม MCP Server และความรู้</div>
                  <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">NeuronKnowledge</h3>
                </div>
              </div>

              <p className="mt-5 text-slate-600 dark:text-slate-300 leading-relaxed">
                ศูนย์รวม MCP Server ของ IMC รวมเครื่องมือ (MCP Tools) คลังความรู้ และ Agent ไว้ที่เดียว ให้ NeuronHub และ MCP client อื่นเรียกใช้
                พร้อมคอนโซลแอดมินสำหรับกำกับดูแลผู้ใช้ โมเดล และการใช้งาน
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {["Ready", "Custom", "Hybrid", "Cloud / On-premise"].map((e) => (
                  <span
                    key={e}
                    className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-[#fec921]/10 text-amber-900 dark:text-[#fec921] border border-amber-200/70 dark:border-[#fec921]/20"
                  >
                    {e}
                  </span>
                ))}
              </div>

              <div className="mt-6">
                <div className="text-sm font-bold text-slate-900 dark:text-white mb-3">ความสามารถหลัก</div>
                <ul className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                  {KNOWLEDGE_CORE.map((f) => (
                    <li key={f} className="flex gap-2.5">
                      <Plug className="w-4 h-4 mt-0.5 shrink-0 text-[#0055fa] dark:text-[#3b82f6]" aria-hidden />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 rounded-2xl p-4 bg-amber-50/80 dark:bg-[#fec921]/10 border border-amber-200/70 dark:border-[#fec921]/20">
                <div className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-[#fec921] mb-2">
                  <Clock className="w-4 h-4" aria-hidden /> กำลังเปิดตัว (AI Expo พ.ย. 2026)
                </div>
                <ul className="space-y-1.5 text-sm text-slate-700 dark:text-slate-300 list-disc pl-5 marker:text-[#fec921]">
                  {KNOWLEDGE_SOON.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto pt-8">
                <Link
                  href={NEURONKNOWLEDGE_PATH}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-base font-bold text-slate-900 bg-[#fec921] hover:bg-[#f0bb10] shadow-lg shadow-[#fec921]/30 transition-colors"
                >
                  ดูหน้า NeuronKnowledge <ArrowRight className="w-5 h-5" aria-hidden />
                </Link>
              </div>
            </article>
          </ScrollReveal>
        </div>

        {/* How the two connect */}
        <ScrollReveal variant="fade-up" delay={100}>
          <div className="mt-8 rounded-3xl p-6 sm:p-7 bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-4 text-center">
              {[
                { t: "ความรู้และ Tools", s: "NeuronKnowledge" },
                { t: "MCP", s: "เชื่อมต่อมาตรฐาน" },
                { t: "แชท / Widget / ช่องทางอื่น", s: "NeuronHub" },
              ].map((n, i) => (
                <React.Fragment key={n.t}>
                  <div className="rounded-2xl px-4 py-3 bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10">
                    <div className="font-bold text-slate-900 dark:text-white">{n.t}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{n.s}</div>
                  </div>
                  {i < 2 && <ArrowRight className="hidden md:block w-5 h-5 text-[#0055fa] dark:text-[#60a5fa] mx-auto" aria-hidden />}
                </React.Fragment>
              ))}
            </div>
            <p className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
              NeuronHub ต่อ MCP Tools ได้อยู่แล้ว การให้ค้นคลังความรู้ของ NeuronKnowledge ผ่าน MCP กำลังเปิดใช้ในช่วง AI Expo
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
