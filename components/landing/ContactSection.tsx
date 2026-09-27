"use client";

import React, { useState } from "react";
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Building, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight 
} from "lucide-react";
import ScrollReveal from "@/components/common/ScrollReveal";

export default function ContactSection() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    domain: "hybrid",
    message: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  return (
    <section id="contact" className="py-24 relative overflow-hidden bg-slate-50/60 dark:bg-[#060a13] border-b border-slate-200/80 dark:border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Banner Slogan */}
        <ScrollReveal variant="fade-up">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-[#0055fa] dark:text-blue-400 border border-blue-200/60 dark:border-blue-900/40 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Turn Knowledge into Action</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              พร้อมสร้าง AI Agent เฉพาะทางสำหรับองค์กรคุณแล้วหรือยัง?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300">
              ยกระดับความรู้ในองค์กรให้เกิดผลกระทบจริง (AI for Real Impact) ไม่ว่าจะเป็นการใช้คลังความรู้พร้อมใช้ของเรา หรือต่อยอดจากข้อมูลของคุณเอง
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          
          {/* Left: Contact Info & IMC Institute Credibility */}
          <ScrollReveal variant="fade-right" delay={100} className="lg:col-span-5 h-full">
            <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10 shadow-lg flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#0055fa] text-white flex items-center justify-center font-bold text-xl shadow-md shadow-[#0055fa]/30">
                  IMC
                </div>
                <div>
                  <div className="font-bold text-lg text-slate-900 dark:text-white">IMC Institute</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Knowledge People, A Better Tomorrow</div>
                </div>
              </div>

              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
                สถาบันไอเอ็มซี (IMC Institute) ผู้นำด้านการฝึกอบรมและให้คำปรึกษาเทคโนโลยีขั้นสูง พร้อมสนับสนุนการพัฒนา AI Agent ระดับองค์กรด้วยทีมสถาปนิกและผู้เชี่ยวชาญด้าน RAG & Vector Database
              </p>

              {/* Direct Contact Channels from the banner */}
              <div className="space-y-4">
                
                <a
                  href="tel:0993479694"
                  className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121c32] border border-slate-200/80 dark:border-white/5 hover:border-[#0055fa]/50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0055fa] dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">โทรศัพท์ติดต่อ</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      099-347-9694 / 088-192-7975
                    </div>
                  </div>
                </a>

                <a
                  href="mailto:contact@imcinstitute.com"
                  className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-[#121c32] border border-slate-200/80 dark:border-white/5 hover:border-[#0055fa]/50 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0055fa] dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">อีเมลฝ่ายองค์กร</div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      contact@imcinstitute.com
                    </div>
                  </div>
                </a>

                <div className="grid grid-cols-2 gap-3">
                  <a
                    href="https://facebook.com/imcinstitute"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#121c32] border border-slate-200/80 dark:border-white/5 hover:border-[#0055fa]/50 transition-colors"
                  >
                    <svg className="w-5 h-5 text-[#1877F2] fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <div>
                      <div className="text-[10px] text-slate-400">Facebook</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">IMC Institute</div>
                    </div>
                  </a>

                  <a
                    href="https://line.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-[#121c32] border border-slate-200/80 dark:border-white/5 hover:border-[#0055fa]/50 transition-colors"
                  >
                    <MessageSquare className="w-5 h-5 text-emerald-500" />
                    <div>
                      <div className="text-[10px] text-slate-400">LINE Official</div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">@imcinstitute</div>
                    </div>
                  </a>
                </div>

              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>รองรับข้อตกลงรักษาความลับ (NDA) และคุ้มครองข้อมูลตาม PDPA</span>
            </div>
          </div>
          </ScrollReveal>

          {/* Right: Consultation & Demo Request Form */}
          <ScrollReveal variant="fade-left" delay={200} className="lg:col-span-7 h-full">
            <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-[#0d1424] border border-slate-200/90 dark:border-white/10 shadow-lg h-full">
            {formSubmitted ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  ได้รับข้อมูลการติดต่อเรียบร้อยแล้ว
                </h3>
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300 max-w-md">
                  เจ้าหน้าที่ผู้เชี่ยวชาญจาก IMC Institute จะติดต่อกลับผ่านเบอร์โทรศัพท์หรืออีเมลที่คุณระบุภายใน 1 วันทำการ เพื่อจัดเตรียมระบบทดสอบ (POC Demo)
                </p>
                <button
                  onClick={() => setFormSubmitted(false)}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                >
                  ส่งแบบฟอร์มอีกครั้ง
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    นัดหมาย Demo & ปรึกษาโซลูชันสำหรับองค์กร
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    กรอกข้อมูลเบื้องต้นเพื่อให้ทีมวิศวกรจัดเตรียมสถาปัตยกรรมและคลังความรู้ที่ตรงกับโจทย์ของคุณ
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      ชื่อ - นามสกุล *
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="เช่น สมชาย วัฒนพาณิชย์"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/15 focus:border-[#0055fa] outline-none text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      ชื่อองค์กร / บริษัท *
                    </label>
                    <input
                      required
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="เช่น บริษัท เอ็นเตอร์ไพรส์ จำกัด"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/15 focus:border-[#0055fa] outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      อีเมลสำหรับติดต่อ (Work Email) *
                    </label>
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="name@company.com"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/15 focus:border-[#0055fa] outline-none text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      เบอร์โทรศัพท์ *
                    </label>
                    <input
                      required
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="081-xxx-xxxx"
                      className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/15 focus:border-[#0055fa] outline-none text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    โดเมนความรู้ที่สนใจเป็นพิเศษ
                  </label>
                  <select
                    value={formData.domain}
                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/15 focus:border-[#0055fa] outline-none text-slate-900 dark:text-white"
                  >
                    <option value="hybrid">ผสานทั้งสองแบบ (Hybrid Knowledge: Ready + Custom)</option>
                    <option value="medical">Medical & Clinical Protocol Knowledge</option>
                    <option value="trade">Trade & Export (HS Code / Form D / Customs)</option>
                    <option value="legal">Legal, Compliance & PDPA Knowledge</option>
                    <option value="custom">Custom Enterprise Documents & Database Ingestion</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    รายละเอียดโจทย์หรือความต้องการเพิ่มเติม (ไม่บังคับ)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="เช่น ต้องการสร้าง Agent ช่วยทีมจัดซื้อตรวจสอบสัญญา หรือต้องการระบบตรวจพิกัดศุลกากรอัตโนมัติ..."
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-[#070b14] border border-slate-300 dark:border-white/15 focus:border-[#0055fa] outline-none text-slate-900 dark:text-white resize-none"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-xl bg-[#0055fa] hover:bg-[#0043c7] text-white font-semibold text-sm shadow-lg shadow-[#0055fa]/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>ส่งคำขอปรึกษาและนัดหมาย Demo</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
          </ScrollReveal>

        </div>

      </div>
    </section>
  );
}
