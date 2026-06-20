#!/usr/bin/env python3
"""Persistent sherpa-onnx KWS worker using JSON lines over stdio."""

import argparse
import array
import base64
import ctypes
import json
import os
import site
import sys
import time
from pathlib import Path

if sys.platform == "win32":
    for root in [*site.getsitepackages(), site.getusersitepackages()]:
        dll_dir = Path(root) / "sherpa_onnx" / "lib"
        if dll_dir.is_dir():
            os.add_dll_directory(str(dll_dir))
            ctypes.WinDLL(str(dll_dir / "onnxruntime.dll"))

import sentencepiece as spm
import sherpa_onnx


def emit(payload):
    sys.stdout.write(json.dumps(payload, separators=(",", ":")) + "\n")
    sys.stdout.flush()


def build_keywords(model_dir, phrases):
    processor = spm.SentencePieceProcessor(model_file=str(model_dir / "bpe.model"))
    lines = []
    for phrase in phrases:
        normalized = " ".join(str(phrase).strip().upper().split())
        if normalized:
            lines.append(" ".join(processor.encode(normalized, out_type=str)))
    path = model_dir / "openhuman-keywords.txt"
    path.write_text("\n".join(dict.fromkeys(lines)) + "\n", encoding="utf-8")
    return path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", required=True)
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--keywords-json", required=True)
    args = parser.parse_args()

    model_dir = Path(args.model_dir)
    keywords_file = build_keywords(model_dir, json.loads(args.keywords_json))
    started = time.perf_counter()
    spotter = sherpa_onnx.KeywordSpotter(
        tokens=str(model_dir / "tokens.txt"),
        encoder=str(model_dir / "encoder-epoch-12-avg-2-chunk-16-left-64.onnx"),
        decoder=str(model_dir / "decoder-epoch-12-avg-2-chunk-16-left-64.onnx"),
        joiner=str(model_dir / "joiner-epoch-12-avg-2-chunk-16-left-64.onnx"),
        num_threads=2,
        max_active_paths=4,
        keywords_file=str(keywords_file),
        keywords_score=1.0,
        keywords_threshold=max(0.0, min(1.0, args.threshold)),
        num_trailing_blanks=1,
        provider="cpu",
    )
    stream = spotter.create_stream()
    emit({"type": "ready", "load_ms": round((time.perf_counter() - started) * 1000)})

    for line in sys.stdin:
        request = {}
        try:
            request = json.loads(line)
            request_id = request.get("id")
            if request.get("op") == "reset":
                spotter.reset_stream(stream)
                emit({"id": request_id, "ok": True})
                continue
            encoded = request.get("audio_f32le_base64") or ""
            samples = array.array("f")
            samples.frombytes(base64.b64decode(encoded))
            if sys.byteorder != "little":
                samples.byteswap()
            stream.accept_waveform(16000, samples)
            keyword = ""
            while spotter.is_ready(stream):
                spotter.decode_stream(stream)
                result = spotter.get_result(stream)
                if result:
                    keyword = str(result)
                    spotter.reset_stream(stream)
                    break
            emit({"id": request_id, "ok": True, "keyword": keyword})
        except Exception as exc:
            emit({"id": request.get("id"), "ok": False, "error": str(exc)})


if __name__ == "__main__":
    main()
