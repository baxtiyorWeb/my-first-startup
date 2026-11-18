import { apiClient } from "./client";
import { type PostResponse, mapPostResponseToPost } from "./posts";
import type { Post } from "@/types/social";

export async function getBookmarks(): Promise<Post[]> {
  const res = await apiClient<PostResponse[]>("/api/bookmarks");
  return res.data.map(mapPostResponseToPost);
}
