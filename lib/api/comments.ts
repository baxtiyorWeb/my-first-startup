import { apiClient } from "./client";
import type { CommentThreadItem } from "@/types/social";

export interface BackendComment {
  id: string;
  postId: string;
  parentId?: string | null;
  content: string;
  likesCount: number;
  isLiked: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    handle: string;
    role: string;
    avatarUrl?: string | null;
    verified: boolean;
  };
  replies?: BackendComment[];
}

export function mapBackendCommentToThreadItem(c: BackendComment): CommentThreadItem {
  return {
    id: c.id,
    postId: c.postId,
    parentId: c.parentId || undefined,
    author: {
      id: c.author.id,
      name: c.author.name,
      handle: c.author.handle.startsWith("@") ? c.author.handle : `@${c.author.handle}`,
      role: c.author.role,
      avatarUrl: c.author.avatarUrl || undefined,
      verified: c.author.verified,
    },
    content: c.content,
    createdAt: c.createdAt,
    likesCount: c.likesCount,
    isLiked: c.isLiked,
    replies: c.replies ? c.replies.map(mapBackendCommentToThreadItem) : undefined,
  };
}

export async function getComments(postId: string) {
  const res = await apiClient<BackendComment[]>(`/api/posts/${postId}/comments`);
  return res.data.map(mapBackendCommentToThreadItem);
}

export async function addComment(
  postId: string,
  payload: { content: string; parentId?: string }
) {
  const res = await apiClient<BackendComment>(`/api/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return mapBackendCommentToThreadItem(res.data);
}

export async function toggleCommentLike(commentId: string) {
  const res = await apiClient<{ liked: boolean; likesCount: number }>(
    `/api/comments/${commentId}/like`,
    {
      method: "POST",
    }
  );
  return res.data;
}
