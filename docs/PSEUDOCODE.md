# Algorithms (pseudocode)

Implementations: [`server/src/modules/cost/estimator.js`](../server/src/modules/cost/estimator.js) and [`server/src/modules/recommendation/engine.js`](../server/src/modules/recommendation/engine.js). Unit tests: [`server/tests`](../server/tests).

## 1. Cost estimator

```
CONSTANTS
  FINISH_LEVELS    = [basic, standard, premium]          // ascending price
  BREAKDOWN_SHARES = { structure: 0.45, finishes: 0.25, services: 0.15,
                       professional_fees: 0.05, contingency: 0.10 }   // sums to 1.00

FUNCTION estimateCost(floor_area_m2, rate_per_m2):
  IF floor_area_m2 is not a number OR floor_area_m2 <= 0 THEN
      THROW "Floor area must be a number greater than zero."
  IF rate_per_m2 is not a number OR rate_per_m2 <= 0 THEN
      THROW "Rate per m² must be a number greater than zero."
  RETURN ROUND(floor_area_m2 × rate_per_m2)              // Rand, nearest whole


FUNCTION buildBreakdown(total):
  allocated ← 0
  FOR EACH (category, share) IN BREAKDOWN_SHARES WHERE category ≠ structure:
      breakdown[category] ← ROUND(total × share)
      allocated ← allocated + breakdown[category]
  breakdown[structure] ← ROUND(total) − allocated         // absorbs rounding so lines sum exactly
  RETURN breakdown  // {structure, finishes, services, professional_fees, contingency}


FUNCTION estimateAllLevels(floor_area_m2, rates):
  // rates = { basic: R/m², standard: R/m², premium: R/m² }
  FOR EACH level IN FINISH_LEVELS:
      IF rates[level] is missing THEN THROW "Missing cost rate for <level>"
      total ← estimateCost(floor_area_m2, rates[level])
      levels[level] ← { finish_level: level, rate_per_m2: rates[level],
                        total, breakdown: buildBreakdown(total) }
  RETURN { levels,
           low:  levels[basic].total,
           mid:  levels[standard].total,
           high: levels[premium].total }
```

Worked example — 140 m² plan, rates 9 500 / 12 500 / 17 000:

| Level | Calculation | Total | Structure 45% | Finishes 25% | Services 15% | Fees 5% | Contingency 10% |
|---|---|---|---|---|---|---|---|
| basic | 140 × 9 500 | R1 330 000 | 598 500 | 332 500 | 199 500 | 66 500 | 133 000 |
| standard | 140 × 12 500 | R1 750 000 | 787 500 | 437 500 | 262 500 | 87 500 | 175 000 |
| premium | 140 × 17 000 | R2 380 000 | 1 071 000 | 595 000 | 357 000 | 119 000 | 238 000 |

## 2. Recommendation engine

