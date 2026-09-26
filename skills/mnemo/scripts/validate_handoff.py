#!/usr/bin/env python3
"""
Validate a handoff document for completeness and quality.

Checks:
- No TODO placeholders remaining
- Required sections present and populated
- No potential secrets detected
- Referenced files exist
- Memory entries this session touched carry their reserved tag fields (warning only)
- Component map findings were assigned or deferred (warning only)
- Quality scoring

Usage:
    python validate_handoff.py <handoff-file>
    python validate_handoff.py docs/handoffs/2024-01-15-143022-auth.md
"""

import json
import os
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path

from create_handoff import SESSION_ID, observed_files

# Windows에서 print()가 한글을 cp949로 출력하다 깨지는 것을 방지.
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Secret detection patterns
SECRET_PATTERNS = [
    (r'["\']?[a-zA-Z_]*api[_-]?key["\']?\s*[:=]\s*["\'][^"\']{10,}["\']', "API key"),
    (r'["\']?[a-zA-Z_]*password["\']?\s*[:=]\s*["\'][^"\']+["\']', "Password"),
    (r'["\']?[a-zA-Z_]*secret["\']?\s*[:=]\s*["\'][^"\']{10,}["\']', "Secret"),
    (r'["\']?[a-zA-Z_]*token["\']?\s*[:=]\s*["\'][^"\']{20,}["\']', "Token"),
    (r'["\']?[a-zA-Z_]*private[_-]?key["\']?\s*[:=]', "Private key"),
    (r'-----BEGIN [A-Z]+ PRIVATE KEY-----', "PEM private key"),
    (r'mongodb(\+srv)?://[^/\s]+:[^@\s]+@', "MongoDB connection string with password"),
    (r'postgres://[^/\s]+:[^@\s]+@', "PostgreSQL connection string with password"),
    (r'mysql://[^/\s]+:[^@\s]+@', "MySQL connection string with password"),
    (r'Bearer\s+[a-zA-Z0-9_\-\.]+', "Bearer token"),
    (r'ghp_[a-zA-Z0-9]{36}', "GitHub personal access token"),
    (r'sk-[a-zA-Z0-9]{48}', "OpenAI API key"),
    (r'xox[baprs]-[a-zA-Z0-9-]+', "Slack token"),
]

# Required sections for every handoff
REQUIRED_SECTIONS = [
    "Current State Summary",
    "Feature/Flow/Decision Snapshot",
    "Implemented Features",
    "Important Context",
    "Immediate Next Steps",
]

# Required ONLY for feature-bearing sessions (Implemented Features lists real features).
# Non-feature handoffs (docs/config/refactor/exploration) need not draw diagrams —
# forcing a composition diagram on a typo fix is ceremony, not signal.
# Origin joins this list for the same reason a diagram does: a session that builds a
# feature is the only place the requirement behind it is still known. Sessions that
# merely explore or tidy have no origin worth recording.
FEATURE_SESSION_REQUIRED_SECTIONS = [
    "Composition Diagram",
    "Origin",
]

# Recommended sections
RECOMMENDED_SECTIONS = [
    "Feature Boundary",
    "Menu / Screen Map",
    "Flow Diagram",
    "Decision Records",
    "Architecture Overview",
    "Critical Files",
    "Files Modified",
    "Decisions Made",
    "Assumptions Made",
    "Potential Gotchas",
]


def check_todos(content: str) -> tuple[bool, list[str]]:
    """Check for remaining TODO placeholders."""
    todos = re.findall(r'\[TODO:[^\]]*\]', content)
    return len(todos) == 0, todos


def is_feature_session(content: str) -> bool:
    """A handoff is 'feature-bearing' if its Implemented Features table lists at least
    one real feature row — not the scaffold placeholder ([...]/TODO) and not an explicit
    none/N/A. Composition/Flow diagrams are required only for feature-bearing sessions."""
    m = re.search(r'#{1,6}\s*Implemented Features', content, re.IGNORECASE)
    if not m:
        return False
    rest = content[m.end():]
    nxt = re.search(r'\n#{1,6}\s', rest)
    table = rest[:nxt.start()] if nxt else rest
    for line in table.splitlines():
        line = line.strip()
        if not line.startswith('|'):
            continue
        cells = [c.strip() for c in line.strip('|').split('|')]
        if not cells:
            continue
        first = cells[0]
        low = first.lower()
        # separator row (---, :--:) or header row
        if first and set(first) <= set('-: '):
            continue
        if low in ('feature/change', 'feature', 'feature/area', ''):
            continue
        # placeholder → not a real feature row
        if first.startswith('[') or 'todo' in low:
            continue
        # explicit none/N/A, optionally followed by a reason ("none - docs only")
        head = re.split(r'[\s\-—–:]+', low, 1)[0]
        if head in ('none', 'n/a', 'na', '없음', '해당') or low in ('-', ''):
            continue
        return True
    return False


