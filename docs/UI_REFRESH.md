# Platform UI refresh

Implementation date: 6 November 2026.

## Shared visual language

The platform now uses the forest-green and neutral palette defined in
`client/src/styles/tokens.css`. `platform.css` provides shared navigation, typography,
forms, surfaces, responsive rules and presentation styles for the existing page
modules. The old secondary token declaration in `studio.css` has been removed.
System sans-serif text and local Georgia display headings require no external fonts.

The refresh covers authentication and recovery screens, the project hub,
consultation and brief review, the house presentation, library and saved cards,
catalogue search and detail pages, management screens, help and dialogs. The
shared account layout includes an original decorative architectural SVG study;
it is not presented as a generated user design.

## Interaction changes

- Navigation identifies the current workspace and user. Library navigation remains
  highlighted on plan detail routes. Tablet widths use the bottom navigation to
  avoid a crowded desktop header; safe-area padding protects mobile content.
- Lazy page loading stays inside the shared shell, preserving navigation. Path
  changes reset scroll position and return focus to the main content area.
- Library filters form a labelled search panel. Browser history changes also
  update their draft values. Cards group style, dimensions, estimates and actions.
- Consultation questions, hints, required/optional status and review text are
  larger. Actions remain in document flow, avoiding overlap with mobile navigation
  and keyboards. Horizontal step navigation remains available on narrow screens.
- House summaries retain the total, specifications, budget result and refinement
  action. Long itemised costs now live in the full-width cost section. Floor
  selection buttons are shown for plan and cutaway views, where they change the
  displayed drawing; interactive 3D retains its own floor inspection control.
- Admin and finish-level tabs support arrow keys, Home and End. The help drawer
  traps focus, closes with Escape, locks background scrolling and restores focus.
- Form hints no longer leave broken accessible descriptions when an error replaces
  them. Disabled-button reasons take precedence over ordinary hover titles.
  Images can recover when their source is replaced after an earlier load error.

## Verification and limits

The UI verification uses static React route fixtures and CSS parsing in addition
to lint, production compilation and the existing behavioural suites. Static
fixtures include account pages, projects, library, saved designs, catalogue
search/results/detail, all management sections, not-found and one-to-three-storey
concepts. Their HTML is inspected for rendering errors, unique IDs and accessible
description/label references. Fixtures use invented data and perform no account
or database writes.

Browser-control access was unavailable during this refresh. Static rendering and
responsive stylesheet review do not establish actual mobile layout, WebGL,
keyboard or touch behaviour. Live desktop/mobile acceptance remains required.
No claim of WCAG certification is made.

## Manual review route

Open the existing local Vite preview. Check login, registration and recovery,
then create or reopen a project. Complete and review a brief, inspect the house
in plan and 3D, switch floors, read the cost section and download a plan. Browse,
filter and save library designs, then inspect management sections with an
authorised account. Repeat at 320, 390, 768, 1024 and 1440 CSS pixels; include
200% browser zoom, keyboard-only controls, dialog focus and a visible error state.

Concept generation, pricing formulas and cloud persistence contracts are not
changed by this presentation work.
