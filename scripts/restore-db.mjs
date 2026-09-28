import { spawnSync } from 'node:child_process';
const url = process.env.DATABASE_URL;
const file = process.argv[2];
if (!url) throw new Error('DATABASE_URL is required');
if (!file) throw new Error('Usage: npm run db:restore -- /path/to/backup.dump');
const r = spawnSync('pg_restore', ['--clean','--if-exists','--no-owner','--no-acl','--dbname',url,file], { stdio:'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log('Restore completed successfully');
