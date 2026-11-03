# Dataset-derived house concepts

The active generator now uses a small, manually reviewed collection of floor-plan
families from `client/Floor_plan_dataset/archive/train/images`. This replaces the
single front-living/central-corridor layout. It is a rule-based adaptation system,
not a trained image-to-floor-plan model or an exact reconstruction of each scan.

## Reviewed sources

| Template | Dataset source | Reviewed spatial idea | Adaptation |
|---|---|---|---|
| Linear living | 649 | A narrow plan with public rooms beside a private/service band. | Bedroom/service band beside living and kitchen; entrance and rear terrace retained; sauna represented as storage. |
| Split living | 1115 | Bedrooms separated around distinct living and kitchen zones. | Diagonal bedrooms around kitchen/living; stepped outline, recessed entry and side terrace retained. |
| Wide family residence | 979 | Central living/dining, a garage/service wing, and a bedroom wing. | Broad service/garage wing, central shared rooms and right bedroom group; optional accommodation forms explicit additions. |

Files and approximate normalised semantic regions are recorded in
`client/src/demo/floor-plan-templates.json`, ordered by stable source ID. Each
reviewed template now has a stable catalog ID and an explicit program describing
its native bedroom range, spatial pattern, and rule for extending the plan. The
deterministic selector uses the bedroom range; the drawing rules use the recipe.
These are human-reviewed interpretations, not AI predictions.

The full training split is indexed in `client/Floor_plan_dataset/catalog.json`.
Run `npm run catalog:floor-plans` to rebuild it from the paired images, YOLO
annotations, and `data.yaml`. It groups 837 variants into 279 stable source IDs,
orders them numerically, preserves image/label filenames, records normalized
boxes and class counts, and marks room semantics as unreviewed. Verified class
order is `door`, `window`, `zone`; generic zones do not identify bedrooms,
bathrooms, or other room types. The annotations also provide no verified metric
scale, storey count, or roof geometry. Do not treat detection counts as room
counts or infer dimensions from image pixels. The training split contains 6,354
door boxes, 4,853 window boxes, and 6,544 generic zone boxes.

Only the three plans listed above are currently translated into explicit
rule-based layout recipes. The remaining catalog entries are an inventory for
human review, not ready-to-build templates. A plan must be visually reviewed
and its room types, adjacency, entrance, openings, and dimensions explicitly
recorded before the generator can use it. Dimensions currently come from
prototype profiles in `sourceLayouts.js`, not measurements recovered from scans.

The source files were opened and their topology reviewed during implementation.
This is a software/visual review, not architectural certification. Original images
include existing markings and are copied unchanged. Not every original feature is
represented; the review note for each template lists important simplifications.

## Reproducible preparation and attribution

```powershell
node scripts/prepare-floor-plans.cjs
```

This offline script checks the paired source image/label files, copies only the
three selected images into `client/public/floor-plan-references`, retains the
dataset licence notice, and records source SHA-256 hashes in `attribution.json`.
This display-preparation step is separate from the complete training catalog.
Validation/test split images are not used as templates.

Source: Floor Plans 500 v1, Roboflow workspace `umair-ab9ex`, project
`floor-plans-500-xqdyk`. The supplied export declares CC BY 4.0. Source attribution,
original image access and a description of the adaptation are shown on the result
page. The source URL and adaptation notice are embedded in SVG/JSON exports.

## Consultation inputs

These are additive **optional** fields alongside the existing questionnaire keys:

| Key | Values / meaning |
|---|---|
| `spaceLevel` | Compact, Balanced or Generous; changes actual room sizes. Missing values use Balanced. |
| `layoutPreference` | Best fit, Linear living, Split living or Wide family residence. Missing values use Best fit. |
| `homeFeatures` | Array: Main en-suite, Walk-in wardrobe, Separate dining room, Entertainment room, Double garage. Missing values use an empty array. |

Finish quality remains Basic/Standard/Premium and changes the illustrative area
rate independently of the space profile and requested extra rooms. A premium
finish is not a luxury-house classification. The selected additional spaces
actually appear in the room geometry and contribute to area/cost. A main en-suite
uses one requested bathroom; if it is the only bathroom, the result warns that
there is no shared bathroom. Walk-in storage and the en-suite connect through the
main bedroom rather than through a public corridor. A double garage includes a
wide exterior opening. Every enclosed square metre currently uses the same demo
finish rate, including garage/storage space; this is not quantity-based costing.

## Selection and geometry

