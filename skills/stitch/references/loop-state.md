# Resumable Loop and Artifact State

Use this reference for `/stitch loop`, `/stitch sync`, and `/stitch status`.

## Contents

1. Artifact contract
2. Runtime metadata
3. Loop state machine
4. Synchronization and conflicts
5. Completion

## Artifact Contract

Use these files without creating competing sources of truth:

| Artifact | Role | Authority |
|---|---|---|
| `DESIGN.md` | Design tokens and visual policy | Canonical |
| `docs/design-refs/*-sitemap-*.md` | Page inventory and navigation | Canonical when Aphrodite ran |
| `docs/design-refs/*-layout-*.md` | Per-page structure | Canonical when present |
| `.stitch/DESIGN.md` | Upload/transport mirror | Derived from root `DESIGN.md` |
| `.stitch/SITE.md` | Stitch execution view of the sitemap | Derived when Aphrodite artifacts exist; canonical only in explicit standalone Stitch mode |
| `.stitch/next-prompt.md` | Current baton | Mutable runtime state |
| `.stitch/metadata.json` | Project, screen, sync, and design-system IDs | Runtime source of truth |
| `.stitch/designs/` | Downloaded HTML/screenshots | Cache and staging |

Do not edit both root `DESIGN.md` and `.stitch/DESIGN.md` independently. Recreate the transport mirror before every push.

## Runtime Metadata

Persist observed remote state using this minimum shape:

```json
{
  "schemaVersion": 1,
  "projectId": "6139132077804554844",
  "name": "projects/6139132077804554844",
  "title": "My App",
  "deviceType": "DESKTOP",
  "lastSyncTime": "2026-08-09T00:00:00Z",
  "designSource": {
    "path": "DESIGN.md",
    "sha256": "<64 lowercase hex characters>"
  },
  "designSystem": {
    "assetId": "<bare-asset-id>"
  },
  "screens": {
    "home": {
      "id": "<screen-instance-id>",
      "screenId": "<screen-id>",
      "sourceScreen": "projects/6139132077804554844/screens/<screen-id>",
      "title": "Home",
      "deviceType": "DESKTOP",
      "width": 1440,
      "height": 1800,
      "htmlPath": ".stitch/designs/home.html",
      "screenshotPath": ".stitch/designs/home.png"
    }
  }
}
```

Populate IDs and dimensions from `get_project`/`get_screen`; never manufacture them. Preserve unknown remote fields only if they are needed for round-tripping.

Validate after every update:

```bash
python <STITCH_SKILL_DIR>/scripts/validate_stitch_state.py .stitch/metadata.json
```

## Baton Shape

Use explicit status and route information:

```markdown
---
status: pending
page: pricing
route: /pricing
device: desktop
---

GOAL: Compare plans and start checkout.
STRUCTURE: Header, comparison table, FAQ, final CTA.
PRESERVE: Global navigation labels from the canonical sitemap.
```

When no declared page remains, write:

```markdown
---
status: complete
---

All pages declared in the canonical sitemap are complete.
```

Do not invent another page merely to keep the baton alive.

## Loop State Machine

For each iteration:

1. Validate `.stitch/metadata.json` if it exists.
2. Read canonical sitemap, root `DESIGN.md`, page layout blueprint, `.stitch/SITE.md`, and baton.
3. Reject the iteration if the baton page is already complete in the canonical sitemap unless the request is explicitly edit/refresh.
4. Retrieve the remote project and selected design system.
5. Generate the page with the compiled contract.
6. Retrieve the project again and persist the new screen instance.
7. Download HTML and full-width screenshot without accidental overwrite.
8. Inspect visual fidelity and validate navigation/state requirements.
9. Integrate only after the generated candidate passes comparison.
10. Mark the current page complete in `.stitch/SITE.md` and, when appropriate, in the canonical sitemap artifact.
11. Select the next pending declared page and update the baton; otherwise mark it complete.

## Synchronization and Conflicts

### Remote newer than local

Retrieve metadata and show the affected screen IDs. Download to a distinct comparison filename unless the user explicitly requested refresh. Do not overwrite application code during `/stitch sync`.

### Local staged artifact exists

Compare screen ID, last sync time, file hash when available, and remote update time. Reuse the local file only if it represents the same remote screen revision. Otherwise ask whether to refresh or retain both.

### Root and transport DESIGN.md differ

Root wins. Report the drift and recreate `.stitch/DESIGN.md` from root before the next push.

### Sitemap and remote screens differ

Treat the canonical sitemap as intent and remote screens as implementation state. Report:

- Declared but missing pages
- Remote orphan screens
- Duplicate routes/device variants
- Screens whose titles do not map to a stable page key

Never delete remote orphan screens during status/sync unless deletion was explicitly requested and the exact targets were confirmed.

## Status Report

Report:

- Project ID and title
- Last remote and local sync times
- Design-system asset and root DESIGN.md hash match
- Page key, route, screen ID, device, and local artifact presence
- Missing, stale, duplicate, and orphan state
- Next declared action

## Completion

A loop is complete only when:

- Every page declared in the canonical sitemap has an accepted screen or an explicit skipped status.
- Navigation matches the sitemap.
- Every accepted screen has HTML, screenshot, and persisted identifiers.
- State validation passes.
- The baton status is `complete`.
