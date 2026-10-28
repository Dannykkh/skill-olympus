#!/usr/bin/env bash
# Sequential isolation for npm test scripts that accept a file after --.
# Run from the project root with Bash 4+; quote the test glob.
# Exit 0: selected tests passed, target absent; 1: pollution; 2: unverified/error.
set -eo pipefail

if (( BASH_VERSINFO[0] < 4 )); then
  printf 'ERROR: Bash 4+ is required for recursive test globs.\n' >&2
  exit 2
fi

if (( $# != 2 )) || [[ -z "$1" || -z "$2" ]]; then
  printf 'Usage: bash %s <absent_file_or_directory> <quoted_test_glob>\n' "$0" >&2
  exit 2
fi

pollution_check=$1
test_pattern=$2
if [[ -e "$pollution_check" || -L "$pollution_check" ]]; then
  printf 'UNVERIFIED: target already exists: %s; no tests run and nothing removed.\n' "$pollution_check" >&2
  exit 2
fi

case "$test_pattern" in
  /*|[A-Za-z]:/*|..|../*|*/../*)
    printf 'ERROR: test glob must stay relative to the project working directory: %s\n' "$test_pattern" >&2
    exit 2
    ;;
esac

# Expand ** without splitting patterns or matched filenames at spaces. No eval.
shopt -s nullglob globstar
saved_ifs=$IFS
IFS=
candidates=( $test_pattern )
IFS=$saved_ifs
test_files=()
for candidate in "${candidates[@]}"; do
  if [[ -f "$candidate" ]]; then
    test_files+=("$candidate")
  fi
done

if (( ${#test_files[@]} == 0 )); then
  printf 'UNVERIFIED: No test files matched %s in %s; no tests run.\n' "$test_pattern" "$PWD" >&2
  exit 2
fi
if ! command -v npm >/dev/null 2>&1; then
  printf 'UNVERIFIED: npm is unavailable; no tests run.\n' >&2
  exit 2
fi

count=0
for test_file in "${test_files[@]}"; do
  if [[ -e "$pollution_check" || -L "$pollution_check" ]]; then
    printf 'UNVERIFIED: target already exists before %s; cannot attribute it to this test.\n' "$test_file" >&2
    exit 2
  fi
  count=$((count + 1))
  printf '[%d/%d] Testing: %s\n' "$count" "${#test_files[@]}" "$test_file" >&2
  runner_status=0
  npm test -- "$test_file" >&2 || runner_status=$?

  if [[ -e "$pollution_check" || -L "$pollution_check" ]]; then
    printf 'POLLUTER: %s created %s; runner exit %d. Evidence preserved.\n' "$test_file" "$pollution_check" "$runner_status"
    exit 1
  fi
  if (( runner_status != 0 )); then
    printf 'UNVERIFIED: runner failed for %s (exit %d); remaining tests not run.\n' "$test_file" "$runner_status" >&2
    exit 2
  fi
done

printf 'CLEAN: %d selected test files passed; target absent: %s\n' "$count" "$pollution_check"
