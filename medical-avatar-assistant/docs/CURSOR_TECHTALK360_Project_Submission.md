# CURSOR × TECHTALK360 — Project Submission Document

**Team:** Zenos  
**Project:** MediCare AI  
**Track:** Beyond Presence  
**Demo URL:** https://medicareai20.vercel.app/  
**Repository:** https://github.com/FernandezGT05/medicare_ai_2.0.git  

---

## 01 — Project Overview

### Project Name & One-Line Pitch

**MediCare AI** — A patient-facing virtual care companion that delivers live video consultations with AI medical avatars (Beyond Presence), automatically records each visit to a longitudinal dashboard, and continues the same session via text when voice is unavailable.

### Summary

Many people need timely wellness guidance but face long waits, limited access to clinicians, and fragmented records across one-off telehealth chats. MediCare AI addresses this by pairing specialty-matched Beyond Presence avatars with a full patient dashboard: users sign in with Google, complete onboarding, consult via live video, and receive structured visit summaries without manual note-taking.

The product is built for individuals managing ongoing health questions—fitness, injuries, mental wellbeing, and general symptom guidance—not as a replacement for emergency or licensed clinical care. Each consultation compounds in value: prior visit summaries and profile context are injected into the agent before the call, webhook events finalize sessions automatically, and history surfaces summaries, follow-ups, reminders, and location-aware resources.

Beyond Presence is meaningfully integrated across three production touchpoints: just-in-time agent context (patient profile + prior visit), LiveKit-powered live consultation as the core interaction, and `call_ended` webhooks that write session records to PostgreSQL and the dashboard without user action.

### Submission Details

| Field | Value |
|--------|--------|
| **Track** | Beyond Presence |
| **Track integration** | Confirmed — API used for agent configuration, LiveKit call creation, call/message retrieval, and webhook-driven finalization |
| **Team name** | Zenos |
| **Demo URL** | https://medicareai20.vercel.app/ |
| **Repository** | https://github.com/FernandezGT05/medicare_ai_2.0.git |

---

## 02 — Problem Statement

### The Problem

Patients and health-conscious individuals often need quick, conversational guidance for non-emergency wellness topics—nutrition, recovery from minor injuries, stress, or whether symptoms warrant a GP visit. They experience this problem at home, after work, or between appointments, when a human clinician is not immediately available.

If left unsolved, people either delay care (worsening anxiety or adherence), rely on unreliable web search, or use generic chatbots that lack continuity, visual presence, and a trustworthy record of what was discussed.

### Why It Matters

- **Frequency:** Wellness questions are recurring; the same user may return weekly or monthly for follow-up topics.
- **Severity:** While not always acute, poor guidance or lost context can lead to missed follow-ups, repeated explanations, or inappropriate self-treatment.
- **Current workarounds:** Static FAQ sites, generic LLM chats, or scheduled telehealth. These fall short because they lack embodied presence (video avatar), session persistence, and automatic visit documentation tied to the same identity.

### Root Cause

The underlying cause is **disconnected care episodes**: each interaction starts from zero, with no shared visual consultation layer and no system that links prior advice, patient context, and post-visit records. Symptom-level fixes (a one-off chatbot) do not solve the longitudinal failure mode.

---

## 03 — Proposed Solution

### What the Product Does

MediCare AI is a full-stack web application. After Google sign-in and onboarding, the user selects a consultation specialty (e.g. fitness & nutrition, mental health) and an avatar agent (Nelly, Yuruo, Alan, or Jerome). The server configures the chosen Beyond Presence agent with a specialty system prompt plus optional patient profile and prior-visit context, then the client starts a LiveKit room via the Beyond Presence Calls API.

During the visit, the user sees the avatar on video and can speak (microphone) or type in the same LiveKit session. When the call ends, Beyond Presence sends a webhook; the backend fetches the transcript, generates a structured summary with OpenAI, stores it in PostgreSQL, and exposes it on the patient dashboard (history, follow-ups, reminders, health log, nearby places).

**Core mechanism:** Beyond Presence agents + LiveKit real-time media/text + server-orchestrated context injection and webhook finalization.

### Key Features

| Feature | User need addressed |
|---------|---------------------|
| **Live avatar video consultation** | Human-like, trustworthy interaction for wellness conversations |
| **Specialty + agent selection** | Match tone and topic (fitness, injuries, mental health, symptom guidance) |
| **Just-in-time prior context** | Continuity—“remember what we discussed last time” without re-explaining |
| **In-session text chat (same session)** | Continue when microphone is unavailable or user prefers typing |
| **Automatic visit summaries** | No manual note-taking; structured summary, topics, advice, follow-up |
| **Patient dashboard** | Longitudinal record, search, follow-ups, reminders, health log |
| **Location-aware resources** | Find nearby pharmacies/clinics via geocoded profile (Nominatim) |
| **Google Sign-In + JWT sessions** | Secure, familiar authentication |

