# Marvi Local-Only Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release Marvi 0.57.44 with complete user-facing Marvi identity and no reachable TinyHumans-hosted desktop defaults.

**Architecture:** Preserve wire-level OpenHuman compatibility identifiers while enforcing Marvi branding and local-only behavior at prompt, configuration, routing, navigation, and provider-selection boundaries. Keep unrelated feature work in separate commits and verify each slice before the release commit.

**Tech Stack:** Rust, React, TypeScript, Tauri v2, Vitest, Cargo tests, GitHub Actions.

---

### Task 1: Add Branding And Local-Only Regression Guards

**Files:**
- Modify: `src/openhuman/agent/prompts/mod_tests.rs`
- Modify: `src/api/config.rs`
- Modify: `app/src/components/settings/panels/__tests__/builtinCloudProviders.test.ts`

- [ ] Add tests asserting bundled runtime prompts contain Marvi and do not identify the assistant or registries as OpenHuman/TinyHumans.
- [ ] Add tests asserting an unset hosted backend configuration does not resolve to `api.tinyhumans.ai`.
- [ ] Add frontend tests asserting managed OpenHuman is not offered as a desktop model provider.
- [ ] Run each focused test and confirm it fails for the expected legacy behavior.

### Task 2: Replace Remaining User-Facing Identity

**Files:**
- Modify: `src/openhuman/agent/prompts/IDENTITY.md`
- Modify: `src/openhuman/agent/prompts/USER.md`
- Modify: `src/openhuman/skill_registry/agent/skill_setup/prompt.md`
- Modify: `src/openhuman/subconscious/engine.rs`
- Modify: `app/src/lib/ai/skillsAgentContext.ts`
- Modify: `src/core/cli.rs`

- [ ] Replace product identity and community references with Marvi and the Marvi repository.
- [ ] Describe Composio as direct user-configured integration access.
- [ ] Keep internal compatibility identifiers unchanged.
- [ ] Run prompt and CLI-focused tests.
- [ ] Commit as `fix(marvi): complete visible prompt branding`.

### Task 3: Enforce Local-Only Backend And Provider Surfaces

**Files:**
- Modify: `src/api/config.rs`
- Modify: `app/src/components/OpenhumanLinkModal.tsx`
- Modify: `app/src/components/intelligence/ModelCouncilTab.tsx`
- Modify: `app/src/lib/i18n/en.ts`
- Modify relevant tests beside these modules.

- [ ] Make absent backend configuration resolve to no hosted backend rather than TinyHumans.
- [ ] Remove billing/account/community deep-link rendering from the desktop modal.
- [ ] Build model-council provider choices only from configured local/BYO providers.
- [ ] Remove or neutralize reachable managed-hosted copy in English desktop flows.
- [ ] Run focused Rust and Vitest tests.
- [ ] Commit as `fix(marvi): enforce local-only desktop runtime`.

### Task 4: Review And Commit Existing Feature Slices

**Files:**
- Existing modified Voice, OpenCode Go, Composio, and associated test files.

- [ ] Run targeted Voice/PocketTTS and wake-word tests; commit as one feature slice.
- [ ] Run OpenCode Go provider tests; commit as one feature slice.
- [ ] Run local Composio tests; commit as one feature slice.
- [ ] Exclude generated output, agent configuration imports, and EOL-only submodule state.

### Task 5: Full Verification And Windows Build

- [ ] Run `git diff --check`.
- [ ] Run `pnpm i18n:check`.
- [ ] Run `pnpm typecheck`.
- [ ] Run `pnpm test`.
- [ ] Run focused Rust tests and `cargo check --manifest-path Cargo.toml`.
- [ ] Run `pnpm build`.
- [ ] Build the Windows Tauri NSIS installer with updater artifacts enabled.
- [ ] Record exact artifact paths and hashes.

### Task 6: Version, Push, And Release

**Files:**
- Modify using `node scripts/release/bump-version.js patch`.

- [ ] Bump synchronized versions from 0.57.43 to 0.57.44.
- [ ] Run `node scripts/release/verify-version-sync.js 0.57.44`.
- [ ] Commit as `chore(release): v0.57.44`.
- [ ] Push `main` to `marvi`.
- [ ] Create/push tag `v0.57.44`.
- [ ] Dispatch `.github/workflows/release-windows-updater.yml` for version 0.57.44.
- [ ] Monitor the workflow to completion.
- [ ] Verify GitHub release assets and `latest.json` advertise 0.57.44.
