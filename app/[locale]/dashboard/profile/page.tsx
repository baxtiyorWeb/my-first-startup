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

function ProfileContent() {
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const { t } = useI18n();

  const rawHandle = searchParams.get("user");
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
    if (!currentHandle) return;

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
  }, [currentHandle, t]);

  const isSelf = profile?.isSelf ?? (session.user.handle === currentHandle);

  const activeDiscussions = useMemo(() => {
    if (discussionPosts.length > 0) return discussionPosts;
    return userPosts.filter((p) => (p.commentsCount ?? 0) >= 1);
  }, [discussionPosts, userPosts]);

  const featuredThought = useMemo(() => {
    if (userPosts.length === 0) return null;
    return userPosts[0];
  }, [userPosts]);

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const data = await api.users.updateProfile({
        name: updates.name,
        role: updates.role,
        bio: updates.bio,
        location: updates.location,
        website: updates.website,
        avatarUrl: updates.avatarUrl,
      });
      setProfile(data.profile);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : t("settings.errorSaved");
      toast.error(msg);
      throw err;
    }
  };

  const handleFollowToggle = async () => {
    if (!profile) return;
    try {
      const data = await api.users.toggleFollow(currentHandle);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              isFollowing: data.following,
              stats: {
                ...prev.stats,
                followersCount: data.followersCount,
              },
            }
          : null
      );
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : t("common.errorOccurred");
      toast.error(msg);
    }
  };

  const handleLikeChange = async (postId: string, isLiked: boolean, count: number) => {
    setUserPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isLiked, likesCount: count } : p))
    );
    try {
      await api.posts.toggleLike(postId);
    } catch {
      // Revert silently on failure
    }
  };

  const handleSaveChange = async (postId: string, isSaved: boolean) => {
    setUserPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, isSaved } : p))
    );
    try {
      await api.posts.toggleBookmark(postId);
    } catch {
      // Revert silently on failure
    }
  };

  const handleDeletePost = async (postId: string) => {
    setUserPosts((prev) => prev.filter((p) => p.id !== postId));
    try {
      await api.posts.deletePost(postId);
      toast.success(t("feed.deleteSuccess"));
    } catch {
      toast.error(t("feed.deleteError"));
      fetchProfile();
    }
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
      />

      {/* 2. Pinned / Featured Thought Card */}
      {featuredThought && (
        <ProfileFeaturedThought
          post={featuredThought}
        />
      )}

      {/* 3. Clean Content Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-t-lg px-2 pt-1 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
          {/* All Posts */}
          <button
            type="button"
            onClick={() => setActiveTab("posts")}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "posts"
                ? "border-slate-950 dark:border-white text-slate-950 dark:text-white"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
            }`}
          >
            {t("profile.tabs.thoughts")} ({userPosts.length})
          </button>

          {/* Active Discussions */}
          <button
            type="button"
            onClick={() => setActiveTab("discussions")}
            className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "discussions"
                ? "border-slate-950 dark:border-white text-slate-950 dark:text-white"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
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

      {/* Edit Profile Modal */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        profile={profile}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateProfile}
      />
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
