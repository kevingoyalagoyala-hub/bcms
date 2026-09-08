# BCMS Backend — Node/Express + MySQL

Backend API for the **Brgy Capacuhan Management System (BCMS)**, Barangay Capacuhan,
Oquendo District, Calbayog City, Samar.

The included `frontend/index.html` is a self-contained demo that keeps all data in
memory (it resets on page reload). This backend gives you a real, persistent
version: MySQL storage, password hashing, JWT authentication, and file uploads for
ID photos / valid IDs / DTI documents / Solo Parent ID attachments.

---

## 1. Requirements

- Node.js 18+
- MySQL 8+ (or MariaDB 10.5+)

## 2. Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your real database credentials and a long random `JWT_SECRET`.

Create the database and seed demo accounts in one step:

```bash
npm run migrate
```

This runs `schema.sql` (creates all tables) and seeds:
- 1 admin account — `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` from `.env` (default `admin` / `admin123`)
- 4 demo resident accounts matching the frontend demo (`juan.delacruz`, `maria.reyes`,
  `pedro.santos`, `ana.gonzales`, all with password `resident123`)
- 2 sample announcements

Start the API:

```bash
npm start          # production
npm run dev         # auto-restart on file changes (nodemon)
```

The API listens on `http://localhost:4000` by default (see `PORT` in `.env`).
Uploaded files (2x2 photos, valid IDs, DTI docs, etc.) are saved under
`backend/uploads/requests/<requestId>/` and served at `/uploads/...`.

**Change the seeded admin password immediately after your first login in production.**

## 3. Wiring up the frontend

`frontend/app.js` currently reads/writes an in-memory `DB` object (see the top of
the file). To connect it to this backend:

1. Replace the login handler in `bindLogin()` with a `fetch('/api/auth/login', {method:'POST', body: JSON.stringify({username, password, role})})` call; store the returned `token` (e.g. in a JS variable held for the session) and `user`.
2. Replace `DB.requests`, `DB.residents`, `DB.announcements` reads with `fetch()` calls to the endpoints below, sending `Authorization: Bearer <token>` on every request.
3. Replace `submitRequest()`'s in-memory push with a `multipart/form-data` `POST /api/requests` (see below) so file uploads reach the server.
4. Point the certificate page at `GET /api/certificates/:requestId` instead of reading from the in-memory `DB.requests` array.

The JSON shapes returned by the API intentionally mirror the frontend's in-memory
objects (camelCase in `form_data`/JS, snake_case for SQL columns) to make this swap
mostly mechanical.

## 4. API Reference

All endpoints are prefixed with `/api`. Protected endpoints require header:
`Authorization: Bearer <token>` (returned by `/api/auth/login`).

### Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/login` | public | `{username, password, role: 'resident'\|'admin'}` → `{token, user}` |
| GET | `/auth/me` | authenticated | Returns the current account's profile |

### Residents
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/residents?q=` | admin | List/search residents |
| GET | `/residents/:id` | admin or self | Get one resident's profile |
| POST | `/residents` | admin | Create a resident account |
| PUT | `/residents/:id` | admin | Edit a resident's profile/account |
| PATCH | `/residents/:id/status` | admin | `{status: 'Active'\|'Deactivated'}` |

### Document Requests
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/requests` | resident | `multipart/form-data`: `docKey` + doc-specific fields + file fields. Creates a Pending request. |
| GET | `/requests/mine` | resident | The logged-in resident's own requests |
| GET | `/requests?status=&docKey=&q=` | admin | All requests, with optional filters |
| GET | `/requests/:id` | admin or owning resident | Full detail incl. attachments |
| PATCH | `/requests/:id` | admin | `{status, remarks}` — approve/reject/update |

The 10 valid `docKey` values: `clearance`, `residency`, `indigency`, `jobseeker`,
`lowincome`, `noincome`, `attestation`, `soloparent`, `business`, `brgyid` — matching
`DOC_TYPES` in `frontend/app.js`.

### Announcements
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/announcements` | authenticated | List, pinned first |
| POST | `/announcements` | admin | `{title, body, pinned}` |
| PUT | `/announcements/:id` | admin | Edit |
| DELETE | `/announcements/:id` | admin | Delete |

### Certificates
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/certificates/:requestId` | admin or owning resident | Data needed to render/print a certificate (request must be Approved/Ready/Released) |
| POST | `/certificates/:requestId/log` | admin | Logs a print/generation event (audit trail) |
| GET | `/certificates` | admin | Full issuance history |

## 5. Security notes

- Passwords are hashed with bcrypt (never stored in plain text).
- JWTs expire after `JWT_EXPIRES_IN` (default 8h) — adjust in `.env`.
- File uploads are capped at `MAX_UPLOAD_MB` (default 5MB) per file.
- Change `JWT_SECRET` and all seeded passwords before deploying to a real server.
- Put this API behind HTTPS in production (e.g. via a reverse proxy like nginx or Caddy).
