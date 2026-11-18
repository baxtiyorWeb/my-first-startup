"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Heart,
  MessageCircle,
  Sparkles,
  ChevronDown,
  Layers,
  Shield,
  Briefcase,
  Zap,
  Menu,
  X,
  Users,
  Compass,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/components/auth/auth-context";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type DemoTab = "feed" | "match" | "showcase" | "ai";

export function GoGettersLanding() {
  const router = useRouter();
  const { localePath, locale, switchLocale } = useI18n();
  const { session } = useAuth();

  // Interactive state
  const [activeTab, setActiveTab] = useState<DemoTab>("feed");
  const [feedLiked, setFeedLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(142);
  const [matchRoleFilter, setMatchRoleFilter] = useState<string>("all");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleToggleLike = () => {
    if (feedLiked) {
      setLikeCount((prev) => prev - 1);
      setFeedLiked(false);
    } else {
      setLikeCount((prev) => prev + 1);
      setFeedLiked(true);
    }
  };

  return (
    <div className="vercel-scope min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-[#EDEDED] font-sans selection:bg-slate-900 selection:text-white dark:selection:bg-white dark:selection:text-black antialiased relative overflow-x-hidden transition-colors duration-200">
      {/* Vercel Ambient Grid & Top Light Glow */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-20 dark:opacity-25"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
                            linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 75% 55% at 50% 0%, #000 70%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 55% at 50% 0%, #000 70%, transparent 100%)",
        }}
      />
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] sm:w-[900px] h-[340px] pointer-events-none z-0 opacity-30 dark:opacity-40 blur-[100px]"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(120, 119, 198, 0.2) 0%, rgba(255,255,255,0.02) 60%, transparent 80%)",
        }}
      />

      {/* ─────────────────────────────────────────────────────────────
          1. STICKY BULLETPROOF HEADER (NO WRAPPING, SPACIOUS ON MOBILE)
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-b border-slate-200 dark:border-white/[0.08] transition-colors">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Brand Name - NEVER WRAPS */}
          <Link
            href={localePath("/")}
            className="flex items-center gap-2 group cursor-pointer shrink-0 min-w-0"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="The Go-getters"
                width={32}
                height={32}
                className="w-full h-full object-contain"
                priority
              />
            </div>
            <span className="text-sm sm:text-base font-bold tracking-tight text-slate-950 dark:text-white whitespace-nowrap truncate">
              The Go-getters
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-xs font-medium text-slate-600 dark:text-zinc-400">
            <a
              href="#platforma"
              className="hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              Platforma
            </a>
            <a
              href="#imkoniyatlar"
              className="hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              Imkoniyatlar
            </a>
            <a
              href="#qanday-ishlaydi"
              className="hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              Qanday ishlaydi
            </a>
            <a
              href="#faq"
              className="hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
            >
              FAQ
            </a>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Desktop Locale Switcher (Hidden on mobile to save precious room) */}
            <div className="hidden md:flex items-center bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-full p-0.5 text-[11px] font-semibold">
              {(["uz", "ru", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => switchLocale(l)}
                  className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                    locale === l
                      ? "bg-white dark:bg-white text-slate-900 dark:text-black shadow-xs"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
                  aria-label={`Til: ${l}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Light / Dark Mode Toggle */}
            <ThemeToggle size="sm" />

            {/* Primary Action Button */}
            {session.isAuthenticated ? (
              <button
                onClick={() => router.push(localePath("/dashboard"))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950 dark:bg-white text-white dark:text-black hover:opacity-90 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <span>Lenta</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => router.push(localePath("/auth/login"))}
                  className="hidden sm:inline-flex px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-white transition-colors cursor-pointer"
                >
                  Kirish
                </button>
                <button
                  onClick={() => router.push(localePath("/auth/register"))}
                  className="inline-flex items-center gap-1 px-3 sm:px-3.5 py-1.5 rounded-full bg-slate-950 dark:bg-white text-white dark:text-black hover:opacity-90 text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <span>Boshlash</span>
                  <ArrowRight className="w-3 h-3 hidden xs:inline" />
                </button>
              </div>
            )}

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-slate-700 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-white/[0.05] md:hidden cursor-pointer touch-manipulation"
              aria-label="Menyu"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5 text-slate-900 dark:text-white" />
              ) : (
                <Menu className="w-5 h-5 text-slate-900 dark:text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 dark:border-white/[0.08] bg-white/95 dark:bg-black/95 backdrop-blur-xl px-4 py-4 space-y-4 shadow-xl">
            <nav className="flex flex-col gap-1 text-xs font-semibold text-slate-700 dark:text-zinc-300">
              <a
                href="#platforma"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.05]"
              >
                Platforma
              </a>
              <a
                href="#imkoniyatlar"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.05]"
              >
                Imkoniyatlar
              </a>
              <a
                href="#qanday-ishlaydi"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.05]"
              >
                Qanday ishlaydi
              </a>
              <a
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.05]"
              >
                FAQ
              </a>
            </nav>

            {/* Mobile Language Switcher */}
            <div className="pt-3 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                Tilni tanlang:
              </span>
              <div className="flex items-center bg-slate-100 dark:bg-white/[0.06] rounded-lg p-0.5 text-xs font-semibold">
                {(["uz", "ru", "en"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => {
                      switchLocale(l);
                      setMobileMenuOpen(false);
                    }}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      locale === l
                        ? "bg-white dark:bg-white text-slate-950 dark:text-black shadow-xs font-bold"
                        : "text-slate-600 dark:text-zinc-400"
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Auth Actions */}
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push(localePath("/auth/login"));
                }}
                className="flex-1 py-2 text-center text-xs font-semibold text-slate-700 dark:text-zinc-300 rounded-xl bg-slate-100 dark:bg-white/[0.05]"
              >
                Tizimga kirish
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  router.push(localePath("/auth/register"));
                }}
                className="flex-1 py-2 text-center text-xs font-bold text-white dark:text-black rounded-xl bg-slate-950 dark:bg-white"
              >
                Ro‘yxatdan o‘tish
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. HERO SECTION (NO MONOSPACE, NATURAL SOCIAL NETWORK COPY)
      ───────────────────────────────────────────────────────────── */}
      <section className="relative pt-12 sm:pt-20 pb-14 sm:pb-20 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6 sm:space-y-7">
          {/* Natural Sans-Serif Announcement Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-200/80 dark:bg-white/[0.04] border border-slate-300 dark:border-white/[0.1] text-xs font-medium text-slate-700 dark:text-zinc-300 shadow-xs cursor-default">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span>Intiluvchan insonlar va startaplar tarmog‘i</span>
            <ArrowRight className="w-3 h-3 text-slate-400 dark:text-zinc-500 shrink-0" />
          </div>

          {/* Clean High-Contrast Headline */}
          <div className="space-y-4 max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-950 dark:text-white leading-[1.12]">
              G‘oyalar bu yerda <br />
              <span className="bg-gradient-to-b from-slate-900 via-slate-700 to-slate-500 dark:from-white dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent">
                haqiqiy startapga aylanadi.
              </span>
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-zinc-400 max-w-2xl mx-auto font-normal leading-relaxed">
              The Go-getters — tadbirkorlar, dasturchilar, dizaynerlar va startap
              ta’sischilari uchun professional ijtimoiy platforma. G‘oyangizni
              erta bosqichda validatsiya qiling, MVP chiqaring va ishonchli
              hammuassis (co-founder) toping.
            </p>
          </div>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
            <button
              onClick={() => router.push(localePath("/auth/register"))}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-slate-950 dark:bg-white hover:bg-slate-800 dark:hover:bg-zinc-200 text-white dark:text-black font-semibold text-xs sm:text-sm transition-all cursor-pointer shadow-lg active:scale-95"
            >
              <span>Tizimga qo‘shilish</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() =>
                router.push(
                  localePath(
                    session.isAuthenticated ? "/dashboard" : "/auth/login",
                  ),
                )
              }
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/[0.08] border border-slate-300 dark:border-white/[0.12] text-slate-800 dark:text-zinc-200 font-semibold text-xs sm:text-sm transition-all cursor-pointer shadow-xs"
            >
              <Compass className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
              <span>Jonli lentani ko‘rish</span>
            </button>
          </div>

          {/* Social Proof: Real Community Highlights (Replaces technical CLI npx box) */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-slate-600 dark:text-zinc-400">
            <div className="flex items-center -space-x-2">
              {[
                { bg: "bg-indigo-600", text: "AK" },
                { bg: "bg-cyan-600", text: "MR" },
                { bg: "bg-emerald-600", text: "SK" },
                { bg: "bg-amber-600", text: "DN" },
              ].map((av, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full border-2 border-white dark:border-black flex items-center justify-center text-[10px] font-bold text-white ${av.bg}`}
                >
                  {av.text}
                </div>
              ))}
              <div className="w-7 h-7 rounded-full border-2 border-white dark:border-black bg-slate-900 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white">
                +
              </div>
            </div>
            <span>
              <strong className="text-slate-900 dark:text-white font-semibold">
                1,200+
              </strong>{" "}
              tadbirkor va mutaxassis allaqachon safimizda
            </span>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. INTERACTIVE PRODUCT SHOWCASE (MOTION DEMO)
        ───────────────────────────────────────────────────────────── */}
        <div id="platforma" className="max-w-5xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12">
          <div className="rounded-2xl border border-slate-200 dark:border-white/[0.12] bg-white dark:bg-[#0A0A0A] shadow-xl dark:shadow-2xl shadow-slate-200/50 dark:shadow-black overflow-hidden">
            {/* Window Chrome Header with Tabs */}
            <div className="px-4 py-3 bg-slate-100/60 dark:bg-white/[0.02] border-b border-slate-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* macOS window dots */}
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-zinc-700" />
                <span className="text-[11px] text-slate-500 dark:text-zinc-500 ml-2 hidden sm:inline font-medium">
                  app.go-getters.uz
                </span>
              </div>

              {/* Interactive Demo Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                {(
                  [
                    { id: "feed", label: "G‘oyalar oqimi", icon: Layers },
                    { id: "match", label: "Co-founder Match", icon: Briefcase },
                    { id: "showcase", label: "MVP Vitrinasi", icon: Zap },
                    { id: "ai", label: "AI Feedback", icon: Sparkles },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        isActive
                          ? "bg-slate-900 dark:bg-white text-white dark:text-black shadow-xs"
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Window Content Area */}
            <div className="p-4 sm:p-7 min-h-[300px] bg-slate-50 dark:bg-gradient-to-b dark:from-[#0A0A0A] dark:to-black">
              {/* TAB 1: FEED PREVIEW */}
              {activeTab === "feed" && (
                <div className="max-w-2xl mx-auto space-y-4">
                  <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-900 dark:bg-zinc-800 text-white flex items-center justify-center text-xs font-bold">
                          AK
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs sm:text-sm font-bold text-slate-950 dark:text-white">
                              Azizbek Karimov
                            </span>
                            <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                              Founder
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-500">
                            @aziz_dev • 2 soat avval
                          </span>
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-white/[0.08] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-transparent">
                        MVP Bosqichi
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
                      AI asosidagi avtomatlashtirilgan ta’lim platformasining
                      MVP versiyasini yakunladik. Dastlabki 100 ta o‘quvchidan
                      ijobiy feedback oldik. Hozirda B2B yo‘nalishiga
                      kirishimiz uchun tajribali{" "}
                      <strong className="text-slate-950 dark:text-white font-semibold">
                        Lead Marketing Co-founder
                      </strong>{" "}
                      qidiryapmiz.
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {["#edtech", "#ai", "#mvp", "#cofounder"].map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-zinc-400 text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={handleToggleLike}
                          className={`flex items-center gap-1.5 transition-all cursor-pointer ${
                            feedLiked
                              ? "text-red-500 scale-105 font-bold"
                              : "hover:text-slate-900 dark:hover:text-white font-medium"
                          }`}
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              feedLiked ? "fill-red-500" : ""
                            }`}
                          />
                          <span>{likeCount}</span>
                        </button>

                        <span className="flex items-center gap-1.5">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>28 ta fikr</span>
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-500 dark:text-zinc-500">
                        1.4k ko‘rish
                      </span>
                    </div>
                  </div>
                  <p className="text-center text-xs text-slate-500 dark:text-zinc-500">
                    💡 Like tugmasini bosib ko‘ring — interaktiv demo
                  </p>
                </div>
              )}

              {/* TAB 2: CO-FOUNDER MATCH */}
              {activeTab === "match" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2 pb-1">
                    <span className="text-xs font-semibold text-slate-700 dark:text-zinc-400">
                      Qidirilayotgan mutaxassislar:
                    </span>
                    <div className="flex items-center gap-1 text-xs font-medium">
                      {["all", "tech", "design", "growth"].map((filter) => (
                        <button
                          key={filter}
                          onClick={() => setMatchRoleFilter(filter)}
                          className={`px-2.5 py-0.5 rounded-md transition-colors cursor-pointer capitalize ${
                            matchRoleFilter === filter
                              ? "bg-slate-900 dark:bg-white text-white dark:text-black font-bold"
                              : "text-slate-600 dark:text-zinc-500 hover:text-slate-900 dark:hover:text-zinc-300"
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-zinc-800 text-white flex items-center justify-center text-xs font-bold">
                            SK
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-950 dark:text-white">
                              Sardor Komilov
                            </h4>
                            <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                              Full-stack Engineer • 6 yillik tajriba
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                          98% Match
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                        Next.js, Go va AI integratsiyalari bilan ishlayman. 2 ta
                        startapda CTO bo‘lganman. Yangi FinTech yoki SaaS
                        loyihaga hamkor bo‘lib qo‘shilishga tayyorman.
                      </p>
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                          Next.js, Golang, PostgreSQL
                        </span>
                        <button
                          onClick={() =>
                            router.push(localePath("/auth/register"))
                          }
                          className="px-3 py-1 rounded-md bg-slate-900 dark:bg-white/[0.08] hover:bg-slate-800 dark:hover:bg-white/[0.15] text-white text-xs font-semibold transition-colors"
                        >
                          Bog‘lanish
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] space-y-3 shadow-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-900 dark:bg-zinc-800 text-white flex items-center justify-center text-xs font-bold">
                            MR
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-950 dark:text-white">
                              Madina Rashidova
                            </h4>
                            <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                              Senior Product Designer
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
                          94% Match
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                        B2B dasturlar va mobil ilovalar uchun UX tadqiqotlar va
                        minimalist dizayn tizimlari yarataman. Ulush (equity)
                        asosida qo‘shilaman.
                      </p>
                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                          Figma, Design Systems, UX
                        </span>
                        <button
                          onClick={() =>
                            router.push(localePath("/auth/register"))
                          }
                          className="px-3 py-1 rounded-md bg-slate-900 dark:bg-white/[0.08] hover:bg-slate-800 dark:hover:bg-white/[0.15] text-white text-xs font-semibold transition-colors"
                        >
                          Bog‘lanish
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: MVP SHOWCASE */}
              {activeTab === "showcase" && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  <div className="p-5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] space-y-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                          Startap Vitrinasi
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-slate-950 dark:text-white">
                          PayStream — Freelancerlar uchun mikro-faktura
                        </h4>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                        Live Beta
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 p-3.5 rounded-lg bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-white/[0.06] text-center">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400">
                          Foydalanuvchilar
                        </div>
                        <div className="text-sm sm:text-base font-bold text-slate-950 dark:text-white">
                          840+
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400">
                          MRR
                        </div>
                        <div className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400">
                          $1,250
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400">
                          Bosqich
                        </div>
                        <div className="text-sm sm:text-base font-bold text-slate-950 dark:text-white">
                          Pre-Seed
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                      O‘zbekiston va Markaziy Osiyo bozorida xalqaro
                      freelancerlar uchun tezkor invoice va to‘lov monitoring
                      tizimi.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 4: AI FEEDBACK */}
              {activeTab === "ai" && (
                <div className="space-y-3 max-w-2xl mx-auto">
                  <div className="p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] space-y-3 shadow-xs">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-zinc-300 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-indigo-500 dark:text-white" />
                      <span>AI Startup Tahlili</span>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-100 dark:bg-black/80 border border-slate-200 dark:border-white/[0.06] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-zinc-400">
                          G‘oya sifati:
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                          92 / 100 (Yuqori salohiyat)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-zinc-400">
                          Bozor sig‘imi:
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          $45M+ (Markaziy Osiyo)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-zinc-400">
                          Asosiy xavf:
                        </span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          Mijoz jalb qilish narxi (CAC)
                        </span>
                      </div>
                    </div>

                    <p className="text-slate-600 dark:text-zinc-400 leading-relaxed text-xs">
                      Tavsiya: Dastlabki bosqichda B2C emas, balki
                      IT-kompaniyalar bilan to‘g‘ridan-to‘g‘ri pilot shartnomalar
                      tuzishga e’tibor qarating.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. METRICS & SOCIAL PROOF (NO MONOSPACE)
      ───────────────────────────────────────────────────────────── */}
      <section className="py-12 border-y border-slate-200 dark:border-white/[0.08] bg-slate-100/50 dark:bg-white/[0.01]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                1,200+
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
                Faol ta’sischi va mutaxassis
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                450+
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
                Validatsiya qilingan g‘oya
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                85+
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
                Co-founder kelishuvi
              </p>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-950 dark:text-white tracking-tight">
                &lt; 24 soat
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
                Ilk sifatli fikr-mulohaza
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          5. BENTO GRID FEATURES (VERCEL STYLE PRECISION)
      ───────────────────────────────────────────────────────────── */}
      <section id="imkoniyatlar" className="py-16 sm:py-24 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10 sm:space-y-12">
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Imkoniyatlar
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              Startapingiz uchun kerak bo‘lgan barcha vositalar.
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400">
              Ortiqcha shovqin, spam yoki keraksiz funksiyalarsiz. Faqat
              rivojlanishga xizmat qiladigan mexanizmlar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            {/* Card 1: Wide Card */}
            <div className="md:col-span-8 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] hover:border-slate-300 dark:hover:border-white/[0.18] transition-all space-y-4 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.1] flex items-center justify-center text-slate-900 dark:text-white">
                <Layers className="w-4 h-4" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                  Yuqori signalga ega G‘oyalar Lentalari
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                  Lentadagi har bir post sun’iy shovqindan tozalangan.
                  Foydalanuvchilar o‘z startap muammolari, yechimlari va arxitektura
                  tajribalari bilan bo‘lishishadi. Teglar va loyiha bosqichlari
                  orqali saralash imkoni.
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-2 text-xs font-medium text-slate-600 dark:text-zinc-400">
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]">
                  G‘oya bosqichi
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]">
                  MVP sinovi
                </span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06]">
                  O‘sish va Traksiya
                </span>
              </div>
            </div>

            {/* Card 2: Co-founder matching */}
            <div className="md:col-span-4 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] hover:border-slate-300 dark:hover:border-white/[0.18] transition-all space-y-4 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.1] flex items-center justify-center text-slate-900 dark:text-white">
                <Briefcase className="w-4 h-4" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                  Co-founder Match
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                  Texnik (CTO) yoki biznes (CEO) sherikni tezkor filtrlar va
                  aniq ko‘nikmalar orqali toping.
                </p>
              </div>
            </div>

            {/* Card 3: No-spam, High signal */}
            <div className="md:col-span-4 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] hover:border-slate-300 dark:hover:border-white/[0.18] transition-all space-y-4 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.1] flex items-center justify-center text-slate-900 dark:text-white">
                <Shield className="w-4 h-4" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                  0% Shovqin & Spam
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                  Har bir a’zo professional maqsad bilan keladi. Reklama va
                  spam qat’iy filtrlanadi.
                </p>
              </div>
            </div>

            {/* Card 4: Wide Card */}
            <div className="md:col-span-8 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] hover:border-slate-300 dark:hover:border-white/[0.18] transition-all space-y-4 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.1] flex items-center justify-center text-slate-900 dark:text-white">
                <Zap className="w-4 h-4" />
              </div>
              <div className="space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white">
                  Startaplar Vitrinasi va Ilk Foydalanuvchilar
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                  MVP yaratdingizmi? Uni to‘g‘ridan-to‘g‘ri texnologiya
                  ishqibozlariga taqdim eting. Birinchi haftadayoq real
                  foydalanuvchilarni sinovga jalb qiling va mahsulotni to‘g‘ri
                  yo‘naltiring.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          6. HOW IT WORKS (3 SIMPLE STEPS)
      ───────────────────────────────────────────────────────────── */}
      <section
        id="qanday-ishlaydi"
        className="py-16 sm:py-20 border-t border-slate-200 dark:border-white/[0.08] bg-slate-100/40 dark:bg-white/[0.01]"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-10 sm:space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              Jarayon
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              3 oddiy qadamda boshlang
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] space-y-3 shadow-xs">
              <span className="text-xs font-bold text-slate-400 dark:text-zinc-500">
                01 /
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-950 dark:text-white">
                Profilingizni to‘ldiring
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Texnologik stekingiz, tajribangiz va nima qidirayotganingizni
                belgilang (Co-founder, Investor, Fikr).
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] space-y-3 shadow-xs">
              <span className="text-xs font-bold text-slate-400 dark:text-zinc-500">
                02 /
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-950 dark:text-white">
                G‘oya yoki MVPni ulashing
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Loyihangizning mohiyatini qisqa va aniq ifodalang. Hamjamiyatdan
                xolis va konstruktiv fikr oling.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] space-y-3 shadow-xs">
              <span className="text-xs font-bold text-slate-400 dark:text-zinc-500">
                03 /
              </span>
              <h3 className="text-sm sm:text-base font-bold text-slate-950 dark:text-white">
                Jamoa tuzing va o‘sing
              </h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                Mos sherik bilan birlashib, g‘oyani to‘laqonli biznesga
                aylantiring va birinchi daromadga chiqing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          7. INTERACTIVE FAQ ACCORDION
      ───────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-16 sm:py-24 max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
            Savollar
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
            Tez-tez beriladigan savollar
          </h2>
        </div>

        <div className="space-y-2.5">
          {[
            {
              q: "The Go-getters kimlar uchun mo‘ljallangan?",
              a: "Platforma o‘z loyihasini boshlashni rejalashtirayotgan yoki allaqachon MVP ustida ishlayotgan dasturchilar, dizaynerlar, mahsulot menejerlari va startap ta’sischilari uchun mo‘ljallangan.",
            },
            {
              q: "G‘oyamni ulashsam, uni kimdir o‘g‘irlab ketmaydimi?",
              a: "Startap olamida asosiy qiymat g‘oyada emas, uning ijrosida (execution). The Go-getters platformasida g‘oyangizni erta validatsiya qilish orqali siz o‘z vaqtingiz va resurslaringizni tejaysiz hamda kuchli hamfikrlarni topasiz.",
            },
            {
              q: "Co-founder topish mexanizmi qanday ishlaydi?",
              a: "Foydalanuvchilar o‘z profillarida ko‘nikmalar, tajriba va hamkorlik shartlarini ko‘rsatishadi. Qidiruv va match tizimi orqali mos profillar bilan to‘g‘ridan-to‘g‘ri bog‘lanishingiz mumkin.",
            },
            {
              q: "Platformadan foydalanish bepulmi?",
              a: "Ha, The Go-getters tarmog‘ining asosiy imkoniyatlari — postlar yozish, fikr almashish, hamjamiyat bilan muloqot va co-founder qidirish — to‘liq bepul.",
            },
          ].map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0A0A0A] overflow-hidden transition-colors shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 dark:text-zinc-400 shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-slate-900 dark:text-white" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-slate-600 dark:text-zinc-400 leading-relaxed border-t border-slate-100 dark:border-white/[0.04] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          8. HIGH-CONVERSION CTA BANNER
      ───────────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="p-8 sm:p-14 rounded-3xl border border-slate-200 dark:border-white/[0.15] bg-white dark:bg-gradient-to-b dark:from-[#111] dark:to-black text-center space-y-6 relative overflow-hidden shadow-xl dark:shadow-2xl">
            {/* Subtle top glow line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-slate-400/40 dark:via-white/40 to-transparent" />

            <div className="space-y-3">
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                Keyingi katta loyihangizni bugun boshlang.
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-lg mx-auto">
                O‘zbekiston va mintaqadagi eng faol startapchilar hamjamiyatiga
                qo‘shiling. 1 daqiqada hisob yarating.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => router.push(localePath("/auth/register"))}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-slate-950 dark:bg-white hover:bg-slate-800 dark:hover:bg-zinc-200 text-white dark:text-black font-semibold text-xs sm:text-sm transition-all cursor-pointer shadow-lg active:scale-95"
              >
                Hoziroq ro‘yxatdan o‘tish →
              </button>
              <button
                onClick={() => router.push(localePath("/auth/login"))}
                className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.1] text-slate-800 dark:text-zinc-300 font-semibold text-xs sm:text-sm transition-all cursor-pointer"
              >
                Tizimga kirish
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          9. MINIMALIST FOOTER
      ───────────────────────────────────────────────────────────── */}
      <footer className="py-10 border-t border-slate-200 dark:border-white/[0.08] bg-white dark:bg-black text-slate-500 dark:text-zinc-500 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Status dot */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-600 dark:text-zinc-400 font-medium">
                Barcha tizimlar barqaror ishlamoqda
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-6 text-xs font-medium">
              <Link
                href={localePath("/privacy")}
                className="hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Maxfiylik
              </Link>
              <Link
                href={localePath("/terms")}
                className="hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Foydalanish shartlari
              </Link>
              <Link
                href={localePath("/guidelines")}
                className="hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Qoidalar
              </Link>
              <Link
                href={localePath("/help")}
                className="hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Yordam
              </Link>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400 dark:text-zinc-600">
            <p>
              © {new Date().getFullYear()} The Go-getters. Barcha huquqlar
              himoyalangan.
            </p>
            <p className="font-medium">Crafted with precision & passion.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
