import crypto from "crypto";
import { eq, and, desc, asc } from "drizzle-orm";
import { db } from "@/server/db";
import {
  subscriptionPlans,
  userSubscriptions,
  paymentTransactions,
} from "@/server/db/schema";
import { AppError } from "@/server/common/errors";
import {
  invalidatePricingCaches,
  pricingCache,
} from "@/server/common/server-cache";
import {
  DEFAULT_PLANS,
  isMissingRelationError,
  unmigratedPricingError,
  type PlanDto,
  type PricingOverviewDto,
  type SubscriptionStatusDto,
} from "./pricing.defaults";

export type { PlanDto, PricingOverviewDto, SubscriptionStatusDto };

export async function getPricingOverview(userId?: string): Promise<PricingOverviewDto> {
  const cacheKey = userId ? `pricing:${userId}` : "pricing:guest";
  const cached = pricingCache.get(cacheKey) as PricingOverviewDto | undefined;
  if (cached) return cached;

  let dbPlans: Omit<PlanDto, "isCurrent">[] = [];
  try {
    const rows = await db
      .select()
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.isActive, true))
      .orderBy(asc(subscriptionPlans.sortOrder));

    dbPlans = rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      priceMonthlyUzs: p.priceMonthlyUzs,
      priceYearlyUzs: p.priceYearlyUzs,
      currency: p.currency,
      features: Array.isArray(p.features) ? p.features : [],
      limits: p.limits,
    }));
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error;
    }
  }

  let activeSub: SubscriptionStatusDto | null = null;
  let activePlanSlug = "free";

  if (userId) {
    try {
      const [sub] = await db
        .select({
          id: userSubscriptions.id,
          status: userSubscriptions.status,
          billingCycle: userSubscriptions.billingCycle,
          currentPeriodStart: userSubscriptions.currentPeriodStart,
          currentPeriodEnd: userSubscriptions.currentPeriodEnd,
          cancelAtPeriodEnd: userSubscriptions.cancelAtPeriodEnd,
          autoRenew: userSubscriptions.autoRenew,
          planSlug: subscriptionPlans.slug,
          planName: subscriptionPlans.name,
        })
        .from(userSubscriptions)
        .innerJoin(subscriptionPlans, eq(userSubscriptions.planId, subscriptionPlans.id))
        .where(and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.status, "active")))
        .orderBy(desc(userSubscriptions.createdAt))
        .limit(1);

      if (sub && sub.currentPeriodEnd > new Date()) {
        activePlanSlug = sub.planSlug;
        activeSub = {
          id: sub.id,
          planSlug: sub.planSlug,
          planName: sub.planName,
          status: sub.status,
          billingCycle: sub.billingCycle,
          currentPeriodStart: sub.currentPeriodStart.toISOString(),
          currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          autoRenew: sub.autoRenew,
        };
      }
    } catch (error) {
      if (!isMissingRelationError(error)) {
        throw error;
      }
    }
  }

  const providerConfigured = Boolean(
    process.env.PAYMENT_WEBHOOK_SECRET &&
    (process.env.PAYME_MERCHANT_ID || process.env.CLICK_SERVICE_ID || process.env.STRIPE_SECRET_KEY)
  );

  const sourcePlans = dbPlans.length > 0 ? dbPlans : DEFAULT_PLANS;

  const overview: PricingOverviewDto = {
    plans: sourcePlans.map((p) => ({
      ...p,
      isCurrent: p.slug === activePlanSlug,
    })),
    currentSubscription: activeSub,
    providerConfigured,
  };

  pricingCache.set(cacheKey, overview, 60_000);
  return overview;
}

export async function initiateSubscriptionCheckout(params: {
  userId: string;
  planSlug: string;
  billingCycle: "monthly" | "yearly";
  provider: "click" | "payme" | "stripe";
  idempotencyKey?: string;
}) {
  try {
    const [plan] = await db
      .select()
      .from(subscriptionPlans)
      .where(and(eq(subscriptionPlans.slug, params.planSlug), eq(subscriptionPlans.isActive, true)))
      .limit(1);

    if (!plan) {
      throw AppError.notFound("Tanlangan tarif rejasi topilmadi");
    }

    // Server-authoritative price lookup (never trust client price)
    const amount =
      params.billingCycle === "yearly" ? plan.priceYearlyUzs : plan.priceMonthlyUzs;

    // Switching to free plan cancels auto-renew and activates free entitlement immediately
    if (amount <= 0) {
      const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const sub = await db.transaction(async (tx) => {
        await tx
          .update(userSubscriptions)
          .set({ status: "cancelled", autoRenew: false, updatedAt: new Date() })
          .where(and(eq(userSubscriptions.userId, params.userId), eq(userSubscriptions.status, "active")));

        const [created] = await tx
          .insert(userSubscriptions)
          .values({
            userId: params.userId,
            planId: plan.id,
            status: "active",
            billingCycle: params.billingCycle,
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: false,
            autoRenew: false,
          })
          .returning();
        return created;
      });

      invalidatePricingCaches(params.userId);
      return {
        transactionId: null,
        status: "active",
        requiresPayment: false,
        amount: 0,
        currency: plan.currency,
        subscriptionId: sub.id,
        message: "Boshlang'ich tarif faollashtirildi",
      };
    }

    const idemKey =
      params.idempotencyKey?.trim() ||
      `sub_${params.userId}_${plan.slug}_${params.billingCycle}_${crypto.randomUUID()}`;

    // Idempotency check: return existing pending/succeeded transaction if same key
    const [existingTx] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.idempotencyKey, idemKey))
      .limit(1);

    if (existingTx) {
      return {
        transactionId: existingTx.id,
        status: existingTx.status,
        requiresPayment: existingTx.status === "pending",
        amount: existingTx.amount,
        currency: existingTx.currency,
        provider: existingTx.provider,
        checkoutUrl: null,
        message:
          existingTx.status === "succeeded"
            ? "To'lov allaqachon tasdiqlangan"
            : "To'lov provayder tasdiqlashini kutmoqda",
      };
    }

    const [txRecord] = await db
      .insert(paymentTransactions)
      .values({
        userId: params.userId,
        planId: plan.id,
        provider: params.provider,
        idempotencyKey: idemKey,
        amount,
        currency: plan.currency,
        status: "pending",
        metadata: {
          billingCycle: params.billingCycle,
          planSlug: plan.slug,
        },
      })
      .returning();

    return {
      transactionId: txRecord.id,
      status: "pending",
      requiresPayment: true,
      amount,
      currency: plan.currency,
      provider: params.provider,
      checkoutUrl: null,
      message:
        "To'lov tranzaksiyasi yaratildi. Premium kirish faqat to'lov provayderi webhook tasdiqlaganidan so'ng faollashadi.",
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      throw unmigratedPricingError();
    }
    throw error;
  }
}

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(signature.trim(), "utf8");
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

