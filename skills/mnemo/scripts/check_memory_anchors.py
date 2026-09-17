#!/usr/bin/env python3
"""
Check that code anchors cited by memory entries still point at real files.

Memory rots silently: an entry says "the binding is written in BridgeStreamRelay.cs"
long after that file was renamed, and nothing disagrees with it. Git cannot help —
memory/, docs/ and codemap/ are normally outside version control — so the only way
to turn silent rot into a visible problem is to resolve the anchors and report.

Line numbers are NOT verified: they drift constantly and checking them would produce
noise instead of signal. Only file existence is judged.

When the anchored file is gone and a CodeMap is present, the same basename is looked
up in codemap/files.md to suggest where it moved. The filesystem stays the authority;
CodeMap only supplies candidates, and each candidate is confirmed on disk.

Nothing is ever edited or deleted — this reports, the human decides.

Usage:
    python check_memory_anchors.py                      # memory/ 전체
    python check_memory_anchors.py --file memory/architecture.md
    python check_memory_anchors.py --no-codemap         # 이동 힌트 끄기
"""

import argparse
import re
import sys
from pathlib import Path
from collections import Counter

from mnemo_project_root import detect_project_root

# Windows에서 print()가 한글을 cp949로 출력하다 깨지는 것을 방지.
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

# 앵커로 인정할 확장자. 산문에 섞인 단어를 경로로 오인하지 않으려고 좁게 잡는다.
CODE_SUFFIXES = {
    ".cs", ".py", ".js", ".jsx", ".ts", ".tsx", ".xaml", ".json", ".md", ".ps1",
    ".sh", ".sql", ".yml", ".yaml", ".toml", ".css", ".html", ".csproj", ".bat",
    ".cmd", ".rs", ".go", ".java", ".kt", ".rb", ".php", ".vue", ".svelte",
}
# 백틱 안의 경로만 앵커로 본다. 산문 중간의 점 찍힌 단어를 잡지 않기 위한 제약이다.
ANCHOR_PATTERN = re.compile(r'`([^`\s]+\.[A-Za-z0-9]+(?::\d+(?:-\d+)?)?)`')
CODEMAP_PATH_PATTERN = re.compile(r'`([^`\s]+)`')


def iter_memory_files(root: Path, only: str = None):
    """검사 대상 기억 파일. 인덱스(MEMORY.md)와 memory/ 아래 전부를 본다."""
    if only:
        candidate = Path(only)
        if not candidate.is_absolute():
            candidate = root / candidate
        return [candidate] if candidate.is_file() else []

    files = []
    index = root / "MEMORY.md"
    if index.is_file():
        files.append(index)
    memory_dir = root / "memory"
    if memory_dir.is_dir():
        # 아카이브와 관찰 로그는 정제 대상이 아니라 원본이므로 제외한다.
        files += [p for p in sorted(memory_dir.rglob("*.md"))
                  if not {"archive", ".archive"}.intersection(p.relative_to(memory_dir).parts)]
    return files


def normalize_anchor(raw: str) -> str:
    """라인 번호를 떼고 구분자를 통일한다. 라인은 검증하지 않는다."""
    path = raw.split('#')[0]
    path = re.sub(r':\d+(?:-\d+)?$', '', path)
    path = path.replace(chr(92), '/')
    while path.startswith('./'):
        path = path[2:]
    return path


def looks_like_anchor(path: str) -> bool:
    if not path or path.startswith(('http://', 'https://', 'mailto:')):
        return False
    if '*' in path or '{' in path:            # 글롭은 특정 파일이 아니다
        return False
    suffix = Path(path).suffix.lower()
    return suffix in CODE_SUFFIXES


def current_section(lines: list, index: int) -> str:
    """앵커가 속한 항목 제목. 어느 기억이 썩었는지 지목하기 위한 것이다."""
    for i in range(index, -1, -1):
        match = re.match(r'^#{1,6}\s+(.*)$', lines[i])
        if match:
            return match.group(1).strip()
    return "(제목 없는 항목)"


def load_codemap_index(root: Path) -> dict:
    """codemap/files.md의 평면 목록을 basename → [경로]로 뒤집는다.

    CodeMap 자체가 stale일 수 있으므로 후보로만 쓰고, 제안 전에 디스크에서 확인한다.
    """
    index = {}
    files_md = root / "codemap" / "files.md"
    if not files_md.is_file():
        return index
    try:
        content = files_md.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return index
    for match in CODEMAP_PATH_PATTERN.finditer(content):
        path = match.group(1).replace(chr(92), '/').strip()
        if '/' not in path:
            continue
        index.setdefault(path.rsplit('/', 1)[1], []).append(path)
    return index


