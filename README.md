# PlaceTrack

[![CI](https://github.com/Shravann-2011/placetrack/actions/workflows/ci.yml/badge.svg)](https://github.com/Shravann-2011/placetrack/actions/workflows/ci.yml)

A job and internship application tracker for Indian campus placements. Track every application through the real placement rounds (**Applied → Aptitude/OA → GD → Technical → HR → Offer / Rejected**), never miss a deadline, and see what's working.

## Features

- **Auth:** register / login with JWT access tokens (15 min, kept in memory) and httpOnly refresh-token cookies (7 days) with rotation and revocation on logout
- **Applications:** create, edit, delete; scoped per user; search, filter by stage / source / type, sort, pagination
- **Kanban board:** drag cards between stages (with a "Move to" menu for touch and keyboard)
- **Dashboard:** stage funnel, applications per week, response rate by source, upcoming deadlines
- **Due Soon:** deadlines in the next 7 / 14 / 30 days, grouped by urgency
- **Detail panel:** full stage timeline for every application
- **Security:** bcrypt password hashing, Zod validation, rate limiting, http(s)-only job links, consistent JSON errors
- **Quality:** 38 API tests (94% coverage), Swagger docs, GitHub Actions CI

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 19, Vite 8, React Router 8, Tailwind CSS 4 |
| Backend | Node.js 24, Express 5, Mongoose 9, Zod 4, JWT, bcryptjs, express-rate-limit |
| Database | MongoDB Atlas |
| Testing | Jest 30, Supertest, mongodb-memory-server |
| Docs / CI | OpenAPI 3 + Swagger UI, GitHub Actions |

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

Optional demo data: `cd server && npm run seed:demo`, then log in with `demo@placetrack.test` / `demo12345`.

## Scripts (server)

| Command | What it does |
|---|---|
| `npm run dev` | Start the API with auto-restart |
| `npm start` | Start the API |
| `npm test` | Run the test suite (in-memory MongoDB, no Atlas needed) |
| `npm run test:coverage` | Tests plus coverage report |
| `npm run seed:demo` | Create or reset the demo account |

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
