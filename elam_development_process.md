# Elam Development Process

This document records the SmartHouse changes discussed and completed in this development thread, their implementation areas, validation, and known follow-up work. It describes the repository state checked on 6 November 2026.

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
2. `client/src/demo/datasetLayout.js` selects a source-plan family and creates a concept using the requested rooms and layout.
3. The generated house data is passed to the gallery and model components.
4. `client/src/demo/houseModel.js` builds the procedural Three.js model.

The layout and modelling system supports room counts, kitchen arrangement, office/workspace requests, windows and doors, and architectural/roof selections. Reusable roof and geometry logic is in `client/src/demo/architecture.js`.

The prototype supports one-, two-, and three-storey homes. `client/src/demo/multiStorey.js` creates stacked layouts, stairs, and floor plates; `client/src/components/plans/MultiStoreyDrawing.jsx` is reused for multi-storey elevations and previews. The roof-system update added an “Automatic”, “Intersecting gables”, or “Multi-hip” choice. Automatic selection follows the architectural style. Roof sections are derived from the generated room footprint, and the model and roof tests check room coverage, cutaway behavior, and geometry validity.

The questionnaire no longer asks users to select plot shape or slope. Generated briefs state a flat, rectangular plot assumption, and retain that assumption for single- and multi-storey projects. The interactive viewer continues to use Three.js and the shared generated house model. Model cleanup/disposal and existing viewing controls are retained.

## 3. Price estimation and itemized disclosure

The estimator uses two local data sources:

- `smart_house_products.json` for fixed, in-stock catalogue prices.
- `client/src/demo/material_price_benchmarks.json` for researched South African prices for selected materials not suitably priced in the catalogue. The benchmark file includes units, averaging methods, source prices, and source URLs.

`client/src/demo/productCatalogue.js` loads and validates both data files. `client/src/demo/estimator.js` estimates quantities from the generated house and calculates line totals from the applicable unit rates. The catalogue-priced lines include bricks, concrete mix, and gutters. Benchmark lines include windows, ceiling boards, insulation, and—where applicable—roof sheeting and trusses. Sloped-roof-specific lines are excluded for flat roofs.

The first correction removed an unsupported residual-per-square-metre allowance, but it temporarily made the estimate priced-materials-only and excluded labour, services and other work. That interim behavior has now been replaced: the estimate uses a conservative South African base construction rate for the selected Basic, Standard or Premium finish, then adds lower-end professional-fee and contingency shares. Materials, labour and direct services are split within the base rate. The benchmark file records the rates, sources, assumptions and shares.

Catalogue and researched material line totals are deducted from the materials allocation; they are not added on top of it. The remaining materials allocation covers materials and finishes without individual fixed prices. If individually priced materials exceed that allocation, only the excess is added. The breakdown also includes labour, services and specialist work, professional fees/compliance, and contingency. For multi-storey plans, the stairs and upper-level structure are shown as separate prototype allowances; the category totals plus those allowances sum to the displayed estimate. This remains an early planning estimate, not a supplier quote or a quantity-surveyor estimate.

After reviewing the sample estimate, the Basic rate was researched and lowered from R6,500/m² to AprIQ's published R4,500/m² 2026 low-cost single-dwelling base rate. The labour share remains at 25%, the lower end of the published 25–30% range; it is not capped at R100,000 without a project-specific quote. On the supplied 115.26 m² example, that gives about R129,668 indicative labour and reduces the estimated total from R899,028 to R622,404. The material allocation decreases accordingly. The individual material lines and remaining allowance are shown as details within the single materials category total, not as additional totals. The estimate explicitly excludes contractor profit, preliminaries/general, VAT, land, site works and permits.

The concept page has a collapsed disclosure immediately below the estimated amount, labeled **“View detailed price breakdown.”** It expands to show material quantities, unit rates, line totals, assumptions, catalogue SKUs or research sources, the construction-rate method and sources, and the category totals. The estimate and methodology are included in the downloaded concept data.

## 4. Branch integration and reported build errors

Estimator work was committed on `elam-development` as `0442b78` (`Add researched material pricing to estimates`). It was then merged into `main` as `5f578c9` (`Merge estimator pricing into main`), preserving `main`’s newer dataset-based house layout and excluding unrelated 3D work from that estimator merge.

After a later rebase, Vite reported a JSX parse error because conflict markers remained in `HouseConceptPage.jsx`. The same problem was present in `client/tests/prototype.test.cjs`. Those markers were removed while retaining the estimator setup and the newer roof/model test setup. The updated roof system also revealed outdated estimator assumptions for gutter quantities and flat-roof detection; these were aligned and covered by tests.

These repairs were committed as `38fa018` (`fixed merging conflicts`). The user-requested price disclosure wording and styling are present in the current page and stylesheet.

On 6 November, `main` was rebased onto the latest `origin/main` while preserving the three local pricing commits. Pricing changes were reconciled with the incoming multi-storey layout and drawings, and the estimator and regression tests were updated to use the current three-argument estimator API. The pull also brought dependency updates, removal of plot-shape/slope questionnaire options, and related documentation changes. The subsequent “Preserve site assumptions across storey counts” change fixed single-storey assumption wording for multi-storey briefs and added regression coverage. The latest `fix login` change maps lazy-loaded pages with named exports to their default exports so React Router can load them correctly.

## 5. Verification

- `npm run test:prototype` — 32 tests passed, including multi-storey layout, model, and estimate checks.
- `npm run lint --workspace client` — passed after the estimate update.
- `npm test --workspace server -- --runInBand tests/consultation.test.js` — 5 tests passed, including single- and multi-storey site assumptions.
- `npm run build` — passed with the revised estimate disclosure.
- The production build still warns that some JavaScript chunks exceed 500 kB; this does not fail the build.

The dependency update was part of the upstream changes. `npm install` reported six low-severity audit findings; no forced audit fix was applied.

## 6. Current repository state and follow-up

Before this documentation edit, `main` was at `1eb19f0` (`fix login`), matched `origin/main`, and had a clean worktree. `.env` remains ignored and untracked. This document is tracked; the update is currently unstaged.

Multi-storey elevations and previews now use the shared `MultiStoreyDrawing` SVG component, but gallery drawings and the interactive viewer are still rendered by separate SVG and Three.js implementations. Rendering every gallery view from the same Three.js geometry remains a possible follow-up.
