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

The Stop hook reads Antigravity's `transcriptPath`, stores the latest user and model turn in `conversations/YYYY-MM-DD-antigravity.md`, redacts `<private>` blocks, and always permits the Stop event. It does not read native transcript files during later memory searches.

Use `--check` after installation. A failed check means the adapter is not verified; do not report Mnemo as active.
