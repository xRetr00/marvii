---
name: marvii-upstream-sync
description: Sync OpenHuman upstream into the Marvii fork, preserve Marvi local-only Windows desktop branding and banned hosted backend surfaces, run validation, push to xRetr00/marvii, and create a Windows updater release. Use when the user asks for Marvii/OpenHuman upstream sync, Marvi release, updater release, or keeping Marvi branding on top of OpenHuman.
---

# Marvii Upstream Sync

Use this skill only in the Marvii/OpenHuman repo, normally `D:\openhuman`.

## Rules

- Treat `origin` as upstream OpenHuman: `https://github.com/tinyhumansai/openhuman.git`.
- Treat `marvi` as the Marvii fork: `https://github.com/xRetr00/marvii.git`.
- Push only to `marvi`, never to `origin`.
- Preserve upstream ancestry with a merge commit. Do not rebase upstream syncs.
- Keep internal `openhuman` crate/module/RPC names when changing them would be risky.
- Make all Windows desktop, installer, updater, prompt, log, and channel surfaces say Marvi/Marvii.
- Do not restore hosted OpenHuman/TinyHumans backend account defaults, tiny.place/Agent World, wallet/rewards/billing UI, Discord community prompts, or telemetry collection.
- Do not use `git reset --hard` unless the user explicitly asks.

## Sync

Run:

```powershell
cd D:\openhuman
git status --short --branch
git checkout main
git fetch origin main --prune
git fetch marvi --prune
git merge --ff-only marvi/main
git rev-list --left-right --count main...origin/main
```

If upstream has new commits, merge:

```powershell
$sha = git rev-parse --short origin/main
git merge --no-ff origin/main -m "Merge OpenHuman upstream through $sha"
```

## Conflict Handling

Prefer hunk-level conflict resolution. Use Marvi's side for:

- `.github/workflows/release-windows-updater.yml`
- `scripts/install.ps1`, `scripts/install.sh`, and updater manifest scripts
- `app/src-tauri/tauri.conf.json`
- `app/src-tauri/Cargo.toml`
- icons and `app/public/brand/**`
- prompt files: `app/src/SOUL.md`, `src/openhuman/agent/prompts/**`
- visible channel/log text under `src/openhuman/channels/**`

For upstream files that reintroduce banned hosted surfaces, keep deletion:

```powershell
git rm -f <path>
```

Known banned names/patterns:

- `app/src/agentworld/**`
- `src/openhuman/tinyplace/**`
- `docs/tinyplace-*`
- tiny.place settlement RPC code
- visible `OpenHuman`, `TinyHumans`, `Hermes Agent`, `Nous`, `Agent World`
- wallet/rewards/billing UI unless the user explicitly requests it

For version conflicts, keep Marvi branding and let the release bump normalize
versions later. Never accept upstream `productName: OpenHuman`.

After resolving conflicts:

```powershell
git status --short
git diff --cached --stat
git commit --no-verify -m "Merge OpenHuman upstream through <sha>"
```

Use `--no-verify` only if local hooks are blocked by known local Windows
toolchain/shell problems. Still run direct validation.

## Guard Searches

Run:

```powershell
rg -n "Hermes Agent|Nous|TinyHumans|tinyhumans|api\.tinyhumans\.ai|tiny\.place|Agent World|OpenHuman" app src scripts .github docs
rg -n "github\.com/(tinyhumansai/openhuman|xRetr00/marvii)" app src scripts .github
```

Allowed: internal `openhuman` identifiers, upstream-only docs/mobile/i18n when
not part of the Windows app or release path, and `xRetr00/marvii` update URLs.

## Validate

Minimum:

```powershell
pnpm --dir app test -- src/__tests__/marvi-local-only-guard.test.ts src/hooks/useAppUpdate.test.ts src/components/__tests__/AppUpdatePrompt.test.tsx --reporter=dot
pnpm --dir app compile
pnpm --dir app build
node scripts/release/verify-version-sync.js
pwsh -NoProfile -File scripts/tests/OpenHumanWindowsInstall.Tests.ps1
```

If practical, also run:

```powershell
pnpm --dir app test -- --reporter=dot
```

## Release

Use the repo script:

```powershell
scripts\release-marvii.bat patch
```

It bumps versions, commits `chore(release): vX.Y.Z`, pushes `marvi/main`, and
dispatches the Windows updater workflow.

Poll:

```powershell
gh run list --repo xRetr00/marvii --workflow release-windows-updater.yml --limit 1
gh run view <run-id> --repo xRetr00/marvii --json status,conclusion,jobs,url
```

Verify release assets:

```powershell
gh release view vX.Y.Z --repo xRetr00/marvii --json tagName,url,assets,isDraft,isPrerelease
```

Expected assets: `latest.json`, `Marvi_X.Y.Z_x64-setup.exe`,
`Marvi_X.Y.Z_x64-setup.exe.sig`.
