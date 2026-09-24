import { apiClient } from "./client";
import type { Post } from "@/types/social";

export interface PostResponse {
  id: string;
  author: {
    id: string;
    name: string;
    handle: string;
    role: string;
    avatarUrl?: string | null;
    verified: boolean;
  };
  title?: string | null;
  content: string;
  readingTimeMinutes: number;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount: number;
  isLiked: boolean;
  isSaved: boolean;
}

export interface GetFeedParams {
  cursor?: string;
  limit?: number;
}

/**
 * Adapter: Map backend PostResponse to frontend Post model
 */
export function mapPostResponseToPost(p: PostResponse): Post {
  return {
    id: p.id,
    author: {
      id: p.author.id,
      name: p.author.name,
      handle: p.author.handle.startsWith("@") ? p.author.handle : `@${p.author.handle}`,
      role: p.author.role,
      avatarUrl: p.author.avatarUrl || undefined,
      verified: p.author.verified,
    },
    title: p.title || undefined,
    content: p.content,
    topic: "Umumiy",
    category: p.title ? "analytical" : "discussion",
    readingTimeMinutes: p.readingTimeMinutes,
    createdAt: p.createdAt,
    likesCount: p.likesCount,
    commentsCount: p.commentsCount,
    sharesCount: p.sharesCount,
    viewsCount: p.viewsCount ?? 0,
    isLiked: p.isLiked,
    isSaved: p.isSaved,
  };
}

export async function getFeed(params: GetFeedParams = {}) {
  const query = new URLSearchParams();
  if (params.cursor) query.set("cursor", params.cursor);
  if (params.limit) query.set("limit", String(params.limit));

  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await apiClient<PostResponse[]>(`/api/posts${qs}`);

  return {
    posts: res.data.map(mapPostResponseToPost),
    cursor: res.meta?.cursor || null,
    hasMore: res.meta?.hasMore ?? false,
  };
}

export async function getPost(id: string) {
  const res = await apiClient<PostResponse>(`/api/posts/${id}`);
  return mapPostResponseToPost(res.data);
}

export async function recordPostView(id: string) {
  const res = await apiClient<{ incremented: boolean; viewsCount: number }>(
    `/api/posts/${id}/view`,
    {
      method: "POST",
    }
  );
  return res.data;
}

export async function createPost(payload: { title?: string; content: string }) {
  const res = await apiClient<PostResponse>("/api/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapPostResponseToPost(res.data);
}

export async function deletePost(id: string) {
  const res = await apiClient<{ success: boolean }>(`/api/posts/${id}`, {
    method: "DELETE",
  });
  return res.data;
}

export async function toggleLike(id: string) {
  const res = await apiClient<{ liked: boolean; likesCount: number }>(
    `/api/posts/${id}/like`,
    {
      method: "POST",
    }
  );
  return res.data;
}

export async function toggleBookmark(id: string) {
  const res = await apiClient<{ saved: boolean }>(`/api/posts/${id}/bookmark`, {
    method: "POST",
  });
  return res.data;
}
