#!/usr/bin/env python3
"""
scripts/match_2k_overalls.py — stamp real NBA 2K overalls onto current-era
players.json entries.

Reads a current-roster NBA 2K ratings file (see data/nba2k_current_ratings.json)
and writes a `twoKOverall` field onto every matching **2020s-decade** entry in
players.json. It never touches ppg/rpg/apg/spg/bpg or the stats-derived
`rating`; it only adds the one field.

Why 2020s only: an NBA 2K overall is a *current-season* number. It describes a
player as they are now, so it can only be applied to the current-era (2020s)
bucket. Applying today's rating to a player's 1990s or 2000s stint would be
historically wrong, so those entries are deliberately left without a 2K overall.

Usage:
    python3 scripts/match_2k_overalls.py data/nba2k_current_ratings.json
    python3 scripts/match_2k_overalls.py data/nba2k_current_ratings.json --report out.json

After running, regenerate the inlined DB the game ships:
    node scripts/inline_players.js
    node scripts/validate_players.js
"""
import json
import os
import sys
import unicodedata

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
JSON_PATH = os.path.join(ROOT, "players.json")

# Only entries in this decade bucket get a 2K overall (see module docstring).
TARGET_DECADE = "2020s"

# players.json display name -> NBA 2K roster name, for the ones that differ by
# more than punctuation/spacing (nicknames, added words, suffixes). Pure
# apostrophe/spacing variants (De'Andre, R.J., C.J.) are handled by normalize().
NAME_CORRECTIONS = {
    "Lu Dort": "Luguentz Dort",
    "Herb Jones": "Herbert Jones",
    "Terry Rozier": "Terry Rozier III",
}


def normalize(name):
    """Lowercase and strip accents, punctuation, and whitespace, so spacing
    and punctuation differences collapse away: 'De’Andre Hunter',
    'DeAndre Hunter', 'R.J. Barrett' and 'RJ Barrett' all compare equal."""
    decomposed = unicodedata.normalize("NFD", name)
    stripped = "".join(c for c in decomposed if unicodedata.category(c) != "Mn")
    return "".join(c for c in stripped.lower() if c.isalnum())


def load_2k_ratings(path):
    with open(path, encoding="utf-8") as f:
        records = json.load(f)
    lookup = {}
    for r in records:
        name = r.get("name")
        ovr = r.get("overallAttribute")
        if not name or ovr is None:
            continue
        lookup[normalize(name)] = int(ovr)
    return lookup


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit("Usage: python3 scripts/match_2k_overalls.py <2k_ratings.json> [--report out.json]")
    ratings_path = args[0]
    report_path = None
    if "--report" in sys.argv:
        report_path = sys.argv[sys.argv.index("--report") + 1]

    ratings = load_2k_ratings(ratings_path)

    with open(JSON_PATH, encoding="utf-8") as f:
        jdata = json.load(f)
    expected_entries = sum(len(v) for v in jdata.values())

    matched = []
    unmatched = []
    skipped_other_decade = 0

    for bucket_key, plist in jdata.items():
        team, decade = bucket_key.rsplit("_", 1)
        for p in plist:
            if decade != TARGET_DECADE:
                # Never carry a stale 2K overall on a non-2020s entry.
                p.pop("twoKOverall", None)
                skipped_other_decade += 1
                continue
            json_name = p["name"]
            lookup_name = NAME_CORRECTIONS.get(json_name, json_name)
            ovr = ratings.get(normalize(lookup_name))
            if ovr is not None:
                p["twoKOverall"] = ovr
                matched.append({"bucket": bucket_key, "name": json_name, "twoKOverall": ovr})
            else:
                # No current 2K rating (e.g. retired mid-decade, or not on a
                # current roster) — leave the entry without the field.
                p.pop("twoKOverall", None)
                unmatched.append({"bucket": bucket_key, "name": json_name})

    total_entries = sum(len(v) for v in jdata.values())
    assert total_entries == expected_entries, (
        f"Entry count changed! Expected {expected_entries}, got {total_entries}")

    # Sanity-check every written value is a plausible 2K overall.
    problems = [m for m in matched if not (40 <= m["twoKOverall"] <= 99)]

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(jdata, f, indent=2)
        f.write("\n")

    if report_path:
        with open(report_path, "w") as f:
            json.dump({
                "target_decade": TARGET_DECADE,
                "matched_count": len(matched),
                "unmatched_count": len(unmatched),
                "matched": sorted(matched, key=lambda m: -m["twoKOverall"]),
                "unmatched": unmatched,
                "validation_problems": problems,
            }, f, indent=2)

    print(f"Target decade: {TARGET_DECADE}")
    print(f"Matched (twoKOverall written): {len(matched)}")
    print(f"Unmatched {TARGET_DECADE} entries (left without field): {len(unmatched)}")
    print(f"Other-decade entries skipped: {skipped_other_decade}")
    print(f"Validation problems: {len(problems)}")
    for pr in problems:
        print("  PROBLEM:", pr)
    if unmatched:
        print()
        print(f"Unmatched {TARGET_DECADE} entries:")
        for u in unmatched:
            print(f"  {u['bucket']} | {u['name']}")

    print()
    print("Next: node scripts/inline_players.js && node scripts/validate_players.js")


if __name__ == "__main__":
    main()
