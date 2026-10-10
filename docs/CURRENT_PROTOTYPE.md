# Current Catalogue Prototype Reference

Status: historical implementation reference, preserved on 10 October 2026. This describes the existing catalogue application, not the revised architectural platform. Commands and demo outcomes below have not been re-run during the documentation revision. For the target design, start with [the documentation index](README.md). The actual schema and route files remain authoritative for current behaviour.

# Smart House Design & Cost Recommendation System

**Team FivePlusOne Devs — CSC 312 (evolutionary prototype)**

A homeowner enters their plot size (m²) and construction budget (R). The system recommends house designs that fit the plot and the budget, shows the estimated construction cost of each at basic / standard / premium finish, and explains why each design was recommended. Administrators manage house plans, users and cost rates.

- Frontend: React 18 + Vite, plain CSS (design tokens), mobile-first, WCAG AA colours, keyboard accessible
- Backend: Node.js + Express REST API, modular layered architecture
- Database: PostgreSQL (zero-config embedded server for local runs, or any external PostgreSQL via `DATABASE_URL`)
- Auth: bcrypt password hashing, JWT in an httpOnly cookie, role-based access (`client`, `admin`)
- Tests: Jest unit tests for the cost estimator and recommendation engine

Docs: [docs/ERD.md](ERD.md) · [docs/ARCHITECTURE.md](ARCHITECTURE.md) · [docs/PSEUDOCODE.md](PSEUDOCODE.md)

---

## 1. Setup

Requirements: **Node.js 18+** (tested on Node 24) and npm. No PostgreSQL install needed.

```bash
git clone <repo-url> SmartHouse
cd SmartHouse
npm install
```

`npm install` installs both workspaces (`server`, `client`) and downloads PostgreSQL binaries through the `embedded-postgres` package.

> **npm 11 note:** if npm prints `install scripts not yet covered by allowScripts`, run
> `npm install-scripts approve @embedded-postgres/windows-x64 esbuild` (use the package for your OS, e.g. `@embedded-postgres/linux-x64`) and then `npm rebuild`. The repo's `package.json` already approves the Windows and esbuild scripts.

Optional configuration — copy `.env.example` to `.env`:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | 3001 | API port |
| `JWT_SECRET` | dev-only value | **Required in production.** Signs session cookies |
| `DATABASE_URL` | *(empty)* | Use an external PostgreSQL instead of the embedded one |
| `EMBEDDED_PG_PORT` | 5433 | Port for the embedded PostgreSQL |
| `CLIENT_ORIGIN` | http://localhost:5173 | Allowed CORS origin (Vite dev server) |
| `MAX_PLOT_COVERAGE` | 0.5 | Max share of the plot a footprint may cover |

## 2. Run

### Development (hot reload)
```bash
npm run dev
```
- API: http://localhost:3001 (restarts on change)
- App: **http://localhost:5173** (Vite proxies `/api` to the API)

On first start the server creates the database, applies `schema.sql` and loads `seed.sql` (1 admin, 1 client, 12 house plans, 3 cost rates). Data persists in `server/data/pg` between runs. Delete that folder to reset to a fresh seed.

### Production-style (single process)
```bash
npm start
```
Builds the React app and serves it together with the API at **http://localhost:3001**.

### Tests and lint
```bash
npm test      # Jest: cost estimator + recommendation engine (19 cases)
npm run lint  # ESLint for server and client
```

### Health check
`GET http://localhost:3001/api/health` → `{"success":true,"data":{"status":"ok","database":"up"}}`

## 3. Test credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@smarthouse.test` | `Admin123!` |
| Client | `client@smarthouse.test` | `Client123!` |

The login page has "Use" shortcuts that fill these in.

## 4. Demo script (≈ 3 minutes)

1. **Register** — open the app, click *Create account*, fill in a name, email and password (show the password toggle and an inline validation error, e.g. a short password). Submit → you land on *Find my house*.
2. **Find my house** — plot size **400** m², budget **R1 500 000** (or tap the R1.5m preset). Click *Find my house*. Point out the loading progress bar.
3. **Recommendations** — 9 designs sorted by match %. Top result "Cape Dutch Revival, 84% match — fits your plot with room for a garden; about R170,000 under budget at basic finish". Try *Sort by: Cost low to high* and the bedrooms filter. Show the breadcrumbs and the "Change search" back button.
4. **Plan detail** — open a design. Show the specs, the finish-level tabs (basic / standard / premium) with the cost breakdown (structure, finishes, services, professional fees, 10% contingency), "Within budget / Over budget" badges and the *Why this was recommended* panel with its three score bars.
5. **Save** — click *Save*; a toast confirms. Go to *Saved plans* (top nav or bottom tab on mobile); the plan is there. Click *Saved* again to remove it and show the *Undo* toast.
6. **No-results state** — on *Find my house* enter budget R300 000 → "No designs match yet" with the suggestion "Increase your budget by about R127,500 to afford the Starter Studio at basic finish".
7. **Log out, log in as admin** (`admin@smarthouse.test` / `Admin123!`). Open *Admin*.
8. **Add a house plan** — *Add house plan* → name "Demo Villa", style "Modern", 3 bed, 2 bath, 1 floor, floor area 120, footprint 120, min plot 300 → *Add plan*. It appears in the table with a basic estimate of R1 140 000.
9. **Change a cost rate** — *Cost rates* tab → set Basic to **10 000** → *Save rate*.
10. **Show the updated estimate** — *Browse designs*, search "Demo Villa": the estimate now starts at **R1 200 000** (120 m² × R10 000). Open it to show the updated breakdown.
11. (Optional) *Delete* the demo plan — note the confirmation dialog — and set the basic rate back to 9 500.

