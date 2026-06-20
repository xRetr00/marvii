# Sherpa KWS Debug Diagnostics Design

## Goal

Make wake-word debug logs useful for tuning the Marvii keyword variants without
claiming that sherpa-onnx exposes data it does not provide.

The diagnostics must show:

- The current candidate keyword.
- Tokens returned by sherpa-onnx.
- Token matching progress against configured keyword variants.
- A clearly labeled derived confidence estimate.
- Token timestamps when available.
- Existing audio and threshold context.

## Constraints

- Diagnostics run only when `voice_server.wake_word_debug` is enabled.
- Normal wake-word processing must not add logging or material CPU overhead.
- Failed checks are rate-limited to one summary per second.
- Actual detections are logged immediately.
- Logs must not describe a derived estimate as a model probability.
- Existing wake detection behavior, thresholds, and command routing remain
  unchanged.

## Sherpa Data Contract

The installed sherpa-onnx keyword spotter exposes:

- Detected keyword text through `get_result`.
- Result tokens through `tokens`.
- Token timestamps through `timestamps`.

It does not expose a calibrated keyword probability or confidence score.

The Python worker response will therefore include:

- `keyword`: Exact detected keyword, or an empty string.
- `tokens`: Exact tokens returned by sherpa-onnx.
- `timestamps`: Exact token timestamps returned by sherpa-onnx.
- `candidate`: The configured keyword variant with the best token-prefix match.
- `matched_tokens`: Number of candidate tokens matched in order.
- `total_tokens`: Number of tokens in the selected candidate.
- `token_progress`: `matched_tokens / total_tokens`, clamped to `0..1`.
- `confidence_estimate`: The same derived progress value, explicitly marked as
  an estimate rather than model confidence.

The worker will retain the normalized phrases and their SentencePiece tokens
when building the keyword file. Candidate matching will compare the currently
returned sherpa token sequence with each configured variant and select the
highest prefix overlap. Ties prefer the variant with the larger matched-token
count, then the shorter candidate.

## Rust Logging

The Rust worker response type will deserialize the additional diagnostic
fields with defaults so older workers remain compatible.

When debug mode is enabled, failed checks will log:

```text
wake_debug backend=sherpa detected=false candidate="HEY MARVII" tokens=["▁HEY","▁MAR"]
matched_tokens=2 total_tokens=3 token_progress=0.667
confidence_estimate=0.667 confidence_kind=derived_token_progress
timestamps=[...] threshold=0.500 batch_ms=100 rms=0.0248
```

Actual detections will log the same diagnostic fields immediately, together
with `detected=true` and the exact detected keyword.

Empty-token checks remain useful and truthful:

```text
candidate="" tokens=[] matched_tokens=0 total_tokens=0 token_progress=0.000
confidence_estimate=0.000 confidence_kind=derived_token_progress
```

## Performance

Candidate tokenization happens once during worker startup. Per audio request,
the worker performs bounded comparisons against the small configured variant
list. No second recognizer, model, or LLM is introduced.

Rust keeps the existing one-second rate limit for non-detections. Detection
logs bypass the rate limit.

## Error Handling

- Missing diagnostic fields deserialize to empty/zero defaults.
- Mismatched token and timestamp lengths are logged as provided and do not
  affect detection.
- Diagnostic calculation failures return empty diagnostics but do not fail the
  audio request.
- Worker startup and detection behavior remain unchanged if debug mode is off.

## Testing

Python tests will cover:

- Exact candidate selection.
- Partial token-prefix progress.
- Empty tokens.
- Tie-breaking across variants.
- Response serialization with exact and derived fields.

Rust tests will cover:

- Backward-compatible response deserialization.
- Formatting of failed and detected diagnostic summaries.
- Explicit `confidence_kind=derived_token_progress` labeling.
- Zero diagnostics for legacy or empty worker responses.

Existing wake-word and voice tests must continue to pass.
