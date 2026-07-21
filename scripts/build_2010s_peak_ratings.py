#!/usr/bin/env python3
"""
scripts/build_2010s_peak_ratings.py — derive per-player peak 2010s 2K overalls.

Reads the raw 2010s rating sources in data/nba2k_2010s_sources/ and emits
data/nba2k_2010s_peak_ratings.json: one record per player with the single
highest ("peak") NBA 2K overall they reached anywhere in the decade.

Why peak: players.json stores one entry per player per decade, but 2K ratings
are per-season and swing a lot across ten years (Stephen Curry went ~86 -> 99).
The peak is the simplest single number that represents a player at their decade
best — the same spirit as an all-time roster.

Sources (both are real scraped 2K ratings, not model predictions):
  - miking98_2k13/2k14/2k15.txt — NBA 2K13-2K15 editions (2012-13 .. 2014-15),
    Python-tuple format: ((overall, "Name"), ...). From
    github.com/Miking98/NBA-2K-Player-Ratings
  - willyiamyu_2014-2020.csv — per-season overalls 2014-15 .. 2019-20
    (PLAYER,SEASON,overall). Trimmed from
    github.com/willyiamyu/nba2k_analysis (its `rankings` column).

Combined coverage: 2012-13 through 2019-20 (the 2010-11 and 2011-12 seasons are
not in either source).

Usage:
    python3 scripts/build_2010s_peak_ratings.py
"""
import csv
import json
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC_DIR = os.path.join(ROOT, "data", "nba2k_2010s_sources")
OUT_PATH = os.path.join(ROOT, "data", "nba2k_2010s_peak_ratings.json")

TUPLE_RE = re.compile(r'\((\d+),\s*"([^"]+)"\)')


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
            # keep the longest display name we've seen (usually the fullest)
            display = name
            if k in peak and len(peak[k]["name"]) > len(name):
                display = peak[k]["name"]
            peak[k] = {"name": display, "overall": ovr}
        elif k in peak and len(name) > len(peak[k]["name"]):
            peak[k]["name"] = name

    # Miking98 tuple files
    for fn in ("miking98_2k13.txt", "miking98_2k14.txt", "miking98_2k15.txt"):
        path = os.path.join(SRC_DIR, fn)
        with open(path, encoding="utf-8") as f:
            for m in TUPLE_RE.finditer(f.read()):
                add(m.group(2), int(m.group(1)))

    # willyiamyu per-season CSV
    with open(os.path.join(SRC_DIR, "willyiamyu_2014-2020.csv"), encoding="utf-8") as f:
        for row in csv.DictReader(f):
            try:
                add(row["PLAYER"], int(round(float(row["overall"]))))
            except (ValueError, TypeError, KeyError):
                continue

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
