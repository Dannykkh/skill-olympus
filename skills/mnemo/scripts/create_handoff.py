#!/usr/bin/env python3
"""
Smart scaffold generator for handoff documents.

Creates a new handoff document with auto-detected metadata:
- Current timestamp
- Project path
- Git branch (if available)
- Recent git log
- Modified/staged files
- Handoff chain linking

Usage:
    python create_handoff.py [task-slug] [--continues-from <previous-handoff>]
    python create_handoff.py "implementing-auth"
    python create_handoff.py "auth-part-2" --continues-from 2024-01-15-auth.md
    python create_handoff.py  # auto-generates slug from timestamp
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote, urlsplit
from mnemo_project_root import detect_project_root

# Windows에서 print()가 한글을 cp949로 출력하다 깨지는 것을 방지.
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def run_cmd(cmd: list[str], cwd: str = None) -> tuple[bool, str]:
    """Run a command and return (success, output).

    UTF-8 명시: Windows에서 git 출력에 한글이 포함되면 cp949 기본 디코딩이
    실패하므로 명시적으로 utf-8 + errors='replace'로 보호한다.
    """
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            cwd=cwd,
            timeout=10
        )
        return result.returncode == 0, result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False, ""


def get_git_info(project_path: str) -> dict:
    """Gather git information from the project."""
    info = {
        "is_git_repo": False,
        "branch": None,
        "recent_commits": [],
        "modified_files": [],
        "staged_files": [],
    }

    # Check if git repo
    success, _ = run_cmd(["git", "rev-parse", "--git-dir"], cwd=project_path)
    if not success:
        return info

    info["is_git_repo"] = True

    # Get current branch
    success, branch = run_cmd(["git", "branch", "--show-current"], cwd=project_path)
    if success and branch:
        info["branch"] = branch

    # Get recent commits (last 5)
    success, log = run_cmd(
        ["git", "log", "--oneline", "-5", "--no-decorate"],
        cwd=project_path
    )
    if success and log:
        info["recent_commits"] = log.split("\n")

    # Get modified files (unstaged)
    success, modified = run_cmd(
        ["git", "diff", "--name-only"],
        cwd=project_path
    )
    if success and modified:
        info["modified_files"] = modified.split("\n")

    # Get staged files
    success, staged = run_cmd(
        ["git", "diff", "--name-only", "--cached"],
        cwd=project_path
    )
    if success and staged:
        info["staged_files"] = staged.split("\n")

    return info


def find_previous_handoffs(project_path: str) -> list[dict]:
    """Find existing handoffs in the project."""
    handoffs_dir = Path(project_path) / "docs" / "handoffs"
    if not handoffs_dir.exists():
        return []

    handoffs = []
    for filepath in handoffs_dir.glob("*.md"):
        # Extract title from file
        try:
            # encoding 명시: Windows cp949 기본을 피하고 한국어 핸드오프 안전 처리
            content = filepath.read_text(encoding="utf-8")
            match = re.search(r'^#\s+(?:Handoff:\s*)?(.+)$', content, re.MULTILINE)
            title = match.group(1).strip() if match else filepath.stem
        except Exception:
            title = filepath.stem

        # Parse date from filename
        date_match = re.match(r'(\d{4}-\d{2}-\d{2})-(\d{6})', filepath.name)
        if date_match:
            try:
                date = datetime.strptime(
                    f"{date_match.group(1)} {date_match.group(2)}",
                    "%Y-%m-%d %H%M%S"
                )
            except ValueError:
                date = None
        else:
            date = None

        handoffs.append({
            "filename": filepath.name,
            "path": str(filepath),
            "title": title,
            "date": date,
        })

    # Sort by date, most recent first
    handoffs.sort(key=lambda x: x["date"] or datetime.min, reverse=True)
    return handoffs


def get_previous_handoff_info(project_path: str, continues_from: str = None) -> dict:
    """Get information about the previous handoff for chaining."""
    handoffs = find_previous_handoffs(project_path)

    if continues_from:
        # Find specific handoff
        for h in handoffs:
            if continues_from in h["filename"]:
                return {
                    "exists": True,
                    "filename": h["filename"],
                    "title": h["title"],
                }
        return {"exists": False, "filename": continues_from, "title": "Not found"}

    elif handoffs:
        # Suggest most recent
        most_recent = handoffs[0]
        return {
            "exists": True,
            "filename": most_recent["filename"],
            "title": most_recent["title"],
            "suggested": True,
        }

    return {"exists": False}


def architecture_memory_present(root: Path) -> bool:
    """Find substantive architecture memory, including linked split entries.

    This is a presence check, not an assessment of architectural completeness.
    Never follow links outside this project's memory directory.
    """
    memory = (root / "memory").resolve()
    pending = [memory / "architecture.md", memory / "architecture" / "index.md"]
    index = root / "MEMORY.md"
    links = re.compile(r'\[([^\]]*)\]\(([^)]+)\)')

    def local_target(base: Path, target: str):
        parsed = urlsplit(target.strip().strip("<>"))
        if parsed.scheme or parsed.netloc or not parsed.path:
            return None
        candidate = (base / unquote(parsed.path)).resolve()
        if candidate.is_relative_to(memory) and candidate.suffix == ".md":
            return candidate
        return None

    if index.is_file():
        for label, target in links.findall(index.read_text(encoding="utf-8-sig")):
            if re.search(r'architecture|아키텍처|설계|구조', label + " " + target, re.I):
                candidate = local_target(root, target)
                if candidate:
                    pending.append(candidate)
    visited = set()
    while pending:
        path = pending.pop()
        if path in visited or not path.is_file() or not path.resolve().is_relative_to(memory):
            continue
        visited.add(path)
        text = path.read_text(encoding="utf-8-sig")
        for _, target in links.findall(text):
            candidate = local_target(path.parent, target)
            if candidate:
                pending.append(candidate)
        # Index tables/headings and empty hook scaffolds are not remembered decisions.
        if path.name == "index.md":
            continue
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith(("#", "<!--", "```", "~~~")):
                continue
            if "MEMORY.md 키워드 인덱스에서 이 파일로 연결됩니다." in line:
                continue
            if re.fullmatch(r'[-*_\s]+', line):
                continue
            if re.match(r'(?:[-*>]\s*)?[`*]*(tags|date|source|status)[`*]*\s*:', line, re.I):
                continue
            if re.search(r'\bTODO\b|\[placeholder\]', line, re.I):
                continue
            if links.sub("", line).strip(" -*>"):
                return True
    return False


def origin_cell(value: str) -> str:
    """Keep explicitly supplied origin text inside one Markdown table cell."""
    return " ".join(value.split()).replace("|", "&#124;").replace("<", "&lt;").replace(">", "&gt;")


def _relativize(raw, root: Path) -> str | None:
    """기록 안의 경로를 루트 기준 상대경로로. 루트 밖이면 계보 대상이 아니므로 버린다."""
    if not raw:
        return None
    text = str(raw).replace("\\", "/").strip()
    prefix = str(root).replace("\\", "/").rstrip("/") + "/"
    if text.lower().startswith(prefix.lower()):
        text = text[len(prefix):]
    elif text.startswith("/") or re.match(r'^[A-Za-z]:/', text):
        # 같은 루트를 다른 표기로 적은 옛 기록(Windows 8.3 단축 경로, 심볼릭 링크)도 붙여야 한다.
        try:
            text = Path(raw).resolve().relative_to(root.resolve()).as_posix()
        except (ValueError, OSError):
            return None  # 루트 밖 — 계보 대상이 아니다
    return text.lstrip("./") or None


def observed_files(root: Path) -> list[str]:
    """오늘 관찰 로그가 기록한 편집·생성 파일.

    git이 없는 프로젝트에서도 "이 세션이 무엇을 고쳤나"가 남는 유일한 자리다.
    회전된 `.bak`은 읽지 않는다 — 오늘 것은 현재 로그에 있다.
    """
    today = datetime.now().strftime("%Y-%m-%d")
    found: list[str] = []
    for log in sorted((root / "memory").glob("*/observations.jsonl")):
        for line in log.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if not line or '"Edit"' not in line and '"Write"' not in line:
                continue
            try:
                record = json.loads(line)
            except ValueError:
                continue
            if record.get("tool") not in ("Edit", "Write", "NotebookEdit"):
                continue
            if not str(record.get("timestamp", "")).startswith(today):
                continue
            payload = record.get("input")
            if isinstance(payload, str):
                try:
                    payload = json.loads(payload)
                except ValueError:
                    payload = None
            if not isinstance(payload, dict):
                continue
            path = _relativize(payload.get("file_path") or payload.get("notebook_path"), root)
            if path and path not in found:
                found.append(path)
    return found


def anchored_entries(root: Path, files: list[str]) -> list[tuple[str, str]]:
    """이번 세션이 고친 파일을 근거로 삼는 기존 기억 항목.

    결정을 뒤집는 순간은 옛 것과 새 것을 동시에 아는 유일한 순간인데, 그때 쓰는 사람은
    이미 절반을 잊었다. 그래서 "무엇을 대체하나"를 기억해내라고 요구하는 대신 후보로 내민다.
    판정은 사람이 한다 — 이 목록은 대체를 주장하지 않는다.
    """
    if not files:
        return []
    interesting = [f for f in files if not f.startswith(("memory/", "conversations/", "docs/handoffs/"))]
    if not interesting:
        return []
    hits: list[tuple[str, str]] = []
    for entry in sorted((root / "memory").glob("*/[0-9]*.md")):
        text = entry.read_text(encoding="utf-8", errors="replace")
        matched = [f for f in interesting if f in text]
        if not matched:
            continue
        title = next((line.lstrip("# ").strip() for line in text.splitlines()
                      if line.startswith("# ")), entry.stem)
        hits.append((f"{entry.parent.name}/{entry.stem}", f"{title} — {', '.join(matched[:3])}"))
    return hits


# 기억이 있는 프로젝트에서는 아래 조건부 진단이 언제나 건너뛴다. 그러면 닥터의 점검은
# 사람이 따로 기억해서 부를 때만 도는데, 그건 오늘 우리가 실패로 측정한 규율 의존이다.
# 그래서 두 번째 방아쇠를 둔다 — 마지막 방문이 이만큼 지났으면 이번 핸드오프에 한 번 본다.
# 핸드오프는 사람이 프로젝트를 생각하고 있는 순간이라 자리가 맞고, 한 달에 한 번이면
# 백로그가 의식이 되지 않는다. 지난 방문 시각은 닥터가 차트에 남긴 것을 그대로 읽는다.
DOCTOR_VISIT_DAYS = 30
DOCTOR_CHART = "memory/.mnemo-doctor-chart.md"


def days_since_doctor_visit(root: Path):
    """차트의 마지막 방문 이후 지난 날. 차트가 없으면 None (= 한 번도 안 봄)."""
    chart = root / DOCTOR_CHART
    if not chart.is_file():
        return None
    # 형식의 주인은 mnemo_doctor.append_chart 다: `## YYYY-MM-DD HH:MM · <모드>`
    visits = re.findall(r'^##\s+(\d{4}-\d{2}-\d{2})\s', chart.read_text(encoding="utf-8", errors="replace"), re.M)
    if not visits:
        return None
    try:
        last = datetime.strptime(max(visits), "%Y-%m-%d")
    except ValueError:
        return None
    return (datetime.now() - last).days


def refresh_anchor_index(root: Path) -> str:
    """앵커 역색인을 다시 만든다.

    색인을 갱신하는 주체가 Claude의 PostToolUse 훅 하나뿐이면, 도구 단위 훅이 없는 CLI
    (Codex의 notify, 턴 단위만 받는 어댑터)에서는 색인이 영원히 낡는다. 핸드오프는 네 CLI가
    모두 지나는 자리이고 이미 파이썬이 떠 있으므로, 여기서 한 번 다시 만들면 조회가 어디서나 산다.
    실패해도 핸드오프는 계속 쓴다 — 색인은 파생물이고 없으면 조회만 못 할 뿐이다.
    """
    try:
        import build_anchor_index as anchors
    except ImportError:
        return "SKIPPED — build_anchor_index 없음"
    try:
        index = anchors.build(root)
        if not index:
            return "SKIPPED — 앵커를 가진 항목 없음"
        target = root / "memory" / ".mnemo-anchor-index.md"
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary = target.with_name(f"{target.name}.tmp-{os.getpid()}")
        temporary.write_text(anchors.render(root, index), encoding="utf-8", newline="\n")
        os.replace(temporary, target)
        return f"RAN — 파일 {len(index)}개"
    except (OSError, UnicodeError, ValueError) as error:
        return f"ERROR — {error}"


def memory_preflight(root: Path) -> str:
    """Run Doctor when architecture memory is absent, or when the last visit is old enough."""
    overdue = days_since_doctor_visit(root)
    periodic = overdue is None or overdue >= DOCTOR_VISIT_DAYS
    try:
        if architecture_memory_present(root) and not periodic:
            return (f"SKIPPED — 아키텍처 기억 본문 확인; 마지막 닥터 방문 {overdue}일 전 "
                    f"(주기 {DOCTOR_VISIT_DAYS}일 미도래)")
        reason = ("아키텍처 기억 없음/빈 상태" if not architecture_memory_present(root)
                  else (f"마지막 닥터 방문이 {overdue}일 전" if overdue is not None else "닥터 방문 기록 없음"))
    except (OSError, UnicodeError, ValueError) as error:
        print(f"[Mnemo] ERROR: 아키텍처 기억 검사 실패: {error}")
        return "ERROR — 아키텍처 기억을 읽지 못함; 수동 진단 및 기억 보완 필요"
    script = Path(__file__).with_name("mnemo_doctor.py")
    print(f"[Mnemo] {reason} — 닥터 진단 자동 실행 (수정 없음, 이번 방문을 차트에 기록)")
    try:
        result = subprocess.run(
            # --chart: 방문을 남겨야 다음 핸드오프가 차이만 보고하고 주기 타이머가 다시 시작된다.
            [sys.executable, "-B", str(script), "--project-root", str(root), "--chart"],
            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=120,
        )
    except (OSError, subprocess.TimeoutExpired) as error:
        print(f"[Mnemo] NOT RUN/ERROR: {error}")
        return "ERROR — 닥터 실행 불가/시간 초과; 수동 진단 및 기억 보완 필요"
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    if result.returncode not in (0, 1):
        return f"ERROR — 닥터 종료 코드 {result.returncode}; 수동 확인 필요"
    return (f"RAN ({reason}) — 닥터 종료 코드 {result.returncode} (진단만, 방문을 차트에 기록). "
            "작업목록은 프로젝트 전체 백로그다; 위에서부터 골라 처리하고, 무관한 날은 차트에 "
            "`- 무관: <날짜>`로 닫을 것. 종료 코드 0은 기억 보완 완료를 뜻하지 않음")


def generate_handoff(
    project_path: str,
    slug: str = None,
    continues_from: str = None,
    *, explicit: bool = False, origin: str | None = None, origin_source: str | None = None,
) -> str:
    """Generate a handoff document with pre-filled metadata."""

    if (origin is None) != (origin_source is None):
        raise ValueError("--origin and --origin-source must be provided together")
    if origin is not None and (not origin.strip() or not origin_source.strip()):
        raise ValueError("--origin and --origin-source must not be empty")
    project_root = detect_project_root(Path(project_path), explicit=explicit)
    if not project_root.is_dir():
        raise ValueError(f"project directory does not exist: {project_root}")
    project_path = str(project_root)

    # Generate timestamp and filename
    now = datetime.now()
    timestamp = now.strftime("%Y-%m-%d %H:%M:%S")
    file_timestamp = now.strftime("%Y-%m-%d-%H%M%S")

    if not slug:
        slug = "handoff"

    # Sanitize slug
    slug = slug.lower().replace(" ", "-").replace("_", "-")
    slug = "".join(c for c in slug if c.isalnum() or c == "-")

    filename = f"{file_timestamp}-{slug}.md"

    # Create handoffs directory
    handoffs_dir = Path(project_path) / "docs" / "handoffs"
    handoffs_dir.mkdir(parents=True, exist_ok=True)
    (project_root / ".mnemo-root").touch(exist_ok=True)

    anchor_check = refresh_anchor_index(project_root)
    memory_check = memory_preflight(project_root)

    filepath = handoffs_dir / filename

    # Gather git info
    git_info = get_git_info(project_path)

    # Get previous handoff info for chaining
    prev_handoff = get_previous_handoff_info(project_path, continues_from) if continues_from else {}

    # Build pre-filled sections
    branch_line = git_info["branch"] if git_info["branch"] else "[not a git repo or detached HEAD]"

    # Recent commits section
    if git_info["recent_commits"]:
        commits_section = "\n".join(f"  - {c}" for c in git_info["recent_commits"])
    else:
        commits_section = "  - [no recent commits or not a git repo]"

    # Modified files section
    # git과 관찰 로그를 합친다. git이 없는 프로젝트에서는 관찰이 유일한 근거이고,
    # git이 있어도 커밋 전 편집은 관찰에만 남는다.
    observed = observed_files(project_root)
    all_modified = sorted(set(git_info["modified_files"] + git_info["staged_files"]) | set(observed))
    if all_modified:
        modified_section = "\n".join(f"| {f} | [describe changes] | [why changed] |" for f in all_modified[:10])
        if len(all_modified) > 10:
            modified_section += f"\n| ... and {len(all_modified) - 10} more files | | |"
        if observed:
            modified_section += f"\n\n<!-- 관찰 로그에서 {len(observed)}개 자동 수집 (오늘 Edit/Write) -->"
    else:
        modified_section = "| [no modified files detected] | | |"

    # 대체 후보 — 이번에 고친 파일을 근거로 삼는 기존 항목. 판정은 사람이 한다.
    candidates = anchored_entries(project_root, all_modified)
    if candidates:
        listed = "\n".join(f"> - `[[{stem.split('/')[-1]}]]` ({stem.split('/')[0]}) — {why}"
                           for stem, why in candidates[:8])
        supersede_note = f"""
