# TaskFlow — Team Task Manager

A full-stack web app for managing projects, assigning tasks, and tracking progress with role-based access control (Admin/Member).

## Tech Stack

- **Frontend**: React 18, React Router v6, Axios
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Auth**: JWT (JSON Web Tokens)
- **Deployment**: Railway

---

## Features

- **Authentication** — Signup/Login with JWT tokens
- **Role-Based Access** — Admin and Member roles (global + per-project)
- **Project Management** — Create, view, update, delete projects
- **Team Management** — Add/remove members with roles per project
- **Task Management** — Create, assign, update, delete tasks with status & priority
- **Dashboard** — Overview of projects, task stats, overdue alerts, recent activity
- **Status Tracking** — Todo, In Progress, Completed, Overdue

---

## Local Setup

### Prerequisites
- Node.js v18+
- PostgreSQL database

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# REACT_APP_API_URL=http://localhost:5000/api
npm start
```

---

## API Endpoints

### Auth
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/signup` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login |
| GET | `/api/auth/me` | Private | Get current user |

### Projects
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/projects` | Private | List user's projects |
| POST | `/api/projects` | Admin | Create project |
| GET | `/api/projects/:id` | Member | Get project details |
| PUT | `/api/projects/:id` | Project Admin | Update project |
| DELETE | `/api/projects/:id` | Project Admin | Delete project |
| POST | `/api/projects/:id/members` | Project Admin | Add member |
| DELETE | `/api/projects/:id/members/:userId` | Project Admin | Remove member |

### Tasks
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/tasks?project_id=X` | Member | List tasks |
| POST | `/api/tasks` | Project Admin | Create task |
| GET | `/api/tasks/:id` | Member | Get task |
| PUT | `/api/tasks/:id` | Member/Admin | Update task |
| DELETE | `/api/tasks/:id` | Project Admin | Delete task |

### Dashboard
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/dashboard` | Private | Get stats & summary |

---

## Database Schema

```sql
users (id, name, email, password, role, created_at)
projects (id, name, description, owner_id, created_at)
project_members (id, project_id, user_id, role, joined_at)
tasks (id, title, description, status, priority, project_id, assigned_to, created_by, due_date, created_at, updated_at)
```

---

## Deployment on Railway

### 1. Deploy Backend

1. Push backend folder to a GitHub repo
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add a **PostgreSQL** database service in Railway
4. Set environment variables:
   ```
   DATABASE_URL=<auto-filled by Railway when PostgreSQL is linked>
   JWT_SECRET=your_strong_random_secret
   NODE_ENV=production
   PORT=5000
   ```
5. Deploy — Railway auto-detects Node.js

### 2. Deploy Frontend

1. Push frontend folder to GitHub (can be same repo)
2. New Railway service → Deploy frontend folder
3. Set environment variable:
   ```
   REACT_APP_API_URL=https://your-backend-url.railway.app/api
   ```
4. Set build command: `npm run build`
5. Set start command: `npx serve -s build`

### 3. Update CORS

In `backend/server.js`, update the CORS origin:
```js
origin: process.env.FRONTEND_URL || '*'
```
Set `FRONTEND_URL` env var in Railway to your frontend URL.

---

## Role Permissions

| Action | Global Admin | Project Admin | Project Member |
|--------|-------------|---------------|----------------|
| Create project | ✅ | — | — |
| Delete any project | ✅ | ✅ (own) | — |
| Add project members | — | ✅ | — |
| Create tasks | — | ✅ | — |
| Edit any task | — | ✅ | — |
| Edit own assigned task | — | ✅ | ✅ |
| Delete tasks | — | ✅ | — |
| View project | ✅ | ✅ | ✅ |
