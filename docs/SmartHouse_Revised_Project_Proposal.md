# Software Engineering Capstone Project Proposal

## SmartHouse: Personalised Architectural Design and Cost Planning Platform

**Team:** FivePlusOne Devs  
**Course:** CSC 312 — Software Engineering Group Project  
**Delivery period:** Term 3 and Term 4  
**Status:** Revised proposal

## 1. Project Abstract

SmartHouse is a web-based architectural planning platform that helps prospective homeowners develop a personalised house concept based on their land, construction budget, household needs, lifestyle, and design preferences. The platform begins with a guided consultation that asks the kinds of questions an architect would ask when preparing a residential design brief. It uses the answers to generate and refine a house concept, supported by a floor plan, a visual model, and an estimated construction cost breakdown.

Users will review and confirm their design brief before generating design options. They will then explore the proposed house, request supported changes, compare the resulting costs, and download a concept design package. The floor plan, visual model, and estimate will be derived from a shared design representation so that they describe the same proposed house.

The capstone will focus on a constrained residential design generator rather than unrestricted architectural generation. Reusable room components and explicit layout rules will produce personalised arrangements within supported plot shapes and building types. The platform's outputs will support early design decisions and subsequent professional review; producing approved construction drawings is outside the initial scope.

## 2. Problem Statement

Prospective homeowners often struggle to translate their needs into a house design that fits both their plot and budget. Existing plans may offer a useful starting point, but they can fail to reflect a household's daily routines, privacy needs, accessibility requirements, preferred appearance, and future plans. A floor plan alone can also be difficult for a non-specialist to interpret, while a visual image alone does not explain room dimensions or affordability.

The proposed system addresses these difficulties by collecting a structured architectural brief and connecting personalised spatial design, visual exploration, and cost planning in one workflow. When a user's requirements cannot be met within the supported constraints or budget, the platform will explain the conflict and offer feasible adjustments rather than presenting an unsuitable design as a successful result.

## 3. Aim and Objectives

### Aim

To develop a personalised architectural planning platform that turns a user's site information, budget, and household requirements into an explorable house concept with a corresponding floor plan and estimated construction costs.

### Objectives

1. Collect site information, household needs, lifestyle preferences, and budget assumptions through a guided consultation.
2. Create an editable design brief that distinguishes essential requirements from optional preferences.
3. Generate personalised layouts using room components, spatial constraints, and explicit design rules.
4. Validate supported constraints, including plot fit, room dimensions, circulation, and estimated budget fit.
5. Present an interactive visual model and floor plan generated from the same design data.
6. Calculate an understandable cost breakdown using configurable pricing data and stated assumptions.
7. Allow users to refine supported design features and inspect their effect on the layout and estimated cost.
8. Allow users to save projects and download a concept design package.
9. Provide administrative tools to maintain room components, design rules, and pricing records.
10. Evaluate the system through automated checks, scenario testing, and user feedback.

## 4. Stakeholders

| Stakeholder | Role and needs |
|---|---|
| Prospective homeowners | Provide their requirements, explore design options, understand tradeoffs, and save or download a preferred concept. |
| Architects and house designers | Help define consultation questions, room relationships, and design rules; review the usefulness of generated concepts. |
| Contractors and cost estimators | Provide or review cost assumptions, construction categories, and pricing records. |
| System administrators | Maintain system content, supported design configurations, pricing data, and user access. |
| Project supervisors and assessors | Evaluate the implementation, software engineering process, evidence of testing, and fulfilment of the agreed scope. |

## 5. Architectural Consultation and Design Brief

The consultation will use a step-by-step questionnaire with conditional follow-up questions. Users will be able to revise their answers before confirming the brief. Required inputs will be distinguished from optional information, and assumptions will be shown when information is unavailable.

