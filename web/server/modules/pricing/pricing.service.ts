import crypto from "crypto";
import { eq, and, or, desc, asc, count, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  subscriptionPlans,
  userSubscriptions,
  paymentTransactions,
  users,
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
import {
  createInpayPayment,
  fetchInpayPayment,
  INPAY_MIN_AMOUNT_UZS,
  isInpayConfigured,
} from "./inpay.client";
import {
  fetchRevenueCatEntitlement,
  isRevenueCatConfigured,
  revenueCatEntitlementId,
  type RevenueCatWebhookEvent,
} from "./revenuecat.client";

export type { PlanDto, PricingOverviewDto, SubscriptionStatusDto };

export type PaymentProvider = "inpay" | "click" | "payme" | "stripe";

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
      storeProductMonthlyId: p.storeProductMonthlyId ?? null,
      storeProductYearlyId: p.storeProductYearlyId ?? null,
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

  const googlePlayConfigured = isRevenueCatConfigured();
  const providerConfigured =
    isInpayConfigured() ||
    googlePlayConfigured ||
    Boolean(
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
    googlePlayConfigured,
  };

  pricingCache.set(cacheKey, overview, 60_000);
  return overview;
}

export async function initiateSubscriptionCheckout(params: {
  userId: string;
  planSlug: string;
  billingCycle: "monthly" | "yearly";
  provider: PaymentProvider;
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

    // A client-supplied key is scoped to the user, so a reused or guessed key can
    // never resolve to somebody else's transaction.
    const requestedKey = params.idempotencyKey?.trim();
    const idemKey = (
      requestedKey
        ? `sub_${params.userId}_${requestedKey}`
        : `sub_${params.userId}_${plan.slug}_${params.billingCycle}_${crypto.randomUUID()}`
    ).slice(0, 120);

    // Idempotency check: return existing pending/succeeded transaction if same key
    const [existingTx] = await db
      .select()
      .from(paymentTransactions)
      .where(
        and(
          eq(paymentTransactions.idempotencyKey, idemKey),
          eq(paymentTransactions.userId, params.userId)
        )
      )
      .limit(1);

    if (existingTx) {
      const storedCheckoutUrl =
        typeof existingTx.metadata?.checkoutUrl === "string"
          ? existingTx.metadata.checkoutUrl
          : null;
      return {
        transactionId: existingTx.id,
        status: existingTx.status,
        requiresPayment: existingTx.status === "pending",
        amount: existingTx.amount,
        currency: existingTx.currency,
        provider: existingTx.provider,
        checkoutUrl: existingTx.status === "pending" ? storedCheckoutUrl : null,
        message:
          existingTx.status === "succeeded"
            ? "To'lov allaqachon tasdiqlangan"
            : existingTx.status === "pending"
              ? "To'lov provayder tasdiqlashini kutmoqda"
              : "To'lov yakunlanmagan. Yangi to'lov yaratishingiz mumkin.",
      };
    }

    // Only inPAY is wired end-to-end; other providers would create a dangling
    // pending transaction that no webhook can ever resolve.
    if (params.provider !== "inpay") {
      throw AppError.badRequest(
        "Hozircha to'lov faqat inPAY orqali qabul qilinadi. Iltimos, inPAY'ni tanlang."
      );
    }

    if (!isInpayConfigured()) {
      throw new AppError(
        "INTERNAL_ERROR",
        "To'lov tizimi hali sozlanmagan. Iltimos, keyinroq urinib ko'ring.",
        503
      );
    }

    if (amount < INPAY_MIN_AMOUNT_UZS) {
      throw AppError.badRequest(
        `Tarif narxi inPAY minimal to'lovidan (${INPAY_MIN_AMOUNT_UZS.toLocaleString(
          "uz-UZ"
        )} so'm) kam. Administrator bilan bog'laning.`
      );
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

    // Create the hosted checkout page on inPAY. The local row exists first so the
    // return URL can carry our transaction id for server-side reconciliation.
    const description = `${plan.name} — ${params.billingCycle === "yearly" ? "yillik" : "oylik"} tarif (Geters)`;
    const returnUrl = publicAppUrl()
      ? `${publicAppUrl()}/dashboard/pricing?payment=${txRecord.id}`
      : undefined;

    let payment: Awaited<ReturnType<typeof createInpayPayment>>;
    try {
      payment = await createInpayPayment({
        amount,
        description,
        returnUrl,
      });
    } catch (error) {
      await db
        .update(paymentTransactions)
        .set({
          status: "failed",
          updatedAt: new Date(),
          metadata: {
            ...txRecord.metadata,
            failureReason: error instanceof Error ? error.message : "unknown",
          },
        })
        .where(eq(paymentTransactions.id, txRecord.id));
      throw error;
    }

    const checkoutUrl = payment.checkoutUrl;
    await db
      .update(paymentTransactions)
      .set({
        providerTransactionId: payment.id,
        metadata: {
          ...txRecord.metadata,
          inpayOrderId: payment.id,
          checkoutUrl,
          returnUrl,
        },
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.id, txRecord.id));

    return {
      transactionId: txRecord.id,
      status: "pending",
      requiresPayment: true,
      amount,
      currency: plan.currency,
      provider: params.provider,
      checkoutUrl,
      message: checkoutUrl
        ? "To'lov sahifasiga o'tishingiz mumkin"
        : "To'lov yaratildi. Provayder tasdiqlashini kutmoqda.",
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

export async function findTransactionIdByProviderPayment(
  providerTransactionId: string
): Promise<string | null> {
  const [row] = await db
    .select({ id: paymentTransactions.id })
    .from(paymentTransactions)
    .where(
      and(
        eq(paymentTransactions.provider, "inpay"),
        eq(paymentTransactions.providerTransactionId, providerTransactionId)
      )
    )
    .limit(1);

  return row?.id ?? null;
}

export async function processPaymentWebhook(params: {
  transactionId: string;
  providerTransactionId: string;
  status: "succeeded" | "failed" | "refunded";
  paidAmount?: number;
  /** Raw provider status, kept in metadata for auditing. */
  providerStatus?: string;
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

    // Transitions are monotonic: a late "failed" callback must not revoke an
    // entitlement that "succeeded" already granted, while a refund may revoke it.
    const allowedTransitions: Record<string, Array<"succeeded" | "failed" | "refunded">> = {
      pending: ["succeeded", "failed", "refunded"],
      failed: ["succeeded"],
      succeeded: ["refunded"],
      refunded: [],
    };
    if (!(allowedTransitions[txRow.status] ?? []).includes(params.status)) {
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
          metadata: {
            ...txRow.metadata,
            ...(params.providerStatus ? { providerStatus: params.providerStatus } : {}),
          },
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

    // inPAY hosted checkout is a one-off payment: it cannot charge the card
    // again, so advertising auto-renewal would be misleading.
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
        autoRenew: false,
      })
      .returning();

    await tx
      .update(paymentTransactions)
      .set({
        status: "succeeded",
        providerTransactionId: params.providerTransactionId,
        subscriptionId: subscription.id,
        updatedAt: now,
        metadata: {
          ...txRow.metadata,
          ...(params.providerStatus ? { providerStatus: params.providerStatus } : {}),
          paidAmount: params.paidAmount ?? txRow.amount,
        },
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

// ---------------------------------------------------------------------------
// Payment status reconciliation (webhooks can be late or blocked locally)
// ---------------------------------------------------------------------------

function publicAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    ""
  ).replace(/\/+$/, "");
}

export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";

export interface PaymentStatusDto {
  transactionId: string;
  status: PaymentStatus;
  planSlug: string | null;
  planName: string | null;
  amount: number;
  currency: string;
  provider: string;
  requiresPayment: boolean;
  checkoutUrl: string | null;
  checkedWithProvider: boolean;
  message: string;
}

function paymentStatusMessage(status: string): string {
  switch (status) {
    case "succeeded":
      return "To'lov tasdiqlandi va obuna faollashtirildi";
    case "refunded":
      return "To'lov qaytarildi, obuna bekor qilindi";
    case "failed":
      return "To'lov yakunlanmadi. Qaytadan urinib ko'rishingiz mumkin";
    default:
      return "To'lov provayder tasdiqlashini kutmoqda";
  }
}

/**
 * Pulls the authoritative status from inPAY and applies it locally. Used when a
 * webhook is delayed, lost, or cannot reach a local development server.
 */
export async function reconcileInpayPayment(params: {
  transactionId: string;
  userId?: string;
}) {
  const [row] = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.id, params.transactionId))
    .limit(1);

  if (!row) throw AppError.notFound("To'lov tranzaksiyasi topilmadi");
  if (params.userId && row.userId !== params.userId) {
    throw AppError.notFound("To'lov tranzaksiyasi topilmadi");
  }
  if (row.provider !== "inpay") {
    throw AppError.badRequest("Bu tranzaksiya inPAY orqali yaratilmagan");
  }
  if (!row.providerTransactionId) {
    throw AppError.badRequest("Tranzaksiyada inPAY buyurtma ID si yo'q");
  }

  if (row.status !== "pending") {
    return {
      transactionId: row.id,
      status: row.status as PaymentStatus,
      checkedWithProvider: false,
      providerStatus: null as string | null,
      subscriptionId: row.subscriptionId,
    };
  }

  const remote = await fetchInpayPayment(row.providerTransactionId);

  if (remote.status === "pending") {
    return {
      transactionId: row.id,
      status: "pending" as PaymentStatus,
      checkedWithProvider: true,
      providerStatus: "pending",
      subscriptionId: row.subscriptionId,
    };
  }

  const result = await processPaymentWebhook({
    transactionId: row.id,
    providerTransactionId: remote.id.slice(0, 160),
    status: remote.status,
    paidAmount: remote.status === "succeeded" ? remote.paidAmount ?? row.amount : undefined,
    providerStatus: remote.status,
  });

  return {
    transactionId: row.id,
    status: result.status as PaymentStatus,
    checkedWithProvider: true,
    providerStatus: remote.status,
    subscriptionId: result.subscriptionId,
  };
}

/** Returns one transaction for its owner, reconciling pending inPAY payments. */
export async function getPaymentStatus(params: {
  transactionId: string;
  userId: string;
}): Promise<PaymentStatusDto> {
  const [row] = await db
    .select({
      id: paymentTransactions.id,
      status: paymentTransactions.status,
      amount: paymentTransactions.amount,
      currency: paymentTransactions.currency,
      provider: paymentTransactions.provider,
      providerTransactionId: paymentTransactions.providerTransactionId,
      metadata: paymentTransactions.metadata,
      planSlug: subscriptionPlans.slug,
      planName: subscriptionPlans.name,
    })
    .from(paymentTransactions)
    .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, paymentTransactions.planId))
    .where(
      and(
        eq(paymentTransactions.id, params.transactionId),
        eq(paymentTransactions.userId, params.userId)
      )
    )
    .limit(1);

  if (!row) throw AppError.notFound("To'lov tranzaksiyasi topilmadi");

  let status = row.status as PaymentStatus;
  let checkedWithProvider = false;

  if (status === "pending" && row.provider === "inpay" && row.providerTransactionId) {
    try {
      const reconciled = await reconcileInpayPayment({
        transactionId: row.id,
        userId: params.userId,
      });
      status = reconciled.status;
      checkedWithProvider = reconciled.checkedWithProvider;
    } catch (error) {
      // Provider outage must not hide the local state from the buyer.
      console.error("[pricing] payment reconciliation failed", {
        transactionId: row.id,
        error,
      });
    }
  }

  const checkoutUrl =
    status === "pending" && typeof row.metadata?.checkoutUrl === "string"
      ? row.metadata.checkoutUrl
      : null;

  return {
    transactionId: row.id,
    status,
    planSlug: row.planSlug,
    planName: row.planName,
    amount: row.amount,
    currency: row.currency,
    provider: row.provider,
    requiresPayment: status === "pending",
    checkoutUrl,
    checkedWithProvider,
    message: paymentStatusMessage(status),
  };
}

// ---------------------------------------------------------------------------
// Admin: payment transactions
// ---------------------------------------------------------------------------

export interface AdminPaymentTransactionDto {
  id: string;
  status: string;
  provider: string;
  amount: number;
  currency: string;
  providerTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  subscriptionId: string | null;
  user: { id: string; name: string; handle: string; email: string | null };
  plan: { slug: string; name: string };
}

export async function listPaymentTransactions(params: {
  status?: string;
  provider?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
  const offset = Math.max(params.offset ?? 0, 0);

  const filters = [];
  if (params.status) filters.push(eq(paymentTransactions.status, params.status));
  if (params.provider) filters.push(eq(paymentTransactions.provider, params.provider));
  const where = filters.length > 0 ? and(...filters) : undefined;

  const rows = await db
    .select({
      id: paymentTransactions.id,
      status: paymentTransactions.status,
      provider: paymentTransactions.provider,
      amount: paymentTransactions.amount,
      currency: paymentTransactions.currency,
      providerTransactionId: paymentTransactions.providerTransactionId,
      createdAt: paymentTransactions.createdAt,
      updatedAt: paymentTransactions.updatedAt,
      subscriptionId: paymentTransactions.subscriptionId,
      userId: users.id,
      userName: users.name,
      userHandle: users.handle,
      userEmail: users.email,
      planSlug: subscriptionPlans.slug,
      planName: subscriptionPlans.name,
    })
    .from(paymentTransactions)
    .innerJoin(users, eq(users.id, paymentTransactions.userId))
    .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, paymentTransactions.planId))
    .where(where)
    .orderBy(desc(paymentTransactions.createdAt))
    .limit(limit)
    .offset(offset);

  const summaryRows = await db
    .select({
      status: paymentTransactions.status,
      count: count(),
      amount: sql<number>`coalesce(sum(${paymentTransactions.amount}), 0)::int`,
    })
    .from(paymentTransactions)
    .groupBy(paymentTransactions.status);

  const transactions: AdminPaymentTransactionDto[] = rows.map((row) => ({
    id: row.id,
    status: row.status,
    provider: row.provider,
    amount: row.amount,
    currency: row.currency,
    providerTransactionId: row.providerTransactionId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    subscriptionId: row.subscriptionId,
    user: {
      id: row.userId,
      name: row.userName,
      handle: row.userHandle,
      email: row.userEmail,
    },
    plan: { slug: row.planSlug, name: row.planName },
  }));

  const summary = summaryRows.reduce(
    (acc, row) => {
      acc.total += Number(row.count);
      if (row.status === "succeeded") acc.succeeded += Number(row.count);
      if (row.status === "pending") acc.pending += Number(row.count);
      if (row.status === "failed") acc.failed += Number(row.count);
      if (row.status === "refunded") acc.refunded += Number(row.count);
      if (row.status === "succeeded") acc.revenueUzs += Number(row.amount) || 0;
      return acc;
    },
    { total: 0, succeeded: 0, pending: 0, failed: 0, refunded: 0, revenueUzs: 0 }
  );

  return { transactions, summary, limit, offset };
}

