#!/usr/bin/env python3
"""
scripts/normalize_2k_overalls_by_era.py — cross-era fairness correction for
twoKOverall.

Real NBA 2K overalls aren't rated on one consistent scale across eras: 2K's
retrospective Classic/All-Time/All-Decade cards (used for 1960s-1990s, see
match_2k_overalls.py) are generous nostalgia-driven tribute ratings, in-era
contemporaneous ratings (2000s/2010s) reflect whatever that decade's own 2K
edition thought at the time, and current-roster ratings (2020s) are 2K's most
conservative, competitively cautious philosophy. The result is a steady drift
with no gameplay justification: mean twoKOverall (deduped per player per
decade) falls from 91.5 (1960s) to 83.9 (2020s) even though nothing about
these players' real caliber declined by era.

This script adds `twoKOverallEraAdjusted`: each player's percentile rank
within their own decade's twoKOverall population, remapped onto the pooled
cross-era twoKOverall distribution. Same family of technique as
scripts/add_rating.js's percentile-anchor remap (derived from the live data,
so it self-adjusts), just applied per-era instead of once globally, since the
per-era distributions are what's biased here. Quantile remapping fixes both
mean and spread and is rank-preserving within each decade; pooling every era
into the reference (rather than picking one era as "correct") avoids treating
any single era's rating philosophy as the baseline.

This is purely additive and display/reference-only: twoKOverall, rating,
ratingRaw, and every stat field are left untouched, and nothing in js/ reads
this new field yet (rating remains the load-bearing gameplay balance stat).

Usage:
    python3 scripts/normalize_2k_overalls_by_era.py
    (run only after every decade's twoKOverall pass is complete, and re-run
    whenever any decade's twoKOverall source data changes)

After running, regenerate the inlined DB the game ships:
    node scripts/inline_players.js
    node scripts/validate_players.js
"""
import json
import os

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
JSON_PATH = os.path.join(ROOT, "players.json")


def percentile_rank(value, sorted_values):
    """Tie-aware 'mid-rank' percentile: tied values share the same percentile
    (fraction strictly below, plus half the fraction equal), in [0, 1]."""
    n = len(sorted_values)
    below = sum(1 for v in sorted_values if v < value)
    equal = sum(1 for v in sorted_values if v == value)
    return (below + 0.5 * equal) / n


def pooled_value_at(p, pooled_sorted):
    """Value at percentile p (0-1) in the pooled reference array, mirroring
    add_rating.js's `pct = f => sorted[Math.floor(f * (sorted.length - 1))]`
    anchor pattern."""
    idx = int(p * (len(pooled_sorted) - 1))
    return pooled_sorted[idx]


def main():
    with open(JSON_PATH, encoding="utf-8") as f:
        jdata = json.load(f)
    expected_entries = sum(len(v) for v in jdata.values())

    # decade -> {player name -> twoKOverall} (dedup: a player's entries within
    # one decade already share the same twoKOverall, courtesy of
    # match_2k_overalls.py, so any one of them is representative).
    by_decade = {}
    for bucket_key, plist in jdata.items():
        _, decade = bucket_key.rsplit("_", 1)
        bucket = by_decade.setdefault(decade, {})
        for p in plist:
            ovr = p.get("twoKOverall")
            if ovr is not None:
                bucket[p["name"]] = ovr

    # Pooled cross-era reference distribution.
    pooled_sorted = sorted(v for bucket in by_decade.values() for v in bucket.values())
    if not pooled_sorted:
        sys_exit = "No twoKOverall values found anywhere — nothing to normalize."
        raise SystemExit(sys_exit)

    # decade -> sorted list of that decade's distinct-player values, for
    # percentile-rank lookups.
    decade_sorted = {d: sorted(bucket.values()) for d, bucket in by_decade.items()}

    # decade -> {player name -> adjusted value}
    adjusted_by_decade = {}
    for decade, bucket in by_decade.items():
        sorted_vals = decade_sorted[decade]
        adjusted = {}
        for name, ovr in bucket.items():
            p = percentile_rank(ovr, sorted_vals)
            adjusted[name] = round(pooled_value_at(p, pooled_sorted))
        adjusted_by_decade[decade] = adjusted

    touched = 0
    for bucket_key, plist in jdata.items():
        _, decade = bucket_key.rsplit("_", 1)
        adjusted = adjusted_by_decade.get(decade, {})
        for p in plist:
            if p.get("twoKOverall") is None:
                p.pop("twoKOverallEraAdjusted", None)
                continue
            p["twoKOverallEraAdjusted"] = adjusted[p["name"]]
            touched += 1

    total_entries = sum(len(v) for v in jdata.values())
    assert total_entries == expected_entries, (
        f"Entry count changed! Expected {expected_entries}, got {total_entries}")

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(jdata, f, indent=2)
        f.write("\n")

    print(f"Entries touched (twoKOverallEraAdjusted written): {touched}")
    print()
    print(f"{'decade':<8}{'n':>5}{'raw mean':>10}{'adj mean':>10}{'raw max':>9}{'adj max':>9}")
    decade_order = ["1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"]
    for decade in decade_order:
        bucket = by_decade.get(decade)
        if not bucket:
            continue
        raw_vals = list(bucket.values())
        adj_vals = [adjusted_by_decade[decade][n] for n in bucket]
        raw_mean = sum(raw_vals) / len(raw_vals)
        adj_mean = sum(adj_vals) / len(adj_vals)
        print(f"{decade:<8}{len(raw_vals):>5}{raw_mean:>10.1f}{adj_mean:>10.1f}"
              f"{max(raw_vals):>9}{max(adj_vals):>9}")

    print()
    print("Next: node scripts/inline_players.js && node scripts/validate_players.js")


if __name__ == "__main__":
    main()
