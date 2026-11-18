import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  console.log('Running migration...');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT FALSE;');
  await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS bot_persona TEXT;');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bot_activities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      activity_type VARCHAR(50) NOT NULL,
      bot_id UUID REFERENCES users(id) ON DELETE SET NULL,
      target_id UUID,
      details TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bot_engine_settings (
      id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
      is_active BOOLEAN NOT NULL DEFAULT true,
      daily_limit INTEGER NOT NULL DEFAULT 30,
      current_daily_count INTEGER NOT NULL DEFAULT 0,
      last_activity_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    INSERT INTO bot_engine_settings (id, is_active, daily_limit, current_daily_count)
    VALUES ('default', true, 30, 0)
    ON CONFLICT (id) DO NOTHING;
  `);
  console.log('Migration successful!');
  await pool.end();
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
