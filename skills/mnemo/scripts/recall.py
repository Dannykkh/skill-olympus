#!/usr/bin/env python3
"""Read-only, bounded recall of Mnemo entries and complete conversation turns.

The caller supplies keywords/synonyms. Ranking finds candidates; it does not
decide truth, user intent, or whether a historical decision still applies.
"""

import argparse
import json
import re
import sys
import unicodedata
from bisect import bisect_right
from collections import defaultdict, deque
from dataclasses import dataclass
from pathlib import Path

from mnemo_markdown import (PRIVATE, fence_spans, headings, iter_entry_blocks,
                            mask_fences, mask_private, require_project_path, without_fences)
from mnemo_project_root import detect_project_root

PREFIXES = {"architecture": "arch", "learned": "learned", "gotchas": "gotcha"}
FIELD = re.compile(
    r"(?im)(?:^|[ \t]+[·|][ \t]+)[ \t]*(?:[-*][ \t]+)?"
    r"(?:[^\w\s\x60*#]+[ \t]+)?(?:[\x60*]*(?:CURRENT|SUPERSEDED)[\x60*]*[ \t]+)?[\x60*]*#?"
    r"(tags|date|source|status|evidence|alternatives|depends-on|supersedes|"
    r"superseded-by|sources|files|reopen-when|last_verified)[\x60*]*\s*:[\x60*]*[ \t]*"
)
ROLE = re.compile(r"^\[(\d{2}:\d{2}(?::\d{2})?)\] (User|Assistant)$")
MARKER = re.compile(
    r"(?m)^<!--\s*(?P<kind>turn|turnhash|aborted-turn|uuid|antigravity-turn|grok-event|devin-turn)"
    r":(?P<value>[^ >]+)\s*-->"
)
RESERVED = re.compile(r"^(arch|learned|gotcha):\d{3}$")
EVIDENCE_PATH = re.compile(r"(?:[A-Za-z]:)?[\w./\\-]*conversations[/\\][\w.-]+\.md")
TIME = re.compile(r"(?<!\d)(\d{2}:\d{2}(?::\d{2})?)(?!\d)")
TERMINAL_MARKERS = {"turn", "turnhash", "aborted-turn"}


def normalize(text: str) -> str:
    return unicodedata.normalize("NFKC", text).casefold().strip()


def redact(text: str) -> str:
    # Preserve line numbers while excluding both closed and unfinished blocks.
    return PRIVATE.sub(lambda m: "[PRIVATE]" + "\n" * m.group().count("\n"), text)


def fields(text: str) -> dict[str, str]:
    clean = without_fences(text)
    matches = list(FIELD.finditer(clean))
    result = {}
    for i, match in enumerate(matches):
        end = matches[i + 1].start() if i + 1 < len(matches) else len(clean)
        value = clean[match.end():end].strip().strip("\x60")
        name = match.group(1).lower()
        if name in {"tags", "date", "source", "status"}:
            value = value.splitlines()[0] if value else ""
        result[name] = (result.get(name, "") + " " + value).strip() if name == "tags" else value
    return result


@dataclass
class Record:
    path: str
    line: int
    end_line: int
    kind: str
    title: str
    content: str
    tags: list[str]
    meta: dict[str, str]
    entry_id: str = ""
    turn_id: str = ""
    times: tuple[str, ...] = ()
    structure_unverified: bool = False

    @property
    def key(self):
        return self.path, self.line

    @property
    def status(self):
        if self.kind != "memory":
            return "UNSPECIFIED"
        match = re.search(r"\b(CURRENT|SUPERSEDED)\b", self.meta.get("status", ""), re.I)
        return match.group().upper() if match else "UNSPECIFIED"


def line_starts(raw: str) -> list[int]:
    return [0, *(m.end() for m in re.finditer("\n", raw))]


def conversation_headings(raw: str) -> tuple[list[tuple[int, int, str]], bool]:
    """Reset fence scope at producer frames; disclose incomplete-frame recovery."""
    visible = mask_fences(mask_private(raw), closed_only=True)
    boundaries = {0, len(raw)}
    for marker in MARKER.finditer(visible):
        if marker.group("kind") in TERMINAL_MARKERS:
            boundaries.add(marker.end())
        elif marker.group("kind") in {"antigravity-turn", "grok-event", "devin-turn"}:
            boundaries.add(marker.start())
    offsets, result, incomplete = sorted(boundaries), [], False
    for start, end in zip(offsets, offsets[1:]):
        frame = raw[start:end]
        incomplete |= any(not closed for _, _, closed in fence_spans(frame))
        clean = mask_fences(mask_private(frame), closed_only=True)
        for match in re.finditer(r"(?m)^ {0,3}##[ \t]+([^\r\n]+)", clean):
            title = match.group(1).strip()
            if ROLE.fullmatch(title):
                result.append((start + match.start(), 2, title))
    return result, incomplete


