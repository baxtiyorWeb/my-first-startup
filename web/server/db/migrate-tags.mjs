import pg from "pg";

const { Pool } = pg;

const CYRILLIC_MAP = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "x", ц: "ts",
  ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h",
};

function normalizeTagForMigration(raw) {
  let clean = String(raw || "")
    .replace(/[\u200B-\u200D\uFEFF\u0000-\u001F\u007F]/g, "")
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, " ")
    .replace(/[‘’`ʻʼ]/g, "'")
    .normalize("NFC");

  if (!clean || clean.length < 2 || clean.length > 40) return null;

  let folded = clean
    .replace(/İ/g, "i")
    .replace(/ı/g, "i")
    .toLowerCase()
    .replace(/c\+\+/g, " cpp ")
    .replace(/c#/g, " csharp ")
    .replace(/f#/g, " fsharp ")
    .replace(/(^|\s)\.net(\s|$)/g, "$1dotnet$2")
    .replace(/([a-z0-9])\.js\b/g, "$1js")
    .replace(/([og])'/g, "$1")
    .replace(/'/g, "");

  let out = "";
  for (const ch of folded) {
    out += CYRILLIC_MAP[ch] ?? ch;
  }

  const normalizedName = out
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  const slug = normalizedName.replace(/\s+/g, "-").slice(0, 48).replace(/^-+|-+$/g, "");
  if (slug.length < 2 || /^\d+$/.test(slug)) return null;
  return { name: clean, normalizedName, slug };
}

const OFFICIAL_TAGS = [
  { name: "Dasturlash", description: "Dasturiy ta'minot muhandisligi, algoritmlar va arxitektura" },
  { name: "AI", description: "Sun'iy intellekt, LLM agentlar va machine learning" },
  { name: "Texnologiya", description: "Zamonaviy texnologiyalar va IT ekotizim yangiliklari" },
  { name: "Startap", description: "Startap qurish, MVP, investitsiya va mahsulot o'sishi" },
  { name: "Flutter", description: "Flutter va Dart yordamida kross-platforma mobil ilovalar" },
  { name: "Next.js", description: "Next.js, React va zamonaviy full-stack veb dasturlash" },
  { name: "Backend", description: "API dizayn, ma'lumotlar bazasi, PostgreSQL va serverlar" },
  { name: "Dizayn & UX", description: "UI/UX dizayn, dizayn tizimlari va mahsulot interfeyslari" },
  { name: "DevOps", description: "CI/CD, Docker, Kubernetes va bulut infratuzilmasi" },
  { name: "Karyera", description: "Texnik intervyular, o'sish va muhandislik karyerasi" },
  { name: "O'zbekiston IT", description: "O'zbekiston IT hamjamiyati, tadbirlar va mahalliy loyihalar" },
  { name: "EdTech", description: "Ta'lim texnologiyalari, onlayn kurslar va mentorlik" },
];

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(64) NOT NULL,
        slug varchar(72) NOT NULL,
        normalized_name varchar(80) NOT NULL,
        description text,
        status varchar(20) NOT NULL DEFAULT 'active',
        is_official boolean NOT NULL DEFAULT false,
        merged_into_id uuid,
        usage_count integer NOT NULL DEFAULT 0,
        recent_usage_count integer NOT NULL DEFAULT 0,
        engagement_score integer NOT NULL DEFAULT 0,
        created_by uuid REFERENCES users(id) ON DELETE SET NULL,
        last_used_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT tags_counts_non_negative CHECK (usage_count >= 0 AND recent_usage_count >= 0 AND engagement_score >= 0)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_slug ON tags (slug);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_normalized_name ON tags (normalized_name);
      CREATE INDEX IF NOT EXISTS idx_tags_status_trending
        ON tags (status, recent_usage_count DESC, engagement_score DESC, usage_count DESC);
      CREATE INDEX IF NOT EXISTS idx_tags_created_by_at ON tags (created_by, created_at);
      CREATE INDEX IF NOT EXISTS idx_tags_normalized_prefix ON tags (normalized_name varchar_pattern_ops);
      CREATE INDEX IF NOT EXISTS idx_tags_slug_prefix ON tags (slug varchar_pattern_ops);

      CREATE TABLE IF NOT EXISTS post_tags (
        post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        position integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (post_id, tag_id)
      );

      CREATE INDEX IF NOT EXISTS idx_post_tags_tag_created ON post_tags (tag_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_post_tags_post_pos ON post_tags (post_id, position);
    `);

    // Enable trigram search index when extension privileges allow
    await client.query("SAVEPOINT sp_trgm");
    try {
      await client.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
      await client.query(
        "CREATE INDEX IF NOT EXISTS idx_tags_normalized_trgm ON tags USING gin (normalized_name gin_trgm_ops)"
      );
      await client.query("RELEASE SAVEPOINT sp_trgm");
    } catch {
      await client.query("ROLLBACK TO SAVEPOINT sp_trgm");
    }

    // 1. Seed initial official tags idempotently
    for (const item of OFFICIAL_TAGS) {
      const norm = normalizeTagForMigration(item.name);
      if (!norm) continue;
      await client.query(
        `INSERT INTO tags (name, slug, normalized_name, description, status, is_official)
         VALUES ($1, $2, $3, $4, 'active', true)
         ON CONFLICT DO NOTHING`,
        [norm.name, norm.slug, norm.normalizedName, item.description]
      );
    }

    // 2. Backfill existing posts into tags + post_tags
    const { rows: postRows } = await client.query(`
      SELECT id, content, category, tags, created_at
      FROM posts
      WHERE deleted_at IS NULL
      ORDER BY created_at ASC
    `);

    for (const post of postRows) {
      const candidates = [];
      if (Array.isArray(post.tags)) {
        candidates.push(...post.tags);
      }
      if (post.category && post.category.toLowerCase() !== "umumiy") {
        candidates.push(post.category);
      }
      const matches = String(post.content || "").match(/#[a-zA-Z0-9_\u0400-\u04FF\u0100-\u024F'ʻʼ]+/g);
      if (matches) {
        candidates.push(...matches.slice(0, 6));
      }

      const resolvedIds = [];
      const resolvedNames = [];
      const seen = new Set();

      for (const raw of candidates) {
        if (resolvedIds.length >= 8) break;
        const norm = normalizeTagForMigration(raw);
        if (!norm || seen.has(norm.slug)) continue;
        seen.add(norm.slug);

        let { rows: found } = await client.query(
          `SELECT id, name, status, merged_into_id FROM tags WHERE normalized_name = $1 OR slug = $2 LIMIT 1`,
          [norm.normalizedName, norm.slug]
        );

        if (found.length === 0) {
          const ins = await client.query(
            `INSERT INTO tags (name, slug, normalized_name, status, is_official)
             VALUES ($1, $2, $3, 'active', false)
             ON CONFLICT DO NOTHING
             RETURNING id, name, status, merged_into_id`,
            [norm.name, norm.slug, norm.normalizedName]
          );
          found = ins.rows;
          if (found.length === 0) {
            const retry = await client.query(
              `SELECT id, name, status, merged_into_id FROM tags WHERE normalized_name = $1 OR slug = $2 LIMIT 1`,
              [norm.normalizedName, norm.slug]
            );
            found = retry.rows;
          }
        }

        const tagRow = found[0];
        if (!tagRow || tagRow.status === "restricted" || tagRow.status === "hidden") continue;
        if (!resolvedIds.includes(tagRow.id)) {
          resolvedIds.push(tagRow.id);
          resolvedNames.push(tagRow.name);
        }
      }

      for (let i = 0; i < resolvedIds.length; i++) {
        await client.query(
          `INSERT INTO post_tags (post_id, tag_id, position, created_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (post_id, tag_id) DO NOTHING`,
          [post.id, resolvedIds[i], i, post.created_at]
        );
      }

      if (resolvedNames.length > 0 && (!Array.isArray(post.tags) || post.tags.length === 0)) {
        await client.query(
          `UPDATE posts SET tags = $1::jsonb WHERE id = $2`,
          [JSON.stringify(resolvedNames), post.id]
        );
      }
    }

    // 3. Recalculate deterministic tag counters from actual active post relationships
    await client.query(`
      UPDATE tags t
      SET
        usage_count = COALESCE(stats.total_cnt, 0),
        recent_usage_count = COALESCE(stats.recent_cnt, 0),
        engagement_score = COALESCE(stats.eng_score, 0),
        last_used_at = COALESCE(stats.last_at, t.last_used_at),
        updated_at = now()
      FROM (
        SELECT
          tag_id,
          COUNT(*)::int AS total_cnt,
          COUNT(*) FILTER (WHERE p.created_at >= now() - interval '14 days')::int AS recent_cnt,
          COALESCE(SUM(p.likes_count * 2 + p.shares_count * 3 + p.comments_count), 0)::int AS eng_score,
          MAX(p.created_at) AS last_at
        FROM post_tags pt
        INNER JOIN posts p ON p.id = pt.post_id
        WHERE p.deleted_at IS NULL AND p.status = 'published'
        GROUP BY pt.tag_id
      ) stats
      WHERE t.id = stats.tag_id;
    `);

    await client.query(`
      UPDATE tags
      SET usage_count = 0, recent_usage_count = 0, engagement_score = 0
      WHERE id NOT IN (SELECT DISTINCT tag_id FROM post_tags);
    `);

    await client.query("COMMIT");
    console.log("[MIGRATION] Dynamic tags schema migrated, seeded, and backfilled successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("[MIGRATION ERROR]", err);
  process.exit(1);
});
