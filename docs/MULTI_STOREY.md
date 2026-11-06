# Multi-storey concepts

The consultation now supports numeric `storeys: 1 | 2 | 3`. It is optional so
existing briefs remain single-storey. Edit a brief, choose the number of storeys,
then confirm a new version to generate the new building. The single-storey source
recipes and their geometry remain available.

## Provenance and design rules

The three source scans do not provide verified upper-floor plans or structural
data. Multi-storey variants are **authored adaptations** of their spatial families,
not traced multi-level dataset plans or professionally approved designs. Their
per-floor layouts have automated spatial checks; architectural certification and
independent practitioner review are not implied.

Shared living, kitchen, garage and requested social rooms are downstairs. The
main bedroom is on the top floor, with its selected private en-suite/wardrobe.
Other bedrooms are allocated upstairs, with a downstairs bedroom for larger
programs. Aligned galleries serve room wings on both sides of a continuous stair
core. Bathrooms use repeated core/side service zones. Upper plates stay inside
the occupied plate below. Shorter upper plates produce setbacks; the wide family
can have a supported top-floor roof terrace. Roofs cover exposed lower volumes
and the top floor, with terrace cover handled separately.

The nominal floor-to-floor height is 3.2 m. Each U-shaped stair connection has
18 risers (about 178 mm each), two nine-riser flights, a turning landing and
indicative handrails. The Compact/Balanced/Generous profiles scale tread, flight
and landing dimensions. Front landings remain outside the slab opening; upper
slabs have an actual opening over the flights. Stair connections join the door
graphs of adjacent levels. No lift or validated step-free upper-floor access is
provided. Structural member sizing, escape routes, fire protection, exact headroom,
guarding, waterproofing and local compliance require professional review.

Unassigned bays become flexible family spaces rather than silently dropping
the requested level count. The notes disclose this; fewer storeys can avoid
unnecessary accommodation and cost.

## Geometry contract

Generated objects use schema 6 / `source-plans-v6-multi-storey`.

- `floors[]`: unique ID, level, elevation, name, room/wall/door/window geometry,
  floor-specific footprint, terraces, area and stair opening.
- `stairs[]`: from/to floor and room IDs, aligned footprint, opening, step count,
  riser/tread, flight width, landing depth and floor-to-floor rise.
- Aggregate room/opening IDs remain unique and carry floor/level metadata.
  Vertical graph links are marked `vertical: true`; they are not wall doors.
- `footprintArea`: occupied ground plan; `totalFloorArea`: sum of floor areas,
  excluding upper stair openings, wall thickness and terraces.
- `roofPlans[]`: exposed roof regions at each elevation; upper-floor room/terrace
  coverage is subtracted from lower roof regions.
- `additionalStoreyAllowance`: explicit upper-structure and staircase cost inputs.

Preserve this object when trusted snapshot persistence is implemented. Current
local/cloud brief storage still regenerates concept geometry from saved answers.

## Views and exports

The result page offers per-floor plan buttons, a floor column in the room table,
an enlarged selected-floor drawing, selected-floor SVG, all-floor SVG sheets and
the complete JSON concept. Stair symbols identify up/down travel. The Three.js
viewer offers Whole building or an inspected floor; higher levels are hidden,
the roof is removed and the selected level's walls are lowered. Floors beneath
remain in place. The whole-building view restores all levels and the roof.
Static perspective/elevation views use the same level elevations and roof geometry.

## Cost assumptions

Pricing uses total enclosed floor area rather than multiplying ground footprint.
Concrete quantities assume a 100 mm ground slab and a 200 mm equivalent upper
slab, excluding stair voids. Ceiling quantities use total floor area, insulation
uses the top-floor area and roof quantities use the exposed roof surfaces.

Two **authored prototype allowances** are added after the larger of the area-rate
baseline and priced material subtotal: R1,800 per square metre of upper floor and
R25,000 per floor connection for stairs. These are not researched supplier prices,
certified quantities or engineering calculations. They are disclosed separately
from catalogue/researched materials and the remaining general allowance. Actual
structure, balconies and site conditions can change costs substantially.

## Verification and database handoff

Tests cover 648 combinations across two/three levels, all three families, room
counts, size profiles and additional spaces. They check room non-overlap per floor,
reachability from the ground entrance through stairs, suite privacy, bedroom
windows, supported upper plates, aligned stair dimensions, openings, floor visibility,
finite meshes and reconciled multi-storey prices. Existing single-storey tests
remain in the runner. Static SVG checks cover plans, combined sheets and elevations.

Supabase's existing JSON answer fields already round-trip valid storey choices.
`supabase/upgrade-multi-storey.sql` is an additive, repeatable upgrade for existing
installations to validate the count in the database and widen the future concept
table's floor constraint. The isolated PostgreSQL test checks this upgrade. It is
not automatically applied to a hosted database using browser credentials.
