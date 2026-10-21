import React from "react";
import { Check, FlaskConical, MessagesSquare, type LucideIcon } from "lucide-react";
import ScrollReveal from "@/components/common/ScrollReveal";
import { ProductionChatLink, TestChatLink } from "@/components/common/ChatLinks";
import { CHAT_PRODUCTION_HOST } from "@/lib/site-links";

interface Channel {
  id: string;
  icon: LucideIcon;
  badge: string;
  title: string;
  description: string;
  bullets: string[];
  audience: string;
  iconClass: string;
  badgeClass: string;
  cardClass: string;
}

const CHANNELS: Channel[] = [
  {
    id: "test",
    icon: FlaskConical,
    badge: "ทดสอบ · อยู่ใน NeuronKnowledge",
    title: "Test console",
    description:
      "หน้าแชทสำหรับผู้ดูแลระบบและผู้ดูแลความรู้ ใช้ยืนยันว่า MCP Tools และ Agent ทำงานถูกต้องก่อนปล่อยให้ผู้ใช้จริง",
    bullets: [
      "เรียก MCP Tools จริงและดูผลของแต่ละ tool call",
      "เลือก Agent, โมเดล และ Reasoning Effort",
      "ประวัติแชทและสถิติ Token เก็บใน NeuronKnowledge เพื่อการทดสอบ",
      "ไม่ใช่ช่องทางสำหรับผู้ใช้ปลายทาง",
    ],
    audience: "ต้องเข้าสู่ระบบ NeuronKnowledge",
    iconClass: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300",
    badgeClass:
      "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-300/70 dark:border-amber-500/30",
    cardClass: "hover:border-amber-400/60",
  },
  {
    id: "production",
    icon: MessagesSquare,
    badge: `ใช้งานจริง · ${CHAT_PRODUCTION_HOST}`,
    title: "Chat สำหรับผู้ใช้ปลายทาง",
    description:
      "ระบบแชทหลักของ IMC (imc-chat-aiagent) ที่ผู้ใช้เปิดใช้งานจริง และเรียก MCP Tools ผ่าน connector",
    bullets: [
      "ประวัติแชท ค้นหา และแชร์บทสนทนา",
      "แนบไฟล์ / OCR และแสดงแหล่งอ้างอิง [n] ที่คลิกดูได้",
      "รองรับต่อ MCP Tools ของ NeuronKnowledge แบบ Streamable HTTP + token",
      "Embed widget และ market สำหรับ Ready Agent",
    ],
    audience: "เปิดใช้งานได้ที่เว็บไซต์ของระบบแชท",
    iconClass: "bg-blue-50 dark:bg-blue-950/60 text-[#0055fa] dark:text-blue-400",
    badgeClass:
      "bg-blue-50 dark:bg-blue-950/50 text-[#0055fa] dark:text-blue-400 border-blue-200/80 dark:border-blue-900/50",
    cardClass: "hover:border-[#0055fa]/50",
  },
];

export default function ChatChannelsSection() {
  return (
    <section
      id="chat-channels"
      className="py-24 relative overflow-hidden bg-slate-50/60 dark:bg-[#060a13] border-b border-slate-200/80 dark:border-white/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal variant="fade-up">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-[#0055fa] dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 mb-3">
              <MessagesSquare className="w-3.5 h-3.5" />
              <span>Chat Channels</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              แชทมี 2 แบบ: ทดสอบ และใช้งานจริง
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
              NeuronKnowledge เน้นเป็นศูนย์กลาง MCP และคลังความรู้ ส่วนหน้าแชทของผู้ใช้จริงอยู่ที่ระบบแชทของ IMC
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {CHANNELS.map((channel, idx) => {
            const Icon = channel.icon;
            return (
              <ScrollReveal key={channel.id} variant="fade-up" delay={idx * 120} className="h-full">
                <div
                  className={`h-full flex flex-col p-7 sm:p-8 rounded-3xl bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10 shadow-sm hover:shadow-xl transition-all ${channel.cardClass}`}
                >
                  <div className="flex items-start gap-4">
                    <span className={`p-3 rounded-2xl shrink-0 ${channel.iconClass}`}>
                      <Icon className="w-6 h-6" />
                    </span>
                    <div className="min-w-0">
                      <span
                        className={`inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${channel.badgeClass}`}
                      >
                        {channel.badge}
                      </span>
                      <h3 className="mt-2 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                        {channel.title}
                      </h3>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {channel.description}
                  </p>

                  <ul className="mt-5 space-y-2.5 flex-1">
                    {channel.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200"
                      >
                        <span className="w-4 h-4 mt-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 stroke-[2.5]" />
                        </span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-7 pt-5 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center gap-3">
                    {channel.id === "test" ? (
                      <TestChatLink variant="primary" size="md" className="w-full sm:w-auto">
                        เปิด Test console
                      </TestChatLink>
                    ) : (
                      <ProductionChatLink variant="primary" size="md" className="w-full sm:w-auto">
                        {`ไปใช้งานจริงที่ ${CHAT_PRODUCTION_HOST}`}
                      </ProductionChatLink>
                    )}
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">{channel.audience}</span>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>

        <ScrollReveal variant="fade-up" delay={150}>
          <p className="mt-10 max-w-3xl mx-auto text-center text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            <strong className="text-slate-900 dark:text-white font-semibold">หลักแบ่งหน้าที่:</strong>{" "}
            สิ่งที่ผู้ใช้ปลายทางเห็นหรือกดในหน้าแชทอยู่ที่ระบบแชท ส่วนความรู้ เครื่องมือ (MCP) และสิทธิ์ที่ระบบอื่นเรียกใช้อยู่ที่ NeuronKnowledge
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
