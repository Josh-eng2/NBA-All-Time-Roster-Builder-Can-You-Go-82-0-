#!/usr/bin/env python3
"""
scripts/match_stats.py — refresh players.json stats from real box-score data.

Matches every player-era entry in players.json against a per-player,
per-team, per-decade averages CSV (aggregated from the Kaggle NBA
box-score dataset) and overwrites ppg/rpg/apg/spg/bpg with the real
historical numbers.

Usage:
    python3 scripts/match_stats.py path/to/player_decade_team_averages.csv
    python3 scripts/match_stats.py path/to/averages.csv --report report.json

Expected CSV columns:
    personId, firstName, lastName, playerteamCity, playerteamName, decade,
    gp, ppg, rpg, apg, spg, bpg, ...

After running, regenerate derived fields and the inlined DB:
    node scripts/add_rating.js
    node scripts/inline_players.js
    node scripts/validate_players.js
"""
import csv
import json
import os
import sys
import collections

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
JSON_PATH = os.path.join(ROOT, "players.json")

# Any matched team-decade stint with fewer total games than this is flagged
# in the report for manual review (low sample: injury-shortened stint,
# mid-season trade, late call-up...). Flag-only — the stats are still
# written; a human decides whether to keep or revert them.
MIN_GP_FLOOR = 20

# Historical/relocated franchise names in the CSV -> canonical team name used
# as the bucket key in players.json.
FRANCHISE_MAP = {
    "76ers": "Sixers",
    "Nationals": "Sixers",
    "Trail Blazers": "Blazers",
    "Bullets": "Wizards",
    "Packers": "Wizards",
    "Zephyrs": "Wizards",
    "Bobcats": "Hornets",
    "Braves": "Clippers",
    "Royals": "Kings",
    "Blackhawks": "Hawks",
    "SuperSonics": "Thunder",
}

# Manual name corrections: players.json name -> CSV firstName+lastName.
# Nicknames, suffixes, accents, retroactive legal-name changes.
NAME_CORRECTIONS = {
    "Mike Dunleavy Jr.": "Mike Dunleavy",
    "Jo Jo White": "Jojo White",
    "Marcus Morris": "Marcus Morris Sr.",
    "J.R. Smith": "JR Smith",
    "Fat Lever": "Lafayette Lever",
    "Lu Dort": "Luguentz Dort",
    "World B. Free": "World Free",
    "De Andre Hunter": "De'Andre Hunter",
    "Dennis Schröder": "Dennis Schroder",
    "Herb Jones": "Herbert Jones",
    "Steve Smith": "Steven Smith",
    "Clarence Weatherspoon": "Clar. Weatherspoon",
    "J.J. Redick": "JJ Redick",
    "Ron Artest": "Metta World Peace",
    "Cliff Robinson": "Clifford Robinson",
    "Nene": "Nene Hilario",
    "Nenê": "Nene Hilario",
    "Charles Johnson": "Charlie Johnson",
    "Art Williams": "Arthur Williams",
    "Luke Jackson": "Lucious Jackson",
}

# Known-unmatchable: verified absent from the NBA-only Kaggle dataset
# (ABA-only careers, or names not present in the reference player list).
KNOWN_UNMATCHABLE = {
    "Gabriel Hatcher",   # not in reference player list; likely non-NBA/placeholder
    "Luol McCarter",     # no confident candidate in reference player list
    "Bob Netolicky",     # ABA-only (Indiana Pacers), pre-merger
    "Billy Keller",      # ABA-only (Indiana Pacers), pre-merger
    "Julius Erving",     # ABA-only stint w/ NY Nets pre-merger; NBA career was all 76ers
    "Billy Paultz",      # ABA-only (NY Nets), pre-merger
    "Brian Taylor",      # ABA-only (NY Nets), pre-merger
    "Larry Kenon",       # ABA-only (NY Nets), pre-merger
    "Mel Daniels",       # ABA-only (Indiana Pacers), pre-merger
    "Roger Brown",       # ABA-only (Indiana Pacers), pre-merger
}

# Known pre-existing bucket-placement inconsistencies in players.json: the
# player's real career never included this team+decade combo, so no CSV
# match should exist. Flagged separately in the report.
KNOWN_BUCKET_MISMATCHES = {
    ("Blazers_1970s", "Terry Porter"): "Real Blazers stint was 1980s-1990s, not 1970s",
    ("Raptors_2000s", "Tracy McGrady"): "Real Raptors stint was 1990s, not 2000s",
    ("Clippers_1980s", "World B. Free"): "Real Clippers stint was 1970s, not 1980s",
}

STAT_FIELDS = ["ppg", "rpg", "apg", "spg", "bpg"]


