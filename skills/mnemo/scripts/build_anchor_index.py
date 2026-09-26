#!/usr/bin/env python3
"""Build the reverse index from a code file to the decisions that rest on it.

Memory is indexed by meaning — title, tags, MEMORY.md. That answers "지난번에 이런 거
했던 것 같은데". It does not answer the far more common opening move: "이 기능 오류났어,
고치자". That request carries no words to search with; it carries a target.

So the lookup key has to be the file. Entries already name the files they rest on —
in a `files:` line where the contract has been applied, in prose everywhere else —
and those paths are root-relative, the same key the codemap uses. This joins them.

This is a DERIVED index: it never edits entries and regenerates from scratch.
Missing inputs are a normal result, not a failure.

Usage:
    python build_anchor_index.py --file hooks/save-turn.sh   # 이 파일에 기대는 결정 (주 용도)
    python build_anchor_index.py                             # 전체 역색인 (stdout)
    python build_anchor_index.py --out memory/.mnemo-anchor-index.md
"""

import argparse
import os
import re
import sys
from datetime import datetime
from pathlib import Path

from mnemo_project_root import detect_project_root

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

# 코드로 보이는 경로만. 기억·대화·핸드오프 자신은 결정의 근거가 아니다 (계보 수확기와 같은 기준).
ANCHOR_RE = re.compile(
    r'(?<![\w/])((?:skills|hooks|scripts|src|lib|app|tests?|agents|templates)/[A-Za-z0-9_./\-]+\.[A-Za-z0-9]{1,6})')
NOISE_PREFIXES = ("memory/", "conversations/", "docs/handoffs/", "codemap/")


def entry_files(root: Path):
    """정제 기억 항목. 번호가 붙은 분할본만 — 단일본은 항목 경계가 파일 경계와 다르다."""
    memory = root / "memory"
    if not memory.is_dir():
        return []
    return sorted(p for p in memory.glob("*/[0-9]*.md") if ".bak-" not in p.name)


def read_entry(path: Path) -> dict:
    text = path.read_text(encoding="utf-8", errors="replace")
    title = next((line.lstrip("# ").strip() for line in text.splitlines() if line.startswith("# ")), path.stem)

    status = None
    match = re.search(r'(?im)^\s*(?:[-*]\s*)?[`*]*status[`*]*\s*:\s*(.*)$', text)
    if match:
        upper = match.group(1).upper()
        status = "SUPERSEDED" if "SUPERSEDED" in upper else ("CURRENT" if "CURRENT" in upper else None)

    # 구조 줄이 있으면 그것이 정본이다. 없으면 본문에서 읽는다 — 계약 적용 전 항목도 조회에 걸려야 한다.
    declared = re.search(r'(?im)^\s*(?:[-*]\s*)?[`*]*files[`*]*\s*:\s*(.*)$', text)
    if declared:
        paths = [p.strip().strip("`,") for p in declared.group(1).split(",")]
        source = "files:"
    else:
        paths = ANCHOR_RE.findall(text)
        source = "본문"

    cleaned = []
    for item in paths:
        item = item.replace("\\", "/").strip().strip("`")
        if not item or item.startswith(NOISE_PREFIXES) or item in cleaned:
            continue
        cleaned.append(item)
    return {"path": path, "title": title, "status": status, "files": cleaned, "source": source}


def build(root: Path) -> dict:
    index: dict[str, list] = {}
    for path in entry_files(root):
        entry = read_entry(path)
        for target in entry["files"]:
            index.setdefault(target, []).append(entry)
    return index


def describe(entry: dict) -> str:
    mark = {"CURRENT": " ✅ CURRENT", "SUPERSEDED": " ❌ SUPERSEDED"}.get(entry["status"], "")
    return f"[[{entry['path'].stem}]] ({entry['path'].parent.name}){mark} — {entry['title']}"


