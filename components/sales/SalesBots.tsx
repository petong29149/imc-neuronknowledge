import React from "react";
import { ArrowRight, Boxes, Check, Repeat, Rocket } from "lucide-react";
import ScrollReveal from "@/components/common/ScrollReveal";
import SectionHeading from "@/components/sales/SectionHeading";

const TIERS = [
  {
    icon: Rocket,
    name: "Bot Starter",
    scope: "1 workflow",
    text: "เริ่มจากงานซ้ำที่เห็นผลเร็ว เช่น อีเมลลงทะเบียน → บันทึก CRM → ร่างใบเสนอราคา",
    points: ["Bot 1 ตัว พร้อมจุดอนุมัติ", "คู่มือและอบรมผู้ใช้"],
  },
  {
    icon: Boxes,
    name: "Department Bot Pack",
    scope: "3–5 bots ต่อฝ่าย",
    text: "ชุด bot ตามหน้าที่ เช่น ขาย/ลูกค้า การเงิน การตลาด หลักสูตร เชื่อมต่อกันเป็น Flow",
    points: ["Bots 3–5 ตัว + Flow เชื่อมกัน", "แผนผังงานเดิมและใหม่"],
  },
  {
    icon: Repeat,
    name: "Bot Care",
    scope: "รายเดือน",
    text: "ดูแล ปรับปรุง และเพิ่ม bot อย่างต่อเนื่อง ทบทวนการทำงานของ bots สม่ำเสมอ",
    points: ["ปรับแก้ตามงานจริง", "รายงานการใช้งานประจำเดือน"],
  },
];

const DEPARTMENTS = [
  { name: "ผู้บริหาร", bots: ["COO"] },
  { name: "ลูกค้า", bots: ["Zoom", "Gmail", "LINE training", "Calendar", "Salesforce", "LINE OA"] },
  { name: "การตลาด", bots: ["Marketing", "VDO", "Webinar", "EDM", "Graphic", "Social Media", "Canva", "Content"] },
  { name: "หลักสูตร", bots: ["Public Class", "Google Drive", "Web", "Course Outline", "In-House"] },
  { name: "การเงิน", bots: ["Accounting", "FlowAccount", "Petty Cash"] },
];

const FLOW = [
  "อีเมล New Register เข้ามา",
  "บันทึกใน Salesforce",
  "ออกใบเสนอราคา (FlowAccount)",
  "ร่างอีเมลตอบกลับ",
  "คนตรวจและอนุมัติก่อนส่ง",
];

export default function SalesBots() {
  return (
    <section id="bots" className="scroll-mt-24 py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="fade-up">
          <SectionHeading
            eyebrow="แพ็กเกจ 3"
            title="Bot ทำงานแทนคน"
            subtitle="IMC สร้างและติดตั้ง bot ให้ทำงานซ้ำแทนคนใน workflow จริง ใช้งานได้เลยโดยไม่ต้องรอให้ทีมเรียนรู้ก่อน — และคนยังเป็นผู้อนุมัติก่อนส่งงานออกทุกครั้ง"
          />
        </ScrollReveal>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((t, i) => (
            <ScrollReveal key={t.name} variant="fade-up" delay={i * 90} className="h-full">
              <article className="h-full flex flex-col rounded-3xl p-7 bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#fec921] text-slate-900 flex items-center justify-center">
                    <t.icon className="w-6 h-6" aria-hidden />
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-[#0055fa] dark:text-blue-300">
                    {t.scope}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t.name}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{t.text}</p>
                <ul className="mt-4 space-y-2">
                  {t.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-sm text-slate-700 dark:text-slate-200">
                      <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#0055fa] dark:text-[#3b82f6]" aria-hidden />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </ScrollReveal>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">ขอบเขตและจำนวน bots เป็นข้อเสนอ ปรับตามงานของลูกค้า</p>

        <ScrollReveal variant="fade-up">
          <div className="mt-8 rounded-3xl p-6 sm:p-7 bg-[#003d60] text-white grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#fec921]">แพ็กเกจ 2 · AI Transformation</div>
              <p className="mt-1 text-sm text-blue-100/90 leading-relaxed">สอนและสร้างร่วมกัน ให้ทีมลูกค้าสร้าง Bots ต่อเองได้</p>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-[#fec921]">แพ็กเกจ 3 · Bot ทำงานแทนคน</div>
              <p className="mt-1 text-sm text-blue-100/90 leading-relaxed">IMC ส่งมอบ bot ที่ใช้งานได้เลย — ต่อยอดไปแพ็กเกจ 2 ได้</p>
            </div>
          </div>
        </ScrollReveal>

        {/* proof: IMC's own bots */}
        <ScrollReveal variant="fade-up">
          <h3 className="mt-16 text-center text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">ตัวอย่างจริง: IMC ใช้ 23 Bots</h3>
          <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">Agents (Grok Bot) แบ่งตามฝ่าย เชื่อมกับระบบที่ใช้งานจริง</p>
        </ScrollReveal>
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <ScrollReveal variant="fade-right" className="lg:col-span-4 h-full">
            <div className="h-full rounded-3xl p-8 bg-[#003d60] text-white flex flex-col justify-between">
              <div>
                <div className="text-7xl font-extrabold tracking-tight text-[#fec921]">23</div>
                <div className="text-2xl font-bold">Bots</div>
                <p className="mt-3 text-sm text-blue-100/90 leading-relaxed">
                  ใช้งานจริงทุกฝ่ายใน IMC Institute ตั้งแต่ผู้บริหาร ลูกค้า การตลาด หลักสูตร จนถึงการเงิน
                </p>
              </div>
              <div className="mt-6 pt-5 border-t border-white/20">
                <div className="text-sm font-bold text-[#fec921]">ระบบที่ Bots ทำงานร่วมด้วย</div>
                <p className="mt-1.5 text-sm text-blue-100/90">Gmail · Salesforce · FlowAccount · Google Drive/Sheets · Canva · LINE OA</p>
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal variant="fade-left" className="lg:col-span-8 h-full">
            <div className="h-full rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10">
              <div className="space-y-3">
                {DEPARTMENTS.map((d) => (
                  <div key={d.name} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                    <div className="sm:w-28 shrink-0 text-sm font-bold text-[#003d60] dark:text-[#fec921]">
                      {d.name} <span className="font-medium text-slate-400">({d.bots.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {d.bots.map((b) => (
                        <span
                          key={b}
                          className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-white/10">
                <div className="text-sm font-bold text-slate-900 dark:text-white mb-3">ตัวอย่าง Flow จริง: AI ร่าง คนอนุมัติ</div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  {FLOW.map((f, i) => (
                    <React.Fragment key={f}>
                      <span
                        className={`px-3 py-1.5 rounded-xl ${
                          i === 0
                            ? "bg-[#003d60] text-white"
                            : i === FLOW.length - 1
                              ? "bg-amber-50 dark:bg-[#fec921]/10 text-amber-900 dark:text-[#fec921] border border-[#fec921]"
                              : "bg-[#fec921] text-slate-900"
                        }`}
                      >
                        {f}
                      </span>
                      {i < FLOW.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-slate-400" aria-hidden />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
