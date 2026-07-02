/**
 * DATABASE CONNECTION DIAGNOSTIC SCRIPT
 * 
 * Run this on your server to diagnose connection issues:
 *   node check-db.js
 * 
 * On Render: go to your service → Shell tab → paste: node check-db.js
 */
require('dotenv').config();
const { Client } = require('pg');

async function checkDB() {
  console.log('\n🔍 Filmelo CMS — Database Diagnostic\n');
  console.log('━'.repeat(50));

  // 1. Check env var exists
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ PROBLEM: DATABASE_URL is not set at all.');
    console.error('   Fix: Add DATABASE_URL in your Render Environment Variables.');
    process.exit(1);
  }

  // 2. Mask password for safe logging
  const masked = url.replace(/:([^:@]+)@/, ':****@');
  console.log(`\n✓ DATABASE_URL is set: ${masked}`);

  // 3. Check format
  if (!url.startsWith('postgresql://') && !url.startsWith('postgres://')) {
    console.error('\n❌ PROBLEM: DATABASE_URL has wrong format.');
    console.error('   It must start with: postgresql://');
    console.error(`   Yours starts with:  ${url.substring(0, 20)}...`);
    console.error('\n   Fix: Go to Neon → Connection Details → copy the "Node.js" connection string.');
    process.exit(1);
  }
  console.log('✓ URL format looks correct (starts with postgresql://)');

  // 4. Check sslmode
  if (!url.includes('sslmode=require')) {
    console.warn('\n⚠ WARNING: URL does not contain sslmode=require');
    console.warn('  Adding it automatically for this test...');
  }

  // 5. Try to connect
  const connectionString = url.includes('sslmode=')
    ? url
    : url + (url.includes('?') ? '&' : '?') + 'sslmode=require';

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  console.log('\n⏳ Attempting connection...');
  try {
    await client.connect();
    console.log('✅ Connected successfully!');

    const res = await client.query('SELECT current_database(), current_user, version()');
    console.log(`✅ Database: ${res.rows[0].current_database}`);
    console.log(`✅ User:     ${res.rows[0].current_user}`);
    console.log(`✅ Version:  ${res.rows[0].version.split(' ').slice(0,2).join(' ')}`);

    // Check tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    if (tables.rows.length === 0) {
      console.log('\n⚠ No tables yet — they will be created when the server starts.');
    } else {
      console.log(`\n✅ Tables found (${tables.rows.length}):`);
      tables.rows.forEach(t => console.log(`   • ${t.table_name}`));
    }

    await client.end();
    console.log('\n🎉 Everything looks good! Your DATABASE_URL is working correctly.');
  } catch (err) {
    console.error('\n❌ CONNECTION FAILED');
    console.error(`   Error: ${err.message}`);
    console.error('\n── Common causes & fixes ──────────────────────────');
    if (err.message.includes('password') || err.message.includes('authentication')) {
      console.error('  → Wrong password in DATABASE_URL');
      console.error('    Fix: Go to Neon → your project → Reset password → copy fresh connection string');
    } else if (err.message.includes('does not exist') || err.message.includes('ENOTFOUND')) {
      console.error('  → Hostname is wrong or Neon project was deleted');
      console.error('    Fix: Go to Neon → Connection Details → re-copy the full connection string');
    } else if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT')) {
      console.error('  → Connection timed out — Neon endpoint may be sleeping');
      console.error('    Fix: Go to neon.tech, open your project to wake it up, then retry');
    } else if (err.message.includes('SSL')) {
      console.error('  → SSL issue');
      console.error('    Fix: Make sure your DATABASE_URL ends with ?sslmode=require');
    }
    process.exit(1);
  }
}

checkDB();
