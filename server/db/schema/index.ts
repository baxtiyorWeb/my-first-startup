import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Users Table
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    phone: varchar("phone", { length: 20 }).notNull(),
    handle: varchar("handle", { length: 50 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    role: varchar("role", { length: 150 }).default("Fikr muallifi").notNull(),
    bio: text("bio").default(""),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    location: varchar("location", { length: 100 }),
    website: varchar("website", { length: 200 }),
    intent: varchar("intent", { length: 50 }).default("none").notNull(),
    verified: boolean("verified").default(false).notNull(),
    isOnboarded: boolean("is_onboarded").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("idx_users_phone").on(table.phone),
    uniqueIndex("idx_users_handle").on(table.handle),
  ]
);

// 2. Posts Table
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 300 }),
    content: text("content").notNull(),
    postType: varchar("post_type", { length: 30 }).default("thought").notNull(),
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
    index("idx_posts_created_at").on(table.createdAt),
    index("idx_posts_author_created").on(table.authorId, table.createdAt),
    index("idx_posts_post_type").on(table.postType),
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
