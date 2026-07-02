const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('❌ FATAL: DATABASE_URL not set.');
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
      console.error(`❌ DB attempt ${i}/${retries}: ${err.message}`);
      if (i < retries) await new Promise(r => setTimeout(r, delay));
    }
  }
  console.error('❌ FATAL: Cannot connect to database.'); process.exit(1);
};

const initDB = async () => {
  await testConnection();
  const client = await pool.connect();
  try {
    const tables = [
      { name: 'users', sql: `CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) NOT NULL CHECK (role IN ('admin','professional','client')),
          backup_email VARCHAR(255),
          avatar_initials VARCHAR(5),
          is_active BOOLEAN DEFAULT true,
          reset_token VARCHAR(255),
          reset_token_expires TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );` },
      { name: 'clients', sql: `CREATE TABLE IF NOT EXISTS clients (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          company_name VARCHAR(255) NOT NULL,
          contact_name VARCHAR(255),
          email VARCHAR(255),
          phone VARCHAR(50),
          industry VARCHAR(100),
          location VARCHAR(255),
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active','inactive','prospect')),
          notes TEXT,
          color VARCHAR(20) DEFAULT '#0D4F55',
          logo_url VARCHAR(500),
          allowed_message_user_ids UUID[],
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );` },
      { name: 'projects', sql: `CREATE TABLE IF NOT EXISTS projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          notes TEXT,
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active','completed','paused','cancelled')),
          priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
          start_date DATE,
          due_date DATE,
          budget NUMERIC(12,2),
          spent NUMERIC(12,2) DEFAULT 0,
          drive_link VARCHAR(500),
          tags TEXT[],
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );` },
      { name: 'project_members', sql: `CREATE TABLE IF NOT EXISTS project_members (
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(50) DEFAULT 'member',
          PRIMARY KEY (project_id, user_id)
        );` },
      { name: 'tasks', sql: `CREATE TABLE IF NOT EXISTS tasks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          description TEXT,
          notes TEXT,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          status VARCHAR(50) DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','done')),
          priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
          due_date DATE,
          completed_at TIMESTAMPTZ,
          monetary_value NUMERIC(12,2) DEFAULT 0,
          tags TEXT[],
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );` },
      { name: 'task_comments', sql: `CREATE TABLE IF NOT EXISTS task_comments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );` },
      { name: 'reports', sql: `CREATE TABLE IF NOT EXISTS reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          type VARCHAR(50) NOT NULL CHECK (type IN ('monthly','weekly','campaign','custom')),
          client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
          content JSONB DEFAULT '{}',
          summary TEXT,
          period_start DATE,
          period_end DATE,
          drive_link VARCHAR(500),
          status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft','published')),
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );` },
      { name: 'invoices', sql: `CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          invoice_number VARCHAR(50) UNIQUE NOT NULL,
          client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
          project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
          amount NUMERIC(12,2) NOT NULL,
          status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue','cancelled')),
          issued_date DATE DEFAULT CURRENT_DATE,
          due_date DATE,
          paid_date DATE,
          notes TEXT,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );` },
      { name: 'activity_log', sql: `CREATE TABLE IF NOT EXISTS activity_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          action VARCHAR(100) NOT NULL,
          entity_type VARCHAR(50),
          entity_id UUID,
          details JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );` },
      { name: 'notifications', sql: `CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          type VARCHAR(50) DEFAULT 'info',
          is_read BOOLEAN DEFAULT false,
          is_cleared BOOLEAN DEFAULT false,
          link VARCHAR(255),
          created_at TIMESTAMPTZ DEFAULT NOW()
        );` },
      { name: 'deliverables', sql: `CREATE TABLE IF NOT EXISTS deliverables (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(255) NOT NULL,
          client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
          video_link VARCHAR(500),
          status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft','revision','final')),
          revision_number INTEGER DEFAULT 1,
          description TEXT,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );` },
      { name: 'deliverable_remarks', sql: `CREATE TABLE IF NOT EXISTS deliverable_remarks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          deliverable_id UUID REFERENCES deliverables(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );` },
      { name: 'messages', sql: `CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
          receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          original_content TEXT,
          is_read BOOLEAN DEFAULT false,
          is_edited BOOLEAN DEFAULT false,
          is_deleted BOOLEAN DEFAULT false,
          forwarded_from UUID REFERENCES messages(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );` },
      { name: 'team_chat', sql: `CREATE TABLE IF NOT EXISTS team_chat (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
          room VARCHAR(50) DEFAULT 'all',
          content TEXT NOT NULL,
          original_content TEXT,
          is_edited BOOLEAN DEFAULT false,
          is_deleted BOOLEAN DEFAULT false,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );` },
      { name: 'drive_settings', sql: `CREATE TABLE IF NOT EXISTS drive_settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID,
          folder_link VARCHAR(500),
          label VARCHAR(255),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );` },
      { name: 'daily_reports', sql: `CREATE TABLE IF NOT EXISTS daily_reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          report_date DATE DEFAULT CURRENT_DATE,
          tasks_completed TEXT,
          projects_worked TEXT,
          drive_links TEXT,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );` },
      { name: 'sales_pipeline', sql: `CREATE TABLE IF NOT EXISTS sales_pipeline (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          company_name VARCHAR(255) NOT NULL,
          contact_name VARCHAR(255),
          contact_email VARCHAR(255),
          contact_phone VARCHAR(50),
          stage VARCHAR(50) DEFAULT 'prospect' CHECK (stage IN ('prospect','pitching','in_process','negotiation','closing','won','lost')),
          package VARCHAR(255),
          value NUMERIC(12,2),
          assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
          deadline DATE,
          notes TEXT,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );` },
      { name: 'accounting', sql: `CREATE TABLE IF NOT EXISTS accounting (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          type VARCHAR(20) NOT NULL CHECK (type IN ('income','expense')),
          category VARCHAR(100),
          amount NUMERIC(12,2) NOT NULL,
          description TEXT,
          reference VARCHAR(255),
          entry_date DATE DEFAULT CURRENT_DATE,
          created_by UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );` },
    ];

    for (const t of tables) {
      try { await client.query(t.sql); console.log(`  ✓ ${t.name}`); }
      catch (err) { console.error(`  ✗ ${t.name}: ${err.message}`); throw err; }
    }

    // Alter existing tables to add missing columns safely
    const alters = [
      // daily_reports - ensure user_id exists (old tables may not have it)
      `ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS user_id UUID`,
      `ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS tasks_completed TEXT`,
      `ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS projects_worked TEXT`,
      `ALTER TABLE daily_reports ADD COLUMN IF NOT EXISTS drive_links TEXT`,
      // drive_settings - old tables used drive_link, new use folder_link
      `ALTER TABLE drive_settings ADD COLUMN IF NOT EXISTS folder_link VARCHAR(500)`,
      `ALTER TABLE drive_settings ADD COLUMN IF NOT EXISTS label VARCHAR(255)`,
      `ALTER TABLE clients ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#0D4F55'`,
      `ALTER TABLE clients ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500)`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS monetary_value NUMERIC(12,2) DEFAULT 0`,
      `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`,
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS notes TEXT`,
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS tags TEXT[]`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS original_content TEXT`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS forwarded_from UUID`,
      `ALTER TABLE messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()`,
      `ALTER TABLE team_chat ADD COLUMN IF NOT EXISTS room VARCHAR(50) DEFAULT 'all'`,
      `ALTER TABLE team_chat ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false`,
      `ALTER TABLE team_chat ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false`,
      `ALTER TABLE team_chat ADD COLUMN IF NOT EXISTS original_content TEXT`,
      `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_cleared BOOLEAN DEFAULT false`,
      `ALTER TABLE clients ADD COLUMN IF NOT EXISTS allowed_message_user_ids UUID[]`,
    ];
    for (const sql of alters) {
      try { await client.query(sql); }
      catch (err) { /* ignore if column already exists */ }
    }

    console.log('✅ All tables ready');
  } catch (err) {
    console.error('❌ DB init failed:', err.message); throw err;
  } finally { client.release(); }
};

module.exports = { pool, initDB };
