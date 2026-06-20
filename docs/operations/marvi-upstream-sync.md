# Marvii/OpenHuman Upstream Sync Runbook

Marvii is the Marvi Windows desktop distribution built on top of OpenHuman. The
goal of an upstream sync is to take useful OpenHuman fixes without letting
hosted OpenHuman/TinyHumans/tiny.place product surfaces leak back into the
Marvi app, installer, update path, prompts, logs, or user-facing channels.

Internal crate/module names such as `openhuman` can remain when changing them
would create compatibility risk. User-visible text, release assets, installer
metadata, app branding, prompts, and update URLs must be Marvi/Marvii.

## Remotes

- `origin`: upstream OpenHuman, `https://github.com/tinyhumansai/openhuman.git`
- `marvi`: Marvii fork, `https://github.com/xRetr00/marvii.git`
- `main`: Marvii integration/release branch

Never push to `origin`. Never force-push `marvi/main` for normal sync work.

## Normal Sync

Start from a clean worktree:

```powershell
cd D:\openhuman
git status --short --branch
git checkout main
git fetch origin main --prune
git fetch marvi --prune
git merge --ff-only marvi/main
git rev-list --left-right --count main...origin/main
```

If the right-side count is `0`, upstream has no new commits. If it is non-zero,
merge upstream with ancestry preserved:

```powershell
git merge --no-ff origin/main -m "Merge OpenHuman upstream through <origin-sha>"
```

If conflicts occur, resolve them with the policy below. After conflicts are
resolved:

```powershell
git status --short
git diff --cached --stat
git commit --no-verify -m "Merge OpenHuman upstream through <origin-sha>"
```

Use `--no-verify` only for the merge commit when local hooks are blocked by
known local Windows toolchain/shell issues. Do not use it to hide code or test
failures.

## Conflict Policy

Keep Marvii/Marvi-owned release and brand surfaces:

- `.github/workflows/release-windows-updater.yml`
- `scripts/release/publish-windows-updater-manifest.sh`
- `scripts/install.ps1`
- `scripts/install.sh`
- `app/src-tauri/tauri.conf.json`
- `app/src-tauri/Cargo.toml`
- `app/src-tauri/icons/**`
- `app/public/logo.png`
- `app/public/brand/**`
- `app/src/SOUL.md`
- `src/openhuman/agent/prompts/**`
- channel/provider prompts and visible logs under `src/openhuman/channels/**`
- updater code and fallback URLs under `src/openhuman/update/**`

Accept upstream fixes hunk by hunk when they improve local desktop behavior,
chat UX, Rust runtime behavior, tests, or build reliability.

Reject or remove upstream changes that reintroduce:

- hosted OpenHuman/TinyHumans backend account defaults
- tiny.place / Agent World / settlement RPC product surfaces
- wallet/rewards/billing UI unless explicitly requested
- "Join Discord", community growth prompts, outbound telemetry, or analytics
  collection that is not already opt-in/local-safe
- visible `OpenHuman`, `TinyHumans`, `tiny.place`, `Hermes Agent`, or `Nous`
  identity text in app UI, installer, prompts, channels, logs, or errors
- update URLs that do not point to `xRetr00/marvii`

For modify/delete conflicts on banned directories, keep the deletion:

```powershell
git rm -f <path>
```

For conflicts where upstream only changed OpenHuman release version or
tiny.place env/config comments, keep Marvi's side:

```powershell
git checkout --ours <path>
git add <path>
```

Do not blanket `git checkout --theirs .`. That can silently restore hosted
backend surfaces.

## Guard Searches

Run these searches before final verification:

```powershell
rg -n "Hermes Agent|Nous|TinyHumans|tinyhumans|api\.tinyhumans\.ai|tiny\.place|Agent World|OpenHuman" app src scripts .github docs
rg -n "billing|rewards|wallet|Discord|telemetry|analytics" app/src src/openhuman
rg -n "github\.com/(tinyhumansai/openhuman|xRetr00/marvii)" app src scripts .github
```

Expected notes:

- Internal `openhuman` crate/module/RPC names may remain.
- i18n, README, mobile, fastlane, and upstream-only docs may retain upstream
  branding unless they are used by the Windows desktop app or release path.
- `data-analytics-id` attributes can remain as local DOM/test identifiers if
  outbound collection is disabled/gated.

## Verification

Minimum checks for a sync:

```powershell
pnpm --dir app test -- src/__tests__/marvi-local-only-guard.test.ts src/hooks/useAppUpdate.test.ts src/components/__tests__/AppUpdatePrompt.test.tsx --reporter=dot
pnpm --dir app compile
pnpm --dir app build
node scripts/release/verify-version-sync.js
pwsh -NoProfile -File scripts/tests/OpenHumanWindowsInstall.Tests.ps1
```

If the full app suite is practical, run:

```powershell
pnpm --dir app test -- --reporter=dot
```

Known local limitation: native Rust/Tauri checks can fail on some Windows
machines because of MSVC/linker or shell-hook setup. When that happens, record
the exact failure and rely on the GitHub Windows updater workflow as the final
package build authority.

## Release

After sync verification, bump and release with:

```powershell
scripts\release-marvii.bat patch
```

The script:

1. Verifies the worktree is clean before bumping.
2. Runs `scripts/release/bump-version.js`.
3. Verifies version consistency.
4. Runs focused validation.
5. Commits `chore(release): vX.Y.Z`.
6. Pushes `main` to `marvi/main`.
7. Dispatches `.github/workflows/release-windows-updater.yml`.

To inspect the release workflow:

```powershell
gh run list --repo xRetr00/marvii --workflow release-windows-updater.yml --limit 1
gh run view <run-id> --repo xRetr00/marvii --json status,conclusion,jobs,url
```

After success, confirm:

```powershell
gh release view vX.Y.Z --repo xRetr00/marvii --json tagName,url,assets,isDraft,isPrerelease
gh release download vX.Y.Z --repo xRetr00/marvii --pattern latest.json --dir $env:TEMP\marvii-release-check --clobber
Get-Content $env:TEMP\marvii-release-check\latest.json
```

`latest.json` must point at:

```text
https://github.com/xRetr00/marvii/releases/download/vX.Y.Z/Marvi_X.Y.Z_x64-setup.exe
```

## Recovery

If a merge is in progress and the conflict policy is unclear, stop and inspect:

```powershell
git status --short
git diff --name-only --diff-filter=U
git diff --cc <path>
```

If the merge was started from the wrong base and no conflict resolutions should
be kept:

```powershell
git merge --abort
git checkout main
git merge --ff-only marvi/main
```

Do not use `git reset --hard` unless the user explicitly approves it.
