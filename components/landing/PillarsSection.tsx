"use client";

import React from "react";
import { 
  Rocket, 
  Database, 
  Layers, 
  ShieldCheck, 
  Check, 
  ArrowRight,
  FileCheck2,
  Lock,
  GitMerge,
  Cpu,
  Sparkles
} from "lucide-react";
import ScrollReveal from "@/components/common/ScrollReveal";

const PILLARS = [
  {
    icon: Rocket,
    tag: "Instant Deployment",
    tagColor: "bg-blue-100 dark:bg-blue-950/60 text-[#0055fa] dark:text-blue-400 border-blue-200 dark:border-blue-900/50",
    title: "1. Ready Knowledge",
    subtitle: "เลือกโดเมนแล้วเรียกใช้ Agent ได้ทันที",
    description: "คลังความรู้มาตรฐานระดับประเทศที่ผ่านการตรวจสอบโดยผู้ทรงคุณวุฒิจาก IMC Institute องค์กรไม่ต้องเริ่มเตรียมข้อมูลหรือทำ Data Ingestion ใหม่ตั้งแต่ศูนย์",
    benefits: [
      "ครอบคลุมการแพทย์ (CPG), ศุลกากร (HS Code), กฎหมาย (PDPA), การเงิน และ HR",
      "อัปเดตประกาศ ระเบียบ และกฎหมายใหม่สม่ำเสมอ",
      "มี Benchmark คำถามและ Golden Set ป้องกันคำตอบผิดพลาดล่วงหน้า",
      "พร้อมนำไปเชื่อมต่อเข้ากับช่องทางบริการลูกค้าหรือทีมงานภายในได้ทันที"
    ],
    accentGradient: "from-blue-500/10 via-blue-500/5 to-transparent"
  },
  {
    icon: Database,
    tag: "Your Enterprise Data",
    tagColor: "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40",
    title: "2. Custom Knowledge",
    subtitle: "นำข้อมูลขององค์กรคุณมาต่อยอดได้ทุกรูปแบบ",
    description: "แปลงเอกสารและฐานข้อมูลภายในองค์กรให้กลายเป็นขุมพลังสมอง AI อย่างปลอดภัย รองรับการอ่านและทำความเข้าใจบริบทเฉพาะทางของธุรกิจคุณ",
    benefits: [
      "รองรับไฟล์ PDF, Word, Excel, CSV, PowerPoint, สแกนเอกสารแบบ OCR",
      "เชื่อมต่อ Live Data จาก PostgreSQL, MySQL, SQL Server, Oracle, S3",
      "ระบบ Web Crawler ดูดและอัปเดตข้อมูลจาก Intranet และ Helpdesk อัตโนมัติ",
      "Smart Chunking ที่ตัดคำภาษาไทยและคำศัพท์เทคนิคอลได้อย่างแม่นยำ"
    ],
    accentGradient: "from-emerald-500/10 via-emerald-500/5 to-transparent"
  },
  {
    icon: GitMerge,
    tag: "Best of Both Worlds",
    tagColor: "bg-amber-100 dark:bg-amber-950/50 text-[#b48206] dark:text-[#fec921] border-amber-200 dark:border-amber-900/40",
    title: "3. Hybrid Knowledge",
    subtitle: "ผสาน Knowledge ของ IMC กับข้อมูลขององค์กร",
    description: "การผสานสองขุมพลังเพื่อสร้าง AI Agent เฉพาะทางที่ไม่เหมือนใคร ผนึกกฎระเบียบภายนอกเข้ากับคู่มือปฏิบัติงานและข้อมูล ERP ภายใน",
    benefits: [
      "ลดปัญหา AI มั่วเมื่อต้องตอบคำถามที่มีทั้งเงื่อนไขกฎหมายและระเบียบบริษัท",
      "ระบบ Dual-Retrieval ค้นหาทั้งใน Ready Collection และ Private Tenant พร้อมกัน",
      "ปรับจูน Cross-Encoder Reranker ให้ความสำคัญกับข้อมูลภายในเป็นอันดับแรก",
      "ได้ผลลัพธ์ที่ถูกต้องตามมาตรฐานสากล แต่ปรับเข้ากับวัฒนธรรมองค์กรจริง"
    ],
    accentGradient: "from-amber-500/10 via-amber-500/5 to-transparent"
  },
  {
    icon: ShieldCheck,
    tag: "Bank-Grade Compliance",
    tagColor: "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/40",
    title: "4. Enterprise Ready",
    subtitle: "มาตรฐานความปลอดภัย ความโปร่งใส และการกำกับดูแล",
    description: "ออกแบบมาเพื่อฝ่าย IT, Security และ Compliance ในองค์กรขนาดใหญ่ ตอบโจทย์นโยบายความมั่นคงปลอดภัยไซเบอร์และ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล",
    benefits: [
      "Source Citation อ้างอิงแหล่งที่มา ชื่อไฟล์ เลขหน้า ย่อหน้า ตรวจสอบย้อนกลับได้ 100%",
      "Role-Based Access Control (RBAC) กำหนดสิทธิ์การเข้าถึงคลังข้อมูลตามแผนก",
      "Audit Log บันทึกทุกคำถามและคำตอบเพื่อการตรวจสอบตามเกณฑ์ PDPA และ ISO",
      "RESTful API, Webhook และ SDK สำหรับเชื่อมเข้ากับระบบงานอัตโนมัติขององค์กร"
    ],
    accentGradient: "from-indigo-500/10 via-indigo-500/5 to-transparent"
  }
];

export default function PillarsSection() {
  return (
    <section id="pillars" className="py-24 relative overflow-hidden bg-slate-50/50 dark:bg-[#070b14]/70 border-b border-slate-200/80 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
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
            const Icon = pillar.icon;
            return (
              <ScrollReveal key={idx} variant="fade-up" delay={idx * 120}>
                <div
                  className="group relative p-8 rounded-3xl bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10 hover:border-[#0055fa]/50 dark:hover:border-[#0055fa]/50 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between h-full"
                >
                  <div>
                    {/* Top Meta Bar */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="w-12 h-12 rounded-2xl bg-[#0055fa]/10 dark:bg-[#0055fa]/20 text-[#0055fa] dark:text-[#60a5fa] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${pillar.tagColor}`}>
                        {pillar.tag}
                      </span>
                    </div>

                    {/* Title & Subtitle */}
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                      {pillar.title}
                    </h3>
                    <div className="text-sm font-semibold text-[#0055fa] dark:text-[#60a5fa] mt-1">
                      {pillar.subtitle}
                    </div>

                    {/* Description */}
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-3 leading-relaxed">
                      {pillar.description}
                    </p>

                    {/* Feature Checklist */}
                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 space-y-2.5">
                      {pillar.benefits.map((benefit, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 leading-normal">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-4">
                    <a
                      href="#simulator"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0055fa] dark:text-[#60a5fa] hover:gap-2.5 transition-all"
                    >
                      <span>ดูตัวอย่างการประยุกต์ใช้งานในระบบ</span>
                      <ArrowRight className="w-3.5 h-3.5" />
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
