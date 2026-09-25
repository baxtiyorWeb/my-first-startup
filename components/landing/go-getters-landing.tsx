"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Rocket,
  Users,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Globe,
  Compass,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { useAuth } from "@/components/auth/auth-context";

export function GoGettersLanding() {
  const router = useRouter();
  const { localePath, locale, switchLocale } = useI18n();
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-60">
        <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 -right-32 w-[450px] h-[450px] bg-cyan-500/15 rounded-full blur-[140px]" />
      </div>

      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
          {/* Logo */}
          <Link
            href={localePath("/")}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px] shadow-md shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                <Rocket className="w-5 h-5 text-indigo-400 group-hover:rotate-12 transition-transform" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-white">
                The Go-getters
              </span>
              <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest">
                Ijtimoiy Tarmoq
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#haqida" className="hover:text-white transition-colors">
              Platforma Haqida
            </a>
            <a
              href="#imkoniyatlar"
              className="hover:text-white transition-colors"
            >
              Imkoniyatlar
            </a>
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Language Switch */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
              {(["uz", "ru", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => switchLocale(l)}
                  className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                    locale === l
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {session.isAuthenticated ? (
              <button
                onClick={() => router.push(localePath("/dashboard"))}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-md shadow-indigo-600/30"
              >
                <span>Lentaga Kirish</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push(localePath("/auth/login"))}
                  className="px-3 py-2 rounded-xl text-slate-300 hover:text-white text-xs sm:text-sm font-medium transition-colors cursor-pointer"
                >
                  Kirish
                </button>
                <button
                  onClick={() => router.push(localePath("/auth/register"))}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:opacity-95 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-md shadow-indigo-500/20"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>A’zo Bo‘lish</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section
        id="haqida"
        className="relative pt-10  pb-24 overflow-hidden z-10"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Main Headline */}
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight tracking-tight">
                Maqsadi Baland Insonlar Uchun
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  Yangi Ijtimoiy Tarmoq
                </span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
                <strong className="text-white font-semibold">
                  The Go-getters
                </strong>{" "}
                — bu tadbirkorlar, dasturchilar, startapchilar va g‘oya egalari
                birlashadigan professional ijtimoiy platforma. Bu yerda o‘z
                tashabbuslaringiz bilan bo‘lishing, hammuassislar toping va
                loyihalaringizni birga rivojlantiring.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <button
                  onClick={() => router.push(localePath("/auth/register"))}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:opacity-95 text-white font-bold text-base shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Ro‘yxatdan O‘tish va Qo‘shilish</span>
                </button>

                <button
                  onClick={() =>
                    router.push(
                      localePath(
                        session.isAuthenticated ? "/dashboard" : "/auth/login",
                      ),
                    )
                  }
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white font-semibold text-base transition-all cursor-pointer"
                >
                  <Compass className="w-5 h-5 text-indigo-400" />
                  <span>Platformaga Kirish</span>
                </button>
              </div>

              {/* Simple Feature Tags */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-xs font-medium text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  G‘oyalar va Postlar
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Hammuassis (Co-founder)
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Startaplar Vitrinasi
                </span>
              </div>
            </div>

            {/* Right Side Visual Showcase Card */}
            <div className="lg:col-span-5">
              <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 rounded-3xl p-7 border border-slate-800 shadow-2xl space-y-6">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                    GG
                  </div>
                  <h3 className="text-lg font-extrabold text-white">
                    Innovatorlar Maydoniga Xush Kelibsiz!
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    The Go-getters — bu faqatgina ijtimoiy muloqot emas, balki
                    g‘oyalarni reallikka aylantiruvchi imkoniyatlar makonidir.
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-800/80">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        Postlar va Muhokamalar
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        O‘z tajriba va g‘oyalaringizni baham ko‘ring
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        Jamoa va Co-Founder Match
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Texnik va biznes sheriklarni tezda toping
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Rocket className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">
                        Startaplar Vitrinasi
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Loyihangizni taqdim eting va feedback oling
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. IMPONIYATLAR (Core Social Features) */}
      <section
        id="imkoniyatlar"
        className="py-20 bg-slate-900/40 border-y border-slate-800/80"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              The Go-getters Ijtimoiy Tarmog‘ida Nimalar Qilish Mumkin?
            </h2>
            <p className="text-sm text-slate-400">
              Bu yerda har bir post va mulohaza sizning rivojlanishingiz hamda
              maqsadingizga xizmat qiladi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pillar 1 */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-indigo-500/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                1. Tashabbus va Postlar
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                O‘z tahlillaringiz, tajribalaringiz va g‘oyalaringizni yozing.
                Jamiyat a’zolari bilan muhokamalarga kirishing.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                2. Co-Founder va Jamoa
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Profildagi professional maqsadlar orqali g‘oyangizga mos
                keladigan dasturchi, dizayner yoki sheriklarni toping.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Rocket className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                3. Startaplar Vitrinasi
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Yangi mahsulot yoki prototipingizni (MVP) jamoatchilikka taqdim
                eting, dastlabki foydalanuvchilar va feedback oling.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:border-amber-500/40 transition-all space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                4. Nufuzli va Xavfsiz
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Spam va foydasiz xabarlardan xoli, tasdiqlangan va samimiy
                muloqotga intiluvchi mutaxassislar hamjamiyati.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CALL-TO-ACTION FOOTER BANNER */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-cyan-950 rounded-3xl p-8 sm:p-12 border border-indigo-500/30 text-center space-y-5 shadow-2xl">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white">
              O‘zbekiston Innovatorlari Tarmog‘iga Qo‘shiling!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
              O‘z g‘oyalaringizni amalga oshirish va maqsadi baland insonlar
              bilan birga o‘sish uchun hoziroq profil oching.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => router.push(localePath("/auth/register"))}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                Hoziroq Ro‘yxatdan O‘tish →
              </button>
              <button
                onClick={() => router.push(localePath("/auth/login"))}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 hover:text-white font-semibold text-sm transition-all cursor-pointer"
              >
                Kirish
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="py-8 bg-slate-950 border-t border-slate-800 text-slate-400 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white font-bold text-[10px]">
              GG
            </div>
            <span className="font-bold text-white">
              The Go-getters Ijtimoiy Tarmog‘i
            </span>
          </div>

          <div className="flex items-center gap-5 text-slate-400">
            <Link
              href={localePath("/privacy")}
              className="hover:text-white transition-colors"
            >
              Maxfiylik
            </Link>
            <Link
              href={localePath("/terms")}
              className="hover:text-white transition-colors"
            >
              Shartlar
            </Link>
            <Link
              href={localePath("/guidelines")}
              className="hover:text-white transition-colors"
            >
              Qoidalar
            </Link>
            <Link
              href={localePath("/help")}
              className="hover:text-white transition-colors"
            >
              Yordam
            </Link>
          </div>

          <p className="text-slate-500 text-[11px]">
            © {new Date().getFullYear()} The Go-getters. Barcha huquqlar
            himoyalangan.
          </p>
        </div>
      </footer>
    </div>
  );
}
