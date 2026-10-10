# Target Algorithm Specifications

**Status:** Design pseudocode, not current executable logic. Existing implementations are the [catalogue recommendation engine](../server/src/modules/recommendation/engine.js) and [area-based estimator](../server/src/modules/cost/estimator.js).

## Consultation and brief confirmation

```text
SAVE_DRAFT(project, answers, expectedRevision, user):
  require project belongs to user
  validate known answer types, units and bounds
  reject stale expectedRevision
  determine visible follow-ups and requirement support classifications
  persist answers and increment draft revision
  return draft, unanswered required questions, unsupported requests

CONFIRM_BRIEF(project, draftRevision, user):
  require ownership and latest requested draft revision
  normalise dimensions, room counts, priorities and budget inclusions
  require supported scope and complete mandatory inputs
  require explicit acknowledgement of assumptions and recorded-only needs
  reject unsupported essentials until resolved by the user
  freeze new brief version atomically; retain questionnaire version
  return confirmed brief
```

## Bounded personalised layout generation

```text
GENERATE(confirmedBrief, ruleRelease, componentRelease, pricingRelease,
         generatorVersion, seed, maxAttempts, deadline):
  require complete, compatible published releases and currency
  envelope = plot minus configured boundary clearances
  if envelope invalid: return no_feasible_option with exact input conflict
  spaces = translate supported brief requirements into room components
  feasible = []; rejected = []; searchComplete = false
  for candidate in boundedArrangementSearch(spaces, envelope, seed):
    if attempts >= maxAttempts or currentTime >= deadline: break
    geometry = construct rooms, walls, openings, roof and exterior parameters
    report = VALIDATE_GEOMETRY(geometry, brief, rules)
    if mandatory checks fail:
      record bounded diagnostic summary; continue
    estimate = ESTIMATE(geometry, specifications, pricingRelease, brief)
    if estimate incomplete: return configuration_error
    if estimate.total > brief.constructionBudget:
      record budget conflict; continue
    score = weighted satisfaction of supported optional preferences
    retain diverse feasible candidates without duplicate geometry
  if search iterator fully consumed: searchComplete = true
  if feasible is not empty:
    rank by preference satisfaction with deterministic tie-break
    return completed with validated options and search termination metadata
  if searchComplete:
    return no_feasible_option within supported design space
  return exhausted with observed conflicts and possible user-approved changes
```

Implement time checks inside expensive search steps, not only between complete candidates. Persist pinned releases and seed before execution. A time-limited search may terminate at different points even with a fixed seed; record attempts and termination reason. Saved snapshots are the source for exact replay of views and costs.

Do not rank invalid candidates, optimise automatically for maximum spend, or remove essential requirements to obtain an answer. Optional changes outside the confirmed brief are suggestions requiring a revised brief.

## Spatial validation

```text
VALIDATE_GEOMETRY(geometry, brief, rules):
  check supported schema, finite coordinates and positive dimensions
  check gross footprint fits envelope and configured coverage
  check rooms do not overlap beyond documented tolerance
  check configured size limits and required room counts
  check wall/opening hosts, entrance and door clearances
  build graph of traversable room/door connections
  verify required rooms reachable from entrance
  check supported privacy, adjacency and access constraints
  record each requirement as passed, failed or not_checked
  return mandatory pass/fail, measurements and review notes
```

Unknown orientation or site conditions cannot yield a verified environmental or engineering claim. A concept passes configured rules only, not all building regulations.

## Quantity and allowance estimate

```text
ESTIMATE(geometry, specifications, pricingRelease, brief):
  quantities = derive gross area, wall area, roof area and supported quantities
  for each applicable cost item in configured pricing model:
    choose exactly one basis: measured_quantity, floor_area or allowance
    require matching units, currency, rate and inclusion decision
    line.amount = monetaryRound(line.quantity * line.rate)
    retain source, quantity, rate, basis and exclusions
  subtotal = sum(included rounded lines)
  contingencyBase = sum(lines selected by explicit contingency rule)
  contingency = monetaryRound(contingencyBase * configuredPercent / 100)
  total = subtotal + contingency
  return lines, subtotal, contingency, total and assumptions
```

A category must not be priced both as a measured quantity and again through an overlapping area allowance. Fees and labour are separate items only when they are not already included in rates. Initial contingency is an explicit addition on its documented base; legacy contingency was a fixed share within the area-based total. Preserve calculation-model versions.

Illustrative arithmetic only: included lines R800,000 + R200,000 + R100,000 = R1,100,000. At 10% contingency on all included lines, contingency is R110,000 and total is R1,210,000. These numbers are not market rates.

## Consistent views, revisions and exports

```text
REVISE(existingBrief, requestedChanges):
  create draft from previous brief with changes
  validate and request confirmation
  generate using new confirmed brief; preserve existing designs

EXPORT(designId, user):
  authorise through project's owner
  load immutable design, brief, validation and complete estimate
  render floor plan and visual views from saved geometry
  assemble brief, views, estimate, assumptions and concept review notes
  verify every section uses the same design and brief IDs
  persist manifest with geometry checksum and release IDs
  return protected download for completed artifact
```

A renderer failure produces a failed export, not a partially successful package. Visual assets may be cached by geometry/specification checksum and renderer version. Cost changes alone must not replace saved geometry or silently update historical estimates.
