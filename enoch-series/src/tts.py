#!/usr/bin/env python3
"""Generate one narration file per shot from the texts in the episode YAML.

Usage:  python src/tts.py episodes/episode_01.yaml [--force]

Order of preference:
  1. A narration file that already exists (e.g. made with the ElevenLabs
     connector / web app) is kept as-is, unless --force is given.
  2. ElevenLabs API (env ELEVENLABS_API_KEY): deep French narrator voice,
     multilingual model, with character timestamps saved next to the mp3
     (shot_XX.json) so subtitles are word-accurate.
  3. edge-tts fallback (pip install edge-tts): fr-FR-HenriNeural, slower, lower.
"""
import asyncio
import base64
import json
import os
import sys
import urllib.request
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent


def eleven(text: str, dest: Path, voice: dict, key: str) -> None:
    url = (f"https://api.elevenlabs.io/v1/text-to-speech/{voice['elevenlabs_voice_id']}"
           "/with-timestamps?output_format=mp3_44100_192")
    body = {
        "text": text,
        "model_id": voice.get("elevenlabs_model", "eleven_multilingual_v2"),
        "language_code": "fr",
        "voice_settings": {"stability": 0.55, "similarity_boost": 0.8, "style": 0.25, "speed": 0.92},
    }
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                 headers={"xi-api-key": key, "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        data = json.load(r)
    dest.write_bytes(base64.b64decode(data["audio_base64"]))
    al = data.get("alignment") or {}
    if al:
        dest.with_suffix(".json").write_text(json.dumps({
            "characters": al["characters"],
            "start": al["character_start_times_seconds"],
            "end": al["character_end_times_seconds"],
        }, ensure_ascii=False))


def edge(text: str, dest: Path, voice: dict) -> None:
    import edge_tts  # type: ignore

    async def run():
        c = edge_tts.Communicate(text, voice.get("edge_voice", "fr-FR-HenriNeural"),
                                 rate=voice.get("edge_rate", "-10%"),
                                 pitch=voice.get("edge_pitch", "-6Hz"))
        await c.save(str(dest))
    asyncio.run(run())


def main(cfg_path: str, force: bool) -> int:
    cfg = yaml.safe_load(open(cfg_path, encoding="utf-8"))
    voice = cfg["voice"]
    key = os.environ.get("ELEVENLABS_API_KEY")
    for s in cfg["shots"]:
        dest = ROOT / s["narration"]
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists() and not force:
            print(f"  keep {dest.relative_to(ROOT)}")
            continue
        if key:
            eleven(s["text"], dest, voice, key)
            print(f"  elevenlabs {dest.relative_to(ROOT)}")
        else:
            print("  (no ELEVENLABS_API_KEY: using edge-tts fallback)")
            edge(s["text"], dest, voice)
            print(f"  edge-tts {dest.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    sys.exit(main(args[0] if args else "episodes/episode_01.yaml", "--force" in sys.argv))
