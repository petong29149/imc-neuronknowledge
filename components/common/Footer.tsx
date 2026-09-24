"use client";

import React from "react";
import { BookOpen, ShieldCheck, Heart, Sparkles, Terminal } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-[#05080f] border-t border-slate-200 dark:border-white/10 pt-16 pb-12 text-slate-600 dark:text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-slate-200 dark:border-white/10">
          
          {/* Col 1 & 2: Brand & Mission */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0055fa] to-[#2670ff] text-white">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-1.5 font-bold text-base text-slate-900 dark:text-white">
                <span>NeuronKnowledge</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#fec921]/15 text-[#b48206] dark:text-[#fec921] border border-[#fec921]/30">
                  Platform
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              แพลตฟอร์ม AI Harness ระดับองค์กรที่ผสานคลังความรู้พร้อมใช้ (Ready Knowledge) และข้อมูลองค์กร (Custom Data) ด้วย Qdrant Vector Engine และ OpenRouter เพื่อสร้าง AI Agent ที่แม่นยำ ไม่เพี้ยน และตรวจสอบได้จริง
            </p>

            <div className="text-[11px] text-slate-500">
              ขับเคลื่อนโดย <strong className="text-slate-800 dark:text-slate-200">IMC Institute (สถาบันไอเอ็มซี)</strong>
              <div className="text-slate-400 mt-0.5">&quot;Knowledge People, A Better Tomorrow&quot;</div>
            </div>
          </div>

          {/* Col 3: Domains */}
          <div>
            <div className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">
              Ready Knowledge
            </div>
            <ul className="space-y-2">
              <li><a href="#library" className="hover:text-[#0055fa] transition-colors">Medical & CPG Knowledge</a></li>
              <li><a href="#library" className="hover:text-[#0055fa] transition-colors">Trade & Customs (HS Code)</a></li>
              <li><a href="#library" className="hover:text-[#0055fa] transition-colors">Legal & Compliance (PDPA)</a></li>
              <li><a href="#library" className="hover:text-[#0055fa] transition-colors">Finance & Tax Guidelines</a></li>
              <li><a href="#library" className="hover:text-[#0055fa] transition-colors">HR & Employee Policy</a></li>
            </ul>
          </div>

          {/* Col 4: Platform & Architecture */}
          <div>
            <div className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">
              Platform Architecture
            </div>
            <ul className="space-y-2">
              <li><a href="#simulator" className="hover:text-[#0055fa] transition-colors">Open WebUI Simulator</a></li>
              <li><a href="#architecture" className="hover:text-[#0055fa] transition-colors">Knowledge Flow Engine</a></li>
              <li><a href="#tech-stack" className="hover:text-[#0055fa] transition-colors">Qdrant Vector Database</a></li>
              <li><a href="#tech-stack" className="hover:text-[#0055fa] transition-colors">OpenRouter Gateway</a></li>
              <li><a href="#tech-stack" className="hover:text-[#0055fa] transition-colors">PostgreSQL Row-Level Security</a></li>
            </ul>
          </div>

          {/* Col 5: Security & Governance */}
          <div>
            <div className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">
              Enterprise Governance
            </div>
            <ul className="space-y-2">
              <li className="flex items-center gap-1.5 text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Source Citation 100%</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Multi-tenant Isolation</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>RBAC & Audit Trails</span>
              </li>
              <li className="flex items-center gap-1.5 text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>PDPA & ISO Compliant</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Operational Status */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} NeuronKnowledge by IMC Institute. All rights reserved.
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>All Systems Operational • Next.js 16 • Qdrant Engine</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
