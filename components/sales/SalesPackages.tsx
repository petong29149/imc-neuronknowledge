import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  ChartColumn,
  Check,
  GraduationCap,
  MessageSquare,
  Network,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ScrollReveal from "@/components/common/ScrollReveal";
import SectionHeading from "@/components/sales/SectionHeading";
import { CHAT_URL, HUB_PATH } from "@/lib/sales/links";

type Pkg = {
  no: number;
  icon: LucideIcon;
  name: string;
  tagline: string;
  points: string[];
  tag: string;
  cta: { label: string; href: string; kind: "anchor" | "internal" | "external" };
};

const SERVICES: Pkg[] = [
  {
    no: 1,
    icon: ChartColumn,
    name: "Quick-win Dashboard",
    tagline: "ปรับข้อมูล ERP ให้ผู้บริหารตัดสินใจได้เร็ว",
    points: [
      "ปรับการแสดงผลข้อมูลให้เข้าใจง่ายและใช้ตัดสินใจได้",
      "ทำร่วมกับทีมลูกค้าด้วย Claude / ChatGPT",
      "ทีมนำวิธีและ Prompt ไปใช้ซ้ำได้",
    ],
    tag: "ภายในไม่กี่วัน",
    cta: { label: "ดูรายละเอียด", href: "#transformation", kind: "anchor" },
  },
  {
    no: 2,
    icon: GraduationCap,
    name: "AI Transformation",
    tagline: "อบรม + Implement พร้อมกัน เปลี่ยนคนและกระบวนการ",
    points: [
      "Workshop 2–3 ชม. และ Consult ทุก 2–3 วัน",
      "สร้าง Bots ในงานจริง ปรับ Business Process",
      "ทีมลูกค้าสร้าง Bots ต่อเองได้",
    ],
    tag: "ประมาณ 1–2 เดือน",
    cta: { label: "ดูรายละเอียด", href: "#transformation", kind: "anchor" },
  },
  {
    no: 3,
    icon: Bot,
    name: "Bot ทำงานแทนคน",
    tagline: "IMC สร้าง bot ใน workflow จริง คนอนุมัติก่อนส่ง",
    points: [
      "ส่งมอบ bot ที่ใช้งานได้เลย เชื่อมระบบที่ใช้อยู่",
      "คนอนุมัติก่อนส่งงานออกทุกครั้ง",
      "เริ่มที่ 1 workflow แล้วขยายเป็นชุดต่อฝ่าย",
    ],
    tag: "Starter · Dept Pack · Care",
    cta: { label: "ดูรายละเอียด", href: "#bots", kind: "anchor" },
  },
];

const PLATFORMS: Pkg[] = [
  {
    no: 4,
    icon: MessageSquare,
    name: "IMC Chat",
    tagline: "หน้าแชทผู้ช่วย AI ขององค์กร ตอบพร้อมอ้างอิงแหล่งที่มา",
    points: [
      "Agent เรียก Tools / MCP เอง กดดูแหล่งอ้างอิงได้",
      "Skills, Prompt Market และ Embed Widget",
      "สิทธิ์ตามกลุ่ม โควตา และ Audit Log",
    ],
    tag: "ใช้ร่วม · แยกของตัวเอง",
    cta: { label: "เข้าสู่ IMC Chat", href: CHAT_URL, kind: "external" },
  },
  {
    no: 5,
    icon: Network,
    name: "Knowledge & MCP Hub",
    tagline: "ตัวรวมความรู้และ MCP Tools ให้ Chat และ Bots เรียกใช้",
    points: [
      "คลังความรู้ Ready / Custom / Hybrid พร้อมอ้างอิง",
      "ต่อฐานข้อมูล ไฟล์ และ API ผ่าน MCP",
      "ติดตั้ง Cloud หรือ On-premise ควบคุมข้อมูลเอง",
    ],
    tag: "Ready · Custom · Hybrid",
    cta: { label: "เข้าสู่ NeuronHub", href: HUB_PATH, kind: "internal" },
  },
];

const BUNDLES = [
  {
    title: "ทางเข้า",
    items: "Free Assessment (ฟรี) · Workshop 2–3 ชม.",
    text: "ประเมินงานที่เหมาะกับ AI และลองลงมือกับงานจริงก่อนตัดสินใจ",
    dark: false,
  },
  {
    title: "Starter",
    items: "Quick-win Dashboard + IMC Chat",
    text: "เริ่มเล็ก เห็นผลเร็ว ผู้บริหารและพนักงานใช้ได้ทันที",
    dark: false,
  },
  {
    title: "Transformation Suite",
    items: "AI Transformation + Bots + IMC Chat + Knowledge & MCP Hub",
    text: "เปลี่ยนคน ทำ bot ให้ ใช้แชทกลาง และรวมความรู้ไว้ที่เดียว",
    dark: true,
  },
];

