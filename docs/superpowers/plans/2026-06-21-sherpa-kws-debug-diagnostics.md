# Sherpa KWS Debug Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich debug-only Sherpa wake-word logs with exact tokens/timestamps plus candidate progress and an explicitly derived confidence estimate.

**Architecture:** Add a dependency-free Python helper that retains configured keyword variants and calculates token-prefix diagnostics. Extend the existing JSON-lines KWS worker response with those fields, then deserialize and format them in Rust without changing wake detection, thresholds, or command routing. Failed checks remain rate-limited to one log per second; detections log immediately.

**Tech Stack:** Python 3.11, `sentencepiece`, `sherpa-onnx`, Rust, Serde, Tokio, Python `unittest`, Rust unit tests.

---

## File Structure

- Create `scripts/voice/kws_diagnostics.py`: pure keyword variant and token-progress calculations; no Sherpa imports.
- Create `scripts/voice/test_kws_diagnostics.py`: direct unit tests for matching, tie-breaking, empty input, and response fields.
- Modify `scripts/voice/sherpa_kws_worker.py`: retain normalized keyword variants, read Sherpa tokens/timestamps, and emit diagnostics.
- Modify `src/openhuman/voice/workers/process.rs`: add backward-compatible diagnostic fields to `WorkerResponse` and test deserialization.
- Modify `src/openhuman/voice/always_on.rs`: format rate-limited non-detection and immediate detection logs with exact and derived fields.

### Task 1: Pure Keyword Diagnostic Matcher

**Files:**
- Create: `scripts/voice/kws_diagnostics.py`
- Create: `scripts/voice/test_kws_diagnostics.py`

- [ ] **Step 1: Write failing tests for candidate matching**

Create `scripts/voice/test_kws_diagnostics.py`:

```python
import unittest

from kws_diagnostics import KeywordVariant, build_diagnostics


class KwsDiagnosticsTests(unittest.TestCase):
    def setUp(self):
        self.variants = [
            KeywordVariant("HEY MARVII", ("▁HEY", "▁MAR", "VII")),
            KeywordVariant("MARVI", ("▁MAR", "VI")),
            KeywordVariant("HEY MARVY", ("▁HEY", "▁MAR", "VY")),
        ]

    def test_exact_candidate_reports_full_progress(self):
        result = build_diagnostics(["▁HEY", "▁MAR", "VII"], self.variants)
        self.assertEqual(result["candidate"], "HEY MARVII")
        self.assertEqual(result["matched_tokens"], 3)
        self.assertEqual(result["total_tokens"], 3)
        self.assertEqual(result["token_progress"], 1.0)
        self.assertEqual(result["confidence_estimate"], 1.0)

    def test_partial_tokens_select_best_prefix_candidate(self):
        result = build_diagnostics(["▁HEY", "▁MAR"], self.variants)
        self.assertEqual(result["candidate"], "HEY MARVII")
        self.assertEqual(result["matched_tokens"], 2)
        self.assertEqual(result["total_tokens"], 3)
        self.assertAlmostEqual(result["token_progress"], 2 / 3)

    def test_empty_tokens_return_zero_diagnostics(self):
        result = build_diagnostics([], self.variants)
        self.assertEqual(
            result,
            {
                "candidate": "",
                "matched_tokens": 0,
                "total_tokens": 0,
                "token_progress": 0.0,
                "confidence_estimate": 0.0,
            },
        )

    def test_tie_prefers_more_matches_then_shorter_candidate(self):
        variants = [
            KeywordVariant("LONG", ("A", "B", "C", "D")),
            KeywordVariant("SHORT", ("A", "B", "C")),
            KeywordVariant("ONE", ("A",)),
        ]
        result = build_diagnostics(["A", "B"], variants)
        self.assertEqual(result["candidate"], "SHORT")
        self.assertEqual(result["matched_tokens"], 2)
        self.assertEqual(result["total_tokens"], 3)

    def test_non_prefix_tokens_do_not_claim_progress(self):
        result = build_diagnostics(["NOISE", "▁MAR"], self.variants)
        self.assertEqual(result["candidate"], "")
        self.assertEqual(result["matched_tokens"], 0)
        self.assertEqual(result["confidence_estimate"], 0.0)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
python scripts/voice/test_kws_diagnostics.py
```

Expected: import failure because `kws_diagnostics.py` does not exist.