> **이번에 고친 파일을 근거로 삼는 기존 항목입니다.** 뒤집은 것이 있으면 위 표의 `대체 대상`에
> 적고, 그 기억 항목에 `SUPERSEDED`·`superseded-by`·바꾼 이유를 남기세요. 무관하면 그대로 둡니다.
>
{listed}
"""
    else:
        supersede_note = ""

    # Origin section — 이어받는 세션은 출처를 선행 핸드오프로 미리 채운다.
    # 최초 요구는 한 번만 적고, 이후 세션은 그 링크를 따라가면 되게 한다.
    if origin is not None:
        origin_requirement = origin_cell(origin)
        origin_source = origin_cell(origin_source)
    elif prev_handoff.get("exists"):
        origin_requirement = "[TODO: 요청받은 것 — 현재 세션에서 확인]"
        origin_source = (f"[{prev_handoff['filename']}](./{prev_handoff['filename']}) 에서 이어짐 "
                         f"— 최초 요구가 거기에 없으면 그 핸드오프의 Origin을 따라 올라갈 것")
    else:
        origin_requirement = "[TODO: 요청받은 것 — 현재 세션에서 확인]"
        origin_source = "[TODO: 사용자 요청 / 이슈 / spec·설계 문서 경로]"
    # 일별 대화에는 세션 경계가 없어 최초 요구를 추측하지 않는다.
    origin_section = f"""## Origin

