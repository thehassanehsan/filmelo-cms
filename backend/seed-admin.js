/**
 * SEED ADMIN ACCOUNT
 * Called automatically on server startup via index.js.
 * Safe to run multiple times — skips if admin already exists.
 *
 * Manual run (e.g. Render Shell tab):
 *   node seed-admin.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

let connectionString = (process.env.DATABASE_URL || '').trim();
if (!connectionString) { console.error('DATABASE_URL not set'); process.exit(1); }
if (!connectionString.includes('sslmode=')) connectionString += '?sslmode=require';

const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

// ─── Admin credentials ────────────────────────────────────────────────────────
const ADMIN_NAME     = 'Hassan';
const ADMIN_EMAIL    = 'admin@filmelo.com';
const ADMIN_PASSWORD = 'Filmelo@Admin2025!';
// ─────────────────────────────────────────────────────────────────────────────

async function seedAdmin(client) {
  const owns = !!client; // true = called from index.js with existing client
  const db = client || await pool.connect();

  try {
    const exists = await db.query('SELECT id FROM users WHERE email=$1', [ADMIN_EMAIL]);
    if (exists.rows.length) {
      console.log(`ℹ  Admin already exists: ${ADMIN_EMAIL}`);
      return;
    }

    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    await db.query(
      `INSERT INTO users (name, email, password_hash, role, avatar_initials)
       VALUES ($1,$2,$3,'admin','HA')`,
      [ADMIN_NAME, ADMIN_EMAIL, hash]
    );

    console.log('✅ Admin account created!');
    console.log('━'.repeat(40));
    console.log(`  Name:     ${ADMIN_NAME}`);
    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log('━'.repeat(40));
    console.log('  ⚠  Change this password after first login.');
  } finally {
    if (!owns) {
      db.release();
      await pool.end();
    }
  }
}

// When run directly: node seed-admin.js
if (require.main === module) {
  seedAdmin(null).catch(err => {
    console.error('Seed failed:', err.message);
    process.exit(1);
  });
}

module.exports = { seedAdmin };
