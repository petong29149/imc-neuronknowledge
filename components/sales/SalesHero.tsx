import Image from "next/image";
import { ArrowDown, CheckCircle2 } from "lucide-react";
import ScrollReveal from "@/components/common/ScrollReveal";
import SalesCtaButtons from "@/components/sales/SalesCtaButtons";

const STATS = [
  { value: "23", label: "Bots ที่ IMC ใช้งานจริงทุกฝ่าย" },
  { value: "2–3 ชม.", label: "Workshop ปรับ Mindset" },
  { value: "ไม่กี่วัน", label: "Quick-win Executive Dashboard" },
  { value: "1–2 เดือน", label: "Full Agents Transformation" },
];

const POINTS = ["อบรม + ลงมือทำจริงพร้อมกัน", "AI ร่าง คนอนุมัติ", "ทีมสร้าง Bots ต่อเองได้"];

export default function SalesHero() {
  return (
    <section id="top" className="relative pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden bg-grid-pattern">
      <div className="absolute top-1/3 right-0 w-[560px] h-[420px] bg-[#0055fa]/15 dark:bg-[#0055fa]/20 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse-glow" />
      <div className="absolute top-1/4 left-0 w-[320px] h-[320px] bg-[#fec921]/20 dark:bg-[#fec921]/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-float-slow" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-8">
          <div className="lg:col-span-7 text-center lg:text-left">
            <ScrollReveal variant="fade-down" delay={50}>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 shadow-xs backdrop-blur-sm mb-7">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fec921] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#fec921]" />
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">IMC Institute</span>
                <span className="text-slate-300 dark:text-slate-600">|</span>
                <span className="text-slate-600 dark:text-slate-400">AI Transformation for Organizations</span>
              </div>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" delay={120}>
              <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight leading-[1.15] text-slate-900 dark:text-white">
                เปลี่ยนคน เปลี่ยนกระบวนการ
                <br />
                <span className="text-[#0055fa] dark:text-[#3b82f6]">ให้ AI ทำงานจริง</span>
                <span className="text-[#fec921]">ในองค์กร</span>
              </h1>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" delay={200}>
              <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                IMC Institute ผสาน <strong className="text-slate-900 dark:text-white">การอบรมและการลงมือทำจริง</strong> เข้ากับแพลตฟอร์มความรู้
                (NeuronKnowledge) และ AI Gateway (NeuronHub) ที่องค์กรควบคุมได้เอง — จาก Workshop ไปสู่ Agents
                ที่ใช้งานจริงภายใน 1–2 เดือน
              </p>
              <ul className="mt-6 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2">
                {POINTS.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-[#0055fa] dark:text-[#3b82f6]" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" delay={280}>
              <SalesCtaButtons className="mt-9 justify-center lg:justify-start" />
              <a
                href="#transformation"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-[#0055fa] dark:hover:text-[#60a5fa] transition-colors"
              >
                ดูแพ็กเกจ AI Transformation <ArrowDown className="w-4 h-4" aria-hidden />
              </a>
            </ScrollReveal>
          </div>

          <div className="lg:col-span-5">
            <ScrollReveal variant="zoom-in" delay={200}>
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="absolute inset-6 rounded-[2rem] bg-gradient-to-br from-[#0055fa]/20 to-[#fec921]/20 blur-2xl -z-10" />
                <Image
                  src="/landing/hero_section.png"
                  alt="ภาพรวมแพลตฟอร์ม AI ของ IMC: ความรู้ เอเจนต์ และ MCP"
                  width={1026}
                  height={890}
                  priority
                  className="w-full h-auto drop-shadow-2xl"
                />
              </div>
            </ScrollReveal>
          </div>
        </div>

        <ScrollReveal variant="fade-up" delay={150}>
          <dl className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {STATS.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl px-5 py-4 bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 backdrop-blur-sm"
              >
                <dt className="text-2xl sm:text-3xl font-extrabold text-[#0055fa] dark:text-[#60a5fa] tracking-tight">{s.value}</dt>
                <dd className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">{s.label}</dd>
              </div>
            ))}
          </dl>
        </ScrollReveal>
      </div>
    </section>
  );
}