| Consultation area | Information collected | Design purpose |
|---|---|---|
| Site and location | Plot width and length, supported plot shape, location, road access, orientation, and known site constraints | Establish the available footprint and access conditions. |
| Budget | Construction budget, included and excluded costs, finish level, and contingency preference | Define the estimated affordability limit and cost assumptions. |
| Household | Number of occupants, household composition, guests, and expected changes | Determine room needs and future flexibility. |
| Accommodation | Bedrooms, bathrooms, kitchen, living and dining spaces, and optional rooms | Establish the required spaces and approximate sizes. |
| Lifestyle | Working from home, entertaining, cooking, storage, and outdoor activities | Guide room relationships and allocation of space. |
| Privacy and accessibility | Separation of private and shared spaces, step-free access, and other stated needs | Apply supported circulation and layout preferences. |
| Appearance and comfort | Supported architectural styles, roof options, natural light priorities, and outdoor connections | Personalise the visual design and relevant layout choices. |
| Priorities and future plans | Essential features, optional features, future extensions, and phased construction intentions | Rank tradeoffs and record requirements for future review. |

For example, a user who works from home will receive follow-up questions about office size, noise separation, and visitor access. A user who regularly hosts guests will be asked about guest accommodation and shared spaces.

Not every collected preference will be automatically implemented in the first release. The confirmed brief will identify which requirements are supported by the generator and which are recorded for professional review or future development.

## 6. Proposed User Workflow

1. The user registers or signs in and creates a house project.
2. The user completes the architectural consultation, including plot details and budget.
3. The platform presents an editable summary of requirements, priorities, and assumptions.
4. The user confirms the design brief.
5. The platform generates feasible personalised design options within its supported design space.
6. The user explores a floor plan, interactive visual model, and estimated cost breakdown for each option.
7. The user adjusts supported preferences or chooses suggested tradeoffs, then regenerates or updates the concept.
8. The user saves a preferred version and downloads a concept design package containing the brief, floor plan, visual views, and estimate assumptions.

If no feasible option is found, the platform will identify the constraints preventing a match and suggest changes such as reducing floor area, removing an optional room, changing finishes, or revising the budget. Essential requirements will not be silently removed.

## 7. Project Scope

### Initial Release

The initial release will support rectangular plots and single-storey residential concepts using a limited, documented collection of room types, architectural styles, roof forms, and finish levels. Plot orientation, access location, and configurable boundary clearances will be considered where supported. Boundary clearance checks will use explicit project assumptions and will not be presented as proof of local regulatory approval.

The generator will create personalised arrangements from reusable room components rather than simply selecting complete houses from a predefined catalogue. Personalisation will be demonstrated through differences in room count, room sizes, relationships between spaces, appearance choices, and budget tradeoffs. Different inputs may produce similar designs when the feasible choices are limited; the system will not promise a unique design for every user.

The visual output will be a simplified interactive 3D model with supported finishes and exterior features. Photorealistic rendering is an optional extension. Any supplementary generated images must be labelled illustrative unless their correspondence with the design model can be established.

Cost planning will initially use one explicitly documented pricing context and currency, with administrator-maintained rates. The platform will show the date and assumptions associated with the estimate.

### Outside the Initial Scope

- Unrestricted generation for arbitrary plot shapes, terrain, or building types.
- Multi-storey design and detailed structural engineering.
- Automated site surveying, soil assessment, and terrain analysis.
- Detailed electrical, plumbing, and other building service drawings.
- Certification of compliance with all local planning or building requirements.
- Submission of plans for approval or production of approved construction drawings.
- Guaranteed construction prices or automatic procurement and contractor management.

These boundaries keep the capstone deliverable achievable while preserving the longer-term architectural platform vision.

## 8. Functional Requirements

