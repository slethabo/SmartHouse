# Architecture

Smart House Design & Cost Recommendation System — FivePlusOne Devs (CSC 312)

The system is a layered, modular client–server application. Each server module owns its own data access and business rules and exposes a small public interface (`index.js`). Modules call each other only through those interfaces — never by reaching into internal files.

## System overview

```mermaid
flowchart LR
    subgraph Browser
        UI[React SPA<br/>client/src]
    end

    subgraph Server["Node.js + Express (server/src)"]
        R[routes/*<br/>HTTP wiring only]
        MW[middleware<br/>validate · asyncHandler · errorHandler]
        subgraph Modules
            AUTH[auth]
            REC[recommendation]
            COST[cost]
            PLANS[plans]
            ADMIN[admin]
        end
        DB[(db/connection<br/>pg pool)]
    end

    PG[(PostgreSQL<br/>embedded or DATABASE_URL)]

    UI -- "fetch /api/* (JSON, cookie JWT)" --> R
    R --> MW --> Modules
    AUTH --> DB
    REC --> COST
    REC --> DB
    PLANS --> COST
    PLANS --> DB
    ADMIN --> COST
    ADMIN --> PLANS
    ADMIN --> DB
    COST --> DB
    DB --> PG
```

## Module diagram (server)

```mermaid
flowchart TB
    subgraph auth["modules/auth"]
        A1[validators.js<br/>zod schemas] --> A2[controller.js]
        A2 --> A3[service.js<br/>register · login · JWT]
        A3 --> A4[repository.js<br/>users SQL]
        A5[middleware.js<br/>attachUser · requireAuth · requireRole]
    end

    subgraph cost["modules/cost"]
        C1[estimator.js<br/>pure: estimateCost · buildBreakdown · estimateAllLevels]
        C2[service.js<br/>getRateMap · estimateForPlan · updateRate]
        C3[repository.js<br/>cost_rates SQL]
        C2 --> C1
        C2 --> C3
    end

    subgraph recommendation["modules/recommendation"]
        R1[engine.js<br/>pure: recommend]
        R2[service.js<br/>load plans + rates · record search]
        R2 --> R1
    end

    subgraph plans["modules/plans"]
        P1[controller.js] --> P2[service.js<br/>browse · detail · saved]
        P2 --> P3[repository.js]
    end

    subgraph admin["modules/admin"]
        D1[controller.js] --> D2[service.js<br/>users · plan CRUD · rates]
        D2 --> D3[repository.js]
    end

    R1 -. "estimateAllLevels (injected)" .-> C1
    R2 -. "cost.getRateMap / cost.estimateAllLevels" .-> C2
    P2 -. "cost.getRateMap / estimateForPlan" .-> C2
    D2 -. "cost.listRates / updateRate" .-> C2
    D1 -. "plans.browse" .-> P2
```

Dotted arrows are the only cross-module dependencies, and each goes through the target module's `index.js`.

## Request flow (example: Find my house)

```mermaid
sequenceDiagram
    participant U as User (browser)
    participant RT as routes/recommendation.routes.js
    participant V as middleware/validate (zod)
    participant RS as recommendation/service.js
    participant CM as cost (public interface)
    participant EN as recommendation/engine.js
    participant DB as db/connection

    U->>RT: POST /api/recommendations {plotSizeM2, budget, filters}
    RT->>V: validate body
    V-->>RT: req.validated
    RT->>RS: recommendForUser(userId, input)
    RS->>DB: SELECT active house_plans
    RS->>CM: getRateMap()
    CM->>DB: SELECT cost_rates
    RS->>EN: recommend(input, plans, rates, {estimateAllLevels})
    EN->>CM: estimateAllLevels(floor_area, rates)  (per candidate)
    EN-->>RS: {matches, noMatch, meta}
    RS->>DB: INSERT user_searches
    RS-->>RT: result
    RT-->>U: {success:true, message, data}
```

## Layers

