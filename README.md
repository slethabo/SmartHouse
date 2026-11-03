insta# SmartHouse

## Personalised Architectural Design and Cost Planning Platform

**FivePlusOne Devs | CSC 312 Software Engineering Capstone**

SmartHouse will guide homeowners through an architectural consultation, turn their answers into a confirmed design brief, and generate personalised house concepts with matching floor plans, interactive visual models, and estimated construction costs. Users will refine options and download a concept design package.

**Project status:** the prototype includes Supabase email/password accounts, local or cloud-backed projects, a guided consultation, confirmed briefs, and schematic room previews with demo estimates and JSON downloads. Full architectural generation and stored concept plan packages remain planned. See [prototype progress](docs/PROTOTYPE_PROGRESS.md).

## Product workflow

Consultation -> review and confirm brief -> generate feasible options -> explore house, plan, and costs -> revise and compare -> download selected concept.

Initial scope: rectangular plots, single-storey homes, supported room components and appearance choices, and one documented pricing context. Concepts require subsequent professional review; construction-ready engineering and automatic approval are outside the initial release.

## Documentation

Start with the [documentation index](docs/README.md) and [revised proposal](docs/SmartHouse_Revised_Project_Proposal.md).

- [Requirements and acceptance criteria](docs/REQUIREMENTS.md)
- [Architectural consultation](docs/CONSULTATION.md)
- [Target architecture](docs/ARCHITECTURE.md)
- [Target data model](docs/ERD.md)
- [Algorithm specifications](docs/PSEUDOCODE.md)
- [Proposed API](docs/API.md)
- [Testing and evaluation](docs/TESTING.md)
- [Implementation roadmap](docs/IMPLEMENTATION_PLAN.md)
- [Current prototype reference](docs/CURRENT_PROTOTYPE.md)

## Run the frontend prototype

```powershell
npm install
npm run dev
```

Open the Vite URL (normally `http://localhost:5173`). Without Supabase configuration, no API server or database is required. In local mode, projects, drafts, confirmed briefs, saved designs, and illustrative rate changes are stored in this browser using localStorage. Clearing browser storage removes this local demo data. Data from the previous backend is preserved separately and is not automatically imported.

## Connect to Supabase

1. Run `supabase/schema.sql` once in a new Supabase project, then run `supabase/verify.sql` to check the installation. Keep RLS enabled. Optional asset buckets use `supabase/storage.sql`.
2. Enable the **Email** provider under Supabase Authentication settings. Set the Site URL to `http://localhost:5173` for development and allow `http://localhost:5173/auth/callback` and `http://localhost:5173/auth/reset` as redirect URLs. Add equivalent HTTPS URLs for deployment. Email confirmation and password reset links return through these routes. Ownership uses `auth.uid()` and the existing RLS policies.
3. Copy `.env.example` to a root `.env` file and set the public values from your Supabase Connect dialog:

```dotenv
VITE_DATA_SOURCE=supabase
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR-PUBLISHABLE-KEY
```

The legacy `VITE_SUPABASE_ANON_KEY` name is also supported. Vite reads environment files from the repository root when run through npm workspaces. Restart `npm run dev` after changing them. Database passwords and service-role/secret keys must stay out of `VITE_` variables.

4. Run `npm run check:supabase` to check the hosted connection and Email provider. Optionally put `SUPABASE_TEST_EMAIL` and `SUPABASE_TEST_PASSWORD` for an existing confirmed test account in the ignored `.env` to also check sign-in and table access. These are server-side check values, never `VITE_` variables. The checker creates no accounts or projects. Start the app with `npm run dev`, visit `/register`, confirm your email if required, and log in. Create a project, save consultation answers, confirm the brief, and refresh to reopen it.

In cloud mode, projects, draft answers, revision numbers and immutable confirmed briefs are stored in Supabase. Routes for projects, consultation and saved designs require a signed-in account. Login, sign-up, confirmation resend, logout, password recovery, session restoration and token refresh use Supabase Auth. New visits never create anonymous users. Missing configuration, schema errors and revision conflicts show recovery guidance; failed cloud writes never fall back to local storage. Existing local projects are preserved separately and are not automatically uploaded or merged.

Admin navigation is granted only by the protected `my_role()` database RPC. User metadata cannot assign admin rights. To promote a registered user, use the SQL in `supabase/README.md`; the retained management screen still controls only the browser-local reference catalogue. Existing anonymous sessions can link an email from `/register`, confirm it, then choose a password while retaining their project ownership. This legacy conversion requires Supabase manual identity linking to be enabled. Logging into a separate account does not merge anonymous projects.

The reference design catalogue, favourites, demo rate controls, generated visual previews, and SVG/JSON downloads remain browser-based. Signed-in accounts have separate local favourites, demo catalogue state and search history. Persisting generated geometry, estimate snapshots, Storage assets and export jobs requires the trusted generation backend described in `supabase/README.md`; this adapter does not grant browser writes to those protected tables.

Use `VITE_DATA_SOURCE=local` to select the original offline demo. With no Supabase configuration at all, the app also defaults to local mode.

```sh
npm run test:supabase       # Adapter/session/configuration regression tests; no network
npm run test:auth           # Account flows, roles and safe redirects; no network
npm run test:prototype      # Existing local storage, layout and model checks
```

```powershell
npm run build
npm run test:prototype
npm run lint --workspace client
```

`npm start` builds and previews the frontend. The previous server implementation is retained for later work; `dev:full` and `start:full` are legacy commands, not required for this prototype.

## Repository map

| Path | Current contents |
|---|---|
| `client/src` | Account pages, catalogue browsing, recommendation results, saved plans, admin pages, shared UI. |
| `server/src/modules` | Authentication, plans, recommendation, cost, and administration. |
| `server/src/db` | Existing schema, seed, connection, and embedded database startup. |
| `server/tests` | Legacy cost and recommendation unit tests. |
| `docs` | Revised specifications, implementation plan, and prototype reference. |

The target ERD and API are design documents, not applied database migrations or active routes.
