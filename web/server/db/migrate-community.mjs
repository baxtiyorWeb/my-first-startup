import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

/**
 * Idempotent migration for the official Geters Community chat.
 * Only creates missing tables/indexes and seeds the single official community,
 * so it is safe to run on an existing production database without touching
 * any existing rows.
 */
const OFFICIAL_COMMUNITY = {
  slug: "geters-community",
  name: "Geters Community",
  description:
    "Geters.uz rasmiy ommaviy guruhi. Yangiliklar, e'lonlar, savol-javob va umumiy muhokamalar.",
};

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
      CREATE TABLE IF NOT EXISTS communities (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug varchar(80) NOT NULL,
        name varchar(120) NOT NULL,
        description text NOT NULL DEFAULT '',
        is_official boolean NOT NULL DEFAULT true,
        verified boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_communities_slug ON communities (slug);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS community_members (
        community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_read_message_id uuid,
        last_read_at timestamptz,
        is_muted boolean NOT NULL DEFAULT false,
        joined_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (community_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_community_members_user ON community_members (user_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS community_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        community_id uuid NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
        sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content text NOT NULL DEFAULT '',
        message_type varchar(20) NOT NULL DEFAULT 'text',
        attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
        client_message_id varchar(64),
        reply_to_id uuid REFERENCES community_messages(id) ON DELETE SET NULL,
        edited_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_community_messages_created
        ON community_messages (community_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_community_messages_sender
        ON community_messages (sender_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_community_messages_reply
        ON community_messages (reply_to_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_community_messages_client
        ON community_messages (sender_id, client_message_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS community_reactions (
        message_id uuid NOT NULL REFERENCES community_messages(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emoji varchar(16) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (message_id, user_id, emoji)
      );
      CREATE INDEX IF NOT EXISTS idx_community_reactions_message
        ON community_reactions (message_id);
    `);

    // Seed the single official community. ON CONFLICT keeps it idempotent and
    // never overwrites an edited description.
    await client.query(
      `INSERT INTO communities (slug, name, description, is_official, verified)
       VALUES ($1, $2, $3, true, true)
       ON CONFLICT (slug) DO NOTHING;`,
      [OFFICIAL_COMMUNITY.slug, OFFICIAL_COMMUNITY.name, OFFICIAL_COMMUNITY.description]
    );

    await client.query("COMMIT");
    console.log("[MIGRATION] Community chat schema is ready.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error("[MIGRATION ERROR]", error);
  process.exit(1);
});
