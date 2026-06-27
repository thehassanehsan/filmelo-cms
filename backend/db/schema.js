const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ FATAL: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

let connectionString = process.env.DATABASE_URL.trim();
if (!connectionString.includes('sslmode=')) {
  connectionString += (connectionString.includes('?') ? '&' : '?') + 'sslmode=require';
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const testConnection = async (retries = 5, delay = 3000) => {
  for (let i = 1; i <= retries; i++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ Database connection verified');
      return true;
    } catch (err) {
      console.error(`❌ DB connection attempt ${i}/${retries} failed: ${err.message}`);
      if (i < retries) {
        console.log(`   Retrying in ${delay / 1000}s…`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  console.error('❌ FATAL: Could not connect to database after all retries.');
  process.exit(1);
};

const initDB = async () => {
  await testConnection();
  const client = await pool.connect();
  try {
    const tables = [
      {
        name: 'users',
        sql: `CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'professional', 'client')),
          backup_email VARCHAR(255),
          avatar_initials VARCHAR(5),
          is_active BOOLEAN DEFAULT true,
          reset_token VARCHAR(255),
          reset_token_expires TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );`
      },
      {
        name: 'clients',
        sql: `CREATE TABLE IF NOT EXISTS clients (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          company_name VARCHAR(255) NOT NULL,
          contact_name VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(50),
          industry VARCHAR(100),
          location VARCHAR(255),
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'prospect')),
          notes TEXT,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );`
      },
      {
        name: 'projects',
        sql: `CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
          priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
          start_date DATE,
          due_date DATE,
          budget NUMERIC(12,2),
          spent NUMERIC(12,2) DEFAULT 0,
          drive_link VARCHAR(500),
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );`
      },
      {
        name: 'project_members',
        sql: `CREATE TABLE IF NOT EXISTS project_members (
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(50) DEFAULT 'member',
          PRIMARY KEY (project_id, user_id)
        );`
      },
      {
        name: 'tasks',
        sql: `CREATE TABLE IF NOT EXISTS tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          status VARCHAR(50) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
          priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
          due_date DATE,
          tags TEXT[],
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );`
      },
      {
        name: 'task_comments',
        sql: `CREATE TABLE IF NOT EXISTS task_comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );`
      },
      {
        name: 'reports',
        sql: `CREATE TABLE IF NOT EXISTS reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL CHECK (type IN ('monthly', 'weekly', 'campaign', 'custom')),
          client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
          content JSONB DEFAULT '{}',
          summary TEXT,
          period_start DATE,
          period_end DATE,
          drive_link VARCHAR(500),
          status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );`
      },
      {
        name: 'invoices',
        sql: `CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_number VARCHAR(50) UNIQUE NOT NULL,
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
          amount NUMERIC(12,2) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
          issued_date DATE DEFAULT CURRENT_DATE,
          due_date DATE,
          paid_date DATE,
          notes TEXT,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );`
      },
      {
        name: 'activity_log',
        sql: `CREATE TABLE IF NOT EXISTS activity_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50),
          entity_id UUID,
          details JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );`
      },
      {
        name: 'notifications',
        sql: `CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          type VARCHAR(50) DEFAULT 'info',
          is_read BOOLEAN DEFAULT false,
          link VARCHAR(255),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );`
      },
      {
        name: 'messages',
        sql: `CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
          receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );`
      },
    ];

    for (const table of tables) {
      try {
        await client.query(table.sql);
        console.log(`  ✓ Table ready: ${table.name}`);
      } catch (err) {
        console.error(`  ✗ Failed to create table "${table.name}": ${err.message}`);
        throw err;
      }
    }
    console.log('✅ All database tables ready');
  } catch (err) {
    console.error('❌ DB schema init failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, initDB };
