import Link from "next/link";
import { ArrowRight, ArrowUpRight, ChartColumn, Check, FileText, GraduationCap, MessageSquare, Network } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ScrollReveal from "@/components/common/ScrollReveal";
import SectionHeading from "@/components/sales/SectionHeading";
import { NEURONHUB_PATH, NEURONKNOWLEDGE_PATH, SERVICE_DOC_URL } from "@/lib/sales/links";

type Pkg = {
  no: number;
  icon: LucideIcon;
  name: string;
  tagline: string;
  points: string[];
  tag: string;
  cta: { label: string; href: string; kind: "anchor" | "internal" };
};

const SERVICES: Pkg[] = [
  {
    no: 1,
    icon: ChartColumn,
    name: "Quick-win Dashboard",
    tagline: "ปรับข้อมูล ERP ให้ผู้บริหารตัดสินใจได้ง่ายขึ้น",
    points: [
      "ปรับการแสดงผลข้อมูลให้เข้าใจง่ายและใช้ตัดสินใจได้",
      "ทำร่วมกับทีมลูกค้าด้วย Claude / ChatGPT",
      "ทีมนำวิธีและ Prompt ไปใช้ซ้ำได้",
    ],
    tag: "ระยะสั้น",
    cta: { label: "ดูรายละเอียด", href: "#transformation", kind: "anchor" },
  },
  {
    no: 2,
    icon: GraduationCap,
    name: "AI Transformation",
    tagline: "อบรม + ลงมือสร้าง Bots ที่ทำงานแทนคนในงานจริง",
    points: [
      "Workshop 2–3 ชม. และ Consult ทุก 2–3 วัน",
      "สร้าง Bots ในงานจริง ปรับ Business Process โดยคนอนุมัติก่อนส่งออก",
      "ทีมลูกค้าสร้าง Bots ต่อเองได้ · ดูแลรายเดือนเป็นทางเลือก",
    ],
    tag: "ประมาณ 1–2 เดือน",
    cta: { label: "ดูรายละเอียด", href: "#transformation", kind: "anchor" },
  },
];

const PLATFORMS: Pkg[] = [
  {
    no: 3,
    icon: MessageSquare,
    name: "NeuronHub",
    tagline: "หน้าแชทผู้ช่วย AI ขององค์กร คุยภาษาไทยได้",
    points: [
      "ตอบพร้อมอ้างอิงแหล่งที่มา ตรวจย้อนกลับได้",
      "Agent เรียก Tools / MCP เอง · Skills · Embed Widget",
      "สิทธิ์ตามกลุ่ม โควตา และ Audit Log",
    ],
    tag: "ใช้ร่วม · แยกของตัวเอง",
    cta: { label: "ดูหน้า NeuronHub", href: NEURONHUB_PATH, kind: "internal" },
  },
  {
    no: 4,
    icon: Network,
    name: "NeuronKnowledge",
    tagline: "ศูนย์รวม MCP Server และความรู้ ให้ NeuronHub และ Bots เรียกใช้",
    points: [
      "คลังความรู้ Ready / Custom / Hybrid พร้อมอ้างอิง",
      "ต่อฐานข้อมูล ไฟล์ และ API ผ่าน MCP",
      "ติดตั้ง Cloud หรือ On-premise ควบคุมข้อมูลเอง",
    ],
    tag: "Ready · Custom · Hybrid",
    cta: { label: "ดูหน้า NeuronKnowledge", href: NEURONKNOWLEDGE_PATH, kind: "internal" },
  },
];

const BUNDLES = [
  {
    label: "ทางเข้า",
    title: "Free Assessment · Workshop",
    items: "ฟรี · 2–3 ชม.",
    text: "ประเมินงานที่เหมาะกับ AI และลองลงมือกับงานจริงก่อนตัดสินใจ",
    dark: false,
  },
  {
    label: "ชุดรวม",
    title: "Starter",
    items: "Quick-win Dashboard + NeuronHub",
    text: "เริ่มเล็ก ผู้บริหารเห็นข้อมูลชัดขึ้น และพนักงานได้ลองใช้ AI",
    dark: false,
  },
  {
    label: "ชุดรวม",
    title: "Transformation Suite",
    items: "AI Transformation + NeuronHub + NeuronKnowledge",
    text: "เปลี่ยนคน สร้าง bots ใช้แชทกลาง และรวมความรู้ไว้ที่เดียว",
    dark: true,
  },
];

function CardLink({ cta }: { cta: Pkg["cta"] }) {
  const cls =
    "inline-flex items-center gap-1.5 text-sm font-semibold text-[#0055fa] dark:text-[#60a5fa] hover:gap-2.5 transition-all";
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
            title="4 แพ็กเกจ ตั้งแต่ Dashboard ถึงแพลตฟอร์ม"
            subtitle="เลือกแยกตามโจทย์ หรือรวมเป็นชุดเดียว — เริ่มจาก Free Assessment ได้โดยไม่มีค่าใช้จ่าย"
          />
        </ScrollReveal>

        <div className="mt-12">
          <div className="inline-flex px-4 py-1.5 rounded-full text-sm font-bold bg-[#003d60] text-white">บริการ · ทีม IMC ลงมือทำ</div>
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  {b.label}
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

        <ScrollReveal variant="fade-up">
          <div className="mt-8 rounded-2xl p-5 sm:p-6 bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#0055fa] text-white flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" aria-hidden />
              </div>
              <div>
                <div className="font-bold text-slate-900 dark:text-white">เอกสารรายละเอียดบริการ</div>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">แนวคิด แพ็กเกจ ขั้นตอน และบทบาทของทีมลูกค้ากับ IMC</p>
              </div>
            </div>
            <a
              href={SERVICE_DOC_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-[#0055fa] hover:bg-[#0047d1] transition-colors"
            >
              เปิดเอกสาร <ArrowUpRight className="w-4 h-4" aria-hidden />
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
