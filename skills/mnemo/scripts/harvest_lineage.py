#!/usr/bin/env python3
"""
Harvest per-file change lineage from handoff documents.

Answers "what was this file, where and why did it change" by joining each
handoff's Files Modified rows with that session's recorded decisions.
Handoffs are the only artifact produced on every path (designed or ad-hoc),
so the lineage survives without a design pipeline.

This is a DERIVED index: it never edits handoffs and regenerates from scratch.
Missing inputs are a normal result, not a failure.

Usage:
    python harvest_lineage.py                      # 전체 계보 색인 (stdout)
    python harvest_lineage.py --file Relay.cs      # 이 파일의 계보만 (구현 착수 조회)
    python harvest_lineage.py --out memory/change-lineage.md
    python harvest_lineage.py --all --limit 50     # 1회만 등장한 파일도 포함
"""

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

from mnemo_project_root import detect_project_root

# Windows에서 print()가 한글을 cp949로 출력하다 깨지는 것을 방지.
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

# 표 헤더로 쓰이는 첫 칸. 데이터 행이 아니므로 버린다.
HEADER_CELLS = {"file", "files", "path", "파일", "경로", "feature", "name", "change", "변경",
                "decision", "decisions", "결정", "reason", "rationale", "why", "이유", "근거",
                "description", "설명", "note", "notes", "비고", "status", "상태"}
# 스캐폴드/명시적 공백. create_handoff.py가 깔아두는 플레이스홀더다.
EMPTY_CELLS = {"", "-", "—", "n/a", "na", "none", "없음", "tbd"}
# 계보의 대상은 코드다. 기억·문서 파일 자신은 기본 제외 (--include-memory로 포함).
# 제외 대상은 기억·규칙 체계 자신이다. README 같은 프로젝트 문서는 실제 산출물이므로
# 계보에 남긴다 (README.md만 빼고 README.ko.md는 남기는 비대칭을 만들지 않는다).
NOISE_PREFIXES = ("memory/", "docs/", "codemap/", "conversations/")
NOISE_EXACT = {"memory.md", "claude.md", "agents.md", "gemini.md"}


def read_section(content: str, *names: str) -> str:
    """제목이 붙은 섹션 본문을 돌려준다. 없으면 빈 문자열 — 없는 것은 정상이다."""
    for name in names:
        match = re.search(rf'#{{1,6}}\s*{re.escape(name)}\s*(.*?)(?=\n#{{1,6}}\s|\Z)',
                          content, re.S | re.I)
        if match:
            return match.group(1)
    return ""


def parse_rows(body: str) -> list:
    """표를 우선 파싱하고, 표가 아니면 불릿으로 폴백한다.

    핸드오프는 사람과 여러 CLI가 쓰기 때문에 형식이 균일하지 않다.
    파싱 실패를 에러로 올리면 계보 전체가 날아가므로 행 단위로 건너뛴다.
    """
    rows = []
    for line in body.splitlines():
        stripped = line.strip()
        if stripped.startswith('|'):
            if re.match(r'^\|[\s\-:|]+\|$', stripped):     # 구분선
                continue
            cells = [c.strip() for c in stripped.strip('|').split('|')]
        elif re.match(r'^[-*+]\s+', stripped):             # 불릿 폴백
            rest = re.sub(r'^[-*+]\s+', '', stripped)
            cells = [c.strip() for c in re.split(r'\s+[-–—:]\s+', rest, maxsplit=1)]
        else:
            continue
        if not cells or not cells[0]:
            continue
        first = re.sub(r'[`*_]', '', cells[0]).strip()
        if first.lower() in HEADER_CELLS or first.lower() in EMPTY_CELLS:
            continue
        if first.startswith('['):                          # [TODO:...] 스캐폴드
            continue
        rows.append(cells)
    return rows


def extract_title(content: str, filename: str) -> str:
    """세션 주제. 계획도 결정도 없을 때 마지막으로 남는 '왜'의 근사치다."""
    match = re.search(r'^#\s*Handoff:\s*(.+)$', content, re.M)
    if match:
        title = match.group(1).strip()
        if title and not title.startswith('['):
            return title
    # 제목조차 없으면 파일명 slug에서 되살린다. 날짜·시각 접두는 떼어낸다.
    slug = re.sub(r'^\d{4}-\d{2}-\d{2}(-\d{6})?-?', '', Path(filename).stem)
    return slug.replace('-', ' ').strip() or "(주제 미상)"


