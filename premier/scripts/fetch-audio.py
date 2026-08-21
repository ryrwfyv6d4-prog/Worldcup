#!/usr/bin/env python3
"""
Download the 30-second previews in hat-a-audio.json and write them as CODE.mp3.

Usage:
    python3 fetch-audio.py                    # default pick per club
    python3 fetch-audio.py --alt MCI NEW      # use the alt track for those codes
    python3 fetch-audio.py --out ./public/audio

Requires ffmpeg on PATH for the m4a to mp3 conversion. Without ffmpeg the
script falls back to writing CODE.m4a, which browsers play fine anyway.
"""

import argparse
import json
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent


def download(url: str, dest: Path) -> None:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r, dest.open("wb") as f:
        shutil.copyfileobj(r, f)


def to_mp3(src: Path, dest: Path) -> bool:
    if not shutil.which("ffmpeg"):
        return False
    result = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error",
         "-i", str(src),
         "-codec:a", "libmp3lame", "-b:a", "192k",
         # normalise so no single club is twice as loud as the rest
         "-filter:a", "loudnorm=I=-16:TP=-1.5:LRA=11",
         str(dest)],
        capture_output=True,
    )
    return result.returncode == 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--manifest", default=str(HERE / "hat-a-audio.json"))
    ap.add_argument("--out", default=str(HERE / "audio"))
    ap.add_argument("--alt", nargs="*", default=[],
                    help="club codes that should use alt_previewUrl")
    args = ap.parse_args()

    manifest = json.loads(Path(args.manifest).read_text())
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    tmp_dir = out_dir / ".tmp"
    tmp_dir.mkdir(exist_ok=True)

    alts = {c.upper() for c in args.alt}
    failures = []

    for entry in manifest["tracks"]:
        code = entry["code"]
        use_alt = code in alts and entry.get("alt_previewUrl")
        url = entry["alt_previewUrl"] if use_alt else entry["previewUrl"]
        label = entry.get("alt_track") if use_alt else f'{entry["track"]} ({entry["artist"]})'

        raw = tmp_dir / f"{code}.m4a"
        try:
            download(url, raw)
        except Exception as exc:
            print(f"  {code}  FAILED  {exc}")
            failures.append(code)
            continue

        target = out_dir / f"{code}.mp3"
        if to_mp3(raw, target):
            print(f"  {code}  {target.name}  {label}")
        else:
            fallback = out_dir / f"{code}.m4a"
            shutil.move(str(raw), str(fallback))
            print(f"  {code}  {fallback.name} (no ffmpeg)  {label}")

    shutil.rmtree(tmp_dir, ignore_errors=True)

    if failures:
        print(f"\nFailed: {', '.join(failures)}")
        return 1
    print(f"\nDone. Files in {out_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
