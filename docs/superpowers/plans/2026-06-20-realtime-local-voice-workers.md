# Real-Time Local Voice Workers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the slow transcript-first wake path and cold PocketTTS calls
with supervised local workers while preserving safe fallbacks.

**Architecture:** Rust owns audio capture, configuration, lifecycle, and RPC.
Managed Python workers own Sherpa KWS and PocketTTS model state. Existing
provider factories remain authoritative, with in-process Whisper and one-shot
CLI fallbacks.

**Tech Stack:** Rust, Tokio, serde JSONL, CPAL, whisper-rs, Python,
sherpa-onnx, pocket-tts, React, Vitest.

---

### Task 1: Regression boundaries and configuration migration

**Files:**
- Modify: `src/openhuman/config/schema/voice_server.rs`
- Modify: `src/openhuman/config/load.rs`
- Modify: `src/openhuman/voice/always_on.rs`

- [ ] Add failing tests proving legacy `Hey Tiny` migrates to `Hey Marvi`,
  variants are normalized, and user-custom wake phrases are preserved.
- [ ] Add failing VAD tests proving connected speech is not split by brief
  below-threshold frames and one wake authorizes exactly one command.
- [ ] Run focused Rust tests and verify the new assertions fail.
- [ ] Implement the minimum migration and VAD state changes.
- [ ] Re-run focused tests and commit.

### Task 2: Supervised JSONL worker infrastructure

**Files:**
- Create: `src/openhuman/voice/workers/mod.rs`
- Create: `src/openhuman/voice/workers/process.rs`
- Create: `src/openhuman/voice/workers/protocol.rs`
- Modify: `src/openhuman/voice/mod.rs`

- [ ] Add failing protocol and lifecycle tests with a deterministic fake child.
- [ ] Verify timeout, malformed output, shutdown, and bounded restart failures.
- [ ] Implement a single-owner Tokio child process with request IDs,
  serialized writes, response matching, health state, and redacted logs.
- [ ] Run worker tests and commit.

### Task 3: Real Sherpa KWS gate

**Files:**
- Create: `scripts/voice/sherpa_kws_worker.py`
- Create: `src/openhuman/voice/workers/kws.rs`
- Modify: `src/openhuman/voice/always_on.rs`
- Modify: `src/openhuman/voice/types.rs`
- Modify: `src/openhuman/voice/ops.rs`

- [ ] Add failing tests for PCM frame encoding, wake confidence events,
  cooldown/reset behavior, and transcript fallback.
- [ ] Implement the Sherpa worker from the official streaming
  `KeywordSpotter` API and feed it existing 16 kHz microphone frames.
- [ ] Change always-on state to `keyword listening -> command capture ->
  processing -> keyword listening`.
- [ ] Expose KWS runtime/degraded status and timing without transcript PII.
- [ ] Run focused Rust and Python syntax tests and commit.

### Task 4: In-process Whisper command path

**Files:**
- Modify: `src/openhuman/voice/always_on.rs`
- Modify: `src/openhuman/inference/local/service/speech.rs`
- Modify: `src/openhuman/inference/voice/local_transcribe.rs`

- [ ] Add a failing test proving local always-on Whisper selects
  `LocalAiService::transcribe_with_prompt` when enabled.
- [ ] Add a failing test proving provider-factory dispatch remains in use for
  cloud and external providers.
- [ ] Implement WAV staging and in-process transcription with Marvi vocabulary
  prompt, retaining CLI fallback.
- [ ] Add backend and latency logs, run tests, and commit.

### Task 5: Warm PocketTTS worker

**Files:**
- Create: `scripts/voice/pockettts_worker.py`
- Create: `src/openhuman/voice/workers/pockettts.rs`
- Modify: `src/openhuman/inference/voice/local_speech.rs`

- [ ] Add failing tests for voice cache keys, Jane selection, output cleanup,
  request timeout, and CLI fallback.
- [ ] Implement a persistent `TTSModel` worker with cached catalog voice states.
- [ ] Route PocketTTS synthesis through the worker and retry once through the
  current CLI implementation after worker failure.
- [ ] Log cold start, voice-state load, synthesis, and total latency.
- [ ] Run focused tests and commit.

### Task 6: Setup, resources, and desktop diagnostics

**Files:**
- Modify installer/resource manifests discovered from current setup code.
- Modify `app/src/components/settings/panels/VoicePanel.tsx`
- Modify `app/src/utils/tauriCommands/voice.ts`
- Modify related locale and test files.

- [ ] Add failing installer/status tests for missing and installed worker
  dependencies and model assets.
- [ ] Package worker scripts and extend managed setup for `sherpa-onnx`,
  PocketTTS, and English KWS assets.
- [ ] Add runtime state and important VAD/KWS controls to desktop settings.
- [ ] Add all locale keys and focused Vitest coverage.
- [ ] Run i18n, typecheck, and focused UI tests; commit.

### Task 7: Verification and release handoff

- [ ] Run Rust formatting and focused voice tests.
- [ ] Run full Rust check where the local Windows toolchain permits.
- [ ] Run frontend typecheck, i18n checks, and voice settings tests.
- [ ] Run Python worker syntax checks and deterministic fake-worker tests.
- [ ] Inspect the complete diff for unrelated changes and secrets.
- [ ] Commit remaining integration changes and push the feature branch to the
  Marvii fork.