기능을 구현·변경한 세션은 채운다. 탐색·문서·설정만 한 세션은 각 칸을 `N/A — <이유>`로 둔다.

| 항목 | 내용 |
|------|------|
| 요구 | {origin_requirement} |
| 출처 | {origin_source} |
| 해결할 문제 | [TODO: 이 요구가 없애려는 불편·위험. "왜 지금인가"] |"""

    # Handoff chain section
    if prev_handoff.get("exists"):
        chain_section = f"""## Handoff Chain

- **Continues from**: [{prev_handoff['filename']}](./{prev_handoff['filename']})
  - Previous title: {prev_handoff.get('title', 'Unknown')}
- **Supersedes**: [list any older handoffs this replaces, or "None"]

> Review the previous handoff for full context before filling this one."""
    else:
        chain_section = """## Handoff Chain

- **Continues from**: None (fresh start)
- **Supersedes**: None

> This is the first handoff for this task."""

    # Project:에는 절대경로가 아니라 폴더 이름만 적는다. 다른 컴퓨터·다른 드라이브에서 열어도
    # 같은 프로젝트임을 알 수 있고, 루트 판별은 항상 핸드오프 파일 위치(docs/handoffs/)로 한다.
    # Generate the document
    content = f"""# Handoff: [TASK_TITLE - replace this]

