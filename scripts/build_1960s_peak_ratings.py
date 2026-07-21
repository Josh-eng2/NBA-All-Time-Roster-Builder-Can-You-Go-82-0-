#!/usr/bin/env python3
"""
scripts/build_1960s_peak_ratings.py — derive per-player peak 1960s 2K overalls.

NBA 2K didn't exist before 1999, so 1960s players have no in-era rating (unlike
the 2000s/2010s pipelines, which draw on per-season ratings from editions that
shipped during those actual seasons). Instead this reads 2K's *classic/all-time
roster* ratings — the overalls 2K assigns these legends on Classic Teams
(specific vintage-season rosters, e.g. "1964-65 Boston Celtics"), All-Time Team
rosters (a franchise's greatest players across its whole history), and
All-Decade Team rosters (the league's best at a given decade) — and keeps each
player's single highest ("peak") overall across every such appearance.

Source: data/nba2k_1960s_sources/2kratings_websearch_compiled.json, one record
per (player, roster) appearance with `name` + `overallAttribute` + a `source`
note (which roster/NBA 2K edition it's from). Compiled via targeted web search
against 2kratings.com, NOT a direct scrape: the site sits behind Cloudflare
bot-management that blocks both plain HTTP requests (interactive JS challenge)
and headless-browser automation (hard connection reset), so unlike the
2000s/2010s sources this file has no bulk per-edition export to point to.
Every row is a real number attributed to a specific 2kratings.com roster page
surfaced by search, never a model guess; see data/README.md for the full
caveat and the resulting lower confidence/coverage versus the scraped decades.

Usage:
    python3 scripts/build_1960s_peak_ratings.py
"""
import json
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SRC_DIR = os.path.join(ROOT, "data", "nba2k_1960s_sources")
OUT_PATH = os.path.join(ROOT, "data", "nba2k_1960s_peak_ratings.json")


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