def collect_reasons(content: str) -> tuple:
    """'왜'를 단계적으로 찾는다. 지어내지 않고 어디서 왔는지 출처를 함께 돌려준다.

    결정 → 가정 → Origin(최초 요구) 순으로 내려간다. 셋 다 없으면 호출자가
    세션 주제로 폴백하고, 그 사실을 출력에 드러낸다. Origin이 주제보다 뒤가 아닌
    이유는, 기록된 요구가 파일명에서 추론한 제목보다 언제나 나은 근거이기 때문이다.
    """
    for label, names in (("결정", ("Decisions Made", "Decision Records")),
                         ("가정", ("Assumptions Made", "Important Context"))):
        rows = parse_rows(read_section(content, *names))
        reasons = [re.sub(r'[`*]', '', r[0]).strip() for r in rows]
        reasons = [r for r in reasons if len(r) > 3]
        if reasons:
            return " / ".join(reasons[:2]), label

    # Origin은 항목/내용 2열 표라서 이유가 첫 칸이 아니라 둘째 칸에 있다.
    for row in parse_rows(read_section(content, "Origin")):
        if len(row) < 2:
            continue
        key = re.sub(r'[`*]', '', row[0]).strip().lower()
        value = re.sub(r'[`*]', '', row[1]).strip()
        if key in ("요구", "requirement", "해결할 문제", "problem") and len(value) > 3:
            if not value.lower().startswith(("n/a", "[todo")):
                return value, "요구"
    return "", ""


def normalize_path(raw: str) -> str:
    """표기 흔들림을 흡수한다. 라인 번호는 늘 밀리므로 파일 단위까지만 본다.

    언더스코어는 지우지 않는다. 마크다운 강조 문자이기도 하지만 파일명에 훨씬 흔해서,
    지우면 RELEASE_NOTES.md가 RELEASENOTES.md가 되어 조용히 틀린 경로를 만든다.
    """
    path = re.sub(r'[`*]', '', raw).strip()
    path = path.split('(')[0].strip()
    path = re.sub(r':\d+.*$', '', path)                    # Relay.cs:276 → Relay.cs
    # 접두어 `./`·`/`만 뗀다 — lstrip('./')는 `.github/ci.yml`을 `github/ci.yml`로 만들었다.
    path = re.sub(r'^(?:\.?/)+', '', path.replace(chr(92), '/'))
    # 글롭(codemap/*, tests/**)은 디렉터리 범위 기록이다. 슬래시를 남겨 경로로 인정한다.
    return path if path.endswith('/') else path.rstrip('/')


def split_paths(raw: str) -> list:
    """한 칸에 여러 파일이 적힌 기록을 나눈다.

    핸드오프에는 `README.md, README.ko.md`처럼 한 셀에 묶어 쓴 행이 많다.
    통째로 두면 경로로 인정되지 않아 변경 이력이 통째 사라진다.
    중괄호 확장({a,b})은 쪼개면 깨지므로 건드리지 않는다.
    """
    # 중괄호는 쪼개도 합쳐도 실재하지 않는 경로가 된다. 기록에 남은 것은
    # 잘린 형태({layout-base,cose-ba)까지 있어 복원이 불가능하므로 버린다.
    if '{' in raw or '}' in raw:
        return []
    candidate = normalize_path(raw)
    if looks_like_path(candidate):
        return [candidate]
    pieces = [normalize_path(p) for p in re.split(r'\s*,\s*|\s+/\s+', raw)]
    pieces = [p for p in pieces if looks_like_path(p)]
    return pieces


def looks_like_path(path: str) -> bool:
    return bool(path) and ('/' in path or '.' in path) and ' ' not in path.strip()


def is_noise(path: str) -> bool:
    lower = path.lower()
    return lower.startswith(NOISE_PREFIXES) or lower in NOISE_EXACT


