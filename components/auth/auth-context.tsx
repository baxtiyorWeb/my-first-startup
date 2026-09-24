"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { UserSession, UserProfile, OnboardingData } from "@/types/social";
import { api, ApiError } from "@/lib/api";

const EMPTY_PROFILE: UserProfile = {
  id: "",
  name: "",
  handle: "",
  role: "",
  bio: "",
  joinedDate: "2026-yil",
  verified: false,
  stats: {
    postsCount: 0,
    discussionsCount: 0,
    repliesCount: 0,
    totalDiscussionsEngaged: 0,
    followersCount: 0,
    followingCount: 0,
  },
  isSelf: true,
  isFollowing: false,
};

const EMPTY_SESSION: UserSession = {
  phoneNumber: "",
  user: EMPTY_PROFILE,
  isAuthenticated: false,
  isOnboarded: false,
};

interface AuthContextType {
  session: UserSession;
  isLoaded: boolean;
  pendingPhone: string;
  setPendingPhone: (phone: string) => void;
  loginWithPhone: (phone: string) => Promise<{ success: boolean; code?: string }>;
  verifyOtp: (code: string) => Promise<{ success: boolean; isOnboarded?: boolean; error?: string }>;
  resendOtp: () => Promise<{ success: boolean; code?: string }>;
  completeOnboarding: (data: OnboardingData) => Promise<void>;
  logout: () => Promise<void>;
  updateCurrentUser: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession>(EMPTY_SESSION);
  const [isLoaded, setIsLoaded] = useState(false);
  const [pendingPhone, setPendingPhone] = useState("+998 90 123 45 67");

  // Load session from server HttpOnly cookie on mount
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const sessionData = await api.auth.getSession();
        if (isMounted && sessionData?.isAuthenticated && sessionData.user) {
          const u = sessionData.user;
          setSession({
            phoneNumber: u.phone || "",
            user: {
              ...EMPTY_PROFILE,
              id: u.id || u.userId || "",
              name: u.name,
              handle: u.handle.startsWith("@") ? u.handle : `@${u.handle}`,
              role: u.role,
              bio: u.bio || "",
              avatarUrl: u.avatarUrl || undefined,
              verified: u.verified ?? true,
              location: u.location || undefined,
              website: u.website || undefined,
              joinedDate: u.joinedDate || "2026-yil",
              stats: {
                ...EMPTY_PROFILE.stats,
                ...(u.stats || {}),
              },
            },
            isAuthenticated: true,
            isOnboarded: Boolean(sessionData.isOnboarded),
          });
        }
      } catch {
        // Not authenticated or session expired
        if (isMounted) {
          setSession(EMPTY_SESSION);
        }
      } finally {
        if (isMounted) {
          setIsLoaded(true);
        }
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const loginWithPhone = useCallback(async (phone: string): Promise<{ success: boolean; code?: string }> => {
    setPendingPhone(phone);
    const res = await api.auth.requestOtp(phone);
    return { success: true, code: res?.code };
  }, []);

  const verifyOtp = useCallback(
    async (code: string): Promise<{ success: boolean; isOnboarded?: boolean; error?: string }> => {
      try {
        const data = await api.auth.verifyOtp(pendingPhone, code);
        const authUser = data.user;

        const newSession: UserSession = {
          phoneNumber: authUser.phone,
          user: {
            ...EMPTY_PROFILE,
            id: authUser.userId,
            name: authUser.name,
            handle: authUser.handle.startsWith("@") ? authUser.handle : `@${authUser.handle}`,
            role: authUser.role,
            bio: authUser.bio || "",
            avatarUrl: authUser.avatarUrl || undefined,
            verified: true,
          },
          isAuthenticated: true,
          isOnboarded: authUser.isOnboarded,
        };

        setSession(newSession);
        return { success: true, isOnboarded: authUser.isOnboarded };
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Tasdiqlash kodini tekshirishda xatolik yuz berdi";
        return { success: false, error: message };
      }
    },
    [pendingPhone]
  );

  const resendOtp = useCallback(async (): Promise<{ success: boolean; code?: string }> => {
    if (!pendingPhone) return { success: false };
    const res = await api.auth.requestOtp(pendingPhone);
    return { success: true, code: res?.code };
  }, [pendingPhone]);

  const completeOnboarding = useCallback(
    async (data: OnboardingData) => {
      const cleanHandle = data.handle.replace(/^@/, "");
      const updatedUser = await api.auth.completeOnboarding({
        name: data.name,
        handle: cleanHandle,
        role: data.role,
        bio: data.bio,
      });

      // Follow any selected authors if provided
      if (data.followedAuthorIds && data.followedAuthorIds.length > 0) {
        for (const authorHandle of data.followedAuthorIds) {
          try {
            await api.users.toggleFollow(authorHandle);
          } catch {
            // Ignore non-blocking follow error during onboarding
          }
        }
      }

      setSession((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          name: updatedUser.name,
          handle: updatedUser.handle.startsWith("@") ? updatedUser.handle : `@${updatedUser.handle}`,
          role: updatedUser.role,
          bio: updatedUser.bio || "",
        },
        isAuthenticated: true,
        isOnboarded: true,
      }));
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore
    }
    setSession(EMPTY_SESSION);
  }, []);

  const updateCurrentUser = useCallback(
    async (updates: Partial<UserProfile>) => {
      try {
        const result = await api.users.updateProfile({
          name: updates.name,
          role: updates.role,
          bio: updates.bio,
          location: updates.location,
          website: updates.website,
          avatarUrl: updates.avatarUrl,
        });

        setSession((prev) => ({
          ...prev,
          user: {
            ...prev.user,
            ...result.profile,
          },
        }));
      } catch (err) {
        if (err instanceof ApiError) {
          throw err;
        }
        throw new Error("Profilni yangilashda xatolik yuz berdi");
      }
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoaded,
        pendingPhone,
        setPendingPhone,
        loginWithPhone,
        verifyOtp,
        resendOtp,
        completeOnboarding,
        logout,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