### Scope

**In scope (this build):**

- Google OAuth, onboarding, profile, PostgreSQL persistence
- Four Beyond Presence catalog agents × four specialty prompts
- LiveKit consultation UI with mic mute and text chat
- Webhook + manual finalize paths for visit summaries
- Dashboard tabs: overview, history, follow-ups, profile, reminders, health

**Deliberately out of scope (time constraints):**

- Licensed clinician handoff, EHR integration, HIPAA certification
- Real-time human escalation or prescription workflows
- Native mobile apps
- Multi-tenant clinic/admin portals

---

## 04 — Functional Requirements

### Must Have (demonstrable in live demo)

| ID | Requirement |
|----|-------------|
| M1 | User can sign in with Google and receive a session JWT |
| M2 | User can complete onboarding (profile, location, health basics) |
| M3 | User can select specialty and avatar and start a Beyond Presence-backed consultation |
| M4 | User sees live avatar video and hears agent audio via LiveKit |
| M5 | User can send text messages in the same session when voice is unavailable |
| M6 | Server injects patient profile and optional prior visit into agent system prompt before call |
| M7 | On call end, system stores consultation summary (webhook or finalize retry) |
| M8 | User can view visit history and download summary from dashboard |
| M9 | API keys for Beyond Presence and OpenAI are server-only |

### Should Have

| ID | Requirement |
|----|-------------|
| S1 | User can link a prior visit when starting a new consultation |
| S2 | Dashboard shows follow-ups derived from summaries |
| S3 | Reminders and health log CRUD on dashboard |
| S4 | Nearby places suggestions after visit finalization (when location set) |
| S5 | Health check endpoint reports DB and Beyond Presence configuration status |

### Could Have / Won't Have (This Build)

| ID | Requirement | Status |
|----|-------------|--------|
| C1 | Webhook signature verification | Considered — not fully implemented |
| C2 | Role-based clinician vs patient | Won't have |
| C3 | Offline mode | Won't have |
| C4 | Multi-language avatars beyond agent config | Could have — limited to agent language setting |
| C5 | In-app emergency triage routing | Won't have — disclaimers only |

---

## 05 — Non-Functional Requirements

### Performance

- **Session bootstrap:** Agent context update + `/api/session` typically completes in a few seconds (depends on Beyond Presence API).
- **LiveKit connect:** Call creation and room join target sub-10s on stable networks.
- **Summary generation:** OpenAI `gpt-4o-mini` JSON summary after call end; webhook path may add ~5–15s before dashboard refresh.
- **Concurrent usage:** Vercel serverless + Neon/Postgres; suitable for demo and moderate traffic; no dedicated load testing in this build.

### Reliability & Error Handling

- API failures return JSON errors to the client; consultation UI shows connection/finalize errors.
- Finalize flow retries matching Beyond Presence calls (6 attempts, 2s delay) if webhook is delayed.
- Empty transcripts produce a placeholder summary rather than crashing.
- Webhook handler returns 200 even on processing errors to avoid infinite retries (logged server-side).

### Usability

- React SPA with CSS modules; DM Sans / Lora / Plus Jakarta Sans typography.
- Clear consultation status (connecting, live, ready).
- Dashboard tab navigation with search on history.
- Disclaimers: wellness guidance only, not emergency care.
- Accessibility: semantic sections, `aria-live` on chat log, labeled controls for mic and consultation.

### Scalability

- **Current:** Monolith on Vercel (static `dist/` + Express serverless `api/index.ts`), PostgreSQL via connection pool.
- **To scale:** Move long-running finalize/summarize to a queue worker; add webhook auth; CDN for assets; read replicas for history; rate limiting on public endpoints.

---

