-- ==============================================================================
-- The Go-getters Platform — Complete PostgreSQL / Neon DB Schema
-- ==============================================================================
-- Ushbu skript platformaning barcha jadvallari, indekslari, foreign key'lari
-- va avtomatik updated_at triggerlarini to'liq noldan yaratish uchun mo'ljallangan.
-- ==============================================================================

-- 0. Kengaytmalarni faollashtirish
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. USERS JADVALI (Foydalanuvchilar, Google OAuth & Profil ma'lumotlari)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "google_id" VARCHAR(255),
    "handle" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "role" VARCHAR(150) NOT NULL DEFAULT 'Go-getter',
    "bio" TEXT DEFAULT '',
    "avatar_url" VARCHAR(500),
    "location" VARCHAR(100),
    "website" VARCHAR(200),
    "intent" VARCHAR(50) NOT NULL DEFAULT 'none',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "is_onboarded" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users indekslari (Unikal qidiruvlar uchun)
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_handle" ON "users" USING btree ("handle");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_email" ON "users" USING btree ("email") WHERE "email" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_google_id" ON "users" USING btree ("google_id") WHERE "google_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_phone" ON "users" USING btree ("phone") WHERE "phone" IS NOT NULL;

-- ==============================================================================
-- 2. POSTS JADVALI (Maqolalar, Video darsliklar, Yangiliklar & Muhokamalar)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "posts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "author_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "slug" VARCHAR(340),
    "title" VARCHAR(300),
    "content" TEXT NOT NULL,
    "post_type" VARCHAR(30) NOT NULL DEFAULT 'thought', -- 'thought' | 'project'
    "content_kind" VARCHAR(24) NOT NULL DEFAULT 'article', -- 'article' | 'video' | 'news' | 'thought'
    "status" VARCHAR(20) NOT NULL DEFAULT 'published',     -- 'draft' | 'published' | 'archived'
    "is_indexable" BOOLEAN NOT NULL DEFAULT false,
    "locale" VARCHAR(8) NOT NULL DEFAULT 'uz',
    "category" VARCHAR(64) NOT NULL DEFAULT 'umumiy',
    "tags" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "cover_image_url" TEXT,
    "cover_image_alt" VARCHAR(255),
    "seo_title" VARCHAR(180),
    "seo_description" VARCHAR(340),
    "focus_keyword" VARCHAR(120),
    "canonical_url" VARCHAR(500),
    "video_url" TEXT,
    "youtube_video_id" VARCHAR(64),
    "bunny_video_id" VARCHAR(128),
    "video_duration_seconds" INTEGER,
    "video_chapters" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "transcript" TEXT,
    "published_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "project_url" VARCHAR(500),
    "project_stage" VARCHAR(50),                         -- 'idea' | 'mvp' | 'launched' | 'scaling'
    "looking_for" VARCHAR(50),                           -- 'cofounder' | 'feedback' | 'investment' | 'team'
    "media_urls" JSONB NOT NULL DEFAULT '[]'::jsonb,     -- Ko'pi bilan 3 ta rasm URL'lari
    "reading_time_minutes" INTEGER NOT NULL DEFAULT 1,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "shares_count" INTEGER NOT NULL DEFAULT 0,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ                             -- Soft delete
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_posts_slug" ON "posts" USING btree ("slug") WHERE "slug" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_posts_created_at" ON "posts" USING btree ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_posts_author_created" ON "posts" USING btree ("author_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_posts_post_type" ON "posts" USING btree ("post_type");
CREATE INDEX IF NOT EXISTS "idx_posts_kind_status" ON "posts" USING btree ("content_kind", "status", "is_indexable", "published_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_posts_category" ON "posts" USING btree ("category");
CREATE INDEX IF NOT EXISTS "idx_posts_deleted_at" ON "posts" USING btree ("deleted_at");

CREATE TABLE IF NOT EXISTS "slug_redirects" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "old_slug" VARCHAR(340) NOT NULL,
    "new_slug" VARCHAR(340) NOT NULL,
    "content_kind" VARCHAR(24) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_slug_redirects_old_kind" ON "slug_redirects" USING btree ("old_slug", "content_kind");

-- ==============================================================================
-- 3. POST_VIEWS JADVALI (Ko'rishlar sonini 1 soatlik deduplikatsiya bilan hisoblash)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "post_views" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
    "viewer_id" VARCHAR(128) NOT NULL,
    "viewed_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_post_views_post_viewer" ON "post_views" USING btree ("post_id", "viewer_id", "viewed_at");

-- ==============================================================================
-- 4. COMMENTS JADVALI (Izohlar va muhokamalar, ichma-ich javoblar - Nested replies)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "comments" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
    "author_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "parent_id" UUID REFERENCES "comments"("id") ON DELETE CASCADE,
    "content" TEXT NOT NULL,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_comments_post_parent" ON "comments" USING btree ("post_id", "parent_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_comments_author" ON "comments" USING btree ("author_id");

-- ==============================================================================
-- 5. POST_LIKES JADVALI (Postlarga layklar, takroriy layklarni oldini oladi)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "post_likes" (
    "post_id" UUID NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY ("post_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "idx_post_likes_user" ON "post_likes" USING btree ("user_id");

-- ==============================================================================
-- 6. COMMENT_LIKES JADVALI (Izohlarga bildirilgan layklar)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "comment_likes" (
    "comment_id" UUID NOT NULL REFERENCES "comments"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY ("comment_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "idx_comment_likes_user" ON "comment_likes" USING btree ("user_id");

-- ==============================================================================
-- 7. BOOKMARKS JADVALI (Saqlangan postlar / Xatcho'plar)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "bookmarks" (
    "post_id" UUID NOT NULL REFERENCES "posts"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY ("post_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "idx_bookmarks_user_created" ON "bookmarks" USING btree ("user_id", "created_at" DESC);

-- ==============================================================================
-- 8. FOLLOWS JADVALI (Mualliflarni kuzatish / Obunalar)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "follows" (
    "follower_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "following_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY ("follower_id", "following_id"),
    CONSTRAINT "follows_no_self_follow" CHECK ("follower_id" != "following_id")
);

CREATE INDEX IF NOT EXISTS "idx_follows_following" ON "follows" USING btree ("following_id");
CREATE INDEX IF NOT EXISTS "idx_follows_follower" ON "follows" USING btree ("follower_id");

-- ==============================================================================
-- 9. REPORTS JADVALI (Shikoyatlar va moderatsiya)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "reports" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "reporter_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "target_id" UUID NOT NULL,
    "target_type" VARCHAR(20) NOT NULL, -- 'post' | 'comment' | 'user'
    "reason" VARCHAR(50) NOT NULL,
    "context" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_reports_target" ON "reports" USING btree ("target_id", "target_type");

-- ==============================================================================
-- 10. VERIFICATION_CODES JADVALI (SMS / OTP tasdiqlash kodlari)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "verification_codes" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "phone" VARCHAR(20) NOT NULL,
    "code_hash" VARCHAR(128) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_verification_phone" ON "verification_codes" USING btree ("phone");

-- ==============================================================================
-- 11. TRIGGERLAR: Avtomatik updated_at maydonini yangilash
-- ==============================================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON "users";
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON "users"
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trigger_posts_updated_at ON "posts";
CREATE TRIGGER trigger_posts_updated_at
    BEFORE UPDATE ON "posts"
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trigger_comments_updated_at ON "comments";
CREATE TRIGGER trigger_comments_updated_at
    BEFORE UPDATE ON "comments"
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- 10. Notifications Table
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "recipient_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "actor_id" UUID REFERENCES "users"("id") ON DELETE CASCADE,
    "type" VARCHAR(30) NOT NULL,
    "target_id" UUID,
    "target_type" VARCHAR(20),
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "link" VARCHAR(500) NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT FALSE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_notifications_recipient_read" ON "notifications" ("recipient_id", "is_read", "created_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_recipient_type_target" ON "notifications" ("recipient_id", "type", "target_id");

-- 11. Notification Settings Table
CREATE TABLE IF NOT EXISTS "notification_settings" (
    "user_id" UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
    "notify_likes" BOOLEAN NOT NULL DEFAULT TRUE,
    "notify_comments" BOOLEAN NOT NULL DEFAULT TRUE,
    "notify_follows" BOOLEAN NOT NULL DEFAULT TRUE,
    "notify_new_posts" BOOLEAN NOT NULL DEFAULT TRUE,
    "push_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Conversations Table
CREATE TABLE IF NOT EXISTS "conversations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "type" VARCHAR(20) NOT NULL DEFAULT 'direct',
    "direct_pair_key" VARCHAR(73) UNIQUE,
    "last_message_id" UUID,
    "last_message_text" TEXT,
    "last_message_sender_id" UUID,
    "last_message_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_conversations_last_msg_at" ON "conversations"("last_message_at" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_conversations_pair_key" ON "conversations"("direct_pair_key");

-- 13. Conversation Participants Table
CREATE TABLE IF NOT EXISTS "conversation_participants" (
    "conversation_id" UUID NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "last_read_message_id" UUID,
    "last_read_at" TIMESTAMPTZ,
    "is_archived" BOOLEAN NOT NULL DEFAULT FALSE,
    "is_muted" BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY ("conversation_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "idx_conv_participants_user" ON "conversation_participants"("user_id", "conversation_id");
CREATE INDEX IF NOT EXISTS "idx_conv_participants_user_archived" ON "conversation_participants"("user_id", "is_archived");

-- 14. Messages Table
CREATE TABLE IF NOT EXISTS "messages" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
    "sender_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "content" TEXT NOT NULL,
    "message_type" VARCHAR(20) NOT NULL DEFAULT 'text',
    "media_urls" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "client_message_id" VARCHAR(64),
    "reply_to_id" UUID REFERENCES "messages"("id") ON DELETE SET NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "deleted_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_messages_conv_created" ON "messages"("conversation_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_messages_sender" ON "messages"("sender_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_messages_client_msg_id" ON "messages"("conversation_id", "sender_id", "client_message_id") WHERE client_message_id IS NOT NULL;

-- 15. User Blocks Table
CREATE TABLE IF NOT EXISTS "user_blocks" (
    "blocker_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "blocked_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY ("blocker_id", "blocked_id")
);
CREATE INDEX IF NOT EXISTS "idx_user_blocks_blocker" ON "user_blocks"("blocker_id");

-- 16. Active User Sessions Table
CREATE TABLE IF NOT EXISTS "user_sessions" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "device_name" VARCHAR(100) NOT NULL,
    "browser" VARCHAR(100) NOT NULL,
    "ip_address" VARCHAR(50),
    "location" VARCHAR(100),
    "is_current" BOOLEAN NOT NULL DEFAULT FALSE,
    "last_active_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_user_sessions_user" ON "user_sessions"("user_id");

-- 17. Bot Activities Table
CREATE TABLE IF NOT EXISTS "bot_activities" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "activity_type" VARCHAR(50) NOT NULL,
    "bot_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "target_id" UUID,
    "details" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_bot_activities_created" ON "bot_activities"("created_at");
CREATE INDEX IF NOT EXISTS "idx_bot_activities_type" ON "bot_activities"("activity_type");

-- 18. Bot Engine Global Settings Table
CREATE TABLE IF NOT EXISTS "bot_engine_settings" (
    "id" VARCHAR(50) PRIMARY KEY DEFAULT 'default',
    "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
    "daily_limit" INTEGER NOT NULL DEFAULT 30,
    "current_daily_count" INTEGER NOT NULL DEFAULT 0,
    "last_activity_at" TIMESTAMPTZ,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 19. Media Library Table (Bunny Storage, Bunny Stream & YouTube)
CREATE TABLE IF NOT EXISTS "media" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "media_type" VARCHAR(32) NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "storage_path" TEXT,
    "mime_type" VARCHAR(128),
    "file_extension" VARCHAR(32) NOT NULL DEFAULT '',
    "file_size_bytes" BIGINT NOT NULL DEFAULT 0,
    "duration_seconds" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "youtube_video_id" VARCHAR(64),
    "bunny_video_id" VARCHAR(128),
    "collection_name" VARCHAR(128),
    "uploaded_by" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_media_type" ON "media"("media_type");
CREATE INDEX IF NOT EXISTS "idx_media_created_at" ON "media"("created_at");
CREATE INDEX IF NOT EXISTS "idx_media_uploaded_by" ON "media"("uploaded_by");
CREATE INDEX IF NOT EXISTS "idx_media_collection" ON "media"("collection_name");



-- 20. Account Deletion Requests (Google Play "account deletion" talabi)
CREATE TABLE IF NOT EXISTS "account_deletion_requests" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "identifier" VARCHAR(255) NOT NULL,
    "reason" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "matched_user_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
    "request_ip" VARCHAR(64),
    "admin_note" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "resolved_at" TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS "idx_account_deletion_status" ON "account_deletion_requests"("status");
CREATE INDEX IF NOT EXISTS "idx_account_deletion_created" ON "account_deletion_requests"("created_at");
