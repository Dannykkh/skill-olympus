# Stitch to React Handoff

Use this reference for `/stitch react` and for synchronizing an existing React application with changed Stitch screens.

## Contents

1. Inputs and discovery
2. Retrieval and visual audit
3. Architecture adaptation
4. Implementation
5. Verification

## Inputs and Discovery

Before changing code:

1. Read the repository's code map and React guidance.
2. Locate existing routes, layouts, component primitives, tokens, data boundaries, and tests.
3. Read root `DESIGN.md`, the relevant layout blueprint, and implementation log.
4. Validate `.stitch/metadata.json` and resolve the exact remote screens.
5. Classify the task as:
   - New screen implementation
   - Existing screen synchronization
   - Shared design-system update
   - Static prototype only

Do not replace an established architecture with a generic primitives/patterns/blocks tree. Reuse the repository's conventions.

## Retrieval and Visual Audit

1. Call the live `get_screen` operation for every selected screen.
2. Download current HTML and actual-width screenshots into `.stitch/designs/`.
3. Inspect each screenshot before editing React code.
4. Compare the current local route against the Stitch screenshot and list only observable deltas.
5. Extract reusable tokens from root `DESIGN.md`; use Stitch HTML only to identify generated implementation details or drift.

If existing staged files are present, compare metadata first and retain both revisions unless refresh was requested.

## Architecture Adaptation

Preserve:

- Framework and router already in use
- Existing state/data-fetching boundaries
- Established component library and token names
- Accessibility behavior and semantic structure
- Existing tests and public component APIs unless the requested change requires them

Apply these rules conditionally:

- Extract a component when it is reused, independently testable, or materially clarifies the page.
- Create props only when the component has inputs; do not create empty ceremonial interfaces.
- Move static data out of JSX when it is shared, large, localized, fetched, or independently maintained; do not force every label into `mockData.ts`.
- Move logic into a hook when it is stateful and reusable or when isolation improves testing; do not wrap trivial event forwarding.
- Map generated colors and fonts to canonical tokens. Do not copy arbitrary hex values into components.
- Replace Stitch placeholder navigation with real router links and verify active states.

## Implementation

1. Bind the page structure to the layout blueprint and observed screenshot.
2. Reuse existing primitives before creating new ones.
3. Separate generated static appearance from business logic and data wiring.
4. Implement responsive states represented in Stitch or required by `DESIGN.md`.
5. Cover loading, empty, error, permission, disconnected, and stale states when the product contract requires them; do not infer backend behavior from a static screen.
6. Preserve dark/light behavior from the canonical token system, including container backgrounds, text reversal, form controls, and options.
7. Keep images and generated assets in the repository's asset pipeline with explicit dimensions and alt text.
8. Update `.stitch/metadata.json` with the source screen IDs used for the implementation.

## Synchronization Strategy

For an existing route, classify each delta:

| Delta | Default action |
|---|---|
| Visual token changed | Update token source, then affected consumers |
| Block order changed | Update markup while preserving logic boundaries |
| Copy changed | Update visible copy without renaming public APIs silently |
| New visual state | Add the state representation and connect existing state logic |
| Placeholder data changed | Keep real application data; map shape, not sample values |
| Generated interaction conflicts with product behavior | Preserve product behavior and adapt appearance |

Do not overwrite a functional local route with generated static HTML.

## Verification

Run the project's existing verification commands. At minimum when available:

1. Typecheck (`tsc --noEmit` or the repository equivalent)
2. Lint for changed files
3. Relevant unit/component tests
4. Render the route at target desktop and mobile sizes
5. Compare the render with the Stitch screenshot and root `DESIGN.md`
6. Exercise navigation, keyboard focus, and required states

Report verification commands and observed results. If a dev server or browser cannot run, label visual fidelity as unverified rather than inferring success from compilation.

## Completion

Finish only when:

- The code map and existing architecture were respected.
- No Stitch placeholder link or sample-only behavior remains in the affected route.
- Canonical tokens, not generated raw values, drive the appearance.
- Type/lint/tests pass to the project's normal standard.
- Rendered output was compared visually, or the missing runtime verification is explicitly reported.
