# Stitch MCP Contract

Read this file completely before calling Stitch. Tool prefixes and available methods differ across hosts and server versions, so discover capabilities first and bind the workflow to the live schemas.

## Contents

1. Capability discovery
2. Identifier contract
3. Retrieval contract
4. Mutation contract
5. Design-system contract
6. Failure routing

## Capability Discovery

Inspect the current tool list and find the namespace that exposes Stitch project and screen operations. Do not assume the namespace is literally `stitch`.

Build a capability map before proceeding:

| Capability | Preferred operation | Acceptable fallback |
|---|---|---|
| List projects | `list_projects` | Ask for a known project ID, then verify it |
| Create project | `create_project` | Stop if creation was requested and unavailable |
| Get project with screen instances | `get_project` | Combine `list_screens` with per-screen retrieval, but mark instance IDs unavailable |
| List screens | `list_screens` | Read `get_project.screenInstances` |
| Get screen and download URLs | `get_screen` | Use separately exposed metadata/HTML tools only if their live schemas confirm them |
| Generate screen | `generate_screen_from_text` | Stop; never simulate a remote result |
| Edit screens | `edit_screens` | Generate a replacement only with explicit user approval |
| Generate variants | `generate_variants` | Perform separate targeted edits only if the user accepts the semantic difference |
| List design systems | `list_design_systems` | Treat design-system operations as unavailable |
| Create from DESIGN.md | `create_design_system_from_design_md` | Use the live server's equivalent only after schema inspection |
| Apply design system | `apply_design_system` | Keep theme instructions in prompt and report reduced guarantees |

If required capabilities are missing, report the missing operation and stop that route. Continue with read-only local analysis only when it still provides useful output.

## Identifier Contract

Keep identifiers distinct:

| Field | Meaning | Typical shape |
|---|---|---|
| `projectId` | Bare Stitch project ID | Numeric string |
| `name` | Full project resource | `projects/{projectId}` |
| `screenId` | Bare screen ID | Opaque string |
| `sourceScreen` | Full screen resource | `projects/{projectId}/screens/{screenId}` |
| screen-instance `id` | Canvas instance ID | Opaque string, not always equal to `screenId` |
| `assetId` | Bare design-system asset ID | Remove the `assets/` prefix returned by list operations |

Never substitute one identifier type for another because sample values happen to match. Persist both `id` and `sourceScreen` from `get_project.screenInstances`.

## Retrieval Contract

1. List or verify the project.
2. Call `get_project` and retain all real screen instances.
3. For each selected screen, call `get_screen` to retrieve:
   - HTML download URL
   - Screenshot download URL
   - Screen dimensions and device type when exposed
4. Download through `scripts/fetch_stitch_asset.py`.
5. For Google-hosted screenshot URLs, request the screen's actual width rather than accepting a thumbnail. Pass `--width <screen-width>` to the helper.
6. Save files under `.stitch/designs/{stable-page-key}.{html|png}`.
7. Inspect the screenshot before reasoning about fidelity.

Do not treat a cached local artifact as proof of current remote state. `/stitch sync` must retrieve remote metadata first and compare timestamps/IDs before deciding whether a download is necessary.

## Mutation Contract

### Generate

Use `generate_screen_from_text` with the verified `projectId`, device type, prompt, and design-system reference supported by the live schema. After generation, call `get_project` again to discover the resulting instance.

### Edit

Use `edit_screens` with selected screen instances and a delta-only instruction. State what must remain unchanged. Retrieve and compare the result after the call.

### Variants

Use `generate_variants` when available. Bind these concepts to the live schema rather than assuming parameter names:

- Variant count
- Creative range: refine, explore, or reimagine
- Aspect or device constraints
- Selected source screen instances

Use variants for controlled exploration around a good base. Use edit for a known correction.

## Design-System Contract

Before generating, call `list_design_systems` when available. If the project already has an intended design system, attach it to generation instead of restating theme tokens in the prompt.

Creating from `DESIGN.md` is a two-part operation:

1. Upload the synchronized `.stitch/DESIGN.md` transport copy and retrieve its source screen.
2. Resolve the corresponding screen-instance `id` through `get_project`, then call `create_design_system_from_design_md`.

Applying a design system requires:

```json
{
  "projectId": "<project-id>",
  "assetId": "<bare-asset-id>",
  "selectedScreenInstances": [
    {
      "id": "<screen-instance-id>",
      "sourceScreen": "projects/<project-id>/screens/<screen-id>"
    }
  ]
}
```

Pass only `id` and `sourceScreen`. Filter instances whose type is `DESIGN_SYSTEM_INSTANCE`. Position, dimensions, and other canvas fields can make the request invalid.

## Failure Routing

| Failure | Response |
|---|---|
| Stitch namespace absent | Report that MCP is not active; do not install anything automatically |
| Tool name absent | Inspect live schemas for an equivalent; otherwise stop the affected route |
| Project not found | Re-list owned projects and verify the exact ID |
| Download is low resolution | Retry through the helper with the observed screen width |
| Existing local artifact | Compare metadata; require an explicit refresh before overwrite |
| Mutation returned but instance missing | Call `get_project` again; do not guess the screen instance |
| `apply_design_system` invalid argument | Remove all fields except instance `id` and `sourceScreen`; exclude design-system instances |
| Direct upload payload too large | Use the bundled uploader; never emit base64 through the model |
| Remote result violates DESIGN.md | Prefer targeted edit; do not rewrite the design policy to match a bad generation |

## Version Note

These capability names reflect the `google-labs-code/stitch-skills` main branch reviewed on 2026-08-09. Live MCP discovery always overrides this reference.
