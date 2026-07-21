#!/usr/bin/env python3
"""
scripts/build_1980s_peak_ratings.py — derive per-player peak 1980s 2K overalls.

Same methodology as scripts/build_1960s_peak_ratings.py / build_1970s_peak_ratings.py:
NBA 2K didn't exist before 1999, so this reads 2K's classic/all-time roster
ratings (Classic Teams, All-Time Teams, All-Decade Teams) and keeps each
player's single highest ("peak") overall across every such appearance.

Source: data/nba2k_1980s_sources/2kratings_websearch_compiled.json, compiled
via targeted web search against 2kratings.com (same access constraints as the
1960s/1970s files — see data/README.md for the full Cloudflare/proxy-allowlist
caveat). Every row is a real number attributed to a specific 2kratings.com
roster page, never a model guess.

Usage:
    python3 scripts/build_1980s_peak_ratings.py
"""
import json
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC_DIR = os.path.join(ROOT, "data", "nba2k_1980s_sources")
OUT_PATH = os.path.join(ROOT, "data", "nba2k_1980s_peak_ratings.json")


def norm(name):
    import unicodedata
    d = unicodedata.normalize("NFD", name)
    d = "".join(c for c in d if unicodedata.category(c) != "Mn")
    return "".join(c for c in d.lower() if c.isalnum())


def main():
    # normalized-name -> {"name": display, "overall": peak}
    peak = {}

    def add(name, ovr):
        k = norm(name)
        if not k:
            return
        if k not in peak or ovr > peak[k]["overall"]:
            display = name
            if k in peak and len(peak[k]["name"]) > len(name):
                display = peak[k]["name"]
            peak[k] = {"name": display, "overall": ovr}
        elif k in peak and len(name) > len(peak[k]["name"]):
            peak[k]["name"] = name

    for fn in sorted(os.listdir(SRC_DIR)):
        if not fn.endswith(".json"):
            continue
        with open(os.path.join(SRC_DIR, fn), encoding="utf-8") as f:
            for r in json.load(f):
                add(r["name"], int(r["overallAttribute"]))

    records = sorted(
        ({"name": v["name"], "overallAttribute": v["overall"]} for v in peak.values()),
        key=lambda r: (-r["overallAttribute"], r["name"]),
    )
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)
        f.write("\n")

    print(f"Distinct players: {len(records)}")
    print(f"Overall range: {records[-1]['overallAttribute']} - {records[0]['overallAttribute']}")
    print(f"Wrote {OUT_PATH}")


if __name__ == "__main__":
    main()
