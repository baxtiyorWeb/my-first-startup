import { apiClient } from "./client";
import { mapPostResponseToPost, type PostResponse } from "./posts";
import type { Post } from "@/types/social";

export type ShortsFilter = "for_you" | "trending" | "tech" | "dev";

export const shortsApi = {
  async getShorts(params: { cursor?: string; limit?: number; filter?: ShortsFilter } = {}): Promise<{
    posts: Post[];
    nextCursor: string | null;
  }> {
    const query = new URLSearchParams();
    if (params.cursor) query.set("cursor", params.cursor);
    if (params.limit) query.set("limit", String(params.limit));
    if (params.filter) query.set("filter", params.filter);

    const qs = query.toString();
    const res = await apiClient<PostResponse[]>(`/api/shorts${qs ? `?${qs}` : ""}`);
    const list = Array.isArray(res.data) ? res.data : [];
    return {
      posts: list.map(mapPostResponseToPost),
      nextCursor: res.meta?.nextCursor || null,
    };
  },
};