// ---------------------------------------------------------------------------
// Google Play / RevenueCat
// ---------------------------------------------------------------------------

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function storeIdempotencyKey(raw: string): string {
  return `rc_${crypto.createHash("sha256").update(raw).digest("hex").slice(0, 56)}`;
}

async function findPlanByStoreProductId(productId: string) {
  const [row] = await db
    .select()
    .from(subscriptionPlans)
    .where(
      and(
        eq(subscriptionPlans.isActive, true),
        or(
          eq(subscriptionPlans.storeProductMonthlyId, productId),
          eq(subscriptionPlans.storeProductYearlyId, productId)
        )
      )
    )
    .limit(1);

  if (!row) return null;

  return {
    plan: row,
    billingCycle: (row.storeProductYearlyId === productId ? "yearly" : "monthly") as
      | "monthly"
      | "yearly",
  };
}

/**
 * Activates/renews a subscription bought through Google Play. The plan is
 * resolved from the store product id configured in the database, and the price
 * always comes from the plan row — never from the client.
 */
async function activateStoreSubscription(params: {
  userId: string;
  productId: string;
  entitlementExpiresAt: Date | null;
  providerTransactionId: string;
  idempotencyKey: string;
  cancelAtPeriodEnd: boolean;
  autoRenew: boolean;
  metadata: Record<string, unknown>;
}) {
  const mapping = await findPlanByStoreProductId(params.productId);
  if (!mapping) {
    throw AppError.badRequest(
      `"${params.productId}" Google Play mahsuloti hech qanday tarifga bog'lanmagan`
    );
  }

  const { plan, billingCycle } = mapping;
  const now = new Date();
  const periodEnd =
    params.entitlementExpiresAt && params.entitlementExpiresAt.getTime() > now.getTime()
      ? params.entitlementExpiresAt
      : new Date(now.getTime() + (billingCycle === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000);

  const result = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.idempotencyKey, params.idempotencyKey))
      .limit(1);

    // Duplicate webhook delivery / retried sync: keep the activated subscription.
    if (existing?.status === "succeeded" && existing.subscriptionId) {
      return { subscriptionId: existing.subscriptionId, alreadyProcessed: true };
    }

    await tx
      .update(userSubscriptions)
      .set({ status: "cancelled", autoRenew: false, updatedAt: now })
      .where(
        and(eq(userSubscriptions.userId, params.userId), eq(userSubscriptions.status, "active"))
      );

    const [subscription] = await tx
      .insert(userSubscriptions)
      .values({
        userId: params.userId,
        planId: plan.id,
        status: "active",
        billingCycle,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: params.cancelAtPeriodEnd,
        autoRenew: params.autoRenew,
      })
      .returning({ id: userSubscriptions.id });

    const transactionValues = {
      userId: params.userId,
      subscriptionId: subscription.id,
      planId: plan.id,
      provider: "revenuecat",
      providerTransactionId: params.providerTransactionId.slice(0, 160),
      amount: billingCycle === "yearly" ? plan.priceYearlyUzs : plan.priceMonthlyUzs,
      currency: plan.currency,
      status: "succeeded",
      metadata: {
        ...params.metadata,
        productId: params.productId,
        billingCycle,
      },
      updatedAt: now,
    };

    if (existing) {
      await tx
        .update(paymentTransactions)
        .set(transactionValues)
        .where(eq(paymentTransactions.id, existing.id));
    } else {
      await tx.insert(paymentTransactions).values({
        ...transactionValues,
        idempotencyKey: params.idempotencyKey,
      });
    }

    return { subscriptionId: subscription.id, alreadyProcessed: false };
  });

  invalidatePricingCaches(params.userId);
  return {
    ...result,
    planSlug: plan.slug,
    planName: plan.name,
    billingCycle,
    currentPeriodEnd: periodEnd.toISOString(),
  };
}

