# Elam Development Process

This document records the SmartHouse changes discussed and completed in this development thread, their implementation areas, validation, and known follow-up work. It describes the repository state checked on 3 November 2026.

## 1. Budget inclusions questionnaire

The “What does your budget include?” question was changed from free text to a required multi-select question. Clients can select multiple inclusions.

Related implementation areas:

- `client/src/demo/consultation.json` defines the answer options and multiselect field.
- `client/src/components/forms/ConsultationQuestion.jsx` renders the checkboxes.
- `client/src/utils/consultation.js` and `client/src/demo/validation.js` validate selections.
- `server/src/modules/projects/consultation.js` validates the server-side consultation.
- `client/src/pages/ProjectsPage.jsx` handles saved answers, including migration of matching values from older text answers.
- `client/src/components/forms/ConsultationReview.jsx` and `client/src/pages/HouseConceptPage.jsx` display the selected inclusions.

The selections are recorded in the brief, but are not treated as a guarantee that every listed item is already represented in the generated quantities or estimate.

## 2. House layout and 3D model

The house concept is generated from questionnaire answers and floor-plan data. The main flow is:

1. Questionnaire answers are validated and saved.
2. `client/src/demo/layout.js` creates a concept using the selected layout and room requirements.
3. The generated house data is passed to the gallery and model components.
4. `client/src/demo/houseModel.js` builds the procedural Three.js model.

The work expanded the layout and modelling system so supported preferences influence the generated house rather than only changing a palette. This includes room counts, kitchen arrangement, office/workspace requests, windows and doors, and architectural/roof selections where supported. Reusable architectural configuration is in `client/src/demo/architecturalStyles.js`.

The roof-system update added an “Automatic”, “Intersecting gables”, or “Multi-hip” choice. Automatic selection follows the architectural style. Roof sections are derived from the generated room footprint, and the model and roof tests check room coverage, cutaway behavior, and geometry validity.

The interactive viewer continues to use Three.js and the shared generated house model. Model cleanup/disposal and existing viewing controls are retained.

## 3. Price estimation and itemized disclosure

The estimator uses two local data sources:

- `smart_house_products.json` for fixed, in-stock catalogue prices.
- `client/src/demo/material_price_benchmarks.json` for researched South African prices for selected materials not suitably priced in the catalogue. The benchmark file includes units, averaging methods, source prices, and source URLs.

`client/src/demo/productCatalogue.js` loads and validates both data files. `client/src/demo/estimator.js` estimates quantities from the generated house and calculates line totals from the applicable unit rates. The catalogue-priced lines include bricks, concrete mix, and gutters. Benchmark lines include windows, ceiling boards, insulation, and—where applicable—roof sheeting and trusses. Sloped-roof-specific lines are excluded for flat roofs.

The first correction removed an unsupported residual-per-square-metre allowance, but it temporarily made the estimate priced-materials-only and excluded labour, services and other work. That interim behavior has now been replaced: the estimate uses a conservative South African base construction rate for the selected Basic, Standard or Premium finish, then adds lower-end professional-fee and contingency shares. Materials, labour and direct services are split within the base rate. The benchmark file records the rates, sources, assumptions and shares.

Catalogue and researched material line totals are deducted from the materials allocation; they are not added on top of it. The remaining materials allocation covers materials and finishes without individual fixed prices. If individually priced materials exceed that allocation, only the excess is added. The breakdown also includes labour, services and specialist work, professional fees/compliance, and contingency, and its category rows sum exactly to the displayed estimate. This remains an early planning estimate, not a supplier quote or a quantity-surveyor estimate.

The concept page has a collapsed disclosure immediately below the estimated amount, labeled **“View detailed price breakdown.”** It expands to show material quantities, unit rates, line totals, assumptions, catalogue SKUs or research sources, the construction-rate method and sources, and the category totals. The estimate and methodology are included in the downloaded concept data.

## 4. Branch merge and reported build errors

Estimator work was committed on `elam-development` as `0442b78` (`Add researched material pricing to estimates`). It was then merged into `main` as `5f578c9` (`Merge estimator pricing into main`), preserving `main`’s newer dataset-based house layout and excluding unrelated 3D work from that estimator merge.

After a later rebase, Vite reported a JSX parse error because conflict markers remained in `HouseConceptPage.jsx`. The same problem was present in `client/tests/prototype.test.cjs`. Those markers were removed while retaining the estimator setup and the newer roof/model test setup. The updated roof system also revealed outdated estimator assumptions for gutter quantities and flat-roof detection; these were aligned and covered by tests.

These repairs were committed as `38fa018` (`fixed merging conflicts`). The user-requested price disclosure wording and styling are present in the current page and stylesheet.

## 5. Verification

The latest checks completed after the conflict and estimator fixes:

- `npm run test:prototype` — 28 tests passed.
- `npm run lint --workspace client` — passed.
- `npm run build --workspace client` — passed.
- Conflict-marker search — no remaining markers in source files.
- The browser preview was used to open the price disclosure and confirm it showed catalogue and researched price lines.

The production build still prints a warning about JavaScript chunks larger than 500 kB. This did not fail the build and was not changed as part of this work. An earlier `npm install` also reported dependency audit findings; no broad dependency upgrades were made for this task.

## 6. Current repository state and follow-up

At the time this document was prepared, `main` was at `38fa018`, matched `origin/main`, and had no pre-existing worktree changes. This document is a new, untracked file until the user chooses to stage it. No changes were staged or committed as part of writing this document.

After that check, the area-rate top-up was removed from the catalogue estimator because it could make the unpriced-cost line misleadingly large. The priced-material estimate now excludes unsupported unpriced costs. This follow-up change has not been committed.

The requested visual consistency between the front, side, and perspective gallery drawings and the interactive Three.js model remains a follow-up: the current gallery still renders `HouseElevation` for front and side views and `HousePreview` for perspective, while the interactive view renders `House3DView`. These drawings share the generated house data but are not currently rendered from the same Three.js geometry.
