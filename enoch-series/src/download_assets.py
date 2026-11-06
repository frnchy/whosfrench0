#!/usr/bin/env python3
"""Fetch the clips, stills and music listed in an episode YAML into assets/.

Usage:  python src/download_assets.py episodes/episode_01.yaml

Files that already exist are skipped. If the CDN refuses a download (e.g. 403),
the script prints the list of files you must download by hand from
higgsfield.ai (generation history) and where to put them.
"""
import sys
import urllib.request
import urllib.error
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent


def fetch(url: str, dest: Path) -> str | None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return None
    req = urllib.request.Request(url, headers={"User-Agent": "enoch-series-pipeline/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r, open(dest.with_suffix(dest.suffix + ".part"), "wb") as f:
            while chunk := r.read(1 << 16):
                f.write(chunk)
        dest.with_suffix(dest.suffix + ".part").rename(dest)
        print(f"  ok   {dest.relative_to(ROOT)}")
        return None
    except (urllib.error.URLError, OSError) as e:
        dest.with_suffix(dest.suffix + ".part").unlink(missing_ok=True)
        return f"{dest.relative_to(ROOT)}  <-  {url}  ({e})"


def main(cfg_path: str) -> int:
    cfg = yaml.safe_load(open(cfg_path, encoding="utf-8"))
    jobs = []
    for s in cfg["shots"]:
        jobs.append((s["clip_url"], ROOT / s["clip"]))
        if s.get("still_url"):
            jobs.append((s["still_url"], ROOT / s["still"]))
    m = cfg.get("music", {})
    if m.get("url"):
        jobs.append((m["url"], ROOT / m["file"]))
    for x in cfg.get("extra_assets", []):
        jobs.append((x["url"], ROOT / x["file"]))

    failed = [err for url, dest in jobs if (err := fetch(url, dest))]
    if failed:
        print("\nCould not download these files. Download them manually from higgsfield.ai")
        print("(generation history) and save them at the paths shown:\n")
        for f in failed:
            print("  -", f)
        return 1
    print("All assets present.")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "episodes/episode_01.yaml"))
