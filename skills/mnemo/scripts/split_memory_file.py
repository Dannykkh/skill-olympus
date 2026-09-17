#!/usr/bin/env python3
"""
Split an oversized memory file into one file per entry plus an index.

MEMORY.md has a 100-line budget and memory-compact to enforce it, but the detail
files under memory/ have no ceiling at all. They grow until reading a single entry
costs the whole file — one architecture.md measured 224KB for 160 entries, with a
single section holding 78% of it. At that size progressive disclosure stops working.

The target layout is not invented here: gotchas/ and learned/ already use
"one file per entry + index.md". This moves a monolithic file onto that same shape,
keeping the '##' grouping as a column in the index so nothing is lost.

Entry prose is preserved, with headings relocated and Markdown destinations rebased.
Nothing is summarised or merged. Section introductions are retained in the index.

Usage:
    python split_memory_file.py memory/architecture.md               # dry-run
    python split_memory_file.py memory/architecture.md --apply
"""

import argparse
import os
import re
import shutil
import sys
from datetime import datetime
from pathlib import Path
from urllib.parse import quote, unquote

from mnemo_project_root import detect_project_root

# Windows에서 print()가 한글을 cp949로 출력하다 깨지는 것을 방지.
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

# 제목에 붙는 상태 표시. 파일명에는 넣지 않되 본문에는 그대로 둔다.
STATUS_MARKERS = re.compile(r'(✅|❌|⚠️)\s*(CURRENT|SUPERSEDED|DEPRECATED)?', re.I)


def slugify(title: str, limit: int = 48) -> str:
    """제목을 파일명으로. 항목 제목이 태그 나열인 경우가 많아 길이를 자른다."""
    text = STATUS_MARKERS.sub("", title)
    text = re.sub(r'[`*_\[\]()]', '', text).strip().lower()
    text = re.sub(r'[\s,/]+', '-', text)
    text = re.sub(r'[^a-z0-9가-힣\-]', '', text)
    text = re.sub(r'-{2,}', '-', text).strip('-')
    if len(text) > limit:
        # 하이픈 경계에서 자른다. 단어 중간에서 끊기면 알아보기 어렵다.
        text = text[:limit].rsplit('-', 1)[0] or text[:limit]
    return text or "entry"


def field(block: str, name: str) -> str:
    """`tags: a, b` / `date: ...` 같은 메타 줄에서 값을 꺼낸다."""
    match = re.search(rf'`?\s*{name}\s*:\s*([^`\n]+)`?', block, re.I)
    return match.group(1).strip().rstrip('`').strip() if match else ""


def parse_entries(text: str) -> tuple:
    """'##' 섹션을 따라가며 '###' 항목을 모은다. 머리말은 따로 보존한다."""
    preamble, entries = [], []
    section = ""
    current = None
    fence = None
    for line in text.splitlines():
        marker = re.match(r'^ {0,3}(`{3,}|~{3,})', line)
        if fence:
            (current["body"] if current is not None else preamble).append(line)
            if re.fullmatch(r' {0,3}' + re.escape(fence[0]) + '{' + str(len(fence)) + r',}\s*', line):
                fence = None
            continue
        if marker:
            fence = marker.group(1)
            (current["body"] if current is not None else preamble).append(line)
            continue
        if line.startswith("## ") and not line.startswith("### "):
            section = line[3:].strip()
            current = None
            preamble.append(line)
            continue
        if line.startswith("### "):
            current = {"title": line[4:].strip(), "section": section, "body": []}
            entries.append(current)
            continue
        if current is not None:
            current["body"].append(line)
        else:
            preamble.append(line)
    return preamble, entries


def heading_anchor(title: str) -> str:
    """GitHub-style heading fragment for ordinary Markdown headings."""
    return re.sub(r'[^\w\- ]', '', title.lower()).replace(' ', '-')


def rewrite_links(text: str, transform) -> str:
    """Rewrite Markdown destinations, leaving fenced and inline code untouched."""
    result, fence = [], None
    destination = r'(<[^>\n]+>|(?:[^\s()]+|\([^()]*\))+)'
    inline = re.compile(r'(\]\(\s*)' + destination)
    reference = re.compile(r'^( {0,3}\[[^]\n]+\]:\s*)' + destination)
    def replace(match):
        value = match.group(2)
        angled = value.startswith('<')
        changed = transform(value[1:-1] if angled else value)
        return match.group(1) + (f'<{changed}>' if angled else changed)
    for line in text.splitlines(keepends=True):
        marker = re.match(r'^ {0,3}(`{3,}|~{3,})', line)
        if fence:
            result.append(line)
            if re.fullmatch(r' {0,3}' + re.escape(fence[0]) + '{' + str(len(fence)) + r',}\s*', line):
                fence = None
            continue
        if marker:
            fence = marker.group(1)
            result.append(line)
            continue
        parts = re.split(r'(`+[^`]*`+)', line)
        result.append(''.join(part if i % 2 else reference.sub(replace, inline.sub(replace, part))
                              for i, part in enumerate(parts)))
    return ''.join(result)


