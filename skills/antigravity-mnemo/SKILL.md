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

## 프로젝트 저장 경계

`MEMORY.md`, `memory/`, `conversations/`는 프로젝트 안에 보관한다. Git 루트를 우선하며,
명시한 비-Git workspace는 그대로 사용한다. 하위 cwd에서는 `.mnemo-root`를 찾되,
일반 `MEMORY.md`·`conversations/`가 있다는 이유로 상위 폴더를 채택하지 않는다.
저장 시 생기는 `.mnemo-root`는 절대경로를 담지 않으므로 프로젝트와 함께 이동한다.
HOME·CLI 설정 폴더·무효 경로에는 기록하지 않는다. workspace 정보가 없으면 프로세스
cwd로 추측해 쓰지 않고 저장을 건너뛴다. 정상 payload와 쓰기 권한이 있어야 자동 저장된다.
기존에 외부로 흩어진 기록은 이 변경만으로 이동되지 않으며 원본 세션으로 소속을 확인해야 한다.