SKIP_DIRS = {".git", "node_modules", "bin", "obj", "dist", "build", ".venv", "__pycache__"}

# 아래 셋은 산문이 아니라 구조로 판정하는 분류다. contextual_reason의 "명시적 표식만 인정"
# 원칙을 파일명·첫 디렉터리·CodeMap 유일 일치라는 표식으로 확장한다.
#
# CLI 홈에 사는 설정 파일. 기억이 파일명만 적어도 레포 안에 없는 것이 정상이다.
# 실측: 두 프로젝트의 미해결 앵커 72개 중 20개가 이 부류였다.
CLI_HOME_BASENAMES = {
    "settings.json", "settings.local.json", "config.toml", ".mcp.json", ".claude.json",
    "skills-catalog.md", "agents-catalog.md", "instructions.md", "credentials.json",
    ".codex-sync-manifest.json", "claude.cmd", "claude.md", "agents.md", "gemini.md",
}
# 훅·정제가 만들었다 지우는 일시 파일. 없는 순간이 정상 상태다.
TRANSIENT_BASENAMES = {".mnemo-status.md", ".mnemo-distill-offset", ".mnemo-root", ".mnemo-index.json"}


def build_filesystem_index(root: Path) -> dict:
    """프로젝트를 한 번만 걸어 basename → 경로 색인을 만든다.

    앵커마다 rglob을 돌면 큰 저장소에서 사실상 멈춘다. 무거운 디렉터리는 walk 중에
    쳐내고(rglob은 가지치기를 못 한다), 이름당 후보는 3개까지만 들고 있는다.
    """
    index = {}
    for current, dirs, names in __import__("os").walk(root):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('.')]
        base = Path(current)
        for name in names:
            bucket = index.setdefault(name, [])
            if len(bucket) < 3:
                bucket.append((base / name).relative_to(root).as_posix())
    return index


def find_by_basename(basename: str, root: Path, codemap: dict, cache: dict) -> list:
    """디렉터리 없이 파일명만 적힌 앵커를 푼다.

    `GRAPH_REPORT.md` 같은 표기는 "루트의 그 파일"이 아니라 "그 이름의 파일"을 뜻한다.
    CodeMap 색인을 먼저 보고, 없을 때만 파일시스템 색인을 지연 생성해 확인한다.
    """
    if basename in cache:
        return cache[basename]

    hits = [c for c in codemap.get(basename, []) if (root / c).exists()]
    if not hits:
        if "__fs__" not in cache:
            cache["__fs__"] = build_filesystem_index(root)
        hits = list(cache["__fs__"].get(basename, []))
    cache[basename] = hits
    return hits


def contextual_reason(anchor: str, lines: list, number: int, start: int) -> str:
    """Explicit non-current references are not assertions of a current local file.

    Keep these visible separately; prose is not reliable enough to call them broken
    (or to claim they were verified). Only explicit markers qualify.
    """
    if re.search(r'<[^>]+>|\{[^}]+\}|\*|(?:^|/)\.\.\.(?:/|$)|YYYY-MM-DD', anchor, re.I):
        return "template"
    if re.match(r'^@[^/]+/', anchor):
        return "package"
    line = lines[number]
    # A prohibition applies to its clause, not every anchor on a mixed statement.
    boundaries = list(re.finditer(r';|。|\.\s+(?=[^/])', line))
    left = max((m.end() for m in boundaries if m.end() <= start), default=0)
    right = min((m.start() for m in boundaries if m.start() > start), default=len(line))
    clause = line[left:right]
    if re.search(r'만들지\s*말|생성하지\s*(?:말|않)|추가하지\s*말|(?:do\s+not|never)\s+(?:create|add)', clause, re.I):
        return "prohibition"
    if re.search(r'\bSUPERSEDED\b', clause):
        return "historical"
    section_start = number
    while section_start > 0 and not re.match(r'^#{1,6}\s+', lines[section_start]):
        section_start -= 1
    section_end = number + 1
    while section_end < len(lines) and not re.match(r'^#{1,6}\s+', lines[section_end]):
        section_end += 1
    section = lines[section_start:section_end]
    if section and re.match(r'^#{1,6}\s+.*\bSUPERSEDED\b', section[0]):
        return "historical"
    # Do not mark a whole section historical for prose saying only part changed.
    for row in section:
        plain = row.strip().lstrip('- ').replace('`', '').replace('*', '').replace('❌', '').strip()
        if re.match(r'^status:\s*SUPERSEDED\b', plain, re.I):
            return "historical"
        if re.match(r'^\[SUPERSEDED\]\s*(?:$|superseded-by:)', plain):
            return "historical"
    return ""