def load_csv_rows(csv_path):
    with open(csv_path, newline="", encoding="utf-8") as f:
        r = csv.DictReader(f)
        rows = []
        for row in r:
            try:
                pid = int(float(row["personId"]))
            except (ValueError, TypeError):
                continue
            gp = int(float(row["gp"])) if row["gp"] else 0
            if gp <= 0:
                continue
            raw_team = row["playerteamName"]
            city = row["playerteamCity"]
            # New Orleans/OKC Hornets (2002-2013) kept their franchise history
            # with the Pelicans on rename, unlike Charlotte's Hornets/Bobcats
            # swap where the NBA reassigned history back to "Hornets" in 2014.
            if raw_team == "Hornets" and city in ("New Orleans", "Oklahoma City"):
                canonical_team = "Pelicans"
            else:
                canonical_team = FRANCHISE_MAP.get(raw_team, raw_team)
            rows.append({
                "personId": pid,
                "name": f"{row['firstName']} {row['lastName']}".strip(),
                "team": canonical_team,
                "decade": row["decade"],
                "gp": gp,
                "ppg": float(row["ppg"]) if row["ppg"] else 0.0,
                "rpg": float(row["rpg"]) if row["rpg"] else 0.0,
                "apg": float(row["apg"]) if row["apg"] else 0.0,
                "spg": float(row["spg"]) if row["spg"] else 0.0,
                "bpg": float(row["bpg"]) if row["bpg"] else 0.0,
            })
    return rows


def build_merged_groups(rows):
    """Group by (personId, canonical_team, decade); GP-weighted merge stats
    across name/city variants within the same franchise-decade."""
    groups = collections.defaultdict(list)
    for row in rows:
        groups[(row["personId"], row["team"], row["decade"])].append(row)

    merged = {}
    for key, group_rows in groups.items():
        total_gp = sum(r["gp"] for r in group_rows)
        stats = {}
        for field in STAT_FIELDS:
            weighted = sum(r[field] * r["gp"] for r in group_rows)
            stats[field] = round(weighted / total_gp, 2) if total_gp else 0.0
        merged[key] = {
            "stats": stats,
            "total_gp": total_gp,
            "name_variants": sorted(set(r["name"] for r in group_rows)),
            "person_id": key[0],
        }
    return merged


