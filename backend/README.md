# BCMS Backend — Node/Express + MySQL

Backend API for the **Brgy Capacuhan Management System (BCMS)**, Barangay Capacuhan,
Oquendo District, Calbayog City, Samar.

The frontend (`frontend/`) is already wired to this API — it calls these endpoints
directly via `fetch()` (see `API_BASE` at the top of `frontend/js/app.js`). This
backend gives you real, persistent storage: MySQL, password hashing, JWT
authentication, and file uploads for ID photos / valid IDs / DTI documents /
Solo Parent ID attachments — or use `mock-server.js` below to run everything with
zero database setup.

---

## 1. Requirements

- Node.js 18+
- MySQL 8+ (or MariaDB 10.5+)

## 2. Setup

### Option A — Quick start, no database install (great for trying it out today)

```bash
cd backend
npm install
node mock-server.js
```

That's it — a fully working API on `http://localhost:4000` backed by in-memory data
(no MySQL needed). The frontend already points here by default, so open
`frontend/index.html` and everything works end-to-end: register, log in, submit
requests, approve them as admin, print certificates. **Data resets every time you
restart this server** — use it for demos and development, not for real records.

### Option B — Real MySQL backend (persistent data, for actual deployment)

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

## 3. How the frontend connects to this API

`frontend/js/app.js` calls this backend directly:

- **`API_BASE`** (top of the file) points at `http://localhost:4000/api` by default.
  Change it if your backend runs elsewhere — or set `window.BCMS_API_BASE` in
  `index.html` before `app.js` loads (handy for pointing a deployed frontend at a
  deployed backend without editing the JS file).
- **`api()`** is a small `fetch()` wrapper used everywhere: it attaches the JWT
  (`Authorization: Bearer <token>`) once you're logged in, and throws a readable
  error (shown as a toast) if the request fails or the server is unreachable.
- **`mapResident()` / `mapAdmin()` / `mapRequest()` / `mapAnnouncement()`** convert
  the API's snake_case MySQL columns into the camelCase shape the UI uses.
- **`DB`** (residents/requests/announcements arrays) is a client-side cache
  hydrated from the API right after login (`loadInitialData()`), and refreshed
  after every create/update/delete (`refreshResidents()`, `refreshAllRequests()`,
  etc.) — so the UI always reflects what's actually on the server.
- File uploads (request attachments, profile photos) are sent as real
  `multipart/form-data`, not base64 — see `submitRequest()` and the photo handler
  in `bindProfile()` for the pattern if you add more file fields later.

## 4. API Reference

All endpoints are prefixed with `/api`. Protected endpoints require header:
`Authorization: Bearer <token>` (returned by `/api/auth/login`).

### Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/auth/login` | public | `{username, password, role: 'resident'\|'admin'}` → `{token, user}` |
| POST | `/auth/register` | public | Resident self-registration. `{firstName, lastName, middleName?, suffix?, birthdate, sex, civilStatus, purok, contactNumber, email?, username, password}` → `{token, user}` (auto-logs-in) |
| GET | `/auth/me` | authenticated | Returns the current account's profile |

### Residents
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/residents?q=` | admin | List/search residents |
| GET | `/residents/:id` | admin or self | Get one resident's profile |
| POST | `/residents` | admin | Create a resident account |
| PUT | `/residents/:id` | admin | Edit a resident's profile/account |
| PATCH | `/residents/:id/status` | admin | `{status: 'Active'\|'Deactivated'}` |
| PATCH | `/residents/me` | resident (self) | Update your own photo and/or bio only. `multipart/form-data`: `photo` (file, optional), `bio` (text, optional). Official fields (name, address, etc.) are intentionally not editable here. |

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
