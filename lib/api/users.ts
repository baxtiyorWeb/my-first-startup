import { apiClient } from "./client";
import { type PostResponse, mapPostResponseToPost } from "./posts";
import type { UserProfile, Post, UserIntent } from "@/types/social";

export interface BackendUserProfile {
  id: string;
  name: string;
  handle: string;
  role: string;
  bio: string;
  location?: string | null;
  website?: string | null;
  avatarUrl?: string | null;
  verified: boolean;
  intent?: UserIntent;
  joinedDate: string;
  isSelf: boolean;
  isFollowing: boolean;
  stats: {
    postsCount: number;
    discussionsCount: number;
    repliesCount: number;
    totalDiscussionsEngaged: number;
    followersCount: number;
    followingCount: number;
  };
  posts: PostResponse[];
  discussions?: PostResponse[];
}

export function mapBackendProfileToUserProfile(p: BackendUserProfile): {
  profile: UserProfile;
  posts: Post[];
  discussions: Post[];
} {
  const profile: UserProfile = {
    id: p.id,
    name: p.name,
    handle: p.handle.startsWith("@") ? p.handle : `@${p.handle}`,
    role: p.role,
    bio: p.bio,
    location: p.location || undefined,
    website: p.website || undefined,
    avatarUrl: p.avatarUrl || undefined,
    verified: p.verified,
    intent: p.intent || "none",
    joinedDate: p.joinedDate,
    isSelf: p.isSelf,
    isFollowing: p.isFollowing,
    stats: p.stats,
  };

  const posts = (p.posts || []).map(mapPostResponseToPost);
  const discussions = (p.discussions || []).map(mapPostResponseToPost);

  return { profile, posts, discussions };
}

export async function getProfile(handle: string) {
  const cleanHandle = handle.replace(/^@/, "");
  const res = await apiClient<BackendUserProfile>(`/api/users/${cleanHandle}`);
  return mapBackendProfileToUserProfile(res.data);
}

export async function updateProfile(payload: {
  name?: string;
  role?: string;
  bio?: string;
  location?: string;
  website?: string;
  avatarUrl?: string;
  intent?: UserIntent;
}) {
  const res = await apiClient<BackendUserProfile>("/api/users/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapBackendProfileToUserProfile(res.data);
}

export async function toggleFollow(handle: string) {
  const cleanHandle = handle.replace(/^@/, "");
  const res = await apiClient<{ following: boolean; followersCount: number }>(
    `/api/users/${cleanHandle}/follow`,
    {
      method: "POST",
    }
  );
  return res.data;
}

export const updateMe = updateProfile;