- [ ] **Step 3: Implement the pure matcher**

Create `scripts/voice/kws_diagnostics.py`:

```python
"""Pure diagnostic helpers for the Sherpa keyword worker."""

from dataclasses import dataclass
from typing import Iterable, Sequence


@dataclass(frozen=True)
class KeywordVariant:
    phrase: str
    tokens: tuple[str, ...]


def _prefix_matches(observed: Sequence[str], expected: Sequence[str]) -> int:
    matched = 0
    for actual, wanted in zip(observed, expected):
        if actual != wanted:
            break
        matched += 1
    return matched


def build_diagnostics(
    observed_tokens: Iterable[str],
    variants: Sequence[KeywordVariant],
) -> dict:
    observed = tuple(str(token) for token in observed_tokens)
    if not observed:
        return {
            "candidate": "",
            "matched_tokens": 0,
            "total_tokens": 0,
            "token_progress": 0.0,
            "confidence_estimate": 0.0,
        }

    best = None
    best_rank = None
    for variant in variants:
        total = len(variant.tokens)
        if total == 0:
            continue
        matched = _prefix_matches(observed, variant.tokens)
        if matched == 0:
            continue
        progress = min(1.0, matched / total)
        rank = (progress, matched, -total)
        if best_rank is None or rank > best_rank:
            best = (variant, matched, total, progress)
            best_rank = rank

    if best is None:
        return {
            "candidate": "",
            "matched_tokens": 0,
            "total_tokens": 0,
            "token_progress": 0.0,
            "confidence_estimate": 0.0,
        }

    variant, matched, total, progress = best
    return {
        "candidate": variant.phrase,
        "matched_tokens": matched,
        "total_tokens": total,
        "token_progress": progress,
        "confidence_estimate": progress,
    }
```

- [ ] **Step 4: Run tests and verify GREEN**

Run:

```powershell
python scripts/voice/test_kws_diagnostics.py
```

Expected: `Ran 5 tests ... OK`.

- [ ] **Step 5: Commit the pure matcher**

```powershell
git add scripts/voice/kws_diagnostics.py scripts/voice/test_kws_diagnostics.py
git commit -m "test(voice): add KWS diagnostic matcher"
```

### Task 2: Enrich the Sherpa Worker Protocol

**Files:**
- Modify: `scripts/voice/sherpa_kws_worker.py`
- Modify: `scripts/voice/test_kws_diagnostics.py`

- [ ] **Step 1: Add a failing response-composition test**

Extend `scripts/voice/test_kws_diagnostics.py` imports:

```python
from kws_diagnostics import KeywordVariant, build_diagnostics, diagnostic_response
```

Add:

```python
    def test_response_contains_exact_sherpa_and_derived_fields(self):
        result = diagnostic_response(
            request_id=7,
            keyword="HEY MARVII",
            tokens=["▁HEY", "▁MAR", "VII"],
            timestamps=[0.1, 0.2, 0.3],
            variants=self.variants,
        )
        self.assertEqual(result["id"], 7)
        self.assertTrue(result["ok"])
        self.assertEqual(result["keyword"], "HEY MARVII")
        self.assertEqual(result["tokens"], ["▁HEY", "▁MAR", "VII"])
        self.assertEqual(result["timestamps"], [0.1, 0.2, 0.3])
        self.assertEqual(result["candidate"], "HEY MARVII")
        self.assertEqual(result["matched_tokens"], 3)
        self.assertEqual(result["confidence_estimate"], 1.0)
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
python scripts/voice/test_kws_diagnostics.py
```

Expected: import failure for `diagnostic_response`.

- [ ] **Step 3: Add response composition**

Append to `scripts/voice/kws_diagnostics.py`:

```python
def diagnostic_response(
    request_id,
    keyword,
    tokens,
    timestamps,
    variants,
):
    exact_tokens = [str(token) for token in tokens]
    exact_timestamps = [float(timestamp) for timestamp in timestamps]
    return {
        "id": request_id,
        "ok": True,
        "keyword": str(keyword),
        "tokens": exact_tokens,
        "timestamps": exact_timestamps,
        **build_diagnostics(exact_tokens, variants),
    }
```

- [ ] **Step 4: Modify keyword-file construction to retain variants**

In `scripts/voice/sherpa_kws_worker.py`, import:

```python
from kws_diagnostics import KeywordVariant, diagnostic_response
```

