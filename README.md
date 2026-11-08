# AI Emergency Response Platform

MCA project: full-stack web application (React + Node/Express + MongoDB) for reporting emergencies,
AI-assisted classification and routing, responder handling and status tracking.

## Progress
| Stage | Status |
|---|---|
| 1. Project setup (folders, env, MongoDB connection, 4 Mongoose models) | Done and verified (server connects to MongoDB Atlas) |
| 2. Authentication (register, login, JWT, hashing, roles, protected routes) | Done and verified in the browser (register, login, roles) |
| 3. Incident reporting (form, GPS / map / manual location, image upload, report IDs, live user dashboard) | Done and verified in the browser against MongoDB Atlas |
| 4. AI classification and routing (rule baseline, optional Gemini/Claude adapters, validation, evaluation, incident details page) | Done and verified in the browser (report classified Fire / High and routed to the Fire group) |
| 5. Responder module (group dashboard, accept, start response, notes, resolve) | Done and verified in the browser (accept, in progress, resolved) |
| 6. Notifications and user tracking (bell with unread count, notification list, status timeline) | Done and verified in the browser (bell, unread count, timeline) |
| 7. Admin dashboard (filters, charts, incident list, assign / reassign, correct AI classification, user management) | Done, committed; browser check of the admin screens pending |
| 8. Machine-learning classifier (Naive Bayes, training data, hybrid safety rule, comparison) | Code written. 75 database-free tests pass. Needs checking in the browser |

## Project documents
The `docs/` folder holds the literature survey, SRS and HLD, LLD and viva Q&A (PDF).

## Folder structure
```
server/                      Express + MongoDB backend
  src/config/                env.js (reads .env), db.js (MongoDB connection)
  src/models/                User, Incident, IncidentHistory, Notification
  src/controllers/           authController.js (register, login, me)
  src/routes/                authRoutes.js
  src/middleware/            auth.js (protect + authorize), error.js
  src/utils/                 constants, ApiError, asyncHandler, generateToken
  src/seed/seed.js           creates demo Admin and Responder accounts
  uploads/                   incident images (created automatically, never committed)
  src/app.js, server.js      app setup and start-up
client/                      React (Vite) + Bootstrap 5 frontend
  src/api/axios.js           API client (adds JWT automatically)
  src/context/AuthContext    login state shared across the app
  src/components/            Navbar, ProtectedRoute, Loader, StatCards
  src/pages/                 Login, Register, User / Responder / Admin dashboards
```

## Setup (needs Node.js 22 or newer, and MongoDB: a local server or a MongoDB Atlas connection string)
Commands below work in PowerShell (use `Copy-Item .env.example .env` instead of `cp`).
```bash
# 1. Backend
cd server
npm install
cp .env.example .env        # (PowerShell: Copy-Item .env.example .env) then edit .env: set MONGO_URI and a long random JWT_SECRET
npm run seed                # creates demo admin and responder accounts
npm run dev                 # API on http://localhost:5000

# 2. Frontend (new terminal)
cd client
npm install
npm run dev                 # app on http://localhost:5173
```

## Demo accounts (created by `npm run seed`; demo passwords only)
| Role | Email | Password |
|---|---|---|
| Admin | admin@demo.test | Admin@12345 |
| Responder (Fire) | fire@demo.test | Responder@123 |
| Responder (others) | medical@, security@, accident@, infrastructure@, other@ demo.test | Responder@123 |
| User | create one on the Register page | your choice |

## API available so far
| Method | Route | Access |
|---|---|---|
| GET | /api/health | Public |
| POST | /api/auth/register | Public |
| POST | /api/auth/login | Public |
| GET | /api/auth/me | Logged-in |
| POST | /api/incidents | User (multipart: description, location fields, optional image) |
| GET | /api/incidents | User (own reports and dashboard numbers) |
| GET | /api/incidents/:id | Reporter, assigned Responder, Admin |
| GET | /api/incidents/:id/image | Same as above (image is never public) |
| GET | /api/responder/incidents | Responder (their group and assigned incidents, dashboard numbers) |
| PUT | /api/responder/incidents/:id/accept | Responder (first to accept wins) |
| PUT | /api/responder/incidents/:id/status | Responder (In Progress, Resolved; Resolved needs a note) |
| POST | /api/responder/incidents/:id/notes | Responder (own Accepted / In Progress incidents) |
| GET | /api/notifications | Logged-in (own notifications and unread count) |
| PUT | /api/notifications/read-all | Logged-in (own notifications) |
| PUT | /api/notifications/:id/read | Logged-in (own notification only) |
| GET | /api/admin/incidents | Admin (filters: status, category, priority, from, to, q; paged) |
| GET | /api/admin/analytics | Admin (same filters; totals and chart data) |
| PUT | /api/admin/incidents/:id/assign | Admin (assign or reassign a responder) |
| PUT | /api/admin/incidents/:id/classification | Admin (correct AI category / priority; AI values are kept) |
| GET | /api/admin/users | Admin |
| POST | /api/admin/users | Admin (create a Responder or Admin) |
| PUT | /api/admin/users/:id | Admin (name, role, group, enable / disable) |

## AI classification (Stage 4)
- After a report is saved, the server analyses it in the background: category, priority, summary and reason, then routes it to a responder group (status AI Analyzed, then Assigned or Pending Assignment).
- `AI_PROVIDER=hybrid` (default) uses a **machine-learning classifier** (Naive Bayes written from scratch, see `server/src/services/ai/nb.js`) plus one safety rule: life-threatening wording is always Critical. `ml` is the model alone. `rules` is the **keyword-rule baseline, which is not machine learning**. `gemini` or `anthropic` call a language model; if it fails, the rules are used (set `AI_FALLBACK_TO_RULES=false` to leave the report for manual review instead).
- AI output is validated by the server (only allowed categories and priorities are accepted). Only the report text is sent to a model, never the reporter's name or email.
- **Machine learning:** two Naive Bayes models (category and priority) on TF-IDF features, trained by `npm run train` on `server/ml/training-data.json` (472 synthetic labelled reports generated from templates; not real incidents). The 62 evaluation reports are never used for training. On those 62 held-out reports: rules 91.9% category accuracy, ML 95.2%. The set is small, written by the project author, and the difference is 2 reports, so this is indicative only. Weak spots: negation ("nobody is hurt"), words not in the training data ("bonfire"), ambiguous cases.
- `npm run evaluate` (in `server`; add `-- --compare` for a rules / ml / hybrid table) measures accuracy, precision, recall, F1 and a confusion matrix on the 62 labelled sample reports in `server/evaluation/dataset.json`. The set is small and written by the project author, so results are indicative only. Run `npm run evaluate -- --provider=gemini` to compare a language model.

## How to test this stage
1. Register a new user: you land on the User dashboard.
2. Logout, login as admin@demo.test: you land on the Admin dashboard.
3. While logged in as User, open /admin in the address bar: you are redirected to /dashboard.
4. Wrong password: "Invalid email or password". Register with an existing email: "already exists".
5. In MongoDB, open the users collection: `passwordHash` is a bcrypt hash, never the plain password.

## Automated checks
- `cd server && npm test` runs 75 tests that need no database (validation, token rejection, role check, error handling).
- GitHub Actions (`.github/workflows/ci.yml`) runs the backend tests and the frontend build on every push and pull request.
