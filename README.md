# Brgy Capacuhan Management System (BCMS)

A full-stack web system for **Barangay Capacuhan, Oquendo District, Calbayog City, Samar,
Philippines** — residents request official barangay documents online, and barangay staff
review, approve, and print them as official certificates.

---

## 1. Project Structure

```
bcms/
├── frontend/                  Static web app (HTML/CSS/vanilla JS, no build step)
│   ├── index.html             Page shell — loads styles.css and app.js
│   ├── css/
│   │   └── styles.css         All styling (design tokens, layout, components)
│   ├── js/
│   │   └── app.js             Entire application: routing, state, rendering, logic
│   └── assets/
│       ├── seal.png           Barangay Capacuhan official seal (used everywhere)
│       └── hero.jpg           Login page background photo
│
└── backend/                   Node.js/Express REST API + MySQL
    ├── server.js               App entry point
    ├── schema.sql               Database schema (tables, relationships)
    ├── config/db.js             MySQL connection pool
    ├── middleware/auth.js       JWT auth + role guards
    ├── routes/                  One file per resource (auth, residents, requests, ...)
    ├── scripts/migrate.js       Creates tables + seeds demo accounts
    ├── .env.example             Environment variable template
    └── README.md                Full backend setup + API reference
```

## 2. Architecture at a glance

- **Frontend**: a single-page app (SPA) with hash-based routing (`#/resident/dashboard`,
  `#/admin/requests`, etc.). No framework, no build tools — open `index.html` and it runs.
  Currently ships with an **in-memory demo dataset** (see top of `app.js`) so it's fully
  clickable out of the box with zero setup.
- **Backend**: a REST API (Express) backed by MySQL, with JWT-based authentication for two
  roles (`resident`, `admin`), password hashing (bcrypt), and file uploads (multer) for ID
  photos, valid IDs, DTI documents, etc.
- **Connecting them**: the frontend is not wired to the backend by default (see §5). Until
  you connect it, the frontend runs standalone with demo data; the backend runs standalone
  as a testable API. Wiring them together is a mechanical step of replacing `DB.*` reads in
  `app.js` with `fetch()` calls — documented in `backend/README.md` §3.

## 3. UI/UX structure

**Resident Portal**: Dashboard → Request Documents (10 certificate types, modal forms) →
My Requests (status tracking) → Announcements → My Profile (photo + bio).

**Admin/Staff Portal**: Dashboard (stats) → Document Requests (approve/reject/remarks) →
Manage Residents (accounts) → Announcements (publish/pin) → Certificate History (reprint log).

**Design system**: green/white barangay government theme, left sidebar nav, rounded document
cards, modal request forms, print-ready certificates with the official seal and header —
see `frontend/css/styles.css` for the full token set (`:root` variables at the top).

## 4. API surface (backend)

| Resource | Base route | 
|---|---|
| Auth | `POST /api/auth/login`, `GET /api/auth/me` |
| Residents | `GET/POST/PUT /api/residents`, `PATCH /api/residents/:id/status` |
| Document Requests | `POST/GET /api/requests`, `GET/PATCH /api/requests/:id` |
| Announcements | `GET/POST/PUT/DELETE /api/announcements` |
| Certificates | `GET /api/certificates/:requestId`, `POST /api/certificates/:requestId/log` |

Full request/response details are in `backend/README.md`.

## 5. Running everything locally

See the step-by-step VS Code walkthrough below. Short version:

**Frontend** — no install needed:
```bash
cd frontend
# open index.html directly, or serve it (recommended, avoids any file:// quirks):
python3 -m http.server 5500
# then visit http://localhost:5500
```

**Backend**:
```bash
cd backend
npm install
cp .env.example .env      # edit with your MySQL credentials
npm run migrate           # creates tables + seeds demo accounts
npm start                 # http://localhost:4000
```

Demo accounts (frontend, in-memory): Resident `juan.delacruz` / `resident123` · Staff
`admin` / `admin123`.

## 6. License

MIT — see `LICENSE`. Free to use, modify, and deploy for your barangay's own systems.