def make_record(path: str, raw: str, start: int, end: int, kind: str,
                starts: list[int], entry_id: str = "") -> Record:
    content = redact(raw[start:end]).strip()
    hs, incomplete = conversation_headings(content) if kind == "conversation" else (headings(content), False)
    if kind == "conversation":
        metadata = "\n".join(without_fences(content[offset:hs[i + 1][0] if i + 1 < len(hs) else len(content)])
                             for i, (offset, _, _) in enumerate(hs))
    else:
        metadata = content
    meta = fields(metadata)
    tags = list(dict.fromkeys(re.findall(r"[^\s,\x60]+", meta.get("tags", ""))))
    title = hs[0][2] if hs else Path(path).stem
    times = tuple(m.group(1) for _, level, title_ in hs
                  if level == 2 and (m := ROLE.fullmatch(title_)))
    marker = next((m for m in MARKER.finditer(mask_fences(content, closed_only=True))
                   if m.group("kind") == "turn"), None)
    return Record(path, bisect_right(starts, start), bisect_right(starts, max(start, end - 1)),
                  kind, title, content, tags, meta, entry_id,
                  marker.group("value") if marker else "", times, incomplete)


def conversation_records(path: str, raw: str) -> list[Record]:
    # Parse with private spans blanked to exactly the original length.
    masked = mask_private(raw)
    hs = [(offset, ROLE.fullmatch(title)) for offset, level, title in conversation_headings(masked)[0]
          if level == 2 and ROLE.fullmatch(title)]
    records, start, has_assistant = [], None, False
    starts = line_starts(raw)
    for i, (offset, role) in enumerate(hs):
        if start is not None and role.group(2) == "User" and has_assistant:
            records.append(make_record(path, raw, start, offset, "conversation", starts))
            start, has_assistant = None, False
        if start is None:
            start = offset
        has_assistant |= role.group(2) == "Assistant"
        end = hs[i + 1][0] if i + 1 < len(hs) else len(raw)
        # Grok/Antigravity markers prefix the next event, not the end of this turn.
        marker = next((m for m in MARKER.finditer(mask_fences(masked[offset:end], closed_only=True))
                       if m.group("kind") in TERMINAL_MARKERS), None)
        if marker:
            records.append(make_record(path, raw, start, end, "conversation", starts))
            start, has_assistant = None, False
    if start is not None:
        records.append(make_record(path, raw, start, len(raw), "conversation", starts))
    return records


def load_records(root: Path) -> tuple[list[Record], int]:
    # minimal: one-project scan, verified below 10 MiB — reconsider scope/indexing if measured recall p95 exceeds 2 s.
    records, texts, starts, cursors = [], {}, {}, defaultdict(int)
    for path, block in iter_entry_blocks(root, exclude_private=True):
        if path not in texts:
            texts[path] = path.read_text(encoding="utf-8", errors="replace")
            starts[path] = line_starts(texts[path])
        raw = texts[path]
        start = raw.find(block, cursors[path])
        if start < 0:
            raise ValueError(f"entry offsets could not be recovered: {path}")
        cursors[path] = start + len(block)
        folder = path.parent.name if path.parent.name in PREFIXES else path.stem
        number = re.match(r"(\d{3})-", path.name)
        if not number:
            number = re.match(r"#+\s+(\d{3})(?:[- .:]|$)", block)
        entry_id = f"{PREFIXES[folder]}:{number.group(1)}" if folder in PREFIXES and number else ""
        records.append(make_record(path.relative_to(root).as_posix(), raw, start,
                                   start + len(block), "memory", starts[path], entry_id))
    conversation_dir = root / "conversations"
    require_project_path(root, conversation_dir)
    for path in sorted(conversation_dir.glob("*.md")):
        if path.name.startswith("."):
            continue
        require_project_path(root, path)
        raw = path.read_text(encoding="utf-8", errors="replace")
        texts[path] = None
        records.extend(conversation_records(path.relative_to(root).as_posix(), raw))
    return records, len(texts)


def matching(record: Record, terms: list[str]) -> dict[str, str]:
    result = {}
    tags = [normalize(tag) for tag in record.tags]
    title, body = normalize(record.title), normalize(record.content)
    for term in terms:
        if RESERVED.fullmatch(term):
            if term == record.entry_id or term in tags:
                result[term] = "entry-id"
        elif any(term in tag for tag in tags):
            result[term] = "tag"
        elif term in title:
            result[term] = "title"
        elif term in body:
            result[term] = "body"
    return result


