#!/usr/bin/env node
/**
 * Build or initialize the ecommerce SQLite database from schema.sql + seed.sql.
 *
 * Usage:
 *   node build_db.js           # Initialize if tables don't exist
 *   node build_db.js --reset   # Rebuild database from scratch
 *   node build_db.js --db /path/to/db.sqlite
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const DEFAULT_DB = process.env.DB_PATH ?? path.join(ROOT, 'ecommerce.db');

export function buildDatabase({ dbPath = DEFAULT_DB, reset = false } = {}) {
  const resolvedPath = path.resolve(dbPath);
  const dir = path.dirname(resolvedPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (reset && fs.existsSync(resolvedPath)) {
    fs.unlinkSync(resolvedPath);
    console.log(`Removed existing database at ${resolvedPath}`);
  }

  const db = new DatabaseSync(resolvedPath);
  db.exec('PRAGMA foreign_keys = ON;');

  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='products'").get();
  if (tableCheck && !reset) {
    console.log(`Database at ${resolvedPath} already initialized. Skipping seed.`);
    return;
  }

  const schemaPath = path.join(ROOT, 'schema.sql');
  const seedPath = path.join(ROOT, 'seed.sql');

  if (!fs.existsSync(schemaPath) || !fs.existsSync(seedPath)) {
    throw new Error('schema.sql or seed.sql not found in project root.');
  }

  const schema = fs.readFileSync(schemaPath, 'utf8');
  const seed = fs.readFileSync(seedPath, 'utf8');

  db.exec(schema);
  db.exec(seed);

  console.log(`Database built successfully at ${resolvedPath}`);
  const tables = ['categories', 'products', 'customers', 'orders', 'order_items', 'payments', 'reviews', 'sessions'];
  for (const table of tables) {
    try {
      const row = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get();
      console.log(`  ${table.padEnd(14)} ${row.count} rows`);
    } catch {
      // Table might not exist or empty
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const reset = args.includes('--reset');
  let dbPath = DEFAULT_DB;

  const dbIndex = args.indexOf('--db');
  if (dbIndex !== -1 && args[dbIndex + 1]) {
    dbPath = args[dbIndex + 1];
  }

  buildDatabase({ dbPath, reset });
}
