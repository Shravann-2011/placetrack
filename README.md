# PlaceTrack

[![CI](https://github.com/Shravann-2011/placetrack/actions/workflows/ci.yml/badge.svg)](https://github.com/Shravann-2011/placetrack/actions/workflows/ci.yml)

**Live demo:** https://placetrack-five.vercel.app · **API docs:** https://placetrack-api-i0ko.onrender.com/api/docs

> The API runs on Render's free tier. A GitHub Actions job pings it every 10 minutes to keep it awake; if it is asleep, the site shows a "Waking up the server" banner and retries automatically.

A job and internship application tracker for Indian campus placements. Track every application through the real placement rounds (**Applied → Aptitude/OA → GD → Technical → HR → Offer / Rejected**), see every OA, GD and interview on one calendar, prepare for each round, and compare your offers.

## Features

**Problems students face, and how PlaceTrack solves them**

| Problem | Feature |
|---|---|
| Typing in every drive by hand from the placement email | **Paste a message**: paste the email or WhatsApp text and PlaceTrack reads the company, role, CTC/stipend, links, eligibility and every dated round (rule-based, no AI API), shows what it found highlighted, and adds it after you check it. Spots companies you already track. |
| Deadlines are scattered across email, WhatsApp and the placement portal | **Calendar** with month, week and agenda views of every registration deadline, OA, GD, interview and offer deadline |
| One application has many dates | **Rounds per application**: type, time, online / on-campus, venue or link, notes |
| Two rounds at the same time | **Clash warnings** when an event overlaps another, plus ⚠ badges on the calendar |
| No reminders | **Reminder emails**: one email about a day before each round or deadline (with time, venue/link and prep-checklist progress), switchable in Settings. Plus **Add to Google Calendar** and **.ics export** with a 1-hour alert |
| Scattered preparation | **Prep checklist per round** with suggestions for each round type, an "x/y ready" badge, and a "what was asked" note for afterwards |
| Applications go quiet and are forgotten | **"Gone quiet" nudge**: active applications with no update in 14+ days (and no round booked), with *Followed up* / *Mark rejected* actions |
| Comparing offers is confusing | **Offers page**: total CTC, fixed and variable pay, joining bonus, bond, location, joining date and accept-by countdown side by side, best values highlighted |
| Lost in 40 applications | Search, filters, sorting, pagination, a **Kanban board** (drag and drop, or a "Move to" menu on touch screens) and a **Due Soon** view |
| Not sure what is working | **Dashboard**: stage funnel, applications per week, response rate by source |

**Also**

- **Auth:** JWT access tokens (15 min, kept in memory) and httpOnly refresh-token cookies (7 days) with rotation and revocation on logout
- **Detail panel:** stage timeline and rounds for every application
- **Design:** poster-style UI (Archivo Black headings, forest green / cream / lime / pink), animations that respect the OS reduced-motion setting, mobile bottom tab bar
- **Security:** bcrypt password hashing, Zod validation, rate limiting, http(s)-only job links, per-user data scoping, consistent JSON errors
- **Quality:** 85 API tests (95% statement coverage), Swagger docs, GitHub Actions CI, keep-alive job for the free-tier API

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 19, Vite 8, React Router 8, Tailwind CSS 4, Motion |
| Backend | Node.js 24, Express 5, Mongoose 9, Zod 4, JWT, bcryptjs, express-rate-limit |
| Database | MongoDB Atlas |
| Testing | Jest 30, Supertest, mongodb-memory-server |
| Docs / CI | OpenAPI 3 + Swagger UI, GitHub Actions (CI + keep-alive) |

## Deployment

| Part | Host | Notes |
|---|---|---|
| Frontend | Vercel (`client/`) | `vercel.json` forwards `/api/*` to Render, so the browser sees one site and the refresh cookie is first-party |
| API | Render (`server/`) | `npm ci` / `npm start`, env vars: `NODE_ENV=production`, `TRUST_PROXY=2`, `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` |
| Database | MongoDB Atlas | |

## Run it locally

Requires Node.js 24+ and a MongoDB Atlas connection string.

```bash
# 1. Backend
cd server
npm install
cp .env.example .env        # then fill in MONGODB_URI and the two JWT secrets
npm run dev                  # http://localhost:4000

# 2. Frontend (in a second terminal)
cd client
npm install
npm run dev                  # http://localhost:5173
```

Reminder emails (optional): set `BREVO_API_KEY`, `MAIL_FROM` and `CRON_SECRET` (see `server/.env.example`). Emails go through Brevo's HTTPS API because Render's free tier blocks SMTP ports. An UptimeRobot monitor on `/api/cron/reminders?key=...` every 5 minutes both sends due reminders and keeps the free server awake.

Optional demo data: `cd server && npm run seed:demo`, then log in with `demo@placetrack.test` / `demo12345`.

## Scripts (server)

| Command | What it does |
|---|---|
| `npm run dev` | Start the API with auto-restart |
| `npm start` | Start the API |
| `npm test` | Run the test suite (in-memory MongoDB, no Atlas needed) |
| `npm run test:coverage` | Tests plus coverage report |
| `npm run seed:demo` | Create or reset the demo account (applications, calendar events, offers) |

## API

Interactive docs: **http://localhost:4000/api/docs** (raw spec at `/api/docs.json`).

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/refresh` | New access token from the refresh cookie |
| POST | `/api/auth/logout` | Log out and revoke refresh tokens |
| GET | `/api/auth/me` | Current user |
| GET | `/api/applications` | List (search, filter, sort, paginate, `dueWithinDays`) |
| POST | `/api/applications` | Create |
| GET | `/api/applications/stats` | Dashboard statistics |
| GET / PATCH / DELETE | `/api/applications/:id` | Read, update, delete |
| PATCH | `/api/applications/:id/stage` | Change stage (Kanban) |
| GET | `/api/events?from=&to=` | Calendar events in a date range |
| POST | `/api/events` | Add a round or deadline (reply lists any clashes) |
| PATCH / DELETE | `/api/events/:id` | Update (checklist, debrief, done) or delete |
| POST | `/api/parse` | Read a pasted placement message (returns suggestions, saves nothing) |
| PATCH | `/api/auth/me` | Change name or turn reminder emails on/off |
| POST | `/api/auth/me/test-email` | Send yourself a sample reminder |
| GET | `/api/cron/reminders?key=` | Send due reminders (pinged by an uptime monitor, needs `CRON_SECRET`) |

## Project structure

```
placetrack/
├── client/                React frontend
│   └── src/{pages,components,context,lib}
├── server/                Express API
│   ├── src/{models,routes,controllers,middleware,validators,docs}
│   ├── tests/             Jest + Supertest
│   └── scripts/           Demo seed
├── docs/                  Report log and screenshots
└── .github/workflows/     CI
```
