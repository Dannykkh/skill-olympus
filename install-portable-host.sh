#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
    echo "[error] runtime is required" >&2
    exit 2
fi

RUNTIME="$1"
shift
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
    echo "[error] Node.js is required but was not found in PATH." >&2
    exit 1
fi

echo ""
echo "============================================"
echo "  Olympus Skills-Only Installer"
echo "  Target: $RUNTIME"
echo "============================================"
echo "  Installs skills and the source catalog only."
echo "  Plugins, hooks, Mnemo, MCP, and agents are not installed."
echo ""

node "$SCRIPT_DIR/scripts/sync-portable-skills.js" "$RUNTIME" "$@"

echo ""
echo "[ok] $RUNTIME skills-only operation completed."