def check_required_sections(content: str, required_sections: list) -> tuple[bool, list[str]]:
    """Check that required sections exist and have content."""
    missing = []
    for section in required_sections:
        # Look for section header
        pattern = rf'(?:^|\n)#{{1,6}}\s*{re.escape(section)}'
        match = re.search(pattern, content, re.IGNORECASE)
        if not match:
            missing.append(f"{section} (missing)")
        else:
            # Check if section has meaningful content (not just placeholder)
            section_start = match.end()
            next_section = re.search(r'\n##?\s+', content[section_start:])
            section_end = section_start + next_section.start() if next_section else len(content)
            section_content = content[section_start:section_end].strip()

            # 50 chars minimum: roughly 1-2 sentences, enough to convey meaningful context
            if len(section_content) < 50 or '[TODO' in section_content:
                missing.append(f"{section} (incomplete)")

    return len(missing) == 0, missing


def check_recommended_sections(content: str) -> list[str]:
    """Check which recommended sections are missing."""
    missing = []
    for section in RECOMMENDED_SECTIONS:
        pattern = rf'(?:^|\n)#{{1,6}}\s*{re.escape(section)}'
        if not re.search(pattern, content, re.IGNORECASE):
            missing.append(section)
    return missing


def scan_for_secrets(content: str) -> list[tuple[str, str]]:
    """Scan content for potential secrets."""
    findings = []
    for pattern, description in SECRET_PATTERNS:
        matches = re.findall(pattern, content, re.IGNORECASE)
        if matches:
            findings.append((description, f"Found {len(matches)} potential match(es)"))
    return findings


def check_file_references(content: str, base_path: str) -> tuple[list[str], list[str]]:
    """Check if referenced files exist."""
    # Extract file paths from content (look for common patterns)
    # Pattern 1: | path/to/file | in tables
    # Pattern 2: `path/to/file` in code
    # Pattern 3: path/to/file:123 with line numbers

    patterns = [
        r'\|\s*([a-zA-Z0-9_\-./]+\.[a-zA-Z]+)\s*\|',  # Table cells
        r'`([a-zA-Z0-9_\-./]+\.[a-zA-Z]+(?::\d+)?)`',  # Inline code
        r'(?:^|\s)([a-zA-Z0-9_\-./]+\.[a-zA-Z]+:\d+)',  # With line numbers
    ]

    found_files = set()
    for pattern in patterns:
        matches = re.findall(pattern, content)
        for match in matches:
            # Remove line numbers
            filepath = match.split(':')[0]
            # Skip obvious non-files
            if filepath and not filepath.startswith('http') and '/' in filepath:
                found_files.add(filepath)

    existing = []
    missing = []

    for filepath in found_files:
        full_path = Path(base_path) / filepath
        if full_path.exists():
            existing.append(filepath)
        else:
            missing.append(filepath)

    return existing, missing


