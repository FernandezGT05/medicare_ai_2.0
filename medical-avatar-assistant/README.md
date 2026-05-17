# MediCare AI — Medical Avatar Assistant

A full-stack web app for **video consultations with AI medical avatars** (Beyond Presence), plus a patient dashboard for visit history, follow-ups, reminders, and health logging. Users sign in with Google, complete onboarding, talk to a specialty-matched avatar, and receive AI-generated visit summaries.

> **Not medical advice.** This project is for wellness guidance and demonstration purposes. It does not replace licensed clinicians or emergency care. If you are in crisis, call your local emergency number.

## Features

- **Lifelike avatar consultations** — LiveKit + Beyond Presence agents (Nelly, Yuruo, Alan, Jerome) with specialty routing (fitness, injuries, mental health, symptom guidance).
- **Visit summaries** — OpenAI generates structured summaries after each consultation; download as `.txt` from the consultation sidebar.
- **Patient dashboard** — Overview, consultation history, follow-ups, profile, reminders, and health log (`/dashboard?tab=…`).
- **Location-aware resources** — Profile/onboarding location (text or GPS); nearby pharmacies, clinics, and related places via **OpenStreetMap Nominatim** (no Google Maps billing).
- **Google Sign-In** — JWT sessions; protected API routes.
- **PostgreSQL persistence** — Users, visits, summaries, reminders, and health log; migrations run automatically on server start.

## Tech stack

| Layer | Stack |
|--------|--------|
| Frontend | React 19, Vite 6, React Router, CSS modules |
| Backend | Express 5, Node.js 22+, PostgreSQL (`pg`) |
| Auth | Google OAuth, `jose` JWT |
| Avatar / video | Beyond Presence API, LiveKit client |
| Summaries | OpenAI API |
| Places | Nominatim (server-side geocoding & search) |

## Prerequisites

- **Node.js 22+**
- **npm**
- **PostgreSQL** — [Neon](https://neon.tech), [Vercel Postgres](https://vercel.com/storage/postgres), Supabase, or local Postgres
- Accounts / keys:
  - [Google Cloud](https://console.cloud.google.com/) — OAuth 2.0 Web client
  - [Beyond Presence](https://bey.dev) — API key and agent IDs
  - [OpenAI](https://platform.openai.com/) — API key (visit summaries)

## Quick start

```bash
git clone <your-repo-url>
cd medical-avatar-assistant
npm install
cp .env.example .env
# Edit .env with your keys (see below)
npm run dev
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` to the Express API on port **3001**.

### Production build (local)

```bash
npm run build
npm run start:server   # API only — serves from dist via your own static host + proxy
```

For local full-stack preview of the static client:

```bash
npm run build
npm run preview        # Vite preview (port 4173) — still needs API on :3001 or proxy config
```

## Environment variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GOOGLE_CLIENT_ID` | Yes | Google OAuth client ID (browser) |
| `GOOGLE_CLIENT_ID` | Yes | Same client ID (server token verification) |
| `JWT_SECRET` | Yes | Long random string for session signing |
| `BEY_API_KEY` | Yes | Beyond Presence API key (server only) |
| `OPENAI_API_KEY` | Yes | Visit summary generation |
| `OPENAI_MODEL` | No | Default: `gpt-4o-mini` |
| `DATABASE_URL` | Yes | Postgres connection string |
| `CLIENT_ORIGIN` | Yes | Frontend URL for CORS (e.g. `http://localhost:5173`) |
| `PORT` | No | API port; default `3001` |
| `BEY_AGENT_ID_*` | No | Override built-in catalog agent UUIDs |
| `VITE_API_BASE_URL` | No | Set only if API is on a **different** host than the frontend |
| `FRONTEND_URL` | No | Extra allowed CORS origin (e.g. production Vercel URL) |

Location / nearby search uses Nominatim and needs **no** Google Maps API keys.

## Google OAuth setup

1. Create an **OAuth 2.0 Client ID** (Web application) in [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Add **Authorized JavaScript origins**:
   - `http://localhost:5173` (development)
   - `https://your-app.vercel.app` (production)
3. Put the client ID in both `VITE_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID`.

## Project structure

```
medical-avatar-assistant/
├── api/                 # Vercel serverless entry (exports Express app)
├── src/                 # React frontend
│   ├── pages/           # Home, sign-in, onboarding, consultation, dashboard
│   ├── components/      # Avatar panel, sidebar, dashboard tabs, location UI
│   └── api/client.ts    # Typed API client
├── server/              # Express API
│   ├── routes/          # auth, consultations, dashboard, places, reminders, …
│   ├── db/              # PostgreSQL + SQL migrations
│   ├── bey/             # Beyond Presence client
│   └── services/        # summaries, places (Nominatim), finalize flow
├── vercel.json          # Vercel build + SPA + /api rewrites
└── .env.example
```

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Vite + API with hot reload |
| `npm run dev:client` | Frontend only |
| `npm run dev:server` | API only |
| `npm run build` | Typecheck + Vite production build → `dist/` |
| `npm run start:server` | Run API (`tsx server/index.ts`) |
| `npm run db:migrate` | Run migrations manually |

## Deploy on Vercel

This repo is configured for a **monolith** deploy: static frontend + Express API as a serverless function.

1. Push to GitHub and [import the project on Vercel](https://vercel.com/new).
2. Use the repo root (where `vercel.json` lives). Build command and output directory are already set.
3. Create a **Postgres** database ([Vercel Postgres](https://vercel.com/storage/postgres) or [Neon](https://neon.tech)) and add `DATABASE_URL` to environment variables.
4. Add the rest in **Project → Settings → Environment Variables** (same as `.env`, with production URLs):
   - `CLIENT_ORIGIN` = `https://your-app.vercel.app`
   - `FRONTEND_URL` = same (optional, for CORS)
   - All required keys from the table above
   - Leave `VITE_API_BASE_URL` **empty** so the browser calls `/api` on the same domain.
5. Update Google OAuth origins to your Vercel URL.
6. Deploy (migrations run automatically on first API request).

CLI alternative:

```bash
npx vercel
npx vercel --prod
```

### Split deploy (frontend on Vercel, API elsewhere)

1. Deploy the Express server on a host with persistent disk.
2. Set `VITE_API_BASE_URL` on Vercel to your API origin (e.g. `https://your-api.onrender.com`).
3. Set `CLIENT_ORIGIN` on the API to your Vercel frontend URL.

## API overview

All routes are under `/api`:

| Prefix | Purpose |
|--------|---------|
| `/api/auth` | Google token exchange, session |
| `/api/consultations` | Start/end visits, Beyond Presence calls |
| `/api/dashboard` | Dashboard aggregates |
| `/api/profile` | User profile & location |
| `/api/onboarding` | First-time setup |
| `/api/places` | Geocode & nearby suggestions |
| `/api/reminders` | Reminder CRUD |
| `/api/health-log` | Health log CRUD |
| `/api/history` | Consultation history detail |

## Disclaimer

MediCare AI provides **general wellness information only**. It is not a medical device, does not diagnose or treat conditions, and is not for emergencies. Always consult qualified healthcare professionals for medical decisions.

## License

Private project — all rights reserved unless otherwise specified by the repository owner.
