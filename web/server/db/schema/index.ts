import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  timestamp,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// 1. Users Table
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 255 }),
    googleId: varchar("google_id", { length: 255 }),
    handle: varchar("handle", { length: 50 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    role: varchar("role", { length: 150 }).default("Go-getter").notNull(),
    bio: text("bio").default(""),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    location: varchar("location", { length: 100 }),
    website: varchar("website", { length: 200 }),
    intent: varchar("intent", { length: 50 }).default("none").notNull(),
    verified: boolean("verified").default(false).notNull(),
    isOnboarded: boolean("is_onboarded").default(false).notNull(),
    isBot: boolean("is_bot").default(false).notNull(),
    botPersona: text("bot_persona"),
    coverPhotoUrl: varchar("cover_photo_url", { length: 500 }),
    socialLinks: jsonb("social_links").$type<{ github?: string; linkedin?: string; twitter?: string; website?: string }>().default({}),
    isPrivate: boolean("is_private").default(false).notNull(),
    dmPermission: varchar("dm_permission", { length: 20 }).default("everyone").notNull(),
    showOnlineStatus: boolean("show_online_status").default(true).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }),
    twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
    twoFactorType: varchar("two_factor_type", { length: 20 }).default("authenticator").notNull(),
    theme: varchar("theme", { length: 20 }).default("system").notNull(),
    isDeactivated: boolean("is_deactivated").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_users_phone").on(table.phone),
    uniqueIndex("idx_users_email").on(table.email),
    uniqueIndex("idx_users_google_id").on(table.googleId),
    uniqueIndex("idx_users_handle").on(table.handle),
  ]
);

export interface VideoChapter {
  time: string;
  seconds: number;
  title: string;
}

// 2. Posts / Editorial Content Table (Articles, Video Tutorials, News, Thoughts)
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 340 }),
    title: varchar("title", { length: 300 }),
    content: text("content").notNull(),
    postType: varchar("post_type", { length: 30 }).default("thought").notNull(),
    contentKind: varchar("content_kind", { length: 24 }).default("article").notNull(), // 'article' | 'video' | 'news' | 'thought'
    status: varchar("status", { length: 20 }).default("published").notNull(), // 'draft' | 'published' | 'archived'
    isIndexable: boolean("is_indexable").default(false).notNull(),
    locale: varchar("locale", { length: 8 }).default("uz").notNull(),
    category: varchar("category", { length: 64 }).default("umumiy").notNull(),
    tags: jsonb("tags").$type<string[]>().default([]).notNull(),
    coverImageUrl: text("cover_image_url"),
    coverImageAlt: varchar("cover_image_alt", { length: 255 }),
    seoTitle: varchar("seo_title", { length: 180 }),
    seoDescription: varchar("seo_description", { length: 340 }),
    focusKeyword: varchar("focus_keyword", { length: 120 }),
    canonicalUrl: varchar("canonical_url", { length: 500 }),
    videoUrl: text("video_url"),
    youtubeVideoId: varchar("youtube_video_id", { length: 64 }),
    bunnyVideoId: varchar("bunny_video_id", { length: 128 }),
    videoDurationSeconds: integer("video_duration_seconds"),
    videoChapters: jsonb("video_chapters").$type<VideoChapter[]>().default([]).notNull(),
    transcript: text("transcript"),
    publishedAt: timestamp("published_at", { withTimezone: true }).defaultNow().notNull(),
    projectUrl: varchar("project_url", { length: 500 }),
    projectStage: varchar("project_stage", { length: 50 }),
    lookingFor: varchar("looking_for", { length: 50 }),
    mediaUrls: jsonb("media_urls").$type<string[]>().default([]).notNull(),
    readingTimeMinutes: integer("reading_time_minutes").default(1).notNull(),
    likesCount: integer("likes_count").default(0).notNull(),
    commentsCount: integer("comments_count").default(0).notNull(),
    sharesCount: integer("shares_count").default(0).notNull(),
    viewsCount: integer("views_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("idx_posts_slug").on(table.slug),
    index("idx_posts_created_at").on(table.createdAt),
    index("idx_posts_author_created").on(table.authorId, table.createdAt),
    index("idx_posts_post_type").on(table.postType),
    index("idx_posts_kind_status").on(table.contentKind, table.status, table.isIndexable, table.publishedAt),
    index("idx_posts_category").on(table.category),
  ]
);

