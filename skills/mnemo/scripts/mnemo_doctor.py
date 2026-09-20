#!/usr/bin/env python3
"""
Diagnose one project's memory and report what drifted from the current structure.

Memory decays in ways nothing complains about: MEMORY.md outgrows its index budget,
entries lose the tags that make them findable, SUPERSEDED links point at entries that
were deleted, code anchors name files that moved, and the distillation baseline goes
stale after an observation log rotates. None of it is visible in a diff, because
memory/ is normally outside version control.

Scope is ONE PROJECT — memory lives in <project>/memory/, never in ~/.claude.

Judgement stays with the human. --fix only repairs what is purely mechanical: a
distillation baseline that no longer matches the files it counts, a `#slug` lifecycle
link that matches exactly one entry, and absolute in-project paths inside fixed-format
records (handoff `Project:` headers, tool-log Edit/Write lines, observation path fields).
Everything else is reported with the evidence needed to decide.

Usage:
    python mnemo_doctor.py                        # 진단만
    python mnemo_doctor.py --fix                  # 기계적으로 안전한 것만 수정
    python mnemo_doctor.py --chart                # 이번 방문을 진료 기록에 남긴다
    python mnemo_doctor.py --promote-structure    # 산문 앵커·암묵적 수명을 구조 줄로 (기억 본문 수정)
    python mnemo_doctor.py --project-root <path>
"""

import argparse
import functools
import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote

from mnemo_project_root import detect_project_root

# Windows에서 print()가 한글을 cp949로 출력하다 깨지는 것을 방지.
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

SCRIPTS = Path(__file__).resolve().parent

# 전역 규칙의 인덱스 예산. 넘으면 항상 로드되는 컨텍스트가 그만큼 잠식된다.
MEMORY_INDEX_MAX_LINES = 100
MEMORY_INDEX_MAX_BYTES = 5 * 1024

# 외부 사실(다른 런타임의 동작, 공식 문서)에 기댄 결정의 재확인 주기.
# 만료가 아니라 '다시 재 볼 때'다 — 013은 틀린 줄을 달고 165일을 CURRENT로 있었다.
EXTERNAL_VERIFY_DAYS = 90


class Report:
    """진단 결과. OK/WARN/FAIL과 근거를 함께 들고 있는다."""

    def __init__(self):
        self.rows = []

    def add(self, level, title, detail, hint=None):
        self.rows.append({"level": level, "title": title, "detail": detail, "hint": hint})

    @property
    def failures(self):
        return sum(1 for r in self.rows if r["level"] == "FAIL")

    @property
    def warnings(self):
        return sum(1 for r in self.rows if r["level"] == "WARN")


def count_lines(path: Path) -> int:
    if not path.is_file():
        return 0
    return sum(1 for line in path.read_text(encoding="utf-8", errors="replace").splitlines()
               if line.strip())


def memory_files(root: Path):
    memory = root / "memory"
    return (p for p in sorted(memory.rglob("*.md"))
            if not {"archive", ".archive"}.intersection(p.relative_to(memory).parts))


def headings(text: str):
    """ATX headings outside fenced examples, with character offsets."""
    offset, fence = 0, None
    result = []
    for line in text.splitlines(keepends=True):
        marker = re.match(r'^ {0,3}(`{3,}|~{3,})', line)
        if marker:
            token = marker.group(1)
            if fence is None:
                fence = token
            elif token[0] == fence[0] and len(token) >= len(fence):
                fence = None
        elif fence is None:
            match = re.match(r'^ {0,3}(#{1,6})\s+(.+)', line)
            if match:
                result.append((offset, len(match.group(1)), match.group(2).strip()))
        offset += len(line)
    return result


def without_fences(text: str) -> str:
    """Ignore example metadata and lifecycle declarations inside code fences."""
    lines, fence = [], None
    for line in text.splitlines():
        marker = re.match(r'^ {0,3}(`{3,}|~{3,})', line)
        if fence:
            if re.fullmatch(r' {0,3}' + re.escape(fence[0]) + '{' + str(len(fence)) + r',}\s*', line):
                fence = None
            lines.append('')
        elif marker:
            fence = marker.group(1)
            lines.append('')
        else:
            lines.append(line)
    return '\n'.join(lines)


def is_memory_index(path: Path, text: str) -> bool:
    if path.name.lower() in {'index.md', 'memory.md'}:
        return True
    hs = headings(text)
    if not hs or not re.search(r'카테고리 인덱스|색인|\bmemory index\b', hs[0][2], re.I):
        return False
    if not re.search(r'\]\(<?[^)]+\.md', text):
        return False
    # An index can have its own provenance, but detailed entries below it must
    # still be checked when this is a mixed index-and-content document.
    return not any(re.search(r'(?im)^\s*(?:[-*]\s*)?[`*]*#?(?:tags|source)\s*:',
                             without_fences(text[start:hs[i + 1][0] if i + 1 < len(hs) else len(text)]))
                   for i, (start, level, _) in enumerate(hs) if level > hs[0][1])


def iter_entry_blocks(root: Path):
    """memory/ 아래 정제 기억의 항목 단위 블록. 아카이브와 관찰 원본은 제외한다."""
    memory = root / "memory"
    if not memory.is_dir():
        return
    for path in memory_files(root):
        if path.name == "index.md" or path.name.startswith("."):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        if is_memory_index(path, text):
            continue
        hs = headings(text)
        if not hs:
            continue
        # Metadata immediately below a heading identifies an entry, not its subsections.
        annotated = [i for i, (start, _, _) in enumerate(hs)
                     if re.search(r'(?im)^\s*(?:[-*]\s*)?[`*]*#?(?:tags|date|source)\s*:',
                                  text[start:hs[i + 1][0] if i + 1 < len(hs) else len(text)])]
        levels = [hs[i][1] for i in annotated]
        fallback = min(levels) if levels else min(h[1] for h in hs if h[1] > 1) if any(h[1] > 1 for h in hs) else 1
        selected = [i for i, h in enumerate(hs) if h[1] == fallback]
        for i in selected:
            start, level, _ = hs[i]
            end = next((h[0] for h in hs[i + 1:] if h[1] <= level), len(text))
            yield path, text[start:end]


def check_structure(root: Path, report: Report) -> None:
    """저장 3계층이 자리에 있는가. 없다고 실패는 아니다 — 아직 안 쓴 것일 수 있다."""
    expected = {
        "MEMORY.md": "인덱스",
        "memory": "정제 기억",
        "conversations": "대화 기록",
        "docs/handoffs": "핸드오프",
    }
    missing = [f"{name}({role})" for name, role in expected.items() if not (root / name).exists()]
    if missing:
        report.add("WARN", "저장 구조", f"없는 계층: {', '.join(missing)}",
                   "기억을 쓰는 작업에서 자동 생성됩니다. 검색만 하려고 빈 파일을 만들지는 마세요.")
    else:
        report.add("OK", "저장 구조", "MEMORY.md / memory / conversations / docs/handoffs 모두 존재")


def check_index_budget(root: Path, report: Report) -> None:
    index = root / "MEMORY.md"
    if not index.is_file():
        report.add("WARN", "인덱스 예산", "MEMORY.md 없음")
        return
    text = index.read_text(encoding="utf-8", errors="replace")
    lines, size = len(text.splitlines()), len(text.encode("utf-8"))
    over = lines > MEMORY_INDEX_MAX_LINES or size > MEMORY_INDEX_MAX_BYTES
    detail = f"{lines}줄 / {round(size / 1024, 1)}KB (한도 {MEMORY_INDEX_MAX_LINES}줄·5KB)"
    report.add("WARN" if over else "OK", "인덱스 예산", detail,
               "카탈로그의 memory-compact 모듈을 읽어 상세를 memory/*.md로 내리세요." if over else None)

    # 인덱스가 가리키는 상세 파일이 실재하는가. 깨지면 검색 1~2단계가 끊긴다.
    links = re.findall(r'\]\(([^)#]+\.md)[^)]*\)', text)
    dead = [link for link in links if not (root / link).exists()]
    report.add("FAIL" if dead else "OK", "인덱스 링크",
               f"{len(links)}개 중 깨짐 {len(dead)}개" + (f": {', '.join(dead[:5])}" if dead else ""),
               "링크를 실제 경로로 고치거나 항목을 인덱스에서 내리세요." if dead else None)


