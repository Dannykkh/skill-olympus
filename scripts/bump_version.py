#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bump the version of the agent-skills plugin.

Usage:
    python scripts/bump_version.py major|minor|patch

Examples:
    python scripts/bump_version.py patch   # 1.0.0 -> 1.0.1
    python scripts/bump_version.py minor   # 1.0.0 -> 1.1.0
    python scripts/bump_version.py major   # 1.0.0 -> 2.0.0
"""

import argparse
import json
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


def load_json(path: Path) -> dict:
    """Load a JSON file."""
    with open(path, "r") as f:
        return json.load(f)


def save_json(path: Path, data: dict) -> None:
    """Save a JSON file with proper formatting."""
    with open(path, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")


def bump_plugin_version(bump_type: str) -> None:
    """Bump every public Olympus version source together."""
    root = get_root()

    marketplace_path = root / ".claude-plugin" / "marketplace.json"
    plugin_path = root / ".claude-plugin" / "plugin.json"
    version_path = root / "VERSION"

    required_paths = [marketplace_path, plugin_path, version_path]
    missing_paths = [path for path in required_paths if not path.exists()]
    if missing_paths:
        print("Missing version source(s):")
        for path in missing_paths:
            print(f"  - {path}")
        sys.exit(1)

    marketplace = load_json(marketplace_path)
    plugin = load_json(plugin_path)

    current_version = version_path.read_text(encoding="utf-8").strip()
    new_version = bump_version(current_version, bump_type)

    print(f"Bumping skill-olympus: {current_version} -> {new_version}")

    if "metadata" not in marketplace:
        marketplace["metadata"] = {}
    marketplace["metadata"]["version"] = new_version
    for entry in marketplace.get("plugins", []):
        if entry.get("name") == "skill-olympus":
            entry["version"] = new_version
    plugin["version"] = new_version

    save_json(marketplace_path, marketplace)
    save_json(plugin_path, plugin)
    version_path.write_text(f"{new_version}\n", encoding="utf-8")
    print(f"[ok] Updated {marketplace_path}")
    print(f"[ok] Updated {plugin_path}")
    print(f"[ok] Updated {version_path}")

    print("\nVersion bumped successfully.")
    print(f"\nNext steps:")
    print(f"  1. Review changes: git diff")
    print(f"  2. Commit: git commit -am 'chore: bump version to {new_version}'")
    print(f"  3. Push: git push")


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
        description="Bump agent-skills plugin version",
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

    bump_plugin_version(args.bump_type)


if __name__ == "__main__":
    main()
