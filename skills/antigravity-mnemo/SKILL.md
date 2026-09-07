---
name: antigravity-mnemo
description: Install, remove, or diagnose Mnemo long-term conversation memory for Google Antigravity CLI using its global Stop hook and GEMINI.md rules.
---

# Antigravity Mnemo

Installs the Antigravity-specific Mnemo adapter without changing project files.

## Commands

```bash
node "<module_root>/install.js"
node "<module_root>/install.js" --check
node "<module_root>/install.js" --uninstall
```

Resolve `module_root` as the directory containing this exact `SKILL.md`; do not assume the repository is the
current working directory.

`ANTIGRAVITY_HOME` may point to an isolated replacement for `~/.gemini` during testing.

## Managed assets

- `~/.gemini/config/hooks/olympus-save-turn.js`
- named entry `olympus-antigravity-mnemo` in `~/.gemini/config/hooks.json`
- marked rules block in `~/.gemini/GEMINI.md`

The installer also migrates Olympus-managed Gemini CLI Mnemo assets. Unmodified legacy files are removed; modified files are preserved under `~/.gemini/_olympus-preserved/`.

## Runtime contract

The Stop hook reads Antigravity's `transcriptPath`, stores the latest user and model turn in `conversations/YYYY-MM-DD-antigravity.md`, redacts `<private>` blocks, and always permits the Stop event.

## Rules and past-work lookup

The global policy source is [templates/gemini-md-rules.md](templates/gemini-md-rules.md): respond in the request's language, use code maps before broad code searches, and search `MEMORY.md` → relevant memory entries → conversation links/tags → conversation text. Preserve native Antigravity workflows and use Olympus only for their documented additional deliverables.

If these sources are insufficient, narrow the project and time range and confirm the actual source transcript path and format. `hooks/save-turn.js` exports `latestTurn(payload)` for read-only extraction of the latest user/model pair; it is not a full-history recovery command. Earlier turns require scoped, read-only parsing of user/model text. Never call `appendTurn` or replay the Stop hook for a read-only request, and never load an entire transcript into context or claim an unavailable recovery command succeeded.

Use `--check` after installation. A failed check means the adapter is not verified; do not report Mnemo as active.
