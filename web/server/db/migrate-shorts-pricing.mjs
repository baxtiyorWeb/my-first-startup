import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Add is_short column & index to posts
    await client.query(`
      ALTER TABLE posts
      ADD COLUMN IF NOT EXISTS is_short boolean NOT NULL DEFAULT false;
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_is_short
      ON posts (is_short, created_at DESC);
    `);
    await client.query(`
      UPDATE posts
      SET is_short = true
      WHERE video_url IS NOT NULL
        AND video_duration_seconds IS NOT NULL
        AND video_duration_seconds > 0
        AND video_duration_seconds <= 60;
    `);

    // 2. Subscription plans
    await client.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug varchar(40) NOT NULL,
        name varchar(100) NOT NULL,
        description text NOT NULL DEFAULT '',
        price_monthly_uzs integer NOT NULL DEFAULT 0,
        price_yearly_uzs integer NOT NULL DEFAULT 0,
        currency varchar(10) NOT NULL DEFAULT 'UZS',
        features jsonb NOT NULL DEFAULT '[]'::jsonb,
        limits jsonb NOT NULL DEFAULT '{"maxMediaSizeMb":10,"maxDailyPosts":10,"hdShorts":false,"verifiedBadge":false,"analytics":false}'::jsonb,
        is_active boolean NOT NULL DEFAULT true,
        sort_order integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans (slug);
    `);

    // 3. User subscriptions
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
        status varchar(24) NOT NULL DEFAULT 'active',
        billing_cycle varchar(16) NOT NULL DEFAULT 'monthly',
        current_period_start timestamptz NOT NULL DEFAULT now(),
        current_period_end timestamptz NOT NULL,
        cancel_at_period_end boolean NOT NULL DEFAULT false,
        auto_renew boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON user_subscriptions (user_id, status);
    `);

    // 4. Payment transactions
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_transactions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        subscription_id uuid REFERENCES user_subscriptions(id) ON DELETE SET NULL,
        plan_id uuid NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
        provider varchar(24) NOT NULL,
        provider_transaction_id varchar(160),
        idempotency_key varchar(120) NOT NULL,
        amount integer NOT NULL,
        currency varchar(10) NOT NULL DEFAULT 'UZS',
        status varchar(24) NOT NULL DEFAULT 'pending',
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_transactions_idempotency ON payment_transactions (idempotency_key);
      CREATE INDEX IF NOT EXISTS idx_payment_transactions_user ON payment_transactions (user_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_tx ON payment_transactions (provider, provider_transaction_id);
    `);

    // 5. Seed default Geters plans idempotently
    await client.query(`
      INSERT INTO subscription_plans (slug, name, description, price_monthly_uzs, price_yearly_uzs, features, limits, sort_order)
      VALUES
        (
          'free',
          'Boshlang''ich',
          'Hamjamiyatda ishtirok etish, postlar va Shorts ulashish uchun asosiy reja.',
          0,
          0,
          '["Cheksiz o''qish va muhokamalar","Kuniga 10 tagacha post va Shorts","10 MB gacha rasm yuklash","Asosiy profil sahifasi"]'::jsonb,
          '{"maxMediaSizeMb":10,"maxDailyPosts":10,"hdShorts":false,"verifiedBadge":false,"analytics":false}'::jsonb,
          0
        ),
        (
          'pro',
          'Geters Pro',
          'Faol mualliflar, startap asoschilari va kontent yaratuvchilar uchun.',
          49000,
          470000,
          '["50 MB gacha HD video va Shorts yuklash","Cheksiz post va maqolalar","Profil uchun Pro tasdiq belgisi","Kengaytirilgan ko''rishlar statistikasi","Ustuvor texnik yordam"]'::jsonb,
          '{"maxMediaSizeMb":50,"maxDailyPosts":100,"hdShorts":true,"verifiedBadge":true,"analytics":true}'::jsonb,
          1
        ),
        (
          'team',
          'Startap Jamoa',
          'Startaplar va texnologik jamoalar uchun kengaytirilgan imkoniyatlar.',
          149000,
          1430000,
          '["Geters Pro barcha imkoniyatlari","Jamoaviy brend va loyiha sahifalari","5 tagacha jamoa a''zosi","Reklama va e''lonlarni biriktirish","Maxsus API va eksport"]'::jsonb,
          '{"maxMediaSizeMb":100,"maxDailyPosts":500,"hdShorts":true,"verifiedBadge":true,"analytics":true}'::jsonb,
          2
        )
      ON CONFLICT (slug) DO NOTHING;
    `);

    await client.query("COMMIT");
    console.log("[MIGRATION] Shorts & Pricing schema migrated successfully.");
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
