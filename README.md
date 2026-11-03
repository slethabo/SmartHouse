insta# SmartHouse

## Personalised Architectural Design and Cost Planning Platform

**FivePlusOne Devs | CSC 312 Software Engineering Capstone**

SmartHouse will guide homeowners through an architectural consultation, turn their answers into a confirmed design brief, and generate personalised house concepts with matching floor plans, interactive visual models, and estimated construction costs. Users will refine options and download a concept design package.

**Project status:** the login-free prototype includes browser-local projects, guided consultation, confirmed briefs, three dataset-derived layout families, interactive 3D models, demo estimates and SVG/JSON downloads. Room-size profiles and optional en-suite, wardrobe, dining, entertainment and garage spaces change the generated geometry. Automatic interpretation of arbitrary plan images and professional concept packages remain future work. See [prototype progress](docs/PROTOTYPE_PROGRESS.md) and [dataset templates](docs/DATASET_TEMPLATES.md).

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

Open the Vite URL (normally `http://localhost:5173`). No API server, database, or authentication is required. Projects, drafts, confirmed briefs, saved designs, and illustrative rate changes are stored in this browser using localStorage. Clearing browser storage removes this local demo data. Data from the previous backend is preserved separately and is not automatically imported.

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