// 2.0 Slug Redirects Table (301 Permanent Redirects for SEO Link Equity preservation)
export const slugRedirects = pgTable(
  "slug_redirects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    oldSlug: varchar("old_slug", { length: 340 }).notNull(),
    newSlug: varchar("new_slug", { length: 340 }).notNull(),
    contentKind: varchar("content_kind", { length: 24 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_slug_redirects_old_kind").on(table.oldSlug, table.contentKind),
  ]
);

// 2.1 Post Views Table (for 1-hour deduplicated view counting)
export const postViews = pgTable(
  "post_views",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    viewerId: varchar("viewer_id", { length: 128 }).notNull(),
    viewedAt: timestamp("viewed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_post_views_post_viewer").on(table.postId, table.viewerId, table.viewedAt),
  ]
);

// 3. Comments Table (Nested threads support)
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    content: text("content").notNull(),
    likesCount: integer("likes_count").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_comments_post_parent").on(table.postId, table.parentId, table.createdAt),
    index("idx_comments_author").on(table.authorId),
  ]
);

// 4. Post Likes Table (Unique constraint prevents duplicate likes)
export const postLikes = pgTable(
  "post_likes",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.userId] }),
    index("idx_post_likes_user").on(table.userId),
  ]
);

// 5. Comment Likes Table
export const commentLikes = pgTable(
  "comment_likes",
  {
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.commentId, table.userId] }),
  ]
);

// 6. Bookmarks Table (Private to each user)
export const bookmarks = pgTable(
  "bookmarks",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.userId] }),
    index("idx_bookmarks_user_created").on(table.userId, table.createdAt),
  ]
);

// 7. Follows Table (Prevent self-follow, atomic counters)
export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.followerId, table.followingId] }),
    check("follows_no_self_follow", sql`${table.followerId} != ${table.followingId}`),
    index("idx_follows_following").on(table.followingId),
    index("idx_follows_follower").on(table.followerId),
  ]
);

// 8. Reports Table
export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reporterId: uuid("reporter_id").references(() => users.id, { onDelete: "set null" }),
    targetId: uuid("target_id").notNull(),
    targetType: varchar("target_type", { length: 20 }).notNull(), // "post" | "comment" | "user"
    reason: varchar("reason", { length: 50 }).notNull(),
    context: text("context"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_reports_target").on(table.targetId, table.targetType),
  ]
);

// 9. OTP Verification Codes Table
export const verificationCodes = pgTable(
  "verification_codes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    phone: varchar("phone", { length: 20 }).notNull(),
    codeHash: varchar("code_hash", { length: 128 }).notNull(),
    attempts: integer("attempts").default(0).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_verification_phone").on(table.phone),
  ]
);

// 10. Notifications Table (with anti-spam aggregation & read status)
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recipientId: uuid("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id")
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 30 }).notNull(), // "like" | "comment" | "reply" | "follow" | "new_post"
    targetId: uuid("target_id"),
    targetType: varchar("target_type", { length: 20 }), // "post" | "comment" | "user"
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    link: varchar("link", { length: 500 }).notNull(),
    isRead: boolean("is_read").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_notifications_recipient_read").on(table.recipientId, table.isRead, table.createdAt),
    index("idx_notifications_recipient_type_target").on(table.recipientId, table.type, table.targetId),
  ]
);

// 11. Notification Settings Table (Per-user preference toggles)
export const notificationSettings = pgTable(
  "notification_settings",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    notifyLikes: boolean("notify_likes").default(true).notNull(),
    notifyComments: boolean("notify_comments").default(true).notNull(),
    notifyShares: boolean("notify_shares").default(true).notNull(),
    notifyFollows: boolean("notify_follows").default(true).notNull(),
    notifyMentions: boolean("notify_mentions").default(true).notNull(),
    notifyNewPosts: boolean("notify_new_posts").default(true).notNull(),
    pushEnabled: boolean("push_enabled").default(true).notNull(),
    emailDigest: boolean("email_digest").default(true).notNull(),
    emailSecurity: boolean("email_security").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

// 12. User Blocked List Table
export const userBlocks = pgTable(
  "user_blocks",
  {
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.blockerId, table.blockedId] }),
    index("idx_user_blocks_blocker").on(table.blockerId),
  ]
);

// 13. Active User Sessions Table
export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    deviceName: varchar("device_name", { length: 100 }).notNull(),
    browser: varchar("browser", { length: 100 }).notNull(),
    ipAddress: varchar("ip_address", { length: 50 }),
    location: varchar("location", { length: 100 }),
    isCurrent: boolean("is_current").default(false).notNull(),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_user_sessions_user").on(table.userId),
  ]
);

