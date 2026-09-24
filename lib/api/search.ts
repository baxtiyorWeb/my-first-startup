import { apiClient } from "./client";
import type { SearchResponse, SearchCategory } from "@/types/social";

export async function searchContent(
  q: string,
  limit: number = 20,
  category: SearchCategory = "all",
  signal?: AbortSignal
): Promise<SearchResponse> {
  const query = new URLSearchParams({
    q,
    limit: String(limit),
    category,
  });

  const res = await apiClient<SearchResponse>(`/api/search?${query.toString()}`, {
    signal,
  });

  return res.data;
}

export async function query(params: {
  q: string;
  limit?: number;
  category?: SearchCategory;
  signal?: AbortSignal;
}): Promise<SearchResponse> {
  return searchContent(params.q, params.limit, params.category, params.signal);
}