## Session Metadata
- Created: {timestamp}
- Project: {project_root.name}
- Branch: {branch_line}
- Session duration: [estimate how long you worked]

### Recent Commits (for context)
{commits_section}

{chain_section}

{origin_section}

## Current State Summary

[TODO: Write one paragraph describing what was being worked on, current status, and where things left off]

## Session Memory Review

- Architecture preflight: {memory_check}
- Anchor index: {anchor_check} — 파일에서 결정으로 되짚는 역색인 (build_anchor_index.py --file <경로>)
- Memory/index updates: [TODO: 실제 갱신한 기억·인덱스 링크 또는 변경 불필요 근거]
- Retrieval verification: [TODO: 기록한 검색어로 MEMORY.md → 해당 항목을 다시 찾은 결과]
- Observations: [TODO: 세션 ID·시작 시각으로 한정한 정제 결과; 기존 백로그 제외]

## Feature/Flow/Decision Snapshot

This is the session's implemented-feature map. Always fill **Implemented Features** and **Feature Boundary**. **Composition/Flow diagrams are required only for feature-bearing sessions** — a session that implemented or changed a feature. For non-feature handoffs (docs/config/refactor/exploration only), set Implemented Features to a single `none — <reason>` row and replace each diagram body with `N/A — <reason>` (or omit the diagram subsections); forcing a diagram on a typo fix is ceremony, not signal. If TermSnap CodeMap/Wiki/Report exists, link it as supporting evidence; do not treat this section as a replacement for CodeMap.

