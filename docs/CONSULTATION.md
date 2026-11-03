# Architectural Consultation and Design Brief

**Status:** Proposed questionnaire and interaction specification. See [requirements](REQUIREMENTS.md).

## Current frontend implementation

The generator now supports three dataset-derived layout families and the additive
optional keys `spaceLevel`, `layoutPreference` and `homeFeatures`. These control
room sizes, the source family and actual additional rooms, independently of finish
quality. Existing keys/options are retained. See [dataset templates](DATASET_TEMPLATES.md)
for values, defaults, en-suite counting and the server integration contract.

The active questionnaire is `client/src/demo/consultation.json`. The recent UI
refinement changes hints and presentation without renaming question keys or option
values. Its existing `budgetIncludes` multiselect stores an array of option strings.
Consumers must format this array with separators rather than concatenating items.

`client/src/utils/consultation.js` shares validation between the page, review and
local data adapter. Save & continue validates all visible questions in the current
section, including required answers. Save draft checks supplied values but permits
missing required answers. Confirmation checks all visible sections, supported site
scope and acknowledgement. Errors use question keys so the UI can return to the
relevant section and focus the first invalid input. Conditional hidden answers are
retained in the editable draft but are excluded from confirmed local briefs.

The review's initial area/cost/plot check uses the existing layout generator and
its illustrative rates. An over-budget or oversized arrangement can still be
confirmed as a flagged option. Non-rectangular and explicitly sloped sites can be
saved as drafts but cannot generate a concept. Unknown terrain remains explicit;
the preview assumes a flat site. No compliance or construction affordability is
established by these checks.

Supabase integration remains separate work. Its adapter should map database errors
to `error.fields`, maintain revision-conflict handling, validate the same types and
conditional requirements server-side, and preserve existing drafts when a save or
confirmation fails. The frontend validator is user feedback, not a security boundary.

## Interaction principles

Use short steps with visible progress, back navigation, save-and-resume, units, and an editable summary. Explain why a question matters. Offer "I do not know" for optional site facts. Required numeric inputs cannot be replaced with guesses. Each response has a support status: implemented constraint, supported preference, recorded-only information, or unresolved input.

## Question bank

| Step | Questions | Required input and follow-up behaviour |
|---|---|---|
| 1. Project and site | Where will you build? What are the plot width and length? Is the plot rectangular? Which boundary has road access? Do you know north orientation or boundary clearances? Is the site flat or sloped? | Width/length in metres and supported shape required. Location informs pricing context. Unknown orientation is labelled. Slope or irregular shape triggers an unsupported-site explanation. |
| 2. Budget | What is your construction budget and currency? Does it cover fees, site preparation, services, landscaping, and contingency? What finish level would you prefer? | Positive budget and supported currency/context required. Each cost category has included/excluded/unknown status. Resolve unknown mandatory estimate categories before feasibility claims. |
| 3. Household | How many people will live here? How many bedrooms and bathrooms do you need? Will relatives or guests stay? Do you expect the household to grow? | Required room counts stored separately from household narrative. Guest stays prompt guest-space questions; growth prompts future-use notes. |
| 4. Daily activities | Do you work from home? How often do you host people? Do you prefer an open or separate kitchen? What storage, laundry, pantry, and outdoor spaces do you need? | Working from home prompts office size and quietness preferences. Entertaining prompts dining/living relationships. Only supported room types become automatic requirements. |
| 5. Privacy and access | Should bedrooms be separated from entertaining spaces? Does anyone need step-free access or other accessibility features? Do visitors need separate access? | Translate supported privacy/access needs into documented rules. Other accessibility needs remain explicit review items; no blanket accessibility certification. |
| 6. Appearance and comfort | Which supported style and roof do you prefer? How important are natural light, privacy, garden access, and low maintenance? | Choose Automatic, intersecting gables, or multi-hip. Roof geometry is generated from the room footprint. Reference-image upload is optional future work. Unknown orientation limits light-related claims. |
| 7. Priorities and future plans | Which features are essential? Which can change to meet the budget? Might you extend or build in phases? | Every room/feature has priority and support status. Future extension and phased construction are recorded for review unless a specific rule is supported. |
| 8. Brief review | Is this an accurate description of your home? Are the assumptions acceptable? | Show all required spaces, priorities, site inputs, budget inclusions, support limits, and unresolved matters. User confirms only after blockers are resolved. |

Site-plan and reference-image uploads may be added later. The initial workflow must function with entered dimensions and supported selections; no automatic interpretation of uploaded drawings is assumed.

## Conditional follow-ups

| Trigger | Follow-up | Stored effect |
|---|---|---|
| Works from home | Dedicated room? Quiet location? Visitor access? | Office requirement and supported adjacency/privacy preferences. |
| Frequent guests | Overnight guests? Separate bathroom? | Optional guest bedroom/bathroom and privacy priority. |
| Accessibility need | What specific access is needed? | Explicit supported constraints plus recorded review needs. |
| Low budget relative to requested rooms | Which optional features can change? | User-authorised revisions; never automatic removal of essentials. |
| Future extension | Which spaces may expand? | Recorded extension intention; supported reserved-space preference where available. |
| Unsupported site/building request | Can the project use the supported rectangular, single-storey scope? | Explicit scope decision, or project retained without generation. |

## Brief contract

The confirmed brief contains:

- Project and owner identifiers; brief version and confirmation timestamp.
- Site width, length, shape, access edge, orientation if known, clearance assumptions, and pricing location/context.
- Budget amount, currency, included categories, excluded categories, contingency basis, and chosen finish level.
- Space requirements with stable IDs, type, quantity, permitted size range, and essential/optional priority.
- Supported adjacency, privacy, circulation, and appearance preferences.
- Household/lifestyle notes and recorded-only future requirements.
- Support classification for every requirement, assumptions, unresolved review matters, and questionnaire version.

An essential requirement uses a concrete check where supported. For example, "three bedrooms" is a count constraint. "A bright house" is a preference until translated into a supported rule; it must not be presented as a validated daylight analysis.

## Example brief

> Single-storey concept on a 20 m by 30 m rectangular plot, with access from the southern edge. Budget: R1,500,000 in the documented demo pricing context. Three bedrooms and two bathrooms are essential. An office and covered patio are optional. The user prefers an open kitchen and separation between bedrooms and entertaining spaces. Finish level: basic. Site slope and service connections require review. Any configured boundary clearances are concept assumptions.

This is illustrative input, not a claim that the budget can fund this house. Generation must determine estimated feasibility using published rates.

## Revisions and conflicts

Editing a confirmed brief creates a new draft. Previous designs retain the original brief version. A conflict response identifies the requirement IDs involved, whether the cause is unsupported scope, spatial validation, budget, or search exhaustion, and possible user-approved changes. Revised essentials require explicit reconfirmation before generation.