def link_transform(source: Path, destination: Path, anchors: dict, moved: Path):
    def transform(value: str) -> str:
        if re.match(r'^[a-zA-Z][\w+.-]*:', value) or value.startswith(('/', '\\')):
            return value
        path, separator, fragment = value.partition('#')
        path, query_mark, query = path.partition('?')
        resolved = (source.parent / unquote(path)).resolve() if path else source.resolve()
        suffix = (query_mark + query) + (separator + fragment)
        if resolved == moved.resolve():
            target, target_fragment = anchors.get(unquote(fragment), (moved.parent / moved.stem / 'index.md', ''))
            suffix = query_mark + query
            if target_fragment:
                suffix += '#' + target_fragment
        else:
            target = resolved
        relative = Path(os.path.relpath(target, destination.parent)).as_posix()
        return quote(relative, safe='/@:+-._~()') + suffix
    return transform


def build_index(name: str, entries: list, filenames: list) -> str:
    """gotchas/index.md와 같은 표 형식. 섹션을 컬럼으로 남겨 묶음을 보존한다."""
    has_section = any(e["section"] for e in entries)
    header = "| Date | Section | Entry | Tags |" if has_section else "| Date | Entry | Tags |"
    divider = "|------|---------|-------|------|" if has_section else "|------|-------|------|"
    rows = []
    for entry, filename in zip(entries, filenames):
        body = "\n".join(entry["body"])
        date = field(body, "date") or "-"
        tags = field(body, "tags") or "-"
        title = STATUS_MARKERS.sub("", entry["title"]).strip() or entry["title"]
        link = f"[{title}]({filename})"
        rows.append(f"| {date} | {entry['section'] or '-'} | {link} | {tags} |" if has_section
                    else f"| {date} | {link} | {tags} |")
    return "\n".join([f"# {name.title()} Index", "",
                      # 원본 이름을 백틱으로 감싸면 앵커 검사가 사라진 파일로 잡는다. 산문으로 둔다.
                      f"> 단일 파일 {name}.md를 항목 단위로 나눈 색인입니다. 항목 {len(entries)}개.",
                      "", header, divider, *rows, ""])


