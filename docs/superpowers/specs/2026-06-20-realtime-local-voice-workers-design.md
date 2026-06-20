# Real-Time Local Voice Workers Design

## Goal

Make OpenHuman's local voice path responsive and reliable on CPU-only Windows
desktops by using real Sherpa-ONNX keyword spotting, the existing in-process
Whisper engine for command transcription, and a warm PocketTTS process.

## Current Problems

- Always-on audio runs full `whisper-cli` before deciding whether a wake word
  was spoken. Each accepted utterance costs roughly five seconds.
- The setting named `wake_word_threshold` controls transcript similarity, not
  Sherpa KWS confidence.
- RMS segmentation frequently splits speech into bursts shorter than
  `vad_min_speech_ms`, so commands are discarded before transcription.
- PocketTTS launches a new Python process and reloads model state for every
  synthesis.
- Existing configuration can retain `Hey Tiny`, mismatched STT download URLs,
  and disabled diagnostics after upgrading to Marvii.

## Architecture

### Sherpa KWS worker

A supervised Python worker owns a Sherpa-ONNX `KeywordSpotter` and communicates
with Rust over newline-delimited JSON on stdin/stdout. Rust retains microphone
ownership and sends 16 kHz mono PCM frames to the worker. The worker emits only
keyword decisions and confidence metadata.

The worker is started lazily when always-on wake mode is enabled. It is
restarted after an unexpected exit with bounded backoff. When Sherpa, its model,
or the worker is unavailable, the pipeline falls back to the existing
transcript matcher and records the degraded state in logs and voice status.

After a wake event, Rust captures one command utterance, then stops command
capture after VAD hangover. It does not continuously submit background speech
to Whisper.

### Command STT

The accepted command WAV is sent through `LocalAiService::transcribe_with_prompt`
when the configured provider is local Whisper and `whisper_in_process` is
enabled. Other configured STT providers continue through the existing provider
factory. The CLI path remains a fallback if the in-process model fails.

The Marvi wake variants are supplied as an initial Whisper prompt. Raw command
text remains excluded from normal logs.

### PocketTTS worker

A supervised Python worker imports `pocket_tts`, loads `TTSModel` once, and
caches catalog voice states by voice name. Rust sends synthesis requests over
newline-delimited JSON and receives WAV bytes through a temporary output path.

Worker startup is lazy and serialized. Concurrent synthesis requests are
serialized by the worker because the model is CPU-bound and not assumed
thread-safe. A failed worker request falls back once to the existing
`pocket-tts generate` subprocess.

### Configuration and migration

On config load, legacy `Hey Tiny` is migrated to `Hey Marvi` only when the
Marvi variants are already present or the value is still the old default.
Marvi variants are normalized and deduplicated.

The STT download URL is derived from the selected preset instead of retaining a
different model's URL. Voice debug remains opt-in, but worker lifecycle,
backend choice, timings, and failures are always logged without raw speech.

Recommended VAD defaults use lower onset sensitivity and a short onset
confirmation window rather than counting only isolated above-threshold frames.
This prevents brief noise from waking capture while preserving connected speech
through natural low-energy phonemes.

## Desktop UX

Voice settings expose:

- Always-on wake mode
- Wake threshold
- Wake diagnostics
- VAD onset threshold
- Minimum command speech duration
- Hangover duration
- Runtime status for KWS, STT, and TTS warm workers

The notch reports `Listening`, `Waked`, and `Processing`. Wake mode remains
one-shot: one wake phrase authorizes one command and the pipeline returns to
keyword listening after dispatch.

## Packaging

The existing local-AI installer is extended to install `sherpa-onnx` and
`pocket-tts` into the managed Python environment and download the selected
English KWS model assets. Worker scripts ship as application resources.

No dependency is installed at desktop startup. Missing dependencies produce an
actionable setup state and preserve current fallbacks.

## Failure Handling

- KWS unavailable: transcript-based wake fallback.
- In-process Whisper load/transcribe failure: existing Whisper CLI fallback.
- PocketTTS worker unavailable or request failure: one-shot CLI fallback.
- Repeated worker failure: bounded restart attempts and degraded status, no
  tight restart loop.
- Shutdown: close worker stdin, wait briefly, then kill only the owned child.

## Testing

- Unit tests for VAD state transitions, one-wake/one-command behavior, config
  migration, worker protocol parsing, and provider fallback decisions.
- Integration tests using deterministic fake workers for lifecycle, restart,
  timeout, and concurrent request behavior.
- Existing factory and settings tests for provider and voice selection.
- Manual packaged Windows smoke test for microphone wake, command STT, Jane
  voice switching, warm second-request latency, and clean shutdown.