// Relations definition for Drizzle Relational Queries
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  postLikes: many(postLikes),
  bookmarks: many(bookmarks),
  followers: many(follows, { relationName: "following" }),
  following: many(follows, { relationName: "follower" }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
  likes: many(postLikes),
  bookmarks: many(bookmarks),
  postTags: many(postTags),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "replies",
  }),
  replies: many(comments, { relationName: "replies" }),
  likes: many(commentLikes),
}));

// 10. Bot Activities Log
export const botActivities = pgTable(
  "bot_activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    activityType: varchar("activity_type", { length: 50 }).notNull(),
    botId: uuid("bot_id").references(() => users.id, { onDelete: "set null" }),
    targetId: uuid("target_id"),
    details: text("details"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_bot_activities_created").on(table.createdAt),
    index("idx_bot_activities_type").on(table.activityType),
  ]
);

// 11. Bot Engine Global Settings
export const botEngineSettings = pgTable(
  "bot_engine_settings",
  {
    id: varchar("id", { length: 50 }).primaryKey().default("default"),
    isActive: boolean("is_active").default(true).notNull(),
    dailyLimit: integer("daily_limit").default(30).notNull(),
    currentDailyCount: integer("current_daily_count").default(0).notNull(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  }
);

// 14. Conversations Table (Supports 1-to-1 DMs & Group chats)
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: varchar("type", { length: 20 }).default("direct").notNull(),
    directPairKey: varchar("direct_pair_key", { length: 73 }),
    lastMessageId: uuid("last_message_id"),
    lastMessageText: text("last_message_text"),
    lastMessageSenderId: uuid("last_message_sender_id"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_conversations_pair_key").on(table.directPairKey),
    index("idx_conversations_last_msg_at").on(table.lastMessageAt),
  ]
);

// 15. Conversation Participants Table (Tracks memberships, read markers, muted/archived flags)
export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    lastReadMessageId: uuid("last_read_message_id"),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    isArchived: boolean("is_archived").default(false).notNull(),
    isMuted: boolean("is_muted").default(false).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.conversationId, table.userId] }),
    index("idx_conv_participants_user").on(table.userId, table.conversationId),
    index("idx_conv_participants_user_archived").on(table.userId, table.isArchived),
  ]
);

// 16. Messages Table (Idempotent, ordered, persistent message history)
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    messageType: varchar("message_type", { length: 20 }).default("text").notNull(),
    mediaUrls: jsonb("media_urls").$type<string[]>().default([]).notNull(),
    clientMessageId: varchar("client_message_id", { length: 64 }),
    replyToId: uuid("reply_to_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_messages_conv_created").on(table.conversationId, table.createdAt),
    index("idx_messages_sender").on(table.senderId),
    uniqueIndex("idx_messages_client_msg_id").on(table.conversationId, table.senderId, table.clientMessageId),
  ]
);

// Relations
export const conversationsRelations = relations(conversations, ({ many }) => ({
  participants: many(conversationParticipants),
  messages: many(messages),
}));

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationParticipants.conversationId],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [conversationParticipants.userId],
    references: [users.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  replyTo: one(messages, {
    fields: [messages.replyToId],
    references: [messages.id],
  }),
}));

// 20. Media Engine Table (YouTube, Videos, Images, Files)
export const media = pgTable(
  "media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    mediaType: varchar("media_type", { length: 32 }).notNull(), // 'youtube' | 'video' | 'image' | 'file'
    url: text("url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    storagePath: text("storage_path"),
    mimeType: varchar("mime_type", { length: 128 }),
    fileExtension: varchar("file_extension", { length: 32 }).default("").notNull(),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).default(0).notNull(),
    durationSeconds: integer("duration_seconds"),
    width: integer("width"),
    height: integer("height"),
    youtubeVideoId: varchar("youtube_video_id", { length: 64 }),
    bunnyVideoId: varchar("bunny_video_id", { length: 128 }),
    collectionName: varchar("collection_name", { length: 128 }),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_media_type").on(table.mediaType),
    index("idx_media_created_at").on(table.createdAt),
    index("idx_media_uploaded_by").on(table.uploadedBy),
    index("idx_media_collection").on(table.collectionName),
  ]
);