def lookup(root: Path, index: dict, target: str) -> int:
    """한 파일에 기대는 결정. 하위 경로·파일명 끝자리 일치까지 받아준다."""
    wanted = re.sub(r'^(?:\.?/)+', '', target.replace("\\", "/").strip())
    hits = []
    for anchor, entries in index.items():
        if anchor == wanted or anchor.endswith("/" + wanted) or wanted.endswith("/" + anchor):
            hits.extend(entries)
    if not hits:
        print(f"{wanted} 에 기대는 결정이 없습니다. 새 줄기일 수 있습니다 — 이 작업이 결정을 낳으면 항목을 만드세요.")
        return 0
    seen, unique = set(), []
    for entry in hits:
        if entry["path"] not in seen:
            seen.add(entry["path"])
            unique.append(entry)
    print(f"{wanted} 에 기대는 결정 {len(unique)}건 — 뒤집는다면 그 항목에 SUPERSEDED·이유를 남기세요.")
    for entry in unique:
        print(f"  - {describe(entry)}")
    return len(unique)


def render(root: Path, index: dict) -> str:
    entries = {e["path"] for group in index.values() for e in group}
    lines = [
        "# 앵커 역색인",
        "",
        "> `memory/*/NNN-*.md`의 `files:` 줄과 본문 코드 경로에서 파생된 조회용 색인입니다.",
        "> 직접 편집하지 마세요 — `build_anchor_index.py`가 매번 처음부터 다시 만듭니다.",
        "> 파일을 고치기 전에 여기서 그 파일에 기대는 결정을 확인하세요.",
        "",
        f"생성 {datetime.now().strftime('%Y-%m-%d %H:%M')} · 파일 {len(index)}개 · 항목 {len(entries)}개",
        "",
    ]
    for anchor in sorted(index):
        lines.append(f"## {anchor}")
        for entry in sorted(index[anchor], key=lambda e: e["path"].name):
            lines.append(f"- {describe(entry)}")
        lines.append("")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="코드 파일 → 그 파일에 기대는 기억 항목 (파생 색인, 읽기 전용 생성)")
    parser.add_argument("--project-root", default=".", help="프로젝트 경로 (기본: 현재 디렉터리)")
    parser.add_argument("--file", help="이 파일에 기대는 결정만 조회한다")
    parser.add_argument("--out", nargs="?", const="memory/.mnemo-anchor-index.md",
                        help="전체 색인을 파일로 쓴다 (기본: stdout, 값 없이 주면 memory/.mnemo-anchor-index.md). "
                             "파생 파일이므로 점 접두 이름을 쓴다 — 기억 항목으로 오인되면 진단 수치가 오염된다")
    args = parser.parse_args()

    try:
        root = detect_project_root(Path(args.project_root))
    except ValueError as error:
        print(f"[ERROR] 프로젝트 루트를 확인하지 못했습니다: {error}")
        sys.exit(2)

    index = build(root)
    # --file은 언제나 그 파일에 대해 답한다. 색인이 비었다는 사정은 물어본 사람의 질문이 아니다.
    if args.file:
        lookup(root, index, args.file)
        sys.exit(0)

    if not index:
        print("앵커를 가진 기억 항목이 없습니다. 없는 것도 결과입니다 — "
              "항목에 `files:` 줄을 넣으면 파일에서 결정으로 되짚을 수 있습니다.")
        sys.exit(0)

    text = render(root, index)
    if args.out:
        target = (root / args.out) if not Path(args.out).is_absolute() else Path(args.out)
        target.parent.mkdir(parents=True, exist_ok=True)
        # 훅이 기억 항목 편집을 보고 이 재생성을 떼어내 돌릴 수 있으므로 동시 실행을 가정한다.
        # 임시 파일에 쓰고 바꿔치워, 읽는 쪽이 반쯤 쓰인 색인을 보지 않게 한다.
        temporary = target.with_name(f"{target.name}.tmp-{os.getpid()}")
        temporary.write_text(text, encoding="utf-8", newline="\n")
        os.replace(temporary, target)
        print(f"{target} 에 파일 {len(index)}개의 역색인을 썼습니다.")
    else:
        print(text)


if __name__ == "__main__":
    main()
