require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { initDB, pool } = require('./db/schema');
const { seedAdmin } = require('./seed-admin');

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));

// Health check — no DB needed
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// One-time admin setup endpoint — visit this URL in your browser once
app.get('/setup-admin', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const exists = await client.query('SELECT id FROM users WHERE email=$1', ['admin@filmelo.com']);
      if (exists.rows.length) {
        return res.json({ status: 'already_exists', message: 'Admin account already exists. Login with admin@filmelo.com / Filmelo@Admin2025!' });
      }
      const hash = await bcrypt.hash('Filmelo@Admin2025!', 12);
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, avatar_initials) VALUES ($1,$2,$3,'admin','HA')`,
        ['Hassan', 'admin@filmelo.com', hash]
      );
      return res.json({ status: 'created', message: '✅ Admin created! Email: admin@filmelo.com | Password: Filmelo@Admin2025!' });
    } finally {
      client.release();
    }
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// Routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/clients',  require('./routes/clients'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks',    require('./routes/tasks'));
app.use('/api/reports',  require('./routes/reports'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api',          require('./routes/misc'));

app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

const PORT = process.env.PORT || 5000;

initDB()
  .then(async () => {
    const client = await pool.connect();
    try {
      await seedAdmin(client);
    } finally {
      client.release();
    }
  })
  .then(() => {
    app.listen(PORT, '0.0.0.0', () =>
      console.log(`🚀 Filmelo CMS backend running on port ${PORT}`)
    );
  })
  .catch(err => {
    console.error('❌ Startup failed:', err.message);
    process.exit(1);
  });
