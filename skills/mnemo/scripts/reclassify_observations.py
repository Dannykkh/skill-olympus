#!/usr/bin/env python3
"""
Move wrongly-filed observations from memory/gotchas/ to memory/learned/.

The old hook decided "this tool call failed" by looking for the word error/fail
anywhere in the output. Edit and Write responses echo the edited source, and Bash
output carries whatever cat/sed printed, so a successful edit touching a `Failed(`
call or an `{Info, Warning, Error}` enum could be filed as a failure.

Those observations are the input to memory distillation, so leaving them in place
keeps producing gotchas that never happened. The hook is fixed going forward; this
repairs what was already written.

Scope is ONE PROJECT — observations live in <project>/memory/, never in ~/.claude.

Nothing is moved without --apply, and --apply always writes a backup first.

Usage:
    python reclassify_observations.py                       # dry-run (기본)
    python reclassify_observations.py --apply
    python reclassify_observations.py --project-root <path> --apply
"""

import argparse
import json
import re
import sys
from collections import Counter
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

# Historical records have less evidence than live hook envelopes. Absence of a
# known error string is not evidence of success; ambiguous records stay put.
ERROR_SHAPE = re.compile(
    r'(?im)^\s*(?:'
    r'(?:fatal|error|err)\s*:|'
    r'Traceback \(most recent call last\)|'
    r'[A-Za-z_.]*(?:Error|Exception)\s*:|'
    r'(?:bash|sh|cmd|zsh)?:?[^\n]{0,40}(?:command not found|No such file or directory|Permission denied)|'
    r'ENOENT|ERR_[A-Z_]+|npm ERR!|error TS\d+|error CS\d+'
    r'|Operation failed\b|Command exited with code [1-9]\d*\b|FAILED\s+\S+'
    r')')


def is_real_failure(record: dict) -> bool:
    """Compatibility name: True means retain (failure OR insufficient evidence)."""
    if not isinstance(record, dict):
        return True
    if record.get("event") != "tool_error":
        return True                      # turn_error 등 다른 이벤트는 건드리지 않는다
    if not isinstance(record.get("tool"), str):
        return True                      # malformed metadata is not migration evidence
    output = record.get("output")
    envelopes = [record]
    if isinstance(output, dict):
        envelopes.append(output)
    elif isinstance(output, str):
        try:
            parsed = json.loads(output)
        except (json.JSONDecodeError, ValueError):
            parsed = None
        if isinstance(parsed, dict):
            envelopes.append(parsed)
    success = False
    for envelope in envelopes:
        for key in ("is_error", "isError"):
            if envelope.get(key) is True:
                return True
            if envelope.get(key) is False:
                success = True
        for key in ("exit_code", "exitCode", "returncode"):
            value = envelope.get(key)
            if type(value) is int:
                if value != 0:
                    return True
                success = True
        if envelope.get("interrupted") is True:
            return True
    if isinstance(output, str) and ERROR_SHAPE.search(output):
        return True
    if success:
        return False
    # Only an entire, known tool acknowledgement counts as textual success.
    # Echoed source, arbitrary stdout and missing output never qualify.
    if isinstance(output, str) and record.get("tool") in {"Edit", "Write"}:
        acknowledgement = (
            r'File (?:created|updated) successfully at: [^\r\n]+'
            r'|The file [^\r\n]+ has been updated successfully\.'
        )
        if re.fullmatch(acknowledgement, output.strip()):
            return False
    return True


def split_observations(path: Path) -> tuple:
    """옮길 줄과 남길 줄을 가른다. 파싱 못 한 줄은 손대지 않고 남긴다."""
    keep, move, unparsed = [], [], 0
    if not path.is_file():
        return keep, move, unparsed
    for line in path.read_bytes().splitlines(keepends=True):
        if not line.strip():
            keep.append(line)
            continue
        try:
            record = json.loads(line)
        except (json.JSONDecodeError, ValueError, UnicodeDecodeError):
            unparsed += 1
            keep.append(line)            # 판단할 수 없으면 그대로 둔다
            continue
        if not isinstance(record, dict):
            unparsed += 1
            keep.append(line)
            continue
        if is_real_failure(record):
            keep.append(line)
        else:
            record["event"] = "tool_success"
            # 되돌릴 수 있도록 어디서 왔는지 남긴다.
            record["reclassified_from"] = "tool_error"
            move.append(json.dumps(record, ensure_ascii=False))
    return keep, move, unparsed


