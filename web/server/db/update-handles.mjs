import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateHandles() {
  await pool.query(`
    UPDATE users SET handle = 'sardor_rahimov' WHERE handle = 'persona1';
    UPDATE users SET handle = 'dilnoza_ux' WHERE handle = 'persona2';
    UPDATE users SET handle = 'temur_polatov' WHERE handle = 'persona3';
    UPDATE users SET handle = 'madina_karimova' WHERE handle = 'persona4';
    UPDATE users SET handle = 'azizbek_yoqubov' WHERE handle = 'persona5';
    UPDATE users SET handle = 'jamshid_ops' WHERE handle = 'persona6';
  `);
  console.log('Handles successfully updated to realistic usernames!');
  await pool.end();
  process.exit(0);
}

updateHandles().catch((err) => {
  console.error(err);
  process.exit(1);
});
