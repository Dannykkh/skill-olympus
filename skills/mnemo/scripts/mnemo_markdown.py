"""Markdown structure shared by Mnemo diagnostics and read-only recall."""

import re
from pathlib import Path

PRIVATE = re.compile(r"<private>.*?(?:</private>|$)", re.I | re.S)


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
        if {"archive", ".archive"}.intersection(path.relative_to(memory).parts):
            continue
        require_project_path(root, path)
        yield path


def headings(text: str):
    """ATX headings outside fenced examples, with character offsets."""
    offset = 0
    result = []
    for line in mask_fences(text).splitlines(keepends=True):
        match = re.match(r'^ {0,3}(#{1,6})\s+(.+)', line)
        if match:
            result.append((offset, len(match.group(1)), match.group(2).strip()))
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
    if not hs or not re.search(r'카테고리 인덱스|색인|\bmemory index\b', hs[0][2], re.I):
        return False
    if not re.search(r'\]\(<?[^)]+\.md', text):
        return False
    return not any(re.search(r'(?im)^\s*(?:[-*]\s*)?[`*]*#?(?:tags|source)\s*:',
                             without_fences(text[start:hs[i + 1][0] if i + 1 < len(hs) else len(text)]))
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
                     if re.search(r'(?im)^\s*(?:[-*]\s*)?[`*]*#?(?:tags|date|source)\s*:',
                                  structure[start:hs[i + 1][0] if i + 1 < len(hs) else len(structure)])]
        levels = [hs[i][1] for i in annotated]
        fallback = min(levels) if levels else min(h[1] for h in hs if h[1] > 1) if any(h[1] > 1 for h in hs) else 1
        selected = [i for i, h in enumerate(hs) if h[1] == fallback]
        for i in selected:
            start, level, _ = hs[i]
            end = next((h[0] for h in hs[i + 1:] if h[1] <= level), len(text))
            yield path, text[start:end]