def build_name_lookup(merged):
    """(name_variant, team, decade) -> merged group key, resolving collisions
    (distinct real people who share a name and both played for this team in
    this decade) by keeping whichever group has the most total games played."""
    candidates = collections.defaultdict(list)
    for key, info in merged.items():
        _, team, decade = key
        for name in info["name_variants"]:
            candidates[(name, team, decade)].append(key)

    lookup = {}
    collisions = []
    for lk, keys in candidates.items():
        if len(keys) == 1:
            lookup[lk] = keys[0]
            continue
        keys_sorted = sorted(keys, key=lambda k: merged[k]["total_gp"], reverse=True)
        kept_key = keys_sorted[0]
        lookup[lk] = kept_key
        collisions.append({
            "lookup_key": list(lk),
            "gp_kept": merged[kept_key]["total_gp"],
            "kept_person_id": merged[kept_key]["person_id"],
            "gp_dropped": [merged[k]["total_gp"] for k in keys_sorted[1:]],
            "dropped_person_ids": [merged[k]["person_id"] for k in keys_sorted[1:]],
        })
    return lookup, collisions


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        sys.exit("Usage: python3 scripts/match_stats.py <averages.csv> [--report out.json]")
    csv_path = args[0]
    report_path = None
    if "--report" in sys.argv:
        report_path = sys.argv[sys.argv.index("--report") + 1]

    with open(JSON_PATH, encoding="utf-8") as f:
        jdata = json.load(f)
    expected_entries = sum(len(v) for v in jdata.values())

    csv_rows = load_csv_rows(csv_path)
    merged = build_merged_groups(csv_rows)
    lookup, collisions = build_name_lookup(merged)

    updated = []
    unchanged = []
    unmatched = []
    preserved_pre1974 = []
    low_gp_flags = []

    for bucket_key, plist in jdata.items():
        team, decade = bucket_key.rsplit("_", 1)
        for p in plist:
            json_name = p["name"]
            csv_name = NAME_CORRECTIONS.get(json_name, json_name)
            lk = (csv_name, team, decade)

            if lk in lookup:
                group_key = lookup[lk]
                group = merged[group_key]
                csv_stats = group["stats"]
                before = {f: p.get(f) for f in STAT_FIELDS}

                # The NBA did not officially track steals/blocks before the
                # 1973-74 season, so a CSV group with 0.0 for both is a data
                # gap, not a real value -- preserve the existing curated
                # spg/bpg rather than overwriting legends with a false zero.
                no_defense_data = csv_stats["spg"] == 0.0 and csv_stats["bpg"] == 0.0
                new_stats = dict(csv_stats)
                if no_defense_data:
                    new_stats["spg"] = before["spg"]
                    new_stats["bpg"] = before["bpg"]
                    preserved_pre1974.append({
                        "bucket": bucket_key, "name": json_name,
                        "kept_spg": before["spg"], "kept_bpg": before["bpg"],
                    })

                # Low-sample stint: stats are still applied, but surface it
                # for manual review (could be an injury-shortened stint, a
                # brief trade stopover, or a call-up cameo).
                if group["total_gp"] < MIN_GP_FLOOR:
                    low_gp_flags.append({
                        "bucket": bucket_key, "name": json_name,
                        "gp": group["total_gp"], "stats": new_stats,
                    })

                changed = any(before[f] != new_stats[f] for f in STAT_FIELDS)
                for f in STAT_FIELDS:
                    p[f] = new_stats[f]
                if changed:
                    updated.append({
                        "bucket": bucket_key,
                        "name": json_name,
                        "before": before,
                        "after": new_stats,
                        "gp": group["total_gp"],
                    })
                else:
                    unchanged.append({"bucket": bucket_key, "name": json_name})
            else:
                mismatch_reason = KNOWN_BUCKET_MISMATCHES.get((bucket_key, json_name))
                if mismatch_reason:
                    reason = f"pre-existing bucket mismatch: {mismatch_reason}"
                elif json_name in KNOWN_UNMATCHABLE:
                    reason = "known ABA/non-NBA (verified absent from dataset)"
                else:
                    reason = "no CSV match found"
                unmatched.append({"bucket": bucket_key, "name": json_name, "reason": reason})

    # Validation
    problems = []
    for bucket_key, plist in jdata.items():
        for p in plist:
            if not (0 <= p["ppg"] <= 50):
                problems.append(f"{bucket_key} {p['name']}: ppg={p['ppg']} out of range")
            if not (0 <= p["rpg"] <= 25):
                problems.append(f"{bucket_key} {p['name']}: rpg={p['rpg']} out of range")
            if not (0 <= p["apg"] <= 15):
                problems.append(f"{bucket_key} {p['name']}: apg={p['apg']} out of range")
            if not (0 <= p["spg"] <= 5):
                problems.append(f"{bucket_key} {p['name']}: spg={p['spg']} out of range")
            if not (0 <= p["bpg"] <= 6):
                problems.append(f"{bucket_key} {p['name']}: bpg={p['bpg']} out of range")

    total_entries = sum(len(v) for v in jdata.values())
    assert total_entries == expected_entries, (
        f"Entry count changed! Expected {expected_entries}, got {total_entries}")

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(jdata, f, indent=2)
        f.write("\n")

    if report_path:
        report_data = {
            "total_entries": total_entries,
            "updated_count": len(updated),
            "unchanged_count": len(unchanged),
            "unmatched_count": len(unmatched),
            "updated": updated,
            "unmatched": unmatched,
            "collisions": collisions,
            "validation_problems": problems,
            "preserved_pre1974_count": len(preserved_pre1974),
            "preserved_pre1974": preserved_pre1974,
            "low_gp_flag_count": len(low_gp_flags),
            "low_gp_flags": low_gp_flags,
        }
        with open(report_path, "w") as f:
            json.dump(report_data, f, indent=2)

    print(f"Total entries: {total_entries}")
    print(f"Updated: {len(updated)}")
    print(f"Unchanged (already matched): {len(unchanged)}")
    print(f"Unmatched: {len(unmatched)}")
    print(f"Collisions: {len(collisions)}")
    print(f"Pre-1973-74 spg/bpg preserved (no official data): {len(preserved_pre1974)}")
    print(f"Low-GP stints flagged (< {MIN_GP_FLOOR} games, review manually): {len(low_gp_flags)}")
    print(f"Validation problems: {len(problems)}")
    if problems:
        for p in problems[:20]:
            print("  PROBLEM:", p)
    if low_gp_flags:
        print()
        print(f"Low-GP flags (< {MIN_GP_FLOOR} GP) — stats applied, review manually:")
        for f_ in low_gp_flags:
            print(f"  {f_['bucket']} | {f_['name']} | GP={f_['gp']} | {f_['stats']}")
    if unmatched:
        print()
        print("Unmatched players (left unchanged):")
        for u in unmatched:
            print(f"  {u['bucket']} | {u['name']} | {u['reason']}")

    print()
    print("Next: node scripts/add_rating.js && node scripts/inline_players.js && node scripts/validate_players.js")


if __name__ == "__main__":
    main()
