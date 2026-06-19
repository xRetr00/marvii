#!/usr/bin/env python3
"""Persistent PocketTTS worker using JSON lines over stdio."""

import argparse
import json
import sys
import time
import wave

import numpy as np
from pocket_tts import TTSModel


def emit(payload):
    sys.stdout.write(json.dumps(payload, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def write_wav(path, sample_rate, audio):
    values = audio.detach().cpu().numpy().reshape(-1)
    pcm = (np.clip(values, -1.0, 1.0) * 32767.0).astype(np.int16)
    with wave.open(path, "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        output.writeframes(pcm.tobytes())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--language", default="english")
    args = parser.parse_args()

    started = time.perf_counter()
    model = TTSModel.load_model(language=args.language)
    voices = {}
    emit({"type": "ready", "load_ms": round((time.perf_counter() - started) * 1000)})

    for line in sys.stdin:
        request = {}
        try:
            request = json.loads(line)
            request_id = request.get("id")
            text = str(request["text"]).strip()
            voice = str(request.get("voice") or "jane").strip()
            output_path = str(request["output_path"])
            voice_started = time.perf_counter()
            cache_hit = voice in voices
            if not cache_hit:
                voices[voice] = model.get_state_for_audio_prompt(voice)
            voice_ms = round((time.perf_counter() - voice_started) * 1000)
            synth_started = time.perf_counter()
            audio = model.generate_audio(voices[voice], text)
            write_wav(output_path, model.sample_rate, audio)
            emit(
                {
                    "id": request_id,
                    "ok": True,
                    "cache_hit": cache_hit,
                    "voice_ms": voice_ms,
                    "synth_ms": round((time.perf_counter() - synth_started) * 1000),
                }
            )
        except Exception as exc:
            emit({"id": request.get("id"), "ok": False, "error": str(exc)})


if __name__ == "__main__":
    main()
