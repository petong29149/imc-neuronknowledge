"use client";

import React from "react";
import Image from "next/image";
import { 
  Layers, 
  Check, 
  ArrowRight
} from "lucide-react";
import ScrollReveal from "@/components/common/ScrollReveal";

const PILLARS = [
  {
    id: "01",
    image: "/ready_knowledge.png",
    tag: "Instant Deployment",
    tagColor: "bg-blue-50 dark:bg-blue-950/60 text-[#0055fa] dark:text-blue-400 border-blue-200/80 dark:border-blue-900/50",
    title: "Ready Knowledge",
    subtitle: "เลือกโดเมนแล้วเรียกใช้ Agent ได้ทันที",
    description: "คลังความรู้มาตรฐานระดับประเทศที่ผ่านการตรวจสอบโดยผู้ทรงคุณวุฒิจาก IMC Institute องค์กรไม่ต้องเริ่มเตรียมข้อมูลหรือทำ Data Ingestion ใหม่ตั้งแต่ศูนย์",
    benefits: [
      "ครอบคลุมการแพทย์ (CPG), ศุลกากร (HS Code), กฎหมาย (PDPA), การเงิน และ HR",
      "อัปเดตประกาศ ระเบียบ และกฎหมายใหม่สม่ำเสมอ",
      "มี Benchmark คำถามและ Golden Set ป้องกันคำตอบผิดพลาดล่วงหน้า",
      "พร้อมนำไปเชื่อมต่อเข้ากับช่องทางบริการลูกค้าหรือทีมงานภายในได้ทันที"
    ],
    glowColor: "from-blue-500/20 via-blue-500/10 to-transparent",
    hoverBorder: "hover:border-blue-500/50 dark:hover:border-blue-500/40",
    gradientTop: "from-blue-500/[0.04] to-transparent",
  },
  {
    id: "02",
    image: "/custom_knowledge.png",
    tag: "Your Enterprise Data",
    tagColor: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-900/40",
    title: "Custom Knowledge",
    subtitle: "นำข้อมูลขององค์กรคุณมาต่อยอดได้ทุกรูปแบบ",
    description: "แปลงเอกสารและฐานข้อมูลภายในองค์กรให้กลายเป็นขุมพลังสมอง AI อย่างปลอดภัย รองรับการอ่านและทำความเข้าใจบริบทเฉพาะทางของธุรกิจคุณ",
    benefits: [
      "รองรับไฟล์ PDF, Word, Excel, CSV, PowerPoint, สแกนเอกสารแบบ OCR",
      "เชื่อมต่อ Live Data จาก PostgreSQL, MySQL, SQL Server, Oracle, S3",
      "ระบบ Web Crawler ดูดและอัปเดตข้อมูลจาก Intranet และ Helpdesk อัตโนมัติ",
      "Smart Chunking ที่ตัดคำภาษาไทยและคำศัพท์เทคนิคอลได้อย่างแม่นยำ"
    ],
    glowColor: "from-emerald-500/20 via-emerald-500/10 to-transparent",
    hoverBorder: "hover:border-emerald-500/50 dark:hover:border-emerald-500/40",
    gradientTop: "from-emerald-500/[0.04] to-transparent",
  },
  {
    id: "03",
    image: "/hybrid_knowledge.png",
    tag: "Best of Both Worlds",
    tagColor: "bg-amber-50 dark:bg-amber-950/50 text-[#b48206] dark:text-[#fec921] border-amber-200/80 dark:border-amber-900/40",
    title: "Hybrid Knowledge",
    subtitle: "ผสาน Knowledge ของ IMC กับข้อมูลขององค์กร",
    description: "การผสานสองขุมพลังเพื่อสร้าง AI Agent เฉพาะทางที่ไม่เหมือนใคร ผนึกกฎระเบียบภายนอกเข้ากับคู่มือปฏิบัติงานและข้อมูล ERP ภายใน",
    benefits: [
      "ลดปัญหา AI มั่วเมื่อต้องตอบคำถามที่มีทั้งเงื่อนไขกฎหมายและระเบียบบริษัท",
      "ระบบ Dual-Retrieval ค้นหาทั้งใน Ready Collection และ Private Tenant พร้อมกัน",
      "ปรับจูน Cross-Encoder Reranker ให้ความสำคัญกับข้อมูลภายในเป็นอันดับแรก",
      "ได้ผลลัพธ์ที่ถูกต้องตามมาตรฐานสากล แต่ปรับเข้ากับวัฒนธรรมองค์กรจริง"
    ],
    glowColor: "from-amber-500/20 via-amber-500/10 to-transparent",
    hoverBorder: "hover:border-amber-500/50 dark:hover:border-amber-500/40",
    gradientTop: "from-amber-500/[0.04] to-transparent",
  },
  {
    id: "04",
    image: "/enterprise_ready.png",
    tag: "Bank-Grade Compliance",
    tagColor: "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-200/80 dark:border-indigo-900/40",
    title: "Enterprise Ready",
    subtitle: "มาตรฐานความปลอดภัย ความโปร่งใส และการกำกับดูแล",
    description: "ออกแบบมาเพื่อฝ่าย IT, Security และ Compliance ในองค์กรขนาดใหญ่ ตอบโจทย์นโยบายความมั่นคงปลอดภัยไซเบอร์และ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล",
    benefits: [
      "Source Citation อ้างอิงแหล่งที่มา ชื่อไฟล์ เลขหน้า ย่อหน้า ตรวจสอบย้อนกลับได้ 100%",
      "Role-Based Access Control (RBAC) กำหนดสิทธิ์การเข้าถึงคลังข้อมูลตามแผนก",
      "Audit Log บันทึกทุกคำถามและคำตอบเพื่อการตรวจสอบตามเกณฑ์ PDPA และ ISO",
      "RESTful API, Webhook และ SDK สำหรับเชื่อมเข้ากับระบบงานอัตโนมัติขององค์กร"
    ],
    glowColor: "from-indigo-500/20 via-indigo-500/10 to-transparent",
    hoverBorder: "hover:border-indigo-500/50 dark:hover:border-indigo-500/40",
    gradientTop: "from-indigo-500/[0.04] to-transparent",
  }
];

