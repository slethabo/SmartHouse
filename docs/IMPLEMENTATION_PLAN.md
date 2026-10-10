# Implementation Roadmap

**Status:** Planning document based on repository inspection and the revised proposal. Application code has not been migrated by this documentation update.

## Current capabilities and gaps

| Area | Current prototype | Revised work |
|---|---|---|
| Foundation | React/Vite UI, Express API, PostgreSQL bootstrap | Reuse after verifying configuration and access behaviour. |
| Accounts | Registration, login, cookie session, client/admin roles | Add ownership enforcement to new project resources. |
| Inputs | Plot area, budget, optional catalogue filters | Guided architectural questions, dimensions, priorities, editable briefs. |
| Design | Ranking stored house plans | Generate room geometry with explicit spatial rules and bounded search. |
| Visual output | Catalogue images and plan specifications | Matching dimensioned floor plan and interactive model. |
| Costs | Area times finish rate; fixed category shares | Versioned quantity/area/allowance lines and documented contingency. |
| Saving | Catalogue bookmarks and search history | Owned projects, confirmed briefs, immutable designs, comparisons. |
| Administration | Users, catalogue plans, current finish rates | Published room/style components, rules, questionnaire and pricing releases. |
| Downloads | No concept package module in inspected source | Protected exports with consistent version manifest. |
| Tests | Legacy cost/recommendation unit tests | New geometry, versioning, security, integration, and user-flow evaluation. |

## Delivery stages

| Stage | Work | Exit evidence |
|---|---|---|
| 1. Domain and feasibility prototype | Agree supported rooms, style/roof choices, dimension rules, coordinate model, price context; prototype simple generated layout and matching 2D/3D. | Small supported brief yields consistent geometry and an explainable estimate; hard constraints can reject invalid candidates. |
| 2. Projects and consultation | Add additive migrations, owned projects, question flow, drafts, support classification, and confirmed briefs. | A user can resume and confirm a brief; access and concurrency checks pass. |
| 3. Generation and validation | Build envelope, components, arrangement search, overlap/circulation checks, pinned configurations, and run states. | Supported scenarios yield valid options or explicit no-option/exhausted outcomes within bounds. |
| 4. Visuals and costing | Integrate canonical design storage, dimensioned plan, interactive viewer, quantity/allowance estimate, and fallback. | One version produces consistent views and reproducible calculations. |
| 5. Revisions, comparison, exports, admin | Save versions, select options, compare, publish configurations, and produce protected concept packages. | Complete consultation-to-download workflow; old versions survive revisions and pricing changes. |
| 6. Evaluation and delivery | Run test plan, gather feedback, benchmark, fix defects, prepare guide/report and demonstration. | Evidence addresses all FR/NFR acceptance criteria and records remaining limitations. |

Stages map to Term 3 and Term 4; dates and team assignments must follow the course calendar. Do not assign fictitious contributors or completed milestones.

## Decisions to resolve during Stage 1

- Exact initial room catalogue, size bounds, supported privacy/access rules, styles, and roofs.
- Source and approval of clearance assumptions; these are not automatically municipal requirements.
- Pricing location, currency, dated rate sources, included categories, allowance definitions, and contingency base.
- 3D rendering library, supported devices, visual fallback, and export renderer/storage.
- Maximum supported brief complexity, candidate limits, performance budgets, and whether a separate worker is necessary.
- Data retention, project archival, future uploads, and treatment of the legacy catalogue UI.

## Migration approach

Keep current users and prototype data. Introduce versioned additive migrations and new modules before retiring catalogue flows. The target ERD is not executable SQL. Do not convert house-plan images into generated floor geometry or saved catalogue bookmarks into confirmed briefs. Keep old cost calculations distinguishable from the new model.

## Risks and actions

| Risk | Action |
|---|---|
| Generator cannot reliably find sensible layouts | Prototype early; constrain room types and arrangements; keep explicit validation and search diagnostics. |
| Preview is attractive but inconsistent with plan | Render shared saved geometry; inspect paired views and export manifest. |
| Incomplete pricing gives misleading affordability | Validate pricing completeness and units; show assumptions and dates; block false feasibility claims. |
| New scope exceeds delivery capacity | Deliver the integrated core workflow first; defer terrain, multiple floors, photorealism, and detailed engineering. |
| Expert feedback unavailable | Record assumptions and evaluation limits; seek supervisor or available practitioner review. |
| Database changes lose existing work | Use backups and additive migrations; verify ownership and rollback before migration. |

## Proposed final demonstration

Create a project, answer architect-style questions, confirm a brief, generate options, explore matching plan/model/costs, change an optional need, compare versions, and download a selected concept. Show one conflicting brief and one bounded-search outcome. Finish with an administrator publishing a new pricing release and demonstrate that an older saved estimate retains its original assumptions.
