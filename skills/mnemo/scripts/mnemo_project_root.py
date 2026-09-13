"""Use the same project boundary as the live hooks, including installed helpers."""

from pathlib import Path
import subprocess


def _resolve(start: Path, *, explicit: bool = False, validate_only: bool = False) -> Path:
    helper = next((parent / "hooks" / "mnemo-project-root.js"
                   for parent in Path(__file__).resolve().parents
                   if (parent / "hooks" / "mnemo-project-root.js").is_file()), None)
    if helper is None:
        raise ValueError("Mnemo project-root helper is missing; reinstall the Mnemo adapter")
    candidate = str(Path(start).expanduser().absolute())
    args = ["node", str(helper)]
    if validate_only:
        args.append("--validate")
    args.extend([candidate, "--recovery"])
    if explicit:
        args.append("--explicit")
    try:
        result = subprocess.run(args, capture_output=True, text=True, encoding="utf-8",
                                errors="replace", timeout=15, check=False)
    except (OSError, subprocess.TimeoutExpired) as error:
        raise ValueError("Mnemo project-root helper could not run; Node.js is required") from error
    if result.returncode or not result.stdout.strip():
        raise ValueError(f"unsafe Mnemo project root (unconfirmed boundary, CLI configuration, or escaping storage): {candidate}")
    return Path(result.stdout.strip()).resolve(strict=False)


def validate_project_root(start: Path) -> Path:
    """Validate a path, including a historical alias that no longer exists."""
    return _resolve(start, validate_only=True)


def detect_project_root(start: Path, *, explicit: bool = False) -> Path:
    """Resolve Git/marker roots; only an explicit non-Git workspace can initialize."""
    candidate = Path(start)
    if candidate.is_file():
        candidate = candidate.parent
    return _resolve(candidate, explicit=explicit)
