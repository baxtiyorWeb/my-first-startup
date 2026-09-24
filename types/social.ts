/**
 * Fikr — Domain Types for Social Feed & Content Architecture
 * Designed for seamless future backend (REST/GraphQL/Server Actions) integration.
 */

export interface Author {
  id: string;
  name: string;
  handle: string;
  role: string;
  avatarUrl?: string;
  verified: boolean;
}

export type ContentTopic = 
  | "Dasturlash"
  | "Biznes & Startap"
  | "Dizayn & UX"
  | "Sun'iy intellekt"
  | "Ta'lim"
  | "Kitobxonlik"
  | "Umumiy"
  | (string & {});

export type ContentCategory = 
  | "all"
  | "discussion"
  | "analytical"
  | "experience";

export interface Post {
  id: string;
  author: Author;
  title?: string;
  content: string;
  topic?: ContentTopic;
  category?: "discussion" | "analytical" | "quick_thought" | "experience";
  readingTimeMinutes?: number;
  createdAt: string;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  viewsCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  tags?: string[];
}

export interface Comment {
  id: string;
  postId: string;
  author: Author;
  content: string;
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
}

export interface CreatePostInput {
  title?: string;
  content: string;
  topic: ContentTopic;
  tags?: string[];
}

export interface UserProfile extends Author {
  bio: string;
  location?: string;
  joinedDate: string;
  website?: string;
  primaryTopics?: ContentTopic[];
  stats: {
    postsCount: number;
    discussionsCount: number;
    repliesCount: number;
    totalDiscussionsEngaged: number;
    followersCount: number;
    followingCount: number;
  };
  isFollowing?: boolean;
  isSelf?: boolean;
  featuredPostId?: string;
}

export interface DiscussionReply {
  id: string;
  parentPostId: string;
  parentPostTitle: string;
  parentAuthorName: string;
  parentAuthorHandle: string;
  topic: ContentTopic;
  replyContent: string;
  createdAt: string;
  likesCount: number;
  isLiked?: boolean;
}

export type ProfileTab = "posts" | "discussions" | "replies";

export interface UserSession {
  phoneNumber: string;
  user: UserProfile;
  isAuthenticated: boolean;
  isOnboarded: boolean;
}

export interface OnboardingData {
  name: string;
  handle: string;
  role: string;
  bio: string;
  selectedTopics: string[];
  followedAuthorIds: string[];
}

export interface CommentThreadItem extends Comment {
  parentId?: string;
  replies?: CommentThreadItem[];
}

export type ReportTargetType = "post" | "comment" | "user";
export type ReportReasonType = 
  | "spam" 
  | "harassment" 
  | "misinformation" 
  | "inappropriate" 
  | "other";

export interface ReportSubmission {
  targetId: string;
  targetType: ReportTargetType;
  targetSummary: string;
  reason: ReportReasonType;
  context?: string;
  createdAt: string;
}

export type SearchCategory = "all" | "user" | "post";

export interface SearchItem {
  id: string;
  type: "author" | "post" | "topic" | "user";
  title: string;
  subtitle?: string;
  href: string;
  badge?: string;
  avatarUrl?: string;
  createdAt?: string;
  stats?: string;
}

export interface SearchResponse {
  items: SearchItem[];
  counts: {
    all: number;
    user: number;
    post: number;
  };
}
