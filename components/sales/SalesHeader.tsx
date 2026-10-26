"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useTheme } from "@/app/theme-provider";
import SalesCtaButtons from "@/components/sales/SalesCtaButtons";

const NAV = [
  { label: "แพ็กเกจ", href: "#services" },
  { label: "AI Transformation", href: "#transformation" },
  { label: "Bot", href: "#bots" },
  { label: "IMC Chat & Hub", href: "#systems" },
  { label: "ติดต่อ", href: "#contact" },
];

export default function SalesHeader() {
  const { theme, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header ref={ref} className="fixed top-0 left-0 right-0 z-50 px-2.5 sm:px-6 lg:px-8 pt-2.5 sm:pt-4">
      <div
        className={`max-w-7xl mx-auto rounded-2xl px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 backdrop-blur-xl border transition-all duration-300 ${
          scrolled
            ? "bg-white/90 dark:bg-[#070b14]/90 border-slate-200/90 dark:border-white/10 shadow-lg shadow-slate-900/5"
            : "bg-white/75 dark:bg-[#070b14]/75 border-slate-200/60 dark:border-white/5 shadow-sm"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <a href="#top" className="flex items-center gap-2.5 shrink-0" aria-label="IMC Institute — กลับไปด้านบน">
            <Image
              src="/imc_logo.png"
              alt="IMC Institute"
              width={36}
              height={36}
              style={{ width: "auto", height: "auto" }}
              className="rounded-lg h-8 sm:h-9 w-auto object-contain"
              priority
            />
            <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
              IMC <span className="text-[#0055fa] dark:text-[#3b82f6]">AI Transformation</span>
            </span>
          </a>

          <nav className="hidden lg:flex items-center gap-1" aria-label="เมนูหลัก">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#0055fa] dark:hover:text-[#60a5fa] hover:bg-slate-100/70 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                {n.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <SalesCtaButtons size="compact" />
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
              aria-expanded={open}
              className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="lg:hidden mt-3 pt-3 border-t border-slate-200/80 dark:border-white/10 space-y-1">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
              >
                {n.label}
              </a>
            ))}
            <div className="md:hidden pt-2 px-1">
              <SalesCtaButtons size="compact" />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