def harvest(root: Path, include_memory: bool = False) -> dict:
    """핸드오프를 훑어 파일별 변경 이벤트를 모은다. 입력이 없으면 빈 결과를 돌려준다."""
    handoff_dir = root / "docs" / "handoffs"
    stats = {
        "handoff_dir": handoff_dir,
        "dir_exists": handoff_dir.is_dir(),
        "handoffs_total": 0,
        "handoffs_with_files": 0,
        "unreadable": [],
        "rows_skipped": 0,
        "why_sources": {},
        "lineage": defaultdict(list),
    }
    if not stats["dir_exists"]:
        return stats

    for path in sorted(handoff_dir.glob("*.md")):
        stats["handoffs_total"] += 1
        try:
            content = path.read_text(encoding="utf-8", errors="replace")
        except OSError as error:
            stats["unreadable"].append((path.name, str(error)))
            continue

        date_match = re.match(r'(\d{4}-\d{2}-\d{2})', path.name)
        date = date_match.group(1) if date_match else "????-??-??"

        # 그 세션의 "왜". 계획도 결정도 없으면 세션 주제로 내려간다.
        why, why_source = collect_reasons(content)
        if not why:
            why, why_source = extract_title(content, path.name), "주제"

        rows = parse_rows(read_section(content, "Files Modified", "Critical Files"))
        if rows:
            stats["handoffs_with_files"] += 1
        for cells in rows:
            file_paths = split_paths(cells[0])
            if not file_paths:
                stats["rows_skipped"] += 1
                continue
            what = re.sub(r'[`*]', '', cells[1]).strip() if len(cells) > 1 else ""
            for file_path in file_paths:
                if not include_memory and is_noise(file_path):
                    continue
                stats["why_sources"][why_source] = stats["why_sources"].get(why_source, 0) + 1
                stats["lineage"][file_path].append({
                    "date": date,
                    "handoff": path.name,
                    "what": what,
                    "why": why,
                    "why_source": why_source,
                })
    return stats


def render_events(path: str, events: list, root: Path) -> list:
    """한 파일의 계보를 시간순으로 출력한다. 실재하지 않으면 표시하되 이력은 지우지 않는다."""
    exists = (root / path).exists()
    flag = "" if exists else "   [MOVED?] 현재 이 경로에 파일이 없습니다"
    lines = ["■ {}  ({}회 변경){}".format(path, len(events), flag)]
    for event in sorted(events, key=lambda e: (e["date"], e["handoff"])):
        lines.append("  {}  변경: {}".format(event["date"], event["what"] or "(내용 미기재)"))
        # 이유의 출처를 숨기지 않는다. '주제'는 기록된 이유가 없어 세션 제목으로 대체한 것이다.
        source = event.get("why_source") or ""
        marker = "" if source in ("결정", "") else "[{} 추정] ".format(source)
        lines.append("              이유: {}{}".format(marker, event["why"] or "— (기록 없음)"))
        lines.append("              근거: docs/handoffs/{}".format(event["handoff"]))
    return lines


def build_report(stats: dict, root: Path, args) -> tuple:
    """출력 줄과 종료 코드를 만든다. 수확 0건은 실패가 아니라 정상 결과다."""
    out = []
    lineage = stats["lineage"]

    # 1. 핸드오프 자체가 없는 프로젝트 — 새 프로젝트이거나 mnemo 미도입.
    if not stats["dir_exists"]:
        out.append("[INFO] 핸드오프 디렉터리가 없습니다: {}".format(stats["handoff_dir"]))
        out.append("       계보를 만들 원천이 아직 없습니다. 이 프로젝트에서 첫 핸드오프를 만드세요:")
        out.append("       python scripts/create_handoff.py [task-slug]")
        return out, 0
    if stats["handoffs_total"] == 0:
        out.append("[INFO] {}에 핸드오프가 0개입니다.".format(stats["handoff_dir"]))
        out.append("       python scripts/create_handoff.py [task-slug] 로 첫 핸드오프를 만드세요.")
        return out, 0

    # 2. 특정 파일 조회 — 구현 착수 전 "이거 이미 있나 / 왜 이렇게 됐나" 확인용.
    if args.file:
        needle = normalize_path(args.file).lower()
        hits = {p: e for p, e in lineage.items() if needle in p.lower()}
        if not hits:
            out.append("[INFO] '{}'에 해당하는 변경 계보가 없습니다.".format(args.file))
            out.append("       핸드오프 {}개를 확인했습니다.".format(stats["handoffs_total"]))
            out.append("       신규 파일이거나, 기록 없이 변경된 파일입니다.")
            out.append("       구현 착수 전이라면 codemap과 glossary로 다른 이름을 한 번 더 확인하세요.")
            return out, 0     # '없음 확인'도 유효한 결과다. 게이트를 막지 않는다.
        out.append("[INFO] '{}' 관련 파일 {}개의 계보:".format(args.file, len(hits)))
        out.append("")
        for path, events in sorted(hits.items(), key=lambda kv: -len(kv[1])):
            out.extend(render_events(path, events, root))
            out.append("")
        return out, 0

    # 3. 전체 색인.
    if not lineage:
        out.append("[INFO] 핸드오프 {}개에서 수확한 파일이 0개입니다.".format(stats["handoffs_total"]))
        if stats["handoffs_with_files"] == 0:
            out.append("       'Files Modified' 섹션을 가진 핸드오프가 없습니다.")
            out.append("       템플릿 도입 이전 핸드오프이거나 섹션이 비어 있습니다.")
            out.append("       이후 핸드오프부터는 자동으로 계보가 쌓입니다.")
        else:
            out.append("       기억·문서 파일만 수확되어 제외됐습니다. --include-memory로 포함할 수 있습니다.")
        return out, 0

    multi = {p: e for p, e in lineage.items() if len(e) > 1}
    target = lineage if args.all else multi
    if not target:
        out.append("[INFO] 파일 {}개를 수확했지만 2회 이상 변경된 파일이 없습니다.".format(len(lineage)))
        out.append("       계보가 성립하려면 같은 파일이 여러 핸드오프에 등장해야 합니다.")
        out.append("       --all 로 1회 변경 파일까지 볼 수 있습니다.")
        return out, 0

    out.append("# 파일별 변경 계보 (자동 생성 — 직접 수정하지 마세요)")
    out.append("")
    out.append("원천: {}개 핸드오프 중 {}개에 변경 기록 존재".format(
        stats["handoffs_total"], stats["handoffs_with_files"]))
    out.append("수확: 고유 파일 {}개 / 계보 성립(2회 이상) {}개 / 출력 {}개".format(
        len(lineage), len(multi), min(len(target), args.limit)))
    if stats["unreadable"]:
        out.append("[WARN] 읽지 못한 핸드오프 {}개: {}".format(
            len(stats["unreadable"]), ", ".join(n for n, _ in stats["unreadable"][:3])))
    if stats["rows_skipped"]:
        out.append("[INFO] 경로로 보이지 않아 건너뛴 행 {}개".format(stats["rows_skipped"]))
    # 계획도 결정도 없는 변경이 얼마나 되는지 드러낸다. 숨기면 근거 공백이 조용히 남는다.
    sources = stats["why_sources"]
    total_events = sum(sources.values()) or 1
    guessed = total_events - sources.get("결정", 0)
    if guessed:
        out.append("[WARN] 이유가 결정으로 기록되지 않은 변경 {}건 ({}%) — 출처: {}".format(
            guessed, round(guessed * 100 / total_events),
            ", ".join("{} {}건".format(k or "없음", v)
                      for k, v in sorted(sources.items(), key=lambda kv: -kv[1]) if k != "결정")))
        out.append("       해당 항목은 '[<출처> 추정]'으로 표시됩니다. 근거로 쓰기 전에 핸드오프를 확인하세요.")
    out.append("")
    for path, events in sorted(target.items(), key=lambda kv: (-len(kv[1]), kv[0]))[:args.limit]:
        out.extend(render_events(path, events, root))
        out.append("")
    return out, 0


