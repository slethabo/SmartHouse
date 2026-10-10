# Software Requirements Specification

**Status:** Target specification; implementation pending. Source: [revised proposal](SmartHouse_Revised_Project_Proposal.md).

## Purpose and scope

The platform converts an architectural consultation into a confirmed brief, personalised house concepts, matching floor plans and visual models, and estimated costs. Users refine and compare options before downloading a concept package. The initial release supports rectangular plots and single-storey houses with limited room types and appearance options. Complex terrain, arbitrary plots, multi-storey structures, detailed engineering, automatic approvals, procurement, and guaranteed prices are excluded.

## Actors

| Actor | Responsibilities |
|---|---|
| Homeowner | Manage own projects, answer questions, confirm briefs, explore designs, revise requirements, and download packages. |
| Administrator | Maintain supported components, styles, rules, pricing, and account access. |
| Architect/designer | Supply domain feedback and review concepts during evaluation. No dedicated professional login is required initially. |
| Contractor/cost practitioner | Review pricing assumptions during evaluation. No procurement workflow is required initially. |

## Use cases

| ID | Use case | Preconditions | Outcome and alternative flow |
|---|---|---|---|
| UC01 | Create a project | Active homeowner session | Owned project created; invalid name is rejected. |
| UC02 | Complete consultation | Owned project | Draft answers saved; conditional fields and unsupported inputs are explained. |
| UC03 | Confirm brief | Valid complete required answers | Immutable confirmed brief; unresolved required inputs prevent confirmation. |
| UC04 | Generate options | Confirmed brief and published rules/pricing | Validated concepts saved, or bounded search returns conflicts or search exhaustion. |
| UC05 | Explore and compare | Owned saved designs | Floor plan, model, and estimate for selected version; viewer fallback if 3D unavailable. |
| UC06 | Revise the design | Existing confirmed brief or design | New brief/version created; earlier saved versions remain available. |
| UC07 | Download concept package | Selected validated design with complete estimate | Package references one version; incomplete generation/export gives a recoverable error. |
| UC08 | Publish configuration | Active administrator session | New immutable rule/component/pricing release; invalid or incomplete configuration rejected. |

## Functional requirements and acceptance

IDs preserve FR01-FR14 in the revised proposal.

| ID | Requirement | Acceptance criterion |
|---|---|---|
| FR01 | Account and project management | Users can register, sign in, create projects, and access only authorised projects. |
| FR02 | Guided consultation | Conditional questions work; drafts can be resumed; invalid values have field errors. |
| FR03 | Site, budget, spaces, preferences, and priorities | Units and required fields are explicit; essential and optional needs are stored separately. |
| FR04 | Editable confirmed brief | Review lists assumptions and support status; confirmation captures a version; edits create a new draft. |
| FR05 | Personalised generation | Supported changes to room needs influence generated geometry; generation does not merely return catalogue records. |
| FR06 | Constraint checks and conflicts | Each feasible option passes mandatory geometry and budget checks; no essential need is silently removed. |
| FR07 | Dimensioned floor plan | Labels, room sizes, units, openings, and orientation agree with stored geometry. |
| FR08 | Consistent interactive model | Model and plan use the same version and geometry; textual/2D fallback is available. |
| FR09 | Reproducible estimate | Categories, quantities, rates, units, pricing date, exclusions, and contingency are visible and reproduce the total. |
| FR10 | Supported revisions | Changing a supported requirement produces a new version and estimate without overwriting the previous version. |
| FR11 | Save and compare | Saved options can be reopened and compared by requirements, area, costs, and tradeoffs. |
| FR12 | Concept package | Download contains brief, plan, views, estimate, assumptions, and concept-stage review notes for one version. |
| FR13 | Configuration administration | Non-admin writes fail; validated configurations can be published; published versions remain traceable. |
| FR14 | Rule and pricing traceability | Saved designs retain brief, generator, rule, component, and pricing version identifiers and calculation inputs. |

## Non-functional requirements

| ID | Quality requirement | Evaluation |
|---|---|---|
| NFR01 | Clear, responsive consultation | Users complete core tasks on desktop and mobile; errors explain how to proceed. |
| NFR02 | Accessible primary workflow | Keyboard operation, labelled fields, visible focus, readable contrast, and equivalent textual design information reviewed manually. |
| NFR03 | Representation consistency | Automated cross-view checks and package manifest verify a common design version. |
| NFR04 | Reliable generation | Search has attempt/time bounds; invalid or unvalidated layouts are not labelled feasible. |
| NFR05 | Performance | Record prototype benchmarks, agree numeric budgets before evaluation, then measure typical and worst supported cases on stated hardware. |
| NFR06 | Security and privacy | Test ownership, role checks, session expiry, server validation, and protected exports. |
| NFR07 | Maintainability | Pure geometry/cost engines have documented contracts; repositories and HTTP handling remain separate. |
| NFR08 | Transparent assumptions | Each option explains checked constraints, estimates, unsupported needs, and outstanding review matters. |

Numeric performance limits, supported room minima, style choices, and rate data are decisions to validate, not established regulatory or market facts.

## Business rules

- Required site dimensions and budget must be finite and positive. Budget currency and included costs must be explicit.
- Unknown site facts remain unknown or explicit assumptions; the platform must not invent surveyed information.
- Unsupported essential requirements block generation until the user revises them or accepts their recorded-only status explicitly.
- Only feasible candidates may be ranked as successful options. Near misses can be shown separately as explanations.
- Ranking rewards stated preferences; spending more or filling more of the plot is not automatically better.
- Configuration changes affect new calculations. Old saved concepts retain their original snapshots.
- Estimated affordability is conditional on recorded assumptions and does not establish a guaranteed build price.

## Change control

The revised proposal is the product baseline. This specification elaborates it. Change requests must identify affected requirements, data contracts, tests, and delivery impact. The team and supervisor should agree scope extensions before adding them to the release backlog.
