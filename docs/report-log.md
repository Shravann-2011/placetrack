# PlaceTrack: AI-Augmented Development Report Log

> Facts only. The "What I noticed / my modifications" columns are for **you** to write in your own words.

| # | Date | Prompt (summary) | AI response (summary) | Issues found | My modifications / what I noticed |
|---|---|---|---|---|---|
| 0 | 2026-11-11 | Set up the mentor workflow; Step 0, environment check | Gave macOS commands to check Node, npm, Git, VS Code; Atlas + Postman setup steps | AI was unsure of the current Node LTS. AI predicted npm 10/11; the real version was **12.0.2** (outdated AI knowledge). Student pasted the "expected output" block into zsh, causing harmless errors. | |
| 0b | 2026-11-11 | Git identity | Gave `git config --global user.name "Your Name"` | Placeholder `"Your Name"` was run literally | Changed to my GitHub username; used the GitHub **noreply** email for privacy |
| 0c | 2026-11-11 | Atlas cluster setup | Recommended Free tier, Mumbai region, manual security setup | Current IP wasn't added, so "You can't connect yet". The first DB user gets `atlasAdmin` (more permission than needed). | Chose Mumbai (latency), Free (cost) |
| 1 | 2026-11-11 | First Express server | `/api/health` route on port 4000 | Checked Express on npm: v5.3.0 (most tutorials show v4). AI avoided port 5000 (macOS AirPlay conflict). | |
| 2 | 2026-11-11 | "No time for questions, help me make it" | AI wrote the folder structure, DB connection, error handler, `.env`, `.gitignore`, git init | Mongoose v9.12.1 (newer than most tutorials). AI used Node's built-in `--env-file`/`--watch` instead of the `dotenv`/`nodemon` packages. | |
| 3 | 2026-11-11 | Connect to MongoDB | AI diagnosed failures without displaying the password | 1) `bad auth`: `<db_password>` placeholder not replaced. 2) `Invalid connection string`: brackets left in. 3) The password contained `@`, which split the URL in the wrong place. Fix: percent-encode (`@` → `%40`) or regenerate. | Regenerated the password in Atlas |
| 4 | 2026-11-11 | "Commit + start auth" | Checked 5 packages on npm; built register/login/refresh/logout/me with JWT access token (15m) + httpOnly refresh cookie (7d), bcrypt, Zod, rate limiting; 11 curl tests; 2 commits | Zod v4 API differs from tutorials (`z.email()`). A malformed-JSON error leaked parser internals; AI found and fixed this during testing. `trust proxy` is needed for rate limiting behind Render. | |
| 5 | 2026-11-11 | Manual Postman testing of auth | Gave an 11-step test table | Student typed shorthand `POST...` into the URL → `ENOTFOUND`. **Postman's built-in AI** wrongly said `/refresh` should be GET and added a test expecting `400` → "Test Results 0/1". It guessed from the template name "Get data". Two AI tools disagreed; the student checked against the real API. | Removed the Postman AI test script |
| 6 | 2026-11-11 | "Let's start then" (Applications CRUD) | Built the Application model (7 placement stages, source, type, CTC, due date, stage history), Zod validators, 6 routes scoped per user, search/filter/sort/pagination, a Due Soon filter; ran 24 automated end-to-end tests (all passed) | Zod v4: `.default()` inside a PATCH schema would reset fields, so defaults were moved to Mongoose. Express 5 makes `req.query` read-only, so validated queries go in `req.validated`. Search input is regex-escaped ("C++" would otherwise crash the query). Other users' IDs return 404, not 403, to avoid revealing they exist. | |

## Auth test results (Postman)

| # | Test | Expected | Result |
|---|---|---|---|
| 3 | Register valid user | 201 + user + accessToken, no password | ✅ |
| 8 | GET /me with Bearer token | 200, user without password | ✅ |
| 9 | Refresh (cookie) | 200 + new accessToken | ✅ |
| 10 | Logout | 200 "Logged out" | ✅ |
| 11 | Refresh after logout | 401 "No refresh token" | ✅ |
| 2, 4, 5, 7 | Validation / duplicate / wrong password / no token | 400 / 409 / 401 / 401 | Tested by AI with curl; not yet in Postman |

## Open questions for me to answer (my own analysis)
- After logout, does the old access token still work on `/me`? Why?
- Why is the password stored as a long `$2b$12$...` string in MongoDB?
- What's the risk of `atlasAdmin` and `0.0.0.0/0`?
- Where did AI help most, and where did it get things wrong?
