"use client";

import React, { useState } from "react";
import { X, Bot, MessageSquare, Brain, History, Square, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import Modal from "@/components/common/Modal";

/** localStorage key marking that a user has already seen the guide (auto-open only once). */
export const guideSeenKey = (userId: number) => `nk_guide_seen_${userId}`;

const STEPS: { icon: React.ElementType; title: string; body: string }[] = [
  {
    icon: Bot,
    title: "เลือกผู้ช่วย AI (Agent)",
    body: "เมื่อเริ่มแชทใหม่ ให้เลือก Agent ที่เหมาะกับงานของคุณ แต่ละ Agent มีความรู้ เครื่องมือ และทักษะเฉพาะทางต่างกัน เมื่อเริ่มสนทนาแล้ว Agent ของแชทนั้นจะไม่เปลี่ยน",
  },
  {
    icon: MessageSquare,
    title: "พิมพ์คำถาม",
    body: "พิมพ์คำถามในช่องแชทแล้วกด Enter เพื่อส่ง (Shift+Enter เพื่อขึ้นบรรทัดใหม่) หรือกดเลือกคำถามแนะนำใต้ช่องแชทเพื่อเริ่มต้นได้ทันที",
  },
  {
    icon: Brain,
    title: "เลือก Model และระดับการคิด",
    body: "ใต้ช่องแชทสามารถเลือก Model ที่ต้องการ และปรับระดับการคิด (Effort) ได้ ระดับสูงจะคิดละเอียดและเรียกใช้เครื่องมือได้หลายขั้นตอนขึ้น แต่ใช้เวลานานกว่า",
  },
  {
    icon: Square,
    title: "ติดตามและหยุดคำตอบ",
    body: "ระหว่างที่ AI กำลังตอบ คุณจะเห็นขั้นตอนการทำงานและเครื่องมือที่เรียกใช้แบบเรียลไทม์ กดปุ่มหยุดเพื่อยุติคำตอบได้ทุกเมื่อ แม้ปิดแท็บหรือรีเฟรช คำตอบก็ยังทำงานต่อ",
  },
  {
    icon: History,
    title: "ประวัติการสนทนา",
    body: "แชททั้งหมดจะถูกบันทึกไว้ที่แถบด้านซ้าย สามารถกลับมาคุยต่อ เปลี่ยนชื่อ หรือลบแชทได้",
  },
  {
    icon: Settings,
    title: "ตั้งค่าและคู่มือ",
    body: "กดที่ชื่อของคุณมุมซ้ายล่างเพื่อเปิด “ตั้งค่า” (ธีม ขนาดตัวอักษร โปรไฟล์ รหัสผ่าน) หรือเปิดคู่มือนี้อีกครั้งได้ทุกเมื่อ",
  },
];

export default function UserGuideModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Modal
      onClose={onClose}
      label="คู่มือการใช้งาน"
      panelClassName="w-full max-w-lg p-6 bg-white dark:bg-[#0c1222] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">คู่มือการใช้งาน</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            ขั้นตอนที่ {step + 1} จาก {STEPS.length}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="ปิด"
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* key restarts the enter animation on each step */}
      <div key={step} className="animate-chat-enter min-h-[180px]">
        <div className="w-12 h-12 mb-4 rounded-2xl bg-blue-50 dark:bg-[#0055fa]/10 text-[#0055fa] dark:text-blue-400 flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{current.title}</h3>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{current.body}</p>
      </div>

      <div className="flex items-center justify-between mt-6">
        <div className="flex gap-1.5" aria-hidden>
          {STEPS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              tabIndex={-1}
              onClick={() => setStep(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === step ? "w-5 bg-[#0055fa]" : "w-1.5 bg-slate-300 dark:bg-white/15"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              ก่อนหน้า
            </button>
          )}
          <button
            type="button"
            onClick={() => (isLast ? onClose() : setStep(step + 1))}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-semibold bg-[#0055fa] text-white hover:bg-[#0046d1] transition-colors cursor-pointer"
          >
            {isLast ? "เริ่มใช้งาน" : "ถัดไป"}
            {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </Modal>
  );
}
