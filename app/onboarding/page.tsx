"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  User,
  Users,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { toast } from "@/components/ui/toast";
import type { OnboardingData } from "@/types/social";

const SUGGESTED_THINKERS = [
  {
    id: "u_bekzod",
    name: "Bekzod Ziyatov",
    handle: "@bziyatov",
    role: "Backend Architect & System Engineer",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    bio: "Yuqori yuklamali tizimlar (High-load) va ma’lumotlar bazalari optimizatsiyasi bo‘yicha tahlillar.",
  },
  {
    id: "u_dilnoza",
    name: "Dilnoza Karimova",
    handle: "@dilnoza_ux",
    role: "Principal Product Designer",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    bio: "Raqamli mahsulotlarda qulaylik, dizayn-tizimlar va O‘zbekistondagi UX yetukligi haqida fikrlar.",
  },
  {
    id: "u_jamshid",
    name: "Jamshid Rahmonov",
    handle: "@jamshid_ai",
    role: "AI Researcher & ML Engineer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    bio: "O‘zbek tilidagi LLM modellari va amaliy sun’iy intellekt integratsiyalari.",
  },
  {
    id: "u_jasur",
    name: "Jasur Saidov",
    handle: "@jasur_fin",
    role: "Venture Partner & Economist",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    bio: "Markaziy Osiyo venchur bozori, startap ko‘rsatkichlari va iqtisodiy o‘sish omillari.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { session, completeOnboarding } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);

  const [name, setName] = useState(session.user.name || "");
  const [handle, setHandle] = useState(session.user.handle.replace("@", "") || "");
  const [role, setRole] = useState(session.user.role || "");
  const [bio, setBio] = useState(session.user.bio || "");
  const [followedAuthorIds, setFollowedAuthorIds] = useState<string[]>([
    "u_bekzod",
    "u_dilnoza",
  ]);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If already onboarded, send directly to dashboard
  useEffect(() => {
    if (session.isAuthenticated && session.isOnboarded) {
      router.replace("/dashboard");
    }
  }, [session, router]);

  const handleStep1Next = () => {
    if (!name.trim()) {
      setError("Ism va familiyangizni kiriting");
      return;
    }
    if (!handle.trim()) {
      setError("Fikr tizimida o‘zingizga mos taxallus (@handle) tanlang");
      return;
    }
    if (!role.trim()) {
      setError("Kasbingiz yoki asosiy sohangizni ko‘rsating");
      return;
    }
    setError(null);
    setStep(2);
  };

  const toggleFollow = (authorId: string) => {
    setFollowedAuthorIds((prev) =>
      prev.includes(authorId)
        ? prev.filter((id) => id !== authorId)
        : [...prev, authorId]
    );
  };

  // Finish Onboarding
  const handleComplete = async () => {
    setIsSubmitting(true);
    const onboardingPayload: OnboardingData = {
      name: name.trim(),
      handle: handle.trim(),
      role: role.trim(),
      bio: bio.trim(),
      selectedTopics: [],
      followedAuthorIds,
    };

    try {
      await completeOnboarding(onboardingPayload);
      toast.success(`Xush kelibsiz, ${name.trim()}! Fikr tasmangiz tayyorlandi.`);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Xatolik yuz berdi";
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 py-8 px-4 sm:px-6 flex flex-col justify-center items-center">
      <div className="w-full max-w-2xl">
        {/* Progress Bar (2-step: Shaxsiyat -> Mualliflar) */}
        <div className="text-center mb-6">
          <div className="max-w-md mx-auto">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider mb-2">
              <span className={step >= 1 ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                1. Shaxsiyat
              </span>
              <span className={step >= 2 ? "text-slate-900 dark:text-white" : "text-slate-400"}>
                2. Mualliflar
              </span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-slate-900 dark:bg-white transition-all duration-300 ease-out"
                style={{ width: `${(step / 2) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card Surface */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm p-6 sm:p-8">
          {/* STEP 1: Shaxsiyat */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-medium text-base mb-1">
                  <User className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                  <h2>O‘zingiz haqingizda ma’lumot bering</h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Fikr intellektual hamjamiyat bo‘lib, sizning professional tajribangiz munozaralarda muhim ahamiyatga ega.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Ism va familiya *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError(null);
                    }}
                    placeholder="Masalan: Alisher Qodirov"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-950 dark:focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Foydalanuvchi nomi (@handle) *
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden focus-within:ring-2 focus-within:ring-slate-950 dark:focus-within:ring-white">
                    <span className="pl-3.5 pr-2 py-2.5 text-sm text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800 select-none">
                      @
                    </span>
                    <input
                      type="text"
                      value={handle}
                      onChange={(e) => {
                        setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
                        setError(null);
                      }}
                      placeholder="alisher"
                      className="w-full px-2 py-2.5 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Kasb yoki asosiy faoliyatingiz *
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => {
                      setRole(e.target.value);
                      setError(null);
                    }}
                    placeholder="Masalan: Frontend muhandis / Iqtisodiyot talabasi"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-950 dark:focus:ring-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Qisqacha tarjimayi hol (bio)
                  </label>
                  <textarea
                    rows={2}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Qaysi mavzularda fikr bildirishni yoki nimalarni o‘rganishni yoqtirasiz?"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-950 dark:focus:ring-white resize-none"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleStep1Next}
                  className="px-6 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 font-medium text-sm transition-all inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>Keyingi qadam</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Mualliflar (Suggested Thinkers) */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-medium text-base mb-1">
                  <Users className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                  <h2>Tavsiya etilgan fikr egalarini kuzating</h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  O‘zbekiston texnologik va intellektual maydonida mazmunli tahlillar yozuvchi faol mualliflar.
                </p>
              </div>

              <div className="space-y-3">
                {SUGGESTED_THINKERS.map((author) => {
                  const isFollowing = followedAuthorIds.includes(author.id);
                  return (
                    <div
                      key={author.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-sm text-slate-800 dark:text-slate-200 shrink-0">
                          {author.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                              {author.name}
                            </h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {author.handle}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 mt-0.5">
                            {author.role}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-1 text-[11px]">
                            {author.bio}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleFollow(author.id)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                          isFollowing
                            ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"
                            : "bg-slate-950 text-white dark:bg-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200 shadow-sm"
                        }`}
                      >
                        {isFollowing ? "Kuzatilmoqda" : "+ Kuzatish"}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep(1);
                  }}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Orqaga</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleComplete}
                    className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    O‘tkazib yuborish
                  </button>

                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 font-semibold text-sm transition-all inline-flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Fikrni boshlash</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quiet footer notes */}
        <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Fikrda har qanday ma’lumotni istalgan vaqtda profildan o‘zgartirishingiz mumkin</span>
        </div>
      </div>
    </div>
  );
}
