#!/usr/bin/env bash
# upstream-sync: safely merge OpenHuman upstream into Marvi main.
#
# Dry-run by default. Use --execute to push the resulting main branch to the
# Marvi remote after verification.

set -euo pipefail

UPSTREAM_REMOTE="${UPSTREAM_REMOTE:-origin}"
UPSTREAM_BRANCH="${UPSTREAM_BRANCH:-main}"
MARVI_REMOTE="${MARVI_REMOTE:-marvi}"
MARVI_BRANCH="${MARVI_BRANCH:-main}"
SYNC_BRANCH=""
EXECUTE=0
RUN_VERIFY=1
ORIGINAL_BRANCH=""

usage() {
  cat <<EOF
upstream-sync: safely merge OpenHuman upstream into Marvi main.

Dry-run by default. Use --execute to push the resulting main branch to the
Marvi remote after verification.

Usage:
  bash scripts/shortcuts/upstream-sync.sh [--execute] [--no-verify] [--branch NAME]

Environment:
  UPSTREAM_REMOTE   default: origin
  UPSTREAM_BRANCH   default: main
  MARVI_REMOTE      default: marvi
  MARVI_BRANCH      default: main
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --execute) EXECUTE=1 ;;
    --no-verify) RUN_VERIFY=0 ;;
    --branch)
      shift
      [ "$#" -gt 0 ] || { echo "upstream-sync: --branch requires a value" >&2; exit 2; }
      SYNC_BRANCH="$1"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "upstream-sync: unknown arg: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "upstream-sync: not inside a git repo" >&2
  exit 1
fi

if [ -n "$(git status --porcelain --untracked-files=all --ignore-submodules=dirty)" ]; then
  echo "upstream-sync: working tree has uncommitted changes or untracked files" >&2
  exit 1
fi

git remote get-url "$UPSTREAM_REMOTE" >/dev/null
git remote get-url "$MARVI_REMOTE" >/dev/null
ORIGINAL_BRANCH="$(git branch --show-current)"

if [ -z "$SYNC_BRANCH" ]; then
  SYNC_BRANCH="sync/upstream-$(date +%Y-%m-%d)"
fi

echo "==> Fetching $UPSTREAM_REMOTE/$UPSTREAM_BRANCH..."
git fetch "$UPSTREAM_REMOTE" --prune --tags

echo "==> Checking out $MARVI_BRANCH..."
git checkout "$MARVI_BRANCH"

echo "==> Creating sync branch $SYNC_BRANCH..."
if git show-ref --verify --quiet "refs/heads/$SYNC_BRANCH"; then
  echo "upstream-sync: branch $SYNC_BRANCH already exists" >&2
  exit 1
fi
git checkout -b "$SYNC_BRANCH"

echo "==> Merging $UPSTREAM_REMOTE/$UPSTREAM_BRANCH..."
if ! git merge --no-ff --no-edit "$UPSTREAM_REMOTE/$UPSTREAM_BRANCH"; then
  echo ""
  echo "upstream-sync: merge conflict. Resolve manually, preserving Marvi branding hunks."
  echo "Conflicted files:"
  git diff --name-only --diff-filter=U
  exit 1
fi

if [ "$RUN_VERIFY" -eq 1 ]; then
  echo "==> Running verification..."
  if ! pnpm --dir app compile; then
    git checkout "$ORIGINAL_BRANCH" >/dev/null 2>&1 || true
    exit 1
  fi
  if command -v pwsh >/dev/null 2>&1; then
    PS_CMD=(pwsh -NoProfile -File scripts/tests/OpenHumanWindowsInstall.Tests.ps1)
  elif command -v powershell.exe >/dev/null 2>&1; then
    PS_CMD=(powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/tests/OpenHumanWindowsInstall.Tests.ps1)
  else
    echo "upstream-sync: neither pwsh nor powershell.exe is available for installer tests" >&2
    git checkout "$ORIGINAL_BRANCH" >/dev/null 2>&1 || true
    exit 1
  fi
  if ! "${PS_CMD[@]}"; then
    git checkout "$ORIGINAL_BRANCH" >/dev/null 2>&1 || true
    exit 1
  fi
fi

echo "==> Fast-forwarding $MARVI_BRANCH to $SYNC_BRANCH..."
git checkout "$MARVI_BRANCH"
git merge --ff-only "$SYNC_BRANCH"

if [ "$EXECUTE" -eq 1 ]; then
  echo "==> Pushing $MARVI_BRANCH to $MARVI_REMOTE/$MARVI_BRANCH..."
  git push "$MARVI_REMOTE" "$MARVI_BRANCH:$MARVI_BRANCH"
else
  echo "==> Dry run complete. Nothing pushed."
  echo "Review locally, then push with:"
  echo "  git push $MARVI_REMOTE $MARVI_BRANCH:$MARVI_BRANCH"
fi

echo "==> Done."
