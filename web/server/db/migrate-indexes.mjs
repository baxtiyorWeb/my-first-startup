import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

/**
 * Creates indexes that are declared in server/db/schema/index.ts (and
 * schema.sql) but were never applied to the live database.
 * Idempotent: every statement uses CREATE INDEX IF NOT EXISTS.
 */
const INDEX_STATEMENTS = [
  `CREATE INDEX IF NOT EXISTS "idx_user_blocks_blocker" ON "user_blocks"("blocker_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_user_sessions_user" ON "user_sessions"("user_id")`,
  `CREATE INDEX IF NOT EXISTS "idx_bot_activities_created" ON "bot_activities"("created_at")`,
  `CREATE INDEX IF NOT EXISTS "idx_bot_activities_type" ON "bot_activities"("activity_type")`,
  `CREATE INDEX IF NOT EXISTS "idx_media_uploaded_by" ON "media"("uploaded_by")`,
  `CREATE INDEX IF NOT EXISTS "idx_media_collection" ON "media"("collection_name")`,
];

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pool = new Pool({ connectionString });
  try {
    for (const statement of INDEX_STATEMENTS) {
      await pool.query(statement);
    }
    console.log(`[MIGRATION] Ensured ${INDEX_STATEMENTS.length} indexes.`);
  } finally {
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("[MIGRATION ERROR]", error);
  process.exit(1);
});
