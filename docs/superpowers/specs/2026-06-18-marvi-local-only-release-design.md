# Marvi Local-Only Release Design

## Goal

Ship Marvi 0.57.44 as a Windows-first, local-only desktop application whose
visible prompts, CLI text, settings, errors, and provider choices never present
OpenHuman, TinyHumans, hosted accounts, billing, wallet, community redirects,
or managed provider defaults.

## Compatibility Boundary

Internal compatibility identifiers remain unchanged where renaming would break
stored data or RPC contracts:

- Rust module paths under `src/openhuman`
- `openhuman.*` JSON-RPC methods
- `OPENHUMAN_*` environment variables
- `.openhuman` workspace paths
- the `openhuman://` deep-link protocol

These identifiers may appear in developer diagnostics, but user-facing copy
must identify the product as Marvi.

## Prompt And Identity Rules

Bundled persona files, fallback prompts, skill-agent instructions, and CLI
branding must use Marvi. The agent may mention OpenHuman or TinyHumans only
when explaining legacy compatibility or importing data, never as its identity,
community, hosted service, or default provider.

## Local-Only Runtime Rules

The desktop runtime must not silently default to the TinyHumans API. Hosted
auth, billing, managed inference, managed search, managed channels, and hosted
Composio paths must be unavailable in local mode. Direct user-configured
providers and direct Composio remain supported.

Unused hosted UI implementations may stay in source only when required for
upstream merge compatibility, but they must be unreachable through normal
navigation, deep links, notifications, onboarding, or provider selectors.

## Existing Work Preservation

The dirty worktree contains independent Voice/PocketTTS, OpenCode Go, and local
Composio changes. These changes will be reviewed, tested, and committed in
separate focused commits. Dirty vendor submodules caused only by CRLF
normalization and generated Playwright output will not be committed.

## Verification And Release

Verification includes prompt/branding regression tests, local-only backend
tests, focused frontend and Rust tests for each existing feature slice,
typechecking, formatting checks, a production frontend build, Rust checks, and
the Windows Tauri installer build. Version files will then be synchronized to
0.57.44, pushed to `xRetr00/marvii`, and released through the Windows updater
workflow. The published `latest.json` must advertise 0.57.44 and reference the
Marvi release assets.
