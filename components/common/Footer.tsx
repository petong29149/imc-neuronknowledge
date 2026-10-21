"use client";

import React from "react";
import { BookOpen, ShieldCheck, ExternalLink, FlaskConical } from "lucide-react";
import Link from "next/link";
import { CHAT_PRODUCTION_HOST, CHAT_PRODUCTION_URL, CHAT_TEST_PATH } from "@/lib/site-links";

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
                  MCP Hub
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed">
              ศูนย์กลาง MCP Server และคลังความรู้สำหรับ AI Agent ขององค์กร รวมเครื่องมือ (MCP Tools) และ Ready Knowledge ของ IMC ไว้ที่เดียว แล้วเปิดให้ระบบแชทและ MCP client อื่นเรียกใช้ได้อย่างตรวจสอบย้อนกลับได้
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
              MCP Hub
            </div>
            <ul className="space-y-2">
              <li><a href="#mcp" className="hover:text-[#0055fa] transition-colors">MCP Servers & Tools</a></li>
              <li><a href="#chat-channels" className="hover:text-[#0055fa] transition-colors">ช่องทางแชท: ทดสอบ / ใช้งานจริง</a></li>
              <li><a href="#architecture" className="hover:text-[#0055fa] transition-colors">Knowledge Flow</a></li>
              <li><a href="#simulator" className="hover:text-[#0055fa] transition-colors">ตัวอย่างจำลอง (Preview)</a></li>
            </ul>
          </div>

          {/* Col 5: Chat channels */}
          <div>
            <div className="font-semibold text-slate-900 dark:text-white text-xs uppercase tracking-wider mb-3">
              Chat
            </div>
            <ul className="space-y-2">
              <li>
                <a
                  href={CHAT_PRODUCTION_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 hover:text-[#0055fa] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-[#0055fa]" />
                  <span>ใช้งานจริง · {CHAT_PRODUCTION_HOST}</span>
                </a>
              </li>
              <li>
                <Link
                  href={CHAT_TEST_PATH}
                  className="inline-flex items-center gap-1.5 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                >
                  <FlaskConical className="w-3.5 h-3.5 text-amber-500" />
                  <span>ทดสอบ · Test console</span>
                </Link>
              </li>
              <li className="flex items-center gap-1.5 text-slate-500 pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Admin Console สำหรับผู้ดูแลระบบ</span>
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
              <span>Knowledge &amp; MCP Hub • Next.js 16</span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
