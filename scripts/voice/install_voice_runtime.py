#!/usr/bin/env python3
"""Install OpenHuman's managed CPU voice runtime and Sherpa KWS model."""

import argparse
import shutil
import subprocess
import sys
import tarfile
import tempfile
import urllib.request
import venv
from pathlib import Path

MODEL_NAME = "sherpa-onnx-kws-zipformer-gigaspeech-3.3M-2024-01-01"
MODEL_URL = (
    "https://github.com/k2-fsa/sherpa-onnx/releases/download/kws-models/"
    f"{MODEL_NAME}.tar.bz2"
)


def safe_extract(archive, destination):
    destination = destination.resolve()
    with tarfile.open(archive, "r:bz2") as handle:
        for member in handle.getmembers():
            target = (destination / member.name).resolve()
            if target != destination and destination not in target.parents:
                raise RuntimeError("KWS archive contains an unsafe path")
        handle.extractall(destination)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    args = parser.parse_args()

    root = Path(args.root)
    runtime = root / "bin" / "voice-python"
    python = runtime / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
    if not python.is_file():
        venv.EnvBuilder(with_pip=True, clear=False).create(runtime)
    subprocess.run(
        [
            str(python),
            "-m",
            "pip",
            "install",
            "--upgrade",
            "sherpa-onnx==1.13.3",
            "sentencepiece",
            "pocket-tts",
        ],
        check=True,
    )

    model_parent = root / "models" / "local-ai" / "kws"
    model_dir = model_parent / MODEL_NAME
    required = model_dir / "encoder-epoch-12-avg-2-chunk-16-left-64.onnx"
    if not required.is_file():
        model_parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix="openhuman-kws-") as temp_name:
            temp = Path(temp_name)
            archive = temp / f"{MODEL_NAME}.tar.bz2"
            urllib.request.urlretrieve(MODEL_URL, archive)
            safe_extract(archive, temp)
            extracted = temp / MODEL_NAME
            if model_dir.exists():
                shutil.rmtree(model_dir)
            shutil.move(str(extracted), str(model_dir))

    print("voice runtime installed")


if __name__ == "__main__":
    main()
