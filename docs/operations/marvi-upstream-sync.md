# Marvi Upstream Sync Runbook

Marvi is maintained as a branded Windows desktop distribution on top of
OpenHuman. Keep the internal `openhuman` runtime/module names compatible, but
preserve Marvi in visible app, installer, update, and release surfaces.

## Remotes

- `origin`: upstream OpenHuman, currently `https://github.com/tinyhumansai/openhuman.git`
- `marvi`: Marvi fork, currently `https://github.com/xRetr00/marvii.git`
- local `main`: Marvi integration branch

## Daily Sync

Dry run:

```bash
pnpm upstream:sync
```

Push after verification:

```bash
pnpm upstream:sync -- --execute
```

Manual equivalent:

```bash
git checkout main
git fetch origin --prune --tags
git checkout -b sync/upstream-$(date +%F)
git merge --no-ff --no-edit origin/main
pnpm --dir app compile
pwsh -NoProfile -File scripts/tests/OpenHumanWindowsInstall.Tests.ps1
git checkout main
git merge --ff-only sync/upstream-$(date +%F)
git push marvi main:main
```

## Conflict Policy

Preserve Marvi-owned identity:

- `app/src-tauri/tauri.conf.json` product name, updater URL, icons, and window title
- `app/src-tauri/icons/**`
- `app/public/logo.png` and `app/public/brand/**`
- installer scripts and release workflow URLs pointing to `xRetr00/marvii`
- visible app text that says Marvi

Accept upstream fixes in branded files when they improve behavior. Resolve
conflicts hunk by hunk: keep the upstream logic fix, then reapply Marvi names,
assets, and URLs.

Do not use blanket `ours` or `theirs` on branding files. Do not rebase, reset,
force-push, push to `origin`, rewrite tags, or auto-resolve conflicts in
automation.

## Verification

Minimum local checks:

```bash
pnpm --dir app compile
pnpm --dir app build
pwsh -NoProfile -File scripts/tests/OpenHumanWindowsInstall.Tests.ps1
cargo metadata --manifest-path app/src-tauri/Cargo.toml --no-deps --format-version 1
```

Full Windows package build requires:

- initialized submodules: `git submodule update --init --recursive`
- LLVM/libclang installed and available through `LIBCLANG_PATH`
- enough system page file/RAM for the Rust/Tauri build

Example Windows build environment:

```powershell
$env:CEF_PATH = Join-Path $env:LOCALAPPDATA 'tauri-cef'
$env:LIBCLANG_PATH = 'C:\Program Files\LLVM\bin'
$env:PATH = 'C:\Program Files\LLVM\bin;' + $env:PATH
pnpm --dir app tauri build -- -- --bin Marvi
```

## Update Path Checks

After each sync, confirm:

```bash
rg -n "xRetr00/marvii|tinyhumansai/openhuman" \
  app/src-tauri/tauri.conf.json scripts/install.ps1 scripts/install.sh \
  scripts/release/publish-updater-manifest.sh .github/workflows/build-desktop.yml \
  .github/workflows/release-production.yml app/src/utils/config.ts src/openhuman/update
```

Expected active Marvi endpoints:

- Tauri updater endpoint:
  `https://github.com/xRetr00/marvii/releases/latest/download/latest.json`
- Latest download fallback:
  `https://github.com/xRetr00/marvii/releases/latest`
- Windows installer repo:
  `xRetr00/marvii`