/** Reconciles the local entitlement with RevenueCat after a mobile purchase. */
export async function syncRevenueCatSubscription(userId: string) {
  if (!isRevenueCatConfigured()) {
    throw new AppError("INTERNAL_ERROR", "Google Play to'lovlari hali sozlanmagan.", 503);
  }

  const entitlement = await fetchRevenueCatEntitlement(userId);
  if (!entitlement?.productIdentifier || !entitlement.isActive) {
    return {
      active: false,
      planSlug: null as string | null,
      currentPeriodEnd: null as string | null,
      message: "Google Play'da faol obuna topilmadi",
    };
  }

  const result = await activateStoreSubscription({
    userId,
    productId: entitlement.productIdentifier,
    entitlementExpiresAt: entitlement.expiresDate ? new Date(entitlement.expiresDate) : null,
    providerTransactionId: `google_play:${entitlement.purchaseDate ?? entitlement.productIdentifier}`,
    idempotencyKey: storeIdempotencyKey(
      `sync:${userId}:${entitlement.productIdentifier}:${entitlement.expiresDate ?? "lifetime"}`
    ),
    cancelAtPeriodEnd: false,
    autoRenew: true,
    metadata: {
      source: "revenuecat_sync",
      entitlementId: revenueCatEntitlementId(),
    },
  });

  return {
    active: true,
    planSlug: result.planSlug,
    currentPeriodEnd: result.currentPeriodEnd,
    message: result.alreadyProcessed ? "Obuna allaqachon faol" : "Obuna faollashtirildi",
  };
}

