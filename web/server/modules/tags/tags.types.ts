export type TagStatus = "active" | "pending" | "restricted" | "hidden" | "merged";

export interface TagSummary {
  id: string;
  name: string;
  slug: string;
}

export interface TagItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  status: TagStatus;
  isOfficial: boolean;
  usageCount: number;
  recentUsageCount: number;
  engagementScore: number;
  lastUsedAt?: string | null;
  createdAt: string;
}

export interface TagSearchResult {
  items: TagItem[];
  nextOffset: number | null;
  exactMatch: boolean;
  canCreate: boolean;
  normalizedCandidate: string | null;
}

export interface TagSuggestResult {
  query: string;
  items: TagItem[];
  exactMatch: boolean;
  canCreate: boolean;
  normalizedCandidate: string | null;
}

export interface TagCreateResult {
  tag: TagItem;
  created: boolean;
}

export interface AdminTagUpdateInput {
  name?: string;
  description?: string | null;
  status?: TagStatus;
  isOfficial?: boolean;
}