### Implemented Features

| Feature/Change | Visible Behavior | Entry Point | Implementation Anchors | Verification |
|----------------|------------------|-------------|------------------------|--------------|
| [TODO: Feature or change name] | [TODO: What user/agent can now do or observe] | [TODO: UI/API/command/hook/file] | [TODO: files/classes/methods] | [검증함: 근거 / NOT RUN: 이유 / 기록 없음] |

### Feature Boundary

| Feature/Area | Does | Does Not Do | Source of Truth |
|--------------|------|-------------|-----------------|
| [TODO: Feature or area name] | [TODO: Responsibility] | [TODO: Non-goal/boundary] | [TODO: code/doc/spec path] |

### Menu / Screen Map

UI/메뉴가 있는 프로젝트만 작성 (CLI/library/backend-only는 `N/A` 또는 생략). 행 단위는 화면(screen/view), 메뉴는 그룹 컬럼.

| Menu | Screen / View | Features on this screen | Route/Path | Status |
|------|---------------|-------------------------|------------|--------|
| [TODO: menu group — or N/A if no UI] | [TODO: screen/view name] | [TODO: feature A, B, C] | [TODO: /route] | [TODO: done / partial / planned] |

### Composition Diagram

```mermaid
flowchart TB
    Actor[TODO: User / Agent] --> Entry[TODO: Entry point]
    Entry --> Feature[TODO: Implemented feature]
    Feature --> Module[TODO: Module / service / component]
    Module --> State[TODO: State / storage / generated artifact]
    Feature --> Surface[TODO: UI / report / API / handoff surface]
```