def rank(record: Record, terms: list[str]):
    hits = matching(record, terms)
    weights = {"entry-id": 4, "tag": 3, "title": 2, "body": 1}
    date = record.meta.get("date", "") if record.kind == "memory" else Path(record.path).name[:10]
    day = re.match(r"^\d{4}-\d{2}-\d{2}", date)
    time = record.times[0].replace(":", "").ljust(6, "0") if record.times else "000000"
    recent = int(day.group().replace("-", "") + time) if day else 0
    return (-max((weights[h] for h in hits.values()), default=0), -len(hits),
            0 if record.kind == "memory" else 1, -recent, record.path, record.line)


class Context:
    def __init__(self, root: Path, records: list[Record], terms: list[str]):
        self.root, self.terms = root, terms
        self.by_id, self.by_stem, self.by_path = defaultdict(list), defaultdict(list), defaultdict(list)
        self.evidence_seen = defaultdict(set)
        self.unresolved = []
        for record in records:
            self.by_path[record.path].append(record)
            if record.kind == "memory":
                if record.entry_id:
                    self.by_id[record.entry_id].append(record)
                stems = {Path(record.path).stem}
                legacy_name = re.match(r"^(\d{3}-\S+)(?:\s|$)", record.title)
                if legacy_name and record.entry_id:
                    stems.add(legacy_name.group(1))
                for stem in stems:
                    self.by_stem[stem].append(record)

    def unique(self, items: list[Record], source: Record, target: str):
        if len(items) == 1:
            return items
        self.unresolved.append({"from": f"{source.path}:{source.line}", "target": target,
                                "reason": "ambiguous" if items else "missing"})
        return []

    def related(self, record: Record, neighbors: int):
        if record.kind == "conversation":
            for tag in record.tags:
                if RESERVED.fullmatch(tag):
                    for linked in self.unique(self.by_id[tag], record, tag):
                        yield linked, "reserved-tag"
                elif tag.startswith("supersedes:#"):
                    slug = tag[len("supersedes:#"):]
                    candidates = [r for stem, rs in self.by_stem.items()
                                  if stem == slug or stem.partition("-")[2] == slug for r in rs]
                    for linked in self.unique(candidates, record, tag):
                        yield linked, "supersedes-tag"
            if neighbors:
                siblings = self.by_path[record.path]
                index = siblings.index(record)
                for i in (index - 1, index + 1):
                    if 0 <= i < len(siblings):
                        yield siblings[i], "adjacent-unverified"
            return
        for field in ("superseded-by", "supersedes", "depends-on"):
            for stem in re.findall(r"\[\[([^\]]+)\]\]", record.meta.get(field, "")):
                for linked in self.unique(self.by_stem[stem], record, stem):
                    yield linked, field
        evidence = record.meta.get("evidence", "")
        paths = list(EVIDENCE_PATH.finditer(evidence))
        by_file = defaultdict(dict)
        for i, match in enumerate(paths):
            name = match.group().replace("\\", "/")
            target = self.root / name
            if name.startswith("../"):
                target = self.root / Path(record.path).parent / name
            try:
                relative = target.resolve().relative_to(self.root).as_posix()
            except ValueError:
                self.unresolved.append({"from": record.path, "target": name, "reason": "outside-project"})
                continue
            if not relative.startswith("conversations/"):
                self.unresolved.append({"from": record.path, "target": name, "reason": "outside-conversations"})
                continue
            tail = evidence[match.end():paths[i + 1].start() if i + 1 < len(paths) else len(evidence)]
            line = re.match(r"(?::|#L)(\d+)(?![:\d])", tail)
            # Selectors belong next to the reference; prose timestamps are not selectors.
            selector = re.match(r"[ \t`)*]*(?:@\s*|:)?(\d{2}:\d{2}(?::\d{2})?)"
                                r"(?:[ \t]*[,、·][ \t]*\d{2}:\d{2}(?::\d{2})?)*", tail)
            times = TIME.findall(selector.group()) if selector and not line else []
            items = self.by_path.get(relative, [])
            if line:
                selected = [r for r in items if r.line <= int(line.group(1)) <= r.end_line]
            elif times:
                selected = [r for r in items if any(t == rt or (len(t) == 5 and rt.startswith(t + ":"))
                                                    for t in times for rt in r.times)]
            else:
                selected = [r for r in items if record.entry_id in r.tags and record.entry_id
                            or matching(r, self.terms)]
            if not selected:
                self.unresolved.append({"from": f"{record.path}:{record.line}", "target": name,
                                        "reason": "turn-not-located" if items else "missing"})
            by_file[relative].update((r.key, r) for r in selected)
        for name, selected in by_file.items():
            omitted = False
            seen = self.evidence_seen[name]
            for linked in sorted(selected.values(), key=lambda r: rank(r, self.terms)):
                if linked.key not in seen and len(seen) >= 3:
                    omitted = True
                    continue
                seen.add(linked.key)
                yield linked, "evidence"
            if omitted:
                self.unresolved.append({"from": record.path, "target": name, "reason": "more-evidence-turns"})


