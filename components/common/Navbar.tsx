"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "@/app/theme-provider";
import { useAuth } from "@/context/AuthContext";
import { 
  Sun, 
  Moon, 
  Menu, 
  X, 
  ArrowRight, 
  BookOpen, 
  Sparkles,
  ShieldCheck,
  User as UserIcon,
  LogOut,
  LogIn
} from "lucide-react";

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [    
    { label: "AI Harness", href: "#simulator", badge: "Demo" },
    { label: "จุดเด่นระบบ", href: "#pillars" },
    { label: "สถาปัตยกรรม", href: "#architecture" },
    { label: "คลังความรู้", href: "#library" }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-3 sm:px-6 lg:px-8 pt-3 sm:pt-4 transition-all duration-300">
      <div 
        className={`max-w-6xl mx-auto rounded-2xl transition-all duration-300 ${
          scrolled 
            ? "bg-white/85 dark:bg-[#070b14]/90 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-lg shadow-slate-900/5 px-4 sm:px-6 py-2.5" 
            : "bg-white/60 dark:bg-[#070b14]/70 backdrop-blur-md border border-slate-200/60 dark:border-white/5 shadow-sm px-4 sm:px-6 py-3"
        }`}
      >
        <div className="flex items-center justify-between">
          
          {/* Logo & Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#0055fa] to-[#2670ff] text-white shadow-sm shadow-[#0055fa]/30 group-hover:scale-105 transition-transform duration-200 shrink-0">
                <BookOpen className="w-4 h-4 text-white" />
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fec921] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#fec921] border border-white dark:border-[#070b14]"></span>
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  Neuron<span className="text-[#0055fa] dark:text-[#3b82f6]">Knowledge</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-md bg-blue-50 dark:bg-white/5 text-[#0055fa] dark:text-blue-400 border border-blue-200/60 dark:border-white/10">
                  by IMC
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation - Centered */}
          <nav className="hidden md:flex items-center gap-1 sm:gap-2">
            {navLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.href}
                className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#0055fa] dark:hover:text-[#60a5fa] hover:bg-slate-100/70 dark:hover:bg-white/5 rounded-xl transition-all flex items-center gap-1.5"
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span className="px-1.5 py-0.2 text-[10px] font-semibold font-mono rounded bg-[#fec921]/20 text-[#b48206] dark:text-[#fec921] border border-[#fec921]/30">
                    {link.badge}
                  </span>
                )}
              </a>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 transition-all cursor-pointer"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-[#fec921] transition-transform duration-300 hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-[#0055fa] transition-transform duration-300" />
              )}
            </button>

            {/* User Session State */}
            {user ? (
              <div className="flex items-center gap-2">
                {user.role === "admin" && (
                  <Link
                    href="/admin/dashboard"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#0055fa] dark:hover:text-blue-400 bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 rounded-xl border border-slate-200/70 dark:border-white/10 transition-all"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0055fa]" />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}

                <Link
                  href="/chat"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] rounded-xl shadow-md shadow-[#0055fa]/20 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Chat AI</span>
                  <span className="sm:hidden">Chat</span>
                </Link>

                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-xs">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-200 max-w-[90px] truncate hidden sm:inline">
                    {user.name}
                  </span>
                  <button
                    onClick={() => logout()}
                    title="ออกจากระบบ"
                    className="p-0.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-[#0055fa] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>เข้าสู่ระบบ</span>
                </Link>

                <Link
                  href="/register"
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm font-semibold text-[#0055fa] dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 rounded-xl transition-all"
                >
                  <span>สมัครสมาชิก</span>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200/60 dark:border-white/10"
              aria-label="Open menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-slate-200/80 dark:border-white/10 space-y-1 pb-1 animate-in fade-in duration-150">
            {navLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <span>{link.label}</span>
                {link.badge && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold font-mono rounded bg-[#fec921]/20 text-[#b48206] dark:text-[#fec921]">
                    {link.badge}
                  </span>
                )}
              </a>
            ))}

            {user ? (
              <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 space-y-1.5">
                <div className="px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400">
                  เข้าสู่ระบบในชื่อ: <span className="font-semibold text-slate-800 dark:text-white">{user.name}</span> ({user.role})
                </div>
                <Link
                  href="/chat"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#0055fa] shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Chat AI</span>
                </Link>
                {user.role === "admin" && (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 shadow-sm"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>เข้าสู่ Admin Console</span>
                  </Link>
                )}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            ) : (
              <div className="pt-2 grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/5 text-center"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>เข้าสู่ระบบ</span>
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-[#0055fa] text-center"
                >
                  <span>สมัครสมาชิก</span>
                </Link>
              </div>
            )}
          </div>
        )}

      </div>
    </header>
  );
}
