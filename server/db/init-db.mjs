import pg from "pg";
import * as fs from "fs";
import * as path from "path";

// 1. Read .env manually
const envPath = path.resolve(process.cwd(), ".env");
let databaseUrl = process.env.DATABASE_URL;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("DATABASE_URL=")) {
      databaseUrl = trimmed.substring("DATABASE_URL=".length).replace(/^["']|["']$/g, "");
    }
  }
}

if (!databaseUrl) {
  console.error("DATABASE_URL is not set in .env");
  process.exit(1);
}

console.log("Connecting to Neon PostgreSQL...");

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

const ddl = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"handle" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"role" varchar(150) DEFAULT 'Fikr muallifi' NOT NULL,
	"bio" text DEFAULT '',
	"avatar_url" varchar(500),
	"location" varchar(100),
	"website" varchar(200),
	"verified" boolean DEFAULT false NOT NULL,
	"is_onboarded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_phone" ON "users" USING btree ("phone");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_handle" ON "users" USING btree ("handle");

CREATE TABLE IF NOT EXISTS "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"title" varchar(300),
	"content" text NOT NULL,
	"reading_time_minutes" integer DEFAULT 1 NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"shares_count" integer DEFAULT 0 NOT NULL,
	"views_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "idx_posts_created_at" ON "posts" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "idx_posts_author_created" ON "posts" USING btree ("author_id","created_at");

CREATE TABLE IF NOT EXISTS "post_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE cascade,
	"viewer_id" varchar(128) NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_post_views_post_viewer" ON "post_views" USING btree ("post_id", "viewer_id", "viewed_at");

CREATE TABLE IF NOT EXISTS "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE cascade,
	"author_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"parent_id" uuid,
	"content" text NOT NULL,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);

CREATE INDEX IF NOT EXISTS "idx_comments_post_parent" ON "comments" USING btree ("post_id","parent_id","created_at");
CREATE INDEX IF NOT EXISTS "idx_comments_author" ON "comments" USING btree ("author_id");

CREATE TABLE IF NOT EXISTS "bookmarks" (
	"post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE cascade,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);

CREATE INDEX IF NOT EXISTS "idx_bookmarks_user_created" ON "bookmarks" USING btree ("user_id","created_at");

CREATE TABLE IF NOT EXISTS "post_likes" (
	"post_id" uuid NOT NULL REFERENCES "posts"("id") ON DELETE cascade,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "post_likes_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);

CREATE INDEX IF NOT EXISTS "idx_post_likes_user" ON "post_likes" USING btree ("user_id");

CREATE TABLE IF NOT EXISTS "comment_likes" (
	"comment_id" uuid NOT NULL REFERENCES "comments"("id") ON DELETE cascade,
	"user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comment_likes_comment_id_user_id_pk" PRIMARY KEY("comment_id","user_id")
);

CREATE TABLE IF NOT EXISTS "follows" (
	"follower_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"following_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follows_follower_id_following_id_pk" PRIMARY KEY("follower_id","following_id")
);

CREATE INDEX IF NOT EXISTS "idx_follows_following" ON "follows" USING btree ("following_id");
CREATE INDEX IF NOT EXISTS "idx_follows_follower" ON "follows" USING btree ("follower_id");

CREATE TABLE IF NOT EXISTS "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" uuid REFERENCES "users"("id") ON DELETE set null,
	"target_id" uuid NOT NULL,
	"target_type" varchar(20) NOT NULL,
	"reason" varchar(50) NOT NULL,
	"context" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_reports_target" ON "reports" USING btree ("target_id","target_type");

CREATE TABLE IF NOT EXISTS "verification_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" varchar(20) NOT NULL,
	"code_hash" varchar(128) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_verification_phone" ON "verification_codes" USING btree ("phone");
`;

async function main() {
  try {
    const client = await pool.connect();
    console.log("Connected successfully to Neon PostgreSQL!");
    
    console.log("Applying schema DDL...");
    await client.query(ddl);

    // Apply incremental alterations if table already existed
    await client.query(`
      ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "views_count" integer DEFAULT 0 NOT NULL;
      
      -- Reset fake counts to real count of post_likes and comments
      UPDATE "posts" p 
      SET 
        "likes_count" = (SELECT count(*) FROM "post_likes" pl WHERE pl.post_id = p.id),
        "comments_count" = (SELECT count(*) FROM "comments" c WHERE c.post_id = p.id AND c.deleted_at IS NULL),
        "shares_count" = 0,
        "views_count" = 0;
    `);

    console.log("All tables, indexes, constraints created and fake counts reset!");

    // Verify created tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log("\nTables in database:");
    for (const row of res.rows) {
      console.log(` - ${row.table_name}`);
    }

    client.release();
    await pool.end();
    console.log("\nDatabase migration completed perfectly!");
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

main();