def collect_anchors(root: Path, files: list, codemap: dict, contextual: list = None) -> tuple:
    """기억 파일에서 앵커를 뽑고 실재 여부를 판정한다."""
    stale, checked, unreadable = [], 0, []
    basename_cache = {}
    for path in files:
        try:
            content = path.read_text(encoding="utf-8", errors="replace")
        except OSError as error:
            unreadable.append((path, str(error)))
            continue
        lines = content.splitlines()
        seen = set()
        for number, line in enumerate(lines):
            for match in ANCHOR_PATTERN.finditer(line):
                anchor = normalize_anchor(match.group(1))
                # Templates remain visible, unlike URLs which are not file anchors.
                if Path(anchor).suffix.lower() not in CODE_SUFFIXES or anchor.startswith(('http://', 'https://', 'mailto:')):
                    continue
                reason = contextual_reason(anchor, lines, number, match.start())
                if reason:
                    if contextual is not None:
                        contextual.append({"memory_file": path, "line": number + 1,
                                           "anchor": anchor, "reason": reason})
                    continue
                if '/' in anchor:
                    target = Path(anchor).expanduser()
                    if not target.is_absolute():
                        target = root / anchor
                    if target.exists():
                        checked += 1
                        continue
                    # `%USERPROFILE%/…`처럼 환경변수로 시작하는 경로도 홈 경로다. 표식이 명시적이다.
                    if (anchor.startswith('~/') or anchor.startswith('%')
                            or (target.is_absolute() and not target.is_relative_to(root))):
                        if contextual is not None:
                            contextual.append({"memory_file": path, "line": number + 1,
                                               "anchor": anchor, "reason": "environment"})
                        continue
                    # `memory/.mnemo-status.md`처럼 경로로 적은 일시 파일도 파일명으로 판정한다.
                    if Path(anchor).name in TRANSIENT_BASENAMES:
                        if contextual is not None:
                            contextual.append({"memory_file": path, "line": number + 1,
                                               "anchor": anchor, "reason": "transient"})
                        continue
                    # dist/·node_modules/ 아래는 설치·빌드가 만드는 산출물이라 추적 대상이 아니다.
                    # 설치 실패를 기록한 gotcha가 당시 경로를 인용한 것이지 기억이 썩은 것이 아니다.
                    if Path(anchor).parts and Path(anchor).parts[0] in SKIP_DIRS:
                        if contextual is not None:
                            contextual.append({"memory_file": path, "line": number + 1,
                                               "anchor": anchor, "reason": "artifact"})
                        continue
                    # 스킬 루트 기준 상대경로(`references/x.md`)는 CodeMap에서 그 접미로 끝나는 파일이
                    # 정확히 하나면 그 파일이다. 둘 이상이면 판정하지 않고 STALE로 남겨 사람이 고른다.
                    suffix = "/" + anchor.lstrip("/")
                    resolved = [c for c in codemap.get(anchor.rsplit("/", 1)[-1], [])
                                if c.endswith(suffix) and (root / c).exists()]
                    if len(resolved) == 1:
                        checked += 1
                        if contextual is not None:
                            contextual.append({"memory_file": path, "line": number + 1,
                                               "anchor": f"{anchor} → {resolved[0]}",
                                               "reason": "module-relative"})
                        continue
                    # 경로는 틀렸어도 파일 자체는 살아 있을 수 있다. 이동으로 본다.
                elif anchor.lower() in CLI_HOME_BASENAMES or anchor in TRANSIENT_BASENAMES:
                    # 레포 밖(CLI 홈)이나 있다 없다 하는 일시 파일. 없는 것이 정상이다.
                    if contextual is not None:
                        contextual.append({"memory_file": path, "line": number + 1, "anchor": anchor,
                                           "reason": "transient" if anchor in TRANSIENT_BASENAMES else "environment"})
                    continue
                elif find_by_basename(anchor, root, codemap, basename_cache):
                    checked += 1
                    continue
                checked += 1
                # 같은 파일에서 같은 앵커가 여러 번 나오면 한 번만 보고한다.
                key = (path, anchor)
                if key in seen:
                    continue
                seen.add(key)
                stale.append({
                    "memory_file": path,
                    "line": number + 1,
                    "anchor": anchor,
                    "entry": current_section(lines, number),
                })
    return stale, checked, unreadable


