# SmartHouse work log and handoff

**Updated:** 2026-11-06  
**Purpose:** Record the decisions, implementation, troubleshooting, verification,
and remaining work discussed during this development thread. This is a
supplementary handoff; the linked feature documents remain the detailed
implementation references.

## Project direction

The house generator is intended to be a deterministic, rule-based architectural
concept tool. It should use explicit user requirements and reviewed plan
templates, not claim to be an AI architect or infer a buildable plan from
unstructured image annotations. The goal is to create visibly different house
layouts and roof forms from the brief, while being clear that the results are
concepts and need professional validation before construction.

## Dataset review and floor-plan generation

The supplied training split was catalogued and reviewed:

- 837 training image variants group into 279 stable source-plan IDs.
- The annotation classes are `door`, `window`, and generic `zone`.
- The labels do not establish room types, metric scale, storeys, or roof shape.
  Detection counts and pixel measurements therefore must not be presented as
  bedroom counts or real-world dimensions.
- Three plans were selected for human review and deterministic adaptation:
  source 649 (`Linear living`), 1115 (`Split living`), and 979
  (`Wide family residence`).

The full inventory is available at
`client/Floor_plan_dataset/catalog.json`; only the three reviewed families have
explicit generation rules. Original reference images and attribution are
packaged separately. The generated plans use authored prototype dimensions and
adaptations; they are not exact reconstructions or certified interpretations of
the scanned source plans.

Consultation choices that affect generated geometry include:

| Input | Effect |
|---|---|
| `spaceLevel` | Compact, Balanced, or Generous room sizes. |
| `layoutPreference` | Automatic best-fit selection or one of the three reviewed families. |
| `homeFeatures` | Adds requested supported spaces such as an en-suite, walk-in wardrobe, dining/entertainment room, or double garage. |
| Finish quality | Changes the illustrative pricing rate; it does not by itself add rooms or enlarge the house. |

The selected source layout, optional rooms, exterior boundaries, doors, windows,
floor plan, elevation, and 3D model are intended to use shared generated
geometry. Additions should not silently replace required rooms or rearrange the
reviewed source core. Plot/budget conflicts are surfaced rather than hidden.

Detailed dataset assumptions and the reproducible catalog preparation process
are in [DATASET_TEMPLATES.md](../DATASET_TEMPLATES.md).

## Roofs and architectural presentation

The consultation exposes `Automatic`, `Intersecting gables`, and `Multi-hip`.
Automatic maps Traditional style to multi-hip and Modern/Minimalist to
intersecting gables. A user-selected roof overrides that mapping.

The deterministic roof routine partitions the occupied room footprint into
rectangular sections, adds a concept overhang, and derives roof surfaces from
those sections. If social rooms and bedrooms occupy distinct wings, the private
wing can receive a perpendicular ridge to create a cross-gable form. The 3D
model includes gable infill and illustrative standing-seam or tile-course
details. The same geometry is used by roof-related elevation/facade checks.

The roof geometry is conceptual only. It does not resolve structural framing,
valleys, flashing, drainage, waterproofing, local regulations, or construction
detailing. Browser smoke testing in the development thread rendered both roof
options and exposed/fixed repeated and intersecting gable-wall placement issues.
The regression tests cover roof coverage, panel geometry, section ownership,
gable surfaces, and perpendicular ridges for the wide family plan.

Other related presentation work added style-specific exterior treatments and
more conventional architectural symbols for doors, walls, and windows in the
plan drawings. These are visual improvements, not a substitute for dimensioned
construction documents.

## Estimation changes

The estimate work adds catalogue-priced items and separately researched
South-African material-price benchmarks. It derives schematic quantities from
the generated building and roof geometry, reports priced line items, and
discloses the remaining area-rate amount as an allowance for labour and other
unpriced work. Missing, variable, or unavailable catalogue items are not
silently treated as priced.

These are illustrative estimates, not supplier quotes or a complete bill of
quantities. Quantities, site conditions, labour, professional fees, services,
contingency, and other exclusions still require confirmation. Refer to
`client/src/demo/estimator.js` and
`client/src/demo/material_price_benchmarks.json` for the implementation and
source notes.

## Authentication: current modes and diagnosis

The frontend has two distinct modes:

1. **Local prototype mode:** when no Supabase configuration is available, the
   frontend falls back to a built-in local demo workspace. This is not a real
   account login and does not validate user credentials.