| ID | Requirement |
|---|---|
| FR01 | Users shall be able to register, sign in, and manage their own saved projects. |
| FR02 | The system shall provide a guided consultation with conditional questions and input validation. |
| FR03 | Users shall be able to specify plot dimensions, construction budget, required spaces, supported preferences, and priorities. |
| FR04 | The system shall produce an editable design brief and require its confirmation before generation. |
| FR05 | The system shall generate personalised design options using supported room components and layout rules. |
| FR06 | The system shall check generated layouts against supported site, spatial, and budget constraints and explain detected conflicts. |
| FR07 | The system shall display a floor plan with labelled rooms and dimensions. |
| FR08 | The system shall display an interactive visual model derived from the same design data as the floor plan. |
| FR09 | The system shall calculate estimated costs and display their categories, rates, assumptions, exclusions, and contingency. |
| FR10 | Users shall be able to revise supported requirements and view updated designs and estimates. |
| FR11 | Users shall be able to save and compare design versions. |
| FR12 | Users shall be able to download a concept design package containing the confirmed brief, floor plan, visual views, and estimate. |
| FR13 | Administrators shall be able to maintain room components, supported styles, design rules, and pricing records. |
| FR14 | The system shall record the pricing and rule versions used for a saved design so that its assumptions remain traceable. |

## 9. Non-Functional Requirements

- **Usability:** The consultation and design views shall use clear language, visible progress, understandable units, and explanations of tradeoffs.
- **Accessibility:** Forms and primary controls shall support keyboard use, labelled inputs, and readable contrast. A textual design summary shall complement visual exploration.
- **Consistency:** The floor plan, visual model, downloadable package, and cost calculation shall use the same saved design version.
- **Reliability:** The system shall reject invalid inputs, handle failed generation gracefully, and prevent unvalidated layouts from being presented as feasible designs.
- **Performance:** Generation shall have a bounded execution time and a progress or loading state. Measurable response-time targets will be agreed after an initial prototype and tested on documented hardware and sample cases.
- **Security and privacy:** Authentication, project ownership checks, administrator permissions, and validation shall protect user accounts and project information.
- **Maintainability:** Consultation, layout generation, validation, costing, visualisation, and exports shall be separated into modules with documented interfaces.
- **Responsiveness:** The consultation, floor plan, and project management views shall work on desktop and mobile screens. The visual viewer shall provide a fallback when 3D support is unavailable.
- **Transparency:** The system shall distinguish validated constraints, estimated values, recorded preferences, and matters requiring professional review.

## 10. Proposed Technical Approach

### Design Generation

The system will convert the confirmed brief into a structured collection of spaces, required relationships, priorities, and site constraints. A rule-based or constraint-based generation approach will place and size room components within the supported footprint. Candidate layouts will be validated before feasible options are ranked against optional preferences and estimated cost.

Examples of checks include room overlap, footprint fit, minimum configured room dimensions, doorway and circulation connectivity, and required room counts. The initial algorithm will use a bounded search so that an infeasible brief cannot cause unlimited generation attempts. A failed search will be reported as an inability to find a supported feasible option, rather than proof that no architectural solution exists.

### Shared Design Representation

A saved design will contain site dimensions, room geometry, doors, windows, supported exterior features, material selections, brief version, rule version, and pricing version. Floor plan rendering, 3D visualisation, costing, and exports will consume this shared representation.

### Cost Estimation

The estimator will calculate costs using documented quantities and configurable rates for supported categories such as foundations, walls, roofing, finishes, and services allowances. The calculation method for each category will identify whether it is quantity-based, area-based, or an allowance. Labour, contingency, and exclusions will be shown explicitly. Estimates will be described as planning estimates rather than quotations.

### Application Modules

1. Authentication and project management.
2. Consultation and design brief management.
3. Layout generation and constraint validation.
4. Floor plan and visual model rendering.
5. Cost estimation and pricing management.
6. Design version comparison and export.
7. Administration and content management.

AI-assisted interpretation or visual styling may be explored as extensions. Core feasibility checks and cost calculations will remain explicit and testable.

## 11. Software Engineering Process and Practices

