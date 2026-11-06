# Luvo — SmartHouse Change Record

This document summarizes the major changes recorded in the SmartHouse repository, from its initial prototype through the current `main` branch. It describes the implemented project state, not a claim that every planned feature is complete.

## Project definition and planning

- Established SmartHouse as a capstone project for personalised architectural consultation, house concepts, floor plans, and cost planning.
- Added the project proposal, requirements, architecture, data model, API, pseudocode, implementation plan, testing guidance, and supporting user-model/design reports under [`docs/`](docs/README.md).
- Defined the initial scope around single-storey homes and rectangular plots, and documented exclusions such as construction-ready engineering and regulatory approval.

## Frontend prototype and homeowner workflow

- Built a React/Vite application with browsing, recommendations, saved designs, project workspaces, help content, and responsive navigation.
- Added a guided architectural consultation with conditional questions, draft saving and resuming, validation, review, and explicit confirmation of the design brief.
- Implemented local-demo persistence in browser storage, including projects, drafts, confirmed briefs, saved designs, catalogue data, and illustrative rates. Local demo data is separate from cloud data.
- Added generated concept presentations with floor plans, elevations, cost summaries, plot-fit information, and SVG/JSON downloads.
- Added an interactive Three.js house viewer with camera controls, cutaway mode, and a fallback presentation when WebGL is unavailable.

## Dataset-derived layouts and architecture

- Catalogued floor-plan dataset images and paired annotations, packaged selected source images with licensing and attribution information, and documented how those sources are used.
- Added three reviewed layout families and configurable room-size profiles. Consultation options can request spaces such as an en-suite, walk-in wardrobe, dining room, entertainment room, and garage.
- Implemented layout geometry for rooms, walls, doors, windows, furniture, and circulation. The plan, exterior drawings, and 3D model use shared geometry.
- Added generated roof forms and selectable roof design behavior, including roof sections for intersecting layouts. These are conceptual visualizations, not structural or construction documentation.

## Estimates and pricing

- Expanded estimates from simple illustrative rates to material- and product-based calculations with quantities, researched benchmark prices, and a product catalogue.
- Added estimate presentation and checks that relate the generated design to the stated budget.
- Documented that estimates depend on assumptions and pricing inputs and are not guaranteed construction quotes.

## Supabase, data, and account security

- Added a Supabase schema for profiles, projects, consultation drafts, confirmed briefs, designs, pricing, and related data, with Row Level Security and verification scripts.
- Added Supabase email/password registration and login, email confirmation, password reset, session restoration, logout, and protected routes.
- Added optional cloud-backed project and consultation operations while retaining local prototype mode. Cloud write errors are surfaced rather than silently falling back to local storage.
- Made `homeowner` the default cloud role. Administrator membership is managed through trusted database access and checked through the protected `my_role()` function. User-editable metadata cannot grant administrator privileges.
- Kept credentials and service-role keys out of browser configuration; only public Supabase configuration belongs in Vite environment variables.

## Tests and documentation

- Added automated tests for authentication and Supabase adapters, local project workflows, consultation validation, floor-plan cataloguing, room/layout constraints, and generated 3D geometry.
- Updated the README and documents under [`docs/`](docs/README.md) to explain setup, scope, data provenance, assumptions, and prototype limitations.

## Current project limitations

- The frontend can run locally without Supabase; cloud authentication and storage require a configured Supabase project and schema.
- Generated plans and models are prototype concepts. They are not reviewed construction drawings and do not replace architectural, structural, site, or regulatory assessment.
- The legacy server and broader production workflows remain in the repository, but are not required to run the frontend prototype.

## Notable repository milestones

- Initial prototype and proposal work established the product direction and supporting documentation.
- Database commits added the Supabase schema, verification, and storage guidance.
- `ecb92ca` added the main authentication and Supabase integration.
- `b403770` and `c8a9edc` added the dataset-derived house-design work and floor-plan cataloguing.
- `0442b78` added researched material pricing and estimate changes.
- `d0451e3` refined generated architecture and roof behavior.
