import fs from "fs";
import path from "path";

// Manually load .env variables
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const [key, ...vals] = trimmed.split("=");
      const val = vals.join("=").replace(/^["']|["']$/g, "");
      process.env[key.trim()] = val.trim();
    }
  }
}

async function run() {
  const { pool } = await import("../server/db");
  const client = await pool.connect();
  try {
    console.log("[MIGRATION] Adding missing columns to PostgreSQL users table...");
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS cover_photo_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false NOT NULL,
      ADD COLUMN IF NOT EXISTS dm_permission VARCHAR(20) DEFAULT 'everyone' NOT NULL,
      ADD COLUMN IF NOT EXISTS show_online_status BOOLEAN DEFAULT true NOT NULL,
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255),
      ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false NOT NULL,
      ADD COLUMN IF NOT EXISTS two_factor_type VARCHAR(20) DEFAULT 'authenticator' NOT NULL,
      ADD COLUMN IF NOT EXISTS theme VARCHAR(20) DEFAULT 'system' NOT NULL,
      ADD COLUMN IF NOT EXISTS is_deactivated BOOLEAN DEFAULT false NOT NULL;

      ALTER TABLE notification_settings
      ADD COLUMN IF NOT EXISTS notify_shares BOOLEAN DEFAULT true NOT NULL,
      ADD COLUMN IF NOT EXISTS notify_mentions BOOLEAN DEFAULT true NOT NULL,
      ADD COLUMN IF NOT EXISTS email_digest BOOLEAN DEFAULT true NOT NULL,
      ADD COLUMN IF NOT EXISTS email_security BOOLEAN DEFAULT true NOT NULL;

      CREATE TABLE IF NOT EXISTS user_blocks (
        blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        PRIMARY KEY (blocker_id, blocked_id)
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_name VARCHAR(100) NOT NULL,
        browser VARCHAR(100) NOT NULL,
        ip_address VARCHAR(50),
        location VARCHAR(100),
        is_current BOOLEAN DEFAULT false NOT NULL,
        last_active_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);
    console.log("[MIGRATION] All database schema migrations applied successfully!");
  } catch (err) {
    console.error("[MIGRATION] Error:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
