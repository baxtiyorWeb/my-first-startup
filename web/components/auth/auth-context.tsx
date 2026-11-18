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
  completeOnboarding: (data: OnboardingData) => Promise<void>;
  logout: () => Promise<void>;
  updateCurrentUser: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession>(EMPTY_SESSION);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load session from server HttpOnly cookie on mount
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const sessionData = await api.auth.getSession();
        if (isMounted && sessionData?.isAuthenticated && sessionData.user) {
          const u = sessionData.user as any;
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
              coverPhotoUrl: u.coverPhotoUrl || undefined,
              socialLinks: u.socialLinks || undefined,
              isPrivate: u.isPrivate,
              dmPermission: u.dmPermission,
              showOnlineStatus: u.showOnlineStatus,
              twoFactorEnabled: u.twoFactorEnabled,
              twoFactorType: u.twoFactorType,
              theme: u.theme,
              intent: u.intent || "none",
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

  const completeOnboarding = useCallback(
    async (data: OnboardingData) => {
      const cleanHandle = data.handle.replace(/^@/, "");
      const updatedUser = await api.auth.completeOnboarding({
        name: data.name,
        handle: cleanHandle,
        role: data.role,
        bio: data.bio,
      });

      // Synchronously promote the user to authenticated & onboarded in client context
      setSession((prev) => ({
        ...prev,
        isOnboarded: true,
        user: {
          ...prev.user,
          name: updatedUser.name,
          handle: updatedUser.handle.startsWith("@") ? updatedUser.handle : `@${updatedUser.handle}`,
          role: updatedUser.role,
          bio: updatedUser.bio || "",
        },
      }));

      // Follow selected initial authors if any
      if (data.followedAuthorIds && data.followedAuthorIds.length > 0) {
        for (const authorId of data.followedAuthorIds) {
          try {
            await api.users.toggleFollow(authorId);
          } catch {
            // Ignore individual follow errors during onboarding
          }
        }
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      setSession(EMPTY_SESSION);
      window.location.href = "/auth/login";
    }
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
          coverPhotoUrl: updates.coverPhotoUrl,
          socialLinks: updates.socialLinks,
          isPrivate: updates.isPrivate,
          dmPermission: updates.dmPermission,
          showOnlineStatus: updates.showOnlineStatus,
          twoFactorEnabled: updates.twoFactorEnabled,
          twoFactorType: updates.twoFactorType,
          theme: updates.theme,
          intent: updates.intent,
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
