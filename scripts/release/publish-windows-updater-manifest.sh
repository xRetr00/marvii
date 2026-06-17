#!/usr/bin/env bash
# Generate and upload a Windows-only Tauri updater manifest.
#
# This is intentionally separate from publish-updater-manifest.sh, which
# refuses partial manifests for production multi-platform releases. Marvi's
# early release channel needs a focused Windows path while macOS/Linux remain
# upstream-owned.
set -euo pipefail

: "${TAG:?TAG required (e.g. v0.57.42-marvi.1)}"
: "${VERSION:?VERSION required (e.g. 0.57.42)}"
: "${REPO:?REPO required (e.g. xRetr00/marvii)}"
: "${GITHUB_TOKEN:?GITHUB_TOKEN required}"

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

gh release view "$TAG" --repo "$REPO" --json assets \
  --jq '.assets[].name' > "$WORKDIR/asset-names.txt"

WIN_X86_64="$(grep -E '^(Marvi|OpenHuman)(_| ).*x64-setup\.exe$' "$WORKDIR/asset-names.txt" | head -1 || true)"
if [ -z "$WIN_X86_64" ]; then
  echo "[updater] ERROR: no Windows NSIS updater asset found on $REPO $TAG" >&2
  cat "$WORKDIR/asset-names.txt" >&2
  exit 1
fi

SIG_NAME="${WIN_X86_64}.sig"
if ! grep -Fxq "$SIG_NAME" "$WORKDIR/asset-names.txt"; then
  echo "[updater] ERROR: missing signature asset '$SIG_NAME'" >&2
  exit 1
fi

gh release download "$TAG" --repo "$REPO" --pattern "$SIG_NAME" \
  --dir "$WORKDIR" --clobber >&2

PUB_DATE="$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")"
ASSET_URL="https://github.com/${REPO}/releases/download/${TAG}/${WIN_X86_64}"

jq -n \
  --arg version "$VERSION" \
  --arg pub_date "$PUB_DATE" \
  --arg notes "See https://github.com/$REPO/releases/tag/$TAG" \
  --arg url "$ASSET_URL" \
  --rawfile sig "$WORKDIR/$SIG_NAME" \
  '{
    version: $version,
    notes: $notes,
    pub_date: $pub_date,
    platforms: {
      "windows-x86_64": {
        signature: $sig,
        url: $url
      }
    }
  }' > "$WORKDIR/latest.json"

cat "$WORKDIR/latest.json"
gh release upload "$TAG" "$WORKDIR/latest.json" --repo "$REPO" --clobber
echo "[updater] Uploaded Windows latest.json to $TAG"
