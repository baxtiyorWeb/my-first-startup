"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, ArrowLeft, RefreshCw, Smartphone, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/auth-context";
import { OtpInput } from "@/components/auth/otp-input";
import { toast } from "@/components/ui/toast";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const { loginWithPhone, verifyOtp, resendOtp } = useAuth();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [rawPhone, setRawPhone] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Timer for OTP resend cooldown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "otp" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Format phone as: 90 123 45 67
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    let val = e.target.value.trim();
    if (val.startsWith("+998")) {
      val = val.slice(4);
    } else if (val.startsWith("998") && val.length > 9) {
      val = val.slice(3);
    }
    const digits = val.replace(/\D/g, "").slice(0, 9);
    setRawPhone(digits);
  };

  const getFormattedPhoneDisplay = () => {
    if (!rawPhone) return "";
    let formatted = "";
    if (rawPhone.length > 0) formatted += rawPhone.slice(0, 2);
    if (rawPhone.length > 2) formatted += " " + rawPhone.slice(2, 5);
    if (rawPhone.length > 5) formatted += " " + rawPhone.slice(5, 7);
    if (rawPhone.length > 7) formatted += " " + rawPhone.slice(7, 9);
    return formatted;
  };

  const fullPhoneNumber = `+998 ${getFormattedPhoneDisplay()}`.trim();

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (rawPhone.length < 9) {
      setError("Iltimos, 9 xonali telefon raqamingizni to‘liq kiriting");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await loginWithPhone(fullPhoneNumber);
      setStep("otp");
      setCountdown(60);
      setCanResend(false);
      toast.info(`${fullPhoneNumber} raqamiga 4 xonali tasdiqlash kodi jo‘natildi`);
    } catch {
      setError("SMS yuborishda xatolik yuz berdi. Qayta urinib ko‘ring.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpValue;
    if (code.length < 4) {
      setError("Iltimos, 4 xonali kodni to‘liq kiriting");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await verifyOtp(code);
      if (res.success) {
        toast.success(mode === "login" ? "Xush kelibsiz! Tizimga muvaffaqiyatli ulandingiz." : "Raqam tasdiqlandi.");

        if (mode === "login" || res.isOnboarded) {
          router.push("/dashboard");
        } else {
          router.push("/onboarding");
        }
      } else {
        setError(res.error || "Kod noto‘g‘ri. Qayta urinib ko‘ring.");
      }
    } catch {
      setError("Tasdiqlashda server xatosi yuz berdi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      await resendOtp();
      setCountdown(60);
      setCanResend(false);
      setOtpValue("");
      toast.info("Yangi SMS-kod telefoningizga jo‘natildi.");
    } catch {
      setError("Kodni qayta jo‘natish imkoni bo‘lmadi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-8">

        <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-normal leading-relaxed">
          {mode === "login"
            ? "O‘zbekiston intellektual hamjamiyatidagi hisobingizga kiring"
            : "o'z auditoriyangizni kashf qiling ... "}
        </p>
      </div>

      {/* Surface Card */}
      <div className="bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 sm:p-8 backdrop-blur-sm">
        {step === "phone" ? (
          <form onSubmit={handleSendCode} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="phone-input"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300"
              >
                Telefon raqamingiz
              </label>

              <div
                className={`relative flex items-center rounded-xl border transition-all ${error
                  ? "border-red-500 ring-2 ring-red-500/20 bg-red-50/20 dark:bg-red-950/20"
                  : "border-slate-300 dark:border-slate-700 focus-within:border-slate-950 dark:focus-within:border-white focus-within:ring-2 focus-within:ring-slate-950/10 dark:focus-within:ring-white/10"
                  }`}
              >
                <div className="flex items-center pl-3.5 pr-2 py-3 text-slate-500 dark:text-slate-400 select-none border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 rounded-l-xl">
                  <Smartphone className="w-4 h-4 mr-2 text-slate-400" />
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                    +998
                  </span>
                </div>

                <input
                  id="phone-input"
                  ref={phoneInputRef}
                  type="tel"
                  inputMode="numeric"
                  placeholder="90 123 45 67"
                  value={getFormattedPhoneDisplay()}
                  onChange={handlePhoneChange}
                  disabled={isLoading}
                  autoFocus
                  className="w-full px-3.5 py-3 text-base sm:text-lg font-medium text-slate-950 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 bg-transparent focus:outline-none"
                />
              </div>

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 font-medium animate-in fade-in">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || rawPhone.length < 9}
              className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm active:scale-[0.99]"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>SMS orqali kod olish</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Test hint for effortless evaluation */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Tezkor ko‘rish:
                </span>{" "}
                Ixtiyoriy 9 xonali raqam kiriting (masalan:{" "}
                <button
                  type="button"
                  onClick={() => setRawPhone("901234567")}
                  className="underline font-mono text-slate-900 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  90 123 45 67
                </button>
                )
              </p>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                SMS tasdiqlash
              </p>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                <span className="font-semibold text-slate-950 dark:text-white">
                  {fullPhoneNumber}
                </span>{" "}
                raqamiga yuborilgan 4 xonali kodni kiriting
              </p>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setError(null);
                  setOtpValue("");
                }}
                className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors underline underline-offset-2 pt-1"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Raqamni o‘zgartirish</span>
              </button>
            </div>

            <div className="py-2">
              <OtpInput
                length={4}
                value={otpValue}
                onChange={(val) => {
                  setOtpValue(val);
                  setError(null);
                }}
                onComplete={(code) => handleVerifyOtp(code)}
                error={error}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleVerifyOtp()}
                disabled={isLoading || otpValue.length < 4}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm active:scale-[0.99]"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Kodni tasdiqlash</span>
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
                <span>Kod yetib kelmadimi?</span>
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isLoading}
                    className="font-medium text-slate-950 dark:text-white hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Qayta yuborish</span>
                  </button>
                ) : (
                  <span className="font-mono text-slate-400 dark:text-slate-500">
                    {countdown}s kuting
                  </span>
                )}
              </div>
            </div>

            {/* Test hint for OTP */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Sinov kodi:
                </span>{" "}
                <button
                  type="button"
                  onClick={() => {
                    setOtpValue("1234");
                    handleVerifyOtp("1234");
                  }}
                  className="font-mono font-bold text-slate-950 dark:text-white underline hover:text-blue-600"
                >
                  1234
                </button>{" "}
                (Xatolik testi: 0000)
              </p>
            </div>
          </div>
        )}

        {/* Security badge */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>Fikr xavfsiz va maxfiy autentifikatsiyani kafolatlaydi</span>
        </div>
      </div>

      {/* Mode Switch Footer */}
      <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        {mode === "login" ? (
          <p>
            Fikrda hali hisobingiz yo‘qmi?{" "}
            <Link
              href="/auth/register"
              className="font-semibold text-slate-950 dark:text-white hover:underline underline-offset-2"
            >
              Ro‘yxatdan o‘tish
            </Link>
          </p>
        ) : (
          <p>
            Oldin ro‘yxatdan o‘tganmisiz?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-slate-950 dark:text-white hover:underline underline-offset-2"
            >
              Tizimga kirish
            </Link>
          </p>
        )}
      </div>

      {/* Guest Explore link */}
      <div className="mt-4 text-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Mehmon sifatida ko‘rib chiqish</span>
        </Link>
      </div>
    </div>
  );
}