`layout.js` preserves the existing public function and delegates to
`datasetLayout.js`. Each brief produces three candidates. With Best fit, candidates
prioritise plot fit, then budget fit, then the template's declared bedroom range
and space-profile suitability;
area breaks ties. A Generous brief or garage favours the wide family when fit and
budget checks permit it. An explicit layout preference takes precedence and may
return a flagged conflict. Requested rooms/features are retained even when no
candidate fits. The selected template and other candidates' area/cost/checks are
exposed on the house object and shown in the source section of the result page.

`sourceLayouts.js` defines separate source cores rather than packing all families
into the same two-column arrangement. Source 649 retains its bedroom/service band,
living space, kitchen and rear terrace. Source 1115 retains diagonal bedrooms,
separate kitchen/living zones and an offset entrance. Source 979 retains its broad
garage/service wing, central shared rooms and three original bedroom positions.
Scans are oriented toward arrival and translated into a readable metric drawing;
small service spaces are simplified and dimensions are authored assumptions.

Extra bedrooms, bathrooms and requested rooms extend circulation beyond the core.
They are marked as additions in the object and with dashed outlines on the plan.
Adding accommodation preserves original core positions (apart from translating
the entire drawing origin). Suites project from the main bedroom's outer wall.
The garage and a suite may widen the building. This is an adaptation of three
reviewed plans, not automatic reconstruction of arbitrary dataset images.

`templateGeometry.js` computes the exact union boundary of room rectangles.
Setbacks, recessed walls and outdoor gaps stay outside the enclosed floor area.
Doors and windows use actual exposed segments, including side garage entrances.
Floor area sums occupied rooms, while plot fit includes the full extent of enclosed rooms and terraces.
Terraces are shown separately and excluded from the construction area estimate.

`architecture.js` builds two selectable pitched roof systems from the occupied
footprint. It partitions the union of room rectangles into non-overlapping
rectangular roof sections, with a 0.3 m concept overhang. Intersecting gables use
two sloped planes and gable infill at each section end, with standing-seam
detailing. When the room program separates living/kitchen/dining spaces from
bedrooms along one axis, it deterministically gives the private wing a perpendicular
ridge to produce an actual cross-gable intersection.
Multi-hip roofs use four planes per section, joining at ridges/hip lines, with
tile-course detailing. The default is multi-hip for Traditional style and
intersecting gables for Modern or Minimalist; the consultation can override it.
The same generated faces and eave heights drive the Three.js roof, SVG exterior,
and facade checks. Separate rectangles at concave footprint steps create
additional conceptual roof sections; the result is not a structural roof
framing, flashing, drainage, or waterproofing plan.

`furniture.js` supplies the same indicative furniture footprints to the SVG plan
and Three.js model. The plan gallery is taller and includes an Enlarge floor plan
dialog for reading labels and dimensions.

All buildings remain single-storey, with rectangular room primitives and potentially
stepped outlines. Detailed engineering, accessibility, services, waterproofing and
regulatory compliance require professional review. The application produces
architectural concepts rather than certified construction drawings.

## Integration and versioning

Generated objects use `schemaVersion: 5` and
`generatorVersion: 'source-plans-v4-roof-sections'`. Keep the entire generated object,
including `walls`, opening edges, `privateTo`, source metadata, selected features,
space profile, roof form, and alternatives, when saving a concept snapshot. The Supabase
schema's geometry JSONB supports these additions; no SQL reset is required.
The integration owner must validate the new optional fields server-side and
preserve them when normalising a confirmed brief. Existing briefs with missing
fields use Balanced/Best fit/no extra features. The current local prototype stores
briefs and regenerates views; historical geometry cannot be replayed exactly until
the planned snapshot persistence is connected. Existing browser records are not
deleted or rewritten by this work.

## Verification

The prototype runner checks source hashes/attribution, explicit template choice,
room counts, non-overlap, room bounds, reachability, physical shared-edge door
placement, suite access, deterministic alternatives, finish/space independence,
additional-room preservation under conflicts, and finite matching 3D meshes.
It also checks preservation of source cores, exposed footprint boundaries,
non-overlapping roof-section coverage, explicit gable/hip geometry and finishes,
the six-bedroom layout regression, and furniture bounds/non-overlap across both
kitchen arrangements.
Its geometry matrix covers 432 combinations across all three templates, 1–6
bedrooms, 1–4 bathrooms, three space profiles and two feature sets.
Static React/SVG renders were also checked for all three families, and a separate
topology contact sheet was visually inspected. Browser/WebGL interaction QA remains
limited by the unavailable browser-control runtime.

To try a larger design, edit a brief, choose Generous room sizes, select the desired
additional spaces, and confirm again. The result page shows the adapted plan and
its source image separately. To grow the collection, visually review a new source,
record its source regions, implement/validate its spatial recipe, run preparation,
and add it to the matrix tests before presenting it as a supported family.
