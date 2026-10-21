# AI Emergency Response Platform

MCA project: full-stack web application (React + Node/Express + MongoDB) for reporting emergencies,
AI-assisted classification and routing, responder handling and status tracking.

## Progress
| Stage | Status |
|---|---|
| 1. Project setup (folders, env, MongoDB connection, 4 Mongoose models) | Code written. 16 database-free tests pass. Not yet verified against a real MongoDB |
| 2. Authentication (register, login, JWT, hashing, roles, protected routes) | Code written. Validation and token rejection tested without a database. Register/login end to end NOT yet verified |
| 3. Incident reporting (form, GPS / map / manual location, image upload, report IDs, live user dashboard) | Code written. 29 database-free tests pass. Needs checking in the browser against MongoDB |
| 4. AI integration | Planned |
| 5. Responder module | Planned |
| 6. User tracking and notifications | Planned |
| 7. Admin dashboard and analytics | Planned |
| 8. Testing and deployment | Planned |

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

## How to test this stage
1. Register a new user: you land on the User dashboard.
2. Logout, login as admin@demo.test: you land on the Admin dashboard.
3. While logged in as User, open /admin in the address bar: you are redirected to /dashboard.
4. Wrong password: "Invalid email or password". Register with an existing email: "already exists".
5. In MongoDB, open the users collection: `passwordHash` is a bcrypt hash, never the plain password.

## Automated checks
- `cd server && npm test` runs 29 tests that need no database (validation, token rejection, role check, error handling).
- GitHub Actions (`.github/workflows/ci.yml`) runs the backend tests and the frontend build on every push and pull request.
