"use client";

import React, { useState, useEffect, useMemo, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { PostCard } from "@/components/feed/post-card";
import { ProfileHeader } from "@/components/profile/profile-header";
import { ProfileFeaturedThought } from "@/components/profile/profile-featured-thought";
import { ProfileEditModal } from "@/components/profile/profile-edit-modal";
import { useAuth } from "@/components/auth/auth-context";
import { api, ApiError } from "@/lib/api";
import type { UserProfile, Post, ProfileTab } from "@/types/social";
import { RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/context";

import { isSameUser } from "@/lib/user-utils";

function ProfileContent() {
  const searchParams = useSearchParams();
  const { session, isLoaded } = useAuth();
  const { t } = useI18n();

  const rawHandle = searchParams.get("handle") || searchParams.get("user");
  const currentHandle = rawHandle
    ? rawHandle.startsWith("@")
      ? rawHandle
      : `@${rawHandle}`
    : session.user.handle || "";

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [discussionPosts, setDiscussionPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>("posts");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!currentHandle) return;
    setIsLoading(true);
    try {
      const data = await api.users.getProfile(currentHandle);
      setProfile(data.profile);
      setUserPosts(data.posts);
      setDiscussionPosts(data.discussions || []);
      setError(null);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t("feed.loadError");
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [currentHandle, t]);

  useEffect(() => {
    if (!currentHandle) {
      if (isLoaded && !session.isAuthenticated && !rawHandle) {
        setIsLoading(false);
        setError(t("profile.loginRequired"));
      }
      return;
    }

    let isMounted = true;
    api.users
      .getProfile(currentHandle)
      .then((data) => {
        if (isMounted) {
          setProfile(data.profile);
          setUserPosts(data.posts);
          setDiscussionPosts(data.discussions || []);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          const message =
            err instanceof ApiError ? err.message : t("feed.loadError");
          setError(message);
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentHandle, isLoaded, session.isAuthenticated, rawHandle, t]);

  const isSelf = Boolean(
    profile?.isSelf ||
      isSameUser(session.user, profile) ||
      isSameUser(session.user, { handle: currentHandle })
  );

  // Keep local profile synced with auth session updates for self user
  useEffect(() => {
    if (isSelf && profile && session.user.id) {
      setProfile((prev) => {
        if (!prev) return null;
        if (
          prev.name !== session.user.name ||
          prev.avatarUrl !== session.user.avatarUrl ||
          prev.coverPhotoUrl !== session.user.coverPhotoUrl ||
          prev.bio !== session.user.bio ||
          prev.role !== session.user.role ||
          prev.location !== session.user.location ||
          prev.website !== session.user.website ||
          prev.intent !== session.user.intent
        ) {
          return {
            ...prev,
            name: session.user.name,
            avatarUrl: session.user.avatarUrl,
            coverPhotoUrl: session.user.coverPhotoUrl,
            bio: session.user.bio || "",
            role: session.user.role,
            location: session.user.location,
            website: session.user.website,
            intent: session.user.intent || "none",
          };
        }
        return prev;
      });
    }
  }, [isSelf, profile, session.user]);

  const activeDiscussions = useMemo(() => {
    if (discussionPosts.length > 0) return discussionPosts;
    return userPosts.filter((p) => (p.commentsCount ?? 0) >= 1);
  }, [discussionPosts, userPosts]);

  const featuredThought = useMemo(() => {
    if (userPosts.length === 0) return null;
    return userPosts[0];
  }, [userPosts]);

  const handleUpdateProfile = (updates: Partial<UserProfile>) => {
    setProfile((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const handleCloseEditModal = useCallback(() => {
    setIsEditModalOpen(false);
  }, []);

  const handleSaveProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      handleUpdateProfile(updates);
    },
    []
  );


  const handleFollowToggle = async () => {
    if (!profile) return;
    if (!session.isAuthenticated) {
      toast.info(t("auth.loginRequired") || "Kuzatish uchun tizimga kiring");
      throw new Error("AUTH_REQUIRED");
    }
    if (isSelf) {
      toast.error(t("profile.cannotFollowSelf"));
      return;
    }
    try {
      const data = await api.users.toggleFollow(currentHandle);
      const following = data.isFollowing ?? data.following;
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: following,
              stats: {
                ...prev.stats,
                followersCount: data.followersCount,
              },
            }
          : null
      );
      if (following) {
        toast.success(`${profile.name} (${t("common.following")})`);
      } else {
        toast.info(`${profile.name} (${t("common.unfollow")})`);
      }
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : t("common.errorOccurred");
      toast.error(msg);
      throw err;
    }
  };

  const handleLikeChange = async (postId: string, isLiked: boolean, count: number) => {
    const prevUserPosts = userPosts;
    const prevDiscussions = discussionPosts;
    const patch = (list: Post[]) =>
      list.map((p) => (p.id === postId ? { ...p, isLiked, likesCount: count } : p));
    setUserPosts(patch);
    setDiscussionPosts(patch);
    try {
      const res = await api.posts.toggleLike(postId);
      const sync = (list: Post[]) =>
        list.map((p) =>
          p.id === postId
            ? { ...p, isLiked: res.liked, likesCount: res.likesCount }
            : p
        );
      setUserPosts(sync);
      setDiscussionPosts(sync);
    } catch (err) {
      setUserPosts(prevUserPosts);
      setDiscussionPosts(prevDiscussions);
      toast.error(err instanceof ApiError ? err.message : t("feed.likeError"));
    }
  };

  const handleSaveChange = async (postId: string, isSaved: boolean) => {
    const prevUserPosts = userPosts;
    const prevDiscussions = discussionPosts;
    const patch = (list: Post[]) =>
      list.map((p) => (p.id === postId ? { ...p, isSaved } : p));
    setUserPosts(patch);
    setDiscussionPosts(patch);
    try {
      const res = await api.posts.toggleBookmark(postId);
      const sync = (list: Post[]) =>
        list.map((p) => (p.id === postId ? { ...p, isSaved: res.saved } : p));
      setUserPosts(sync);
      setDiscussionPosts(sync);
      if (res.saved) {
        toast.success(t("common.saved"));
      }
    } catch (err) {
      setUserPosts(prevUserPosts);
      setDiscussionPosts(prevDiscussions);
      toast.error(err instanceof ApiError ? err.message : t("feed.saveError"));
    }
  };

  // PostCard handles the API request and only calls this after success.
  const handleDeletePost = (postId: string) => {
    setUserPosts((prev) => prev.filter((p) => p.id !== postId));
    setDiscussionPosts((prev) => prev.filter((p) => p.id !== postId));
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            stats: {
              ...prev.stats,
              postsCount: Math.max(0, prev.stats.postsCount - 1),
            },
          }
        : null
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4 w-full animate-pulse">
        <div className="h-44 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" />
        <div className="h-10 bg-slate-100 dark:bg-slate-900 rounded-lg w-64" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-32 bg-slate-100 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="py-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 space-y-3">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
          {error || t("search.noResults")}
        </p>
        <button
          type="button"
          onClick={fetchProfile}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-200 cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{t("common.retry")}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {/* 1. Profile Header Card */}
      <ProfileHeader
        profile={profile}
        isSelf={isSelf}
        onEditClick={() => setIsEditModalOpen(true)}
        onFollowToggle={handleFollowToggle}
        onTabChange={setActiveTab}
        onProfileUpdate={handleUpdateProfile}
      />

      {/* 2. Pinned / Featured Thought Card */}
      {featuredThought && (
        <ProfileFeaturedThought
          post={featuredThought}
        />
      )}

      {/* 3. Clean Content Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200/90 dark:border-[#2f3336] bg-white dark:bg-[#000000] rounded-t-[16px] px-3 pt-1 shadow-2xs">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          {/* All Posts */}
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "posts"
                ? "border-[#2dd4bf] text-[#2dd4bf] font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-[#e7e9ea]"
            }`}
          >
            {t("profile.tabs.thoughts")} ({userPosts.length})
          </button>

          {/* Active Discussions */}
          <button
            type="button"
            onClick={() => setActiveTab("discussions")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "discussions"
                ? "border-[#2dd4bf] text-[#2dd4bf] font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-[#e7e9ea]"
            }`}
          >
            {t("profile.tabs.discussions")} ({activeDiscussions.length})
          </button>
        </div>
      </div>

      {/* 4. Tab Content Area */}
      <div className="space-y-3">
        {activeTab === "posts" && (
          <>
            {userPosts.length === 0 ? (
              <div className="py-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t("profile.emptyThoughts")}
                </p>
              </div>
            ) : (
              userPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLikeChange={handleLikeChange}
                  onSaveChange={handleSaveChange}
                  onDelete={handleDeletePost}
                />
              ))
            )}
          </>
        )}

        {activeTab === "discussions" && (
          <>
            {activeDiscussions.length === 0 ? (
              <div className="py-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {t("profile.emptyDiscussions")}
                </p>
              </div>
            ) : (
              activeDiscussions.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLikeChange={handleLikeChange}
                  onSaveChange={handleSaveChange}
                  onDelete={handleDeletePost}
                />
              ))
            )}
          </>
        )}
      </div>

      {profile && (
        <ProfileEditModal
          isOpen={isEditModalOpen}
          profile={profile}
          onClose={handleCloseEditModal}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 w-full animate-pulse">
          <div className="h-44 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  );
}