| Layer | Location | Responsibility | Must not |
|---|---|---|---|
| Presentation | `client/src/pages`, `components` | Render, validate inputs for instant feedback, show loading/empty/error states | Contain pricing or matching rules |
| API client | `client/src/services` | One fetch wrapper (`api.js`) + one file per resource | Know about React state |
| Routes | `server/src/routes` | Map URLs to validators, auth guards and controllers | Contain business logic |
| Controllers | `modules/*/controller.js` | Translate HTTP ↔ service calls, set cookies, pick status codes | Run SQL |
| Services | `modules/*/service.js` | Business rules, orchestration, authorisation details | Build HTTP responses |
| Pure engines | `cost/estimator.js`, `recommendation/engine.js` | Deterministic calculations, fully unit-tested without a database | Perform I/O |
| Repositories | `modules/*/repository.js` | Parameterised SQL only | Contain rules |
| DB | `server/src/db` | Pool, schema, seed, embedded-Postgres bootstrap | Be imported by the client |

## Cross-cutting concerns

- **Response envelope**: every endpoint returns `{ success, message, data }` (`utils/response.js`). All thrown errors are translated by `middleware/errorHandler.js` into the same shape with friendly, non-technical messages; stack traces are logged server-side only.
- **Validation**: zod schemas on the server (`validators.js` per module) and mirrored plain-JS checks on the client (`client/src/utils/validation.js`). Strings are trimmed, emails lower-cased, numbers coerced and bounded.
- **Auth**: bcrypt password hashes; JWT in an `httpOnly`, `SameSite=Lax` cookie; `attachUser` runs on every request, `requireAuth` / `requireRole('admin')` guard routes. Login/register are rate-limited.
- **Security headers**: helmet, CORS restricted to the client origin, JSON body limit 100 kB, no `x-powered-by`.
- **Config/secrets**: `server/src/config.js` reads environment variables only (`.env` locally). `JWT_SECRET` is mandatory in production.
- **Database bootstrap**: `db/init.js` applies `schema.sql` on every start (idempotent) and `seed.sql` once (when `users` is empty). Without `DATABASE_URL`, `db/embedded.js` starts a real PostgreSQL from the `embedded-postgres` package so the app runs with one command on any machine.
- **i18n-readiness**: every UI string lives in `client/src/constants/strings.js`; money/area formatting goes through `Intl.NumberFormat('en-ZA')` in `client/src/utils/format.js`.

## Client structure

```
client/src
├── App.jsx                 routes + providers
├── constants/              strings.js (all copy), config.js (presets, keys)
├── context/                AuthContext, ToastContext
├── hooks/                  useFetch, useLastSearch, useSavePlan, useDocumentTitle
├── services/               api.js + auth/plans/recommendation/admin services
├── components/
│   ├── layout/             AppLayout, TopNav, BottomTabs, Breadcrumbs, PageHeader, HelpDrawer
│   ├── ui/                 Button, FormField, Modal, ConfirmDialog, Toast, Spinner, EmptyState, Banner, Tooltip, Icon
│   ├── plans/              PlanCard, PlanImage, MatchBadge, CostBreakdown
│   └── forms/              FindHouseForm, PlanForm
├── pages/                  Login, Register, Dashboard, Recommendations, PlanDetail, Browse, SavedPlans, NotFound, admin/*
├── styles/                 tokens.css (design tokens), global.css, components.css, pages.css
└── utils/                  format.js, validation.js
```

## Extending the system

- **New rule in the recommendation** → change `engine.js` and add a Jest case in `server/tests/recommendation.test.js`; nothing else needs to know.
- **New cost component** (e.g. VAT) → extend `BREAKDOWN_SHARES` in `estimator.js`; the client's breakdown list reads keys from the response.
- **New resource** → create `modules/<name>/{repository,service,controller,validators,index}.js`, mount a router in `routes/index.js`, add a service file in `client/src/services`.
- **Different database host** → set `DATABASE_URL`; no code changes.
