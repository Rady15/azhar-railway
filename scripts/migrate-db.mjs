import { Pool } from 'pg';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required for db:migrate');

const pool = new Pool({
  connectionString: url,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const statements = [
  `ALTER TABLE rental_payments ADD COLUMN IF NOT EXISTS attachment_media_id UUID`,
  `ALTER TABLE rental_payments ADD COLUMN IF NOT EXISTS attachment_file_name TEXT`,
  `ALTER TABLE rental_payments ADD COLUMN IF NOT EXISTS attachment_mime_type TEXT`,
];

async function main() {
  const client = await pool.connect();
  try {
    for (const sql of statements) {
      await client.query(sql);
      console.log(`[migrate] OK: ${sql}`);
    }
    console.log('[migrate] All rental_payments attachment columns ensured.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[migrate] FAILED:', err.message);
  process.exit(1);
});
