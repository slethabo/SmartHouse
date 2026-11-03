# Consultation result: house presentation

`client/src/pages/HouseConceptPage.jsx` provides the final consultation page.
`PrototypeConcept.jsx` re-exports it under the existing component name, so the
project/consultation route remains compatible. No routes or persistence services
were changed for this presentation milestone.

## Data handoff

The existing component accepts this confirmed brief shape:

```js
{
  project_id: 1,       // numeric local ID today; a UUID also works in the edit URL
  version: 1,
  brief: {
    answers: { /* questionnaire v1 keys from client/src/demo/consultation.json */ }
  }
}
```

It currently calls `createHouseConcept(brief.brief.answers)` to obtain the shared
house geometry, total, rate and plot/budget checks. Gallery views, specifications,
room dimensions and downloads all use that same object. Cost allocations use the
existing estimator's `buildBreakdown(total)`; this is presentation of the existing
demo estimate, not a new pricing engine.

For Supabase integration, normalize the saved brief's top-level `answers` into the
existing shape at the service boundary, or update this component and its callers
together. Once generated snapshots are persisted, replace the local derivation with
the saved concept geometry and estimate snapshot. Do not regenerate historical
concepts using changed generator versions or rates. Match `brief.version` to the
displayed concept. The current local hard-coded concept rates remain a separate
planned pricing-integration task.

Gallery state and browser download operations are local UI concerns. Downloads
currently produce SVG/JSON in the browser; hosted Storage is not required. The SVG
stays mounted when another view is selected, so it can be downloaded from every
view. The interactive Three.js viewer loads on demand. Generated drawings and
material appearances are schematic and carry that label.

## Available sections

- Front, side, perspective, floor plan, interactive 3D and cutaway gallery views.
- Bedrooms, bathrooms, gross area, storey count and finish-level estimate.
- Visible plot/budget conflicts and a link back to brief editing.
- Expandable room dimensions and requests recorded for further review.
- Five-category cost allocation, budget inclusions and estimate limitations.
- Plot dimensions, building footprint, road access and demo boundary allowance.
- SVG floor-plan and JSON concept downloads with failure messages.

No payments, cart, checkout, professional approval or unsupported rendering service
is represented. The page uses original code-generated illustrations from the actual
concept rather than external architectural photographs.

## Verification for this milestone

Production build, all eight prototype tests and client ESLint passed. In-memory
React renders passed for all three styles and a plot/budget conflict case. The
browser-control runtime failed to initialize, so visual browser QA, touch interaction
and actual download clicks still need checking in a browser. To review locally,
run `npm run dev`, open a project and confirm its brief (or reopen a confirmed one).
