# Family Tree Platform — Local Setup

Phase 1 (core tree MVP): Django + DRF + PostgreSQL backend, React + Vite frontend.

## Prerequisites

- Python 3.13 (backend virtualenv already created at `backend/venv`)
- Node.js + npm (frontend)
- PostgreSQL running locally (this machine uses Homebrew `postgresql@17`)

## 1. Database

The app expects a PostgreSQL database named `family_tree`, owned by your local OS user (peer auth, no password needed on macOS/Homebrew Postgres by default).

**Start Postgres** (if not already running):
```bash
brew services start postgresql@17
```

**Check it's running:**
```bash
brew services list | grep postgres
```

**Create the database** (one-time, if it doesn't exist yet):
```bash
createdb family_tree
```

**Connect to it directly with psql** (to inspect tables, run queries, etc.):
```bash
psql family_tree
```
Useful psql commands once connected: `\dt` (list tables), `\d members_familymember` (describe a table), `\q` (quit).

**Confirm the database exists without connecting:**
```bash
psql -l | grep family_tree
```

## 2. Backend `.env` variables

File: `backend/.env` (copy from `backend/.env.example` if missing). Loaded via `python-decouple` in `backend/config/settings.py`.

| Variable | Meaning | Local value |
|---|---|---|
| `SECRET_KEY` | Django's cryptographic signing key (sessions, JWT signing, CSRF). Must be unique and secret in production. | `change-me-in-production` (fine for local dev only) |
| `DEBUG` | Django debug mode — verbose error pages, permissive settings. Never `True` in production. | `True` |
| `ALLOWED_HOSTS` | Comma-separated hostnames Django will serve. | `localhost,127.0.0.1` |
| `DB_NAME` | PostgreSQL database name. | `family_tree` |
| `DB_USER` | PostgreSQL role/user to connect as. Empty or your OS username both work with peer auth locally. | your macOS username (e.g. `dinesh`) |
| `DB_PASSWORD` | Password for `DB_USER`. Empty because local Homebrew Postgres uses peer/trust auth, not password auth. | *(empty)* |
| `DB_HOST` | Postgres host. | `localhost` |
| `DB_PORT` | Postgres port. | `5432` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins allowed to call the API from the browser (must match the frontend's dev server URL). | `http://localhost:5173,http://127.0.0.1:5173` |
| `CLOUDINARY_CLOUD_NAME` | Optional. Leave blank to store uploaded photos (profile photos, tree cover images) on local disk under `backend/media/` — fine for local dev. Set this (and the two below) to upload to [Cloudinary](https://cloudinary.com/console) instead. | *(empty = local disk)* |
| `CLOUDINARY_API_KEY` | Cloudinary API key, from the same dashboard. Required only if `CLOUDINARY_CLOUD_NAME` is set. | *(empty)* |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret. Required only if `CLOUDINARY_CLOUD_NAME` is set. | *(empty)* |

If you ever need to connect with a *different* Postgres user/password (e.g. a teammate's setup, or a managed Postgres instance), just change `DB_USER`/`DB_PASSWORD`/`DB_HOST`/`DB_PORT` here — no code changes needed, Django reads these directly.

**Enabling Cloudinary:** sign up for a free account at cloudinary.com, copy the Cloud name / API Key / API Secret from your dashboard's "API Keys" section into `backend/.env`, then restart `manage.py runserver`. All three must be set together — if `CLOUDINARY_CLOUD_NAME` is blank, uploads fall back to local disk regardless of the other two. No code or model changes needed either way; `FamilyMember.profile_photo` and `FamilyTree.cover_image` just start resolving to Cloudinary URLs instead of `/media/...` ones.

## 3. Frontend `.env` variables

File: `frontend/.env` (copy from `frontend/.env.example` if missing).

| Variable | Meaning | Local value |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL the frontend calls for all API requests (`frontend/src/lib/api.ts`). | `http://localhost:8000/api/v1` |

## 4. Running the backend

```bash
cd backend
source venv/bin/activate
python manage.py migrate       # apply any pending migrations
python manage.py runserver     # starts on http://localhost:8000
```

Optional — create an admin user to browse data at `http://localhost:8000/admin/`:
```bash
python manage.py createsuperuser
```

Run the test suite (covers the relationship engine):
```bash
python manage.py test
```

## 5. Running the frontend

```bash
cd frontend
npm install     # first time only, or after pulling new dependencies
npm run dev     # starts on http://localhost:5173
```

Then open `http://localhost:5173` in a browser. Register a new account to get started — email verification and Google OAuth are not implemented in Phase 1, so registration logs you in immediately.

## 6. Quick health checks

- Backend up: `curl http://localhost:8000/api/v1/trees/` should return `401 Unauthorized` (expected without a token) rather than a connection error.
- Frontend up: `curl -I http://localhost:5173` should return `200 OK`.
- Database reachable: `psql family_tree -c '\dt'` should list tables like `accounts_user`, `trees_familytree`, `members_familymember`, `relationships_relationship`.

## Notes

- No Docker is used for the app itself in Phase 1 — only Postgres runs as a native service.
- Django's dev server auto-reloads on file changes; Vite's dev server does too (HMR).
- See `/Users/dinesh/.claude/plans/dreamy-sprouting-pizza.md` for the full Phase 1 design/plan if you need architectural context.