Replace `build_keywords` with:

```python
def build_keywords(model_dir, phrases):
    processor = spm.SentencePieceProcessor(model_file=str(model_dir / "bpe.model"))
    variants = []
    encoded_lines = []
    seen = set()
    for phrase in phrases:
        normalized = " ".join(str(phrase).strip().upper().split())
        if not normalized:
            continue
        tokens = tuple(processor.encode(normalized, out_type=str))
        encoded = " ".join(tokens)
        if not encoded or encoded in seen:
            continue
        seen.add(encoded)
        variants.append(KeywordVariant(normalized, tokens))
        encoded_lines.append(encoded)
    path = model_dir / "openhuman-keywords.txt"
    path.write_text("\n".join(encoded_lines) + "\n", encoding="utf-8")
    return path, variants
```

Update startup:

```python
keywords_file, keyword_variants = build_keywords(
    model_dir, json.loads(args.keywords_json)
)
```

- [ ] **Step 5: Emit exact Sherpa fields and derived diagnostics**

Replace the worker decode/emit block with:

```python
            keyword = ""
            tokens = []
            timestamps = []
            while spotter.is_ready(stream):
                spotter.decode_stream(stream)
                keyword = str(spotter.get_result(stream))
                tokens = list(spotter.tokens(stream))
                timestamps = list(spotter.timestamps(stream))
                if keyword:
                    spotter.reset_stream(stream)
                    break
            try:
                response = diagnostic_response(
                    request_id=request_id,
                    keyword=keyword,
                    tokens=tokens,
                    timestamps=timestamps,
                    variants=keyword_variants,
                )
            except Exception:
                response = {
                    "id": request_id,
                    "ok": True,
                    "keyword": keyword,
                    "tokens": tokens,
                    "timestamps": timestamps,
                    "candidate": "",
                    "matched_tokens": 0,
                    "total_tokens": 0,
                    "token_progress": 0.0,
                    "confidence_estimate": 0.0,
                }
            emit(response)
```

This fallback is diagnostic-only: a calculation failure must not fail wake detection.

- [ ] **Step 6: Run Python tests**

Run:

```powershell
python scripts/voice/test_kws_diagnostics.py
python -m py_compile scripts/voice/kws_diagnostics.py scripts/voice/sherpa_kws_worker.py
```

Expected: six tests pass and both files compile.

- [ ] **Step 7: Commit worker enrichment**

```powershell
git add scripts/voice/kws_diagnostics.py scripts/voice/test_kws_diagnostics.py scripts/voice/sherpa_kws_worker.py
git commit -m "feat(voice): expose Sherpa KWS token diagnostics"
```

### Task 3: Extend Rust Worker Response Safely

**Files:**
- Modify: `src/openhuman/voice/workers/process.rs`

- [ ] **Step 1: Add failing backward-compatibility tests**

Append a test module to `src/openhuman/voice/workers/process.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::WorkerResponse;

    #[test]
    fn worker_response_defaults_missing_kws_diagnostics() {
        let response: WorkerResponse =
            serde_json::from_str(r#"{"id":1,"ok":true,"keyword":""}"#).unwrap();
        assert!(response.tokens.is_empty());
        assert!(response.timestamps.is_empty());
        assert_eq!(response.candidate, "");
        assert_eq!(response.matched_tokens, 0);
        assert_eq!(response.total_tokens, 0);
        assert_eq!(response.token_progress, 0.0);
        assert_eq!(response.confidence_estimate, 0.0);
    }

    #[test]
    fn worker_response_deserializes_kws_diagnostics() {
        let response: WorkerResponse = serde_json::from_str(
            r#"{
                "id":2,
                "ok":true,
                "keyword":"HEY MARVII",
                "tokens":["▁HEY","▁MAR","VII"],
                "timestamps":[0.1,0.2,0.3],
                "candidate":"HEY MARVII",
                "matched_tokens":3,
                "total_tokens":3,
                "token_progress":1.0,
                "confidence_estimate":1.0
            }"#,
        )
        .unwrap();
        assert_eq!(response.tokens, vec!["▁HEY", "▁MAR", "VII"]);
        assert_eq!(response.timestamps, vec![0.1, 0.2, 0.3]);
        assert_eq!(response.candidate, "HEY MARVII");
        assert_eq!(response.matched_tokens, 3);
        assert_eq!(response.total_tokens, 3);
        assert_eq!(response.token_progress, 1.0);
        assert_eq!(response.confidence_estimate, 1.0);
    }
}
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
cargo test -p openhuman openhuman::voice::workers::process::tests --lib
```

