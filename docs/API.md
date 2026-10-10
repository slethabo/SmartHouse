# Proposed API Contract

**Status:** Target routes, not implemented endpoints. The current API remains mounted by [routes/index.js](../server/src/routes/index.js). Existing `/api/plans` and `/api/recommendations` operate on the catalogue.

## Conventions

Retain the current JSON envelope `{ success, message, data }`. Proposed errors add `data.code`, field errors where relevant, and requirement IDs for design conflicts. Use metres for dimensions and explicit currency for budgets; monetary values should be decimal strings or minor units with a documented convention. Dates use ISO 8601 UTC.

All project, brief, run, design, comparison, and download operations require an active session and ownership checks. Administrator configuration writes require the administrator role. A guessed child ID must not expose another user's resource. Return 404 for resources unavailable to the caller. GET requests do not trigger generation or mutations.

## Proposed endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/projects` | Create an owned project. |
| GET | `/api/projects` | List the caller's projects. |
| GET/PATCH | `/api/projects/:projectId` | Read or update project title/archive state. |
| GET | `/api/consultation/config` | Read published question definitions and supported choices. |
| GET/PUT | `/api/projects/:projectId/consultation` | Read/save draft answers with expected revision. |
| POST | `/api/projects/:projectId/briefs` | Confirm the requested consultation revision and create an immutable brief. |
| GET | `/api/projects/:projectId/briefs` | List confirmed brief versions. |
| GET | `/api/projects/:projectId/briefs/:briefId` | Read a brief belonging to the project. |
| POST | `/api/projects/:projectId/generation-runs` | Create a run from a confirmed brief; return 202 with run ID. |
| GET | `/api/projects/:projectId/generation-runs/:runId` | Poll status, progress, design IDs, and diagnostics. |
| GET | `/api/projects/:projectId/designs` | List saved design versions and summaries. |
| GET | `/api/projects/:projectId/designs/:designId` | Read canonical geometry, specifications, validation, and estimate. |
| POST | `/api/projects/:projectId/comparisons` | Compare owned versions without creating a new design. |
| PUT | `/api/projects/:projectId/selection` | Select one design belonging to the project. |
| POST | `/api/projects/:projectId/designs/:designId/exports` | Start concept package export; return 202 with export ID. |
| GET | `/api/projects/:projectId/exports/:exportId` | Read export status and manifest. |
| GET | `/api/projects/:projectId/exports/:exportId/download` | Download completed artifact after ownership check. |
| GET/POST | `/api/admin/configurations/:kind` | Read releases or create validated drafts for allowed kinds. |
| POST | `/api/admin/configurations/:kind/:draftId/publish` | Publish a new immutable release. |

Configuration `kind` is an allowlisted enum: `rules`, `components`, `pricing`, or `questionnaire`. No arbitrary table names or file paths are accepted. Reuse current authentication routes; revised account recovery is not assumed.

## Payload and lifecycle rules

Consultation updates include `expectedRevision` and `answers`. A stale update returns 409. Brief confirmation includes `draftRevision` and acknowledged assumption/recorded-only IDs; the server computes the brief and classifications instead of trusting client-provided validation.

Generation creation includes `briefId` and a project-scoped `requestKey`. The server selects and pins published configuration versions and generation bounds. Retrying the same key and payload returns the existing run; a changed payload with that key returns 409. The client cannot submit arbitrary executable rules or unlimited search bounds.

Run status is `queued`, `running`, `completed`, `no_feasible_option`, `exhausted`, or `failed`. A completed run includes saved design IDs. Valid processing can produce no options without being an HTTP transport error. `exhausted` is distinct from establishing infeasibility in the supported search space.

Design responses identify `schemaVersion`, brief/run/release IDs, geometry checksum, rooms/walls/openings, appearance specifications, validation, estimate, and review notes. Budget and estimate currency must match. Comparisons identify each input version and show requirement satisfaction, areas, estimated costs, and preference tradeoffs.

Revisions use consultation draft updates and a new brief confirmation, followed by generation. No endpoint overwrites immutable design geometry. Export download is available only when status is `completed`; manifests identify every pinned version.

## Error vocabulary

| Code | Meaning | Expected UI response |
|---|---|---|
| `INVALID_INPUT` | Type, unit, range, or missing field error | Show field-specific corrections. |
| `UNSUPPORTED_SCOPE` | Request exceeds initial supported design space | Explain supported choices and retain the draft. |
| `BRIEF_NOT_CONFIRMED` | Generation requested without an eligible confirmed brief | Return to brief review. |
| `STALE_REVISION` | Draft changed since it was loaded | Reload and reconcile answers. |
| `CONFIGURATION_INCOMPLETE` | Required rates/rules/components unavailable | Explain temporary generation unavailability. |
| `REQUEST_KEY_CONFLICT` | Retry key reused with different inputs | Use a new request key for the new operation. |
| `EXPORT_NOT_READY` | Export still processing or failed | Show status and a safe retry action. |

Use 400 for malformed data, 401 for missing authentication, 403 for forbidden administrative operations, 404 for unavailable resources, 409 for state conflicts, and 500 for operational failures. Internal stack traces and database details must not appear in user messages.