def read_offset(path: Path) -> list:
    """'<gotchas줄수> <learned줄수> <기준시각>' 형식. delta 임계 판정의 기준값이다."""
    try:
        parts = path.read_text(encoding="utf-8", errors="replace").split()
        return [int(parts[0]), int(parts[1]), int(parts[2])] if len(parts) >= 3 else None
    except (OSError, ValueError):
        return None


def main():
    parser = argparse.ArgumentParser(
        description="오분류된 tool_error 관찰을 learned로 옮긴다 (프로젝트 단위)")
    parser.add_argument("--project-root", default=".", help="프로젝트 경로 (기본: 현재 디렉터리)")
    parser.add_argument("--apply", action="store_true",
                        help="실제로 옮긴다. 없으면 dry-run으로 미리보기만 한다")
    args = parser.parse_args()

    try:
        root = detect_project_root(Path(args.project_root))
    except ValueError as error:
        print(f"[ERROR] 프로젝트 루트를 확인하지 못했습니다: {error}")
        sys.exit(2)

    gotchas = root / "memory" / "gotchas" / "observations.jsonl"
    learned = root / "memory" / "learned" / "observations.jsonl"

    if not gotchas.is_file():
        print(f"[INFO] 관찰 로그가 없습니다: {gotchas}")
        print("       이 프로젝트에는 옮길 것이 없습니다.")
        sys.exit(0)

    keep, move, unparsed = split_observations(gotchas)
    tools = Counter(json.loads(line).get("tool") or "?" for line in move)

    print(f"[INFO] 프로젝트: {root}")
    retained_count = sum(bool(line.strip()) for line in keep)
    print(f"       gotchas 관찰 {retained_count + len(move)}줄")
    print(f"       남길 것(실패 또는 근거 부족) {retained_count}줄 / 옮길 것 {len(move)}줄")
    if unparsed:
        print(f"       파싱 못 해 그대로 두는 줄 {unparsed}줄")
    if tools:
        print(f"       도구별: {', '.join(f'{t} {n}' for t, n in tools.most_common(6))}")

    if not move:
        print("\n[PASS] 성공 근거가 확인된 이동 대상이 없습니다. 남은 관찰의 정확성을 보증하지 않습니다.")
        sys.exit(0)

    if not args.apply:
        print("\n[DRY-RUN] 아무것도 바꾸지 않았습니다. 실제로 옮기려면 --apply 를 붙이세요.")
        print("          --apply 는 옮기기 전에 두 파일의 백업을 만듭니다.")
        sys.exit(0)

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    # 백업은 *.jsonl 이 아닌 이름으로 둔다. 수확·정제가 다시 읽으면 안 된다.
    backups = []
    for source in (gotchas, learned):
        if source.is_file():
            backup = source.with_name(f"{source.name}.bak-{stamp}")
            backup.write_bytes(source.read_bytes())
            backups.append(backup)

    # learned 에는 append 한다. 기존 내용은 바이트 그대로 보존된다.
    learned.parent.mkdir(parents=True, exist_ok=True)
    existing = learned.read_bytes() if learned.is_file() else b""
    with learned.open("ab") as handle:
        if existing and not existing.endswith((b"\n", b"\r")):
            handle.write(b"\n")
        for line in move:
            handle.write((line + "\n").encode("utf-8"))

    gotchas.write_bytes(b"".join(keep))

    # 정제 임계는 두 파일 증가분의 '합'으로 계산되므로 이동은 본래 합을 바꾸지 않는다.
    # 그래도 파일별 기준값을 같이 옮겨 각 숫자가 실제 줄 수와 맞게 유지한다.
    offset_path = root / "memory" / ".mnemo-distill-offset"
    offset = read_offset(offset_path)
    if offset:
        offset[0] -= len(move)
        offset[1] = offset[1] + len(move)
        offset_path.write_text(" ".join(str(v) for v in offset), encoding="utf-8")
        print(f"\n[INFO] distill 기준값 보정: gotchas -{len(move)} / learned +{len(move)} (합 불변)")

    print(f"\n[DONE] {len(move)}줄을 learned로 옮겼습니다.")
    for backup in backups:
        print(f"       백업: {backup.relative_to(root).as_posix()}")
    print("       되돌리려면 백업을 원래 이름으로 복사하면 됩니다.")
    sys.exit(0)


if __name__ == "__main__":
    main()