The team will use Agile Scrum with short sprints, a prioritised backlog, sprint reviews, and regular stakeholder feedback. The highest-risk work—layout generation, consistent visualisation, and cost assumptions—will be prototyped early.

Software engineering activities will include requirements elicitation, low-fidelity prototyping, use case and class modelling, modular architecture, version control, code review, risk tracking, and continuous testing. Changes to scope will be evaluated against the delivery timeline and the agreed core workflow.

The proposed toolchain includes Git and GitHub for collaboration, Jira or Trello for backlog management, Figma for interface prototypes, Visual Studio Code for development, and a relational database such as PostgreSQL or MySQL for persistent data. The implementation stack and 3D library will be confirmed after reviewing the existing project and conducting the technical prototype.

## 12. Testing and Evaluation

Testing will verify both application behaviour and the internal consistency of generated designs.

- **Unit testing:** Input validation, geometry calculations, constraint checks, and cost calculations.
- **Integration testing:** Consultation-to-brief processing, generation-to-rendering consistency, saved versions, and export generation.
- **Scenario testing:** Small plots, restrictive budgets, conflicting requirements, different household needs, invalid dimensions, and unsupported requests.
- **Access testing:** Project ownership, administrator permissions, and unauthorised access attempts.
- **User acceptance testing:** Users complete the consultation, interpret a proposed house, revise a requirement, and download a preferred concept.
- **Expert feedback:** Where available, designers review spatial usefulness and cost practitioners review estimate assumptions.

Acceptance evidence will demonstrate that supported mandatory constraints pass validation, cost totals can be reproduced from stored quantities and rates, all representations reference the same design version, and infeasible inputs produce an explanation. Usability and performance targets will be recorded before final evaluation.

## 13. Key Risks and Mitigation

| Risk | Mitigation |
|---|---|
| Layout generation becomes too complex | Limit the initial building type and plot shape; prototype a small set of room arrangements and validation rules early. |
| Visual previews differ from floor plans | Generate both from shared geometry and verify representative designs across views. |
| Pricing data is incomplete or outdated | Use a documented pricing context, show rate dates and assumptions, and support administrator updates. |
| User requirements exceed the supported design space | Identify unsupported requirements and explain feasible tradeoffs without silently changing essential needs. |
| The project expands beyond the academic timeline | Prioritise the complete consultation-to-download workflow and defer advanced terrain, structural, and rendering features. |
| Users interpret concepts as approved construction documents | Clearly identify the concept stage in the viewer and exported package and record matters requiring professional review. |
| Limited access to expert stakeholders | Document assumptions, seek available supervisor or practitioner feedback, and report validation limits in the final evaluation. |

## 14. Delivery Plan

| Stage | Main deliverables |
|---|---|
| Term 3: requirements and feasibility | Stakeholder findings, consultation questions, scope agreement, wireframes, data model, and an early generation and visualisation prototype. |
| Term 3: core implementation | Authentication, project management, editable design briefs, initial layout generation, and constraint checks. |
| Term 4: integrated product | Consistent floor plan and visual viewer, cost breakdowns, supported revisions, saved versions, and administration. |
| Term 4: evaluation and delivery | Downloadable concept packages, integration and user testing, defect fixes, technical documentation, and final demonstration. |

Detailed sprint dates and responsibilities will be set according to the course calendar and team capacity.

## 15. Expected Deliverables and Success Criteria

The project will deliver a working web prototype, source code, requirements and architecture documentation, a documented design and pricing dataset, test evidence, a user guide, and a final capstone report and demonstration.

The prototype will be considered successful when a user can complete a consultation, confirm a design brief, receive a feasible personalised concept within the supported scope, explore consistent floor plan and visual views, understand the estimated cost assumptions, revise a supported requirement, and download the selected concept package. It must also explain when it cannot satisfy a brief.

The project's contribution is an integrated architectural consultation and design planning workflow that makes household requirements, spatial choices, visual outcomes, and estimated affordability understandable to the user.
