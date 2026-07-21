#!/usr/bin/env python3
"""
scripts/build_2000s_peak_ratings.py — derive per-player peak 2000s 2K overalls.

Reads the raw 2000s rating sources in data/nba2k_2000s_sources/ and emits
data/nba2k_2000s_peak_ratings.json: one record per player with the single
highest ("peak") NBA 2K overall they reached anywhere in the decade — the same
methodology as scripts/build_2010s_peak_ratings.py.

Sources (both are real in-game 2K ratings, not model predictions):
  - hoopshype_nba_2k1.json .. hoopshype_nba_2k10.json — full per-edition player
    lists for NBA 2K1 (2000-01) through NBA 2K10 (2009-10), fetched from
    hoopshype.com's NBA 2K ratings database (the data behind
    hoopshype.com/nba-2k/players/?game=<edition>).
  - maddenratings_*.json — the top-rated players per edition transcribed from
    maddenratings.weebly.com's per-game pages (NBA 2K1, 2K2, 2K3,
    ESPN NBA Basketball, ESPN NBA 2K5, 2K6..2K10). Shallower lists (22-65
    players each) but they cover several stars missing from hoopshype's
    archive (Ray Allen, Gary Payton, Scottie Pippen, Peja Stojakovic, ...).

The two sources reflect different roster snapshots of the same editions
(launch vs. later roster updates) and disagree by a few points for some
players; both values are real in-game overalls, and the peak-of-decade max
simply keeps the higher one. On NBA 2K10, where both are the same vintage,
they agree exactly on all 26 shared players.

Usage:
    python3 scripts/build_2000s_peak_ratings.py
"""
import json
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC_DIR = os.path.join(ROOT, "data", "nba2k_2000s_sources")
OUT_PATH = os.path.join(ROOT, "data", "nba2k_2000s_peak_ratings.json")

# hoopshype rows whose player attribution is wrong at the source: their
# database shows NBA 2K9/2K10 ratings under Grayson Allen (playerID 842296),
# who didn't enter the NBA until 2018. Dropped rather than re-attributed —
# Ray Allen's real 2000s ratings come from the maddenratings source instead.
HOOPSHYPE_BOGUS_PLAYER_IDS = {"842296"}

# Same person listed under different names across sources: hoopshype backfills
# a player's current legal name onto historical rows ("Metta World Peace" on
# 2K1-2K10 entries), while maddenratings keeps the era name ("Ron Artest").
# Credit all rows to the era name players.json uses, so the peak is the true
# max across both sources.
NAME_ALIASES = {
    "Metta World Peace": "Ron Artest",
}


def norm(name):
    import unicodedata
    d = unicodedata.normalize("NFD", name)
    d = "".join(c for c in d if unicodedata.category(c) != "Mn")
    return "".join(c for c in d.lower() if c.isalnum())


def main():
    # normalized-name -> {"name": display, "overall": peak}
    peak = {}

    def add(name, ovr):
        name = NAME_ALIASES.get(name, name)
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

    # hoopshype full per-edition lists
    for i in range(1, 11):
        path = os.path.join(SRC_DIR, f"hoopshype_nba_2k{i}.json")
        with open(path, encoding="utf-8") as f:
            for r in json.load(f):
                if r.get("playerID") in HOOPSHYPE_BOGUS_PLAYER_IDS:
                    continue
                add(r["name"], int(r["rating"]))

    # maddenratings top-player lists
    for fn in sorted(os.listdir(SRC_DIR)):
        if not fn.startswith("maddenratings_"):
            continue
        with open(os.path.join(SRC_DIR, fn), encoding="utf-8") as f:
            for r in json.load(f)["players"]:
                add(r["name"], int(r["rating"]))

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