def check_entry_metadata(root: Path, report: Report) -> None:
    """검색 가능성은 태그·날짜·작성 CLI에 달려 있다. 없으면 나중에 못 찾는다."""
    total = 0
    missing = {"tags": [], "date": [], "source": []}
    for path, block in iter_entry_blocks(root):
        total += 1
        # Metadata may follow a long supersession explanation. Limit by entry
        # boundaries, not an arbitrary character budget; examples do not count.
        clean = without_fences(block)
        hs = headings(clean)
        head = clean[:hs[1][0]] if len(hs) > 1 else clean
        title = block.splitlines()[0].strip("# ").strip()[:50]
        where = f"{path.relative_to(root).as_posix()} › {title}"
        for field in missing:
            if not re.search(rf'(?im)^\s*(?:[-*]\s*)?[`*]*#?{field}[`*]*\s*:', head):
                missing[field].append(where)

    if total == 0:
        report.add("WARN", "항목 메타데이터", "정제 기억 항목이 없습니다")
        return
    worst = max(len(v) for v in missing.values())
    detail = (f"항목 {total}개 / tags 없음 {len(missing['tags'])} · "
              f"date 없음 {len(missing['date'])} · source 없음 {len(missing['source'])}")
    report.add("WARN" if worst else "OK", "항목 메타데이터", detail,
               f"예: {next(v[0] for v in missing.values() if v)}" if worst else None)


