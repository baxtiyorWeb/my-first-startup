import pg from "pg";
import * as fs from "fs";
import * as path from "path";

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

const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("neon.tech") || databaseUrl.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

const CYRILLIC_MAP = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts",
  ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h",
};

function generateSeoSlug(input, maxLength = 88) {
  if (!input) return "";
  const normalized = input
    .toLowerCase()
    .replace(/([og])[’'`ʻʼ‘]/gi, "$1")
    .replace(/[’'`ʻʼ‘]/g, "");

  let out = "";
  for (const ch of normalized) {
    out += CYRILLIC_MAP[ch] !== undefined ? CYRILLIC_MAP[ch] : ch;
  }

  let slug = out
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  if (slug.length > maxLength) {
    const cut = slug.slice(0, maxLength);
    const lastDash = cut.lastIndexOf("-");
    slug = lastDash > 20 ? cut.slice(0, lastDash) : cut.replace(/-+$/g, "");
  }
  return slug;
}

const MIGRATION_SQL = `
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "slug" VARCHAR(340);
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "content_kind" VARCHAR(24) NOT NULL DEFAULT 'thought';
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'published';
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "is_indexable" BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "locale" VARCHAR(8) NOT NULL DEFAULT 'uz';
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "category" VARCHAR(64) NOT NULL DEFAULT 'umumiy';
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "tags" JSONB NOT NULL DEFAULT '[]'::jsonb;
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "cover_image_url" TEXT;
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "cover_image_alt" VARCHAR(255);
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "seo_title" VARCHAR(180);
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "seo_description" VARCHAR(340);
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "focus_keyword" VARCHAR(120);
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "canonical_url" VARCHAR(500);
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "video_url" TEXT;
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "youtube_video_id" VARCHAR(64);
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "bunny_video_id" VARCHAR(128);
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "video_duration_seconds" INTEGER;
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "video_chapters" JSONB NOT NULL DEFAULT '[]'::jsonb;
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "transcript" TEXT;
  ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "published_at" TIMESTAMPTZ NOT NULL DEFAULT now();

  CREATE UNIQUE INDEX IF NOT EXISTS "idx_posts_slug" ON "posts" USING btree ("slug") WHERE "slug" IS NOT NULL;
  CREATE INDEX IF NOT EXISTS "idx_posts_kind_status" ON "posts" USING btree ("content_kind", "status", "is_indexable", "published_at" DESC);
  CREATE INDEX IF NOT EXISTS "idx_posts_category" ON "posts" USING btree ("category");

  CREATE TABLE IF NOT EXISTS "slug_redirects" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "old_slug" VARCHAR(340) NOT NULL,
    "new_slug" VARCHAR(340) NOT NULL,
    "content_kind" VARCHAR(24) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS "idx_slug_redirects_old_kind" ON "slug_redirects" USING btree ("old_slug", "content_kind");
`;

async function main() {
  const client = await pool.connect();
  try {
    console.log("Applying SEO CMS columns & slug_redirects table...");
    await client.query(MIGRATION_SQL);

    // Fetch existing slugs to prevent collisions
    const existingSlugsRes = await client.query(
      `SELECT slug FROM posts WHERE slug IS NOT NULL`
    );
    const usedSlugs = new Set(existingSlugsRes.rows.map((r) => r.slug));

    // Backfill posts without a slug
    const toBackfill = await client.query(`
      SELECT p.id, p.title, p.content, p.media_urls, p.created_at, u.is_bot
      FROM posts p
      JOIN users u ON p.author_id = u.id
      WHERE p.slug IS NULL
      ORDER BY p.created_at ASC
    `);

    console.log(`Backfilling slugs & SEO classifications for ${toBackfill.rows.length} posts...`);

    for (const row of toBackfill.rows) {
      const baseSlug =
        (row.title ? generateSeoSlug(row.title) : "") ||
        generateSeoSlug(String(row.content || "").replace(/<[^>]+>/g, " ").slice(0, 60)) ||
        `post-${row.id.slice(0, 8)}`;

      let candidate = baseSlug;
      let counter = 2;
      while (usedSlugs.has(candidate)) {
        candidate = `${baseSlug}-${counter++}`;
      }
      usedSlugs.add(candidate);

      const plainLen = String(row.content || "").replace(/<[^>]+>/g, " ").trim().length;
      const isGenuineEditorial = !row.is_bot && Boolean(row.title) && plainLen >= 400;
      const contentKind = isGenuineEditorial ? "article" : "thought";
      const isIndexable = isGenuineEditorial;
      const category =
        isGenuineEditorial && /startap|loyiha|go-getters/i.test(`${row.title} ${row.content}`)
          ? "startups"
          : "umumiy";

      const coverUrl =
        Array.isArray(row.media_urls) && row.media_urls.length > 0
          ? row.media_urls[0]
          : null;

      await client.query(
        `UPDATE posts
         SET slug = $1,
             content_kind = $2,
             is_indexable = $3,
             category = $4,
             cover_image_url = COALESCE(cover_image_url, $5),
             published_at = COALESCE(published_at, created_at)
         WHERE id = $6`,
        [candidate, contentKind, isIndexable, category, coverUrl, row.id]
      );
    }

    const summary = await client.query(`
      SELECT content_kind, is_indexable, COUNT(*)::int AS cnt
      FROM posts WHERE deleted_at IS NULL
      GROUP BY content_kind, is_indexable
      ORDER BY content_kind
    `);
    console.log("Migration & Backfill Summary:", summary.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
