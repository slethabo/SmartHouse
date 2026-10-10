# SmartHouse Documentation

**Team:** FivePlusOne Devs | **Course:** CSC 312 | **Revision:** 10 October 2026

SmartHouse is being redesigned as a personalised architectural design and cost planning platform. These specifications follow the [revised proposal](SmartHouse_Revised_Project_Proposal.md).

## Reading order

For the active frontend-only implementation and prototype limitations, see [prototype progress](PROTOTYPE_PROGRESS.md). The specifications below remain the broader target; the initial implementation deliberately uses simple schematic concepts.

| Document | Purpose |
|---|---|
| [Requirements](REQUIREMENTS.md) | Scope, actors, use cases, requirements, and acceptance criteria. |
| [Architectural consultation](CONSULTATION.md) | Questions, conditional follow-ups, priorities, and confirmation of the design brief. |
| [Architecture](ARCHITECTURE.md) | Target modules, shared design contract, generation workflow, and system boundaries. |
| [Data model](ERD.md) | Proposed entities, relationships, ownership, versioning, and migration constraints. |
| [Algorithms](PSEUDOCODE.md) | Consultation, bounded layout generation, validation, costing, and export logic. |
| [API design](API.md) | Proposed endpoints, state transitions, permissions, and errors. |
| [Testing and evaluation](TESTING.md) | Requirement traceability, scenarios, and release acceptance evidence. |
| [Implementation roadmap](IMPLEMENTATION_PLAN.md) | Existing capabilities, gaps, implementation stages, risks, and decisions to resolve. |
| [Current prototype reference](CURRENT_PROTOTYPE.md) | Preserved setup and legacy catalogue documentation. |

## Status convention

The requirements, target architecture, target ERD, pseudocode, and proposed API describe work to implement. They do not claim that the revised platform is already operational. Current source code implements account access, a house catalogue, catalogue recommendations, saved plans, an area-based cost estimator, and administrative management.

All initial deliverables are concept designs. Supported spatial checks and pricing assumptions must be visible; professional approval, detailed engineering, and construction-ready drawings are outside the initial release.

## Core vocabulary

| Term | Meaning |
|---|---|
| Project | A homeowner's design workspace and its versions. |
| Consultation | Guided collection of site, household, lifestyle, and budget information. |
| Design brief | A versioned, user-confirmed interpretation of the consultation. |
| Essential requirement | A supported constraint that must pass for a design to be feasible. |
| Preference | A desirable feature that influences ranking but can be traded off explicitly. |
| Recorded-only requirement | Information retained for review but not automatically implemented by the initial generator. |
| Design version | An immutable geometry and specification snapshot derived from one confirmed brief. |
| Feasible concept | A concept passing all configured mandatory checks and the estimated budget check, within the supported scope. |
| Estimate | A reproducible planning calculation using documented rates and assumptions; it is not a quotation. |
| Concept package | Download containing the brief, floor plan, visual views, estimate, assumptions, and review notes for one version. |

## Agreed initial boundaries

Rectangular plots; single-storey homes; a documented selection of rooms, styles, roofs, and finishes; one documented pricing context and currency; bounded generation. Reusable room components may be assembled into different arrangements. Complete predefined houses are not the core generation mechanism. Similar briefs can produce similar houses.

Do not change these scope boundaries, claim regulatory compliance, or mark a planned requirement complete without updating the linked specifications and recording validation evidence.