def check_detail_file_size(root: Path, report: Report) -> None:
    """상세 기억 파일이 한 번에 읽기 힘들 만큼 커졌는가.

    인덱스(MEMORY.md)에는 100줄·5KB 예산이 있고 memory-compact가 있지만, 그 도구는
    인덱스 전용이라 memory/*.md에는 아무 상한이 없다. 한 항목을 보려고 200KB를 읽게
    되면 점진적 공개가 무의미해진다.

    분할 방법은 이미 이 저장소 안에 있다 — gotchas/와 learned/가 '여러 파일 + index.md'
    로 나뉘어 있다. 새 구조를 발명할 것이 아니라 그 패턴을 따르면 된다.
    """
    memory = root / "memory"
    if not memory.is_dir():
        return

    split_dirs = sorted(d.name for d in memory.iterdir()
                        if d.is_dir() and d.name not in {"archive", ".archive"} and (d / "index.md").is_file())

    oversized, duplicated = [], []
    for path in memory_files(root):
        size = path.stat().st_size
        entries = sum(1 for line in path.read_text(encoding="utf-8", errors="replace").splitlines()
                      if line.startswith("### "))
        if size > 40 * 1024:
            sections = sum(1 for line in path.read_text(encoding="utf-8", errors="replace").splitlines()
                           if line.startswith("## "))
            oversized.append((path.relative_to(memory).as_posix(), size // 1024, entries, sections))
        # 같은 이름의 분할 디렉터리가 이미 있으면 단일 파일은 잔재일 수 있다.
        if (path.parent == memory and path.stem in split_dirs
                and not is_memory_index(path, path.read_text(encoding='utf-8', errors='replace'))):
            duplicated.append(path.name)

    if not oversized and not duplicated:
        report.add("OK", "상세 파일 크기",
                   f"40KB 넘는 상세 기억 없음" + (f" / 분할된 카테고리: {', '.join(split_dirs)}" if split_dirs else ""))
        return

    detail = []
    if oversized:
        detail.append("큰 파일: " + ", ".join(f"{n} {kb}KB/{e}항목" for n, kb, e, _ in oversized[:3]))
    if duplicated:
        detail.append(f"분할본과 단일본이 함께 있음: {', '.join(duplicated)}")

    hint = None
    if oversized:
        name, kb, entries, sections = oversized[0]
        hint = (f"{name}은 이미 ## 섹션 {sections}개로 나뉘어 있습니다. "
                f"gotchas/·learned/와 같은 '여러 파일 + index.md' 구조로 옮기면 "
                f"한 항목을 보려고 {kb}KB를 읽지 않아도 됩니다."
                if sections > 1 else
                f"{name}이 {kb}KB/{entries}항목입니다. 분할 축을 정해 나누세요.")
    report.add("WARN", "상세 파일 크기", " / ".join(detail), hint)


def check_lifecycle_links(root: Path, report: Report, fix: bool = False) -> None:
    """결정이 바뀌면 삭제하지 않고 SUPERSEDED로 잇는다. 그 링크가 실제로 이어지는가.

    --fix는 `#slug`처럼 태그 이름으로 가리키던 링크를 `[[NNN-slug]]`(항목 번호)로 바꾼다.
    태그는 검색용이라 세션마다 바뀌고 유일하지도 않아 링크의 재료가 못 된다. 번호는 안 바뀐다.
    바꾸는 조건은 하나 — 같은 디렉터리에서 제목 slug 또는 파일명(번호 뗀 것)이 **정확히**
    일치하는 파일이 **하나**일 때. 접두 일치·추측으로는 잇지 않는다. 잘못 이어진 링크는
    경고가 사라져 끊긴 링크보다 나쁘다.
    """
    text_by_file = {}
    for path, _ in iter_entry_blocks(root):
        text_by_file.setdefault(path, without_fences(path.read_text(encoding="utf-8", errors="replace")))
    def slug(title):
        return re.sub(r'[^\w\s-]', '', title.lower()).strip().replace(' ', '-')

    identifiers, exact_ids = {}, {}
    for path, text in text_by_file.items():
        ids = {path.stem, *(slug(h[2]) for h in headings(text))}
        ids.update(re.findall(r'<a\s+(?:id|name)=["\x27]([^"\x27]+)', text, re.I))
        ids.update(re.findall(r'(?im)^\s*id\s*:\s*([^\s]+)', text))
        # Older entries used inline definitions, e.g. CURRENT #decision-id: ...
        ids.update(re.findall(r'(?<!\w)#([\w-]+):(?=\s)', text))
        # Legacy memory references also use a numbered entry ID, e.g. #086.
        ids.update(m.group(1) for h in headings(text)
                   if (m := re.match(r'(\d+)\b', h[2])))
        identifiers[path.resolve()] = ids
        # --fix가 인정하는 정확 일치 후보: 첫 제목의 slug와 번호를 뗀 파일명뿐이다.
        first = headings(text)
        exact_ids[path.resolve()] = {re.sub(r'^\d{3}-', '', path.stem),
                                     *( [slug(first[0][2])] if first else [] )}
    links = [(path, m.group(1).lower(), m.group(2).strip())
             for path, text in text_by_file.items()
             for m in re.finditer(r'(?im)\b(superseded-by|supersedes)\s*:\s*(\[[^\]]*\]\([^)]+\)|[^\s`),]+)', text)]
    superseded_by = [target for _, kind, target in links if kind == 'superseded-by']
    supersedes = [target for _, kind, target in links if kind == 'supersedes']
    if not superseded_by and not supersedes:
        report.add("OK", "수명주기 링크", "SUPERSEDED 링크 없음 (교체된 결정이 없습니다)")
        return

    def resolvable(source: Path, target: str) -> bool:
        # [[NNN-slug]]는 항목 번호로 가리키는 형식이다. 파일명(stem)과 정확히 같아야 한다.
        wiki = re.fullmatch(r'\[\[([^\]|#]+)\]\]', target.strip('`,.;:'))
        if wiki:
            return any(p.stem == wiki.group(1) for p in identifiers)
        markdown = re.search(r'\[[^]]*\]\(([^)]+)\)', target)
        target = markdown.group(1) if markdown else target.split()[0].strip('`,')
        filepart, _, fragment = target.partition('#')
        if filepart and ('.md' in filepart or '/' in filepart):
            candidates = [(source.parent / filepart).resolve(), (root / filepart).resolve()]
            return any(p in identifiers and (not fragment or fragment in identifiers[p]) for p in candidates)
        needle = fragment or filepart
        return bool(needle) and any(needle in ids for ids in identifiers.values())

    def numbered_target(source: Path, target: str):
        """`#slug`가 같은 디렉터리의 정확히 한 항목과 맞으면 그 파일 stem을 돌려준다."""
        bare = target.strip('`,')
        if not bare.startswith('#') or '/' in bare or '.md' in bare:
            return None
        needle = bare[1:]
        here = source.resolve().parent
        hits = [p for p, ids in exact_ids.items()
                if p.parent == here and p != source.resolve() and needle in ids]
        return hits[0].stem if len(hits) == 1 else None

    dangling = [(path, kind, target) for path, kind, target in links if not resolvable(path, target)]
    fixable = [(path, kind, target, stem) for path, kind, target in dangling
               if (stem := numbered_target(path, target))]

    rewritten = 0
    if fix and fixable:
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        by_file = {}
        for path, kind, target, stem in fixable:
            by_file.setdefault(path, []).append((kind, target.strip('`,'), stem))
        for path, items in by_file.items():
            raw = path.read_text(encoding="utf-8", errors="replace")
            # 코드 펜스 안의 예시는 링크가 아니다. 검출과 같은 기준으로 건너뛴다.
            fences = [(m.start(), m.end()) for m in re.finditer(r'```.*?```', raw, re.S)]
            def outside(pos):
                return not any(s <= pos < e for s, e in fences)
            changed = raw
            for kind, target, stem in items:
                pattern = re.compile(rf'(?i)\b({kind})(\s*:\s*){re.escape(target)}(?![\w-])')
                changed = pattern.sub(
                    lambda m: f"{m.group(1)}{m.group(2)}[[{stem}]]" if outside(m.start()) else m.group(0),
                    changed)
            if changed != raw:
                path.with_name(f"{path.name}.bak-{stamp}").write_text(raw, encoding="utf-8", newline="\n")
                path.write_text(changed, encoding="utf-8", newline="\n")
                rewritten += sum(1 for k, t, _ in items)
        remaining = [t for p, k, t in dangling if (p, k, t, numbered_target(p, t)) not in fixable]
    else:
        remaining = [t for _, _, t in dangling]

    detail = f"superseded-by {len(superseded_by)}개 / supersedes {len(supersedes)}개"
    if rewritten:
        detail += f" / 보정함 {rewritten}개 → [[NNN-slug]] (원본은 .bak-{stamp})"
    detail += f" / 대상 확인 실패 {len(remaining)}개 (역방향 연결 완전성은 별도 확인)"
    hint = None
    if remaining:
        hint = f"가리키는 대상을 찾지 못한 링크: {', '.join(remaining[:3])}"
    if fixable and not fix:
        hint = (f"{len(fixable)}개는 같은 디렉터리의 항목 하나와 정확히 일치합니다 — "
                f"--fix 로 [[NNN-slug]] 번호 링크로 바꿉니다. " + (hint or ""))
    report.add("WARN" if remaining else "OK", "수명주기 링크", detail, hint)


def check_distill_offset(root: Path, report: Report, fix: bool) -> None:
    """관찰 로그가 아카이브로 회전하면 기준값만 옛 줄 수로 남아 delta가 음수가 된다.

    훅이 음수를 0으로 클램프하므로 정제 알림이 조용히 억눌린다. 순수하게 산술적인
    불일치라서 --fix로 고칠 수 있는 유일한 항목이다.
    """
    offset_path = root / "memory" / ".mnemo-distill-offset"
    gotchas = root / "memory" / "gotchas" / "observations.jsonl"
    learned = root / "memory" / "learned" / "observations.jsonl"

    if not offset_path.is_file():
        report.add("OK", "정제 기준값", "기준값 파일 없음 (아직 정제 이력이 없습니다)")
        return
    parts = offset_path.read_text(encoding="utf-8", errors="replace").split()
    if len(parts) < 3:
        report.add("WARN", "정제 기준값", f"형식을 읽을 수 없습니다: {' '.join(parts)}")
        return

    try:
        base_g, base_l, ref = int(parts[0]), int(parts[1]), parts[2]
    except ValueError:
        report.add("WARN", "정제 기준값", f"숫자가 아닙니다: {' '.join(parts)}")
        return

    now_g, now_l = count_lines(gotchas), count_lines(learned)
    delta = (now_g - base_g) + (now_l - base_l)
    detail = f"delta {delta} (gotchas {now_g}/기준 {base_g}, learned {now_l}/기준 {base_l})"

    if delta >= 0:
        report.add("OK", "정제 기준값", detail)
        return

    if fix:
        offset_path.write_text(f"{now_g} {now_l} {ref}", encoding="utf-8")
        report.add("OK", "정제 기준값",
                   f"보정함: {base_g} {base_l} → {now_g} {now_l} (delta {delta} → 0)",
                   "회전으로 아카이브된 관찰은 이미 쌓인 것이므로 지금을 0점으로 삼습니다.")
    else:
        report.add("FAIL", "정제 기준값", detail,
                   "관찰 로그가 아카이브로 회전한 뒤 기준값이 남았습니다. "
                   "--fix 로 현재 줄 수에 맞춥니다.")


# 기록 안의 경로 필드. 훅(save-tool-use)이 상대화하는 필드와 같다.
HANDOFF_PROJECT_LINE = re.compile(r'^(-\s*Project:\s*)(.*?)\s*$')
TOOLLOG_PATH_LINE = re.compile(r'^(- `\[\d\d:\d\d:\d\d\]` \*\*(?:Edit|Write|NotebookEdit)\*\* )(\S.*?)\s*$')
OBSERVATION_PATH_FIELD = re.compile(r'("(?:file_path|notebook_path|path)"\s*:\s*")((?:[^"\\]|\\.)*)(")')
ABSOLUTE_PATH_TOKEN = re.compile(r'(?<![\w/.\\-])(?:[A-Za-z]:[\\/]|/)[^\s`"\'()<>|,;]+')


def _is_absolute_text(value: str) -> bool:
    return bool(re.match(r'^(?:[A-Za-z]:[\\/]|/)', value))


def relativize_record_path(value, roots):
    """루트 안의 절대경로면 슬래시 구분 상대경로, 아니면 None. 훅과 같은 규칙이다.

    Windows 드라이브 경로만 대소문자를 무시한다. POSIX에서는 대소문자가 다른 파일이다.
    루트 밖 경로는 다른 곳을 건드렸다는 정보 자체이므로 None을 돌려 그대로 두게 한다.
    """
    if not isinstance(value, str) or not _is_absolute_text(value):
        return None
    candidate = _canonical(value)
    for base in roots:
        fold = str.lower if re.match(r'^[A-Za-z]:/', base) else str
        if fold(candidate) == fold(base):
            return "."
        if fold(candidate).startswith(fold(base) + "/"):
            return candidate[len(base) + 1:]
    return None


@functools.lru_cache(maxsize=None)
def _canonical(value: str) -> str:
    """구분자를 슬래시로 통일하고, 존재하는 가장 긴 앞부분을 실제 경로로 푼다.

    Windows 8.3 짧은 이름(ADMINI~1)이 일부 구성요소에만 섞인 기록도 같은 루트로 본다.
    존재하지 않는 뒷부분(지워진 파일, 헤더 뒤 설명 텍스트)은 그대로 이어 붙인다.
    """
    # 디렉터리 단위로 재귀·캐시한다. 기록 수천 줄이 수백 개 디렉터리를 공유하므로 존재 검사는
    # 디렉터리마다 한 번이면 된다(줄마다 조상 전체를 검사하면 프로젝트 하나에 몇 분이 걸린다).
    text = value.replace("\\", "/")
    head, sep, tail = text.rpartition("/")
    if not sep or not tail or head.endswith(":") and not head[:-1]:
        return text
    parent = head if (not head or head.endswith(":")) else _canonical(head)
    candidate = f"{parent}/{tail}"
    try:
        if os.path.exists(candidate):
            return os.path.realpath(candidate).replace("\\", "/")
    except (OSError, ValueError):
        pass
    return candidate


def record_roots(root: Path):
    """현재 루트의 정규화된 형태 하나.

    옛 루트를 핸드오프 헤더에서 추론하지 않는다. 한 프로젝트의 docs/handoffs/에는 중첩됐다가
    분리된 저장소, 전신 프로젝트, 워크트리의 핸드오프가 섞여 있어(2026-09-18 실측: claudecode 안의
    aniclew, milpfms 안의 pfms) 그 경로를 루트로 삼으면 남의 파일 경로가 이 프로젝트의 상대경로로
    둔갑한다. 다른 위치를 가리키는 기록은 그대로 두고 개수만 보고한다.
    """
    return [_canonical(str(root)).rstrip("/")]


def _root_prefix_length(value: str, form: str) -> tuple:
    """value가 루트 form으로 시작하면 (정규화한 value, 루트 길이), 아니면 (정규화한 value, 0)."""
    candidate = _canonical(value)
    fold = str.lower if re.match(r'^[A-Za-z]:/', form) else str
    matched = fold(candidate[:len(form)]) == fold(form)
    return candidate, (len(form) if matched else 0)


def _rewrite_lines(text: str, rewrite):
    """줄 단위로 바꾸되 줄 수와 CRLF를 보존한다. rewrite는 바뀐 줄 또는 None을 돌려준다."""
    out, hits = [], 0
    for line in text.split("\n"):
        body = line[:-1] if line.endswith("\r") else line
        changed = rewrite(body)
        if changed is None:
            out.append(line)
        else:
            hits += 1
            out.append(changed + ("\r" if line.endswith("\r") else ""))
    return "\n".join(out), hits


def check_record_paths(root: Path, report: Report, fix: bool = False) -> None:
    """기록 안의 경로는 루트 기준 상대경로여야 프로젝트를 옮기거나 다른 컴퓨터에서 열어도 유효하다.

    훅은 이제 상대경로로 쓰지만 그 전에 쌓인 핸드오프 헤더(`Project:`), 도구 로그(Edit/Write 줄),
    관찰 로그(`file_path` 같은 경로 필드)에는 절대경로가 남아 있다. 이 셋은 형식이 고정돼 있어
    기계적으로 안전하게 바꿀 수 있으므로 --fix 대상이다. 기억 본문의 절대경로는 명령 예시나
    설명일 수 있어 보고만 한다. 기준은 현재 루트뿐이다 — 다른 위치를 가리키는 헤더·경로는
    중첩됐다가 분리된 저장소, 폴더 복사로 물려받은 전신 프로젝트, 워크트리의 흔적일 수 있어
    그대로 두고 개수만 보고한다. 관찰 로그는 줄 수를 보존한다 — 정제 기준값이 줄 수에 기댄다.
    """
    roots = record_roots(root)
    name = root.name
    counts = {"핸드오프 헤더": 0, "도구 로그": 0, "관찰 로그": 0}
    changes = []  # (path, 원본 텍스트, 바뀐 텍스트)
    elsewhere = 0  # 다른 위치를 가리키는 헤더 — 중첩·분리·전신 프로젝트일 수 있어 그대로 둔다

    def read(path: Path) -> str:
        return path.read_bytes().decode("utf-8", errors="surrogateescape")

    def header(line):
        nonlocal elsewhere
        match = HANDOFF_PROJECT_LINE.match(line)
        if not match:
            return None
        rest = match.group(2)
        ticked = rest.startswith("`")
        body = rest[1:] if ticked else rest
        if not _is_absolute_text(body):
            return None
        for form in roots:
            canonical, length = _root_prefix_length(body, form)
            if not length:
                continue
            tail = canonical[length:]
            if ticked and tail.startswith("`"):
                tail = tail[1:]
            # 루트 바로 뒤가 끝·공백·괄호일 때만 루트 자체다. 하위 경로는 중첩 프로젝트의 선언이다.
            if tail == "" or tail[0] in " \t(":
                return f"{match.group(1)}{name}{tail}"
            break
        elsewhere += 1
        return None

    def toollog(line):
        match = TOOLLOG_PATH_LINE.match(line)
        relative = match and relativize_record_path(match.group(2), roots)
        return None if relative is None else match.group(1) + relative

    def observation(line):
        if not line.strip():
            return None
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            return None
        if not isinstance(record, dict) or not isinstance(record.get("input"), str):
            return None

        def field(match):
            try:
                value = json.loads('"' + match.group(2) + '"')
            except json.JSONDecodeError:
                return match.group(0)
            relative = relativize_record_path(value, roots)
            if relative is None:
                return match.group(0)
            return match.group(1) + json.dumps(relative, ensure_ascii=False)[1:-1] + match.group(3)

        rewritten = OBSERVATION_PATH_FIELD.sub(field, record["input"])
        if rewritten == record["input"]:
            return None
        record["input"] = rewritten
        return json.dumps(record, ensure_ascii=False, separators=(",", ":"))

    handoffs = root / "docs" / "handoffs"
    conversations = root / "conversations"
    targets = [
        ("핸드오프 헤더", header, sorted(handoffs.glob("*.md")) if handoffs.is_dir() else []),
        ("도구 로그", toollog, sorted(conversations.glob("*-toollog.md")) if conversations.is_dir() else []),
        ("관찰 로그", observation, [p for p in (root / "memory" / kind / "observations.jsonl"
                                              for kind in ("gotchas", "learned")) if p.is_file()]),
    ]
    for kind, rewrite, paths in targets:
        for path in paths:
            raw = read(path)
            new, hits = _rewrite_lines(raw, rewrite)
            if hits:
                counts[kind] += hits
                changes.append((path, raw, new))

    # 기억 본문은 보고만 한다. 명령 예시·설명 속 경로를 바꾸는 것은 사람의 판단이다.
    prose = 0
    for path in memory_files(root):
        if path.name.startswith("."):
            continue
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            if any(relativize_record_path(token, roots) is not None
                   for token in ABSOLUTE_PATH_TOKEN.findall(line)):
                prose += 1

    mechanical = sum(counts.values())
    summary = " / ".join(f"{kind} {count}{'개' if kind == '핸드오프 헤더' else '줄'}"
                         for kind, count in counts.items())
    notes = []
    if elsewhere:
        notes.append(f"다른 위치를 가리키는 헤더 {elsewhere}개는 그대로 둠 (중첩·분리·전신 프로젝트일 수 있음)")
    if prose:
        notes.append(f"기억 본문 {prose}줄은 보고만 (명령 예시·설명일 수 있어 사람이 판단)")
    suffix = "".join(f" / {note}" for note in notes)

    if not mechanical:
        report.add("WARN" if prose else "OK", "기록 안의 절대경로",
                   "핸드오프 헤더·도구 로그·관찰 로그의 루트 안 경로는 모두 상대경로" + suffix)
        return

    if fix:
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        for path, raw, new in changes:
            path.with_name(f"{path.name}.bak-{stamp}").write_bytes(raw.encode("utf-8", errors="surrogateescape"))
            path.write_bytes(new.encode("utf-8", errors="surrogateescape"))
        report.add("WARN" if prose else "OK", "기록 안의 절대경로",
                   f"보정함: {summary} → 루트 기준 상대경로 (원본은 .bak-{stamp})" + suffix,
                   "루트 밖 경로는 다른 곳을 건드렸다는 정보이므로 그대로 두었습니다.")
        return

    report.add("WARN", "기록 안의 절대경로", summary + suffix,
               "프로젝트를 옮기거나 다른 컴퓨터에서 열면 옛 위치를 가리킵니다. "
               "--fix 로 루트 기준 상대경로로 바꿉니다 (파일별 .bak-<시각>, 줄 수 보존, 루트 밖 경로는 그대로).")


def run_sibling(script: str, root: Path, extra=()) -> tuple:
    """옆 스크립트를 그대로 호출한다. 판정 로직을 닥터가 복제하면 둘이 갈라진다."""
    path = SCRIPTS / script
    if not path.is_file():
        return None, f"{script} 없음"
    try:
        result = subprocess.run(
            [sys.executable, str(path), "--project-root", str(root), *extra],
            capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=300)
    except (OSError, subprocess.SubprocessError) as error:
        return 2, f"{script} 실행 실패: {error}"
    return result.returncode, (result.stdout or "") + (result.stderr or "")


def check_anchors(root: Path, report: Report) -> None:
    code, out = run_sibling("check_memory_anchors.py", root, ["--limit", "0"])
    if code is None:
        report.add("WARN", "코드 앵커", out)
        return
    match = re.search(r'실재하지 않는 앵커 (\d+)개 \(전체의 (\d+)%\)', out)
    checked = re.search(r'코드 앵커 (\d+)개를 확인', out)
    contextual = re.search(r'현재 파일 존재 검증에서 분리한 참조 (\d+)개', out)
    context_note = f" / 별도 문맥 확인 {contextual.group(1)}개 (존재 여부 미판정)" if contextual else ""
    if code not in (0, 1) or (code == 1 and not match):
        report.add("FAIL", "코드 앵커", f"검사 실패 (exit {code}): {out[:500]}")
        return
    if not checked and not match and "검사할 기억 파일이 없습니다" not in out:
        report.add("WARN", "코드 앵커", "검사 결과를 확인할 수 없습니다: " + out[:500])
        return
    if match:
        report.add("WARN", "코드 앵커",
                   f"검사 {checked.group(1) if checked else '?'}회 / 찾지 못한 파일 참조 {match.group(1)}개" + context_note,
                   "check_memory_anchors.py 로 목록과 이동 후보를 확인하세요. 수정은 사람이 판단합니다.")
    else:
        report.add("WARN" if contextual else "OK", "코드 앵커",
                   (checked.group(0) if checked else "확인할 앵커 없음") + " — 검사 대상에서 누락 없음" + context_note)


def check_observation_classification(root: Path, report: Report) -> None:
    code, out = run_sibling("reclassify_observations.py", root)
    if code is None:
        report.add("WARN", "관찰 분류", out)
        return
    match = re.search(r'옮길 것 (\d+)줄', out)
    if code != 0:
        report.add("FAIL", "관찰 분류", f"검사 실패 (exit {code}): {out[:500]}")
        return
    unparsed = re.search(r'파싱 못 해 그대로 두는 줄 (\d+)줄', out)
    if (unparsed and int(unparsed.group(1))) or (not match and "관찰 로그가 없습니다" not in out):
        report.add("WARN", "관찰 분류", "검사 미완료: " + out[:500])
        return
    if match and int(match.group(1)) > 0:
        report.add("WARN", "관찰 분류",
                   f"옛 훅이 실패로 오분류한 관찰 {match.group(1)}줄이 gotchas에 남아 있습니다",
                   "reclassify_observations.py --apply 로 learned로 옮깁니다 (백업 자동 생성).")
    else:
        report.add("OK", "관찰 분류", "성공 근거가 확인된 이동 대상 없음 (남은 관찰의 정확성은 미확인)")


def earliest_date(paths) -> str:
    """파일명 앞의 날짜를 우선 쓰고, 없으면 수정 시각으로 대신한다."""
    dates = []
    for path in paths:
        match = re.match(r'(\d{4}-\d{2}-\d{2})', path.name)
        if match:
            dates.append(match.group(1))
        else:
            dates.append(datetime.fromtimestamp(path.stat().st_mtime).date().isoformat())
    return min(dates) if dates else ""


def check_record_coverage(root: Path, report: Report) -> None:
    """기록이 프로젝트 시작까지 거슬러 가는가.

    "언제부터 남아 있나"는 "얼마나 자세히 남아 있나"와 다른 질문이다. 기억·핸드오프는
    대개 도입 시점부터 시작하므로 초기 구간은 통째로 비어 있고, 그 구간을 메울 수 있는
    것은 git 커밋뿐이다. memory/와 docs/가 git 추적 밖이라 이 비대칭을 놓치기 쉽다.
    """
    def git(*args):
        try:
            result = subprocess.run(["git", "-C", str(root), *args], capture_output=True,
                                    text=True, encoding="utf-8", errors="replace", timeout=30)
            return result.stdout.strip() if result.returncode == 0 else ""
        except (OSError, subprocess.SubprocessError):
            return ""

    first_commit = git("log", "--reverse", "--format=%ad", "--date=short")
    first_commit = first_commit.splitlines()[0] if first_commit else ""

    layers = {
        "conversations": sorted((root / "conversations").glob("*.md"))
        if (root / "conversations").is_dir() else [],
        "memory": list(memory_files(root))
        if (root / "memory").is_dir() else [],
        "handoffs": sorted((root / "docs" / "handoffs").glob("*.md"))
        if (root / "docs" / "handoffs").is_dir() else [],
    }
    starts = {name: earliest_date(paths) for name, paths in layers.items() if paths}

    if not starts:
        report.add("WARN", "기록 커버리지", "대화·기억·핸드오프가 모두 비어 있습니다",
                   "git 커밋 이력이 유일한 기록입니다.")
        return

    detail = [" · ".join(f"{name} {date}" for name, date in sorted(starts.items(), key=lambda kv: kv[1]))]
    hint, level = None, "OK"

    if not first_commit:
        detail.insert(0, "git 이력 없음")
    else:
        subjects = git("log", "--format=%s").splitlines()
        conventional = sum(
            1 for s in subjects
            if re.match(r'^(feat|fix|chore|docs|refactor|test|perf|build|ci)(\(.+\))?!?:', s))
        share = round(conventional * 100 / len(subjects)) if subjects else 0
        detail.insert(0, f"프로젝트 시작 {first_commit} (커밋 {len(subjects)}개, conventional {share}%)")

        earliest = min(starts.values())
        try:
            gap = (datetime.fromisoformat(earliest) - datetime.fromisoformat(first_commit)).days
        except ValueError:
            gap = 0
        if gap > 30:
            level = "WARN"
            detail.append(f"가장 이른 기록까지 {gap}일 공백")
            hint = (f"{first_commit} ~ {earliest} 구간은 기억·핸드오프에 없습니다. "
                    f"그 시기의 설계 의도는 git 커밋 메시지로만 복원됩니다"
                    + (f" (conventional {share}%라 기계적으로 읽힙니다)." if share >= 50 else "."))

    report.add(level, "기록 커버리지", " / ".join(detail), hint)


def check_history_recoverability(root: Path, report: Report) -> None:
    """처음 보는 프로젝트에서 "여기까지 어떻게 왔는가"를 얼마나 되살릴 수 있는가.

    구조 점검만으로는 "태그가 54개 비었다"까지밖에 못 간다. 정작 필요한 것은
    설계 의도와 변경 내력인데, 그것은 핸드오프에 흩어져 있다. 그래서 복원 경로가
    실제로 열려 있는지를 측정한다 — 없으면 없다고 말해야 다른 경로를 찾는다.
    """
    directory = root / "docs" / "handoffs"
    files = sorted(directory.glob("*.md")) if directory.is_dir() else []
    if not files:
        report.add("WARN", "역사 복원", "핸드오프가 없어 변경 내력을 되살릴 수 없습니다",
                   "설계 산출물(docs/specs, adr)이 있으면 그쪽을 읽으세요.")
        return

    names = {f.name for f in files}
    chained = origins = 0
    for path in files:
        text = path.read_text(encoding="utf-8", errors="replace")
        match = re.search(r'\*\*Continues from\*\*\s*:\s*(.+)', text)
        if match and not re.match(r'(?i)\s*none', match.group(1)):
            ref = re.search(r'\(\./([^)]+)\)|\[([^\]]+\.md)\]', match.group(1))
            target = (ref.group(1) or ref.group(2)) if ref else None
            if target in names:
                chained += 1
        if re.search(r'#{1,6}\s*Origin', text, re.I):
            origins += 1

    dates = sorted(re.match(r'(\d{4}-\d{2}-\d{2})', f.name).group(1)
                   for f in files if re.match(r'\d{4}-\d{2}-\d{2}', f.name))
    span = f"{dates[0]} ~ {dates[-1]}" if dates else "날짜 미상"

    # 계보 복원 폭은 수확기에게 직접 묻는다. 여기서 다시 세면 둘이 갈라진다.
    code, out = run_sibling("harvest_lineage.py", root, ["--limit", "0"])
    if code != 0:
        report.add("WARN" if code is None else "FAIL", "역사 복원",
                   f"계보 검사 미완료 (exit {code}): {out[:500]}")
        return
    files_with_changes = re.search(r'(\d+)개 핸드오프 중 (\d+)개에 변경 기록 존재', out or "")
    lineage = re.search(r'고유 파일 (\d+)개 / 계보 성립\(2회 이상\) (\d+)개', out or "")

    design = {name: len(list((root / "docs" / name).glob("*")))
              for name in ("specs", "adr", "flow-diagrams")
              if (root / "docs" / name).is_dir()}

    detail = [f"핸드오프 {len(files)}개 / 기록 범위 {span}"]
    if files_with_changes:
        covered = int(files_with_changes.group(2))
        detail.append(f"변경 이력 보유 {covered}개 ({round(covered * 100 / len(files))}%)")
    if lineage:
        detail.append(f"계보 복원 가능 파일 {lineage.group(1)}개 (2회 이상 {lineage.group(2)}개)")
    detail.append(f"체인 연결 {chained}/{len(files)} · Origin {origins}개")
    if design:
        detail.append("설계 산출물 " + ", ".join(f"{k} {v}" for k, v in design.items()))

    # 체인이 끊겨 있어도 파일 계보가 살아 있으면 인과는 따라갈 수 있다.
    weak_chain = chained < len(files) * 0.2
    hint = None
    if weak_chain:
        hint = ("핸드오프 체인이 거의 없습니다. 순서는 날짜로, 인과는 파일 계보로 따라가세요 — "
                "harvest_lineage.py --file <경로> 가 그 파일의 변경 내력을 복원합니다.")
    report.add("WARN" if weak_chain else "OK", "역사 복원", " / ".join(detail), hint)


def check_handoffs(root: Path, report: Report) -> None:
    directory = root / "docs" / "handoffs"
    if not directory.is_dir():
        report.add("WARN", "핸드오프", "docs/handoffs/ 없음")
        return
    files = sorted(directory.glob("*.md"))
    if not files:
        report.add("WARN", "핸드오프", "핸드오프가 0개입니다")
        return
    newest = max(files, key=lambda p: p.name)
    has_origin = re.search(r'#{1,6}\s*Origin', newest.read_text(encoding="utf-8", errors="replace"), re.I)
    report.add("OK", "핸드오프",
               f"{len(files)}개 / 최신 {newest.name}" + ("" if has_origin else " (Origin 없음 — 규칙 도입 이전)"))


# ── 줄기와 증거 ────────────────────────────────────────────────────────
# 기억은 주장이고 대화는 증거인데, 둘을 잇는 링크를 아무도 검사하지 않았다.
# 아래 세 검사는 그 링크의 유무·유효성과, 링크가 없어 흙으로 남은 대화를 본다.

STRUCTURE_KEYS = ("evidence", "alternatives", "depends-on", "sources", "files")
ANCHOR_RE = re.compile(
    r'(?<![\w/])((?:skills|hooks|scripts|src|lib|app|tests?|docs)/[A-Za-z0-9_./\-]+\.[A-Za-z0-9]{1,6})')
DECISION_WORDS = re.compile(r'결정|폐기|기각|대신|탈락|채택|바꾸|방침|원칙|superseded', re.I)


def structured_lines(block: str) -> dict:
    """항목이 들고 있는 구조 줄. `files:`처럼 백틱으로 감싼 형태도 같이 읽는다."""
    found = {}
    for key in STRUCTURE_KEYS:
        match = re.search(rf'(?im)^\s*(?:[-*]\s*)?[`*]*{re.escape(key)}[`*]*\s*:\s*(.*)$', block)
        if match:
            found[key] = match.group(1).strip()
    return found


def entry_status(block: str) -> str | None:
    """항목의 수명. 명시된 `status:` 줄만 인정한다.

    본문 어딘가의 SUPERSEDED는 하위 결정 하나가 바뀐 것일 수 있어 항목의 상태가 아니다.
    추측으로 상태를 정하면 살아 있는 결정을 죽은 것으로 보고하게 된다.
    """
    match = re.search(r'(?im)^\s*(?:[-*]\s*)?[`*]*status[`*]*\s*:\s*(.*)$', block)
    if not match:
        return None
    value = match.group(1).upper()
    if "SUPERSEDED" in value:
        return "SUPERSEDED"
    if "CURRENT" in value:
        return "CURRENT"
    return None


def local_link_targets(block: str):
    """같은 저장소 안을 가리키는 링크만. 외부 URL과 문서 내 앵커는 검사 대상이 아니다."""
    for _, target in re.findall(r'\[([^\]]*)\]\(([^)]+)\)', block):
        text = target.strip().strip("<>")
        if not text or text.startswith("#") or re.match(r'^[A-Za-z][A-Za-z0-9+.-]*:', text):
            continue
        yield text


def check_entry_evidence(root: Path, report: Report) -> dict:
    """주장에는 증거로 가는 문이 있어야 한다.

    항목만 읽고 "그렇게 정했구나"까지는 가도, 의심이 들 때 내려갈 곳이 없으면 같은 논쟁을
    처음부터 다시 한다. 링크가 열리는지, 코드 앵커가 산문에만 있는지를 본다.
    산문 앵커는 사람은 읽지만 역색인은 못 읽는다 — 파일에서 결정으로 되짚는 문이 닫힌다.
    """
    entries = list(iter_entry_blocks(root))
    metrics = {"entries": len(entries), "evidence": 0, "dead_links": 0, "prose_only": 0}
    if not entries:
        report.add("WARN", "항목 증거", "정제 기억 항목이 없습니다")
        return metrics

    dead_examples, prose_examples = [], []
    for path, block in entries:
        clean = without_fences(block)
        keys = structured_lines(clean)
        if "evidence" in keys:
            metrics["evidence"] += 1
        for target in local_link_targets(clean):
            resolved = (path.parent / unquote(target.split("#")[0])).resolve()
            if not resolved.exists():
                metrics["dead_links"] += 1
                if len(dead_examples) < 5:
                    dead_examples.append(f"{path.name} → {target}")
        if "files" not in keys and ANCHOR_RE.search(clean):
            metrics["prose_only"] += 1
            if len(prose_examples) < 3:
                prose_examples.append(path.name)

    detail = (f"항목 {metrics['entries']}개 / evidence 줄 {metrics['evidence']} · "
              f"열리지 않는 링크 {metrics['dead_links']} · 앵커가 산문에만 {metrics['prose_only']}")
    if dead_examples:
        detail += " / " + ", ".join(dead_examples)
    hint = None
    if metrics["dead_links"]:
        hint = ("링크 대상이 옮겨졌거나 사라졌습니다. 항목은 지우지 말고 경로를 고치거나 "
                "`소실`로 표시하세요 — 판정은 사람이 합니다.")
    elif metrics["prose_only"]:
        hint = (f"`files:` 줄이 없으면 파일에서 결정으로 되짚을 수 없습니다 "
                f"(예: {', '.join(prose_examples)}). --fix 가 산문 앵커를 구조 줄로 올립니다.")
    report.add("FAIL" if metrics["dead_links"] else ("WARN" if metrics["prose_only"] else "OK"),
               "항목 증거", detail, hint)
    return metrics


def check_decision_reasons(root: Path, report: Report) -> dict:
    """무엇으로 바뀌었나는 링크가 답하지만, 왜 바뀌었나는 아무도 검사하지 않았다.

    이유 없는 교체는 다음 세션이 "그냥 그렇게 정했나 보다"로 읽고, 조건이 바뀌어도
    알아차리지 못한다. 그리고 기대던 결정이 뒤집히면 그 위에 선 결정도 흔들리는데,
    지금은 조용히 CURRENT인 채 낡는다.
    """
    entries = list(iter_entry_blocks(root))
    metrics = {"status_missing": 0, "supersede_total": 0, "supersede_no_reason": 0, "stale_depends": 0}
    if not entries:
        return metrics

    status_of, no_reason, shaky = {}, [], []
    for path, block in entries:
        clean = without_fences(block)
        status = entry_status(clean)
        if status is None:
            metrics["status_missing"] += 1
        status_of[path.stem] = status
        # 교체 '사건'은 본문의 표시다. `status:` 줄은 그 결과를 선언할 뿐이라 따로 세지 않는다
        # (둘 다 세면 항목 하나가 두 건으로 보인다). 본문에 표시가 없을 때만 선언을 사건으로 본다.
        lines = clean.splitlines()
        is_status = [bool(re.match(r'(?im)^\s*(?:[-*]\s*)?[`*]*status[`*]*\s*:', line)) for line in lines]
        events = [i for i, line in enumerate(lines) if "SUPERSEDED" in line and not is_status[i]]
        if not events:
            events = [i for i, line in enumerate(lines) if "SUPERSEDED" in line]
        for index in events:
            metrics["supersede_total"] += 1
            context = " ".join(lines[index:index + 3])
            if not _has_reason(context):
                metrics["supersede_no_reason"] += 1
                if len(no_reason) < 5:
                    no_reason.append(f"{path.name}:{index + 1}")

    for path, block in entries:
        clean = without_fences(block)
        if entry_status(clean) != "CURRENT":
            continue
        for target in re.findall(r'(?i)depends-on[`*]*\s*:([^\n]*)', clean):
            for stem in re.findall(r'\[\[([^\]|#]+)\]\]', target):
                if status_of.get(stem) == "SUPERSEDED":
                    metrics["stale_depends"] += 1
                    if len(shaky) < 5:
                        shaky.append(f"{path.name} → {stem}")

    detail = (f"SUPERSEDED {metrics['supersede_total']}건 중 이유 없음 {metrics['supersede_no_reason']} · "
              f"status 줄 없음 {metrics['status_missing']}/{len(entries)} · "
              f"기대던 결정이 뒤집힌 CURRENT {metrics['stale_depends']}")
    if no_reason:
        detail += " / 이유 없음: " + ", ".join(no_reason)
    if shaky:
        detail += " / 재검토: " + ", ".join(shaky)
    hint = None
    if metrics["stale_depends"]:
        hint = "기대던 항목이 바뀌었습니다. 위 CURRENT 항목이 아직 유효한지 확인하세요."
    elif metrics["supersede_no_reason"]:
        hint = ("바꾼 이유는 되살릴 수 없습니다 — 그 결정을 내린 세션의 대화가 유일한 근거입니다. "
                "닥터는 이유를 지어내지 않습니다; 위 위치를 사람이 채워야 합니다.")
    level = "WARN" if (metrics["supersede_no_reason"] or metrics["stale_depends"]) else "OK"
    report.add(level, "결정 계보", detail, hint)
    return metrics


def check_open_decisions(root: Path, report: Report) -> dict:
    """살아 있는 결정이 자기를 뒤집을 조건을 말하는가.

    `CURRENT`는 "아직 맞다"가 아니라 "아직 대체되지 않았다"는 뜻이다. 반박할 수 없는 결정은
    아무도 반박하지 않는 한 영원히 현재로 남고, 그러면 결정이 아니라 관습이 된다.
    그래서 각 항목은 **무엇이 바뀌면 다시 보는지**를 말해야 한다. 만료일이 아니다 —
    오래됐다고 무효가 되는 것이 아니라, 되돌릴 조건을 남겨 논쟁이 0이 아니라
    중간에서 다시 시작되게 하는 것이다. 말할 조건이 정말 없으면 `none — <이유>`로 적는다.

    외부 사실(공식 문서·다른 런타임의 동작)에 기댄 결정은 우리가 아무것도 안 해도 낡는다.
    그런 항목에는 `last_verified:`를 함께 본다 — 실측으로 확인한 마지막 날이다.
    """
    entries = list(iter_entry_blocks(root))
    metrics = {"live": 0, "reopen_missing": 0, "external": 0, "verify_stale": 0}
    if not entries:
        return metrics

    closed, stale = [], []
    today = datetime.now()
    for path, block in entries:
        clean = without_fences(block)
        if entry_status(clean) == "SUPERSEDED":
            continue
        metrics["live"] += 1
        if not re.search(r'(?im)^\s*(?:[-*]\s*)?[`*]*reopen-when[`*]*\s*:', clean):
            metrics["reopen_missing"] += 1
            if len(closed) < 5:
                closed.append(path.name)
        # 외부 사실에 기댄 결정만 재확인 대상이다. 우리 설계는 시간으로 낡지 않는다.
        if not re.search(r'(?im)https?://|^\s*(?:[-*]\s*)?[`*]*sources[`*]*\s*:', clean):
            continue
        metrics["external"] += 1
        # `last_verified:` 2026-09-20 처럼 콜론 뒤에 백틱이 남는 표기를 함께 받는다.
        verified = re.search(r'(?im)^\s*(?:[-*]\s*)?[`*]*last_verified[`*]*\s*:[`*\s]*(\d{4}-\d{2}-\d{2})', clean)
        if not verified:
            metrics["verify_stale"] += 1
            if len(stale) < 5:
                stale.append(f"{path.name}(미확인)")
            continue
        try:
            age = (today - datetime.strptime(verified.group(1), "%Y-%m-%d")).days
        except ValueError:
            continue
        if age > EXTERNAL_VERIFY_DAYS:
            metrics["verify_stale"] += 1
            if len(stale) < 5:
                stale.append(f"{path.name}({age}일)")

    detail = (f"살아 있는 결정 {metrics['live']}개 중 되돌릴 조건 없음 {metrics['reopen_missing']} · "
              f"외부 사실에 기댄 것 {metrics['external']} 중 재확인 필요 {metrics['verify_stale']}")
    if closed:
        detail += " / 조건 없음: " + ", ".join(closed)
    if stale:
        detail += " / 재확인: " + ", ".join(stale)
    hint = None
    if metrics["reopen_missing"]:
        hint = ("`reopen-when:`은 만료일이 아니라 **되돌릴 조건**입니다. 무엇이 바뀌면 다시 보는지 적으면 "
                "다음 사람이 0이 아니라 그 지점에서 논쟁을 시작합니다. 정말 없으면 `none — <이유>`로 적으세요.")
    elif metrics["verify_stale"]:
        hint = (f"외부 사실은 우리가 아무것도 안 해도 낡습니다. 실측으로 다시 확인하고 "
                f"`last_verified:`를 갱신하세요 (기준 {EXTERNAL_VERIFY_DAYS}일).")
    level = "WARN" if (metrics["reopen_missing"] or metrics["verify_stale"]) else "OK"
    report.add(level, "열린 결정", detail, hint)
    return metrics


def _has_reason(context: str) -> bool:
    """교체 표시 옆에 이유가 남아 있는가. 표시·링크·날짜를 걷어낸 나머지로 본다."""
    text = re.sub(r'~~.*?~~', ' ', context)
    text = re.sub(r'\[\[[^\]]*\]\]|\[[^\]]*\]\([^)]*\)|\[[^\]]*\]', ' ', text)
    text = re.sub(r'(?i)superseded-by|supersedes|superseded|current', ' ', text)
    text = re.sub(r'#[\w-]+|20\d\d-\d\d-\d\d', ' ', text)
    text = re.sub(r'[^\w가-힣]+', '', text)
    return len(text) >= 12


def check_unattached_conversations(root: Path, report: Report, ignored: set) -> dict:
    """어느 줄기에도 안 붙은 대화.

    핸드오프도 없고, 어느 항목의 증거로도 인용되지 않았고, 그날 고친 파일이 어느 앵커와도
    겹치지 않는 날이다. 전부 캐내라는 뜻이 아니다 — 결정 어휘가 많은 날부터 보라는 목록이다.
    놓치는 날은 한가한 날이 아니라 바쁜 날이라서, 가장 중요한 결정이 여기 숨는다.
    """
    conversations = root / "conversations"
    metrics = {"conv_days": 0, "unattached_days": 0, "signal_days": 0}
    if not conversations.is_dir():
        report.add("OK", "미부착 대화", "conversations/ 없음 (검사 대상 없음)")
        return metrics

    days = sorted({p.name[:10] for p in conversations.glob("*.md")
                   if re.match(r'\d{4}-\d{2}-\d{2}', p.name)})
    metrics["conv_days"] = len(days)
    if not days:
        report.add("OK", "미부착 대화", "대화 기록이 없습니다")
        return metrics

    attached = {p.name[:10] for p in (root / "docs" / "handoffs").glob("*.md")} \
        if (root / "docs" / "handoffs").is_dir() else set()
    anchors = set()
    for path, block in iter_entry_blocks(root):
        clean = without_fences(block)
        attached |= set(re.findall(r'conversations[/\\](\d{4}-\d{2}-\d{2})', clean))
        for line in clean.splitlines():
            if re.search(r'(?i)^\s*(?:[-*]\s*)?[`*]*evidence', line):
                attached |= set(re.findall(r'(\d{4}-\d{2}-\d{2})', line))
        anchors |= {m.lower() for m in ANCHOR_RE.findall(clean)}

    if anchors:
        for log in sorted((root / "memory").glob("*/observations.jsonl")):
            for line in log.read_text(encoding="utf-8", errors="replace").splitlines():
                if '"Edit"' not in line and '"Write"' not in line:
                    continue
                try:
                    record = json.loads(line)
                except ValueError:
                    continue
                day = str(record.get("timestamp", ""))[:10]
                if day in attached or not day:
                    continue
                payload = record.get("input")
                if isinstance(payload, str):
                    try:
                        payload = json.loads(payload)
                    except ValueError:
                        continue
                if not isinstance(payload, dict):
                    continue
                raw = str(payload.get("file_path") or "").replace("\\", "/").lower()
                if raw and any(raw.endswith(anchor) for anchor in anchors):
                    attached.add(day)

    unattached = [d for d in days if d not in attached and d not in ignored]
    metrics["unattached_days"] = len(unattached)

    scored = []
    for day in unattached:
        signal = 0
        for path in conversations.glob(f"{day}-*.md"):
            try:
                if path.stat().st_size > 4 * 1024 * 1024:
                    continue
                signal += len(DECISION_WORDS.findall(path.read_text(encoding="utf-8", errors="replace")))
            except OSError:
                continue
        if signal >= 10:
            scored.append((signal, day))
    scored.sort(reverse=True)
    metrics["signal_days"] = len(scored)

    detail = (f"대화 {len(days)}일 중 미부착 {len(unattached)}일 · 결정 어휘가 많은 날 {len(scored)}")
    if ignored:
        detail += f" (무관 판정 {len(ignored)}일 제외)"
    if scored:
        detail += " / 우선: " + ", ".join(f"{day}({signal})" for signal, day in scored[:5])
    hint = None
    if scored:
        hint = ("이 날들부터 되짚으세요. 일괄 분류하지 말고, 붙은 결과는 해당 항목의 `evidence:`에 "
                "적으세요. 무관하다고 판정한 날은 차트에 `- 무관: <날짜>`로 남기면 다시 묻지 않습니다.")
    report.add("WARN" if scored else "OK", "미부착 대화", detail, hint)
    return metrics


def promote_structure(root: Path, report: Report) -> list:
    """산문에만 있던 앵커와 암묵적 수명을 구조 줄로 올린다 (--fix).

    텍스트에 이미 있는 것을 기계가 읽을 수 있는 자리로 옮길 뿐, 없는 것을 지어내지 않는다.
    두 가지만 건드린다:
      - `files:` — 본문이 이미 가리키는 코드 경로. 파일에서 결정으로 되짚는 역색인의 재료다.
      - `status:` — 교체 표시가 **어디에도 없으면** CURRENT, **메타데이터 줄에 있으면** SUPERSEDED.
        본문 중간의 SUPERSEDED는 하위 결정 하나가 바뀐 것일 수 있으므로 사람에게 남긴다.
    한 파일에 항목이 여럿인 단일본은 손대지 않는다 — 삽입 위치가 기계적으로 확정되지 않는다.
    """
    blocks_by_path = {}
    for path, block in iter_entry_blocks(root):
        blocks_by_path.setdefault(path, []).append(block)

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    changed, skipped = [], 0
    for path, blocks in sorted(blocks_by_path.items()):
        if len(blocks) != 1:
            skipped += 1
            continue
        raw = path.read_text(encoding="utf-8", errors="replace")
        clean = without_fences(raw)
        keys = structured_lines(clean)
        additions = []

        if "files" not in keys:
            anchors = []
            for anchor in ANCHOR_RE.findall(clean):
                if anchor not in anchors and (root / anchor).exists():
                    anchors.append(anchor)
            if anchors:
                additions.append(f"`files:` {', '.join(anchors[:12])}")

        if entry_status(clean) is None:
            lines = clean.splitlines()
            meta = [i for i, line in enumerate(lines)
                    if re.match(r'(?im)^\s*(?:[-*]\s*)?[`*]*(tags|date|source)[`*]*\s*:', line)]
            head = "\n".join(lines[:(max(meta) + 1) if meta else 0])
            if "SUPERSEDED" in head:
                additions.append("`status: ❌ SUPERSEDED`")
            elif "SUPERSEDED" not in clean:
                additions.append("`status: ✅ CURRENT`")

        if not additions:
            continue
        source_lines = raw.splitlines()
        meta = [i for i, line in enumerate(source_lines)
                if re.match(r'(?im)^\s*(?:[-*]\s*)?[`*]*(tags|date|source|status)[`*]*\s*:', line)]
        if not meta:
            skipped += 1
            continue
        at = max(meta) + 1
        path.with_name(f"{path.name}.bak-{stamp}").write_text(raw, encoding="utf-8", newline="\n")
        merged = source_lines[:at] + additions + source_lines[at:]
        path.write_text("\n".join(merged) + "\n", encoding="utf-8", newline="\n")
        changed.append(f"{path.name}({len(additions)}줄)")

    if changed:
        note = f"구조 줄 승격 {len(changed)}개 항목"
        if skipped:
            note += f" / 단일본·메타데이터 없음 {skipped}개는 사람 판단"
        report.add("OK", "구조 줄 승격", note + " — 파일별 .bak-" + stamp)
        return [note]
    return []


# ── 진료 기록 ──────────────────────────────────────────────────────────
# 지금까지 닥터는 매번 초진이었다. 진단을 어디에도 남기지 않으니 두 번째 방문이
# 첫 방문보다 나을 수 없었다. 차트는 기록에 대한 '판단'만 담는다 — 프로젝트에 대한
# 사실은 항목과 대화에 있고, 차트를 지워도 기억은 온전하다. 잃는 것은 차이를 아는 능력뿐.

CHART_NAME = ".mnemo-doctor-chart.md"


def read_chart(root: Path) -> dict:
    """지난 방문의 수치와, 사람이 '무관'으로 판정해 둔 날짜."""
    path = root / "memory" / CHART_NAME
    state = {"metrics": None, "when": None, "ignored": set()}
    if not path.is_file():
        return state
    text = path.read_text(encoding="utf-8", errors="replace")
    for match in re.finditer(r'<!--\s*metrics\s+(\{.*?\})\s*-->', text):
        try:
            state["metrics"] = json.loads(match.group(1))
        except ValueError:
            continue
    visits = re.findall(r'^##\s+(\S+ \S+)', text, re.M)
    if visits:
        state["when"] = visits[-1]
    for line in text.splitlines():
        marked = re.match(r'^\s*[-*]\s*무관\s*:\s*(.+)$', line)
        if marked:
            state["ignored"] |= {d for d in re.findall(r'\d{4}-\d{2}-\d{2}', marked.group(1))}
    return state


def append_chart(root: Path, metrics: dict, fixed: list, fix: bool) -> None:
    path = root / "memory" / CHART_NAME
    path.parent.mkdir(parents=True, exist_ok=True)
    new = not path.is_file()
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    lines = []
    if new:
        lines += ["# Mnemo 진료 기록", "",
                  "> 닥터가 방문마다 덧붙이는 판단 기록입니다. 고치지 말고 덧붙이세요.",
                  "> 기록에 대한 판단만 담습니다 — 프로젝트에 대한 사실은 항목과 대화에 있습니다.",
                  "> 무관하다고 판정한 날은 `- 무관: 2026-03-18, 2026-04-07`처럼 적으면 다시 묻지 않습니다.", ""]
    lines.append(f"## {stamp} · {'--fix' if fix else '진단만'}")
    lines.append(f"<!-- metrics {json.dumps(metrics, ensure_ascii=False, sort_keys=True)} -->")
    lines.append("- 수치: " + " · ".join(f"{key} {value}" for key, value in sorted(metrics.items())))
    lines.append("- 고친 것: " + ("; ".join(fixed) if fixed else "없음"))
    lines.append("- 미룸: 이유 없는 SUPERSEDED {0}건 · 앵커가 산문에만 {1}건 · 신호 있는 미부착 {2}일 · "
                 "되돌릴 조건 없음 {3}건 · 외부 사실 재확인 {4}건".format(
        metrics.get("supersede_no_reason", 0), metrics.get("prose_only", 0), metrics.get("signal_days", 0),
        metrics.get("reopen_missing", 0), metrics.get("verify_stale", 0)))
    lines.append("")
    with path.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write("\n".join(lines))


def report_chart_delta(previous: dict, metrics: dict, report: Report) -> None:
    """같은 것을 다시 세지 않고, 지난 방문 이후 무엇이 달라졌는지만 말한다."""
    old = previous.get("metrics")
    if not old:
        report.add("OK", "진료 기록", "첫 방문입니다 (이번 수치를 차트에 남깁니다)")
        return
    labels = {"dead_links": "열리지 않는 링크", "prose_only": "앵커가 산문에만",
              "supersede_no_reason": "이유 없는 SUPERSEDED", "stale_depends": "흔들리는 CURRENT",
              "unattached_days": "미부착 날", "evidence": "evidence 줄", "entries": "항목",
              "status_missing": "status 줄 없음", "signal_days": "신호 있는 미부착", "reopen_missing": "되돌릴 조건 없음",
              "verify_stale": "외부 사실 재확인 필요", "live": "살아 있는 결정", "external": "외부 사실에 기댄 결정"}
    moved = [f"{labels.get(key, key)} {old[key]}→{metrics[key]}"
             for key in metrics if key in old and old[key] != metrics[key]]
    detail = f"지난 방문 {previous.get('when') or '시각 미상'} 대비 — "
    detail += ", ".join(moved) if moved else "달라진 수치 없음"
    if previous.get("ignored"):
        detail += f" / 무관 판정 {len(previous['ignored'])}일은 목록에서 제외"
    report.add("OK", "진료 기록", detail)


def main():
    parser = argparse.ArgumentParser(
        description="프로젝트 기억을 현재 구조 기준으로 진단한다 (수정은 --fix, 기계적인 것만)")
    parser.add_argument("--project-root", default=".", help="프로젝트 경로 (기본: 현재 디렉터리)")
    parser.add_argument("--fix", action="store_true",
                        help="기계적으로 안전한 것만 고친다 (정제 기준값, #slug 링크 번호화, 기록 안의 루트 내부 절대경로)")
    parser.add_argument("--chart", action="store_true",
                        help="이번 방문을 진료 기록(memory/.mnemo-doctor-chart.md)에 남긴다. "
                             "--fix는 이미 포함한다. 진단만 할 때는 쓰지 않는다 — 읽기 전용 진단은 파일을 만들지 않는다")
    parser.add_argument("--promote-structure", action="store_true",
                        help="산문에만 있던 코드 앵커와 암묵적 수명을 `files:`·`status:` 구조 줄로 올린다 (기억 본문을 고치므로 --fix와 분리, 파일별 백업)")
    args = parser.parse_args()

    try:
        root = detect_project_root(Path(args.project_root))
    except ValueError as error:
        print(f"[ERROR] 프로젝트 루트를 확인하지 못했습니다: {error}")
        print("        Git 저장소가 아니거나 mnemo 마커가 없는 경로입니다.")
        sys.exit(2)

    chart = read_chart(root)

    report = Report()
    check_structure(root, report)
    check_index_budget(root, report)
    check_entry_metadata(root, report)
    check_detail_file_size(root, report)
    check_lifecycle_links(root, report, args.fix)
    check_distill_offset(root, report, args.fix)
    check_record_paths(root, report, args.fix)
    check_observation_classification(root, report)
    check_anchors(root, report)
    check_handoffs(root, report)
    check_history_recoverability(root, report)
    check_record_coverage(root, report)

    metrics = {}
    metrics.update(check_entry_evidence(root, report))
    metrics.update(check_decision_reasons(root, report))
    metrics.update(check_open_decisions(root, report))
    fixed = promote_structure(root, report) if args.promote_structure else []
    metrics.update(check_unattached_conversations(root, report, chart["ignored"]))
    report_chart_delta(chart, metrics, report)

    print(f"\nMnemo Doctor — {root}")
    print("=" * 64)
    for row in report.rows:
        print(f"  [{row['level']:4}] {row['title']}")
        print(f"         {row['detail']}")
        if row["hint"]:
            print(f"         → {row['hint']}")
    print("=" * 64)

    if report.failures:
        print(f"  실패 {report.failures}건 / 경고 {report.warnings}건")
    elif report.warnings:
        print(f"  경고 {report.warnings}건 — 추가 확인 항목입니다. 기억 손상 판정은 아닙니다.")
    else:
        print("  이상 없음.")
    if not args.fix and report.failures:
        print("  기계적으로 고칠 수 있는 항목은 --fix 로 처리합니다.")

    if args.chart or args.fix or args.promote_structure:
        try:
            append_chart(root, metrics, fixed, args.fix)
            print(f"  진료 기록: memory/{CHART_NAME} 에 이번 방문을 남겼습니다.")
        except OSError as error:
            print(f"  진료 기록을 남기지 못했습니다: {error}")
    elif not (root / "memory" / CHART_NAME).is_file():
        print("  진료 기록이 없습니다 — --chart 로 시작하면 다음 방문이 차이만 말합니다.")
    print()

    sys.exit(1 if report.failures else 0)


if __name__ == "__main__":
    main()
