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
import os
import re
import sys
from collections import Counter
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from tempfile import mkstemp

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


def split_observations(contents: bytes) -> tuple:
    """옮길 줄과 남길 줄을 가른다. 파싱 못 한 줄은 손대지 않고 남긴다."""
    keep, move, unparsed = [], [], 0
    for line in contents.splitlines(keepends=True):
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


def file_contents(path: Path) -> bytes:
    try:
        return path.read_bytes()
    except FileNotFoundError:
        return b""


def publish(path: Path, contents: bytes, expected: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = mkstemp(dir=path.parent, prefix=".reclassify-")
    temporary = Path(name)
    try:
        with os.fdopen(fd, "wb") as temp:
            temp.write(contents)
            temp.flush()
            os.fsync(temp.fileno())
        if file_contents(path) != expected:
            raise ValueError(f"기록이 변경됐습니다. --apply로 다시 실행하세요: {path}")
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


@contextmanager
def apply_lock(memory: Path):
    # 프로세스가 중단돼도 OS가 잠금을 해제한다. 같은 파일을 잠그도록 잠금 파일은 유지한다.
    with (memory / ".mnemo-reclassify.lock").open("a+b") as handle:
        handle.seek(0)
        if os.name == "nt":
            import msvcrt
            msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield


def publish_log(path: Path, before: bytes, after: bytes) -> None:
    # 중단 전 이미 반영한 파일은 그대로 둔다. 그 이후 훅이 추가한 줄도 살린다.
    current = file_contents(path)
    for prefix in sorted((before, after), key=len, reverse=True):
        if current.startswith(prefix):
            if prefix != after:
                publish(path, after + current[len(before):], current)
            return
    raise ValueError(f"관찰 로그가 백업과 다르게 변경됐습니다: {path}")


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

    memory = root / "memory"
    try:
        if args.apply and ((memory / "gotchas" / "observations.jsonl").is_file()
                           or (memory / ".mnemo-reclassify.pending").is_file()):
            with apply_lock(memory):
                reclassify(root, apply=True)
        else:
            reclassify(root, apply=False)
    except (OSError, ValueError) as error:
        print(f"[ERROR] {error}", file=sys.stderr)
        sys.exit(1)


def reclassify(root: Path, *, apply: bool) -> None:
    memory = root / "memory"
    gotchas = memory / "gotchas" / "observations.jsonl"
    learned = memory / "learned" / "observations.jsonl"
    offset_path = memory / ".mnemo-distill-offset"
    pending = memory / ".mnemo-reclassify.pending"
    resuming = pending.is_file()
    stamp = pending.read_text(encoding="ascii") if resuming else datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    if not re.fullmatch(r"[0-9]{8}-[0-9]{6}-[0-9]{6}", stamp):
        raise ValueError(f"재분류 진행 기록의 형식이 잘못됐습니다: {pending}")

    def backup(path: Path) -> Path:
        return path.with_name(f"{path.name}.bak-{stamp}")

    if not gotchas.is_file() and not resuming:
        print(f"[INFO] 관찰 로그가 없습니다: {gotchas}")
        print("       이 프로젝트에는 옮길 것이 없습니다.")
        return

    original = (backup(gotchas) if resuming else gotchas).read_bytes()
    keep, move, unparsed = split_observations(original)
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
        return

    if not apply:
        print("\n[DRY-RUN] 아무것도 바꾸지 않았습니다. 실제로 옮기려면 --apply 를 붙이세요.")
        print("          --apply 는 두 관찰 로그와 정제 기준값을 먼저 백업합니다.")
        return

    paths = (gotchas, learned, offset_path)
    if not resuming:
        for source in paths:
            snapshot = backup(source)
            snapshot.parent.mkdir(parents=True, exist_ok=True)
            with snapshot.open("xb") as handle:
                handle.write(original if source == gotchas else file_contents(source))
                handle.flush()
                os.fsync(handle.fileno())
        publish(pending, stamp.encode("ascii"), b"")

    existing = backup(learned).read_bytes()
    separator = b"\n" if existing and not existing.endswith((b"\n", b"\r")) else b""
    publish_log(learned, existing, existing + separator + ("\n".join(move) + "\n").encode("utf-8"))
    publish_log(gotchas, original, b"".join(keep))

    old_offset = backup(offset_path).read_bytes()
    try:
        g, l, timestamp = map(int, old_offset.split()[:3])
    except ValueError:
        pass  # 이전 버전과 같이 기준값이 없거나 읽을 수 없으면 보존한다.
    else:
        updated = f"{g - len(move)} {l + len(move)} {timestamp}".encode("ascii")
        if file_contents(offset_path) != updated:
            publish(offset_path, updated, old_offset)
        print(f"\n[INFO] distill 기준값 보정: gotchas -{len(move)} / learned +{len(move)} (합 불변)")

    pending.unlink()
    print(f"\n[DONE] {len(move)}줄을 learned로 옮겼습니다.")
    for source in paths:
        print(f"       백업: {backup(source).relative_to(root).as_posix()}")
    print("       되돌리려면 백업을 원래 이름으로 복사하면 됩니다.")


if __name__ == "__main__":
    main()
