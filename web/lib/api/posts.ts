import { apiClient } from "./client";
import type {
  Post,
  PostType,
  ContentKind,
  ContentStatus,
  VideoChapterItem,
  ProjectStage,
  ProjectLookingFor,
  UserIntent,
} from "@/types/social";

export interface PostResponse {
  id: string;
  slug?: string | null;
  author: {
    id: string;
    name: string;
    handle: string;
    role: string;
    avatarUrl?: string | null;
    verified: boolean;
    intent?: UserIntent;
    isFollowing?: boolean;
  };
  title?: string | null;
  content: string;
  postType?: PostType;
  contentKind?: ContentKind;
  status?: ContentStatus;
  isIndexable?: boolean;
  locale?: string;
  category?: string;
  tags?: string[];
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  focusKeyword?: string | null;
  canonicalUrl?: string | null;
  videoUrl?: string | null;
  youtubeVideoId?: string | null;
  bunnyVideoId?: string | null;
  videoDurationSeconds?: number | null;
  videoChapters?: VideoChapterItem[];
  transcript?: string | null;
  publishedAt?: string;
  projectUrl?: string | null;
  projectStage?: ProjectStage | null;
  lookingFor?: ProjectLookingFor | null;
  mediaUrls?: string[];
  readingTimeMinutes: number;
  createdAt: string;
  updatedAt?: string;
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
  postType?: PostType;
  contentKind?: ContentKind;
}

/**
 * Adapter: Map backend PostResponse to frontend Post model
 */
export function mapPostResponseToPost(p: PostResponse): Post {
  return {
    id: p.id,
    slug: p.slug || null,
    author: {
      id: p.author.id,
      name: p.author.name,
      handle: p.author.handle.startsWith("@") ? p.author.handle : `@${p.author.handle}`,
      role: p.author.role,
      avatarUrl: p.author.avatarUrl || undefined,
      verified: p.author.verified,
      intent: p.author.intent || "none",
      isFollowing: Boolean(p.author.isFollowing),
    },
    title: p.title || undefined,
    content: p.content,
    postType: p.postType || "thought",
    contentKind: p.contentKind || "thought",
    status: p.status || "published",
    isIndexable: Boolean(p.isIndexable),
    locale: p.locale || "uz",
    category: p.category || "umumiy",
    tags: Array.isArray(p.tags) ? p.tags : [],
    coverImageUrl: p.coverImageUrl || null,
    coverImageAlt: p.coverImageAlt || null,
    seoTitle: p.seoTitle || null,
    seoDescription: p.seoDescription || null,
    focusKeyword: p.focusKeyword || null,
    canonicalUrl: p.canonicalUrl || null,
    videoUrl: p.videoUrl || null,
    youtubeVideoId: p.youtubeVideoId || null,
    bunnyVideoId: p.bunnyVideoId || null,
    videoDurationSeconds: p.videoDurationSeconds ?? null,
    videoChapters: Array.isArray(p.videoChapters) ? p.videoChapters : [],
    transcript: p.transcript || null,
    publishedAt: p.publishedAt || p.createdAt,
    projectUrl: p.projectUrl || undefined,
    projectStage: p.projectStage || undefined,
    lookingFor: p.lookingFor || undefined,
    mediaUrls: p.mediaUrls || [],
    topic: p.category || "Umumiy",
    readingTimeMinutes: p.readingTimeMinutes,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
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
  if (params.postType) query.set("type", params.postType);
  if (params.contentKind) query.set("kind", params.contentKind);

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

export interface CreatePostPayload {
  title?: string | null;
  slug?: string;
  content: string;
  postType?: PostType;
  contentKind?: ContentKind;
  status?: ContentStatus;
  isIndexable?: boolean;
  locale?: string;
  category?: string;
  tags?: string[];
  coverImageUrl?: string | null;
  coverImageAlt?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  focusKeyword?: string | null;
  canonicalUrl?: string | null;
  videoUrl?: string | null;
  youtubeVideoId?: string | null;
  bunnyVideoId?: string | null;
  videoDurationSeconds?: number | null;
  videoChapters?: VideoChapterItem[];
  transcript?: string | null;
  projectUrl?: string | null;
  projectStage?: ProjectStage | null;
  lookingFor?: ProjectLookingFor | null;
  mediaUrls?: string[];
}

export async function createPost(payload: CreatePostPayload) {
  const res = await apiClient<PostResponse>("/api/posts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapPostResponseToPost(res.data);
}

export async function updatePost(
  id: string,
  payload: Partial<CreatePostPayload> & { content: string }
) {
  const res = await apiClient<PostResponse>(`/api/posts/${id}`, {
    method: "PATCH",
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

export async function recordView(id: string) {
  const res = await apiClient<{ viewsCount: number }>(`/api/posts/${id}/view`, {
    method: "POST",
  });
  return res.data;
}
