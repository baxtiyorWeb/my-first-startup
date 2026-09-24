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
