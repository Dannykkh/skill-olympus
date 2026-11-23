#!/usr/bin/env python3
"""아틀라스 작업 장부 — 부품 지도 전체 정리에서 계산으로 되는 부분.

하는 일은 셋이다. 읽을 묶음을 나누고(plan), 작업자가 돌려준 근거 줄이 실제로 있는지
대조하고(check), 어디까지 했는지 적는다(status·mark).

부품별 파일 목록은 TermSnap이 낸 codemap/components/owners.json에서만 얻는다. 지도의 glob을
여기서 다시 풀지 않는다 — 규칙이 두 곳에 생기면 어긋나고, 판정의 정본은 TermSnap이다.
지도(component-map.json)는 고치지 않는다. 설명을 쓰고 지도를 병합하는 것은 메인 세션이다.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

COMPONENT_MAP = "codemap/component-map.json"
COMPONENT_OWNERS = "codemap/components/owners.json"
OWNERS_FORMAT = "termsnap-component-owners/"
# 장부와 결과는 지도와 같은 폴더에 둔다 — 지도와 함께 생기고 함께 사라져야 어긋나지 않는다.
# TermSnap의 codemap/reviews/ledger.json과 같은 자리 잡기다.
WORK_DIR = "codemap/atlas"
DEFAULT_NO_OPEN = (COMPONENT_MAP, "codemap/components/", WORK_DIR + "/", "memory/", "MEMORY.md",
                   "docs/handoffs/", "conversations/")
LEDGER = f"{WORK_DIR}/ledger.json"
LEDGER_FORMAT = "atlas-ledger/1"
CHECK_VERSION = 2  # 이전 check를 통과했지만 아직 병합하지 않은 결과는 새 규칙으로 대조한다.

# minimal: 바이트 수로 묶음 크기를 어림한다 — 묶음이 작업자 모델의 프롬프트 한도를 넘었다는
# 보고가 나오면 토큰 계산으로 바꾼다. 20만 바이트는 한글·코드가 섞인 글에서 대략 10만 토큰 아래다.
DEFAULT_MAX_BYTES = 200_000
DEFAULT_MAX_FILES = 30
MAX_CLAIMS = 5
CLOCK_SLACK = timedelta(seconds=2)
STATUSES = ("pending", "read", "checked", "needs-review", "merged", "skipped")
EVIDENCE = re.compile(r"^(?P<path>.+?):(?P<start>\d+)(?:-(?P<end>\d+))?$")


class AtlasError(Exception):
    """계속할 수 없는 상태. 메시지에 다음 행동을 적는다."""


def find_root(start: Path) -> Path:
    """가장 가까운 .git(폴더 또는 worktree 파일)이 있는 곳. 없으면 시작 폴더."""
    start = start.resolve()
    for candidate in (start, *start.parents):
        if (candidate / ".git").exists():
            return candidate
    return start


def load_owners(root: Path, allow_stale: bool = False) -> dict:
    """owners.json 계약을 읽는다. 묶음을 나눌 수 없는 상태면 이유와 다음 행동을 담아 멈춘다."""
    owners_file = root / COMPONENT_OWNERS
    if not owners_file.is_file():
        # 코드맵을 쓰지 않는 프로젝트와, 코드맵은 있는데 부품 산출물이 없는 프로젝트는 다음 행동이 다르다.
        if not (root / "codemap").is_dir():
            raise AtlasError("codemap/ 폴더가 없다 — TermSnap 코드맵을 쓰지 않는 프로젝트라 아틀라스가 할 일이 없다.")
        raise AtlasError(
            f"codemap/은 있는데 {COMPONENT_OWNERS}이 없다 — TermSnap이 부품 지도를 내지 않는 버전이거나 "
            "아직 생성 전이다. TermSnap을 갱신하거나 프로젝트를 다시 연 뒤 실행한다.")
    try:
        contract = json.loads(owners_file.read_text(encoding="utf-8-sig"))
        if not str(contract.get("format", "")).startswith(OWNERS_FORMAT):
            raise ValueError(contract.get("format"))
        generated = datetime.fromisoformat(str(contract["generatedAt"]))
        owners = contract.get("owners") or {}
        if not isinstance(owners, dict):
            raise ValueError("owners")
    except (OSError, UnicodeError, ValueError, KeyError, AttributeError, TypeError) as error:
        raise AtlasError(f"{COMPONENT_OWNERS}의 형식을 읽지 못함({error}) — TermSnap에서 다시 생성한다.")
    source_map = root / COMPONENT_MAP
    regenerate = "MCP codemap_component_map을 호출하거나 TermSnap에서 프로젝트를 다시 연 뒤 실행한다"
    if contract.get("mapExists") is False:
        # 지도 없이 만든 스텁에는 부품별 파일이 없다. 지도 유무에 따라 다음 행동이 다르다.
        if source_map.is_file():
            raise AtlasError(f"지도는 있는데 산출물이 지도 없이 만든 스텁이다 — {regenerate}.")
        raise AtlasError(f"지도가 아직 없다 — 뼈대(부품과 범위)를 먼저 쓰고, {regenerate}.")
    if generated.tzinfo is None:
        generated = generated.astimezone()
    if source_map.is_file() and not allow_stale:
        saved = datetime.fromtimestamp(source_map.stat().st_mtime, timezone.utc)
        if saved > generated + CLOCK_SLACK:
            raise AtlasError(
                "산출물이 지도보다 오래됨 — 지도를 고친 뒤 TermSnap이 다시 생성하지 않았다. "
                f"{regenerate} (파일 목록이 낡아도 괜찮으면 --allow-stale).")
    return contract


def _selected(component: str, names: list[str]) -> bool:
    return any(component == name or component.startswith(name + ".") for name in names)


def _closed_paths(root: Path, extra: list[str]) -> set[Path]:
    paths = {Path(os.path.abspath(root / name.replace("\\", "/"))) for name in (*DEFAULT_NO_OPEN, *extra)}
    return paths | {path.resolve() for path in paths}


def _is_closed(path: Path, closed: set[Path]) -> bool:
    for candidate in (path, path.resolve()):
        if candidate in closed or any(parent in closed for parent in candidate.parents):
            return True
    return False


def _is_binary(path: Path) -> bool:
    with path.open("rb") as handle:
        return b"\0" in handle.read(4096)


def _digest(root: Path, files: list[str]) -> str:
    """묶음의 내용 지문. 파일이 바뀌면 달라져서 다시 읽을 묶음을 가려낸다."""
    total = hashlib.sha1()
    for name in files:
        total.update(f"{name}\t{hashlib.sha1((root / name).read_bytes()).hexdigest()}\n".encode("utf-8"))
    return total.hexdigest()


def _slug(batch_id: str) -> str:
    return re.sub(r"[^A-Za-z0-9._-]+", "_", batch_id)


def read_ledger(root: Path) -> dict:
    ledger_file = root / LEDGER
    if not ledger_file.is_file():
        return {"format": LEDGER_FORMAT, "batches": []}
    try:
        ledger = json.loads(ledger_file.read_text(encoding="utf-8-sig"))
        if ledger.get("format") != LEDGER_FORMAT or not isinstance(ledger.get("batches"), list):
            raise ValueError(ledger.get("format"))
    except (OSError, UnicodeError, ValueError, AttributeError) as error:
        raise AtlasError(f"{LEDGER}를 읽지 못함({error}) — 파일을 옮겨 두고 plan을 다시 실행한다.")
    for batch in ledger["batches"]:
        prior_check = batch.get("checked")
        if (batch.get("status") == "checked" and isinstance(prior_check, dict)
                and prior_check.get("version") != CHECK_VERSION):
            batch["status"] = "read"
    return ledger


def write_ledger(root: Path, ledger: dict) -> None:
    ledger_file = root / LEDGER
    ledger_file.parent.mkdir(parents=True, exist_ok=True)
    temporary = ledger_file.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(ledger, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    os.replace(temporary, ledger_file)


def _file_hash(path: Path) -> str | None:
    return hashlib.sha1(path.read_bytes()).hexdigest() if path.is_file() else None


def _citations_changed(root: Path, batch: dict, closed: set[Path]) -> bool:
    return any(_is_closed(root / name, closed) or _file_hash(root / name) != seen
               for name, seen in (batch.get("cited") or {}).items())


def plan(root: Path, only: list[str] | None = None, skip: list[str] | None = None,
         max_bytes: int | None = None, max_files: int | None = None,
         allow_stale: bool = False, no_open: list[str] | None = None, reset: bool = False) -> dict:
    """owners.json의 부품별 파일을 묶음으로 나눠 장부에 적는다.

    다시 실행해도 안전하다. 범위(only·skip·열지 않을 곳)와 상한은 장부에 남아, 인자 없이 다시 부르면
    지난 것을 그대로 쓴다 — 이어서 할 때 범위가 풀려 건너뛴 부품까지 읽히는 일을 막는다.
    내용이 그대로인 묶음은 상태를 지키고, 파일 구성이나 내용이 바뀐 묶음만 pending으로 되돌린다.
    """
    contract = load_owners(root, allow_stale)
    by_component: dict[str, list[str]] = {}
    for raw, component in contract.get("owners", {}).items():
        by_component.setdefault(str(component), []).append(str(raw).replace("\\", "/"))

    old_ledger = read_ledger(root)
    stored = {} if reset else (old_ledger.get("selection") or {})
    limits = {} if reset else (old_ledger.get("limits") or {})
    given = any(value for value in (only, skip, no_open))
    only = only if only else list(stored.get("only") or [])
    skip = skip if skip else list(stored.get("skip") or [])
    no_open = no_open if no_open else list(stored.get("noOpen") or [])
    closed = _closed_paths(root, no_open)
    max_bytes = max_bytes or int(limits.get("maxBytes") or DEFAULT_MAX_BYTES)
    max_files = max_files or int(limits.get("maxFiles") or DEFAULT_MAX_FILES)

    previous = {batch["id"]: batch for batch in old_ledger["batches"]}
    batches, notes = [], {"missing": [], "binary": [], "changed": [], "recheck": [],
                          "reused": bool(not given and (only or skip or no_open))}
    for component in sorted(by_component):
        if only and not _selected(component, only):
            continue
        if skip and _selected(component, skip):
            continue
        groups, current, size = [], [], 0
        for name in sorted(by_component[component]):
            path = root / name
            if _is_closed(path, closed):
                continue
            if not path.is_file():
                notes["missing"].append(name)
                continue
            if _is_binary(path):
                notes["binary"].append(name)
                continue
            length = path.stat().st_size
            # 폴더 순서대로 채워서 같은 폴더 파일이 한 묶음에 모이게 한다.
            if current and (size + length > max_bytes or len(current) >= max_files):
                groups.append((current, size))
                current, size = [], 0
            current.append(name)
            size += length
        if current:
            groups.append((current, size))
        for number, (files, size) in enumerate(groups, 1):
            batch_id = f"{component}#{number}"
            batch = {"id": batch_id, "component": component, "files": files, "bytes": size,
                     "digest": _digest(root, files), "status": "pending",
                     "result": f"{WORK_DIR}/results/{_slug(batch_id)}.json"}
            if size > max_bytes:
                batch["oversize"] = True  # 파일 하나가 상한보다 크다 — 나눠 읽으라고 작업자에게 알린다.
            old = previous.get(batch_id)
            if old and old.get("digest") == batch["digest"]:
                for key in ("status", "checked", "cited"):
                    if key in old:
                        batch[key] = old[key]
                # 묶음 밖의 파일을 근거로 인용했는데 그 파일이 바뀌었으면, 줄 번호는 맞아도 내용이 다르다.
                # 아직 지도에 넣지 않은 묶음은 다시 대조하게 한다.
                if batch["status"] in ("checked", "needs-review") and _citations_changed(root, batch, closed):
                    batch["status"] = "read"
                    notes["recheck"].append(batch_id)
            elif old and old.get("status") not in (None, "pending"):
                notes["changed"].append(batch_id)
            batches.append(batch)

    ledger = {"format": LEDGER_FORMAT, "plannedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
              "ownersGeneratedAt": contract.get("generatedAt"),
              "selection": {"only": only, "skip": skip, "noOpen": no_open},
              "limits": {"maxBytes": max_bytes, "maxFiles": max_files},
              "mapErrors": int((contract.get("status") or {}).get("errors", 0) or 0),
              "uncovered": len(contract.get("uncovered") or []), "batches": batches}
    write_ledger(root, ledger)
    ledger["notes"] = notes
    return ledger


def _batch(ledger: dict, batch_id: str) -> dict:
    for batch in ledger["batches"]:
        if batch["id"] == batch_id:
            return batch
    raise AtlasError(f"장부에 '{batch_id}' 묶음이 없다 — status로 묶음 이름을 확인한다.")


def _verify_batch(root: Path, batch: dict, closed: set[Path]) -> None:
    for name in batch["files"]:
        if _is_closed(root / name, closed):
            raise AtlasError(f"열람 금지 경로가 묶음에 있다({name}) — plan --no-open으로 범위를 다시 정한다.")
    try:
        digest = _digest(root, batch["files"])
    except OSError as error:
        raise AtlasError(f"묶음 파일을 읽을 수 없다({error}) — 파일을 확인하고 plan을 다시 실행한다.") from error
    if digest != batch["digest"]:
        raise AtlasError("묶음 파일이 계획 이후 바뀌었다 — plan을 다시 실행한 뒤 새 brief로 읽는다.")


def mark(root: Path, batch_id: str, status: str) -> dict:
    if status not in STATUSES:
        raise AtlasError(f"상태는 {', '.join(STATUSES)} 중 하나다.")
    ledger = read_ledger(root)
    batch = _batch(ledger, batch_id)
    if status == "merged" and batch["status"] != "merged":
        closed = _closed_paths(root, (ledger.get("selection") or {}).get("noOpen") or [])
        _verify_batch(root, batch, closed)
        if batch["status"] == "read" or _citations_changed(root, batch, closed):
            raise AtlasError(f"{batch_id}의 근거를 다시 확인해야 한다 — check에 묶음 이름을 주어 대조한다.")
    batch["status"] = status
    write_ledger(root, ledger)
    return batch


BRIEF_FILE = "references/reader-brief.md"
BRIEF_BLOCK = re.compile(r"<!-- BRIEF_START -->\s*```text\r?\n(.*?)\r?\n```\s*<!-- BRIEF_END -->", re.S)


def brief(root: Path, batch_id: str, no_open: list[str] | None = None) -> str:
    """읽기 작업자에게 그대로 줄 지시문. 틀은 reader-brief.md 한 곳에만 있고 여기서 묶음 값으로 채운다.

    손으로 채우면 경로를 절대로 쓸지, 파일 목록을 어떻게 적을지가 실행마다 달라진다.
    """
    ledger = read_ledger(root)
    batch = _batch(ledger, batch_id)
    template_file = Path(__file__).resolve().parents[1] / BRIEF_FILE
    try:
        block = BRIEF_BLOCK.search(template_file.read_text(encoding="utf-8-sig"))
    except OSError as error:
        raise AtlasError(f"{BRIEF_FILE}를 읽지 못함({error}) — 스킬을 다시 설치한다.")
    if not block:
        raise AtlasError(f"{BRIEF_FILE}에 지시 틀 구간(BRIEF_START~BRIEF_END)이 없다 — 스킬을 다시 설치한다.")
    notes = []
    siblings = sum(1 for other in ledger["batches"] if other["component"] == batch["component"])
    if siblings > 1:
        notes.append(f"- 이 부품은 묶음 {siblings}개로 나뉘어 있고 이것은 그중 하나입니다. "
                     "책임 문장은 이 묶음의 파일이 맡는 몫을 씁니다.")
    if batch.get("oversize"):
        notes.append("- 상한보다 큰 파일이 있습니다. 여러 번에 나눠 끝까지 읽습니다.")
    saved = (ledger.get("selection") or {}).get("noOpen") or []
    extra = [*saved, *(no_open or [])]
    _verify_batch(root, batch, _closed_paths(root, extra))
    values = {
        "<<ROOT>>": str(root),
        "<<RESULT>>": str(root / batch["result"]),
        "<<COMPONENT>>": batch["component"],
        "<<BATCH>>": batch["id"],
        "<<DIGEST>>": batch["digest"],
        "<<FILES>>": "\n".join(f"  - `{name}`" for name in batch["files"]),
        "<<NOTES>>": "\n".join(notes),
        "<<NO_OPEN>>": ", ".join(f"`{path}`" for path in dict.fromkeys((*DEFAULT_NO_OPEN, *extra))),
    }
    text = block.group(1)
    for token, value in values.items():
        text = text.replace(token, value)
    # 채울 것이 없어 빈 줄만 남은 자리를 정리한다.
    return re.sub(r"\n{3,}", "\n\n", text).strip() + "\n"


def _cite(root: Path, raw, cache: dict, closed: set[Path]) -> tuple[str, str]:
    """근거 하나를 실제 파일에서 꺼낸다. (보여 줄 줄, 판정) — 판정은 ok·weak·bad."""
    match = EVIDENCE.match(str(raw).strip().replace("\\", "/"))
    if not match:
        return f"{raw} | (줄 번호 없음)", "weak"
    name, start = match["path"], int(match["start"])
    end = int(match["end"] or start)
    resolved_root = root.resolve()
    target = (root / name).resolve()
    if resolved_root != target and resolved_root not in target.parents:
        return f"{raw} | !! 프로젝트 밖 경로", "bad"
    if _is_closed(root / name, closed):
        return f"{raw} | !! 열람 금지 경로", "bad"
    if name not in cache:
        cache[name] = (target.read_text(encoding="utf-8-sig", errors="replace").splitlines()
                       if target.is_file() else None)
    content = cache[name]
    if content is None:
        return f"{raw} | !! 파일 없음", "bad"
    if start < 1 or end < start or end > len(content):
        return f"{raw} | !! 줄 범위 밖(파일은 {len(content)}줄)", "bad"
    text = next((line.strip() for line in content[start - 1:end] if line.strip()), "")
    return f"{raw} | {text[:140]}", "ok"


def _listed(entries) -> set[str]:
    """'install.bat (64-69행)'처럼 설명이 붙은 항목에서 경로만 꺼낸다."""
    found = set()
    for entry in entries if isinstance(entries, list) else []:
        text = str(entry).strip().replace("\\", "/")
        found.add(re.split(r"\s+[(（]", text, 1)[0].strip().casefold())
    return found


def check_result(root: Path, batch: dict, result: dict, no_open: list[str] | None = None) -> dict:
    """작업자 결과의 형식과 근거 줄을 실제 파일과 대조한다.

    주장이 옳은지는 판정하지 않는다. 인용한 줄을 꺼내 주장 옆에 보여 주고, 없는 파일·범위 밖 줄처럼
    읽지 않고도 틀렸다고 말할 수 있는 것만 가려낸다. 나머지 판단은 메인 세션이 한다.
    """
    problems, warnings, shown = [], [], []
    closed = _closed_paths(root, no_open or [])
    try:
        _verify_batch(root, batch, closed)
    except AtlasError as error:
        return {"ok": False, "summary": {"claims": 0, "citations": 0, "bad": 0, "problems": 1,
                                         "readFully": 0, "files": len(batch["files"]), "defects": 0},
                "problems": [str(error)], "warnings": [], "claims": [], "defects": [], "citedFiles": []}
    # 지시문에 실어 보낸 지문이 그대로 돌아와야 한다. 다르면 파일이 바뀌기 전에 읽은 옛 결과다 —
    # 다시 읽을 묶음에 옛 결과 파일이 남아 있을 때 그것이 통과하는 일을 막는다.
    if str(result.get("digest", "")).strip() != batch["digest"]:
        problems.append("결과의 digest가 이 묶음의 지금 내용과 다르다 — 파일이 바뀌기 전에 읽은 결과이니 다시 맡긴다")
    if not str(result.get("responsibility", "")).strip():
        problems.append("responsibility가 비어 있다")
    claims = result.get("co_changes")
    if not isinstance(claims, list):
        problems.append("co_changes가 목록이 아니다")
        claims = []
    if len(claims) > MAX_CLAIMS:
        warnings.append(f"함께 고칠 것 {len(claims)}건 — 중요도 순 {MAX_CLAIMS}건까지만 받는다")

    cache: dict[str, list[str] | None] = {}
    cited = bad = 0
    for index, claim in enumerate(claims, 1):
        if not isinstance(claim, dict) or not str(claim.get("claim", "")).strip():
            problems.append(f"{index}번 항목에 claim이 없다")
            continue
        confidence = claim.get("confidence")
        if confidence not in ("verified", "inferred"):
            problems.append(f"{index}번 항목의 confidence가 verified·inferred가 아니다")
        evidence = claim.get("evidence") if isinstance(claim.get("evidence"), list) else []
        if not evidence:
            problems.append(f"{index}번 항목에 근거가 없다")
        elif confidence == "verified" and len(evidence) < 2:
            warnings.append(f"{index}번 항목은 verified인데 근거가 한 곳이다")
        lines = []
        for raw in evidence:
            cited += 1
            line, verdict = _cite(root, raw, cache, closed)
            lines.append(line)
            if verdict == "bad":
                bad += 1
            elif verdict == "weak":
                warnings.append(f"{index}번 항목의 근거 '{raw}'에 줄 번호가 없다")
        shown.append({"claim": str(claim.get("claim", "")).strip(), "confidence": confidence, "evidence": lines})

    # 결함 후보는 지도에 들어가지 않고 보고에만 쓰인다. 그래도 근거 줄은 같은 방식으로 대조한다.
    defects = []
    candidates = result.get("defect_candidates", [])
    if not isinstance(candidates, list):
        problems.append("defect_candidates가 목록이 아니다")
        candidates = []
    for candidate in candidates:
        if not isinstance(candidate, dict):
            problems.append("결함 후보에 note와 evidence를 담은 객체가 필요하다")
            continue
        if not str(candidate.get("note", "")).strip():
            continue
        lines = []
        evidence = candidate.get("evidence")
        if not isinstance(evidence, list) or not evidence:
            problems.append(f"결함 후보 '{candidate['note']}'에 근거 줄이 없다")
            evidence = []
        for raw in evidence:
            cited += 1
            line, verdict = _cite(root, raw, cache, closed)
            lines.append(line)
            if verdict == "weak":
                problems.append(f"결함 후보 '{candidate['note']}'의 근거 '{raw}'에 줄 번호가 없다")
            bad += verdict == "bad"
        defects.append({"note": str(candidate["note"]).strip(), "evidence": lines})

    reported = (_listed(result.get("files_read_fully")) | _listed(result.get("files_read_partly"))
                | _listed(result.get("files_not_opened")))
    files = [name.casefold() for name in batch["files"]]
    unreported = [name for name in batch["files"] if name.casefold() not in reported]
    if unreported:
        warnings.append(f"읽었는지 밝히지 않은 파일 {len(unreported)}개: {', '.join(unreported[:5])}")
    fully = len(_listed(result.get("files_read_fully")) & set(files))

    summary = {"claims": len(claims), "citations": cited, "bad": bad, "problems": len(problems),
               "readFully": fully, "files": len(files), "defects": len(defects)}
    return {"ok": not problems and not bad, "summary": summary, "problems": problems,
            "warnings": warnings, "claims": shown, "defects": defects,
            "citedFiles": sorted(name for name, content in cache.items() if content is not None)}


def check(root: Path, batch_id: str) -> dict:
    ledger = read_ledger(root)
    batch = _batch(ledger, batch_id)
    result_file = root / batch["result"]
    if not result_file.is_file():
        raise AtlasError(f"{batch['result']} 없음 — 작업자가 결과를 아직 쓰지 않았다.")
    try:
        result = json.loads(result_file.read_text(encoding="utf-8-sig"))
        if not isinstance(result, dict):
            raise ValueError("객체가 아니다")
    except (OSError, UnicodeError, ValueError) as error:
        report = {"ok": False, "summary": {"problems": 1}, "problems": [f"결과 JSON을 읽지 못함({error})"],
                  "warnings": [], "claims": [], "defects": []}
    else:
        report = check_result(root, batch, result, (ledger.get("selection") or {}).get("noOpen"))
    batch["status"] = "checked" if report["ok"] else "needs-review"
    batch["checked"] = {**report["summary"], "version": CHECK_VERSION}
    # 인용한 파일의 지문을 남겨, 병합 전에 그 파일이 바뀌면 plan이 다시 대조하게 한다.
    batch["cited"] = {name: _file_hash(root / name) for name in report.get("citedFiles", [])}
    write_ledger(root, ledger)
    report["id"] = batch_id
    return report


def _print_plan(ledger: dict) -> None:
    rows: dict[str, list[dict]] = {}
    for batch in ledger["batches"]:
        rows.setdefault(batch["component"], []).append(batch)
    print(f"부품 {len(rows)}개 · 묶음 {len(ledger['batches'])}개 · 전체 미분류 {ledger['uncovered']}"
          f" · 지도 오류 {ledger['mapErrors']}")
    for component, batches in rows.items():
        files = sum(len(batch["files"]) for batch in batches)
        size = sum(batch["bytes"] for batch in batches)
        states = ",".join(sorted({batch["status"] for batch in batches}))
        mark_ = " [상한보다 큰 파일]" if any(batch.get("oversize") for batch in batches) else ""
        print(f"  {size / 1024:8.0f} KB {files:4}파일 묶음 {len(batches):2}  {states:12} {component}{mark_}")
    notes = ledger.get("notes") or {}
    selection = ledger.get("selection") or {}
    parts = [f"{label} {', '.join(selection[key])}" for key, label in
             (("only", "깊게 읽기"), ("skip", "건너뛰기"), ("noOpen", "열지 않을 곳")) if selection.get(key)]
    if parts:
        reused = " (지난 범위를 그대로 씀 — 처음부터 다시 정하려면 --all)" if notes.get("reused") else ""
        print("범위: " + " · ".join(parts) + reused)
    if notes.get("changed"):
        print(f"파일이 바뀌어 다시 읽을 묶음: {', '.join(notes['changed'])}")
    if notes.get("recheck"):
        print(f"근거로 인용한 파일이 바뀌어 다시 대조할 묶음: {', '.join(notes['recheck'])}")
    if notes.get("missing"):
        print(f"산출물에는 있으나 지금 없는 파일 {len(notes['missing'])}개 — 다시 생성이 필요할 수 있다")
    if notes.get("binary"):
        print(f"바이너리로 보여 뺀 파일 {len(notes['binary'])}개")
    if ledger["mapErrors"]:
        print("지도 오류가 남아 있다 — codemap/components/index.md를 읽고 뼈대부터 고친다")


def _print_check(report: dict) -> None:
    summary = report["summary"]
    print(f"[{'OK' if report['ok'] else '확인 필요'}] {report['id']} — 주장 {summary.get('claims', 0)}"
          f" · 근거 {summary.get('citations', 0)} · 틀린 근거 {summary.get('bad', 0)}"
          f" · 끝까지 읽은 파일 {summary.get('readFully', 0)}/{summary.get('files', 0)}")
    for problem in report["problems"]:
        print(f"  !! {problem}")
    for warning in report["warnings"]:
        print(f"  주의: {warning}")
    for number, claim in enumerate(report["claims"], 1):
        print(f"  {number}. [{claim['confidence']}] {claim['claim']}")
        for line in claim["evidence"]:
            print(f"       {line}")
    for defect in report["defects"]:
        print(f"  결함 후보: {defect['note']}")
        for line in defect["evidence"]:
            print(f"       {line}")


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="Atlas work ledger: plan reading batches, check cited evidence")
    parser.add_argument("--project-root", help="프로젝트 루트(기본: 현재 폴더에서 가장 가까운 Git 루트)")
    commands = parser.add_subparsers(dest="command", required=True)
    planner = commands.add_parser("plan", help="owners.json에서 읽을 묶음을 나눠 장부에 적는다")
    planner.add_argument("--only", nargs="*", default=[], help="이 부품(과 그 아래)만")
    planner.add_argument("--skip", nargs="*", default=[], help="이 부품(과 그 아래)은 뺀다")
    planner.add_argument("--no-open", nargs="*", default=[], help="작업자가 열지 않을 경로(장부에 남는다)")
    planner.add_argument("--all", action="store_true", dest="reset", help="장부에 남은 범위와 상한을 버리고 다시 정한다")
    planner.add_argument("--max-bytes", type=int, help=f"묶음 상한 바이트(기본 {DEFAULT_MAX_BYTES})")
    planner.add_argument("--max-files", type=int, help=f"묶음 상한 파일 수(기본 {DEFAULT_MAX_FILES})")
    planner.add_argument("--allow-stale", action="store_true", help="산출물이 지도보다 오래돼도 진행")
    commands.add_parser("status", help="장부의 묶음별 상태")
    checker = commands.add_parser("check", help="작업자 결과의 근거 줄을 실제 파일과 대조한다")
    checker.add_argument("batch", nargs="*", help="묶음 이름(생략하면 결과 파일이 있는 read 묶음 전부)")
    briefer = commands.add_parser("brief", help="읽기 작업자에게 줄 지시문을 묶음 값으로 채워 출력한다")
    briefer.add_argument("batch")
    briefer.add_argument("--no-open", nargs="*", default=[], help="작업자가 열지 않을 경로를 더한다")
    marker = commands.add_parser("mark", help="묶음 상태를 적는다")
    marker.add_argument("batch")
    marker.add_argument("status", choices=STATUSES)
    args = parser.parse_args(argv)

    root = Path(args.project_root).resolve() if args.project_root else find_root(Path.cwd())
    try:
        if args.command == "plan":
            _print_plan(plan(root, args.only, args.skip, args.max_bytes, args.max_files, args.allow_stale,
                             args.no_open, args.reset))
            print(f"장부: {LEDGER}")
            return 0
        if args.command == "status":
            ledger = read_ledger(root)
            counts: dict[str, int] = {}
            for batch in ledger["batches"]:
                counts[batch["status"]] = counts.get(batch["status"], 0) + 1
                print(f"  {batch['status']:12} {len(batch['files']):3}파일 {batch['bytes'] / 1024:7.0f} KB  {batch['id']}")
            print("합계: " + (", ".join(f"{name} {count}" for name, count in sorted(counts.items())) or "묶음 없음"))
            return 0
        if args.command == "brief":
            print(brief(root, args.batch, args.no_open), end="")
            return 0
        if args.command == "mark":
            batch = mark(root, args.batch, args.status)
            print(f"{batch['id']} → {batch['status']}")
            return 0
        # 이름이 없으면 결과 파일이 있고 아직 통과하지 않은 묶음 전부 — 다시 맡겨 덮어쓴 결과도 여기 걸린다.
        targets = args.batch or [batch["id"] for batch in read_ledger(root)["batches"]
                                 if batch["status"] in ("pending", "read", "needs-review")
                                 and (root / batch["result"]).is_file()]
        if not targets:
            print("대조할 결과가 없다 — 작업자가 결과 파일을 쓴 묶음이 없다.")
            return 0
        reports = [check(root, target) for target in targets]
        for report in reports:
            _print_check(report)
        return 0 if all(report["ok"] for report in reports) else 1
    except AtlasError as error:
        print(f"중단: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