Also worth showing: the *How it works* help drawer, the mobile layout at 360 px (bottom tab bar, no horizontal scrolling), and keyboard navigation with visible focus rings.

## 5. Project structure

```
SmartHouse/
├── package.json            npm workspaces + root scripts (dev / start / test / lint)
├── .env.example
├── docs/                   ERD.md · ARCHITECTURE.md · PSEUDOCODE.md
├── server/
│   ├── src/
│   │   ├── index.js        entry: connect DB → init schema/seed → listen
│   │   ├── app.js          Express app factory
│   │   ├── config.js       env-based configuration (no secrets in code)
│   │   ├── db/             schema.sql · seed.sql · connection.js · init.js · embedded.js
│   │   ├── modules/
│   │   │   ├── auth/           register, login, JWT, role middleware
│   │   │   ├── cost/           estimator (pure) + rates service/repository
│   │   │   ├── recommendation/ engine (pure) + service
│   │   │   ├── plans/          browse, detail, saved plans
│   │   │   └── admin/          users, plan CRUD, rate edits
│   │   ├── routes/         HTTP wiring per module + /health
│   │   ├── middleware/     validate (zod) · asyncHandler · errorHandler
│   │   └── utils/          errors.js · response.js
│   └── tests/              cost.test.js · recommendation.test.js
└── client/
    └── src/
        ├── pages/          Login · Register · Dashboard · Recommendations · PlanDetail · Browse · SavedPlans · admin/*
        ├── components/     layout/ · ui/ · plans/ · forms/
        ├── services/       api.js + per-resource API clients
        ├── context/        AuthContext · ToastContext
        ├── hooks/          useFetch · useLastSearch · useSavePlan
        ├── constants/      strings.js (all UI copy) · config.js
        ├── utils/          format.js (ZAR, m²) · validation.js
        └── styles/         tokens.css · global.css · components.css · pages.css
```

## 6. API summary

All responses: `{ success: boolean, message: string, data: any }`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | – | Liveness + DB probe |
| GET | `/api/rates` | – | Current cost rates |
| POST | `/api/auth/register` | – | Create a client account (sets cookie) |
| POST | `/api/auth/login` | – | Log in (sets cookie) |
| POST | `/api/auth/logout` | – | Clear cookie |
| GET | `/api/auth/me` | – | Current user or null |
| POST | `/api/recommendations` | user | `{plotSizeM2, budget, filters?, limit?}` → matches or suggestions |
| GET | `/api/recommendations/last-search` | user | Most recent search |
| GET | `/api/plans?search&bedrooms&floors&style&maxArea` | – | Browse active plans with estimates |
| GET | `/api/plans/:id` | – | Plan detail with full cost breakdown |
| GET | `/api/plans/saved` | user | Saved plans |
| POST / DELETE | `/api/plans/:id/save` | user | Save / unsave |
| GET | `/api/admin/stats` | admin | Counts |
| GET | `/api/admin/users` | admin | List users |
| PATCH | `/api/admin/users/:id/active` | admin | Deactivate / reactivate |
| GET / POST | `/api/admin/plans` | admin | List all / create |
| PUT / DELETE | `/api/admin/plans/:id` | admin | Update / delete |
| PATCH | `/api/admin/plans/:id/active` | admin | Hide / show |
| GET | `/api/admin/rates` | admin | List rates |
| PUT | `/api/admin/rates/:level` | admin | Update a rate |

## 7. UX principles applied (Pressman ch. 15)

- **User in control**: back buttons and breadcrumbs everywhere, Cancel on every dialog, confirmation before delete/deactivate, "Undo" after removing a saved plan, unsaved-changes guard on the plan form, Escape closes dialogs.
- **Reduce memory load**: budget presets, last search remembered (local + server), sensible defaults, units on every field (m², R), tooltips.
- **Consistency**: one `Button`, one `FormField`, one `PlanCard`, one icon set, one colour/spacing token file, same page header/breadcrumb pattern on every page.
- **Where am I / what can I do / where can I go**: page title + breadcrumbs, primary actions prominent, disabled buttons carry a reason, persistent top nav (desktop) and bottom tab bar (mobile).
- **Communication**: toasts for every action, progress bar and skeletons while loading, specific polite error messages that say how to fix the problem.
- **Efficiency**: login → *Find my house* (prefilled) → results is **2 clicks**.
- **Accessibility**: AA contrast, visible focus rings, skip link, ARIA labels/roles/live regions, keyboard-operable dialogs and tabs, alt text and placeholders for images.
- **Internationalisation-ready**: all strings in `client/src/constants/strings.js`; ZAR via `Intl.NumberFormat('en-ZA')`.
- **Responsive**: 360 px to 1440 px without horizontal scrolling.

## 8. Troubleshooting

- **Port 5433 or 3001 already in use** → set `EMBEDDED_PG_PORT` / `PORT` in `.env`.
- **Embedded PostgreSQL fails to start** → delete `server/data/pg` and start again, or point `DATABASE_URL` at your own PostgreSQL.
- **Running as root (Linux/Docker)** → PostgreSQL refuses to run as root; use `DATABASE_URL` with an external server.
- **Reset demo data** → stop the server, delete `server/data/pg`, start again.
