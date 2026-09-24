import { apiClient } from "./client";

export interface AuthUser {
  userId: string;
  phone: string;
  handle: string;
  name: string;
  role: string;
  isOnboarded: boolean;
  avatarUrl?: string | null;
  bio?: string | null;
}

export interface OnboardingPayload {
  name: string;
  handle: string;
  role: string;
  bio?: string;
}

export async function requestOtp(phone: string) {
  const res = await apiClient<{ message: string }>("/api/auth/otp", {
    method: "POST",
    body: JSON.stringify({ phone }),
  });
  return res.data;
}

export async function verifyOtp(phone: string, code: string) {
  const res = await apiClient<{ user: AuthUser }>("/api/auth/verify", {
    method: "POST",
    body: JSON.stringify({ phone, code }),
  });
  return res.data;
}

export interface SessionResponse {
  isAuthenticated: boolean;
  isOnboarded: boolean;
  user: (AuthUser & {
    id: string;
    location?: string | null;
    website?: string | null;
    verified: boolean;
    joinedDate: string;
    isSelf: boolean;
    isFollowing: boolean;
    stats?: {
      postsCount: number;
      discussionsCount: number;
      repliesCount: number;
      followersCount: number;
      followingCount: number;
    };
  }) | null;
}

export async function getSession(): Promise<SessionResponse> {
  const res = await apiClient<SessionResponse>("/api/auth/session");
  return res.data;
}

export async function completeOnboarding(payload: OnboardingPayload) {
  const res = await apiClient<{ user: AuthUser }>("/api/auth/onboarding", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.data.user;
}

export async function logout() {
  const res = await apiClient<{ message: string }>("/api/auth/logout", {
    method: "POST",
  });
  return res.data;
}
