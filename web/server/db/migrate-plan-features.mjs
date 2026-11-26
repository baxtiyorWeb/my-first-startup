import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

/**
 * Idempotent migration that refreshes the feature list of the seeded plans.
 * The pricing API reads features from subscription_plans, so updating only the
 * code defaults would not change what web and mobile show.
 */
const PLAN_FEATURES = {
  free: [
    "Barcha maqola, video va yangiliklarni o'qish",
    "Muhokamalar va Shorts'da qatnashish",
    "Kuniga 10 tagacha post va Shorts",
    "10 MB gacha rasm yuklash",
    "Bilimlar bazasi va saqlanganlar",
  ],
  pro: [
    "50 MB gacha HD video va Shorts yuklash",
    "Kuniga 100 tagacha post va maqola",
    "Profil uchun Pro tasdiq belgisi",
    "Kengaytirilgan ko'rishlar statistikasi",
    "Ustuvor texnik yordam",
    "Yangi imkoniyatlarga erta kirish",
  ],
  team: [
    "Geters Pro barcha imkoniyatlari",
    "100 MB gacha media yuklash",
    "Kuniga 500 tagacha post va Shorts",
    "Jamoa uchun kengaytirilgan analitika",
    "Ustuvor qo'llab-quvvatlash",
  ],
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

    for (const [slug, features] of Object.entries(PLAN_FEATURES)) {
      await client.query(
        `UPDATE subscription_plans SET features = $1::jsonb WHERE slug = $2`,
        [JSON.stringify(features), slug]
      );
    }

    await client.query("COMMIT");
    console.log("[MIGRATION] Subscription plan features updated.");
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
