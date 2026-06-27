# Filmelo Media — CMS

A complete, production-ready Agency Management System with three role-based portals.

---

## 🏗️ Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Frontend | React 18 + Vite + React Router v6       |
| Backend  | Node.js + Express                       |
| Database | PostgreSQL via Neon (serverless)        |
| Auth     | JWT + bcryptjs                          |
| Email    | Nodemailer (SMTP)                       |
| Deploy   | Vercel (frontend + backend)             |

---

## 📁 Structure

```
filmelo-cms/
├── backend/          ← Express API
│   ├── db/schema.js  ← DB init + pool
│   ├── middleware/   ← JWT auth
│   ├── routes/       ← All API routes
│   ├── index.js      ← Entry point
│   └── .env.example
└── frontend/         ← React app
    ├── src/
    │   ├── pages/
    │   │   ├── admin/        ← Admin portal
    │   │   ├── professional/ ← Professional portal
    │   │   └── client/       ← Client portal
    │   ├── components/       ← Shared UI
    │   ├── context/          ← Auth context
    │   └── utils/api.js      ← API client
    └── .env.example
```

---

## ⚡ Local Setup (Fedora Linux)

### 1. Clone & install

```bash
# Backend
cd backend
cp .env.example .env        # fill in your values
npm install
node index.js               # or: npm run dev (with nodemon)

# Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 2. Configure backend `.env`

```env
DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/filmelo_cms?sslmode=require
JWT_SECRET=change_this_to_something_long_and_random
FRONTEND_URL=http://localhost:5173
PORT=5000
NODE_ENV=development

# Optional — for password reset emails:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=your_google_app_password
```

### 3. Configure frontend `.env`

```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Create your first admin user

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Hassan Ehsan","email":"admin@filmelo.com","password":"YourPassword123","role":"admin"}'
```

Then sign in at `http://localhost:5173/login`.

---

## 🚀 Vercel Deployment

### Backend

1. Create a new Vercel project pointing to `./backend`
2. Add all environment variables from `.env.example`
3. Set **Root Directory** = `backend`
4. Framework = **Other**

### Frontend

1. Create a new Vercel project pointing to `./frontend`
2. Add `VITE_API_URL=https://your-backend.vercel.app/api`
3. Set **Root Directory** = `frontend`
4. Framework = **Vite**

---

## 👤 Portals & Roles

| Role           | Portal URL     | Access                                             |
|----------------|----------------|----------------------------------------------------|
| `admin`        | `/admin`       | Full access: clients, projects, tasks, reports, invoices, team, activity |
| `professional` | `/professional`| Their projects & tasks, reports (read/write), settings |
| `client`       | `/client`      | Their projects, published reports, invoices (read), settings |

### Creating users

- **Admin** creates all users from **Team** page (`/admin/team`)
- Set role (`admin`, `professional`, `client`) on creation
- Link a `client` user to a client record so they see their data in the portal
- Users can reset passwords via "Forgot password" — reset links go to primary + backup email

---

## 🗃️ Database Tables

| Table            | Purpose                              |
|------------------|--------------------------------------|
| `users`          | All users (all roles)                |
| `clients`        | Client company records               |
| `projects`       | Projects linked to clients           |
| `project_members`| Many-to-many: projects ↔ users      |
| `tasks`          | Tasks linked to projects             |
| `task_comments`  | Comments on tasks                    |
| `reports`        | Performance reports (client-visible) |
| `invoices`       | Invoices with status tracking        |
| `activity_log`   | Audit trail of all actions           |
| `notifications`  | Per-user notification feed           |

---

## 🔑 Key Features

- ✅ JWT authentication with 7-day tokens
- ✅ Password reset via email + backup email
- ✅ Role-based access control on every route
- ✅ Kanban board + list view for tasks
- ✅ Task comments with real-time-like updates
- ✅ Report publishing — notifies client on publish
- ✅ Invoice tracking with mark-paid workflow
- ✅ Activity log (last 100 events)
- ✅ In-app notification bell
- ✅ Profile + password change in settings
- ✅ Responsive design (mobile-ready)

---

## 🔒 Security Notes

- Change `JWT_SECRET` to a long random string in production
- Use environment variables — never commit `.env`
- Neon DB enforces SSL by default
- All routes validate JWT before serving data
- Role enforcement on both frontend (redirect) and backend (middleware)