## 06 — Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (React 19 + Vite)                   │
│  Home │ Sign-in │ Onboarding │ Consultation │ Dashboard           │
│       LiveKit client ←── video/audio/text ──→ Beyond Presence    │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS /api/*
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Express 5 API (Vercel serverless / Node 22)         │
│  auth │ session │ calls │ consultations │ webhooks │ dashboard   │
└─────┬───────────┬────────────────┬──────────────┬───────────────┘
      │           │                │              │
      ▼           ▼                ▼              ▼
 PostgreSQL   Beyond Presence   OpenAI API    Nominatim (OSM)
              api.bey.dev        summaries     geocoding/places
              LiveKit tokens
```

### Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React 19, Vite 6, React Router 7, CSS modules | Fast dev, typed components, SPA routing |
| Backend | Express 5, TypeScript, `tsx` | Mature HTTP API, shared types with client |
| Database | PostgreSQL (`pg`), SQL migrations | Relational model for users, visits, summaries |
| Auth | Google OAuth (`@react-oauth/google`), `jose` JWT | Familiar sign-in, stateless API sessions |
| **Track: Beyond Presence** | REST `api.bey.dev`, embed `bey.chat`, Calls + Agents API | Avatar agents, LiveKit session creation, webhooks |
| Real-time | `livekit-client` | In-app video, transcription streams, text chat topic `lk.chat` |
| AI summaries | OpenAI (`gpt-4o-mini` default) | Structured JSON visit summaries from transcripts |
| Places | OpenStreetMap Nominatim (server-side) | No Google Maps billing; geocode + nearby search |
| Hosting | Vercel (frontend + `/api` rewrite) | Demo URL, serverless deploy, Postgres integration |

### Data Flow — Core consultation journey

1. **Sign-in:** Client sends Google ID token → `/api/auth` verifies → JWT issued → stored client-side.
2. **Start session:** `GET /api/session?specialty=&agentId=&priorConsultationId=` (auth required).
3. **Context build:** Server loads user profile (`buildPatientContextBlock`) and optional prior summary (`buildPriorContextBlock`).
4. **Beyond Presence:** `updateAgent` sets `system_prompt` + `greeting`; returns agent metadata and embed URL.
5. **Consultation record:** `POST /api/consultations` creates DB row linked to `bey_agent_id`.
6. **Live call:** Client `POST /api/calls` with `agentId` → Beyond Presence returns `livekit_url`, `livekit_token` → LiveKit `Room.connect`.
7. **During call:** Mic audio + agent video; user text via `sendText` on `lk.chat`; transcriptions on `lk.transcription`.
8. **Call end:** Beyond Presence `POST /api/webhooks/bey` (`call_ended`) → match consultation → fetch messages → OpenAI summarize → `insertSummary` → optional place suggestions.
9. **Dashboard:** `GET /api/dashboard` aggregates history, follow-ups, reminders for the user.

### AI Integration

| Provider | Role |
|----------|------|
| **Beyond Presence** | Conversational avatar (speech, video, agent reasoning per platform) |
| **OpenAI** | Post-visit summarization only — JSON schema: summary, topics, advice_given, follow_up |

Prompting: Specialty prompts (`specialtyPrompts.ts`) define agent behavior; patient and prior-visit blocks are appended server-side before each session. Summarization system prompt enforces transcript-only facts, no diagnosis/prescription language.

### Known Technical Limitations

- Webhook endpoint does not verify Bey webhook signatures in this build.
- Finalize can race if user ends call before Beyond Presence registers the call (mitigated by retries).
- Agent system prompt is overwritten per session (last write wins for shared agent IDs).
- Vercel serverless cold starts may add latency on first API request.
- Not a regulated medical device; summaries are informational.

---

## 07 — Security

### Authentication & Authorisation

- **Google Sign-In** on the client; server verifies ID token with `google-auth-library`.
- **JWT sessions** signed with `JWT_SECRET`; `Authorization: Bearer` on protected routes via `requireAuth` middleware.
- **User scoping:** Consultations and dashboard data filtered by `user_id`; no role-based roles in v1.

### Data Handling

- User profile, consultations, summaries, reminders, and health log stored in PostgreSQL.
- Sensitive fields are self-reported wellness data, not clinical diagnoses.
- Passwords N/A (OAuth only). JWTs stored in browser storage (`authStorage`).

### API & Secret Management

- `BEY_API_KEY`, `OPENAI_API_KEY`, `JWT_SECRET`, `DATABASE_URL`, `GOOGLE_CLIENT_ID` — **server environment only** (`.env`, Vercel env vars).
- Client receives only `VITE_GOOGLE_CLIENT_ID` (public OAuth client ID).
- `.env.example` documents required variables without secrets.

### Input Validation

- Zod schema for OpenAI summary output.
- Specialty and catalog agent IDs validated against allowlists.
- Express JSON body parsing; consultation IDs validated against owning user.

### Known Vulnerabilities or Gaps

- Webhook `/api/webhooks/bey` is unauthenticated (relies on obscurity + call/agent matching) — should add signature verification for production.
- No rate limiting on auth or webhook endpoints in this build.
- CORS restricted via `CLIENT_ORIGIN` / `FRONTEND_URL` but depends on correct production configuration.

---

## 08 — User Stories & Use Cases

### Core User Stories

1. As a **new patient**, I want to sign in with Google, so that I can access my personal dashboard securely.
2. As a **user**, I want to complete onboarding with location and health basics, so that my avatar has relevant context.
3. As a **user**, I want to choose a specialty and avatar, so that the consultation matches my topic and preference.
4. As a **returning patient**, I want to preload a prior visit into the next session, so that the avatar asks what has changed since last time.
5. As a **user**, I want a live video consultation with an AI avatar, so that I get a more natural interaction than text-only chat.
6. As a **user with microphone issues**, I want to type in the same session, so that the consultation can continue without voice.
7. As a **user**, I want my visit automatically summarized after the call, so that I do not have to take notes.
8. As a **user**, I want to browse consultation history and follow-ups, so that I can track guidance over time.
9. As a **user**, I want reminders and a health log, so that I can manage ongoing wellness tasks.
10. As a **user**, I want nearby pharmacy/clinic suggestions, so that I can act on location-relevant advice.

### Primary Use Case Walkthrough

1. User opens https://medicareai20.vercel.app/ and signs in with Google.
2. If first visit, completes onboarding (DOB, allergies, location).
3. Navigates to Consultation, selects **Mental health** and avatar **Nelly**, optionally selects a prior visit.
4. System calls `/api/session` → updates Beyond Presence agent with specialty + profile + prior context.
5. User clicks **Start consultation** → DB consultation created → LiveKit room connects → avatar appears.
6. User speaks or types symptoms/stressors; avatar responds via voice and video.
7. User ends call; Beyond Presence fires `call_ended` webhook.
8. Server summarizes transcript, saves to DB; user opens Dashboard → History sees new visit with summary and follow-up actions.
9. User downloads `.txt` summary or sets a reminder from dashboard.

### Edge Cases

- **Prior visit without summary:** Session API returns 400; user must pick another visit.
- **Webhook delayed:** History UI suggests waiting ~10s; manual finalize retries call matching.
- **Mic disabled:** User uses text chat; transcript still captured for summary.
- **No transcript content:** Summary states no conversation captured.
- **Unauthenticated API:** 401 with message to sign in again.

---

## 09 — Target Users & Market

### Primary User

Health-conscious individuals and patients seeking **non-emergency wellness guidance**—fitness, minor injury recovery, emotional support, or symptom education—who value visual presence and a personal health timeline. Pain addressed: fragmented advice, no record of AI conversations, and poor experience when voice hardware fails.

### Market Opportunity

Digital health and virtual assistant markets are large; initial segment is **direct-to-consumer wellness** and telehealth-adjacent guidance (not replacing licensed care). First target: English-speaking users comfortable with Google sign-in and video chat.

### Competitive Landscape

| Alternative | Weakness |
|-------------|----------|
| **Generic ChatGPT / text bots** | No video avatar, no automatic visit record or longitudinal dashboard |
| **Traditional telehealth apps** | Human scheduling cost; not instant; often no AI avatar continuity |
| **Beyond Presence embed-only demos** | Single-session embed without patient history, webhooks, or mic-fallback architecture |

---

## 10 — Business Model

**Near-term (buildathon / MVP):** Free demo for user acquisition and track validation.

**Potential monetization paths:**

- **Freemium:** Limited consultations/month; premium for unlimited visits and export.
- **B2B2C:** White-label for clinics or employers as a triage/wellness front door (with compliance investment).
- **Subscription:** Dashboard, reminders, and priority agent access.

Revenue would require clear medical disclaimers, terms of service, and regional compliance review before clinical claims.

---

## 11 — Why This Project Leads the Track

Zenos is positioned to lead the **Beyond Presence** track because integration goes beyond a single embed demo:

1. **Three integrated touchpoints** — Only submission using the API across: (a) just-in-time context to pre-load patient history before each call, (b) live video consultation as the core interaction via Calls API + LiveKit, and (c) webhook events that automatically write session records to the dashboard when a call ends.

2. **Clinical failure mode solved** — When a patient's microphone is unavailable, the consultation continues via **text chat in the same Beyond Presence / LiveKit session**, preserving avatar video and session continuity (deliberate session architecture).

3. **Compounding longitudinal value** — Patient history dashboard stores consultations with AI-generated summaries; each Beyond Presence call makes the next call more useful via `priorConsultationId` context injection.

4. **Production deployment** — Stable demo at https://medicareai20.vercel.app/ with full-stack Vercel + PostgreSQL deployment.

---

## 12 — Team & Roles

| Member | Role | Responsibilities |
|--------|------|------------------|
| **Gayan Fernandez** (Team Lead) | Full stack | Architecture, Beyond Presence API integration, webhooks, OpenAI summaries, PostgreSQL, Vercel deployment, backend routes |
| **Indrachapa Jayasinghe** | Frontend | React UI, consultation experience, patient dashboard, styling, client API integration, UX polish |

---

## Appendix — Key API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/auth/google` | Exchange Google token for JWT |
| `GET /api/session` | Configure agent + return session metadata |
| `POST /api/calls` | Create Beyond Presence LiveKit call |
| `POST /api/consultations` | Persist visit row |
| `POST /api/webhooks/bey` | Handle `call_ended` from Beyond Presence |
| `GET /api/dashboard` | Dashboard aggregates |

---

*Document generated for Cursor × TechTalk360 Buildathon submission — Team Zenos — MediCare AI.*