Expected: compile failures because the diagnostic fields do not exist.

- [ ] **Step 3: Add backward-compatible fields**

Add to `WorkerResponse` after `keyword`:

```rust
    #[serde(default)]
    pub tokens: Vec<String>,
    #[serde(default)]
    pub timestamps: Vec<f32>,
    #[serde(default)]
    pub candidate: String,
    #[serde(default)]
    pub matched_tokens: usize,
    #[serde(default)]
    pub total_tokens: usize,
    #[serde(default)]
    pub token_progress: f32,
    #[serde(default)]
    pub confidence_estimate: f32,
```

- [ ] **Step 4: Run tests and verify GREEN**

Run:

```powershell
cargo test -p openhuman openhuman::voice::workers::process::tests --lib
```

Expected: both tests pass.

- [ ] **Step 5: Commit the protocol contract**

```powershell
git add src/openhuman/voice/workers/process.rs
git commit -m "feat(voice): deserialize KWS debug diagnostics"
```

### Task 4: Format and Emit Debug-Only Wake Diagnostics

**Files:**
- Modify: `src/openhuman/voice/always_on.rs`

- [ ] **Step 1: Add failing formatter tests**

Inside the existing `#[cfg(test)] mod tests` in `src/openhuman/voice/always_on.rs`, import `WorkerResponse` and add:

```rust
    #[test]
    fn kws_debug_summary_labels_derived_confidence() {
        let response = WorkerResponse {
            id: Some(1),
            ok: true,
            keyword: String::new(),
            tokens: vec!["▁HEY".into(), "▁MAR".into()],
            timestamps: vec![0.1, 0.2],
            candidate: "HEY MARVII".into(),
            matched_tokens: 2,
            total_tokens: 3,
            token_progress: 2.0 / 3.0,
            confidence_estimate: 2.0 / 3.0,
            error: None,
            load_ms: None,
            cache_hit: None,
            voice_ms: None,
            synth_ms: None,
            kind: None,
        };
        let summary = format_kws_debug(&response, false, 0.5, 0.0248);
        assert!(summary.contains("detected=false"));
        assert!(summary.contains("candidate=\"HEY MARVII\""));
        assert!(summary.contains("matched_tokens=2 total_tokens=3"));
        assert!(summary.contains("token_progress=0.667"));
        assert!(summary.contains("confidence_estimate=0.667"));
        assert!(summary.contains("confidence_kind=derived_token_progress"));
        assert!(summary.contains("threshold=0.500"));
        assert!(summary.contains("rms=0.0248"));
    }

    #[test]
    fn kws_debug_summary_handles_legacy_empty_response() {
        let response: WorkerResponse =
            serde_json::from_str(r#"{"id":1,"ok":true,"keyword":""}"#).unwrap();
        let summary = format_kws_debug(&response, false, 0.5, 0.0);
        assert!(summary.contains("candidate=\"\""));
        assert!(summary.contains("tokens=[]"));
        assert!(summary.contains("matched_tokens=0 total_tokens=0"));
        assert!(summary.contains("confidence_estimate=0.000"));
    }
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```powershell
cargo test -p openhuman openhuman::voice::always_on::tests::kws_debug_summary --lib
```

Expected: compile failure because `format_kws_debug` does not exist.

- [ ] **Step 3: Add the formatter**

Add near the wake-word helper functions:

```rust
fn format_kws_debug(
    response: &crate::openhuman::voice::workers::WorkerResponse,
    detected: bool,
    threshold: f32,
    rms: f32,
) -> String {
    format!(
        "{LOG_PREFIX} wake_debug backend=sherpa detected={detected} keyword={:?} \
         candidate={:?} tokens={:?} timestamps={:?} matched_tokens={} total_tokens={} \
         token_progress={:.3} confidence_estimate={:.3} \
         confidence_kind=derived_token_progress threshold={threshold:.3} \
         batch_ms=100 rms={rms:.4}",
        response.keyword,
        response.candidate,
        response.tokens,
        response.timestamps,
        response.matched_tokens,
        response.total_tokens,
        response.token_progress.clamp(0.0, 1.0),
        response.confidence_estimate.clamp(0.0, 1.0),
    )
}
```

- [ ] **Step 4: Replace detection and non-detection log messages**

For a detected keyword:

```rust
                            Ok(response) if !response.keyword.is_empty() => {
                                wake_armed = true;
                                wake_armed_at = Some(std::time::Instant::now());
                                seg.reset();
                                utterance.clear();
                                utterance.extend(kws_preroll.iter().copied());
                                if config.voice_server.wake_word_debug {
                                    log::info!(
                                        "{}",
                                        format_kws_debug(
                                            &response,
                                            true,
                                            config.voice_server.wake_word_threshold,
                                            rms,
                                        )
                                    );
                                } else {
                                    log::info!(
                                        "{LOG_PREFIX} kws detected keyword_len={} threshold={:.3}",
                                        response.keyword.len(),
                                        config.voice_server.wake_word_threshold
                                    );
                                }
                                notch_status("Waked", 3000);
                            }