2. **Supabase mode:** when configured, Supabase Auth handles registration,
   password login, session restore, confirmation/resend, password reset, and
   logout. The client uses a publishable/anon key; roles are obtained through
   the protected `my_role()` RPC, not editable user metadata.

During the authentication troubleshooting on 2026-11-06, the root `.env` was
checked without printing its contents. `VITE_DATA_SOURCE` and the required
`VITE_SUPABASE_*` variables were not set in that environment. With the default
`auto` mode, this selects the local demo workspace. This was the concrete
reason real email/password authentication was not working in that setup.
Authentication unit tests passed, but they use mocked Supabase clients and do
not verify the hosted project, real credentials, email delivery, or redirect
allow-list.

To enable real Supabase authentication:

1. Set `VITE_DATA_SOURCE=supabase`, `VITE_SUPABASE_URL`, and
   `VITE_SUPABASE_PUBLISHABLE_KEY` in the ignored root `.env`.
2. Never put a Supabase secret/service-role key in the browser environment.
3. Configure the Supabase Email provider, email confirmation settings, and
   allowed app redirect URLs for `/auth/callback` and `/auth/reset`.
4. Install/verify the database objects and policies using the instructions in
   [the Supabase README](../../supabase/README.md), including
   `supabase/schema.sql` when setting up a new project.
5. Restart Vite after changing environment variables. A confirmed test account
   and the documented hosted connection check are needed to verify the real
   deployment.

The active frontend auth flow is in
`client/src/context/AuthContext.jsx`,
`client/src/services/supabaseAuth.js`, and
`client/src/services/supabaseConfig.js`. The separate older Express server auth
implementation has its own configuration; do not assume configuring Supabase
automatically changes that legacy server path.

## Git and merge recovery

The thread included a rejected GitHub push with HTTP 403, reported as
`Permission to slethabo/SmartHouse.git denied to SMT2501`. This indicates that
the GitHub identity used for the push did not have write access. A local
commit, pull, or merge cannot grant that permission; use an authorized GitHub
account or ask a repository administrator for access.

The repeated merge-message screen was Git opening its configured editor so the
merge commit message could be confirmed. In Vim, save and exit with `:wq`;
`:q!` exits without saving and may abort that merge commit. The editor can be
changed with Git's `core.editor` setting if needed.

During a later pull/stash recovery, `HouseConceptPage.jsx` had a small conflict
over roof-label formatting. It was resolved with upstream's human-readable
hyphen replacement. Conflict markers also appeared transiently in
`client/tests/prototype.test.cjs` and were subsequently removed; the client
lint passed after conflict cleanup. Do not use `git reset --hard` or blindly
apply a retained stash to resolve a future conflict.

Repository snapshot observed while writing this document:

- Worktree was clean.
- Local `main` pointed to `13bc127` (`Update house concept`), one commit ahead
  of the observed `origin/main` at `778f7a1`.
- `stash@{0}` named `save local changes before pull` was still present. Inspect
  it with `git stash show -p 'stash@{0}'` before deciding whether it contains
  anything not already committed. Do not drop it until confirmed unnecessary.

Those branch/stash observations are a dated snapshot and may change after this
document is written.

## Verification recorded in this thread

- The roof implementation passed 25 prototype/catalog tests, including the
  cross-gable regression case.
- Client lint and the production Vite build passed after the roof changes. The
  build reported a large generated Three.js chunk warning.
- Browser smoke checks rendered gable and multi-hip examples in the interactive
  3D viewer.
- During authentication diagnosis, all 7 auth tests and all 8 Supabase client
  tests passed. These tests are mocked/unit-level checks, not a hosted login
  test.
- Client lint passed after the `HouseConceptPage.jsx` merge conflict was
  resolved. Transient merge markers in the test file were later removed in
  committed merge-fix work.

Run the relevant checks from the repository root:

```powershell
npm run test:prototype
npm run test:auth
npm run test:supabase
npm run lint
npm run build
```

## Key references

- [Dataset-derived layouts and roof rules](../DATASET_TEMPLATES.md)
- [Consultation inputs and validation](../CONSULTATION.md)
- [Frontend progress and limitations](../PROTOTYPE_PROGRESS.md)
- [Supabase schema and setup](../../supabase/README.md)
- `client/src/demo/architecture.js`
- `client/src/demo/houseModel.js`
- `client/src/demo/estimator.js`
- `client/tests/prototype.test.cjs`
- `client/tests/auth.test.cjs`
- `client/tests/supabase.test.cjs`

