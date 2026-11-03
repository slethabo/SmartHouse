# Frontend Prototype Progress

## Latest: architectural floor-plan symbols

*Author: Lethabo Sangweni (November 2026)*

The generated floor plan now follows standard architectural drawing conventions
instead of painting doors and windows over continuous wall lines.

- **Walls** are drawn as solid pieces with real gaps cut at every door and window.
  Wall ends meeting other walls are extended so corners close cleanly. Exterior walls
  (0.22 m) are drawn thicker than interior walls (0.11 m).
- **Hinged doors** are shown fully open at 90 degrees with a quarter-circle swing
  back to the far jamb. A door opens into the more private room (bathroom > walk-in
  wardrobe > bedroom/office/utility > garage > living spaces > halls). It hangs
  0.15 m from a corner where possible. The generator tries both corners and then the
  centre of the shared wall, keeping the position whose swing least overlaps
  furniture and earlier door swings in that room.
- **Front doors** swing inwards; the gold entrance marker sits outside the door.
- **Open connections** (for example living room to hall) are drawn as archways:
  a wall gap with dashed lines across both wall faces. Previously, openings on
  vertical walls incorrectly showed an oversized door leaf and arc.
- **Windows** are framed openings within the wall thickness with glazing lines.
- **Garage doors** are a dashed line across the opening.
- Horizontal halls keep their label horizontal (the bedroom lobby label was
  previously rotated and clipped), and dashed "requested addition" outlines sit
  inside the walls instead of on them.

Door data keeps its existing `axis`, `x`, `y`, `length` and `connects` fields, so
the 3D model and estimator are unchanged. Hinged doors and entrances also carry
`hinge` (`start` or `end`), `swing` (+1/-1 along the wall normal) and `swingInto`
(room id). Placement lives in `client/src/demo/templateGeometry.js` and drawing in
`client/src/components/plans/ConceptDrawings.jsx`. Concepts are regenerated from the
confirmed brief, so existing projects show the new drawing without migration.

This revision also removed merge-conflict markers left by the roof commit in
`client/tests/prototype.test.cjs` and `client/src/pages/HouseConceptPage.jsx`,
which had stopped the prototype tests and page from running. With these changes,
`npm run test:prototype` passes 26 tests. Two estimator pricing tests fail for
reasons unrelated to this work.

Known limitation: in very small rooms a door leaf can still sit close to a fitting
(for example the toilet in a compact second bathroom).

## Dataset-derived layout families

The generator now adapts three visually reviewed source plans (649, 1115 and 979)
from the supplied training dataset. Consultation adds optional room-size profiles,
layout preference and actual additional spaces: main en-suite, walk-in wardrobe,
dining, entertainment and double garage. Premium finish remains a pricing choice.
Shared room/wall/opening geometry drives the plan, exterior and 3D model. The result
page identifies the source, displays its original image separately, explains the
adaptation and compares alternative families. Original source images and licence
attribution are packaged locally; no model was trained. Dimensions are prototype
assumptions rather than recovered source measurements. See
[dataset implementation](DATASET_TEMPLATES.md) for scope and integration details.

## Earlier milestones

Consultation refinement now adds step-level validation for Save & continue while
keeping incomplete Save draft operations available. Required-answer progress and
section completion follow visible conditional questions. Style, finish and kitchen
choices use descriptive cards; question hints and impact labels distinguish
generated behaviour from recorded-only needs. Brief review shows an initial demo
estimate/plot check, explicit unsupported-site or unknown-terrain messages, and
the limitations of recorded requirements. Shared frontend rules live in
`client/src/utils/consultation.js`. The prototype test runner now has 12 passing
cases, including conditional progress, empty selections, whitespace-only answers,
and preservation of unsupported-site drafts. This work does not connect Supabase.

The consultation result now opens a dedicated house presentation page with a front
exterior gallery, six selectable views, room/area specifications, a budget summary,
cost allocations, plot-fit information and SVG/JSON downloads. Its visual language
uses forest green, warm neutral surfaces and editorial typography. All illustrations
still use the generated geometry; no unrelated house renders or payment flows were
added. `PrototypeConcept` remains the existing import entry point and delegates to
`HouseConceptPage`. Shared SVG drawings live in `components/plans/ConceptDrawings.jsx`.
The page still consumes the local adapter's confirmed brief, not Supabase records.
See [house page integration contract](HOUSE_CONCEPT_PAGE.md) for the data handoff.

The active prototype runs entirely in React/Vite, with localStorage persistence and illustrative catalogue/pricing data. No backend, PostgreSQL, or login is required. Run `npm run dev` and open the displayed URL.

Users can create projects, complete conditional consultation questions, save/resume drafts, confirm briefs, explore schematic room arrangements and costs, and download SVG floor plans and JSON summaries. Library browsing, saved designs, and demo rate edits also run locally. Data stays in this browser; previous backend records remain separate and unchanged.

The prototype now uses a front living zone and a central hallway with bedrooms and bathrooms on either side. Floor plans show indicative furniture, door swings, windows, and dimensions. The concept now opens with an interactive Three.js house viewer: drag/touch rotation, wheel/pinch zoom, overview/front/above camera presets, and roof removal with lowered walls for interior inspection. The mesh geometry comes from the shared floor-plan data. A front elevation fallback is shown when WebGL is unavailable. Static exterior views remain available. Front, side, and perspective views show the selected architectural style and corresponding openings. Floor plans and cutaway views are available separately. Materials and landscaping are illustrative. Plot and budget conflicts are shown explicitly. This is an adaptable layout pattern, not a full 3D editor or validated construction drawing. Detailed clearances, engineering, accessibility and regulatory checks remain future work.

Backend specifications and source are retained for later implementation. The frontend demo adapter in `client/src/demo/store.js` now supplies the operations previously served by the API. `npm run test:prototype` verifies persistence, confirmation, conflict handling, local catalogue operations, and storage failure feedback without a network.

Project pages now separate Your house from Edit brief. Confirmed projects open in the design workspace. Brief review sections and design explanations are collapsed by default; consultation actions stay near the viewport edge. The dashboard header and 3D viewport are compact to reduce vertical scrolling.


### Source-plan architecture revision

The active generator now uses `sourceLayouts.js` cores instead of rectangular
column packing. The three sources retain distinct room relationships and footprint
setbacks. Extra rooms form marked additions. Shared `architecture.js` geometry
provides a deterministic roof-section algorithm for intersecting gables or
multi-hip roofs. It partitions the occupied footprint into rectangular sections,
creates pitched planes, eaves, gable infill, metal standing seams or tile courses,
and feeds the shared geometry to the Three.js model and SVG exterior. Where the
room program places social and private spaces in separate wings, the private roof
uses a perpendicular ridge for a cross-gable form. Automatic selection maps
Traditional to multi-hip and Modern/Minimalist to gables; users can override this
in the consultation. A browser smoke test rendered both roof choices in the
interactive 3D view. This concept geometry does not resolve structural framing,
flashing, drainage or waterproofing. Generated snapshots are schema 5 /
`source-plans-v4-roof-sections`; persist roofForm/roofDesign, terraces, room
zones/addition flags and wall ownership alongside existing geometry.