### Flow Diagram

```mermaid
flowchart LR
    Input[TODO: Input / trigger] --> Process[TODO: Processing]
    Process --> Store[TODO: State / storage]
    Store --> Surface[TODO: UI / report / API surface]
```

### Decision Records

| Decision | Options Considered | Rationale | Record/Follow-up |
|----------|--------------------|-----------|------------------|
| [TODO: Decision] | [TODO: A / B / C] | [TODO: why] | [TODO: ADR/doc path or follow-up] |

## Codebase Understanding

### Architecture Overview

[TODO: Document key architectural insights discovered during this session]

### Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| [TODO: Add critical files] | | |

### Key Patterns Discovered

[TODO: Document important patterns, conventions, or idioms found in this codebase]

## Work Completed

### Tasks Finished

- [ ] [TODO: List completed tasks]

### Files Modified

| File | Changes | Rationale |
|------|---------|-----------|
{modified_section}

### Decisions Made

`대체 대상`은 이 결정이 뒤집은 기존 기억 항목이다. 없으면 `none`. 있으면 그 항목에도
`SUPERSEDED`·`superseded-by`·바꾼 이유를 남긴다 — 옛 것과 새 것을 동시에 아는 순간은 지금뿐이다.

| Decision | Options Considered | Rationale | 대체 대상 |
|----------|-------------------|-----------|-----------|
| [TODO: Document key decisions] | [TODO: 탈락 대안과 그 논거 — 없으면 none] | | [none 또는 [[NNN-slug]]] |
{supersede_note}