def main():
    parser = argparse.ArgumentParser(
        description="비대해진 상세 기억 파일을 '항목별 파일 + index.md'로 나눈다")
    parser.add_argument("target", help="나눌 파일 (예: memory/architecture.md)")
    parser.add_argument("--project-root", default=".", help="프로젝트 경로 (기본: 현재 디렉터리)")
    parser.add_argument("--apply", action="store_true", help="실제로 나눈다 (없으면 dry-run)")
    args = parser.parse_args()

    try:
        root = detect_project_root(Path(args.project_root))
    except ValueError as error:
        print(f"[ERROR] 프로젝트 루트를 확인하지 못했습니다: {error}")
        sys.exit(2)

    source = Path(args.target)
    if not source.is_absolute():
        source = root / args.target
    if not source.is_file():
        print(f"[ERROR] 파일이 없습니다: {source}")
        sys.exit(2)

    name = source.stem
    out_dir = source.parent / name
    if out_dir.exists() and any(out_dir.glob("*.md")):
        print(f"[ERROR] 분할 대상 디렉터리에 이미 내용이 있습니다: {out_dir}")
        print("        분할본과 단일본이 섞이면 어느 쪽이 정본인지 알 수 없습니다.")
        sys.exit(2)

    # Do not replace undecodable bytes and then delete the only canonical source.
    text = source.read_text(encoding="utf-8")
    preamble, entries = parse_entries(text)
    if not entries:
        print(f"[INFO] '### ' 항목이 없어 나눌 것이 없습니다: {source.name}")
        sys.exit(0)

    # 같은 slug가 겹쳐도 번호가 앞에 붙어 충돌하지 않는다.
    filenames = [f"{i:03d}-{slugify(e['title'])}.md" for i, e in enumerate(entries, 1)]
    anchors = {}
    counts = {}
    target_counts = {}
    target = out_dir / "index.md"
    entry_number = 0
    fence = None
    for line in text.splitlines():
        marker = re.match(r'^ {0,3}(`{3,}|~{3,})', line)
        if fence:
            if re.fullmatch(r' {0,3}' + re.escape(fence[0]) + '{' + str(len(fence)) + r',}\s*', line):
                fence = None
            continue
        if marker:
            fence = marker.group(1)
            continue
        heading = re.match(r'^(#{1,6}) (.+)$', line)
        if not heading:
            continue
        level, title = heading.groups()
        if level == '##':
            target = out_dir / 'index.md'
        elif level == '###':
            target = out_dir / filenames[entry_number]
            entry_number += 1
        anchor = heading_anchor(title)
        count = counts.get(anchor, 0)
        counts[anchor] = count + 1
        old_anchor = anchor + (f'-{count}' if count else '')
        target_count = target_counts.get((target, anchor), 0)
        target_counts[(target, anchor)] = target_count + 1
        new_anchor = anchor + (f'-{target_count}' if target_count else '')
        anchors[old_anchor] = (target, new_anchor)

    print(f"[INFO] {source.relative_to(root).as_posix()} — {round(len(text.encode()) / 1024)}KB, "
          f"항목 {len(entries)}개")
    print(f"       → {out_dir.relative_to(root).as_posix()}/ 에 항목별 파일 + index.md")
    by_section = {}
    for entry in entries:
        by_section.setdefault(entry["section"] or "(섹션 없음)", 0)
        by_section[entry["section"] or "(섹션 없음)"] += 1
    for section, count in by_section.items():
        print(f"         {count:4d}개  {section}")

    if not args.apply:
        print("\n  예시 파일명:")
        for filename in filenames[:3]:
            print(f"    {filename}")
        print("\n[DRY-RUN] 아무것도 바꾸지 않았습니다. --apply 를 붙이면 나눕니다.")
        print("          --apply 는 원본을 .bak-<시각> 으로 백업한 뒤 진행합니다.")
        sys.exit(0)

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    backup = source.with_name(f"{source.name}.bak-{stamp}")
    index_md = root / "MEMORY.md"
    # Validate and preserve the index too: restoring only the monolith would
    # otherwise leave MEMORY.md pointing at a removed split directory.
    index_content = index_md.read_text(encoding="utf-8") if index_md.is_file() else None
    index_backup = index_md.with_name(f"MEMORY.md.bak-{stamp}") if index_content is not None else None
    shutil.copy2(source, backup)
    if index_backup:
        shutil.copy2(index_md, index_backup)

    out_dir.mkdir(parents=True, exist_ok=True)
    for entry, filename in zip(entries, filenames):
        body = "\n".join(entry["body"]).strip("\n")
        header = f"# {entry['title']}"
        section_line = f"\n> 섹션: {entry['section']}\n" if entry["section"] else ""
        content = f"{header}\n{section_line}\n{body}\n"
        # Reference definitions can live outside an entry. Carry them with every
        # entry so moving the referencing text does not silently break its links.
        definitions = re.findall(r'^ {0,3}\[[^]\n]+\]:[^\n]+$', text, re.M)
        missing = [line for line in definitions if line not in content.splitlines()]
        if missing:
            content += '\n' + '\n'.join(missing) + '\n'
        content = rewrite_links(content, link_transform(source, out_dir / filename, anchors, source))
        (out_dir / filename).write_text(content,
                                        encoding="utf-8", newline="\n")

    (out_dir / "index.md").write_text(build_index(name, entries, filenames),
                                      encoding="utf-8", newline="\n")

    # 머리말은 버리지 않고 인덱스 위에 남긴다.
    lead = "\n".join(preamble).strip()
    lead = rewrite_links(lead, link_transform(source, out_dir / 'index.md', anchors, source))
    if lead:
        index_path = out_dir / "index.md"
        index_path.write_text(index_path.read_text(encoding="utf-8")
                              + f"\n---\n\n## 원본 머리말\n\n{lead}\n",
                              encoding="utf-8", newline="\n")

    # MEMORY.md가 옛 경로를 가리키면 검색 1~2단계가 끊긴다. 링크를 새 인덱스로 옮긴다.
    rewired, leftovers = 0, []
    if index_content is not None:
        content = index_content
        transform = link_transform(index_md, index_md, anchors, source)
        def rewire(value):
            path = value.partition('#')[0].partition('?')[0]
            if path and (index_md.parent / unquote(path)).resolve() == source.resolve():
                return transform(value)
            return value
        updated = rewrite_links(content, rewire)
        if updated != content:
            content = updated
            index_md.write_text(content, encoding="utf-8")
            rewired = 1
        # 링크가 아닌 형태로도 파일명을 부를 수 있다. 실제로 MEMORY.md에는
        # `a=architecture.md` 같은 약어 범례가 있었고, 링크만 고치면 그 참조가 통째로 끊긴다.
        # 형태를 다 알 수 없으므로 고치지 않고 남은 언급을 보여준다.
        for number, line in enumerate(content.splitlines(), 1):
            if f"{name}.md" in line and f"{name}/index.md" not in line:
                leftovers.append((number, line.strip()[:90]))

    # Keep the original until every generated file and the root index is written.
    source.unlink()

    print(f"\n[DONE] 항목 {len(entries)}개를 {out_dir.relative_to(root).as_posix()}/ 로 옮겼습니다.")
    print(f"       백업: {backup.relative_to(root).as_posix()}")
    if index_backup:
        print(f"       인덱스 백업: {index_backup.name}")
    if rewired:
        print(f"       MEMORY.md 링크를 memory/{name}/index.md 로 갱신했습니다.")
    if leftovers:
        print(f"\n[WARN] MEMORY.md에 '{name}.md'를 링크가 아닌 형태로 부르는 곳이 {len(leftovers)}곳 남았습니다.")
        for number, line in leftovers[:3]:
            print(f"       {number}: {line}")
        print(f"       약어 범례 등은 형태를 알 수 없어 자동으로 고치지 않았습니다. "
              f"memory/{name}/index.md 로 직접 바꾸세요.")
    print("       되돌리려면 원본·MEMORY.md 백업을 각각 복원하고 생성된 분할 디렉터리를 확인 후 정리하세요.")
    sys.exit(0)


if __name__ == "__main__":
    main()
