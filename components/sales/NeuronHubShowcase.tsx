import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  ChartColumn,
  Check,
  Globe,
  Layers,
  MessageSquare,
  Network,
  Plug,
  Quote,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Store,
} from "lucide-react";
import ScrollReveal from "@/components/common/ScrollReveal";
import SectionHeading from "@/components/sales/SectionHeading";
import { NEURONKNOWLEDGE_PATH, SHOWCASE_LABEL, SHOWCASE_URL } from "@/lib/sales/links";

const FEATURES = [
  { icon: Quote, title: "คำตอบพร้อมอ้างอิง", text: "กด [1] [2] ดูเอกสาร หน้า และข้อความต้นทางได้" },
  { icon: Plug, title: "เรียก Tools / MCP เอง", text: "Agent เลือกใช้เครื่องมือและความรู้ตามคำถาม" },
  { icon: Layers, title: "Skills โหลดตามต้องการ", text: "ประหยัด token ไม่ยัดคำสั่งทั้งหมดไว้ใน prompt" },
  { icon: ChartColumn, title: "กราฟที่ปลอดภัย", text: "ระบบวาดกราฟจากข้อมูลจริง ไม่ให้โมเดลเขียนโค้ด" },
  { icon: Search, title: "ประวัติ ค้นหา แชร์", text: "ค้นย้อนหลัง เก็บถาวร และแชร์บทสนทนา" },
  { icon: Globe, title: "Embed Widget", text: "ฝังช่องแชทในเว็บไซต์ขององค์กร" },
  { icon: Store, title: "Prompt & Skill Market", text: "สมาชิกเสนอ แอดมินอนุมัติ แล้วติดตั้งใช้ได้" },
  { icon: ShieldCheck, title: "ควบคุมและตรวจสอบ", text: "สิทธิ์ตามกลุ่ม โควตา Rate limit และ Audit Log" },
];

const EDITIONS = [
  {
    name: "ใช้ร่วม (Shared)",
    text: "เริ่มได้เร็ว ใช้ระบบกลางของ IMC เหมาะกับการทดลองใช้งานและทีมขนาดเล็ก",
    points: ["ตั้งผู้ช่วยและ Skills ของทีมได้", "ควบคุมสิทธิ์ตามกลุ่มผู้ใช้"],
  },
  {
    name: "แยกของตัวเอง (Dedicated)",
    text: "ระบบแยกสำหรับองค์กร ใช้โดเมนและการยืนยันตัวตนของคุณเอง",
    points: ["โดเมนและ SSO ขององค์กร", "ฝัง Widget ในเว็บไซต์ของคุณ", "ติดตั้ง Cloud หรือ On-premise ได้"],
  },
];