def serialized(value: dict) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def recall(root: Path, terms: list[str], *, limit: int = 6, max_chars: int = 16000,
           scope: str = "all", neighbors: int = 0) -> dict:
    root = root.resolve()
    terms = list(dict.fromkeys(normalize(t) for t in terms if t.strip()))
    if not terms or len(terms) > 16 or any(len(t) > 128 for t in terms):
        raise ValueError("provide 1-16 nonempty keywords, each at most 128 characters")
    if not 1 <= limit <= 20 or not 1024 <= max_chars <= 100000 or neighbors not in (0, 1):
        raise ValueError("limit 1-20; max-chars 1024-100000; neighbors 0 or 1")
    if scope not in {"all", "memory", "conversations"}:
        raise ValueError("scope must be all, memory, or conversations")
    records, files = load_records(root)
    candidates = [r for r in records if matching(r, terms)
                  and (scope == "all" or r.kind == ("memory" if scope == "memory" else "conversation"))]
    seeds = sorted(candidates, key=lambda r: rank(r, terms))[:limit]
    context = Context(root, records, terms)
    for term in terms:
        if RESERVED.fullmatch(term) and len(context.by_id[term]) > 1:
            context.unresolved.append({"from": "query", "target": term, "reason": "ambiguous",
                                       "candidates": [f"{r.path}:{r.line}" for r in context.by_id[term]]})
    queue = deque((r, "match", "", 0) for r in seeds)
    expanded, seen = [], set()
    # A bounded traversal of explicit existing links, not a new memory graph.
    while queue and len(expanded) < 60:
        record, via, parent, depth = queue.popleft()
        if record.key in seen:
            continue
        seen.add(record.key)
        expanded.append((record, via, parent))
        if depth < 3:
            for linked, relation in context.related(record, neighbors if depth == 0 else 0):
                queue.append((linked, relation, f"{record.path}:{record.line}", depth + 1))
    output = {"root": str(root), "terms": terms, "scope": scope, "results": [],
              "unresolved": [], "stats": {"files": files, "records": len(records),
              "direct_matches": len(candidates), "selected": 0, "content_omitted": 0,
              "records_omitted": 0, "unresolved": len(context.unresolved)},
              "note": "Candidates only. CURRENT means not superseded; confirm scope and current user instructions."}
    if len(serialized(output)) + 256 > max_chars:
        raise ValueError("max-chars is too small for the query metadata")
    omitted = 0
    for record, via, parent in expanded:
        item = {"path": record.path, "line": record.line, "end_line": record.end_line,
                "kind": record.kind, "entry_id": record.entry_id, "status": record.status,
                "turn_id": record.turn_id, "tags": record.tags, "via": via,
                "from": parent, "matched": matching(record, terms), "content": record.content}
        if record.structure_unverified:
            item["structure_unverified"] = "incomplete fence; confirm recovered message boundaries in the source"
        output["results"].append(item)
        if len(serialized(output)) + 256 > max_chars:
            del item["content"]
            item["content_omitted"] = "budget; read the indicated source lines before concluding"
            if len(serialized(output)) + 256 > max_chars:
                output["results"].pop()
                omitted += 1
    for issue in context.unresolved[:12]:
        output["unresolved"].append(issue)
        if len(serialized(output)) + 256 > max_chars:
            output["unresolved"].pop()
            break
    output["stats"].update(selected=len(output["results"]),
                           content_omitted=sum("content_omitted" in r for r in output["results"]),
                           records_omitted=omitted + len({r.key for r, _, _, _ in queue if r.key not in seen}),
                           unresolved_omitted=len(context.unresolved) - len(output["unresolved"]))
    return output


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-root", type=Path, default=None)
    parser.add_argument("--term", action="append", required=True, help="keyword or caller-chosen synonym; repeatable")
    parser.add_argument("--scope", choices=["all", "memory", "conversations"], default="all")
    parser.add_argument("--limit", type=int, default=6, help="maximum direct matches (linked context is additional)")
    parser.add_argument("--max-chars", type=int, default=16000, help="JSON output budget in characters, not tokens")
    parser.add_argument("--neighbors", type=int, choices=[0, 1], default=0, help="include unverified adjacent turns")
    args = parser.parse_args()
    try:
        root = detect_project_root(args.project_root or Path.cwd(), explicit=args.project_root is not None)
        result = recall(root, args.term, limit=args.limit, max_chars=args.max_chars,
                        scope=args.scope, neighbors=args.neighbors)
    except (ValueError, OSError) as error:
        parser.error(str(error))
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", newline="\n")
    sys.stdout.write(serialized(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
