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
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Make sure your .env is in place.');
    process.exit(1);
  }

  const sql = fs.readFileSync(abs, 'utf8');
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    multipleStatements: true,
  });

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