```

For a non-detection, preserve the existing one-second gate:

```rust
                            Ok(response) => {
                                if config.voice_server.wake_word_debug
                                    && last_kws_debug.elapsed() >= Duration::from_secs(1)
                                {
                                    log::info!(
                                        "{}",
                                        format_kws_debug(
                                            &response,
                                            false,
                                            config.voice_server.wake_word_threshold,
                                            rms,
                                        )
                                    );
                                    last_kws_debug = std::time::Instant::now();
                                }
                                continue;
                            }
```

- [ ] **Step 5: Run focused Rust tests**

Run:

```powershell
cargo test -p openhuman openhuman::voice::always_on::tests::kws_debug_summary --lib
cargo test -p openhuman openhuman::voice::workers::process::tests --lib
```

Expected: all focused tests pass.

- [ ] **Step 6: Commit Rust logging**

```powershell
git add src/openhuman/voice/always_on.rs
git commit -m "feat(voice): log KWS candidate progress in debug mode"
```

### Task 5: End-to-End Verification

**Files:**
- Verify only; no planned source changes.

- [ ] **Step 1: Run all new Python tests and compilation**

```powershell
python scripts/voice/test_kws_diagnostics.py
python -m py_compile scripts/voice/kws_diagnostics.py scripts/voice/sherpa_kws_worker.py
```

Expected: six tests pass; compilation exits zero.

- [ ] **Step 2: Run voice-focused Rust tests**

```powershell
cargo test -p openhuman openhuman::voice::workers::process::tests --lib
cargo test -p openhuman openhuman::voice::always_on::tests --lib
```

Expected: all tests pass. If the local Windows MSVC toolchain blocks linking, capture the exact toolchain error and do not describe Rust verification as passed.

- [ ] **Step 3: Run formatting checks**

```powershell
cargo fmt --all --check
python -m py_compile scripts/voice/kws_diagnostics.py scripts/voice/sherpa_kws_worker.py
git diff --check
```

Expected: all commands exit zero.

- [ ] **Step 4: Run the desktop compile and existing focused voice UI test**

```powershell
pnpm --filter openhuman-app compile
pnpm --filter openhuman-app test --run src/features/human/MicComposer.test.tsx
```

Expected: TypeScript compilation succeeds and all MicComposer tests pass, proving the pre-existing push-to-talk fix remains intact.

- [ ] **Step 5: Perform a real debug smoke test**

Enable Wake Word Debug in the desktop Voice settings, restart the app, say partial and complete variants such as `Hey Marvii`, `Marvi`, and `Hey Marvy`, then inspect:

```powershell
rg -n "wake_debug backend=sherpa" "$env:USERPROFILE\\.openhuman\\logs\\openhuman.$(Get-Date -Format yyyy-MM-dd).log" |
  Select-Object -Last 30
```

Expected:

- Failed checks appear no more than once per second.
- Lines contain `candidate`, `tokens`, `timestamps`, `matched_tokens`, `total_tokens`, `token_progress`, `confidence_estimate`, and `confidence_kind=derived_token_progress`.
- A real detection logs immediately with `detected=true`.
- Debug off returns to the compact detection-only logging path.

- [ ] **Step 6: Review the final diff**

```powershell
git diff --check
git status --short --branch
git log -5 --oneline
```

Confirm only the planned KWS files plus the already-present push-to-talk files are modified, and no unrelated changes were introduced.
