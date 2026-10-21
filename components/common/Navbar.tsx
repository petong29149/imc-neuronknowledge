"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTheme } from "@/app/theme-provider";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import {
  Sun,
  Moon,
  Menu,
  X,
  ShieldCheck,
  LogOut,
  LogIn,
  ChevronRight,
  Plug,
  Layers,
  Database,
  Bot,
  Blocks
} from "lucide-react";

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on outside click or Escape key
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const navLinks = [
    { label: "MCP Hub", href: "#mcp", badge: "Tools", icon: Plug },
    { label: "สถาปัตยกรรม", href: "#architecture", icon: Layers },
    { label: "คลังความรู้", href: "#library", icon: Database }
  ];

  // Where each role works: everyone gets the agent catalog, creators and
  // admins get the Studio, admins also get the Admin Console
  const roleLinks = user
    ? [
        { label: "Agents", drawerLabel: "Agent ที่ใช้ได้", href: "/agents", icon: Bot },
        ...(user.role === "admin" || user.role === "creator"
          ? [{ label: "Studio", drawerLabel: "Creator Studio", href: "/studio", icon: Blocks }]
          : []),
        ...(user.role === "admin"
          ? [{ label: "Admin", drawerLabel: "เข้าสู่ Admin Console", href: "/admin/mcp", icon: ShieldCheck }]
          : []),
      ]
    : [];

  return (
    <header 
      ref={navRef}
      className="fixed top-0 left-0 right-0 z-50 px-2.5 sm:px-6 lg:px-8 pt-2.5 sm:pt-4 transition-all duration-300"
    >
      <div 
        className={`max-w-7xl mx-auto rounded-2xl transition-all duration-300 ${
          scrolled 
            ? "bg-white/90 dark:bg-[#070b14]/90 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 shadow-lg shadow-slate-900/5 px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5" 
            : "bg-white/80 dark:bg-[#070b14]/80 backdrop-blur-md border border-slate-200/70 dark:border-white/5 shadow-sm px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5"
        }`}
      >
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          
          {/* Logo & Brand */}
          <div className="flex items-center min-w-0 shrink-0">
            <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
              <div className="relative flex items-center justify-center shrink-0">
                <Image
                  src="/imc_logo.png"
                  alt="IMC Logo"
                  width={36}
                  height={36}
                  style={{ width: "auto", height: "auto" }}
                  className="rounded-lg h-7 w-auto sm:h-8 lg:h-9 object-contain group-hover:scale-105 transition-transform duration-200"
                  priority
                />
              </div>
              
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="text-sm sm:text-base lg:text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  Neuron<span className="text-[#0055fa] dark:text-[#3b82f6]">Knowledge</span>
                </span>
                <span className="hidden sm:inline-flex lg:hidden xl:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded-md bg-blue-50 dark:bg-white/5 text-[#0055fa] dark:text-blue-400 border border-blue-200/60 dark:border-white/10 shrink-0">
                  by IMC
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links (Large screen only to avoid tablet crowding) */}
          <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1.5 shrink-0">
            {navLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.href}
                className="px-2 xl:px-3 py-1.5 text-xs xl:text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-[#0055fa] dark:hover:text-[#60a5fa] hover:bg-slate-100/70 dark:hover:bg-white/5 rounded-xl transition-all flex items-center gap-1.5 shrink-0"
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
          <div className="flex items-center gap-1 sm:gap-1.5 xl:gap-2 shrink-0">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 shrink-0"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-[#fec921] transition-transform duration-300 hover:rotate-45" />
              ) : (
                <Moon className="w-4 h-4 text-[#0055fa] transition-transform duration-300" />
              )}
            </button>

            {/* User Session State */}
            {user ? (
              <div className="flex items-center gap-1 sm:gap-1.5 xl:gap-2 shrink-0">
                {/* Role links - Desktop only (hidden on tablet & mobile, accessible in mobile menu) */}
                {roleLinks.map((link) => {
                  const IconComponent = link.icon;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="hidden lg:inline-flex items-center gap-1.5 px-2 xl:px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#0055fa] dark:hover:text-blue-400 bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 rounded-xl border border-slate-200/70 dark:border-white/10 transition-all shrink-0"
                    >
                      <IconComponent className="w-3.5 h-3.5 text-[#0055fa]" />
                      <span>{link.label}</span>
                    </Link>
                  );
                })}

                {/* User profile pill - Desktop & Tablet */}
                <div 
                  title={user.name}
                  className="hidden md:flex items-center gap-1.5 px-2 xl:px-2.5 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-xs shrink-0 max-w-[125px] lg:max-w-[95px] xl:max-w-[150px]"
                >
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-slate-700 dark:text-slate-200 truncate inline-block min-w-0 max-w-[45px] sm:max-w-[65px] lg:max-w-[40px] xl:max-w-[75px] 2xl:max-w-[110px]">
                    {user.name.trim().split(/\s+/)[0]}
                  </span>
                  <button
                    onClick={() => logout()}
                    title="ออกจากระบบ"
                    aria-label="ออกจากระบบ"
                    className="p-0.5 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Compact User Initial Avatar on Small Mobile */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(prev => !prev)}
                  className="md:hidden flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-[11px] shadow-sm select-none shrink-0"
                  aria-label="User profile menu"
                >
                  {user.name.charAt(0).toUpperCase()}
                </button>
              </div>
            ) : (
              /* Guest State */
              <div className="flex items-center gap-1.5">
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-[#0055fa] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>เข้าสู่ระบบ</span>
                </Link>

                <Link
                  href="/register"
                  className="hidden lg:inline-flex items-center gap-1 px-3 py-1.5 text-xs sm:text-sm font-semibold text-[#0055fa] dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 border border-blue-200 dark:border-blue-500/20 rounded-xl transition-all"
                >
                  <span>สมัครสมาชิก</span>
                </Link>
              </div>
            )}

            {/* Mobile / Tablet Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 border border-slate-200/60 dark:border-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer"
              aria-label={mobileMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
              aria-expanded={mobileMenuOpen}
            >
              <div className="relative w-5 h-5 flex items-center justify-center">
                <Menu
                  className={`w-5 h-5 transition-all duration-300 absolute inset-0 ${
                    mobileMenuOpen
                      ? "opacity-0 rotate-90 scale-75"
                      : "opacity-100 rotate-0 scale-100"
                  }`}
                />
                <X
                  className={`w-5 h-5 text-rose-500 transition-all duration-300 absolute inset-0 ${
                    mobileMenuOpen
                      ? "opacity-100 rotate-0 scale-100"
                      : "opacity-0 -rotate-90 scale-75"
                  }`}
                />
              </div>
            </button>
          </div>

        </div>

        {/* Mobile / Tablet Dropdown Menu with Smooth Slide Animation */}
        <div
          className={`lg:hidden grid transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            mobileMenuOpen
              ? "grid-rows-[1fr] opacity-100 mt-3 pt-3 border-t border-slate-200/80 dark:border-white/10"
              : "grid-rows-[0fr] opacity-0 mt-0 pt-0 border-t-0 pointer-events-none"
          }`}
        >
          <div className="overflow-hidden">
            <div
              className={`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] space-y-3 pb-1 max-h-[calc(100dvh-5.5rem)] overflow-y-auto ${
                mobileMenuOpen ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0"
              }`}
            >
              {/* Nav links */}
              <div className="space-y-1">
                {navLinks.map((link, idx) => {
                  const IconComponent = link.icon;
                  return (
                    <a
                      key={idx}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-blue-50/70 dark:hover:bg-blue-950/30 hover:text-[#0055fa] dark:hover:text-blue-400 transition-all duration-200 group active:scale-[0.99]"
                      style={{
                        transitionDelay: mobileMenuOpen ? `${idx * 30}ms` : "0ms",
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-[#0055fa] dark:group-hover:text-blue-400 transition-colors">
                          <IconComponent className="w-4 h-4" />
                        </span>
                        <span>{link.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {link.badge && (
                          <span className="px-1.5 py-0.5 text-[10px] font-semibold font-mono rounded bg-[#fec921]/20 text-[#b48206] dark:text-[#fec921] border border-[#fec921]/30">
                            {link.badge}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform duration-200" />
                      </div>
                    </a>
                  );
                })}
              </div>

              {/* User Session / Guest Section in Drawer */}
              {user ? (
                <div className="pt-2.5 border-t border-slate-200/70 dark:border-white/10 space-y-2">
                  {/* User Info Card */}
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-400 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-slate-800 dark:text-white truncate">
                          {user.name}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                            user.role === "admin"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300/40 dark:border-amber-500/30"
                              : user.role === "creator"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300/40 dark:border-emerald-500/30"
                                : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300"
                          }`}
                        >
                          {user.role === "admin" ? "Admin" : user.role === "creator" ? "Creator" : "Member"}
                        </span>
                      </div>
                      {user.email && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-1">
                    {roleLinks.map((link) => {
                      const IconComponent = link.icon;
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-all"
                        >
                          <IconComponent className="w-4 h-4 text-[#0055fa]" />
                          <span>{link.drawerLabel}</span>
                        </Link>
                      );
                    })}

                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200/80 dark:border-rose-500/20 transition-all cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>ออกจากระบบ</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2.5 border-t border-slate-200/70 dark:border-white/10 grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/70 dark:border-white/10 text-center transition-all"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>เข้าสู่ระบบ</span>
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#0055fa] hover:bg-[#0046d1] shadow-md shadow-[#0055fa]/20 text-center transition-all"
                  >
                    <span>สมัครสมาชิก</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </header>
  );
}