// A static, clearly-labelled mock of the chat screen. It is not wired to anything.
function ChatMock() {
  return (
    <div
      className="rounded-3xl overflow-hidden border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0d1424] shadow-2xl"
      role="img"
      aria-label="ตัวอย่างหน้าจอแชท NeuronHub (จำลอง)"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03]">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        <span className="ml-3 text-xs font-bold text-slate-600 dark:text-slate-300">NeuronHub</span>
        <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-[#fec921]/15 text-amber-900 dark:text-[#fec921]">
          ตัวอย่างหน้าจอ (จำลอง)
        </span>
      </div>

      <div className="p-4 sm:p-5 space-y-4 text-sm">
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 bg-[#0055fa] text-white">
            ช่วยสรุปขั้นตอนการขออนุมัติลางานให้หน่อย
          </div>
        </div>

        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-[#fec921] text-slate-900 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" aria-hidden />
          </div>
          <div className="max-w-[88%] space-y-2">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
              <Sparkles className="w-3 h-3" aria-hidden /> ค้นความรู้ภายในองค์กร
            </div>
            <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-slate-100 dark:bg-white/[0.06] text-slate-800 dark:text-slate-100 leading-relaxed">
              ขั้นตอนโดยสรุป: 1) ยื่นคำขอลาในระบบ 2) หัวหน้างานพิจารณาอนุมัติ 3) ฝ่ายบุคคลบันทึกวันลา
              <span className="mx-0.5 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-[#0055fa] dark:text-blue-300 text-xs font-bold">1</span>
              <span className="mx-0.5 px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-[#0055fa] dark:text-blue-300 text-xs font-bold">2</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {[
                ["1", "คู่มือพนักงาน"],
                ["2", "ระเบียบการลา"],
              ].map(([n, t]) => (
                <div key={n} className="flex items-center gap-2 rounded-xl px-3 py-2 border border-slate-200/90 dark:border-white/10 bg-white dark:bg-[#0d1424]">
                  <span className="w-5 h-5 rounded bg-[#0055fa] text-white text-[10px] font-bold flex items-center justify-center">{n}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 rounded-2xl px-4 py-3 border border-slate-200/90 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-400">
          <span className="flex-1 text-sm">พิมพ์คำถามของคุณ…</span>
          <Send className="w-4 h-4" aria-hidden />
        </div>
      </div>
    </div>
  );
}

export default function NeuronHubShowcase() {
  return (
    <>
      <section id="top" className="relative pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden bg-grid-pattern">
        <div className="absolute top-1/3 right-0 w-[560px] h-[420px] bg-[#0055fa]/15 dark:bg-[#0055fa]/20 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse-glow" />
        <div className="absolute top-1/4 left-0 w-[320px] h-[320px] bg-[#fec921]/20 dark:bg-[#fec921]/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-float-slow" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-10">
            <div className="lg:col-span-6 text-center lg:text-left">
              <ScrollReveal variant="fade-down" delay={50}>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 backdrop-blur-sm mb-7">
                  <MessageSquare className="w-3.5 h-3.5 text-[#0055fa] dark:text-[#60a5fa]" aria-hidden />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">NeuronHub</span>
                  <span className="text-slate-300 dark:text-slate-600">|</span>
                  <span className="text-slate-600 dark:text-slate-400">หน้าแชท AI ขององค์กร</span>
                </div>
              </ScrollReveal>

              <ScrollReveal variant="fade-up" delay={120}>
                <h1 className="text-4xl sm:text-5xl lg:text-[3.2rem] font-extrabold tracking-tight leading-[1.15] text-slate-900 dark:text-white">
                  คุยกับ AI ได้
                  <br />
                  <span className="text-[#0055fa] dark:text-[#3b82f6]">ตอบพร้อม</span>
                  <span className="text-[#fec921]">แหล่งอ้างอิง</span>
                </h1>
              </ScrollReveal>

              <ScrollReveal variant="fade-up" delay={200}>
                <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl mx-auto lg:mx-0">
                  ถามเป็นภาษาไทยได้เหมือนคุยกับเพื่อนร่วมงาน ผู้ช่วย AI เรียกใช้ความรู้และเครื่องมือขององค์กรเอง
                  แล้วตอบพร้อมแหล่งที่มาที่กดตรวจย้อนกลับได้
                </p>
                <ul className="mt-6 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-2">
                  {["คุยภาษาไทยได้", "อ้างอิงแหล่งที่มา", "ควบคุมสิทธิ์ได้"].map((p) => (
                    <li key={p} className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      <Check className="w-4 h-4 text-[#0055fa] dark:text-[#3b82f6]" aria-hidden />
                      {p}
                    </li>
                  ))}
                </ul>
              </ScrollReveal>

              <ScrollReveal variant="fade-up" delay={280}>
                <div className="mt-9 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  <a
                    href={SHOWCASE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-2xl px-6 py-4 text-left text-white bg-[#0055fa] hover:bg-[#0047d1] shadow-lg shadow-[#0055fa]/30 transition-all hover:-translate-y-0.5"
                  >
                    <span className="flex items-center justify-between gap-3 text-lg font-bold">
                      ดู Showcase <ArrowUpRight className="w-5 h-5" aria-hidden />
                    </span>
                    <span className="mt-1 block text-sm text-blue-100">{SHOWCASE_LABEL}</span>
                  </a>
                  <Link
                    href="/#services"
                    className="rounded-2xl px-6 py-4 text-left bg-white dark:bg-white/5 text-slate-900 dark:text-white border border-slate-300/80 dark:border-white/15 hover:border-[#0055fa]/60 transition-all hover:-translate-y-0.5"
                  >
                    <span className="flex items-center justify-between gap-3 text-lg font-bold">
                      ดูแพ็กเกจทั้งหมด <ArrowRight className="w-5 h-5 text-[#0055fa] dark:text-[#60a5fa]" aria-hidden />
                    </span>
                    <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">กลับไปหน้าขายของ IMC</span>
                  </Link>
                </div>
                <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">หน้านี้เป็นหน้าแนะนำผลิตภัณฑ์ ยังไม่ใช่หน้าใช้งานจริง</p>
              </ScrollReveal>
            </div>

            <div className="lg:col-span-6">
              <ScrollReveal variant="zoom-in" delay={200}>
                <ChatMock />
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-24 py-20 sm:py-24 bg-slate-50/70 dark:bg-[#060a13] border-y border-slate-200/70 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal variant="fade-up">
            <SectionHeading
              eyebrow="ฟีเจอร์"
              title="แชทที่องค์กรเชื่อถือและควบคุมได้"
              subtitle="ออกแบบมาให้ตอบได้ตรวจสอบได้ และดูแลผู้ใช้ได้ในที่เดียว"
            />
          </ScrollReveal>
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.title} variant="fade-up" delay={(i % 4) * 80} className="h-full">
                <div className="h-full rounded-2xl p-5 bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10 hover:shadow-lg hover:-translate-y-0.5 transition-all">
                  <div className="w-11 h-11 rounded-xl bg-[#fec921] text-slate-900 flex items-center justify-center">
                    <f.icon className="w-5 h-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-bold text-slate-900 dark:text-white">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{f.text}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section id="editions" className="scroll-mt-24 py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal variant="fade-up">
            <SectionHeading eyebrow="รูปแบบให้บริการ" title="เลือกได้ 2 แบบ" subtitle="เริ่มจากแบบใช้ร่วม แล้วย้ายไปแบบแยกของตัวเองเมื่อพร้อม" />
          </ScrollReveal>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {EDITIONS.map((e, i) => (
              <ScrollReveal key={e.name} variant="fade-up" delay={i * 100} className="h-full">
                <article className="h-full rounded-3xl p-7 bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10 shadow-sm">
                  <h3 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{e.name}</h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{e.text}</p>
                  <ul className="mt-4 space-y-2">
                    {e.points.map((p) => (
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
        </div>
      </section>

      <section id="showcase" className="scroll-mt-24 pb-20 sm:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal variant="zoom-in">
            <div className="rounded-3xl px-6 sm:px-10 py-10 bg-gradient-to-r from-[#0055fa] to-[#003d9c] text-white grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-6 shadow-xl shadow-[#0055fa]/20">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[#fec921]">Showcase</div>
                <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">ดูตัวอย่างที่เราทำให้ลูกค้า</h2>
                <p className="mt-2 text-blue-100 leading-relaxed max-w-2xl">
                  เปิดดูระบบที่ IMC พัฒนาให้ลูกค้าจริงได้ที่ <strong className="text-white">{SHOWCASE_LABEL}</strong>
                </p>
              </div>
              <a
                href={SHOWCASE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl text-base font-bold text-slate-900 bg-[#fec921] hover:bg-[#f0bb10] transition-colors"
              >
                เปิด Showcase <ArrowUpRight className="w-5 h-5" aria-hidden />
              </a>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" delay={100}>
            <div className="mt-6 rounded-3xl p-6 sm:p-7 bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#fec921] text-slate-900 flex items-center justify-center shrink-0">
                  <Network className="w-5 h-5" aria-hidden />
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">ความรู้ของ NeuronHub มาจาก NeuronKnowledge</div>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">ศูนย์รวม MCP Server และความรู้ ที่ให้แชทและ Bots เรียกใช้ผ่านมาตรฐานเดียว</p>
                </div>
              </div>
              <Link
                href={NEURONKNOWLEDGE_PATH}
                className="shrink-0 inline-flex items-center gap-2 text-sm font-bold text-[#0055fa] dark:text-[#60a5fa] hover:gap-3 transition-all"
              >
                ดูหน้า NeuronKnowledge <ArrowRight className="w-4 h-4" aria-hidden />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