## Pending Work

### Immediate Next Steps

1. [TODO: Most critical next action]
2. [TODO: Second priority]
3. [TODO: Third priority]

### Blockers/Open Questions

- [ ] [TODO: List any blockers or open questions]

### Deferred Items

- [TODO: Items deferred and why]

## Context for Resuming Agent

### Important Context

[TODO: This is the MOST IMPORTANT section - write critical information the next agent MUST know]

### Assumptions Made

- [TODO: List assumptions made during this session]

### Potential Gotchas

- [TODO: Document things that might trip up a new agent]

## Environment State

### Tools/Services Used

- [TODO: List relevant tools and their configuration]

### Active Processes

- [TODO: Note any running processes, servers, etc.]

### Environment Variables

- [TODO: List relevant env var NAMES only - NEVER include actual values/secrets]

## Related Resources

- [TODO: Add links to relevant docs and files]

---

**Security Reminder**: Before finalizing, run `validate_handoff.py` to check for accidental secret exposure.
"""

    # Write the file (UTF-8 명시: Windows cp949 fallback 방지)
    filepath.write_text(content, encoding="utf-8")

    return str(filepath)


def main():
    parser = argparse.ArgumentParser(
        description="Create a new handoff document with smart scaffolding"
    )
    parser.add_argument(
        "slug",
        nargs="?",
        default=None,
        help="Short identifier for the handoff (e.g., 'implementing-auth')"
    )
    parser.add_argument(
        "--continues-from",
        dest="continues_from",
        help="Filename of previous handoff this continues from"
    )

    parser.add_argument("--project-root", type=Path, help="Explicit project workspace (required to initialize a non-Git project)")
    parser.add_argument("--origin", help="User request confirmed in the current session (paired with --origin-source)")
    parser.add_argument("--origin-source", help="Evidence for the request: session ID, issue, or specification")
    args = parser.parse_args()

    try:
        project_path = str(detect_project_root(args.project_root or Path.cwd(), explicit=args.project_root is not None))
    except ValueError as error:
        parser.error(str(error))

    # Check for existing handoffs to suggest chaining
    if not args.continues_from:
        prev_handoffs = find_previous_handoffs(project_path)
        if prev_handoffs:
            print(f"Found {len(prev_handoffs)} existing handoff(s).")
            print(f"Most recent: {prev_handoffs[0]['filename']}")
            print(f"Use --continues-from <filename> to link handoffs.\n")

    # Generate handoff
    try:
        filepath = generate_handoff(project_path, args.slug, args.continues_from, explicit=args.project_root is not None,
                                    origin=args.origin, origin_source=args.origin_source)
    except ValueError as error:
        parser.error(str(error))

    print(f"Created handoff document: {filepath}")
    print(f"\nNext steps:")
    print(f"1. Open {filepath}")
    print(f"2. Replace [TODO: ...] placeholders with actual content")
    print(f"3. Focus especially on 'Origin', 'Feature/Flow/Decision Snapshot', 'Important Context', and 'Immediate Next Steps'")
    print(f"4. Run: python validate_handoff.py {filepath}")
    print(f"   (Checks for completeness and accidental secrets)")

    return filepath


if __name__ == "__main__":
    main()
