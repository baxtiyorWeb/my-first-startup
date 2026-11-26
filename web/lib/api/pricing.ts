import { apiClient } from "./client";

export interface PricingPlanDto {
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

export interface PricingOverviewResponse {
  plans: PricingPlanDto[];
  currentSubscription: SubscriptionStatusDto | null;
  providerConfigured: boolean;
}

export interface CheckoutResponse {
  transactionId: string | null;
  status: string;
  requiresPayment: boolean;
  amount: number;
  currency: string;
  provider?: string;
  checkoutUrl?: string | null;
  subscriptionId?: string;
  message: string;
}

export const pricingApi = {
  async getOverview(): Promise<PricingOverviewResponse> {
    const res = await apiClient<PricingOverviewResponse>("/api/pricing");
    return res.data;
  },

  async checkout(payload: {
    planSlug: string;
    billingCycle: "monthly" | "yearly";
    provider?: "click" | "payme" | "stripe";
    idempotencyKey?: string;
  }): Promise<CheckoutResponse> {
    const res = await apiClient<CheckoutResponse>("/api/subscriptions/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async cancel(): Promise<{
    subscriptionId: string;
    cancelAtPeriodEnd: boolean;
    autoRenew: boolean;
    currentPeriodEnd: string;
  }> {
    const res = await apiClient<{
      subscriptionId: string;
      cancelAtPeriodEnd: boolean;
      autoRenew: boolean;
      currentPeriodEnd: string;
    }>("/api/subscriptions/cancel", { method: "POST" });
    return res.data;
  },
};
