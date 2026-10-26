import { Mail, MessageCircle, Phone } from "lucide-react";
import ScrollReveal from "@/components/common/ScrollReveal";
import SectionHeading from "@/components/sales/SectionHeading";
import SalesCtaButtons from "@/components/sales/SalesCtaButtons";
import { CONTACT } from "@/lib/sales/links";

export default function SalesContact() {
  return (
    <section id="contact" className="scroll-mt-24 py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="fade-up">
          <SectionHeading
            eyebrow="ติดต่อเรา"
            title="พร้อมเริ่ม AI Transformation แล้วหรือยัง?"
            subtitle="ทักมาคุยกับทีม IMC Institute เพื่อนัด Free Assessment หรือขอเดโม NeuronHub และ NeuronKnowledge"
          />
        </ScrollReveal>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-5 gap-6">
          <ScrollReveal variant="fade-right" className="lg:col-span-3 h-full">
            <div className="h-full rounded-3xl p-7 sm:p-9 bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0055fa] text-white flex items-center justify-center font-extrabold text-lg">IMC</div>
                <div>
                  <div className="font-bold text-lg text-slate-900 dark:text-white">IMC Institute</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Knowledge People, A Better Tomorrow</div>
                </div>
              </div>
              <ul className="mt-7 space-y-4">
                <li className="flex items-center gap-4">
                  <span className="w-11 h-11 rounded-xl bg-[#fec921] text-slate-900 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5" aria-hidden />
                  </span>
                  <span className="flex flex-wrap gap-x-4 gap-y-1">
                    {CONTACT.phones.map((p) => (
                      <a key={p.href} href={p.href} className="font-semibold text-slate-900 dark:text-white hover:text-[#0055fa] dark:hover:text-[#60a5fa] transition-colors">
                        {p.label}
                      </a>
                    ))}
                  </span>
                </li>
                <li className="flex items-center gap-4">
                  <span className="w-11 h-11 rounded-xl bg-[#fec921] text-slate-900 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" aria-hidden />
                  </span>
                  <a href={`mailto:${CONTACT.email}`} className="font-semibold text-slate-900 dark:text-white hover:text-[#0055fa] dark:hover:text-[#60a5fa] transition-colors break-all">
                    {CONTACT.email}
                  </a>
                </li>
                <li className="flex items-center gap-4">
                  <span className="w-11 h-11 rounded-xl bg-[#fec921] text-slate-900 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5" aria-hidden />
                  </span>
                  <span className="flex flex-wrap gap-x-4 gap-y-1">
                    <a href={CONTACT.lineUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-900 dark:text-white hover:text-[#0055fa] dark:hover:text-[#60a5fa] transition-colors">
                      LINE: {CONTACT.lineId}
                    </a>
                    <a href={CONTACT.facebook} target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-900 dark:text-white hover:text-[#0055fa] dark:hover:text-[#60a5fa] transition-colors">
                      Facebook: IMC Institute
                    </a>
                  </span>
                </li>
              </ul>
              <a
                href={`mailto:${CONTACT.email}?subject=${encodeURIComponent("ขอนัด Free Assessment: AI Transformation")}`}
                className="mt-8 inline-flex items-center justify-center px-6 py-3.5 rounded-2xl text-base font-bold text-slate-900 bg-[#fec921] hover:bg-[#f0bb10] transition-colors"
              >
                ส่งอีเมลนัด Free Assessment
              </a>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="fade-left" className="lg:col-span-2 h-full">
            <div className="h-full rounded-3xl p-7 sm:p-9 bg-[#003d60] text-white flex flex-col">
              <h3 className="text-xl font-extrabold tracking-tight">อยากลองใช้ระบบก่อน?</h3>
              <p className="mt-2 text-sm text-blue-100/90 leading-relaxed">
                เข้าไปดูหน้าแรกของ NeuronHub และ NeuronKnowledge ได้เลย ก่อนคุยกับทีมขาย
              </p>
              <SalesCtaButtons stack className="mt-6" />
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
