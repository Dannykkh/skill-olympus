"""Validate the shared index before recovering conversations and publish it under the journal lock."""

from decimal import Decimal, InvalidOperation
import hashlib
import json
from pathlib import Path
import subprocess

INDEX_FILENAME = ".mnemo-index.json"


class IndexErrorDuringRecovery(ValueError):
    pass


class ConversationIndex(dict):
    """Retain the bytes read at preflight for comparison at commit."""

    def __init__(self, data: dict, original: bytes | None):
        super().__init__(data)
        self.original = original


def _unique_keys(pairs: list[tuple]) -> dict:
    result = dict(pairs)
    if len(result) != len(pairs):
        raise ValueError("duplicate key")
    return result


def _invalid_constant(_: str) -> None:
    raise ValueError("non-JSON number")


def _read_float(text: str) -> float:
    value = float(text)
    exact = Decimal(text)
    if not exact.is_finite() or Decimal(str(value)) != exact:
        raise ValueError("unsupported numeric precision")
    return value


def load_index(directory: Path, *, codex: bool = False) -> ConversationIndex:
    path = directory / INDEX_FILENAME
    try:
        if path.is_symlink():
            raise ValueError("symbolic link")
        try:
            original = path.read_bytes()
        except FileNotFoundError:
            original = None
        data = {} if original is None else json.loads(
            original.decode("utf-8"), object_pairs_hook=_unique_keys,
            parse_constant=_invalid_constant, parse_float=_read_float
        )
        if not isinstance(data, dict):
            raise ValueError("expected an object")
        version = data.setdefault("version", 1)
        if type(version) is not int or version != 1:
            raise ValueError("unsupported version")
        for field in ("claude", "codex", "codex_aborted"):
            if field in data:
                dates = data[field]
                if not isinstance(dates, dict) or any(
                    not isinstance(ids, list) or not all(isinstance(item, str) for item in ids)
                    for ids in dates.values()
                ):
                    raise ValueError(f"invalid {field} entries")
            elif field == "claude" or codex:
                data[field] = {}
        return ConversationIndex(data, original)
    except (OSError, ValueError, RecursionError, InvalidOperation) as error:
        raise IndexErrorDuringRecovery(f"cannot read {path}; check or restore the index before retrying") from error


def save_index(directory: Path, index: ConversationIndex) -> None:
    if index.original is not None and json.loads(index.original) == index:
        return
    directory.mkdir(parents=True, exist_ok=True)
    helper = next((parent / "hooks" / "mnemo-record-store.js" for parent in Path(__file__).resolve().parents
                   if (parent / "hooks" / "mnemo-record-store.js").is_file()), None)
    if helper is None:
        raise IndexErrorDuringRecovery("Mnemo record-store helper is missing; reinstall the adapter")
    expected = "missing" if index.original is None else hashlib.sha256(index.original).hexdigest()
    contents = (json.dumps(index, ensure_ascii=False, indent=2, allow_nan=False) + "\n").encode("utf-8", "backslashreplace")
    result = subprocess.run(["node", str(helper), "commit-index", str(directory.resolve()), expected],
                            input=contents, capture_output=True, check=False)
    if result.returncode:
        reason = result.stderr.decode("utf-8", errors="replace").strip()
        raise IndexErrorDuringRecovery(f"cannot publish {directory / INDEX_FILENAME}: {reason}")
    index.original = contents