export async function processPaymentWebhook(params: {
  transactionId: string;
  providerTransactionId: string;
  status: "succeeded" | "failed" | "refunded";
  paidAmount?: number;
}) {
  const result = await db.transaction(async (tx) => {
    const [txRow] = await tx
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.id, params.transactionId))
      .limit(1);

    if (!txRow) {
      throw AppError.notFound("Tranzaksiya topilmadi");
    }

    // Idempotent handling for duplicate callbacks
    if (txRow.status === params.status && txRow.providerTransactionId === params.providerTransactionId) {
      return {
        idempotent: true,
        status: txRow.status,
        subscriptionId: txRow.subscriptionId,
        userId: txRow.userId,
      };
    }

    if (params.status === "succeeded" && typeof params.paidAmount === "number" && params.paidAmount !== txRow.amount) {
      await tx
        .update(paymentTransactions)
        .set({
          status: "failed",
          updatedAt: new Date(),
          metadata: { ...txRow.metadata, mismatchAmount: params.paidAmount },
        })
        .where(eq(paymentTransactions.id, txRow.id));
      throw AppError.badRequest("To'lov summasi tarif narxiga mos kelmadi");
    }

    if (params.status !== "succeeded") {
      await tx
        .update(paymentTransactions)
        .set({
          status: params.status,
          providerTransactionId: params.providerTransactionId,
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactions.id, txRow.id));

      if (params.status === "refunded" && txRow.subscriptionId) {
        await tx
          .update(userSubscriptions)
          .set({ status: "cancelled", autoRenew: false, updatedAt: new Date() })
          .where(eq(userSubscriptions.id, txRow.subscriptionId));
      }

      return {
        idempotent: false,
        status: params.status,
        subscriptionId: txRow.subscriptionId,
        userId: txRow.userId,
      };
    }

    // Activate subscription atomically
    const billingCycle = (txRow.metadata?.billingCycle as string) === "yearly" ? "yearly" : "monthly";
    const periodDays = billingCycle === "yearly" ? 365 : 30;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

    await tx
      .update(userSubscriptions)
      .set({ status: "cancelled", autoRenew: false, updatedAt: now })
      .where(and(eq(userSubscriptions.userId, txRow.userId), eq(userSubscriptions.status, "active")));

    const [subscription] = await tx
      .insert(userSubscriptions)
      .values({
        userId: txRow.userId,
        planId: txRow.planId,
        status: "active",
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        autoRenew: true,
      })
      .returning();

    await tx
      .update(paymentTransactions)
      .set({
        status: "succeeded",
        providerTransactionId: params.providerTransactionId,
        subscriptionId: subscription.id,
        updatedAt: now,
      })
      .where(eq(paymentTransactions.id, txRow.id));

    return {
      idempotent: false,
      status: "succeeded",
      subscriptionId: subscription.id,
      userId: txRow.userId,
    };
  });

  invalidatePricingCaches(result.userId);
  return {
    idempotent: result.idempotent,
    status: result.status,
    subscriptionId: result.subscriptionId,
  };
}

export async function cancelActiveSubscription(userId: string) {
  try {
    const [active] = await db
      .select()
      .from(userSubscriptions)
      .where(and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.status, "active")))
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);

    if (!active) {
      throw AppError.notFound("Faol obuna topilmadi");
    }

    const [updated] = await db
      .update(userSubscriptions)
      .set({
        cancelAtPeriodEnd: true,
        autoRenew: false,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.id, active.id))
      .returning();

    invalidatePricingCaches(userId);
    return updated;
  } catch (error) {
    if (isMissingRelationError(error)) {
      throw unmigratedPricingError();
    }
    throw error;
  }
}
