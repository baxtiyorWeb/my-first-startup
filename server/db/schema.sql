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
-- 2. POSTS JADVALI (Postlar, Tahliliy maqolalar & Startap loyihalar)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "posts" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "author_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "title" VARCHAR(300),
    "content" TEXT NOT NULL,
    "post_type" VARCHAR(30) NOT NULL DEFAULT 'thought', -- 'thought' | 'project'
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

CREATE INDEX IF NOT EXISTS "idx_posts_created_at" ON "posts" USING btree ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_posts_author_created" ON "posts" USING btree ("author_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_posts_post_type" ON "posts" USING btree ("post_type");
CREATE INDEX IF NOT EXISTS "idx_posts_deleted_at" ON "posts" USING btree ("deleted_at");

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
