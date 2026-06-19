# Marvii Upstream Identity Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the latest OpenHuman upstream changes into Marvii while preserving the Marvi Windows desktop identity, local-only behavior, updater path, and agent identity.

**Architecture:** Keep internal `openhuman` module names, RPC methods, environment variables, and migration labels for compatibility. Enforce Marvi only at runtime prompts, user-visible desktop/channel text, packaged metadata, installer/update endpoints, and release assets. Hosted TinyHumans features remain excluded from the Marvii desktop distribution.

**Tech Stack:** Rust, Tauri v2, React, TypeScript, Vitest, pnpm, GitHub Actions

---

### Task 1: Merge Upstream Safely

**Files:**
- Modify: files changed by `origin/main`
- Preserve: `app/src-tauri/tauri.conf.json`
- Preserve: `app/src-tauri/icons/**`
- Preserve: `app/public/brand/**`
- Preserve: `.github/workflows/release-production.yml`
- Preserve: `scripts/release/publish-updater-manifest.sh`

- [ ] **Step 1: Create a sync branch from Marvii main**

Run: `git switch -c codex/marvii-upstream-2026-06-19`

- [ ] **Step 2: Merge upstream without auto-selecting whole files**

Run: `git merge --no-ff origin/main`

Expected: merge succeeds or reports explicit conflicts for hunk-by-hunk resolution.

- [ ] **Step 3: Resolve conflicts**

Keep upstream behavior fixes and new non-hosted features. Reapply Marvi names, assets, local-only account/provider behavior, and `xRetr00/marvii` update/release URLs.

### Task 2: Lock Runtime Identity

**Files:**
- Modify: `app/src/__tests__/marvi-local-only-guard.test.ts`
- Modify: `src/openhuman/agent/prompts/IDENTITY.md`
- Modify: `src/openhuman/agent/prompts/SOUL.md`
- Modify: `app/src/SOUL.md`
- Modify: runtime prompt files found by the identity audit

- [ ] **Step 1: Add failing source guards**

Assert that runtime prompt and channel source files do not identify the assistant as Hermes Agent, OpenHuman, TinyHumans, or a Nous model/provider.

- [ ] **Step 2: Run the guard and confirm failure**

Run: `pnpm --dir app test -- src/__tests__/marvi-local-only-guard.test.ts`

Expected: FAIL on the currently leaked runtime prompt strings.

- [ ] **Step 3: Replace leaked identity text**

Use direct identity wording: `You are Marvi, a personal local AI assistant by NeuRetro Labs.`

- [ ] **Step 4: Run the guard and confirm success**

Run: `pnpm --dir app test -- src/__tests__/marvi-local-only-guard.test.ts`

Expected: PASS.

### Task 3: Preserve Local-Only Desktop and Channels

**Files:**
- Modify: local-only guard tests
- Modify: upstream-added desktop/channel files only where they restore hosted account, billing, wallet, managed provider, telemetry, Discord-community, or TinyHumans backend surfaces

- [ ] **Step 1: Audit upstream additions**

Run focused `git grep` checks over `app/src`, `app/src-tauri`, and prompt/channel modules.

- [ ] **Step 2: Add failing assertions for any restored hosted surfaces**

Keep internal compatibility identifiers only when they are not displayed and do not make outbound hosted calls.

- [ ] **Step 3: Remove or disable restored hosted surfaces**

Preserve direct/local Composio and local provider functionality.

- [ ] **Step 4: Run focused tests**

Run relevant Vitest and Rust tests for every changed subsystem.

### Task 4: Verify and Release

**Files:**
- Modify: version-bearing Cargo, package, and Tauri files
- Modify: release tag and GitHub release assets

- [ ] **Step 1: Run verification**

Run:

```text
pnpm --dir app compile
pnpm --dir app build
pnpm i18n:check
pnpm --dir app test
cargo check --manifest-path Cargo.toml
cargo check --manifest-path app/src-tauri/Cargo.toml
pwsh -NoProfile -File scripts/tests/OpenHumanWindowsInstall.Tests.ps1
```

- [ ] **Step 2: Review branding and updater endpoints**

Confirm packaged product metadata says Marvi and updater/release URLs target `xRetr00/marvii`.

- [ ] **Step 3: Merge to main and bump the next patch version**

Commit the merge/fixes, fast-forward `main`, bump consistently, and commit the release.

- [ ] **Step 4: Push and publish**

Push `main` and the version tag to `marvi`, then verify the GitHub release/update manifest and CI status.
