# Generate, Edit, Variants, and Design Systems

Use this reference for `/stitch generate`, `/stitch edit`, `/stitch variants`, and `/stitch design-system` routes.

## Contents

1. Policy gate
2. Prompt compilation
3. Generate, edit, and variants
4. Pull, push, and apply a design system
5. Verification

## Policy Gate

Read these inputs before composing a Stitch request:

1. Root `DESIGN.md`
2. Latest `docs/design-refs/*-brief-*.md`
3. Latest sitemap and layout blueprint in `docs/design-refs/`
4. Existing `.stitch/metadata.json`
5. Current selected screen screenshot and HTML for edit/variants

If root `DESIGN.md` is absent and the user wants a new visual direction, route to `/aphrodite --plan-only` first. In explicit standalone Stitch mode, derive only the minimum visual assumptions and label them as provisional.

## Prompt Compilation

Compile the prompt as an execution contract:

```text
GOAL       — user and job to be done
DEVICE     — mobile, desktop, or tablet
STRUCTURE  — page blocks and hierarchy from the layout blueprint
CONTENT    — exact labels, data shape, states, and primary action
BEHAVIOR   — interactions that must be visible in the static screen
PRESERVE   — elements that must not change during edit/variants
EXCLUDE    — banned patterns and out-of-scope functionality
```

When a project-level Stitch design system is attached, omit independent colors, fonts, and general theme prose from the generation prompt. Keep layout, content, structure, density, and state instructions. Allow a color value only for a narrowly targeted edit that explicitly changes that token.

Do not compile generic adjectives such as "modern", "premium", or "clean" without an observable layout or typography consequence.

## Generate

1. List design systems and select the intended asset.
2. Create or verify the target project.
3. Call the live generation operation with project ID, device type, compiled prompt, and design-system reference.
4. Retrieve the project again and identify the new screen instance.
5. Download HTML and a full-width screenshot.
6. Inspect the screenshot against the layout blueprint before accepting it.

For image-based generation, upload the image through the guarded uploader after confirmation, retrieve the created source screen, and use the live image-to-design operation if available. Do not place binary/base64 content in an MCP prompt.

## Edit

Choose edit when the page structure is substantially correct.

1. Select exact screen instances.
2. Express the request as a delta and name preserved regions.
3. Change one or two variables per iteration.
4. Retrieve and compare the resulting screenshot with the previous screenshot.
5. Reject regressions outside the requested delta and retry with a narrower instruction.

Examples of bounded edits:

- Add an empty state beneath the existing filter bar; preserve navigation and table columns.
- Increase the hero's type contrast; preserve copy, image crop, and CTA positions.
- Replace only the mobile bottom navigation; preserve desktop layout.

Do not reroll a whole screen for a button label, missing state, spacing correction, or isolated section change.

## Variants

Choose variants when the user wants alternatives around a valid base.

| Range | Intent |
|---|---|
| Refine | Small compositional and detail changes |
| Explore | Meaningful alternative layouts while preserving the product model |
| Reimagine | Broad concept exploration; use only when the user accepts structural divergence |

Set an explicit count and one comparison axis per batch, such as density, hero composition, navigation model, or crop. Do not vary colors, fonts, density, and structure simultaneously; the results become impossible to evaluate.

Present variants with the requested axis, preserved constraints, and screen IDs. Do not choose a winner solely from generation metadata; inspect screenshots.

## Design-System Pull

Use pull to reverse-engineer a remote Stitch project.

1. Retrieve representative screens across page types and states.
2. Download both HTML and screenshots.
3. Extract observed colors, typography, geometry, depth, spacing, and component patterns.
4. Distinguish intended tokens from one-off implementation noise.
5. Compare the proposal with root `DESIGN.md` if it exists.
6. Write a proposed diff or new document; never silently overwrite the root source of truth.
7. Validate the final root `DESIGN.md` through the Aphrodite design-system workflow.

## Design-System Push

Use push to synchronize the root `DESIGN.md` into Stitch.

1. Copy the root file byte-for-byte to `.stitch/DESIGN.md` immediately before upload.
2. Record the source path and SHA-256 hash in `.stitch/metadata.json` after successful synchronization.
3. Show the project ID, path, size, key colors/fonts, and intended display name; obtain upload confirmation.
4. Run the uploader with `STITCH_API_KEY` set in the environment:

```bash
python <STITCH_SKILL_DIR>/scripts/upload_to_stitch.py \
  --project-id "<project-id>" \
  --file .stitch/DESIGN.md \
  --generated-by "skill-olympus:stitch" \
  --confirm-upload
```

5. Retrieve `get_project` and resolve the uploaded document's `id` and `sourceScreen`.
6. Call `create_design_system_from_design_md` with the live schema.
7. Retrieve `list_design_systems` and persist the resulting asset ID.

Never paste the API key into the command. Set `STITCH_API_KEY` outside the conversation and command text.

## Design-System Apply

1. Retrieve real screen instances through `get_project`.
2. Exclude instances with type `DESIGN_SYSTEM_INSTANCE`.
3. Resolve the bare asset ID from `assets/{assetId}`.
4. Pass only `id` and `sourceScreen` for selected screens.
5. Retrieve and inspect each resulting screenshot.

## Verification

Finish only after:

- The resulting project, screen, and asset identifiers were retrieved from Stitch.
- The screenshot was inspected at its actual screen width.
- The result follows root `DESIGN.md` and the layout blueprint.
- Unrequested regions remained stable for edit/variants.
- `.stitch/metadata.json` records the observed remote state and validates.