function CardLink({ cta }: { cta: Pkg["cta"] }) {
  const cls =
    "inline-flex items-center gap-1.5 text-sm font-semibold text-[#0055fa] dark:text-[#60a5fa] hover:gap-2.5 transition-all";
  if (cta.kind === "external") {
    return (
      <a href={cta.href} target="_blank" rel="noopener noreferrer" className={cls}>
        {cta.label} <ArrowUpRight className="w-4 h-4" aria-hidden />
      </a>
    );
  }
  if (cta.kind === "internal") {
    return (
      <Link href={cta.href} className={cls}>
        {cta.label} <ArrowRight className="w-4 h-4" aria-hidden />
      </Link>
    );
  }
  return (
    <a href={cta.href} className={cls}>
      {cta.label} <ArrowRight className="w-4 h-4" aria-hidden />
    </a>
  );
}

function PackageCard({ p, index }: { p: Pkg; index: number }) {
  return (
    <ScrollReveal variant="fade-up" delay={index * 90} className="h-full">
      <article className="h-full flex flex-col rounded-3xl p-7 bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#fec921] text-slate-900 flex items-center justify-center shrink-0">
            <p.icon className="w-7 h-7" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">แพ็กเกจ {p.no}</div>
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
        <div className="mt-6 inline-flex w-fit px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 dark:bg-[#fec921]/10 text-amber-900 dark:text-[#fec921] border border-amber-200/70 dark:border-[#fec921]/20">
          {p.tag}
        </div>
        <div className="mt-auto pt-6">
          <CardLink cta={p.cta} />
        </div>
      </article>
    </ScrollReveal>
  );
}

export default function SalesPackages() {
  return (
    <section id="services" className="scroll-mt-24 py-20 sm:py-24 bg-slate-50/70 dark:bg-[#060a13] border-y border-slate-200/70 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="fade-up">
          <SectionHeading
            eyebrow="แพ็กเกจของ IMC"
            title="5 แพ็กเกจ ตั้งแต่ Dashboard ถึงแพลตฟอร์ม"
            subtitle="เลือกซื้อแยกตามโจทย์ หรือรวมเป็นชุดเดียว — เริ่มจาก Free Assessment ได้โดยไม่มีค่าใช้จ่าย"
          />
        </ScrollReveal>

        <div className="mt-12">
          <div className="inline-flex px-4 py-1.5 rounded-full text-sm font-bold bg-[#003d60] text-white">บริการ · ทีม IMC ลงมือทำ</div>
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-6">
            {SERVICES.map((p, i) => (
              <PackageCard key={p.no} p={p} index={i} />
            ))}
          </div>
        </div>

        <div className="mt-10">
          <div className="inline-flex px-4 py-1.5 rounded-full text-sm font-bold bg-[#003d60] text-white">แพลตฟอร์ม · ใช้งานต่อเนื่อง</div>
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            {PLATFORMS.map((p, i) => (
              <PackageCard key={p.no} p={p} index={i} />
            ))}
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {BUNDLES.map((b, i) => (
            <ScrollReveal key={b.title} variant="fade-up" delay={i * 90} className="h-full">
              <div
                className={`h-full rounded-2xl p-5 border ${
                  b.dark
                    ? "bg-[#003d60] text-white border-[#003d60]"
                    : "bg-white dark:bg-[#0d1424] border-slate-200/90 dark:border-white/10"
                }`}
              >
                <div className={`text-xs font-bold uppercase tracking-wider ${b.dark ? "text-[#fec921]" : "text-[#0055fa] dark:text-[#60a5fa]"}`}>
                  {i === 0 ? "ทางเข้า" : "ชุดรวม"}
                </div>
                <div className={`mt-1 text-lg font-extrabold tracking-tight ${b.dark ? "text-[#fec921]" : "text-slate-900 dark:text-white"}`}>
                  {b.title}
                </div>
                <div className={`mt-1 text-sm font-semibold ${b.dark ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>{b.items}</div>
                <p className={`mt-1.5 text-sm leading-relaxed ${b.dark ? "text-blue-100/90" : "text-slate-600 dark:text-slate-300"}`}>{b.text}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
