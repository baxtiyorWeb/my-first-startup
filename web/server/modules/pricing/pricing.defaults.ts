import { AppError } from "@/server/common/errors";

export interface PlanDto {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceMonthlyUzs: number;
  priceYearlyUzs: number;
  currency: string;
  features: string[];
  limits: {
    maxMediaSizeMb: number;
    maxDailyPosts: number;
    hdShorts: boolean;
    verifiedBadge: boolean;
    analytics: boolean;
  };
  isCurrent: boolean;
}

export interface SubscriptionStatusDto {
  id: string;
  planSlug: string;
  planName: string;
  status: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  autoRenew: boolean;
}

export interface PricingOverviewDto {
  plans: PlanDto[];
  currentSubscription: SubscriptionStatusDto | null;
  providerConfigured: boolean;
}

export const DEFAULT_PLANS: Omit<PlanDto, "isCurrent">[] = [
  {
    id: "default-free",
    slug: "free",
    name: "Boshlang'ich",
    description: "Hamjamiyatda ishtirok etish, postlar va Shorts ulashish uchun asosiy reja.",
    priceMonthlyUzs: 0,
    priceYearlyUzs: 0,
    currency: "UZS",
    features: [
      "Cheksiz o'qish va muhokamalar",
      "Kuniga 10 tagacha post va Shorts",
      "10 MB gacha rasm yuklash",
      "Asosiy profil sahifasi",
    ],
    limits: {
      maxMediaSizeMb: 10,
      maxDailyPosts: 10,
      hdShorts: false,
      verifiedBadge: false,
      analytics: false,
    },
  },
  {
    id: "default-pro",
    slug: "pro",
    name: "Geters Pro",
    description: "Faol mualliflar, startap asoschilari va kontent yaratuvchilar uchun.",
    priceMonthlyUzs: 49000,
    priceYearlyUzs: 470000,
    currency: "UZS",
    features: [
      "50 MB gacha HD video va Shorts yuklash",
      "Cheksiz post va maqolalar",
      "Profil uchun Pro tasdiq belgisi",
      "Kengaytirilgan ko'rishlar statistikasi",
      "Ustuvor texnik yordam",
    ],
    limits: {
      maxMediaSizeMb: 50,
      maxDailyPosts: 100,
      hdShorts: true,
      verifiedBadge: true,
      analytics: true,
    },
  },
  {
    id: "default-team",
    slug: "team",
    name: "Startap Jamoa",
    description: "Startaplar va texnologik jamoalar uchun kengaytirilgan imkoniyatlar.",
    priceMonthlyUzs: 149000,
    priceYearlyUzs: 1430000,
    currency: "UZS",
    features: [
      "Geters Pro barcha imkoniyatlari",
      "Jamoaviy brend va loyiha sahifalari",
      "5 tagacha jamoa a'zosi",
      "Reklama va e'lonlarni biriktirish",
      "Maxsus API va eksport",
    ],
    limits: {
      maxMediaSizeMb: 100,
      maxDailyPosts: 500,
      hdShorts: true,
      verifiedBadge: true,
      analytics: true,
    },
  },
];

export function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as {
    code?: unknown;
    message?: unknown;
    cause?: { code?: unknown; message?: unknown };
  };
  if (err.code === "42P01" || err.cause?.code === "42P01") return true;
  const msg = typeof err.message === "string" ? err.message : "";
  const causeMsg = typeof err.cause?.message === "string" ? err.cause.message : "";
  return /relation .* does not exist/i.test(msg) || /relation .* does not exist/i.test(causeMsg);
}

export function unmigratedPricingError(): AppError {
  return new AppError(
    "BAD_REQUEST",
    "Obuna tizimi hali ma'lumotlar bazasida faollashtirilmagan. Tez orada ishga tushiriladi.",
    503
  );
}