export default function PillarsSection() {
  return (
    <section id="pillars" className="py-24 relative overflow-hidden bg-slate-50/50 dark:bg-[#070b14]/70 border-b border-slate-200/80 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <ScrollReveal variant="fade-up">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-[#0055fa] dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 mb-3">
              <Layers className="w-3.5 h-3.5" />
              <span>4 Core Pillars</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              เสาหลักแห่งความสำเร็จ
            </h2>
            <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-[#0055fa] dark:text-blue-400 tracking-tight">
              คลังความรู้ + RAG + AI Agents
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
              ยกระดับจากระบบแชตทั่วไป สู่แพลตฟอร์มบริหารจัดการความรู้และปัญญาประดิษฐ์ระดับองค์กร
            </p>
          </div>
        </ScrollReveal>

        {/* 4 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {PILLARS.map((pillar, idx) => {
            return (
              <ScrollReveal key={idx} variant="fade-up" delay={idx * 120}>
                <div
                  className={`group relative p-8 sm:p-9 rounded-3xl bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10 ${pillar.hoverBorder} shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between h-full overflow-hidden`}
                >
                  {/* Subtle Top Card Gradient */}
                  <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${pillar.gradientTop} pointer-events-none`} />

                  {/* Bottom Right Floating Illustration (Behind Content) */}
                  <div className="absolute -bottom-8 -right-8 sm:-bottom-10 sm:-right-10 w-56 h-56 sm:w-64 sm:h-64 lg:w-72 lg:h-72 pointer-events-none select-none z-0 transition-transform duration-500 ease-out group-hover:scale-105 group-hover:-translate-x-1 group-hover:-translate-y-1">
                    {/* Ambient Radial Glow */}
                    <div className={`absolute inset-4 rounded-full bg-gradient-to-br ${pillar.glowColor} blur-2xl opacity-60 dark:opacity-40 group-hover:opacity-90 transition-opacity`} />
                    <Image
                      src={pillar.image}
                      alt={pillar.title}
                      width={300}
                      height={300}
                      className="w-full h-full object-contain relative z-10 opacity-75 sm:opacity-85 dark:opacity-75 group-hover:opacity-100 dark:group-hover:opacity-95 transition-opacity drop-shadow-md"
                    />
                  </div>

                  {/* Card Content (Layered in Front) */}
                  <div className="relative z-10">
                    {/* Top Meta Bar */}
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                          {idx + 1}. {pillar.title}
                        </h3>
                        <div className="text-sm font-semibold text-[#0055fa] dark:text-[#60a5fa] mt-1">
                          {pillar.subtitle}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${pillar.tagColor} hidden lg:block`}>
                        {pillar.tag}
                      </span>
                    </div>

                    {/* Title & Subtitle */}
                    

                    {/* Description */}
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed max-w-xl">
                      {pillar.description}
                    </p>

                    {/* Feature Checklist */}
                    <div className="mt-6 py-6 border-t border-slate-100 dark:border-white/5 space-y-2.5">
                      {pillar.benefits.map((benefit, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200 leading-normal max-w-[85%] sm:max-w-[76%]">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                            <Check className="w-3 h-3 stroke-[2.5]" />
                          </div>
                          <span className="drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)] dark:drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Action Link */}
                  <div className="mt-6 pt-4 relative z-10">
                    <a
                      href="#simulator"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0055fa] dark:text-[#60a5fa] hover:gap-2.5 transition-all group/link"
                    >
                      <span>ดูตัวอย่างการประยุกต์ใช้งานในระบบ</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/link:translate-x-1" />
                    </a>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

      </div>
    </section>
  );
}