/** Applies a RevenueCat webhook event to the local entitlement state. */
export async function handleRevenueCatWebhookEvent(event: RevenueCatWebhookEvent) {
  // Anonymous RevenueCat ids belong to purchases made before the app logged in.
  if (!UUID_PATTERN.test(event.appUserId)) {
    return { ignored: true, reason: "anonymous_app_user" };
  }

  const userId = event.appUserId;
  const now = new Date();
  const expiration = event.expirationAtMs ? new Date(event.expirationAtMs) : null;

  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "PRODUCT_CHANGE":
    case "UNCANCELLATION":
    case "NON_RENEWING_PURCHASE":
    case "SUBSCRIPTION_EXTENDED":
    case "TEMPORARY_ENTITLEMENT_GRANT": {
      if (!event.productId) return { ignored: true, reason: "missing_product_id" };

      try {
        const result = await activateStoreSubscription({
          userId,
          productId: event.productId,
          entitlementExpiresAt: expiration,
          providerTransactionId: `revenuecat:${event.id}`,
          idempotencyKey: storeIdempotencyKey(`event:${event.id}`),
          cancelAtPeriodEnd: false,
          autoRenew: true,
          metadata: {
            source: "revenuecat_webhook",
            eventType: event.type,
            store: event.store,
            environment: event.environment,
          },
        });

        return { ignored: false, status: "succeeded", ...result };
      } catch (error) {
        if (error instanceof AppError && error.statusCode === 400) {
          console.error("[revenuecat-webhook] product is not mapped to a plan", {
            productId: event.productId,
            eventType: event.type,
          });
          return { ignored: true, reason: "product_not_mapped" };
        }
        throw error;
      }
    }

    case "CANCELLATION": {
      await db
        .update(userSubscriptions)
        .set({ cancelAtPeriodEnd: true, autoRenew: false, updatedAt: now })
        .where(
          and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.status, "active"))
        );
      invalidatePricingCaches(userId);
      return { ignored: false, status: "cancellation_scheduled" };
    }

    case "EXPIRATION": {
      await db
        .update(userSubscriptions)
        .set({ status: "cancelled", autoRenew: false, updatedAt: now })
        .where(
          and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.status, "active"))
        );
      invalidatePricingCaches(userId);
      return { ignored: false, status: "expired" };
    }

    case "BILLING_ISSUE": {
      await db
        .update(userSubscriptions)
        .set({ autoRenew: false, updatedAt: now })
        .where(
          and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.status, "active"))
        );
      invalidatePricingCaches(userId);
      return { ignored: false, status: "billing_issue" };
    }

    default:
      return { ignored: true, type: event.type };
  }
}
