// Wipe ALL business data so the UI is completely empty.
// Auth (roles/permissions/users) is preserved so login keeps working.
// Usage: CONFIRM=WIPE npm run db:clear   (uses DATABASE_URL from env)
// On Railway: railway run --service <svc> env CONFIRM=WIPE npm run db:clear
import pg from 'pg';

if (process.env.CONFIRM !== 'WIPE') {
  console.error('Refusing to wipe: re-run with CONFIRM=WIPE');
  process.exit(1);
}
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

const BUSINESS_TABLES = [
  'payment_allocations', 'rental_payments', 'rent_installments', 'rent_events',
  'payments', 'contracts', 'tenants', 'houses', 'buildings', 'compounds',
  'staff', 'electricity_meters', 'water_meters', 'maintenance', 'letters',
  'announcements', 'complaints', 'expenses', 'companies', 'facilities',
  'facility_bookings', 'notifications', 'compound_admin_notes',
  'azhar_profiles', 'azhar_audit_log', 'media_assets', 'user_devices',
  'password_reset_tokens', 'refresh_tokens',
];

const pool = new pg.Pool({
  connectionString: url,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
});
try {
  const existing = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname='public'`
  );
  const have = new Set(existing.rows.map((r) => r.tablename));
  const targets = BUSINESS_TABLES.filter((t) => have.has(t));
  if (!targets.length) {
    console.log('No business tables found - database is already empty.');
  } else {
    await pool.query(`TRUNCATE ${targets.join(', ')} RESTART IDENTITY CASCADE`);
    console.log(`Wiped ${targets.length} tables: ${targets.join(', ')}`);
  }
  const counts = await pool.query(
    `SELECT ${BUSINESS_TABLES.filter((t) => have.has(t)).map((t) => `(SELECT count(*) FROM ${t}) AS ${t}`).join(', ') || '1 AS ok'}`
  );
  console.log('Row counts after wipe:', counts.rows[0]);
} finally {
  await pool.end();
}
