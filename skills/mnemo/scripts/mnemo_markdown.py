"""Markdown structure shared by Mnemo diagnostics and read-only recall."""

import re
from pathlib import Path

PRIVATE = re.compile(r"<private>.*?(?:</private>|$)", re.I | re.S)

# 메타 줄의 모양은 여기 한 곳에만 둔다. 필드 이름 뒤의 닫는 `**`·백틱을 받는 곳과 안 받는 곳이
# 갈라져 있던 탓에 `- **Date**:` 항목이 메타 검사에서는 날짜가 있고 항목 경계에서는 머리가 없었다.
META_PREFIX = r'^\s*(?:[-*]\s*)?[`*]*#?'


def meta_line(names: str, rest: str = '') -> re.Pattern:
    """`names`(정규식 대안) 필드로 시작하는 메타 줄. `rest`는 콜론 뒤에 이어 붙일 패턴이다."""
    return re.compile(rf'(?im){META_PREFIX}(?:{names})[`*]*\s*:{rest}')


ENTRY_META = meta_line('tags|date|source')
INDEX_META = meta_line('tags|source')


def mask_private(text: str) -> str:
    """Hide private structure while preserving every character offset."""
    return PRIVATE.sub(lambda m: re.sub(r"[^\n]", " ", m.group()), text)


def fence_spans(text: str) -> list[tuple[int, int, bool]]:
    """Return fence ranges and whether each range has a valid closing line."""
    spans, offset, start, fence = [], 0, 0, None
    for line in text.splitlines(keepends=True):
        marker = re.match(r'^ {0,3}(`{3,}|~{3,})', line)
        if fence is None and marker:
            start, fence = offset, marker.group(1)
        elif fence and re.fullmatch(r' {0,3}' + re.escape(fence[0]) + '{' + str(len(fence)) + r',}\s*', line):
            spans.append((start, offset + len(line), True))
            fence = None
        offset += len(line)
    if fence:
        spans.append((start, len(text), False))
    return spans


def mask_fences(text: str, *, closed_only: bool = False) -> str:
    """Blank fence ranges without changing source positions."""
    parts, cursor = [], 0
    for start, end, closed in fence_spans(text):
        if closed_only and not closed:
            continue
        parts.extend((text[cursor:start], re.sub(r'[^\n]+', lambda m: ' ' * len(m.group()), text[start:end])))
        cursor = end
    return ''.join((*parts, text[cursor:]))


def require_project_path(root: Path, path: Path) -> None:
    """Reject source aliases outside the project before opening their content."""
    if not path.resolve().is_relative_to(root.resolve()):
        raise ValueError(f"outside-project Mnemo source: {path}")


def memory_files(root: Path):
    memory = root / "memory"
    require_project_path(root, memory)
    for path in sorted(memory.rglob("*.md")):
        # 점 접두 파일·폴더는 파생 산출물(앵커 색인·진료 기록)이나 사람이 만든 백업이다.
        parts = path.relative_to(memory).parts
        if "archive" in parts or any(part.startswith(".") for part in parts):
            continue
        require_project_path(root, path)
        yield path


def headings(text: str):
    """ATX headings outside fenced examples, with character offsets."""
    offset = 0
    result = []
    for line in mask_fences(text).splitlines(keepends=True):
        # UTF-8 BOM으로 시작하는 파일은 첫 제목 앞에 U+FEFF가 남는다. 못 읽으면 항목 전체가 사라진다.
        match = re.match(r'^(\ufeff?) {0,3}(#{1,6})\s+(.+)', line)
        if match:
            result.append((offset + len(match.group(1)), len(match.group(2)), match.group(3).strip()))
        offset += len(line)
    return result


def without_fences(text: str) -> str:
    """Ignore example metadata and lifecycle declarations inside code fences."""
    lines, offset, index = [], 0, 0
    spans = fence_spans(text)
    for line in text.splitlines(keepends=True):
        while index < len(spans) and offset >= spans[index][1]:
            index += 1
        inside = index < len(spans) and spans[index][0] <= offset < spans[index][1]
        lines.append('' if inside else line.rstrip('\r\n'))
        offset += len(line)
    return '\n'.join(lines)


def is_memory_index(path: Path, text: str) -> bool:
    if path.name.lower() in {'index.md', 'memory.md'}:
        return True
    hs = headings(text)
    if not hs or not re.search(r'(?:카테고리|키워드) 인덱스|색인|\b(?:memory|keyword) index\b', hs[0][2], re.I):
        return False
    if not re.search(r'\]\(<?[^)]+\.md', text):
        return False
    return not any(INDEX_META.search(without_fences(text[start:hs[i + 1][0] if i + 1 < len(hs) else len(text)]))
                   for i, (start, level, _) in enumerate(hs) if level > hs[0][1])


def iter_entry_blocks(root: Path, *, exclude_private: bool = False):
    """Yield refined entries, including legacy multi-entry files."""
    if not (root / "memory").is_dir():
        return
    for path in memory_files(root):
        if path.name == "index.md" or path.name.startswith("."):
            continue
        text = path.read_text(encoding="utf-8", errors="replace")
        structure = mask_private(text) if exclude_private else text
        if is_memory_index(path, structure):
            continue
        hs = headings(structure)
        if not hs:
            continue
        annotated = [i for i, (start, _, _) in enumerate(hs)
                     if ENTRY_META.search(structure[start:hs[i + 1][0] if i + 1 < len(hs) else len(structure)])]
        levels = [hs[i][1] for i in annotated]
        fallback = min(levels) if levels else min(h[1] for h in hs if h[1] > 1) if any(h[1] > 1 for h in hs) else 1
        selected = [i for i, h in enumerate(hs) if h[1] == fallback]
        for i in selected:
            start, level, _ = hs[i]
            end = next((h[0] for h in hs[i + 1:] if h[1] <= level), len(text))
            yield path, text[start:end]


def entry_names(path: Path, block: str) -> set[str]:
    """한 기록을 `[[이름]]`으로 가리킬 수 있는 이름들.

    파일 stem, 그리고 옛 다항목 파일에서 제목 첫 토큰이 `NNN-slug` 꼴이면 그 토큰이다.
    닥터의 링크·상태 판정과 회상의 링크 추적이 이 규칙 하나를 함께 쓴다 — 따로 두면 한쪽이
    여는 링크를 다른 쪽은 '대상 없음'이라 한다. 번호만 같고 slug가 다른 이름은 열지 않는다.
    """
    names = {path.stem}
    hs = headings(block)
    legacy = re.match(r'(\d{3}-\S+)(?:\s|$)', hs[0][2]) if hs else None
    if legacy:
        names.add(legacy.group(1))
    return names