```
CONSTANTS
  MAX_COVERAGE = 0.5                       // footprint may cover at most 50% of the plot
  WEIGHTS      = { budget_fit: 0.5, plot_fit: 0.3, area_utilisation: 0.2 }
  DEFAULT_LIMIT = 10

FUNCTION recommend(input, plans, rates, cost):
  // input = { plotSizeM2, budget, filters?: {bedrooms, floors, style}, limit? }
  // cost  = the Cost module's public interface (estimateAllLevels)

  // 1. Validate
  IF plotSizeM2 is not a number OR plotSizeM2 <= 0 THEN THROW "Plot size must be greater than zero (in m²)."
  IF budget      is not a number OR budget      <= 0 THEN THROW "Budget must be greater than zero (in Rand)."

  // 2. Candidate plans
  active       ← plans WHERE is_active = TRUE
  maxFootprint ← plotSizeM2 × MAX_COVERAGE
  plotEligible ← active WHERE footprint_m2 <= maxFootprint AND min_plot_size_m2 <= plotSizeM2
  candidates   ← plotEligible WHERE matchesFilters(plan, filters)
       // bedrooms: plan.bedrooms >= wanted ; floors: plan.floors = wanted ; style: equal (case-insensitive)
  filteredOut  ← COUNT(plotEligible) − COUNT(candidates)

  // 3. Cost every candidate at every finish level
  FOR EACH plan IN candidates:
      costed[plan] ← cost.estimateAllLevels(plan.floor_area_m2, rates)

  // 4. Keep plans affordable at the lowest finish level
  affordable ← candidates WHERE costed[plan].low <= budget

  // 7. No matches → helpful suggestions
  IF affordable IS EMPTY THEN
      suggestions ← []
      IF candidates IS EMPTY THEN
          smallestNeeded ← MIN over active of MAX(min_plot_size_m2, footprint_m2 / MAX_COVERAGE)
          ADD "Your plot is too small for our designs. The smallest design needs about <smallestNeeded> m²."
      ELSE
          cheapest ← candidate with the lowest basic cost
          ADD "Increase your budget by about R<cheapest.low − budget> to afford the <cheapest.name> at basic finish."
      IF filteredOut > 0 THEN
          ADD "Remove your filters to see <filteredOut> more designs."
      ADD "Try a different plot size or budget and search again."
      RETURN { matches: [], noMatch: { message, suggestions, details } }

  // 5. Score each affordable plan (every term normalised to 0..1)
  maxFloorArea ← MAX(floor_area_m2) over affordable
  FOR EACH plan IN affordable:
      affordableLevels ← levels of costed[plan] WHERE total <= budget   // ascending
      best             ← LAST(affordableLevels)                        // highest finish the budget allows

      budget_fit       ← CLAMP(best.total / budget, 0, 1)             // 1.0 = budget fully used
      plot_fit         ← CLAMP(footprint_m2 / maxFootprint, 0, 1)      // 1.0 = uses allowed coverage fully
      area_utilisation ← CLAMP(floor_area_m2 / maxFloorArea, 0, 1)     // 1.0 = largest affordable home

      score ← 0.5 × budget_fit + 0.3 × plot_fit + 0.2 × area_utilisation
      match_percent ← ROUND(score × 100)
      reason ← plotSentence(footprint_m2 / plotSizeM2) + "; " + budgetSentence(budget − best.total, best.level)
          // plotSentence:  coverage <= 25% → "Fits your plot with plenty of room for a garden"
          //                coverage <= 40% → "Fits your plot with room for a garden"
          //                otherwise        → "Makes good use of your plot"
          // budgetSentence: diff < R1 000 → "right on budget at <level> finish"
          //                 otherwise     → "about R<diff> under budget at <level> finish"

  SORT affordable BY score DESC, THEN basic cost ASC

  // 6. Return the top results
  RETURN { matches: FIRST limit OF affordable, noMatch: NULL,
           meta: { candidates, affordable, weights } }
```

### Worked example — plot 400 m², budget R1 500 000 (seed data)

- Max footprint = 200 m². "Executive Manor" (needs 500 m²) is excluded; "Veld Homestead" (160 m² → R1 520 000 basic) and "Highveld Double-Storey" are over budget.
- Cape Dutch Revival: basic R1 330 000 ≤ budget, standard R1 750 000 > budget → best = basic.
  - budget_fit = 1 330 000 / 1 500 000 = 0.887
  - plot_fit = 140 / 200 = 0.70
  - area_utilisation = 140 / 150 (Coastal Retreat is the largest affordable) = 0.933
  - score = 0.5 × 0.887 + 0.3 × 0.70 + 0.2 × 0.933 = **0.84 → 84% match**
  - reason: "Fits your plot with room for a garden; about R170,000 under budget at basic finish."

### Edge cases covered by tests
| Case | Expected |
|---|---|
| budget = 0 or plot = 0 / negative | validation error, no query |
| tiny plot (50 m²) | no matches; suggestion gives the smallest plot needed (120 m²) |
| budget too low (R300 000) | no matches; "increase your budget by about R127,500" |
| cost exactly equals budget | included, `budget_fit` = 1, reason "right on budget"; one Rand less → excluded |
| footprint = 50% of plot | included; 1 m² more → excluded |
| filters hide everything | no matches; suggestion mentions removing filters |
| limit | at most `limit` results, `meta.affordable` keeps the full count |