def main():
    parser = argparse.ArgumentParser(
        description="핸드오프에서 파일별 변경 계보를 수확한다 (읽기 전용 파생 색인)")
    parser.add_argument("--project-root", default=".", help="프로젝트 경로 (기본: 현재 디렉터리)")
    parser.add_argument("--file", help="이 경로 조각을 포함하는 파일의 계보만 조회")
    parser.add_argument("--out", help="결과를 파일로 저장 (기본: stdout, 아무것도 쓰지 않음)")
    parser.add_argument("--all", action="store_true", help="1회만 변경된 파일도 포함")
    parser.add_argument("--include-memory", action="store_true", help="memory/·docs/ 파일도 포함")
    parser.add_argument("--limit", type=int, default=40, help="출력할 파일 수 상한 (기본 40)")
    args = parser.parse_args()

    # 루트를 못 정하면 어디를 읽고 어디에 쓸지 알 수 없다. 유일하게 실패로 처리한다.
    try:
        root = detect_project_root(Path(args.project_root))
    except ValueError as error:
        print("[ERROR] 프로젝트 루트를 확인하지 못했습니다: {}".format(error))
        print("        Git 저장소가 아니거나 mnemo 마커가 없는 경로입니다.")
        print("        --project-root 로 Git 루트를 지정하거나, 실행에 필요한 Node.js를 확인하세요.")
        sys.exit(2)

    stats = harvest(root, include_memory=args.include_memory)
    lines, code = build_report(stats, root, args)
    text = "\n".join(lines)

    if args.out:
        out_path = Path(args.out)
        if not out_path.is_absolute():
            out_path = root / out_path
        try:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_text(text + "\n", encoding="utf-8")
        except OSError as error:
            print("[ERROR] 결과를 저장하지 못했습니다: {}".format(error))
            sys.exit(2)
        print("[INFO] 계보 색인을 저장했습니다: {}".format(out_path))
        print("       {}줄. 파생 산출물이므로 언제든 재생성할 수 있습니다.".format(len(lines)))
    else:
        print(text)

    sys.exit(code)


if __name__ == "__main__":
    main()
