require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { initDB, pool } = require('./db/schema');

const app = express();

app.use(cors({ origin: true, credentials: true, methods: ['GET','POST','PUT','DELETE','OPTIONS','PATCH'], allowedHeaders: ['Content-Type','Authorization'] }));
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => res.json({
  status: 'ok',
  time: new Date().toISOString(),
  build: 'v4-all-fixes-2026-07-02',
  routes: ['auth','users','clients','projects','tasks','reports','messages','deliverables','dailyreports','teamchat','drive','sales','accounting']
}));

app.use('/api/auth',         require('./routes/auth'));
app.use('/api/users',        require('./routes/users'));
app.use('/api/clients',      require('./routes/clients'));
app.use('/api/projects',     require('./routes/projects'));
app.use('/api/tasks',        require('./routes/tasks'));
app.use('/api/reports',      require('./routes/reports'));
app.use('/api/messages',     require('./routes/messages'));
app.use('/api/deliverables', require('./routes/deliverables'));
app.use('/api/dailyreports', require('./routes/dailyreports'));
app.use('/api/teamchat',     require('./routes/teamchat'));
app.use('/api/drive',        require('./routes/drive'));
app.use('/api/sales',        require('./routes/sales'));
app.use('/api/accounting',   require('./routes/accounting'));
app.use('/api/export',       require('./routes/export'));
app.use('/api',              require('./routes/misc'));

app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));
app.use((err, req, res, next) => { console.error(err.stack); res.status(500).json({ error: 'Internal server error' }); });

const seedAdmin = async () => {
  try {
    const email = 'admin@filmelo.com';
    const exists = await pool.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) { console.log('ℹ️  Admin already exists.'); return; }
    const hash = await bcrypt.hash('Filmelo@2025', 12);
    await pool.query(`INSERT INTO users (name,email,password_hash,role,avatar_initials) VALUES ($1,$2,$3,'admin','FA')`,
      ['Filmelo Admin', email, hash]);
    console.log('✅ Admin created: admin@filmelo.com / Filmelo@2025');
  } catch (err) { console.error('Seed error:', err.message); }
};

const PORT = process.env.PORT || 5000;
initDB().then(seedAdmin).then(() => {
  app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Running on port ${PORT}`));
}).catch(err => { console.error('❌ Startup failed:', err.message); process.exit(1); });
