#!/usr/bin/env node
/**
 * Runs a raw SQL file against the database configured in DATABASE_URL.
 *
 * Usage:
 *   node scripts/run-sql.js drizzle/0000_add_reaction_type_counts.sql
 *
 * This exists because the hand-written migrations in `drizzle/` are not
 * managed by drizzle-kit (there's no `meta/_journal.json`), so
 * `drizzle-kit migrate` is a no-op for them. Using `npm run db:push`
 * would apply the schema diff but would skip the backfill statements,
 * so we need a generic "just pipe this file to MySQL" runner.
 *
 * Each statement is executed in order. `mysql2` needs `multipleStatements`
 * enabled to run a semicolon-separated script in one call.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/run-sql.js <path-to-sql-file>');
    process.exit(1);
  }
  const abs = path.resolve(process.cwd(), file);
  if (!fs.existsSync(abs)) {
    console.error(`File not found: ${abs}`);
    process.exit(1);
  }
  const sql = fs.readFileSync(abs, 'utf8');

  // Build connection options. We explicitly parse DATABASE_URL ourselves
  // instead of handing it to mysql2 as `uri`, because some mysql2 builds
  // silently fall back to 'root'@'localhost' when the `uri` option is
  // empty or slightly malformed (e.g. missing port, encoded @ in password).
  // Falling back to individual DB_* vars lets this script work in setups
  // that don't use a single URL.
  const connOpts = { multipleStatements: true };
  if (process.env.DATABASE_URL) {
    const u = new URL(process.env.DATABASE_URL);
    connOpts.host = u.hostname;
    connOpts.port = u.port ? Number(u.port) : 3306;
    connOpts.user = decodeURIComponent(u.username || '');
    connOpts.password = decodeURIComponent(u.password || '');
    connOpts.database = u.pathname.replace(/^\//, '') || undefined;
  } else if (process.env.DB_HOST) {
    connOpts.host = process.env.DB_HOST;
    connOpts.port = Number(process.env.DB_PORT || 3306);
    connOpts.user = process.env.DB_USER;
    connOpts.password = process.env.DB_PASSWORD;
    connOpts.database = process.env.DB_NAME;
  } else {
    console.error(
      'Neither DATABASE_URL nor DB_HOST is set. Make sure your .env is loaded.',
    );
    process.exit(1);
  }

  console.log(
    `→ Connecting to mysql://${connOpts.user}@${connOpts.host}:${connOpts.port}/${connOpts.database}`,
  );
  const conn = await mysql.createConnection(connOpts);

  console.log(`→ Running ${path.basename(file)} …`);
  try {
    await conn.query(sql);
    console.log('✓ Done.');
  } catch (err) {
    console.error('✗ SQL error:', err.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
