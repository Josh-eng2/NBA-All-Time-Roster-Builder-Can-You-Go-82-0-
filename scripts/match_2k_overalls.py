#!/usr/bin/env python3
"""
scripts/match_2k_overalls.py — stamp real NBA 2K overalls onto players.json
entries for one decade at a time.

Reads a decade-appropriate NBA 2K ratings file and writes a `twoKOverall` field
onto every matching entry in the target decade. It never touches
ppg/rpg/apg/spg/bpg or the stats-derived `rating`; it only adds the one field,
and it only ever touches entries in the decade it's run for — so running it for
one decade never disturbs another decade's values.

Why one decade at a time: an NBA 2K overall is a *season* number.
  - 2020s uses data/nba2k_current_ratings.json (the current 2K roster) — one
    current rating per player.
  - 2010s uses data/nba2k_2010s_peak_ratings.json (built by
    scripts/build_2010s_peak_ratings.py) — each player's PEAK 2K overall across
    the decade, since players.json has one entry per player per decade.
  - 2000s uses data/nba2k_2000s_peak_ratings.json (built by
    scripts/build_2000s_peak_ratings.py) — same peak-of-decade approach, from
    the NBA 2K1..2K10 editions (2000-01 .. 2009-10 seasons).
Applying a current rating to a 1990s stint would be historically wrong, so each
decade is matched only against its own era's ratings.

Usage:
    # 2020s (default decade):
    python3 scripts/match_2k_overalls.py data/nba2k_current_ratings.json
    # 2010s:
    python3 scripts/match_2k_overalls.py data/nba2k_2010s_peak_ratings.json --decade 2010s
    # 2000s:
    python3 scripts/match_2k_overalls.py data/nba2k_2000s_peak_ratings.json --decade 2000s
    # optional report:
    python3 scripts/match_2k_overalls.py <ratings.json> --decade 2010s --report out.json

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

# Decade matched when --decade is not given (keeps the original 2020s command
# working unchanged).
DEFAULT_DECADE = "2020s"

# players.json display name -> NBA 2K roster name, for the ones that differ by
# more than punctuation/spacing (nicknames, added words, suffixes). Pure
# apostrophe/spacing variants (De'Andre, R.J., C.J.) are handled by normalize().
# The corrected name is tried first, then the raw name, so a correction that
# only applies in one decade's data can't break a match in another.
NAME_CORRECTIONS = {
    # 2020s roster variants
    "Lu Dort": "Luguentz Dort",
    "Herb Jones": "Herbert Jones",
    "Terry Rozier": "Terry Rozier III",
    # 2010s roster variants
    "Mike Dunleavy Jr.": "Mike Dunleavy",
    "Patty Mills": "Patrick Mills",
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
        sys.exit("Usage: python3 scripts/match_2k_overalls.py <2k_ratings.json> "
                 "[--decade 2020s|2010s] [--report out.json]")
    ratings_path = args[0]
    report_path = None
    if "--report" in sys.argv:
        report_path = sys.argv[sys.argv.index("--report") + 1]
    target_decade = DEFAULT_DECADE
    if "--decade" in sys.argv:
        target_decade = sys.argv[sys.argv.index("--decade") + 1]

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
            if decade != target_decade:
                # Leave other decades' entries completely untouched, so running
                # one decade's pass never wipes another decade's twoKOverall.
                skipped_other_decade += 1
                continue
            json_name = p["name"]
            # Try the corrected name first, then the raw name.
            candidates = []
            if json_name in NAME_CORRECTIONS:
                candidates.append(NAME_CORRECTIONS[json_name])
            candidates.append(json_name)
            ovr = None
            for cand in candidates:
                ovr = ratings.get(normalize(cand))
                if ovr is not None:
                    break
            if ovr is not None:
                p["twoKOverall"] = ovr
                matched.append({"bucket": bucket_key, "name": json_name, "twoKOverall": ovr})
            else:
                # No 2K rating for this era (e.g. retired before the data window,
                # or never rated) — leave the entry without the field.
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
                "target_decade": target_decade,
                "matched_count": len(matched),
                "unmatched_count": len(unmatched),
                "matched": sorted(matched, key=lambda m: -m["twoKOverall"]),
                "unmatched": unmatched,
                "validation_problems": problems,
            }, f, indent=2)

    print(f"Target decade: {target_decade}")
    print(f"Matched (twoKOverall written): {len(matched)}")
    print(f"Unmatched {target_decade} entries (left without field): {len(unmatched)}")
    print(f"Other-decade entries skipped: {skipped_other_decade}")
    print(f"Validation problems: {len(problems)}")
    for pr in problems:
        print("  PROBLEM:", pr)
    if unmatched:
        print()
        print(f"Unmatched {target_decade} entries:")
        for u in unmatched:
            print(f"  {u['bucket']} | {u['name']}")

    print()
    print("Next: node scripts/inline_players.js && node scripts/validate_players.js")


if __name__ == "__main__":
    main()
