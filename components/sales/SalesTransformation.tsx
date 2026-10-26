import {
  ArrowRight,
  BadgeCheck,
  Check,
  ClipboardCheck,
  GraduationCap,
  Handshake,
  Repeat,
  Rocket,
  Sparkles,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import ScrollReveal from "@/components/common/ScrollReveal";
import SectionHeading from "@/components/sales/SectionHeading";

const PRINCIPLES = [
  { icon: Repeat, title: "อบรม + Implement พร้อมกัน", text: "เรียนรู้จากงานจริง (On-the-job Training) ไม่ใช่อบรมแล้วจบ" },
  { icon: Users, title: "เริ่มจากคน", text: "อบรมครั้งละ 2–3 ชม. ปรับ Mindset ให้ทีมเห็นว่า AI ทำอะไรได้" },
  { icon: Wrench, title: "Consult ทุก 2–3 วัน", text: "ติดตาม ปรับแก้ และสร้าง Bots ร่วมกับทีมทีละงาน" },
  { icon: UserCheck, title: "AI ทำงานร่วมกับคน", text: "AI เตรียมงานและร่างเอกสาร คนตรวจและอนุมัติก่อนส่งออก" },
  { icon: Sparkles, title: "สร้างวัฒนธรรม", text: "ทีมลูกค้าสร้าง Bots ต่อเองได้หลังจบโครงการ" },
];

const PACKAGE_A = {
  tag: "แพ็กเกจ 1",
  name: "Quick-win Executive Dashboard",
  duration: "ภายในไม่กี่วัน",
  for: "ผู้บริหารที่มีข้อมูลใน ERP หรือระบบอื่นจำนวนมาก แต่ดูยากและใช้ตัดสินใจได้ช้า",
  steps: [
    { when: "วันที่ 1", what: "อบรมปรับ Mindset 2–3 ชม. และกำหนดคำถามของผู้บริหาร" },
    { when: "วันที่ 2–3", what: "ทำงานร่วมกับทีมลูกค้า ปรับการแสดงผลข้อมูลด้วย Claude / ChatGPT" },
    { when: "วันที่ 4–5", what: "ทดลองใช้กับผู้บริหาร ปรับแก้ และส่งมอบ" },
  ],
  deliver: ["Dashboard หรือรายงานรูปแบบใหม่สำหรับผู้บริหาร", "วิธีการและ Prompt ที่ทีมนำไปใช้ซ้ำได้", "ข้อเสนอต่อยอดสู่ AI Transformation"],
};

const PACKAGE_B = {
  tag: "แพ็กเกจ 2",
  name: "AI Transformation",
  duration: "ประมาณ 1–2 เดือน",
  for: "องค์กรที่ต้องการเปลี่ยนวิธีทำงานจริง สร้าง Bots ในหลายงาน และให้ทีมดูแลต่อเองได้",
  steps: [
    { when: "Phase 1", what: "Kick-off และปรับ Mindset — เลือกงานที่จะเริ่ม" },
    { when: "Phase 2", what: "สำรวจ Business Process — ระบุงานซ้ำและจุดที่ต้องให้คนอนุมัติ" },
    { when: "Phase 3", what: "สร้าง Bots ร่วมกัน — Consult ทุก 2–3 วัน ทดลองและปรับแก้" },
    { when: "Phase 4", what: "ขยายผลและสร้างวัฒนธรรม — ทีมลูกค้าสร้างเอง IMC เป็นพี่เลี้ยง" },
    { when: "Phase 5", what: "ส่งมอบและวางแผนต่อ — สรุปผล วัด KPI ส่งมอบเอกสาร" },
  ],
  deliver: [
    "Bots ที่ใช้งานจริง พร้อมจุดอนุมัติโดยคน",
    "แผนผังกระบวนการเดิมและใหม่ (As-is / To-be)",
    "คู่มือใช้งานและดูแล Bots",
    "ทีมภายในที่สร้าง Bots ได้เอง",
    "รายงานสรุปตาม KPI และแผนต่อยอด",
  ],
};

const JOURNEY = [
  { name: "Free Assessment", note: "ฟรี", text: "คุยกับผู้บริหาร/ทีม ประเมินงานที่เหมาะกับ AI และเสนองานนำร่อง" },
  { name: "Workshop หรือ Quick-win", note: "ไม่กี่วัน", text: "อบรม 2–3 ชม. พร้อมลงมือกับงานจริง หรือทำ Executive Dashboard" },
  { name: "AI Transformation", note: "1–2 เดือน", text: "อบรม + Implement พร้อมกัน สร้าง Bots ในงานจริง" },
  { name: "ขยายและดูแล", note: "ต่อเนื่อง", text: "ต่อยอดด้วย Bots, IMC Chat, Knowledge & MCP Hub และ Consult รายเดือน" },
];

const GOVERNANCE = [
  "คนอนุมัติก่อนส่งงานออกทุกครั้ง — Bots ทำเพียงร่างหรือเตรียมงาน",
  "ให้สิทธิ์เท่าที่จำเป็น ใช้ระบบที่องค์กรอนุมัติ และปฏิบัติตาม PDPA",
  "ทุก Bot มีผู้รับผิดชอบ (Owner) ชัดเจน",
  "ทดลองควบคู่กับวิธีเดิมในช่วงแรก และตรวจผลกับข้อมูลต้นทาง",
];

const KPIS = [
  { value: "3–5", label: "Bots ที่ใช้งานจริงในงานประจำ" },
  { value: "2–3", label: "กระบวนการที่เปลี่ยนวิธีทำงาน" },
  { value: "1+", label: "Bot ที่ทีมลูกค้าสร้างเองโดยไม่ต้องมี IMC" },
  { value: "100%", label: "งานส่งออกที่ผ่านการอนุมัติโดยคน" },
];

type Pkg = typeof PACKAGE_A;

function PackageCard({ pkg, accent }: { pkg: Pkg; accent: "blue" | "gold" }) {
  const badge =
    accent === "blue"
      ? "bg-[#0055fa] text-white"
      : "bg-[#fec921] text-slate-900";
  return (
    <article className="h-full flex flex-col rounded-3xl p-7 sm:p-8 bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10 shadow-lg">
      <div className="flex flex-wrap items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${badge}`}>{pkg.tag}</span>
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200">
          {pkg.duration}
        </span>
      </div>
      <h3 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{pkg.name}</h3>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        <strong className="text-slate-800 dark:text-slate-100">เหมาะกับ:</strong> {pkg.for}
      </p>

      <ol className="mt-6 space-y-3">
        {pkg.steps.map((s) => (
          <li key={s.when} className="flex gap-3">
            <span className="shrink-0 w-[4.6rem] text-center px-2 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-[#0055fa] dark:text-blue-300 h-fit">
              {s.when}
            </span>
            <span className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{s.what}</span>
          </li>
        ))}
      </ol>

      <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-white/10">
        <div className="text-sm font-bold text-slate-900 dark:text-white mb-2.5">สิ่งที่ส่งมอบ</div>
        <ul className="space-y-2">
          {pkg.deliver.map((d) => (
            <li key={d} className="flex gap-2.5 text-sm text-slate-600 dark:text-slate-300">
              <Check className="w-4 h-4 mt-0.5 shrink-0 text-[#0055fa] dark:text-[#3b82f6]" aria-hidden />
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function SalesTransformation() {
  return (
    <section id="transformation" className="scroll-mt-24 py-20 sm:py-24 bg-slate-50/70 dark:bg-[#060a13] border-y border-slate-200/70 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="fade-up">
          <SectionHeading
            eyebrow="แพ็กเกจ 1–2"
            title="Quick-win Dashboard และ AI Transformation"
            subtitle="IMC Institute ทำกับองค์กรของตัวเองมาแล้ว จึงพาองค์กรคุณเปลี่ยนทั้ง Mindset วัฒนธรรม และ Business Process — อบรมและ Implement ไปพร้อมกัน ภายในประมาณ 1–2 เดือน"
          />
        </ScrollReveal>

        {/* principles */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {PRINCIPLES.map((p, i) => (
            <ScrollReveal key={p.title} variant="fade-up" delay={i * 70} className="h-full">
              <div className="h-full rounded-2xl p-5 bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10">
                <div className="w-11 h-11 rounded-xl bg-[#fec921] text-slate-900 flex items-center justify-center">
                  <p.icon className="w-5 h-5" aria-hidden />
                </div>
                <h3 className="mt-4 font-bold text-slate-900 dark:text-white leading-snug">{p.title}</h3>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{p.text}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* packages */}
        <ScrollReveal variant="fade-up">
          <h3 className="mt-16 text-center text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">รายละเอียดแพ็กเกจ 1 และ 2</h3>
          <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">ไทม์ไลน์เป็นตัวอย่าง ปรับตามขนาดองค์กรและขอบเขตงาน</p>
        </ScrollReveal>
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ScrollReveal variant="fade-right" className="h-full">
            <PackageCard pkg={PACKAGE_A} accent="gold" />
          </ScrollReveal>
          <ScrollReveal variant="fade-left" className="h-full">
            <PackageCard pkg={PACKAGE_B} accent="blue" />
          </ScrollReveal>
        </div>

        {/* journey */}
        <ScrollReveal variant="fade-up">
          <h3 className="mt-16 text-center text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">เส้นทางลูกค้า: เริ่มเล็ก ขยายตามผล</h3>
        </ScrollReveal>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          {JOURNEY.map((j, i) => (
            <ScrollReveal key={j.name} variant="fade-up" delay={i * 90} className="h-full">
              <div className="relative h-full rounded-2xl p-5 bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <span className="w-9 h-9 rounded-full bg-[#0055fa] text-white font-extrabold flex items-center justify-center">{i + 1}</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#fec921] text-slate-900">{j.note}</span>
                </div>
                <h4 className="mt-4 font-bold text-slate-900 dark:text-white leading-snug">{j.name}</h4>
                <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{j.text}</p>
                {i < JOURNEY.length - 1 && (
                  <ArrowRight className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 p-1 rounded-full bg-white dark:bg-[#0d1424] text-[#0055fa] border border-slate-200 dark:border-white/10 z-10" aria-hidden />
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal variant="fade-up" delay={100}>
          <div className="mt-14 rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10 flex flex-col md:flex-row md:items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-[#fec921] text-slate-900 flex items-center justify-center shrink-0">
              <Rocket className="w-6 h-6" aria-hidden />
            </div>
            <div>
              <div className="font-bold text-slate-900 dark:text-white">Quick-win ให้ผู้บริหาร ภายในไม่กี่วัน</div>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                องค์กรลูกค้า 2 แห่ง (ไม่เปิดเผยชื่อ) ปรับการแสดงผลข้อมูล ERP และข้อมูลอื่นให้ผู้บริหารใช้ตัดสินใจได้ ด้วย Claude และ ChatGPT
                โดยเริ่มจากปรับ Mindset ผ่าน On-the-job Training แล้วเปลี่ยน Working Process ในบางงาน
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* governance + KPI */}
        <div className="mt-16 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ScrollReveal variant="fade-right" className="h-full">
            <div className="h-full rounded-3xl p-7 bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#0055fa] text-white flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5" aria-hidden />
                </div>
                <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">AI ที่คุมได้: Governance</h3>
              </div>
              <ul className="mt-5 space-y-3">
                {GOVERNANCE.map((g) => (
                  <li key={g} className="flex gap-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    <BadgeCheck className="w-4 h-4 mt-0.5 shrink-0 text-[#0055fa] dark:text-[#3b82f6]" aria-hidden />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
          <ScrollReveal variant="fade-left" className="h-full">
            <div className="h-full rounded-3xl p-7 bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#fec921] text-slate-900 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" aria-hidden />
                </div>
                <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">วัดผลด้วย KPI ที่ตกลงร่วมกัน</h3>
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-3">
                {KPIS.map((k) => (
                  <div key={k.label} className="rounded-2xl p-4 bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10">
                    <dt className="text-3xl font-extrabold tracking-tight text-[#0055fa] dark:text-[#60a5fa]">{k.value}</dt>
                    <dd className="mt-1 text-xs text-slate-600 dark:text-slate-300 leading-snug">{k.label}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">ตัวอย่างเป้าหมาย ตกลงร่วมกันกับลูกค้าแต่ละรายใน Phase 1</p>
            </div>
          </ScrollReveal>
        </div>

        {/* CTA */}
        <ScrollReveal variant="zoom-in">
          <div className="mt-12 rounded-3xl px-6 sm:px-10 py-9 bg-gradient-to-r from-[#0055fa] to-[#003d9c] text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl shadow-[#0055fa]/20">
            <div className="flex items-start gap-4">
              <Handshake className="w-9 h-9 shrink-0 text-[#fec921]" aria-hidden />
              <div>
                <h3 className="text-2xl font-extrabold tracking-tight">เริ่มจาก Free Assessment</h3>
                <p className="mt-1 text-sm sm:text-base text-blue-100">คุยกับทีม IMC เพื่อประเมินงานที่เหมาะกับ AI และเลือกงานนำร่อง โดยไม่มีค่าใช้จ่าย</p>
              </div>
            </div>
            <a
              href="#contact"
              className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-base font-bold text-slate-900 bg-[#fec921] hover:bg-[#f0bb10] transition-colors"
            >
              นัด Free Assessment <ArrowRight className="w-5 h-5" aria-hidden />
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
