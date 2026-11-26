import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

/**
 * Idempotent migration that adds the Google Play (RevenueCat) product mapping
 * to subscription plans. Safe to run repeatedly.
 *
 * The product ids below must match the subscription products created in Google
 * Play Console and attached to the matching packages in RevenueCat. Admins can
 * change them later directly in `subscription_plans` — both the web and mobile
 * apps read plans from the API, never from hardcoded values.
 */
async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      "SELECT to_regclass('public.subscription_plans') AS table_name"
    );
    if (!rows[0]?.table_name) {
      await client.query("ROLLBACK");
      console.log(
        "[MIGRATION] subscription_plans topilmadi — avval `node server/db/migrate-pricing.mjs` ni ishga tushiring."
      );
      return;
    }

    await client.query(`
      ALTER TABLE subscription_plans
        ADD COLUMN IF NOT EXISTS store_product_monthly_id varchar(160),
        ADD COLUMN IF NOT EXISTS store_product_yearly_id varchar(160);
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_plans_store_monthly
        ON subscription_plans (store_product_monthly_id)
        WHERE store_product_monthly_id IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_plans_store_yearly
        ON subscription_plans (store_product_yearly_id)
        WHERE store_product_yearly_id IS NOT NULL;
    `);

    await client.query(`
      UPDATE subscription_plans
      SET store_product_monthly_id = COALESCE(store_product_monthly_id, 'geters_pro_monthly'),
          store_product_yearly_id = COALESCE(store_product_yearly_id, 'geters_pro_yearly')
      WHERE slug = 'pro';

      UPDATE subscription_plans
      SET store_product_monthly_id = COALESCE(store_product_monthly_id, 'geters_team_monthly'),
          store_product_yearly_id = COALESCE(store_product_yearly_id, 'geters_team_yearly')
      WHERE slug = 'team';
    `);

    await client.query("COMMIT");
    console.log("[MIGRATION] RevenueCat / Google Play product mapping is ready.");
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