def suggest_moves(stale: list, codemap: dict, root: Path) -> None:
    """사라진 앵커의 이동 후보를 CodeMap에서 찾아 붙인다. 디스크로 재확인한다."""
    for item in stale:
        item["moved_to"] = []
        if not codemap:
            continue
        basename = item["anchor"].rsplit('/', 1)[-1]
        if basename.lower() in {"skill.md", "package.json", "readme.md", "index.md", "agents.md"}:
            continue
        for candidate in codemap.get(basename, []):
            if candidate == item["anchor"]:
                continue
            if (root / candidate).exists():
                item["moved_to"].append(candidate)
            if len(item["moved_to"]) >= 3:
                break


def main():
    parser = argparse.ArgumentParser(
        description="기억이 인용한 코드 앵커가 아직 실재하는지 검사한다 (읽기 전용)")
    parser.add_argument("--project-root", default=".", help="프로젝트 경로 (기본: 현재 디렉터리)")
    parser.add_argument("--file", help="이 기억 파일 하나만 검사")
    parser.add_argument("--no-codemap", action="store_true", help="CodeMap 이동 힌트를 끈다")
    parser.add_argument("--limit", type=int, default=40, help="보고할 앵커 수 상한 (기본 40)")
    args = parser.parse_args()

    try:
        root = detect_project_root(Path(args.project_root))
    except ValueError as error:
        print(f"[ERROR] 프로젝트 루트를 확인하지 못했습니다: {error}")
        print("        Git 저장소가 아니거나 mnemo 마커가 없는 경로입니다.")
        sys.exit(2)

    codemap = {} if args.no_codemap else load_codemap_index(root)
    files = iter_memory_files(root, args.file)
    if not files:
        if args.file:
            print(f"[INFO] 기억 파일을 찾지 못했습니다: {args.file}")
        else:
            print(f"[INFO] 검사할 기억 파일이 없습니다: {root}")
            print("       MEMORY.md 또는 memory/*.md가 아직 없습니다. 검사할 것이 없는 상태입니다.")
        sys.exit(0)

    contextual = []
    stale, checked, unreadable = collect_anchors(root, files, codemap, contextual)
    suggest_moves(stale, codemap, root)

    print(f"[INFO] 기억 파일 {len(files)}개에서 코드 앵커 {checked}개를 확인했습니다.")
    if contextual:
        print(f"[CONTEXT] 현재 파일 존재 검증에서 분리한 참조 {len(contextual)}개")
        print("          " + ", ".join(f"{reason}={count}" for reason, count in sorted(Counter(item['reason'] for item in contextual).items())))
        print("          예시·금지·과거·외부 환경 참조는 현재 경로 누락으로 단정하지 않습니다. 문맥 확인이 필요합니다.")
        for item in contextual[:args.limit]:
            print(f"  [{item['reason']}] {item['memory_file'].name}:{item['line']} {item['anchor']}")
    if codemap:
        print(f"[INFO] CodeMap 색인 {len(codemap)}개 파일명 로드 — 사라진 앵커의 이동 후보를 찾습니다.")
    elif not args.no_codemap:
        print("[INFO] codemap/files.md가 없어 이동 후보는 제안하지 않습니다.")
    for path, error in unreadable:
        print(f"[WARN] 읽지 못한 기억 파일: {path.name} ({error})")
    if unreadable:
        sys.exit(2)

    if checked == 0:
        print("[INFO] 현재 파일로 검사할 앵커가 없는 상태입니다." if contextual else
              "[INFO] 백틱으로 감싼 코드 경로가 없습니다. 검사할 앵커가 없는 상태입니다.")
        sys.exit(0)

    if not stale:
        print(f"\n[PASS] 존재 검증 대상 앵커 {checked}개가 모두 실재합니다.")
        sys.exit(0)

    print(f"\n[STALE] 실재하지 않는 앵커 {len(stale)}개 "
          f"(전체의 {round(len(stale) * 100 / checked)}%)")
    print("        항목을 지우지 마세요. 경로를 고치거나 SUPERSEDED로 표시하는 것은 사람이 판단합니다.\n")
    for item in stale[:args.limit]:
        rel = (item["memory_file"].relative_to(root).as_posix()
               if item["memory_file"].is_relative_to(root) else str(item["memory_file"]))
        print(f"  {rel}:{item['line']}")
        print(f"    항목: {item['entry']}")
        print(f"    앵커: {item['anchor']}")
        if item["moved_to"]:
            print(f"    이동 후보: {', '.join(item['moved_to'])}")
        print()
    if len(stale) > args.limit:
        print(f"  ... 그리고 {len(stale) - args.limit}개 더 (--limit 으로 조정)")

    sys.exit(1)


if __name__ == "__main__":
    main()
