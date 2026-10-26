import Link from "next/link";
import { ArrowRight, BookOpen, Check, Server, Users } from "lucide-react";
import ScrollReveal from "@/components/common/ScrollReveal";
import SectionHeading from "@/components/sales/SectionHeading";
import { HUB_PATH } from "@/lib/sales/links";

const PILLARS = [
  {
    icon: Users,
    kicker: "คน + กระบวนการ",
    name: "AI Transformation",
    tagline: "อบรม + ลงมือทำจริงพร้อมกัน",
    points: [
      "Workshop 2–3 ชม. ปรับ Mindset ให้ทีมเห็นว่า AI ทำอะไรได้",
      "Consult ทุก 2–3 วัน สร้าง Bots ร่วมกับทีมในงานจริง",
      "AI ร่างงาน คนตรวจและอนุมัติก่อนส่งออก",
    ],
    result: "ทีมใช้ AI เป็น และสร้าง Bots ต่อเองได้",
    href: "#transformation",
    cta: "ดูแพ็กเกจ",
    internal: false,
  },
  {
    icon: BookOpen,
    kicker: "ความรู้",
    name: "NeuronKnowledge",
    tagline: "Domain Knowledge Agent Platform",
    points: [
      "คลังความรู้เฉพาะทางพร้อมใช้ (Ready) หรือใช้ข้อมูลองค์กร (Custom) หรือผสมกัน (Hybrid)",
      "ต่อ PDF, DOC, Excel, ฐานข้อมูล, API และเว็บไซต์",
      "คำตอบอ้างอิงแหล่งที่มาได้",
    ],
    result: "Agent เฉพาะทางที่ตอบจากความรู้ที่เชื่อถือได้",
    href: HUB_PATH,
    cta: "เข้า NeuronHub",
    internal: true,
  },
  {
    icon: Server,
    kicker: "แพลตฟอร์ม",
    name: "NeuronHub",
    tagline: "Gen-AI Gateway สำหรับองค์กร",
    points: [
      "รวมโมเดลหลายค่ายและ MCP Tools ผ่านจุดเดียว",
      "ติดตั้งได้ทั้ง Cloud และ On-premise / Private Cloud",
      "กำหนดสิทธิ์ตามกลุ่มผู้ใช้ และตรวจสอบการใช้งานได้",
    ],
    result: "ควบคุมข้อมูลและโมเดลได้เอง",
    href: HUB_PATH,
    cta: "เข้า NeuronHub",
    internal: true,
  },
];

export default function SalesPillars() {
  return (
    <section id="services" className="scroll-mt-24 py-20 sm:py-24 bg-slate-50/70 dark:bg-[#060a13] border-y border-slate-200/70 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="fade-up">
          <SectionHeading
            eyebrow="สิ่งที่ IMC นำเสนอ"
            title="3 เสาหลักที่ช่วยให้ AI ใช้งานได้จริง"
            subtitle="เลือกซื้อแยกตามโจทย์ หรือรวมเป็นชุดเดียว: คน + ความรู้ + แพลตฟอร์ม"
          />
        </ScrollReveal>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILLARS.map((p, i) => (
            <ScrollReveal key={p.name} variant="fade-up" delay={i * 100} className="h-full">
              <article className="h-full flex flex-col rounded-3xl p-7 bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#fec921] text-slate-900 flex items-center justify-center shrink-0">
                    <p.icon className="w-7 h-7" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{p.kicker}</div>
                    <h3 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">{p.name}</h3>
                  </div>
                </div>
                <p className="mt-5 font-semibold text-slate-800 dark:text-slate-100">{p.tagline}</p>
                <ul className="mt-4 space-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                  {p.points.map((t) => (
                    <li key={t} className="flex gap-2.5">
                      <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#0055fa] dark:text-[#3b82f6]" aria-hidden />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 rounded-2xl px-4 py-3 bg-amber-50 dark:bg-[#fec921]/10 border border-amber-200/70 dark:border-[#fec921]/20">
                  <div className="text-xs font-semibold text-amber-800 dark:text-[#fec921]">ผลลัพธ์ที่ได้</div>
                  <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{p.result}</div>
                </div>
                <div className="mt-auto pt-6">
                  {p.internal ? (
                    <Link
                      href={p.href}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0055fa] dark:text-[#60a5fa] hover:gap-2.5 transition-all"
                    >
                      {p.cta} <ArrowRight className="w-4 h-4" aria-hidden />
                    </Link>
                  ) : (
                    <a
                      href={p.href}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0055fa] dark:text-[#60a5fa] hover:gap-2.5 transition-all"
                    >
                      {p.cta} <ArrowRight className="w-4 h-4" aria-hidden />
                    </a>
                  )}
                </div>
              </article>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
