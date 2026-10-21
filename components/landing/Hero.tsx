"use client";

import React from "react";
import Image from "next/image";
import {
  ArrowRight,
  ShieldCheck,
  FileSearch,
  Plug,
  MessagesSquare,
} from "lucide-react";
import ScrollReveal from "@/components/common/ScrollReveal";
import { ProductionChatLink, TestChatLink } from "@/components/common/ChatLinks";
import { CHAT_PRODUCTION_HOST } from "@/lib/site-links";

export default function Hero() {
  return (
    <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden bg-grid-pattern">
      {/* Animated ambient background glow accents */}
      <div className="absolute top-1/3 left-1/2 lg:left-[72%] -translate-x-1/2 -translate-y-1/2 w-[520px] sm:w-[700px] h-[380px] bg-[#0055fa]/15 dark:bg-[#0055fa]/20 rounded-full blur-[140px] pointer-events-none -z-10 animate-pulse-glow" />
      <div className="absolute top-1/4 left-0 lg:left-10 w-[300px] h-[300px] bg-[#fec921]/15 dark:bg-[#fec921]/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-float-slow" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-12 lg:gap-8 xl:gap-12">

          {/* Left: Text content */}
          <div className="lg:col-span-7 text-center lg:text-left">

            {/* Top Badge: Enterprise Verification */}
            <ScrollReveal variant="fade-down" delay={50}>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-7">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium bg-white/80 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 shadow-xs backdrop-blur-sm hover:border-[#0055fa]/40 transition-colors">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fec921] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#fec921]"></span>
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    NeuronKnowledge
                  </span>
                  <span className="hidden sm:inline text-slate-300 dark:text-slate-600">|</span>
                  <span className="hidden sm:inline text-slate-600 dark:text-slate-400">
                    Knowledge &amp; MCP Hub by IMC Institute
                  </span>
                </div>
              </div>
            </ScrollReveal>

            {/* Main Hero Headline */}
            <ScrollReveal variant="fade-up" delay={150}>
              <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12] text-balance">
                MCP Server &amp; Knowledge Hub
                <span className="block mt-3 text-xl sm:text-2xl xl:text-[2rem] font-semibold leading-snug bg-gradient-to-r from-[#0055fa] via-[#3b82f6] to-[#0055fa] bg-clip-text text-transparent">
                  ศูนย์กลางเครื่องมือและคลังความรู้สำหรับ AI Agent ขององค์กร
                </span>
              </h1>
            </ScrollReveal>

            <ScrollReveal variant="fade-up" delay={250}>
              <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                รวม <strong className="text-slate-900 dark:text-white font-medium">MCP Tools</strong> และ{" "}
                <strong className="text-slate-900 dark:text-white font-medium">คลังความรู้ของ IMC Institute</strong>{" "}
                ไว้ที่เดียว แล้วเปิดให้ระบบแชทและ MCP client อื่นเรียกใช้ พร้อมแหล่งอ้างอิงที่ตรวจสอบย้อนกลับได้
                ส่วนหน้าแชทสำหรับผู้ใช้จริงอยู่ที่{" "}
                <strong className="text-slate-900 dark:text-white font-medium">{CHAT_PRODUCTION_HOST}</strong>
              </p>
            </ScrollReveal>

            {/* Action CTAs with Micro-animations */}
            <ScrollReveal variant="fade-up" delay={350}>
              <div className="mt-9 flex flex-col sm:flex-row sm:flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4">
                <a
                  href="#mcp"
                  className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 text-base font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] active:scale-[0.98] rounded-xl shadow-lg shadow-[#0055fa]/25 hover:shadow-xl hover:shadow-[#0055fa]/35 transition-all overflow-hidden"
                >
                  <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out pointer-events-none" />
                  <Plug className="w-4.5 h-4.5" />
                  <span>ดู MCP Tools</span>
                  <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
                </a>

                <ProductionChatLink
                  variant="secondary"
                  size="md"
                  className="w-full sm:w-auto px-6 py-3.5 text-base"
                >
                  {`ใช้งานแชทจริง · ${CHAT_PRODUCTION_HOST}`}
                </ProductionChatLink>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span>ผู้ดูแลระบบ?</span>
                <TestChatLink variant="ghost" size="sm" className="!px-2 !py-1">
                  ทดสอบ Tools ในหน้าแชททดสอบ (Test console)
                </TestChatLink>
              </div>
            </ScrollReveal>
          </div>

          {/* Right: Hero illustration */}
          <div className="lg:col-span-5">
            <ScrollReveal variant="fade-up" delay={200}>
              <div className="relative mx-auto w-full max-w-md sm:max-w-lg lg:max-w-none">
                {/* Soft halo behind the illustration */}
                <div className="absolute inset-[8%] rounded-full bg-gradient-to-br from-[#0055fa]/20 via-sky-300/10 to-[#fec921]/20 blur-3xl pointer-events-none" />

                <div className="relative animate-float-slow">
                  <div className="relative rounded-[2rem]">
                    <Image
                      src="/landing/hero_section.png"
                      alt="NeuronKnowledge architecture: Website, LLM, Database and RAG connected to a central AI harness"
                      width={1026}
                      height={890}
                      preload
                      sizes="(min-width: 1280px) 520px, (min-width: 1024px) 42vw, (min-width: 640px) 512px, 92vw"
                      className="w-full h-auto select-none mix-blend-multiply dark:mix-blend-normal [mask-image:linear-gradient(to_bottom,black_88%,transparent)]"
                    />
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>

        {/* Value Highlights Row with Staggered Scroll Reveal */}
        <div className="mt-14 lg:mt-16 pt-8 border-t border-slate-200/80 dark:border-white/10 grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-left">

          <ScrollReveal variant="fade-up" delay={400}>
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 hover:-translate-y-1 hover:border-[#0055fa]/40 transition-all duration-200 group h-full">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0055fa] dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                <Plug className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">MCP Tools</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Streamable HTTP · SSE · Stdio</div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" delay={480}>
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 hover:-translate-y-1 hover:border-amber-400/40 transition-all duration-200 group h-full">
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-[#d97706] dark:text-[#fec921] shrink-0 group-hover:scale-110 transition-transform">
                <FileSearch className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">Knowledge Search</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">search_knowledge คืนเอกสาร หน้า และข้อความอ้างอิง</div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" delay={560}>
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 hover:-translate-y-1 hover:border-[#0055fa]/40 transition-all duration-200 group h-full">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0055fa] dark:text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                <MessagesSquare className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">Chat ผ่านระบบแชท IMC</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">ใช้งานจริงที่ {CHAT_PRODUCTION_HOST}</div>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal variant="fade-up" delay={640}>
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 hover:-translate-y-1 hover:border-emerald-400/40 transition-all duration-200 group h-full">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">Admin Console</div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">MCP, Agent, Skills, ผู้ใช้ และสิทธิ์ตามกลุ่ม</div>
              </div>
            </div>
          </ScrollReveal>

        </div>
      </div>
    </section>
  );
}
