import { apiClient } from "./client";
import type { SearchResponse, SearchCategory } from "@/types/social";

interface CacheEntry {
  data: SearchResponse;
  timestamp: number;
}

// Ultra-fast Client-Side Memory Cache (TTL: 30 seconds)
const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 30000;

export async function searchContent(
  q: string,
  limit: number = 20,
  category: SearchCategory = "all",
  signal?: AbortSignal
): Promise<SearchResponse> {
  const normalizedQuery = q.trim().toLowerCase();
  if (!normalizedQuery) {
    return { items: [], counts: { all: 0, user: 0, post: 0 } };
  }

  const cacheKey = `${normalizedQuery}_${limit}_${category}`;
  const cached = searchCache.get(cacheKey);
  const now = Date.now();

  // Return instant cached response if valid
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const searchParams = new URLSearchParams({
    q: normalizedQuery,
    limit: String(limit),
    category,
  });

  const res = await apiClient<SearchResponse>(`/api/search?${searchParams.toString()}`, {
    signal,
  });

  if (res.data) {
    searchCache.set(cacheKey, { data: res.data, timestamp: now });
  }

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


