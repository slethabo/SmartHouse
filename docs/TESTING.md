# Testing and Evaluation Plan

**Status:** Planned validation for the revised product. Existing Jest tests cover the legacy cost and recommendation engines; they do not prove custom design generation or 3D consistency. No new platform tests have been executed as part of this documentation revision.

## Requirement traceability

| Requirements | Evidence to collect |
|---|---|
| FR01, NFR06 | Account flow, ownership checks for every child resource, unauthorised admin access, session handling, protected downloads. |
| FR02-FR04 | Conditional-question tests, draft resume/concurrency, support classification, brief confirmation and immutability. |
| FR05-FR06, NFR04 | Generation scenarios plus automated geometry, circulation, budget, essential-requirement, and bounded-search checks. |
| FR07-FR08, NFR03 | Shared-version assertions, room dimensions and opening checks, paired 2D/3D visual inspection, viewer fallback. |
| FR09, FR14 | Decimal rounding, line totals, inclusions, quantity units, contingency base, release pinning, and historical reproducibility. |
| FR10-FR11 | New versions after edits, unchanged previous snapshots, selection ownership, accurate comparison. |
| FR12 | Package completeness, manifest consistency, failed-render handling, download access, and visual review. |
| FR13 | Role checks, invalid configuration rejection, immutable published releases, referenced-release retention. |
| NFR01-NFR02 | User tasks, keyboard checks, labels, focus, contrast, narrow-screen layout, textual alternatives. |
| NFR05, NFR07-NFR08 | Benchmarks, module-contract review, and checks that assumptions and review limits appear in views and exports. |

## Essential scenarios

| Scenario | Expected result |
|---|---|
| Same plot area, different width/length | Envelope and generated fit reflect dimensions, not area alone. |
| Different household/room requirements | Supported needs change geometry or yield an explained conflict. |
| Narrow plot or impossible clearances | No invalid footprint offered as feasible. |
| Rooms overlap or doorway has invalid host | Candidate fails validation. |
| Room disconnected from entrance | Candidate fails circulation checks. |
| Budget exactly equals calculated total | Feasible; documented precision determines comparison. |
| Budget below required total | No affordable success; suggestions do not remove essentials automatically. |
| Missing rate, mismatched unit, or currency | No complete feasibility claim; configuration error surfaced. |
| Search time/attempt limit reached | Explicit exhausted outcome; no claim that all possible solutions were disproved. |
| Optional room is removed through user revision | New brief/version and revised cost; previous concept preserved. |
| Pricing/rules updated after saving | Historical snapshot remains unchanged; new runs pin new releases. |
| Concurrent consultation edit | Stale revision rejected without losing saved answers. |
| Duplicate generation request | Same request key returns same run; changed payload rejected. |
| Export or 3D rendering fails | Recoverable status/fallback; no mixed or incomplete package delivered. |
| Another user's design/export ID is supplied | Resource denied without data leakage. |
| Unsupported slope, shape, or second floor | Scope explained and draft retained; no false support claim. |

## Evaluation procedure

Prepare a documented fixture set of supported plots, briefs, components, rules, and illustrative prices. Separate deterministic engine tests from integration tests requiring a database. Verify calculations with independent arithmetic and invariants, rather than merely copying engine output into expectations.

Run benchmarks on stated hardware with fixed attempt/time bounds; record duration, attempts, successful options, and termination reasons. Agree numeric response budgets and the supported input limits after the prototype, before final acceptance. The initial documentation does not invent a validated generation speed target.

Ask representative users to create a project, complete the consultation, confirm the brief, interpret a floor plan and model, make a supported change, compare versions, and download the package. Record task completion, points of confusion, and whether users understand budget assumptions and concept-stage limitations. Seek designer/cost practitioner feedback where available and report the limits of that feedback.

## Release acceptance

The release requires a complete consultation-to-download journey, all mandatory geometry checks passing for successful concepts, reproducible estimates, consistent views/exports, working conflict responses, ownership protection, and recorded usability/performance evidence. Every incomplete FR remains visible in the backlog. Passing legacy tests alone does not satisfy these criteria.

For future implementation checks, existing commands are `npm test`, `npm run lint`, and `npm run build`. Add meaningful engine, integration, and user-flow coverage as new functionality is built. For documentation-only edits, check links, encoding, requirement IDs, diagrams, and consistency with the proposal.