def calculate_quality_score(
    todos_clear: bool,
    required_complete: bool,
    missing_required: list,
    missing_recommended: list,
    secrets_found: list,
    files_missing: list
) -> tuple[int, str]:
    """Calculate overall quality score (0-100).

    Scoring rationale:
    - Start at 100, deduct for issues
    - TODOs remaining (-30): Indicates incomplete work, major blocker
    - Missing required sections (-10 each): Core context gaps
    - Secrets detected (-20): Security risk, must be fixed
    - Missing file refs (-5 each, max -20): Stale references
    - Missing recommended (-2 each): Nice-to-have completeness
    """
    score = 100

    # Deductions with justifications
    if not todos_clear:
        # -30: TODOs indicate unfinished work; next agent will lack critical info
        score -= 30
    if not required_complete:
        # -10 per section: Required sections are essential for handoff continuity
        score -= 10 * len(missing_required)
    if secrets_found:
        # -20: Security risk; handoffs may be shared or stored in repos
        score -= 20
    if files_missing:
        # -5 per file (max 4): Indicates stale refs; cap at -20 to avoid over-penalizing
        score -= 5 * min(len(files_missing), 4)

    # -2 per section: Recommended but not critical; minor impact on handoff quality
    score -= 2 * len(missing_recommended)

    score = max(0, score)

    # Rating thresholds based on handoff usability:
    # 90+: Comprehensive, ready to use immediately
    # 70-89: Usable with minor gaps
    # 50-69: Needs work before reliable handoff
    # <50: Too incomplete to be useful
    if score >= 90:
        rating = "Excellent - Ready for handoff"
    elif score >= 70:
        rating = "Good - Minor improvements suggested"
    elif score >= 50:
        rating = "Fair - Needs attention before handoff"
    else:
        rating = "Poor - Significant work needed"

    return score, rating


