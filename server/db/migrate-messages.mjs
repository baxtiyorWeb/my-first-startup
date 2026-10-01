import pg from "pg";
import * as fs from "fs";
import * as path from "path";

// 1. Read .env
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
  ssl: { rejectUnauthorized: false },
});

const ddl = `
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(20) NOT NULL DEFAULT 'direct',
  direct_pair_key VARCHAR(73) UNIQUE,
  last_message_id UUID,
  last_message_text TEXT,
  last_message_sender_id UUID,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_last_msg_at ON conversations(last_message_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_pair_key ON conversations(direct_pair_key);

CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_read_message_id UUID,
  last_read_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user_archived ON conversation_participants(user_id, is_archived);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type VARCHAR(20) NOT NULL DEFAULT 'text',
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  client_message_id VARCHAR(64),
  reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_client_msg_id ON messages(conversation_id, sender_id, client_message_id) WHERE client_message_id IS NOT NULL;
`;

async function main() {
  try {
    const client = await pool.connect();
    console.log("Connected to PostgreSQL for messages migration...");
    await client.query(ddl);
    console.log("Successfully created conversations, conversation_participants, and messages tables!");
    client.release();
    await pool.end();
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

main();
