# Import, Export, and Direct File Transfer

Use this reference for `/stitch import`, local static capture, artifact download, and direct uploads that exceed MCP output limits.

## Contents

1. Safety boundary
2. Local UI capture
3. Download
4. Upload
5. Code-to-design sequence

## Safety Boundary

Treat uploads as external state changes. Before upload:

1. Resolve the exact project ID.
2. Resolve every local file to an absolute path.
3. Report path, type, size, title, and generated-by value.
4. Obtain confirmation unless the user's current message already confirms those exact files and target.
5. Require the API key through `STITCH_API_KEY`; never read it into the conversation or commit it.

The helper requires `--confirm-upload` as an execution guard. This flag confirms that the conversational approval and target checks already occurred; it is not a substitute for them.

## Local UI Capture

Choose the lowest-complexity capture strategy that preserves the required state:

| Situation | Strategy |
|---|---|
| Running page, no interaction needed | Browser/Playwright snapshot with styles and assets inlined |
| Login or interaction required | Navigate and establish the state first, then snapshot |
| Application cannot run | Build a narrowly scoped static fixture as a last resort |

Capture each route/device state separately. Preserve computed CSS, images, icon fonts, and canvas content where practical. Remove scripts, development overlays, secrets, tokens, and authenticated user data before upload.

Inspect the static output locally before sending it to Stitch. A successful file write does not prove visual completeness.

## Download

Use the helper for HTML and screenshots:

```bash
python <STITCH_SKILL_DIR>/scripts/fetch_stitch_asset.py \
  --url "<html-download-url>" \
  --output .stitch/designs/dashboard.html

python <STITCH_SKILL_DIR>/scripts/fetch_stitch_asset.py \
  --url "<screenshot-download-url>" \
  --width 1440 \
  --output .stitch/designs/dashboard.png
```

The helper refuses overwrite by default. Use `--force` only after refresh was explicitly selected.

## Upload

Preview without network mutation:

```bash
python <STITCH_SKILL_DIR>/scripts/upload_to_stitch.py \
  --project-id "<project-id>" \
  --file .stitch/dashboard.html \
  --title "/dashboard" \
  --dry-run
```

After confirmation, set the key outside the prompt and run:

```bash
python <STITCH_SKILL_DIR>/scripts/upload_to_stitch.py \
  --project-id "<project-id>" \
  --file .stitch/dashboard.html \
  --title "/dashboard" \
  --generated-by "skill-olympus:stitch-import" \
  --confirm-upload
```

Supported file types are PNG, JPEG, WebP, HTML, and Markdown. The helper sends files through Stitch's batch screen creation endpoint and prints machine-readable JSON. Retrieve the project afterward; the response alone is not the final local state contract.

Do not pass API keys through `--api-key`, shell history, metadata, or markdown. The helper accepts only the environment variable.

## Code-to-Design Sequence

For importing an existing frontend:

1. Read the code map, framework setup, root `DESIGN.md`, and route configuration.
2. Start or reuse the local application without changing functional code.
3. Capture a self-contained HTML snapshot for each selected route/state.
4. Inspect snapshots for missing fonts, icons, images, charts, and responsive layout.
5. Synchronize root `DESIGN.md` as `.stitch/DESIGN.md` and push the design system first when the user wants project-wide consistency.
6. Upload each verified HTML file with its route as the title.
7. Retrieve project and screen instance IDs and persist them in `.stitch/metadata.json`.
8. Compare the resulting Stitch screenshots with the local source render.

Do not infer that imported HTML and a Stitch-generated design system will remain pixel-identical. Record observable differences and use targeted edit operations where necessary.

## Failure Handling

| Failure | Response |
|---|---|
| Missing `STITCH_API_KEY` | Stop and ask the user to set it in their environment; never request it in chat |
| Unsupported file type | Convert explicitly to a supported type and re-inspect |
| Existing output path | Retain it or use a comparison filename; use `--force` only for confirmed refresh |
| HTTP error | Report status and sanitized response; never print headers or credentials |
| Empty/invalid JSON response | Treat upload as unconfirmed and retrieve the project before retrying |
| Static snapshot misses assets | Fix capture and verify locally before any new upload |