export const mediaRelations = relations(media, ({ one }) => ({
  uploader: one(users, {
    fields: [media.uploadedBy],
    references: [users.id],
  }),
}));

// 21. Subscription Plans Table
export const subscriptionPlans = pgTable(
  "subscription_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: varchar("slug", { length: 40 }).notNull(), // 'free' | 'pro' | 'team'
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description").default("").notNull(),
    priceMonthlyUzs: integer("price_monthly_uzs").default(0).notNull(),
    priceYearlyUzs: integer("price_yearly_uzs").default(0).notNull(),
    currency: varchar("currency", { length: 10 }).default("UZS").notNull(),
    features: jsonb("features").$type<string[]>().default([]).notNull(),
    limits: jsonb("limits")
      .$type<{ maxMediaSizeMb: number; maxDailyPosts: number; hdShorts: boolean; verifiedBadge: boolean; analytics: boolean }>()
      .default({ maxMediaSizeMb: 10, maxDailyPosts: 10, hdShorts: false, verifiedBadge: false, analytics: false })
      .notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_subscription_plans_slug").on(table.slug),
  ]
);

// 22. User Subscriptions Table (Server-authoritative entitlement state)
export const userSubscriptions = pgTable(
  "user_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 24 }).default("active").notNull(), // 'active' | 'pending' | 'cancelled' | 'expired' | 'past_due'
    billingCycle: varchar("billing_cycle", { length: 16 }).default("monthly").notNull(), // 'monthly' | 'yearly'
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).defaultNow().notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false).notNull(),
    autoRenew: boolean("auto_renew").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("idx_user_subscriptions_user").on(table.userId, table.status),
  ]
);

// 23. Payment Transactions Table (Idempotent provider verification audit log)
export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(() => userSubscriptions.id, { onDelete: "set null" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => subscriptionPlans.id, { onDelete: "restrict" }),
    provider: varchar("provider", { length: 24 }).notNull(), // 'click' | 'payme' | 'stripe'
    providerTransactionId: varchar("provider_transaction_id", { length: 160 }),
    idempotencyKey: varchar("idempotency_key", { length: 120 }).notNull(),
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 10 }).default("UZS").notNull(),
    status: varchar("status", { length: 24 }).default("pending").notNull(), // 'pending' | 'succeeded' | 'failed' | 'refunded'
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_payment_transactions_idempotency").on(table.idempotencyKey),
    index("idx_payment_transactions_user").on(table.userId, table.createdAt),
    index("idx_payment_transactions_provider_tx").on(table.provider, table.providerTransactionId),
  ]
);

// 24. Dynamic Tags Table (Canonical, normalized, moderated platform taxonomy)
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 64 }).notNull(),
    slug: varchar("slug", { length: 72 }).notNull(),
    normalizedName: varchar("normalized_name", { length: 80 }).notNull(),
    description: text("description"),
    status: varchar("status", { length: 20 }).default("active").notNull(), // 'active' | 'pending' | 'restricted' | 'hidden' | 'merged'
    isOfficial: boolean("is_official").default(false).notNull(),
    mergedIntoId: uuid("merged_into_id"),
    usageCount: integer("usage_count").default(0).notNull(),
    recentUsageCount: integer("recent_usage_count").default(0).notNull(),
    engagementScore: integer("engagement_score").default(0).notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_tags_slug").on(table.slug),
    uniqueIndex("idx_tags_normalized_name").on(table.normalizedName),
    index("idx_tags_status_trending").on(
      table.status,
      table.recentUsageCount,
      table.engagementScore,
      table.usageCount
    ),
    index("idx_tags_created_by_at").on(table.createdBy, table.createdAt),
    check(
      "tags_counts_non_negative",
      sql`${table.usageCount} >= 0 AND ${table.recentUsageCount} >= 0 AND ${table.engagementScore} >= 0`
    ),
  ]
);

// 25. Post <-> Tag Relational Join Table
export const postTags = pgTable(
  "post_tags",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.tagId] }),
    index("idx_post_tags_tag_created").on(table.tagId, table.createdAt),
    index("idx_post_tags_post_pos").on(table.postId, table.position),
  ]
);

export const tagsRelations = relations(tags, ({ one, many }) => ({
  creator: one(users, {
    fields: [tags.createdBy],
    references: [users.id],
  }),
  postTags: many(postTags),
}));

export const postTagsRelations = relations(postTags, ({ one }) => ({
  post: one(posts, {
    fields: [postTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postTags.tagId],
    references: [tags.id],
  }),
}));


