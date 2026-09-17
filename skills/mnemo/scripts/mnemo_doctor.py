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
distillation baseline that no longer matches the files it counts. Everything else is
reported with the evidence needed to decide.

Usage:
    python mnemo_doctor.py                        # 진단만
    python mnemo_doctor.py --fix                  # 기계적으로 안전한 것만 수정
    python mnemo_doctor.py --project-root <path>
"""

import argparse
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path

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
        wiki = re.fullmatch(r'\[\[([^\]|#]+)\]\]', target.strip('`,'))
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


def main():
    parser = argparse.ArgumentParser(
        description="프로젝트 기억을 현재 구조 기준으로 진단한다 (수정은 --fix, 기계적인 것만)")
    parser.add_argument("--project-root", default=".", help="프로젝트 경로 (기본: 현재 디렉터리)")
    parser.add_argument("--fix", action="store_true",
                        help="기계적으로 안전한 것만 고친다 (현재: 정제 기준값)")
    args = parser.parse_args()

    try:
        root = detect_project_root(Path(args.project_root))
    except ValueError as error:
        print(f"[ERROR] 프로젝트 루트를 확인하지 못했습니다: {error}")
        print("        Git 저장소가 아니거나 mnemo 마커가 없는 경로입니다.")
        sys.exit(2)

    report = Report()
    check_structure(root, report)
    check_index_budget(root, report)
    check_entry_metadata(root, report)
    check_detail_file_size(root, report)
    check_lifecycle_links(root, report, args.fix)
    check_distill_offset(root, report, args.fix)
    check_observation_classification(root, report)
    check_anchors(root, report)
    check_handoffs(root, report)
    check_history_recoverability(root, report)
    check_record_coverage(root, report)

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
    print()

    sys.exit(1 if report.failures else 0)


if __name__ == "__main__":
    main()