def decision_rows(content: str) -> list[dict]:
    """Decisions Made 표의 실제 행. 스캐폴드 플레이스홀더는 행이 아니다."""
    section = re.search(r'#{2,4}\s*Decisions Made\s*\n(.*?)(?=\n#{2,4}\s|\Z)', content, re.S | re.I)
    if not section:
        return []
    rows = []
    for line in section.group(1).splitlines():
        if not line.strip().startswith("|"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 2 or not cells[0]:
            continue
        if re.match(r'^[-: ]+$', cells[0]) or cells[0].lower() == "decision":
            continue
        if cells[0].startswith("[TODO") or cells[0] in ("-", "—", "N/A", "없음"):
            continue
        rows.append({"decision": cells[0], "supersedes": cells[3] if len(cells) > 3 else ""})
    return rows


def check_decisions_reached_memory(content: str, root: Path) -> tuple[list[str], list[str]]:
    """이 세션의 결정이 기억까지 갔는가 — 이번 세션 범위의 점검.

    닥터는 프로젝트 전체 백로그를 본다. 인계하려는 사람 앞에 그것을 펼치면 읽지 않게 되고,
    핸드오프가 "기존 백로그는 처리하지 않는다"고 정한 것과도 어긋난다. 여기서 보는 것은
    이번 핸드오프가 적은 결정뿐이다: 기억으로 갔는가, 대체 대상이 실재하는가.

    핸드오프는 사건의 기록이라 곧 과거가 되고, 항목은 모든 미래 세션이 읽는 줄기다.
    결정이 핸드오프에만 남으면 다음 세션은 그것을 찾지 못한다.
    """
    problems, notes = [], []
    rows = decision_rows(content)
    if not rows:
        return problems, notes

    created = re.search(r'-\s*Created:\s*(\d{4}-\d{2}-\d{2})', content)
    day = created.group(1) if created else None

    # 대체 대상으로 적은 항목이 실재하는가 (기계적 확인)
    for row in rows:
        for stem in re.findall(r'\[\[([^\]|#]+)\]\]', row["supersedes"]):
            if not list((root / "memory").glob(f"*/{stem}.md")):
                problems.append(f"대체 대상 [[{stem}]] 을(를) memory/ 에서 찾지 못했습니다")

    # 결정을 적었는데 그날 기억 항목이 하나도 손대지 않았다면, 그 결정은 핸드오프에만 있다.
    if day:
        touched = [p for p in (root / "memory").glob("*/[0-9]*.md")
                   if ".bak-" not in p.name
                   and datetime.fromtimestamp(p.stat().st_mtime).strftime("%Y-%m-%d") == day]
        if not touched:
            notes.append(f"결정 {len(rows)}건을 적었지만 {day}에 기억 항목이 갱신되지 않았습니다 — "
                         "핸드오프는 이 세션과 함께 과거가 됩니다. 재사용할 결정은 memory/ 항목으로 옮기세요")
    return problems, notes


# 태그 줄 예약 필드 — 기억 항목을 건드린 응답은 그 번호를 태그 줄에 든다 (architecture 055).
# 폴더 → 예약 접두어. 콜론 형식만 예약 필드이고, 하이픈·약어는 자유 검색어로 읽힌다.
RESERVED_PREFIXES = {"architecture": "arch", "learned": "learned", "gotchas": "gotcha"}
RESERVED_FIELD = re.compile(r'\b(arch|learned|gotcha):(\d{3})\b')
LOOSE_FIELD = re.compile(r'\b(arch|learned|gotchas?|a|l|g)([-:])(\d{3})\b')
CANONICAL_PREFIX = {"arch": "arch", "a": "arch", "learned": "learned", "l": "learned",
                    "gotcha": "gotcha", "gotchas": "gotcha", "g": "gotcha"}


def _listed(items: list[str], limit: int = 8) -> str:
    shown = ", ".join(items[:limit])
    return shown + (f" 외 {len(items) - limit}건" if len(items) > limit else "")


TURN_HEADER = re.compile(r'^##\s*\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(User|Assistant)\b')
CLOCK = re.compile(r'\b\d{1,2}:\d{2}(?::\d{2})?\b')
ENTRY_PATH = re.compile(r'^memory/(architecture|learned|gotchas)/(\d{3})-[^/]+\.md$')


def _clock(text: str) -> str:
    """"9:05" → "09:05:00". 같은 날 안에서 문자열 비교로 시각을 견준다."""
    parts = [int(p) for p in text.split(":")]
    return f"{parts[0]:02d}:{parts[1]:02d}:{parts[2] if len(parts) > 2 else 0:02d}"


def session_scope(content: str, root: Path, day: str) -> tuple[str | None, str | None, str | None, bool]:
    """이 핸드오프가 넘기는 세션: (세션 ID, 시작 시각, 마지막 관찰 시각, 관찰 기록 유무).

    핸드오프는 한 세션의 인계다. 같은 날 다른 세션이 건드린 항목을 이 세션의 누락으로 적으면
    gotcha 091(Origin을 날짜 단위로 골라 남의 요청이 섞임)을 검증기에서 되풀이하게 된다.
    세션 ID는 Origin 출처(`session <uuid>, user turns 19:15·19:27`)에서, 시작 시각은 그 줄의
    가장 이른 턴과 관찰 로그의 첫 기록 중 이른 쪽이다. 모르면 None — 짐작하지 않는다.
    """
    # 본문이 이전 핸드오프나 gotcha의 세션을 인용할 수 있으니 이 핸드오프의 Origin 절을 먼저 본다.
    origin = re.search(r'(?ms)^#{2,4}\s*Origin\b(.*?)(?=^#{1,4}\s|\Z)', content)
    source = origin.group(1) if origin and SESSION_ID.search(origin.group(1)) else content
    match = SESSION_ID.search(source)
    if not match:
        return None, None, None, False
    session = match.group(1)
    line_end = source.find("\n", match.end())
    starts = [_clock(t) for t in CLOCK.findall(source[match.end():line_end if line_end >= 0 else None])]
    seen, last = False, None
    for log in sorted((root / "memory").glob("*/observations.jsonl")):
        for line in log.read_text(encoding="utf-8", errors="replace").splitlines():
            if session not in line:
                continue
            try:
                record = json.loads(line)
            except ValueError:
                continue
            stamp = str(record.get("timestamp", ""))
            if record.get("session") == session and stamp.startswith(day):
                seen = True
                starts.append(stamp[11:19])
                last = max(last or stamp[11:19], stamp[11:19])
    return session, (min(starts) if starts else None), last, seen


def check_tag_reserved_fields(content: str, root: Path) -> list[str]:
    """이 세션이 건드린 기억 항목의 번호가 이 세션의 태그 줄에 있는가 — 경고만, 게이트 아님.

    예약 필드는 쓰는 규칙만 있고 읽는 도구가 없어서, 결정 사흘 만에 누락과 `arch-057` 같은
    형식 오류가 섞여도 아무도 몰랐다. 결정 표가 없는 세션(gotcha만 쓴 날)도 대상이라
    check_decisions_reached_memory와 따로 돈다. 대화는 뿌리라 지난 태그 줄은 고치지 않는다 —
    그래서 경고는 "인계 응답의 태그 줄에 붙이라"는 출구를 함께 준다.
    세션을 특정하지 못하면(출처에 세션 ID가 없거나, 관찰 훅이 없는 Codex) 하루 전체로 보되
    그 사실을 경고 앞에 밝힌다 — 다른 세션의 항목이 섞였을 수 있다.
    """
    created = re.search(r'-\s*Created:\s*(\d{4}-\d{2}-\d{2})(?:\s+(\d{1,2}:\d{2}(?::\d{2})?))?', content)
    if not created:
        return []
    day = created.group(1)
    end = _clock(created.group(2)) if created.group(2) else None
    conversations = [p for p in sorted((root / "conversations").glob(f"{day}-*.md"))
                     if not p.name.endswith("-toollog.md")]
    if not conversations:
        return []  # 그날 대화 기록이 없으면 판단할 근거가 없다

    session, start, last, seen = session_scope(content, root, day)
    if end:
        # 인계 응답은 핸드오프를 만든 뒤, 마지막 도구 호출 뒤에 저장된다. 경고가 붙이라고 하는 곳이
        # 바로 그 응답이므로 창 끝을 max(생성, 마지막 관찰) + 15분으로 늘린다.
        tail = datetime.strptime(max(end, last or end), "%H:%M:%S") + timedelta(minutes=15)
        end = tail.strftime("%H:%M:%S") if tail.day == 1 else "23:59:59"  # 자정을 넘기면 그날 끝까지
    windowed = bool(start and end)

    # minimal: 태그 줄은 시간 창(세션 시작~인계 응답)으로만 세션에 붙인다 — Claude 대화 파일의 턴에
    # 세션 표시가 없어 같은 시각에 겹친 다른 세션은 섞인다. 저장 훅이 턴마다 세션 ID를 적으면 그것으로 거른다.
    tag_lines = []
    for conv in conversations:
        clock, speaker = None, None
        for line in conv.read_text(encoding="utf-8", errors="replace").splitlines():
            header = TURN_HEADER.match(line)
            if header:
                clock, speaker = _clock(header.group(1)), header.group(2)
                continue
            if not line.lstrip().startswith("#tags:"):
                continue
            if windowed and not (speaker == "Assistant" and clock and start <= clock <= end):
                continue
            tag_lines.append(line)
    tags_text = "\n".join(tag_lines)
    carried = {f"{p}:{n}" for p, n in RESERVED_FIELD.findall(tags_text)}

    changed_today = [(e, datetime.fromtimestamp(e.stat().st_mtime))
                     for folder in RESERVED_PREFIXES
                     for e in sorted((root / "memory" / folder).glob("[0-9][0-9][0-9]-*.md"))
                     if ".bak-" not in e.name]
    changed_today = [(e, m.strftime("%H:%M:%S")) for e, m in changed_today if m.strftime("%Y-%m-%d") == day]
    if session and seen:
        # 관찰 로그의 Edit/Write는 세션 ID를 들고 있어 이 세션이 고친 항목만 정확히 나온다.
        paths = [p for p in observed_files(root, day=day, session=session) if ENTRY_PATH.match(p)]
        entries = [root / p for p in paths if (root / p).is_file()]
        # Bash·스크립트로 고친 항목은 관찰 로그에 Edit/Write로 남지 않는다 — 세션 시간 창 안의 mtime으로 보탠다.
        # (태그 줄과 같은 창이라 같은 시각에 겹친 다른 세션은 섞일 수 있다 — 위 minimal 주석)
        if windowed:
            entries += [e for e, clock in changed_today if start <= clock <= end]
        scope = f"(세션 {session[:8]}) "
    else:
        # minimal: 세션을 특정 못 하면 파일 mtime으로 그날 전체를 본다 — 다른 세션·닥터 --fix 일괄 수정이 섞인다.
        # Codex에도 도구 단위 관찰이 생기거나 출처에 세션 ID가 적히면 위 경로로 좁혀진다.
        entries = [e for e, _ in changed_today]
        why = "출처에 세션 ID가 없어" if not session else "이 세션의 관찰 기록이 없어"
        scope = f"({why} {day} 하루 전체로 판단 — 다른 세션 항목이 섞였을 수 있습니다) "

    touched, superseding = [], []
    for entry in entries:
        field = f"{RESERVED_PREFIXES[entry.parent.name]}:{entry.name[:3]}"
        if field in touched:
            continue
        touched.append(field)
        text = entry.read_text(encoding="utf-8", errors="replace")
        if (re.search(rf'^`?date:\s*{day}', text, re.M)
                and re.search(r'^`?supersedes:', text, re.M)):
            superseding.append(field)

    notes = []
    missing = [field for field in touched if field not in carried]
    if missing:
        notes.append(f"{scope}건드린 항목 {_listed(missing)} 의 번호가 태그 줄에 없습니다 — "
                     "지난 태그 줄은 고치지 않으니, 인계 응답의 #tags:에 붙이세요")

    loose = {}
    for prefix, sep, number in LOOSE_FIELD.findall(tags_text):
        written = f"{prefix}{sep}{number}"
        canonical = f"{CANONICAL_PREFIX[prefix]}:{number}"
        if written != canonical:
            loose[written] = canonical
    if loose:
        pairs = [f"{bad} → {good}" for bad, good in loose.items()]
        notes.append(f"예약 필드로 읽히지 않는 표기: {_listed(pairs)} — 하이픈·약어는 자유 검색어가 됩니다")

    if superseding and "supersedes:" not in tags_text:
        notes.append(f"{scope}{_listed(superseding)} 은(는) 다른 결정을 대체했지만 "
                     "태그 줄에 `supersedes:#slug`가 없습니다")
    return notes


# 생성기가 쓰는 `- Component map:` 줄과, 에이전트가 같은 줄(또는 들여쓴 이어지는 줄)에 붙이는 해소 표식.
COMPONENT_LINE = re.compile(r'^[ \t]*[-*][ \t]*Component map:(.*(?:\n[ \t]{2,}\S.*)*)', re.M)
COMPONENT_RESOLVED = re.compile(r'배정함|보류:|NOT RUN')


def check_component_map_line(content: str) -> list[str]:
    """부품 지도 점검이 보고한 미배정·재생성·오류가 해소됐는가 — 경고만, 게이트 아님.

    지도는 LLM이 쓰고 TermSnap이 검증한다. 생성기는 상기만 하고 고치지 않으므로, 줄이 문제를
    보고했는데 에이전트가 배정하지도 보류 사유를 적지도 않았으면 그 상기가 지나간 것이다.
    줄이 없으면(지도 없는 프로젝트) 조용히 통과한다 — 생성기가 생략하는 조건과 짝이다.
    """
    match = COMPONENT_LINE.search(content)
    if not match or COMPONENT_RESOLVED.search(match.group(1)):
        return []
    text = match.group(1)
    open_items = []
    for label in ("미배정", "재생성 필요", "지도 오류"):
        count = re.search(rf'{label}\s+(\d+)', text)
        if count and int(count.group(1)) > 0:
            open_items.append(f"{label} {count.group(1)}")
    if "오래됨" in text:
        open_items.append("산출물이 지도보다 오래됨")
    if not open_items:
        return []
    return [f"{' · '.join(open_items)} — codemap/component-map.json에 배정하고 MCP "
            "codemap_component_map으로 검증한 뒤 같은 줄에 `→ 배정함: <부품>` 또는 "
            "`→ 보류: <이유>`를 적으세요"]


def validate_handoff(filepath: str) -> dict:
    """Run all validations on a handoff file."""
    path = Path(filepath)

    if not path.exists():
        return {"error": f"File not found: {filepath}"}

    # UTF-8 명시: Windows cp949 fallback 방지
    content = path.read_text(encoding="utf-8")
    base_path = path.parent.parent.parent  # Go up from docs/handoffs/

    # Feature-bearing sessions must also draw the diagram and record the origin; others need not.
    feature_session = is_feature_session(content)
    required_sections = list(REQUIRED_SECTIONS)
    if feature_session:
        required_sections += FEATURE_SESSION_REQUIRED_SECTIONS

    # Run checks
    todos_clear, remaining_todos = check_todos(content)
    required_complete, missing_required = check_required_sections(content, required_sections)
    missing_recommended = check_recommended_sections(content)
    secrets_found = scan_for_secrets(content)
    existing_files, missing_files = check_file_references(content, str(base_path))
    memory_problems, memory_notes = check_decisions_reached_memory(content, Path(base_path))
    tag_notes = check_tag_reserved_fields(content, Path(base_path))
    component_notes = check_component_map_line(content)

    # Calculate score
    score, rating = calculate_quality_score(
        todos_clear, required_complete, missing_required,
        missing_recommended, secrets_found, missing_files
    )

    return {
        "filepath": str(path),
        "score": score,
        "rating": rating,
        "feature_session": feature_session,
        "todos_clear": todos_clear,
        "remaining_todos": remaining_todos[:5],  # Limit output
        "todo_count": len(remaining_todos) if not todos_clear else 0,
        "required_complete": required_complete,
        "missing_required": missing_required,
        "missing_recommended": missing_recommended,
        "secrets_found": secrets_found,
        "files_verified": len(existing_files),
        "files_missing": missing_files[:5],  # Limit output
        "memory_problems": memory_problems,
        "memory_notes": memory_notes,
        "tag_notes": tag_notes,
        "component_notes": component_notes,
    }


def print_report(result: dict):
    """Print a formatted validation report."""
    if "error" in result:
        print(f"Error: {result['error']}")
        return False

    print(f"\n{'='*60}")
    print(f"Handoff Validation Report")
    print(f"{'='*60}")
    print(f"File: {result['filepath']}")
    print(f"\nQuality Score: {result['score']}/100 - {result['rating']}")
    print(f"{'='*60}")

    # TODOs
    if result['todos_clear']:
        print("\n[PASS] No TODO placeholders remaining")
    else:
        print(f"\n[FAIL] {result['todo_count']} TODO placeholders found:")
        for todo in result['remaining_todos']:
            print(f"       - {todo[:50]}...")

    # Feature-session classification (drives whether diagrams are required)
    if result.get('feature_session'):
        print("\n[INFO] Feature-bearing session - Composition Diagram and Origin required")
    else:
        print("\n[INFO] Non-feature session - diagrams optional (Implemented Features lists no real feature)")

    # Required sections
    if result['required_complete']:
        print("\n[PASS] All required sections complete")
    else:
        print("\n[FAIL] Missing/incomplete required sections:")
        for section in result['missing_required']:
            print(f"       - {section}")

    # Secrets
    if not result['secrets_found']:
        print("\n[PASS] No potential secrets detected")
    else:
        print("\n[WARN] Potential secrets detected:")
        for secret_type, detail in result['secrets_found']:
            print(f"       - {secret_type}: {detail}")

    # File references
    if result['files_missing']:
        print(f"\n[WARN] {len(result['files_missing'])} referenced file(s) not found:")
        for f in result['files_missing']:
            print(f"       - {f}")
    else:
        print(f"\n[INFO] {result['files_verified']} file reference(s) verified")

    # 이 세션의 결정이 기억까지 갔는가 (이번 세션 범위 — 프로젝트 전체 백로그는 닥터의 몫)
    if result.get('memory_problems'):
        print("\n[FAIL] 결정이 가리키는 기억 항목을 찾지 못했습니다:")
        for problem in result['memory_problems']:
            print(f"       - {problem}")
    if result.get('memory_notes'):
        print("\n[WARN] 결정이 기억으로 가지 않았습니다:")
        for note in result['memory_notes']:
            print(f"       - {note}")
    if result.get('tag_notes'):
        print("\n[WARN] 건드린 기억 항목이 태그 줄 예약 필드로 이어지지 않았습니다:")
        for note in result['tag_notes']:
            print(f"       - {note}")
    if result.get('component_notes'):
        print("\n[WARN] 부품 지도 미배정이 해소되지 않았습니다:")
        for note in result['component_notes']:
            print(f"       - {note}")

    # Recommended sections
    if result['missing_recommended']:
        print(f"\n[INFO] Consider adding these sections:")
        for section in result['missing_recommended']:
            print(f"       - {section}")

    print(f"\n{'='*60}")

    # Final verdict
    if result['secrets_found']:
        print("Verdict: BLOCKED - Remove secrets before handoff")
        return False
    elif result.get('memory_problems'):
        # 대체 대상이 실재하지 않으면 계보가 끊긴다. 기계적으로 확인되는 문제라 게이트로 막는다.
        print("Verdict: NEEDS WORK - 대체 대상 기억 항목을 만들거나 참조를 고치세요")
        return False
    elif not result['todos_clear'] or not result['required_complete']:
        print("Verdict: NEEDS WORK - Complete required sections")
        return False
    elif result['score'] >= 70:
        print("Verdict: READY for handoff")
        return True
    else:
        print("Verdict: NEEDS WORK - Complete required sections")
        return False


def main():
    if len(sys.argv) < 2:
        print("Usage: python validate_handoff.py <handoff-file>")
        print("Example: python validate_handoff.py docs/handoffs/2024-01-15-auth.md")
        sys.exit(1)

    filepath = sys.argv[1]
    result = validate_handoff(filepath)
    success = print_report(result)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
