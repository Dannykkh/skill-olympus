#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bump the Olympus release version in VERSION.

VERSION is the only version source. The update check (scripts/update-check.ps1|sh)
reads it, and CHANGELOG.md gets the matching section during the release.
The repository is installed with install.bat / install.sh, not as a Claude Code
plugin, so there is no plugin manifest to keep in step.

Usage:
    python scripts/bump_version.py major|minor|patch

Examples:
    python scripts/bump_version.py patch   # 1.0.0 -> 1.0.1
    python scripts/bump_version.py minor   # 1.0.0 -> 1.1.0
    python scripts/bump_version.py major   # 1.0.0 -> 2.0.0
"""

import argparse
import sys
from pathlib import Path


def get_root() -> Path:
    """Get the project root directory."""
    script_dir = Path(__file__).parent
    return script_dir.parent


def parse_version(version: str) -> tuple[int, int, int]:
    """Parse a semantic version string into (major, minor, patch)."""
    parts = version.split(".")
    if len(parts) != 3:
        raise ValueError(f"Invalid version format: {version}")
    return int(parts[0]), int(parts[1]), int(parts[2])


def bump_version(version: str, bump_type: str) -> str:
    """Bump a semantic version."""
    major, minor, patch = parse_version(version)

    if bump_type == "major":
        return f"{major + 1}.0.0"
    elif bump_type == "minor":
        return f"{major}.{minor + 1}.0"
    elif bump_type == "patch":
        return f"{major}.{minor}.{patch + 1}"
    else:
        raise ValueError(f"Invalid bump type: {bump_type}")


def bump_release_version(bump_type: str) -> None:
    """Bump VERSION, the single Olympus version source."""
    root = get_root()
    version_path = root / "VERSION"

    if not version_path.exists():
        print(f"Missing version source: {version_path}")
        sys.exit(1)

    # Windows 기본 인코딩(cp949)·CRLF에 기대지 않도록 UTF-8·LF로 읽고 쓴다
    current_version = version_path.read_text(encoding="utf-8").strip()
    new_version = bump_version(current_version, bump_type)

    print(f"Bumping skill-olympus: {current_version} -> {new_version}")

    version_path.write_text(f"{new_version}\n", encoding="utf-8", newline="\n")
    print(f"[ok] Updated {version_path}")

    release_files = "CHANGELOG.md VERSION"
    print("\nVersion bumped successfully.")
    print("\nNext steps:")
    print("  1. Review changes: git diff")
    print(f"  2. Update CHANGELOG.md for {new_version}")
    print(f"  3. Stage release files: git add -- {release_files}")
    print(
        f"  4. Commit release files: git commit -m 'chore(release): v{new_version}' -- {release_files}"
    )
    print("  5. Push: git push")


def show_version() -> None:
    """Show current version."""
    root = get_root()
    version_path = root / "VERSION"

    if version_path.exists():
        print(f"Current version: {version_path.read_text(encoding='utf-8').strip()}")
    else:
        print("VERSION not found")
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description="Bump the Olympus release version (VERSION)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Semantic versioning:
  major  Breaking changes           (1.0.0 → 2.0.0)
  minor  New features, refactoring  (1.0.0 → 1.1.0)
  patch  Bug fixes, docs            (1.0.0 → 1.0.1)

Examples:
  %(prog)s patch
  %(prog)s minor
  %(prog)s --show
        """
    )

    parser.add_argument(
        "bump_type",
        nargs="?",
        choices=["major", "minor", "patch"],
        help="Version bump type"
    )
    parser.add_argument(
        "--show", "-s",
        action="store_true",
        help="Show current version"
    )

    args = parser.parse_args()

    # Show mode
    if args.show:
        show_version()
        return

    # Validate args
    if not args.bump_type:
        parser.print_help()
        sys.exit(1)

    bump_release_version(args.bump_type)


if __name__ == "__main__":
    main()
