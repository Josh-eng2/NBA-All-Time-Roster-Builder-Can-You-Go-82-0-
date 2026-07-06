/**
 * js/data/players.js — Inlined Player Database (auto-generated)
 *
 * 178 team-era buckets · 938 players total
 *
 * DO NOT EDIT BY HAND.
 * Re-generate with:  node scripts/inline_players.js
 *
 * The `DB` export is a live binding (export let).
 * Once loadDatabase() is called, every importing module that reads
 * `DB` will see the fully populated object.
 */

/** @type {object|null} */
export let DB = null;

/**
 * Populates DB synchronously from the inlined data, then removes
 * the loading overlay.  Returns a resolved Promise so callers that
 * previously awaited the fetch-based version keep working unchanged.
 */
export function loadDatabase() {
  DB = PLAYER_DB;
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.remove();
  return Promise.resolve();
}

// ─── Data ────────────────────────────────────────────────────────────────────
// Placed at the end of the file so the public API is visible at the top.

const PLAYER_DB = {
  "Lakers_1960s": [
    {
      "id": "west_68",
      "name": "Jerry West",
      "pos": "SG",
      "ppg": 26.9,
      "rpg": 5.1,
      "apg": 6.3,
      "spg": 1.2,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Floor Spacer",
        "Elite Playmaker"
      ],
      "popularity": 93,
      "rating": 81,
      "ratingRaw": 19.2
    },
    {
      "id": "baylor_68",
      "name": "Elgin Baylor",
      "pos": "SF",
      "ppg": 27.1,
      "rpg": 13.5,
      "apg": 4.7,
      "spg": 0.8,
      "bpg": 0.5,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter",
        "Slasher"
      ],
      "popularity": 82,
      "rating": 91,
      "ratingRaw": 24
    },
    {
      "id": "chamberlain_68",
      "name": "Wilt Chamberlain",
      "pos": "C",
      "ppg": 24.3,
      "rpg": 23.8,
      "apg": 4.4,
      "spg": 0.7,
      "bpg": 2.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 92,
      "rating": 99,
      "ratingRaw": 33.2
    },
    {
      "id": "larusso_67",
      "name": "Rudy LaRusso",
      "pos": "PF",
      "ppg": 16.8,
      "rpg": 9.4,
      "apg": 2,
      "spg": 0.7,
      "bpg": 0.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 42,
      "rating": 75,
      "ratingRaw": 16.3
    },
    {
      "id": "hairston_68",
      "name": "Happy Hairston",
      "pos": "PF",
      "ppg": 14.4,
      "rpg": 11.6,
      "apg": 1.5,
      "spg": 0.6,
      "bpg": 0.4,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 41,
      "rating": 75,
      "ratingRaw": 16.6
    },
    {
      "id": "egan_68",
      "name": "Johnny Egan",
      "pos": "PG",
      "ppg": 10.2,
      "rpg": 2.6,
      "apg": 5.6,
      "spg": 0.8,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Glue Guy"
      ],
      "popularity": 38,
      "rating": 64,
      "ratingRaw": 11
    }
  ],
  "Lakers_1970s": [
    {
      "id": "kareem_76",
      "name": "Kareem Abdul-Jabbar",
      "pos": "C",
      "ppg": 27.7,
      "rpg": 14.5,
      "apg": 3.8,
      "spg": 1.4,
      "bpg": 3.2,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 90,
      "rating": 99,
      "ratingRaw": 29.1
    },
    {
      "id": "goodrich_74",
      "name": "Gail Goodrich",
      "pos": "SG",
      "ppg": 23.9,
      "rpg": 3.8,
      "apg": 5,
      "spg": 1.1,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 65,
      "rating": 74,
      "ratingRaw": 16.2
    },
    {
      "id": "wilkes_79",
      "name": "Jamaal Wilkes",
      "pos": "SF",
      "ppg": 18.6,
      "rpg": 6.8,
      "apg": 2.4,
      "spg": 1,
      "bpg": 0.3,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 56,
      "rating": 73,
      "ratingRaw": 15.3
    },
    {
      "id": "west_71",
      "name": "Jerry West",
      "pos": "PG",
      "ppg": 25.8,
      "rpg": 5,
      "apg": 7.5,
      "spg": 1.5,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Clutch",
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 93,
      "rating": 81,
      "ratingRaw": 19.6
    },
    {
      "id": "haywood_75",
      "name": "Spencer Haywood",
      "pos": "PF",
      "ppg": 19.2,
      "rpg": 8.8,
      "apg": 2.2,
      "spg": 1,
      "bpg": 1.2,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Volume Shooter"
      ],
      "popularity": 60,
      "rating": 78,
      "ratingRaw": 18.1
    },
    {
      "id": "rileylak_75",
      "name": "Pat Riley",
      "pos": "SG",
      "ppg": 8,
      "rpg": 2.3,
      "apg": 2.4,
      "spg": 0.7,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 62,
      "rating": 58,
      "ratingRaw": 8.2
    },
    {
      "id": "mcharter_75",
      "name": "Don Ford",
      "pos": "SF",
      "ppg": 11.3,
      "rpg": 5.8,
      "apg": 1.9,
      "spg": 0.9,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Glue Guy",
        "Volume Shooter"
      ],
      "popularity": 36,
      "rating": 66,
      "ratingRaw": 12.1
    }
  ],
  "Lakers_1980s": [
    {
      "id": "magic_87",
      "name": "Magic Johnson",
      "pos": "PG",
      "ppg": 22,
      "rpg": 6.3,
      "apg": 11.2,
      "spg": 1.9,
      "bpg": 0.4,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Clutch",
        "Floor Spacer"
      ],
      "popularity": 98,
      "rating": 87,
      "ratingRaw": 22.1
    },
    {
      "id": "kareem_87",
      "name": "Kareem Abdul-Jabbar",
      "pos": "C",
      "ppg": 23.4,
      "rpg": 9.5,
      "apg": 2.9,
      "spg": 0.9,
      "bpg": 2.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 90,
      "rating": 87,
      "ratingRaw": 22.1
    },
    {
      "id": "worthy_88",
      "name": "James Worthy",
      "pos": "SF",
      "ppg": 21.1,
      "rpg": 5.7,
      "apg": 3,
      "spg": 1.3,
      "bpg": 0.8,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter",
        "Lockdown Defender"
      ],
      "popularity": 72,
      "rating": 75,
      "ratingRaw": 16.7
    },
    {
      "id": "scott_88",
      "name": "Byron Scott",
      "pos": "SG",
      "ppg": 17.6,
      "rpg": 3.4,
      "apg": 3.4,
      "spg": 1.3,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 58,
      "rating": 68,
      "ratingRaw": 13.3
    },
    {
      "id": "cooper_88",
      "name": "Michael Cooper",
      "pos": "SG",
      "ppg": 8.9,
      "rpg": 3.3,
      "apg": 4.3,
      "spg": 1.1,
      "bpg": 0.6,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 55,
      "rating": 64,
      "ratingRaw": 11.4
    },
    {
      "id": "mcadoo_82",
      "name": "Bob McAdoo",
      "pos": "C",
      "ppg": 16.3,
      "rpg": 7.2,
      "apg": 1.7,
      "spg": 0.8,
      "bpg": 1,
      "archetype": "Paint Beast",
      "traits": [
        "Volume Shooter",
        "Rim Protector"
      ],
      "popularity": 63,
      "rating": 73,
      "ratingRaw": 15.3
    },
    {
      "id": "acgreen_88",
      "name": "A.C. Green",
      "pos": "PF",
      "ppg": 8.7,
      "rpg": 7.9,
      "apg": 0.9,
      "spg": 0.7,
      "bpg": 0.6,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 52,
      "rating": 66,
      "ratingRaw": 12.3
    },
    {
      "id": "rambis_84",
      "name": "Kurt Rambis",
      "pos": "PF",
      "ppg": 7.1,
      "rpg": 7,
      "apg": 1.8,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Paint Beast",
      "traits": [
        "Glue Guy",
        "Rim Protector"
      ],
      "popularity": 42,
      "rating": 64,
      "ratingRaw": 11.4
    }
  ],
  "Lakers_1990s": [
    {
      "id": "shaq_99",
      "name": "Shaquille O'Neal",
      "pos": "C",
      "ppg": 26.3,
      "rpg": 12.5,
      "apg": 2.5,
      "spg": 0.6,
      "bpg": 2.4,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 97,
      "rating": 91,
      "ratingRaw": 24.4
    },
    {
      "id": "kobe_99",
      "name": "Kobe Bryant",
      "pos": "SG",
      "ppg": 19.9,
      "rpg": 5.5,
      "apg": 4.9,
      "spg": 1.4,
      "bpg": 0.5,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 98,
      "rating": 76,
      "ratingRaw": 16.9
    },
    {
      "id": "vanexel_97",
      "name": "Nick Van Exel",
      "pos": "PG",
      "ppg": 14.9,
      "rpg": 2.9,
      "apg": 6.5,
      "spg": 1,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 57,
      "rating": 69,
      "ratingRaw": 13.4
    },
    {
      "id": "jones_97",
      "name": "Eddie Jones",
      "pos": "SG",
      "ppg": 17.7,
      "rpg": 4.3,
      "apg": 3.2,
      "spg": 2.4,
      "bpg": 0.7,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Floor Spacer"
      ],
      "popularity": 55,
      "rating": 74,
      "ratingRaw": 15.8
    },
    {
      "id": "ceballos_95",
      "name": "Cedric Ceballos",
      "pos": "SF",
      "ppg": 21.7,
      "rpg": 8,
      "apg": 1.5,
      "spg": 0.9,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 48,
      "rating": 75,
      "ratingRaw": 16.6
    },
    {
      "id": "divac_96",
      "name": "Vlade Divac",
      "pos": "C",
      "ppg": 12.1,
      "rpg": 8.2,
      "apg": 3.9,
      "spg": 1,
      "bpg": 1.3,
      "archetype": "Two-Way Star",
      "traits": [
        "Elite Playmaker",
        "Glue Guy"
      ],
      "popularity": 62,
      "rating": 75,
      "ratingRaw": 16.6
    },
    {
      "id": "fox_99",
      "name": "Rick Fox",
      "pos": "SF",
      "ppg": 9.6,
      "rpg": 3.9,
      "apg": 2.7,
      "spg": 0.9,
      "bpg": 0.4,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 44,
      "rating": 63,
      "ratingRaw": 10.6
    }
  ],
  "Lakers_2000s": [
    {
      "id": "kobe_06",
      "name": "Kobe Bryant",
      "pos": "SG",
      "ppg": 35.4,
      "rpg": 5.3,
      "apg": 4.5,
      "spg": 1.8,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch",
        "Volume Shooter",
        "Lockdown Defender"
      ],
      "popularity": 98,
      "rating": 86,
      "ratingRaw": 21.6
    },
    {
      "id": "shaq_02",
      "name": "Shaquille O'Neal",
      "pos": "C",
      "ppg": 27.5,
      "rpg": 11.8,
      "apg": 3.1,
      "spg": 0.7,
      "bpg": 2.3,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 97,
      "rating": 92,
      "ratingRaw": 24.6
    },
    {
      "id": "gasol_09",
      "name": "Pau Gasol",
      "pos": "PF",
      "ppg": 18.3,
      "rpg": 9.6,
      "apg": 3.5,
      "spg": 0.7,
      "bpg": 1.9,
      "archetype": "Two-Way Star",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 74,
      "rating": 82,
      "ratingRaw": 19.8
    },
    {
      "id": "odom_04",
      "name": "Lamar Odom",
      "pos": "PF",
      "ppg": 17.1,
      "rpg": 9.4,
      "apg": 3.5,
      "spg": 1.1,
      "bpg": 0.6,
      "archetype": "Two-Way Star",
      "traits": [
        "Glue Guy",
        "Floor Spacer"
      ],
      "popularity": 60,
      "rating": 78,
      "ratingRaw": 17.8
    },
    {
      "id": "fisher_02",
      "name": "Derek Fisher",
      "pos": "PG",
      "ppg": 8.8,
      "rpg": 2.3,
      "apg": 3.5,
      "spg": 0.9,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch",
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 55,
      "rating": 60,
      "ratingRaw": 9.4
    },
    {
      "id": "horry_02",
      "name": "Robert Horry",
      "pos": "PF",
      "ppg": 8.6,
      "rpg": 5.9,
      "apg": 2.5,
      "spg": 0.9,
      "bpg": 0.9,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch",
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 62,
      "rating": 66,
      "ratingRaw": 12.4
    },
    {
      "id": "fox_02",
      "name": "Rick Fox",
      "pos": "SF",
      "ppg": 11.6,
      "rpg": 4.5,
      "apg": 3.1,
      "spg": 1.1,
      "bpg": 0.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy",
        "Floor Spacer"
      ],
      "popularity": 44,
      "rating": 66,
      "ratingRaw": 12.3
    },
    {
      "id": "grant_02",
      "name": "Brian Grant",
      "pos": "PF",
      "ppg": 9.4,
      "rpg": 7.4,
      "apg": 1.2,
      "spg": 0.7,
      "bpg": 0.7,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 44,
      "rating": 66,
      "ratingRaw": 12.4
    }
  ],
  "Lakers_2010s": [
    {
      "id": "kobe_13",
      "name": "Kobe Bryant",
      "pos": "SG",
      "ppg": 27.3,
      "rpg": 5.6,
      "apg": 6,
      "spg": 1.4,
      "bpg": 0.3,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Volume Shooter",
        "Lockdown Defender"
      ],
      "popularity": 98,
      "rating": 81,
      "ratingRaw": 19.6
    },
    {
      "id": "lebron_18",
      "name": "LeBron James",
      "pos": "SF",
      "ppg": 35.5,
      "rpg": 9.5,
      "apg": 11,
      "spg": 2.2,
      "bpg": 1.5,
      "archetype": "Playmaker",
      "traits": [
        "Clutch",
        "Elite Playmaker",
        "Lockdown Defender"
      ],
      "popularity": 99,
      "rating": 99,
      "ratingRaw": 30.4
    },
    {
      "id": "davis_19",
      "name": "Anthony Davis",
      "pos": "C",
      "ppg": 23.8,
      "rpg": 10.3,
      "apg": 2.3,
      "spg": 1.1,
      "bpg": 2.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Rim Protector",
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 80,
      "rating": 88,
      "ratingRaw": 22.5
    },
    {
      "id": "dwight_13",
      "name": "Dwight Howard",
      "pos": "C",
      "ppg": 17.1,
      "rpg": 12.4,
      "apg": 1.4,
      "spg": 0.8,
      "bpg": 2.4,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 75,
      "rating": 85,
      "ratingRaw": 21.1
    },
    {
      "id": "gasol_14",
      "name": "Pau Gasol",
      "pos": "PF",
      "ppg": 17.4,
      "rpg": 9.7,
      "apg": 3.7,
      "spg": 0.5,
      "bpg": 1.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 74,
      "rating": 80,
      "ratingRaw": 18.9
    },
    {
      "id": "nash_13",
      "name": "Steve Nash",
      "pos": "PG",
      "ppg": 12.7,
      "rpg": 2.9,
      "apg": 6.7,
      "spg": 0.5,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 82,
      "rating": 66,
      "ratingRaw": 12.2
    },
    {
      "id": "randle_15",
      "name": "Julius Randle",
      "pos": "PF",
      "ppg": 11.3,
      "rpg": 10.2,
      "apg": 2.2,
      "spg": 0.5,
      "bpg": 0.3,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Volume Shooter"
      ],
      "popularity": 57,
      "rating": 71,
      "ratingRaw": 14.8
    },
    {
      "id": "ingram_18",
      "name": "Brandon Ingram",
      "pos": "SF",
      "ppg": 16.1,
      "rpg": 5.3,
      "apg": 3,
      "spg": 0.7,
      "bpg": 0.6,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 53,
      "rating": 70,
      "ratingRaw": 13.9
    }
  ],
  "Lakers_2020s": [
    {
      "id": "lebron_23",
      "name": "LeBron James",
      "pos": "SF",
      "ppg": 34,
      "rpg": 9,
      "apg": 9.5,
      "spg": 2,
      "bpg": 1.2,
      "archetype": "Playmaker",
      "traits": [
        "Clutch",
        "Elite Playmaker",
        "Lockdown Defender"
      ],
      "popularity": 99,
      "rating": 99,
      "ratingRaw": 28
    },
    {
      "id": "davis_23",
      "name": "Anthony Davis",
      "pos": "C",
      "ppg": 25.9,
      "rpg": 12.5,
      "apg": 2.6,
      "spg": 1.1,
      "bpg": 2,
      "archetype": "Two-Way Star",
      "traits": [
        "Rim Protector",
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 80,
      "rating": 91,
      "ratingRaw": 24.3
    },
    {
      "id": "russ_22",
      "name": "Russell Westbrook",
      "pos": "PG",
      "ppg": 19.3,
      "rpg": 8.1,
      "apg": 7.4,
      "spg": 1.1,
      "bpg": 0.3,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 93,
      "rating": 81,
      "ratingRaw": 19.3
    },
    {
      "id": "reaves_24",
      "name": "Austin Reaves",
      "pos": "SG",
      "ppg": 15.9,
      "rpg": 4.3,
      "apg": 5.5,
      "spg": 1,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch",
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 41,
      "rating": 71,
      "ratingRaw": 14.5
    },
    {
      "id": "drussell_24",
      "name": "D'Angelo Russell",
      "pos": "PG",
      "ppg": 18,
      "rpg": 3.1,
      "apg": 6.3,
      "spg": 0.8,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer"
      ],
      "popularity": 52,
      "rating": 70,
      "ratingRaw": 14.3
    },
    {
      "id": "hayes_24",
      "name": "Jaxson Hayes",
      "pos": "C",
      "ppg": 9.8,
      "rpg": 5.7,
      "apg": 0.8,
      "spg": 0.5,
      "bpg": 1.8,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 38,
      "rating": 67,
      "ratingRaw": 12.5
    }
  ],
  "Bulls_1980s": [
    {
      "id": "mj_88",
      "name": "Michael Jordan",
      "pos": "SG",
      "ppg": 40,
      "rpg": 8,
      "apg": 8,
      "spg": 4.5,
      "bpg": 2.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender",
        "Volume Shooter"
      ],
      "popularity": 99,
      "rating": 99,
      "ratingRaw": 33.1
    },
    {
      "id": "pippen_88",
      "name": "Scottie Pippen",
      "pos": "SF",
      "ppg": 10,
      "rpg": 5,
      "apg": 3.5,
      "spg": 1.5,
      "bpg": 0.7,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 92,
      "rating": 68,
      "ratingRaw": 13.1
    },
    {
      "id": "grant_89",
      "name": "Horace Grant",
      "pos": "PF",
      "ppg": 12,
      "rpg": 8.8,
      "apg": 2.2,
      "spg": 1.1,
      "bpg": 0.9,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 56,
      "rating": 73,
      "ratingRaw": 15.5
    },
    {
      "id": "cartwright_88",
      "name": "Bill Cartwright",
      "pos": "C",
      "ppg": 13.1,
      "rpg": 7.4,
      "apg": 1.8,
      "spg": 0.5,
      "bpg": 0.7,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 42,
      "rating": 69,
      "ratingRaw": 13.7
    },
    {
      "id": "paxson_88",
      "name": "John Paxson",
      "pos": "PG",
      "ppg": 9.3,
      "rpg": 2,
      "apg": 4.3,
      "spg": 0.8,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 55,
      "rating": 60,
      "ratingRaw": 9.5
    },
    {
      "id": "corzine_88",
      "name": "Dave Corzine",
      "pos": "C",
      "ppg": 9.1,
      "rpg": 5.5,
      "apg": 1.9,
      "spg": 0.4,
      "bpg": 0.9,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 36,
      "rating": 64,
      "ratingRaw": 11.3
    }
  ],
  "Bulls_1990s": [
    {
      "id": "mj_96",
      "name": "Michael Jordan",
      "pos": "SG",
      "ppg": 33.5,
      "rpg": 7,
      "apg": 7,
      "spg": 2.5,
      "bpg": 1,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender",
        "Volume Shooter"
      ],
      "popularity": 99,
      "rating": 93,
      "ratingRaw": 25.3
    },
    {
      "id": "pippen_96",
      "name": "Scottie Pippen",
      "pos": "SF",
      "ppg": 19.4,
      "rpg": 8,
      "apg": 5.9,
      "spg": 2,
      "bpg": 0.8,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender",
        "Elite Playmaker"
      ],
      "popularity": 92,
      "rating": 83,
      "ratingRaw": 20.2
    },
    {
      "id": "rodman_96",
      "name": "Dennis Rodman",
      "pos": "PF",
      "ppg": 5.7,
      "rpg": 15.3,
      "apg": 2.5,
      "spg": 0.7,
      "bpg": 0.5,
      "archetype": "Paint Beast",
      "traits": [
        "Lockdown Defender",
        "Glue Guy",
        "Rim Protector"
      ],
      "popularity": 96,
      "rating": 77,
      "ratingRaw": 17.4
    },
    {
      "id": "longley_96",
      "name": "Luc Longley",
      "pos": "C",
      "ppg": 9.1,
      "rpg": 5.5,
      "apg": 2,
      "spg": 0.5,
      "bpg": 0.9,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 39,
      "rating": 65,
      "ratingRaw": 11.5
    },
    {
      "id": "kukoc_96",
      "name": "Toni Kukoc",
      "pos": "SF",
      "ppg": 13.1,
      "rpg": 4,
      "apg": 4.4,
      "spg": 1.3,
      "bpg": 0.7,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer",
        "Clutch"
      ],
      "popularity": 62,
      "rating": 69,
      "ratingRaw": 13.6
    },
    {
      "id": "kerr_96",
      "name": "Steve Kerr",
      "pos": "PG",
      "ppg": 8.1,
      "rpg": 1.3,
      "apg": 2.4,
      "spg": 0.6,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch",
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 58,
      "rating": 56,
      "ratingRaw": 7.4
    },
    {
      "id": "paxson_93",
      "name": "John Paxson",
      "pos": "SG",
      "ppg": 8.9,
      "rpg": 1.6,
      "apg": 3.6,
      "spg": 0.6,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch",
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 55,
      "rating": 58,
      "ratingRaw": 8.5
    },
    {
      "id": "armstrong_92",
      "name": "B.J. Armstrong",
      "pos": "PG",
      "ppg": 14.3,
      "rpg": 2.3,
      "apg": 4.1,
      "spg": 0.9,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 52,
      "rating": 64,
      "ratingRaw": 11.3
    }
  ],
  "Bulls_2000s": [
    {
      "id": "deng_08",
      "name": "Luol Deng",
      "pos": "SF",
      "ppg": 17.9,
      "rpg": 7,
      "apg": 2.6,
      "spg": 1.3,
      "bpg": 0.6,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 58,
      "rating": 74,
      "ratingRaw": 16.1
    },
    {
      "id": "gordon_06",
      "name": "Ben Gordon",
      "pos": "SG",
      "ppg": 16.5,
      "rpg": 2.8,
      "apg": 3.2,
      "spg": 0.8,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 52,
      "rating": 65,
      "ratingRaw": 11.7
    },
    {
      "id": "hinrich_07",
      "name": "Kirk Hinrich",
      "pos": "PG",
      "ppg": 14.9,
      "rpg": 3.9,
      "apg": 5.6,
      "spg": 1.4,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 50,
      "rating": 70,
      "ratingRaw": 14.2
    },
    {
      "id": "nocioni_06",
      "name": "Andres Nocioni",
      "pos": "SF",
      "ppg": 13.3,
      "rpg": 5.8,
      "apg": 2,
      "spg": 1,
      "bpg": 0.3,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 42,
      "rating": 67,
      "ratingRaw": 12.7
    },
    {
      "id": "brand_02",
      "name": "Elton Brand",
      "pos": "PF",
      "ppg": 20.1,
      "rpg": 10.1,
      "apg": 2.6,
      "spg": 1,
      "bpg": 2,
      "archetype": "Two-Way Star",
      "traits": [
        "Rim Protector",
        "Volume Shooter"
      ],
      "popularity": 55,
      "rating": 84,
      "ratingRaw": 20.7
    },
    {
      "id": "chandler_02",
      "name": "Tyson Chandler",
      "pos": "C",
      "ppg": 8.5,
      "rpg": 9.6,
      "apg": 0.8,
      "spg": 0.6,
      "bpg": 2,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 58,
      "rating": 73,
      "ratingRaw": 15.3
    },
    {
      "id": "duhon_07",
      "name": "Chris Duhon",
      "pos": "PG",
      "ppg": 8.6,
      "rpg": 2.4,
      "apg": 6.4,
      "spg": 1.2,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Glue Guy"
      ],
      "popularity": 40,
      "rating": 64,
      "ratingRaw": 11.2
    }
  ],
  "Bulls_2010s": [
    {
      "id": "rose_11",
      "name": "Derrick Rose",
      "pos": "PG",
      "ppg": 25,
      "rpg": 4.7,
      "apg": 7.7,
      "spg": 1,
      "bpg": 0.6,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 95,
      "rating": 81,
      "ratingRaw": 19.2
    },
    {
      "id": "butler_17",
      "name": "Jimmy Butler",
      "pos": "SG",
      "ppg": 23.9,
      "rpg": 6,
      "apg": 5.5,
      "spg": 1.9,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 75,
      "rating": 81,
      "ratingRaw": 19.4
    },
    {
      "id": "noah_14",
      "name": "Joakim Noah",
      "pos": "C",
      "ppg": 12.6,
      "rpg": 11.3,
      "apg": 5.4,
      "spg": 1,
      "bpg": 1.6,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 62,
      "rating": 83,
      "ratingRaw": 20.2
    },
    {
      "id": "boozer_11",
      "name": "Carlos Boozer",
      "pos": "PF",
      "ppg": 17.3,
      "rpg": 9.5,
      "apg": 2.3,
      "spg": 0.7,
      "bpg": 0.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 56,
      "rating": 75,
      "ratingRaw": 16.7
    },
    {
      "id": "deng_13",
      "name": "Luol Deng",
      "pos": "SF",
      "ppg": 16.5,
      "rpg": 6.8,
      "apg": 2.3,
      "spg": 1.1,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 58,
      "rating": 72,
      "ratingRaw": 15
    },
    {
      "id": "gibson_14",
      "name": "Taj Gibson",
      "pos": "PF",
      "ppg": 11.1,
      "rpg": 7.8,
      "apg": 1.5,
      "spg": 0.7,
      "bpg": 1.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 45,
      "rating": 71,
      "ratingRaw": 14.6
    },
    {
      "id": "pgasol_15",
      "name": "Pau Gasol",
      "pos": "C",
      "ppg": 16.5,
      "rpg": 11.8,
      "apg": 4.1,
      "spg": 0.6,
      "bpg": 1.7,
      "archetype": "Two-Way Star",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 74,
      "rating": 84,
      "ratingRaw": 20.8
    },
    {
      "id": "dunleavy_14",
      "name": "Mike Dunleavy Jr.",
      "pos": "SF",
      "ppg": 10,
      "rpg": 4.2,
      "apg": 3,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 42,
      "rating": 64,
      "ratingRaw": 11
    }
  ],
  "Warriors_1990s": [
    {
      "id": "hardaway_92",
      "name": "Tim Hardaway",
      "pos": "PG",
      "ppg": 22,
      "rpg": 4,
      "apg": 10,
      "spg": 2.1,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 68,
      "rating": 82,
      "ratingRaw": 19.7
    },
    {
      "id": "mullin_92",
      "name": "Chris Mullin",
      "pos": "SF",
      "ppg": 25.1,
      "rpg": 5.1,
      "apg": 4.5,
      "spg": 1.7,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 68,
      "rating": 79,
      "ratingRaw": 18.2
    },
    {
      "id": "sprewell_97",
      "name": "Latrell Sprewell",
      "pos": "SG",
      "ppg": 24.2,
      "rpg": 4.7,
      "apg": 4.2,
      "spg": 1.9,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 63,
      "rating": 78,
      "ratingRaw": 17.7
    },
    {
      "id": "webber_94",
      "name": "Chris Webber",
      "pos": "PF",
      "ppg": 17.5,
      "rpg": 9.1,
      "apg": 3.6,
      "spg": 1.7,
      "bpg": 2.2,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 76,
      "rating": 84,
      "ratingRaw": 20.8
    },
    {
      "id": "marciulionis_92",
      "name": "Sarunas Marciulionis",
      "pos": "SG",
      "ppg": 18.9,
      "rpg": 3.4,
      "apg": 4.2,
      "spg": 1.1,
      "bpg": 0.2,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 45,
      "rating": 70,
      "ratingRaw": 13.9
    },
    {
      "id": "hill_93",
      "name": "Tyrone Hill",
      "pos": "PF",
      "ppg": 11.8,
      "rpg": 10.7,
      "apg": 1.1,
      "spg": 0.7,
      "bpg": 0.6,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 42,
      "rating": 73,
      "ratingRaw": 15.3
    },
    {
      "id": "owens_93",
      "name": "Billy Owens",
      "pos": "SF",
      "ppg": 14.5,
      "rpg": 8.9,
      "apg": 4.3,
      "spg": 1.2,
      "bpg": 0.7,
      "archetype": "Two-Way Star",
      "traits": [
        "Lockdown Defender",
        "Floor Spacer"
      ],
      "popularity": 41,
      "rating": 77,
      "ratingRaw": 17.4
    }
  ],
  "Warriors_2000s": [
    {
      "id": "baron_07",
      "name": "Baron Davis",
      "pos": "PG",
      "ppg": 21,
      "rpg": 4.7,
      "apg": 8.1,
      "spg": 1.9,
      "bpg": 0.4,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 65,
      "rating": 80,
      "ratingRaw": 18.9
    },
    {
      "id": "monta_09",
      "name": "Monta Ellis",
      "pos": "SG",
      "ppg": 25.5,
      "rpg": 3.8,
      "apg": 4.5,
      "spg": 2,
      "bpg": 0.2,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 55,
      "rating": 77,
      "ratingRaw": 17.4
    },
    {
      "id": "jackson_04",
      "name": "Stephen Jackson",
      "pos": "SF",
      "ppg": 14.8,
      "rpg": 4.4,
      "apg": 3.3,
      "spg": 1.5,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 50,
      "rating": 69,
      "ratingRaw": 13.6
    },
    {
      "id": "richardson_07",
      "name": "Jason Richardson",
      "pos": "SG",
      "ppg": 21.6,
      "rpg": 4.9,
      "apg": 3.1,
      "spg": 1.4,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer"
      ],
      "popularity": 52,
      "rating": 74,
      "ratingRaw": 16
    },
    {
      "id": "pietrus_07",
      "name": "Mickael Pietrus",
      "pos": "SG",
      "ppg": 10.2,
      "rpg": 3.6,
      "apg": 1.9,
      "spg": 1.2,
      "bpg": 0.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Floor Spacer"
      ],
      "popularity": 40,
      "rating": 63,
      "ratingRaw": 10.6
    },
    {
      "id": "harrington_07",
      "name": "Al Harrington",
      "pos": "PF",
      "ppg": 14.6,
      "rpg": 6.4,
      "apg": 2.1,
      "spg": 0.7,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer"
      ],
      "popularity": 42,
      "rating": 68,
      "ratingRaw": 13.2
    },
    {
      "id": "foyle_07",
      "name": "Adonal Foyle",
      "pos": "C",
      "ppg": 4.8,
      "rpg": 5.9,
      "apg": 0.6,
      "spg": 0.5,
      "bpg": 2.3,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 38,
      "rating": 65,
      "ratingRaw": 11.8
    }
  ],
  "Warriors_2010s": [
    {
      "id": "curry_16",
      "name": "Stephen Curry",
      "pos": "PG",
      "ppg": 30.1,
      "rpg": 5.4,
      "apg": 6.7,
      "spg": 2.1,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch",
        "Floor Spacer",
        "Elite Playmaker"
      ],
      "popularity": 98,
      "rating": 85,
      "ratingRaw": 21.3
    },
    {
      "id": "durant_18",
      "name": "Kevin Durant",
      "pos": "SF",
      "ppg": 26.4,
      "rpg": 6.8,
      "apg": 5.4,
      "spg": 0.7,
      "bpg": 1.8,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch",
        "Volume Shooter",
        "Floor Spacer"
      ],
      "popularity": 91,
      "rating": 85,
      "ratingRaw": 21.2
    },
    {
      "id": "thompson_16",
      "name": "Klay Thompson",
      "pos": "SG",
      "ppg": 22.3,
      "rpg": 3.8,
      "apg": 2.1,
      "spg": 0.9,
      "bpg": 0.6,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 75,
      "rating": 71,
      "ratingRaw": 14.4
    },
    {
      "id": "green_16",
      "name": "Draymond Green",
      "pos": "PF",
      "ppg": 11.7,
      "rpg": 8,
      "apg": 7.4,
      "spg": 1.7,
      "bpg": 1.4,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 72,
      "rating": 81,
      "ratingRaw": 19.2
    },
    {
      "id": "iguodala_15",
      "name": "Andre Iguodala",
      "pos": "SG",
      "ppg": 7.6,
      "rpg": 4,
      "apg": 3.4,
      "spg": 1.6,
      "bpg": 0.6,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 68,
      "rating": 65,
      "ratingRaw": 11.6
    },
    {
      "id": "livingston_16",
      "name": "Shaun Livingston",
      "pos": "PG",
      "ppg": 8.3,
      "rpg": 2.3,
      "apg": 3.5,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Glue Guy"
      ],
      "popularity": 44,
      "rating": 60,
      "ratingRaw": 9.4
    },
    {
      "id": "dwest_16",
      "name": "David West",
      "pos": "PF",
      "ppg": 7.8,
      "rpg": 4.1,
      "apg": 2.4,
      "spg": 0.6,
      "bpg": 0.5,
      "archetype": "Paint Beast",
      "traits": [
        "Glue Guy",
        "Rim Protector"
      ],
      "popularity": 43,
      "rating": 61,
      "ratingRaw": 9.9
    },
    {
      "id": "mcgee_17",
      "name": "JaVale McGee",
      "pos": "C",
      "ppg": 8,
      "rpg": 4.6,
      "apg": 0.6,
      "spg": 0.4,
      "bpg": 1.8,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 42,
      "rating": 64,
      "ratingRaw": 11
    },
    {
      "id": "kcousins_19",
      "name": "DeMarcus Cousins",
      "pos": "C",
      "ppg": 16.3,
      "rpg": 8.2,
      "apg": 3.6,
      "spg": 1.2,
      "bpg": 1.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Volume Shooter",
        "Rim Protector"
      ],
      "popularity": 63,
      "rating": 79,
      "ratingRaw": 18.2
    }
  ],
  "Warriors_2020s": [
    {
      "id": "curry_22",
      "name": "Stephen Curry",
      "pos": "PG",
      "ppg": 29.5,
      "rpg": 6.1,
      "apg": 6.3,
      "spg": 1.3,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 98,
      "rating": 84,
      "ratingRaw": 20.8
    },
    {
      "id": "thompson_22",
      "name": "Klay Thompson",
      "pos": "SG",
      "ppg": 20.4,
      "rpg": 3.8,
      "apg": 2.4,
      "spg": 0.7,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 75,
      "rating": 69,
      "ratingRaw": 13.6
    },
    {
      "id": "green_22",
      "name": "Draymond Green",
      "pos": "PF",
      "ppg": 8.7,
      "rpg": 7.3,
      "apg": 7.1,
      "spg": 1.5,
      "bpg": 1.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 72,
      "rating": 76,
      "ratingRaw": 17.1
    },
    {
      "id": "poole_22",
      "name": "Jordan Poole",
      "pos": "SG",
      "ppg": 18.5,
      "rpg": 3.4,
      "apg": 4,
      "spg": 0.8,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer"
      ],
      "popularity": 60,
      "rating": 69,
      "ratingRaw": 13.5
    },
    {
      "id": "wiggins_22",
      "name": "Andrew Wiggins",
      "pos": "SF",
      "ppg": 17.2,
      "rpg": 4.5,
      "apg": 2.3,
      "spg": 0.9,
      "bpg": 0.7,
      "archetype": "Two-Way Star",
      "traits": [
        "Lockdown Defender",
        "Volume Shooter"
      ],
      "popularity": 52,
      "rating": 69,
      "ratingRaw": 13.6
    },
    {
      "id": "looney_22",
      "name": "Kevon Looney",
      "pos": "C",
      "ppg": 6,
      "rpg": 8,
      "apg": 2,
      "spg": 0.7,
      "bpg": 0.5,
      "archetype": "Paint Beast",
      "traits": [
        "Glue Guy",
        "Rim Protector"
      ],
      "popularity": 38,
      "rating": 66,
      "ratingRaw": 12
    }
  ],
  "Celtics_1960s": [
    {
      "id": "russell_65",
      "name": "Bill Russell",
      "pos": "C",
      "ppg": 15.1,
      "rpg": 22.5,
      "apg": 4.7,
      "spg": 0.7,
      "bpg": 4.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "Rim Protector",
        "Lockdown Defender",
        "Clutch"
      ],
      "popularity": 87,
      "rating": 99,
      "ratingRaw": 32.5
    },
    {
      "id": "havlicek_68",
      "name": "John Havlicek",
      "pos": "SF",
      "ppg": 20.8,
      "rpg": 7.5,
      "apg": 4.8,
      "spg": 1,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender",
        "Volume Shooter"
      ],
      "popularity": 78,
      "rating": 78,
      "ratingRaw": 17.9
    },
    {
      "id": "jones_65",
      "name": "Sam Jones",
      "pos": "SG",
      "ppg": 19.4,
      "rpg": 5,
      "apg": 4,
      "spg": 0.7,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 55,
      "rating": 71,
      "ratingRaw": 14.6
    },
    {
      "id": "heinsohn_62",
      "name": "Tom Heinsohn",
      "pos": "PF",
      "ppg": 18.8,
      "rpg": 8.8,
      "apg": 2.5,
      "spg": 0.6,
      "bpg": 0.5,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 57,
      "rating": 75,
      "ratingRaw": 16.6
    },
    {
      "id": "cousy_63",
      "name": "Bob Cousy",
      "pos": "PG",
      "ppg": 15.1,
      "rpg": 4.7,
      "apg": 8.1,
      "spg": 0.8,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Clutch",
        "Floor Spacer"
      ],
      "popularity": 82,
      "rating": 73,
      "ratingRaw": 15.4
    },
    {
      "id": "kcjones_65",
      "name": "K.C. Jones",
      "pos": "PG",
      "ppg": 7.4,
      "rpg": 3.5,
      "apg": 4.3,
      "spg": 1.5,
      "bpg": 0.2,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 58,
      "rating": 64,
      "ratingRaw": 11
    },
    {
      "id": "nelson_66",
      "name": "Don Nelson",
      "pos": "PF",
      "ppg": 10.2,
      "rpg": 5.2,
      "apg": 1.2,
      "spg": 0.5,
      "bpg": 0.3,
      "archetype": "Paint Beast",
      "traits": [
        "Glue Guy",
        "Clutch"
      ],
      "popularity": 52,
      "rating": 62,
      "ratingRaw": 10.3
    }
  ],
  "Celtics_1970s": [
    {
      "id": "cowens_74",
      "name": "Dave Cowens",
      "pos": "C",
      "ppg": 20,
      "rpg": 15.7,
      "apg": 4.1,
      "spg": 1,
      "bpg": 1.1,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 70,
      "rating": 91,
      "ratingRaw": 24.2
    },
    {
      "id": "havlicek_74",
      "name": "John Havlicek",
      "pos": "SF",
      "ppg": 22.6,
      "rpg": 6,
      "apg": 5.8,
      "spg": 1.5,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 78,
      "rating": 80,
      "ratingRaw": 18.7
    },
    {
      "id": "white_74",
      "name": "Jo Jo White",
      "pos": "PG",
      "ppg": 19.4,
      "rpg": 4.4,
      "apg": 5.1,
      "spg": 0.9,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 52,
      "rating": 72,
      "ratingRaw": 15.1
    },
    {
      "id": "silas_74",
      "name": "Paul Silas",
      "pos": "PF",
      "ppg": 9.8,
      "rpg": 12.3,
      "apg": 2.6,
      "spg": 1,
      "bpg": 0.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 58,
      "rating": 76,
      "ratingRaw": 16.9
    },
    {
      "id": "nelson_73",
      "name": "Don Nelson",
      "pos": "PF",
      "ppg": 15.4,
      "rpg": 6.8,
      "apg": 1.9,
      "spg": 0.7,
      "bpg": 0.4,
      "archetype": "Paint Beast",
      "traits": [
        "Glue Guy",
        "Clutch"
      ],
      "popularity": 52,
      "rating": 69,
      "ratingRaw": 13.8
    },
    {
      "id": "westphal_73",
      "name": "Paul Westphal",
      "pos": "SG",
      "ppg": 9.7,
      "rpg": 2,
      "apg": 3.7,
      "spg": 1.2,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 62,
      "rating": 61,
      "ratingRaw": 9.9
    }
  ],
  "Celtics_1980s": [
    {
      "id": "bird_86",
      "name": "Larry Bird",
      "pos": "SF",
      "ppg": 25.8,
      "rpg": 10,
      "apg": 6.8,
      "spg": 1.8,
      "bpg": 0.9,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Floor Spacer",
        "Elite Playmaker"
      ],
      "popularity": 96,
      "rating": 91,
      "ratingRaw": 24
    },
    {
      "id": "mchale_87",
      "name": "Kevin McHale",
      "pos": "PF",
      "ppg": 22.3,
      "rpg": 8.7,
      "apg": 2.6,
      "spg": 0.6,
      "bpg": 2,
      "archetype": "Paint Beast",
      "traits": [
        "Volume Shooter",
        "Rim Protector",
        "Clutch"
      ],
      "popularity": 78,
      "rating": 82,
      "ratingRaw": 19.9
    },
    {
      "id": "parish_86",
      "name": "Robert Parish",
      "pos": "C",
      "ppg": 18.3,
      "rpg": 10,
      "apg": 1.8,
      "spg": 0.8,
      "bpg": 1.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 72,
      "rating": 80,
      "ratingRaw": 18.7
    },
    {
      "id": "ainge_87",
      "name": "Danny Ainge",
      "pos": "PG",
      "ppg": 12.3,
      "rpg": 3.1,
      "apg": 5.1,
      "spg": 1.2,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 58,
      "rating": 66,
      "ratingRaw": 12.1
    },
    {
      "id": "johnson_86",
      "name": "Dennis Johnson",
      "pos": "SG",
      "ppg": 15.6,
      "rpg": 4.2,
      "apg": 7,
      "spg": 1.6,
      "bpg": 0.4,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 62,
      "rating": 74,
      "ratingRaw": 15.9
    },
    {
      "id": "walton_86",
      "name": "Bill Walton",
      "pos": "C",
      "ppg": 7.6,
      "rpg": 6.8,
      "apg": 2.1,
      "spg": 0.7,
      "bpg": 1.3,
      "archetype": "Two-Way Star",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 80,
      "rating": 67,
      "ratingRaw": 12.8
    },
    {
      "id": "wedman_86",
      "name": "Scott Wedman",
      "pos": "SF",
      "ppg": 10.6,
      "rpg": 3.9,
      "apg": 1.7,
      "spg": 0.6,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Clutch"
      ],
      "popularity": 41,
      "rating": 61,
      "ratingRaw": 10
    },
    {
      "id": "carr_84",
      "name": "M.L. Carr",
      "pos": "SF",
      "ppg": 7,
      "rpg": 3.5,
      "apg": 1.5,
      "spg": 1,
      "bpg": 0.3,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 40,
      "rating": 59,
      "ratingRaw": 8.8
    }
  ],
  "Celtics_1990s": [
    {
      "id": "lewis_92",
      "name": "Reggie Lewis",
      "pos": "SG",
      "ppg": 20.8,
      "rpg": 4.6,
      "apg": 3,
      "spg": 1.3,
      "bpg": 0.8,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 55,
      "rating": 74,
      "ratingRaw": 15.8
    },
    {
      "id": "pierce_99",
      "name": "Paul Pierce",
      "pos": "SF",
      "ppg": 19.5,
      "rpg": 5.4,
      "apg": 3.2,
      "spg": 1.3,
      "bpg": 0.5,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 85,
      "rating": 73,
      "ratingRaw": 15.6
    },
    {
      "id": "walker_99",
      "name": "Antoine Walker",
      "pos": "PF",
      "ppg": 22.4,
      "rpg": 10.1,
      "apg": 4.5,
      "spg": 1.4,
      "bpg": 0.7,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 62,
      "rating": 84,
      "ratingRaw": 21
    },
    {
      "id": "douglas_92",
      "name": "Sherman Douglas",
      "pos": "PG",
      "ppg": 14.1,
      "rpg": 2.8,
      "apg": 7.5,
      "spg": 1,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Glue Guy"
      ],
      "popularity": 43,
      "rating": 69,
      "ratingRaw": 13.6
    },
    {
      "id": "brown_99",
      "name": "Dee Brown",
      "pos": "SG",
      "ppg": 12.8,
      "rpg": 2.9,
      "apg": 3.3,
      "spg": 1.3,
      "bpg": 0.2,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 44,
      "rating": 64,
      "ratingRaw": 11.4
    }
  ],
  "Celtics_2000s": [
    {
      "id": "pierce_06",
      "name": "Paul Pierce",
      "pos": "SF",
      "ppg": 26.8,
      "rpg": 6.7,
      "apg": 4.7,
      "spg": 1.3,
      "bpg": 0.7,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 85,
      "rating": 82,
      "ratingRaw": 19.9
    },
    {
      "id": "garnett_08",
      "name": "Kevin Garnett",
      "pos": "PF",
      "ppg": 18.8,
      "rpg": 9.2,
      "apg": 3.4,
      "spg": 1.1,
      "bpg": 1.3,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 88,
      "rating": 81,
      "ratingRaw": 19.2
    },
    {
      "id": "allen_08",
      "name": "Ray Allen",
      "pos": "SG",
      "ppg": 17.4,
      "rpg": 3.9,
      "apg": 2.6,
      "spg": 1,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 82,
      "rating": 67,
      "ratingRaw": 12.8
    },
    {
      "id": "rondo_09",
      "name": "Rajon Rondo",
      "pos": "PG",
      "ppg": 11.9,
      "rpg": 5,
      "apg": 8.2,
      "spg": 2.5,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 68,
      "rating": 76,
      "ratingRaw": 16.9
    },
    {
      "id": "perkins_08",
      "name": "Kendrick Perkins",
      "pos": "C",
      "ppg": 6.9,
      "rpg": 7.4,
      "apg": 0.9,
      "spg": 0.5,
      "bpg": 1.4,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy",
        "Lockdown Defender"
      ],
      "popularity": 55,
      "rating": 66,
      "ratingRaw": 12.3
    },
    {
      "id": "powe_08",
      "name": "Leon Powe",
      "pos": "PF",
      "ppg": 8.4,
      "rpg": 5,
      "apg": 0.5,
      "spg": 0.3,
      "bpg": 0.6,
      "archetype": "Paint Beast",
      "traits": [
        "Glue Guy",
        "Volume Shooter"
      ],
      "popularity": 37,
      "rating": 60,
      "ratingRaw": 9.4
    },
    {
      "id": "house_08",
      "name": "Eddie House",
      "pos": "SG",
      "ppg": 8.3,
      "rpg": 1.5,
      "apg": 2.2,
      "spg": 0.5,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Clutch"
      ],
      "popularity": 40,
      "rating": 56,
      "ratingRaw": 7.3
    }
  ],
  "Celtics_2010s": [
    {
      "id": "irving_18",
      "name": "Kyrie Irving",
      "pos": "PG",
      "ppg": 24.4,
      "rpg": 3.8,
      "apg": 5.1,
      "spg": 1.1,
      "bpg": 0.3,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 85,
      "rating": 75,
      "ratingRaw": 16.5
    },
    {
      "id": "tatum_19",
      "name": "Jayson Tatum",
      "pos": "SF",
      "ppg": 15.7,
      "rpg": 6,
      "apg": 2.1,
      "spg": 1,
      "bpg": 0.9,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 75,
      "rating": 71,
      "ratingRaw": 14.5
    },
    {
      "id": "brown_19",
      "name": "Jaylen Brown",
      "pos": "SG",
      "ppg": 13,
      "rpg": 4.2,
      "apg": 1.4,
      "spg": 0.9,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 74,
      "rating": 64,
      "ratingRaw": 11.2
    },
    {
      "id": "horford_17",
      "name": "Al Horford",
      "pos": "C",
      "ppg": 14,
      "rpg": 6.7,
      "apg": 5,
      "spg": 0.9,
      "bpg": 1.6,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 62,
      "rating": 76,
      "ratingRaw": 17.1
    },
    {
      "id": "smart_19",
      "name": "Marcus Smart",
      "pos": "PG",
      "ppg": 11.9,
      "rpg": 4,
      "apg": 4.4,
      "spg": 1.7,
      "bpg": 0.4,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Clutch",
        "Glue Guy"
      ],
      "popularity": 55,
      "rating": 68,
      "ratingRaw": 13.3
    },
    {
      "id": "morris_19",
      "name": "Marcus Morris",
      "pos": "SF",
      "ppg": 13.9,
      "rpg": 5.4,
      "apg": 1.8,
      "spg": 0.9,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Clutch"
      ],
      "popularity": 42,
      "rating": 67,
      "ratingRaw": 12.5
    },
    {
      "id": "rozier_19",
      "name": "Terry Rozier",
      "pos": "SG",
      "ppg": 11.2,
      "rpg": 4,
      "apg": 2.9,
      "spg": 1.1,
      "bpg": 0.3,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 45,
      "rating": 64,
      "ratingRaw": 11.4
    }
  ],
  "Celtics_2020s": [
    {
      "id": "tatum_24",
      "name": "Jayson Tatum",
      "pos": "SF",
      "ppg": 26.9,
      "rpg": 8.1,
      "apg": 4.9,
      "spg": 1,
      "bpg": 0.6,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 75,
      "rating": 84,
      "ratingRaw": 20.6
    },
    {
      "id": "brown_24",
      "name": "Jaylen Brown",
      "pos": "SG",
      "ppg": 23,
      "rpg": 5.5,
      "apg": 3.6,
      "spg": 1.2,
      "bpg": 0.5,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 74,
      "rating": 76,
      "ratingRaw": 16.9
    },
    {
      "id": "white_24",
      "name": "Derrick White",
      "pos": "PG",
      "ppg": 15.2,
      "rpg": 4.3,
      "apg": 5.2,
      "spg": 1.4,
      "bpg": 1.1,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 55,
      "rating": 73,
      "ratingRaw": 15.7
    },
    {
      "id": "porzingis_24",
      "name": "Kristaps Porzingis",
      "pos": "C",
      "ppg": 20.1,
      "rpg": 7.2,
      "apg": 1.9,
      "spg": 0.7,
      "bpg": 1.9,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 65,
      "rating": 78,
      "ratingRaw": 17.8
    },
    {
      "id": "holiday_24",
      "name": "Jrue Holiday",
      "pos": "PG",
      "ppg": 12.5,
      "rpg": 5.4,
      "apg": 4.8,
      "spg": 1.6,
      "bpg": 0.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy",
        "Clutch"
      ],
      "popularity": 63,
      "rating": 71,
      "ratingRaw": 14.7
    },
    {
      "id": "horford_24",
      "name": "Al Horford",
      "pos": "C",
      "ppg": 9.2,
      "rpg": 6.4,
      "apg": 3.4,
      "spg": 0.7,
      "bpg": 1.1,
      "archetype": "Two-Way Star",
      "traits": [
        "Floor Spacer",
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 62,
      "rating": 69,
      "ratingRaw": 13.5
    },
    {
      "id": "pritchard_24",
      "name": "Payton Pritchard",
      "pos": "PG",
      "ppg": 9.8,
      "rpg": 2.6,
      "apg": 3,
      "spg": 0.7,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Clutch"
      ],
      "popularity": 40,
      "rating": 60,
      "ratingRaw": 9.4
    }
  ],
  "Heat_1990s": [
    {
      "id": "mourning_97",
      "name": "Alonzo Mourning",
      "pos": "C",
      "ppg": 23.9,
      "rpg": 9.7,
      "apg": 1.2,
      "spg": 0.7,
      "bpg": 3.9,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 75,
      "rating": 89,
      "ratingRaw": 23.3
    },
    {
      "id": "hardaway_97",
      "name": "Tim Hardaway",
      "pos": "PG",
      "ppg": 20.3,
      "rpg": 3.6,
      "apg": 8,
      "spg": 1.9,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 68,
      "rating": 77,
      "ratingRaw": 17.5
    },
    {
      "id": "mashburn_99",
      "name": "Jamal Mashburn",
      "pos": "SF",
      "ppg": 21.6,
      "rpg": 5.7,
      "apg": 4.3,
      "spg": 1.2,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 55,
      "rating": 76,
      "ratingRaw": 16.9
    },
    {
      "id": "rice_96",
      "name": "Glen Rice",
      "pos": "SG",
      "ppg": 22.3,
      "rpg": 4.3,
      "apg": 2.5,
      "spg": 1,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 55,
      "rating": 71,
      "ratingRaw": 14.5
    },
    {
      "id": "zo_95",
      "name": "Dan Majerle",
      "pos": "SG",
      "ppg": 13.2,
      "rpg": 4.8,
      "apg": 3.1,
      "spg": 1.6,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Lockdown Defender",
        "Floor Spacer"
      ],
      "popularity": 60,
      "rating": 69,
      "ratingRaw": 13.6
    },
    {
      "id": "willis_97",
      "name": "P.J. Brown",
      "pos": "PF",
      "ppg": 9.9,
      "rpg": 7.3,
      "apg": 1.5,
      "spg": 0.8,
      "bpg": 0.9,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 42,
      "rating": 68,
      "ratingRaw": 13.1
    },
    {
      "id": "owens_98",
      "name": "Voshon Lenard",
      "pos": "SG",
      "ppg": 13.2,
      "rpg": 2.8,
      "apg": 2.5,
      "spg": 0.8,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 40,
      "rating": 63,
      "ratingRaw": 10.6
    }
  ],
  "Heat_2000s": [
    {
      "id": "wade_06",
      "name": "Dwyane Wade",
      "pos": "SG",
      "ppg": 27.2,
      "rpg": 5.7,
      "apg": 6.7,
      "spg": 1.9,
      "bpg": 0.9,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 95,
      "rating": 85,
      "ratingRaw": 21.5
    },
    {
      "id": "shaq_05",
      "name": "Shaquille O'Neal",
      "pos": "C",
      "ppg": 22.9,
      "rpg": 10.4,
      "apg": 2.7,
      "spg": 0.5,
      "bpg": 2.3,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 97,
      "rating": 86,
      "ratingRaw": 21.7
    },
    {
      "id": "haslem_07",
      "name": "Udonis Haslem",
      "pos": "PF",
      "ppg": 9.7,
      "rpg": 8.4,
      "apg": 0.9,
      "spg": 0.6,
      "bpg": 0.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 44,
      "rating": 67,
      "ratingRaw": 12.7
    },
    {
      "id": "mourning_06",
      "name": "Alonzo Mourning",
      "pos": "C",
      "ppg": 7.8,
      "rpg": 6.1,
      "apg": 0.6,
      "spg": 0.5,
      "bpg": 2.4,
      "archetype": "Lockdown Defender",
      "traits": [
        "Rim Protector",
        "Lockdown Defender",
        "Clutch"
      ],
      "popularity": 75,
      "rating": 68,
      "ratingRaw": 13
    },
    {
      "id": "posey_06",
      "name": "James Posey",
      "pos": "SF",
      "ppg": 8,
      "rpg": 4.2,
      "apg": 1.8,
      "spg": 1.1,
      "bpg": 0.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 41,
      "rating": 62,
      "ratingRaw": 10.2
    },
    {
      "id": "payton_06",
      "name": "Gary Payton",
      "pos": "PG",
      "ppg": 10.3,
      "rpg": 2.7,
      "apg": 4.7,
      "spg": 1.1,
      "bpg": 0.2,
      "archetype": "Two-Way Star",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 78,
      "rating": 64,
      "ratingRaw": 11
    }
  ],
  "Heat_2010s": [
    {
      "id": "lebron_13",
      "name": "LeBron James",
      "pos": "SF",
      "ppg": 32,
      "rpg": 9,
      "apg": 8,
      "spg": 2,
      "bpg": 1,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Elite Playmaker",
        "Lockdown Defender"
      ],
      "popularity": 99,
      "rating": 95,
      "ratingRaw": 26.3
    },
    {
      "id": "wade_13",
      "name": "Dwyane Wade",
      "pos": "SG",
      "ppg": 21.2,
      "rpg": 4.8,
      "apg": 4.9,
      "spg": 1.7,
      "bpg": 0.8,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 95,
      "rating": 77,
      "ratingRaw": 17.6
    },
    {
      "id": "bosh_13",
      "name": "Chris Bosh",
      "pos": "PF",
      "ppg": 18,
      "rpg": 7.9,
      "apg": 1.9,
      "spg": 0.8,
      "bpg": 1.9,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 72,
      "rating": 78,
      "ratingRaw": 17.7
    },
    {
      "id": "chalmers_12",
      "name": "Mario Chalmers",
      "pos": "PG",
      "ppg": 10.2,
      "rpg": 2.9,
      "apg": 4.4,
      "spg": 1.4,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 43,
      "rating": 64,
      "ratingRaw": 11.3
    },
    {
      "id": "miller_13",
      "name": "Mike Miller",
      "pos": "SF",
      "ppg": 8.9,
      "rpg": 3.8,
      "apg": 1.5,
      "spg": 0.6,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Clutch",
        "Glue Guy"
      ],
      "popularity": 41,
      "rating": 59,
      "ratingRaw": 9
    },
    {
      "id": "cole_13",
      "name": "Norris Cole",
      "pos": "PG",
      "ppg": 6.9,
      "rpg": 2.4,
      "apg": 2.8,
      "spg": 1.4,
      "bpg": 0.2,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 36,
      "rating": 60,
      "ratingRaw": 9.1
    },
    {
      "id": "haslem_13",
      "name": "Udonis Haslem",
      "pos": "PF",
      "ppg": 7.2,
      "rpg": 6.5,
      "apg": 0.9,
      "spg": 0.5,
      "bpg": 0.4,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 44,
      "rating": 62,
      "ratingRaw": 10.3
    },
    {
      "id": "andersen_14",
      "name": "Chris Andersen",
      "pos": "C",
      "ppg": 6.3,
      "rpg": 5.3,
      "apg": 0.6,
      "spg": 0.6,
      "bpg": 1.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 42,
      "rating": 63,
      "ratingRaw": 10.7
    }
  ],
  "Heat_2020s": [
    {
      "id": "butler_23",
      "name": "Jimmy Butler",
      "pos": "SF",
      "ppg": 22.9,
      "rpg": 5.9,
      "apg": 5.3,
      "spg": 1.8,
      "bpg": 0.3,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 75,
      "rating": 79,
      "ratingRaw": 18.5
    },
    {
      "id": "adebayo_23",
      "name": "Bam Adebayo",
      "pos": "C",
      "ppg": 20.4,
      "rpg": 9.2,
      "apg": 3.2,
      "spg": 1.2,
      "bpg": 0.8,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 65,
      "rating": 80,
      "ratingRaw": 18.9
    },
    {
      "id": "herro_23",
      "name": "Tyler Herro",
      "pos": "SG",
      "ppg": 20.1,
      "rpg": 5.4,
      "apg": 4.2,
      "spg": 0.8,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 58,
      "rating": 73,
      "ratingRaw": 15.5
    },
    {
      "id": "lowry_22",
      "name": "Kyle Lowry",
      "pos": "PG",
      "ppg": 14,
      "rpg": 4.2,
      "apg": 7.5,
      "spg": 1.2,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 65,
      "rating": 72,
      "ratingRaw": 15.1
    },
    {
      "id": "strus_23",
      "name": "Max Strus",
      "pos": "SG",
      "ppg": 11.5,
      "rpg": 3.5,
      "apg": 2.1,
      "spg": 0.8,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 42,
      "rating": 62,
      "ratingRaw": 10.3
    },
    {
      "id": "vincent_23",
      "name": "Gabe Vincent",
      "pos": "PG",
      "ppg": 9.7,
      "rpg": 2.6,
      "apg": 3.7,
      "spg": 0.9,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 40,
      "rating": 61,
      "ratingRaw": 10
    },
    {
      "id": "robinson_23",
      "name": "Duncan Robinson",
      "pos": "SF",
      "ppg": 13.4,
      "rpg": 3.6,
      "apg": 2.5,
      "spg": 0.5,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 48,
      "rating": 63,
      "ratingRaw": 10.9
    }
  ],
  "Spurs_1980s": [
    {
      "id": "gervin_85",
      "name": "George Gervin",
      "pos": "SG",
      "ppg": 26.2,
      "rpg": 4.6,
      "apg": 3,
      "spg": 1.3,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 85,
      "rating": 76,
      "ratingRaw": 17
    },
    {
      "id": "mitchell_85",
      "name": "Mike Mitchell",
      "pos": "SF",
      "ppg": 23.4,
      "rpg": 5.1,
      "apg": 2.2,
      "spg": 1,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 48,
      "rating": 73,
      "ratingRaw": 15.6
    },
    {
      "id": "robertson_85",
      "name": "Alvin Robertson",
      "pos": "SG",
      "ppg": 13.3,
      "rpg": 4.9,
      "apg": 5.2,
      "spg": 3.7,
      "bpg": 0.6,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 55,
      "rating": 77,
      "ratingRaw": 17.4
    },
    {
      "id": "gilmore_83",
      "name": "Artis Gilmore",
      "pos": "C",
      "ppg": 17.3,
      "rpg": 10.4,
      "apg": 1.8,
      "spg": 0.9,
      "bpg": 2.8,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Volume Shooter"
      ],
      "popularity": 72,
      "rating": 84,
      "ratingRaw": 20.7
    },
    {
      "id": "johnson_85",
      "name": "George Johnson",
      "pos": "C",
      "ppg": 7.8,
      "rpg": 6.2,
      "apg": 0.9,
      "spg": 0.7,
      "bpg": 3,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 38,
      "rating": 70,
      "ratingRaw": 14.3
    }
  ],
  "Spurs_1990s": [
    {
      "id": "robinson_95",
      "name": "David Robinson",
      "pos": "C",
      "ppg": 27.6,
      "rpg": 10.8,
      "apg": 2.6,
      "spg": 1.7,
      "bpg": 3.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 88,
      "rating": 96,
      "ratingRaw": 26.4
    },
    {
      "id": "elliott_95",
      "name": "Sean Elliott",
      "pos": "SF",
      "ppg": 18.5,
      "rpg": 4.9,
      "apg": 2.8,
      "spg": 1,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 55,
      "rating": 71,
      "ratingRaw": 14.4
    },
    {
      "id": "duncan_99",
      "name": "Tim Duncan",
      "pos": "PF",
      "ppg": 21.1,
      "rpg": 11.9,
      "apg": 2.4,
      "spg": 0.8,
      "bpg": 2.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 92,
      "rating": 88,
      "ratingRaw": 22.7
    },
    {
      "id": "avery_96",
      "name": "Avery Johnson",
      "pos": "PG",
      "ppg": 16.2,
      "rpg": 3,
      "apg": 6.8,
      "spg": 2,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Clutch"
      ],
      "popularity": 52,
      "rating": 73,
      "ratingRaw": 15.3
    },
    {
      "id": "person_97",
      "name": "Chuck Person",
      "pos": "SF",
      "ppg": 13,
      "rpg": 5,
      "apg": 2.6,
      "spg": 0.8,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 48,
      "rating": 66,
      "ratingRaw": 12.4
    },
    {
      "id": "vinnie_97",
      "name": "Vinny Del Negro",
      "pos": "SG",
      "ppg": 11.4,
      "rpg": 2.8,
      "apg": 4.2,
      "spg": 0.8,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 42,
      "rating": 63,
      "ratingRaw": 10.8
    }
  ],
  "Spurs_2000s": [
    {
      "id": "duncan_03",
      "name": "Tim Duncan",
      "pos": "PF",
      "ppg": 23.3,
      "rpg": 12.9,
      "apg": 3.9,
      "spg": 0.9,
      "bpg": 2.9,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Rim Protector",
        "Lockdown Defender"
      ],
      "popularity": 92,
      "rating": 94,
      "ratingRaw": 25.6
    },
    {
      "id": "parker_07",
      "name": "Tony Parker",
      "pos": "PG",
      "ppg": 18.6,
      "rpg": 3.4,
      "apg": 5.5,
      "spg": 0.8,
      "bpg": 0.2,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Elite Playmaker"
      ],
      "popularity": 78,
      "rating": 70,
      "ratingRaw": 14.2
    },
    {
      "id": "ginobili_05",
      "name": "Manu Ginobili",
      "pos": "SG",
      "ppg": 16,
      "rpg": 4.1,
      "apg": 4.4,
      "spg": 1.5,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 82,
      "rating": 71,
      "ratingRaw": 14.4
    },
    {
      "id": "bowen_03",
      "name": "Bruce Bowen",
      "pos": "SF",
      "ppg": 7.4,
      "rpg": 3,
      "apg": 1.3,
      "spg": 1.5,
      "bpg": 0.4,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 52,
      "rating": 60,
      "ratingRaw": 9.2
    },
    {
      "id": "horry_05",
      "name": "Robert Horry",
      "pos": "PF",
      "ppg": 6.5,
      "rpg": 5,
      "apg": 1.8,
      "spg": 0.8,
      "bpg": 0.8,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch",
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 62,
      "rating": 62,
      "ratingRaw": 10.4
    },
    {
      "id": "popovich_03",
      "name": "Stephen Jackson",
      "pos": "SF",
      "ppg": 13.5,
      "rpg": 3.8,
      "apg": 2.6,
      "spg": 1.4,
      "bpg": 0.5,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 50,
      "rating": 66,
      "ratingRaw": 12.4
    },
    {
      "id": "nesterovic_04",
      "name": "Rasho Nesterovic",
      "pos": "C",
      "ppg": 7.9,
      "rpg": 6.2,
      "apg": 1.3,
      "spg": 0.6,
      "bpg": 1.4,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 40,
      "rating": 66,
      "ratingRaw": 12.1
    }
  ],
  "Spurs_2010s": [
    {
      "id": "kawhi_16",
      "name": "Kawhi Leonard",
      "pos": "SF",
      "ppg": 21.2,
      "rpg": 6.8,
      "apg": 2.6,
      "spg": 1.8,
      "bpg": 0.7,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender",
        "Volume Shooter"
      ],
      "popularity": 80,
      "rating": 78,
      "ratingRaw": 17.7
    },
    {
      "id": "aldridge_16",
      "name": "LaMarcus Aldridge",
      "pos": "PF",
      "ppg": 21.9,
      "rpg": 9,
      "apg": 2.2,
      "spg": 0.6,
      "bpg": 1.3,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 63,
      "rating": 80,
      "ratingRaw": 18.8
    },
    {
      "id": "parker_12",
      "name": "Tony Parker",
      "pos": "PG",
      "ppg": 21.1,
      "rpg": 3,
      "apg": 7.7,
      "spg": 0.8,
      "bpg": 0.1,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 78,
      "rating": 74,
      "ratingRaw": 15.8
    },
    {
      "id": "duncan_14",
      "name": "Tim Duncan",
      "pos": "C",
      "ppg": 15.1,
      "rpg": 9.7,
      "apg": 3,
      "spg": 0.7,
      "bpg": 2,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 92,
      "rating": 80,
      "ratingRaw": 18.8
    },
    {
      "id": "mills_14",
      "name": "Patty Mills",
      "pos": "PG",
      "ppg": 9.7,
      "rpg": 1.6,
      "apg": 2.5,
      "spg": 0.7,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch",
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 65,
      "rating": 58,
      "ratingRaw": 8.4
    },
    {
      "id": "diaw_14",
      "name": "Boris Diaw",
      "pos": "PF",
      "ppg": 8.9,
      "rpg": 4.4,
      "apg": 3.5,
      "spg": 0.8,
      "bpg": 0.6,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 55,
      "rating": 64,
      "ratingRaw": 11.4
    },
    {
      "id": "splitter_14",
      "name": "Tiago Splitter",
      "pos": "C",
      "ppg": 11,
      "rpg": 6.6,
      "apg": 2,
      "spg": 0.7,
      "bpg": 1.3,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 41,
      "rating": 69,
      "ratingRaw": 13.7
    },
    {
      "id": "green_14",
      "name": "Danny Green",
      "pos": "SG",
      "ppg": 10.1,
      "rpg": 3.4,
      "apg": 2,
      "spg": 1.3,
      "bpg": 0.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 52,
      "rating": 63,
      "ratingRaw": 10.6
    },
    {
      "id": "mginobili_16",
      "name": "Manu Ginobili",
      "pos": "SG",
      "ppg": 12.1,
      "rpg": 3.5,
      "apg": 3.7,
      "spg": 1.3,
      "bpg": 0.3,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter",
        "Elite Playmaker"
      ],
      "popularity": 82,
      "rating": 66,
      "ratingRaw": 12
    }
  ],
  "Knicks_1970s": [
    {
      "id": "frazier_72",
      "name": "Walt Frazier",
      "pos": "PG",
      "ppg": 21.5,
      "rpg": 7,
      "apg": 7.1,
      "spg": 2.5,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 78,
      "rating": 84,
      "ratingRaw": 21
    },
    {
      "id": "reed_70",
      "name": "Willis Reed",
      "pos": "C",
      "ppg": 21.7,
      "rpg": 13.7,
      "apg": 1.8,
      "spg": 0.8,
      "bpg": 1.4,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 72,
      "rating": 87,
      "ratingRaw": 22.2
    },
    {
      "id": "bradley_72",
      "name": "Bill Bradley",
      "pos": "SF",
      "ppg": 16.1,
      "rpg": 3.7,
      "apg": 4,
      "spg": 0.7,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 58,
      "rating": 67,
      "ratingRaw": 12.7
    },
    {
      "id": "monroe_71",
      "name": "Earl Monroe",
      "pos": "SG",
      "ppg": 21.2,
      "rpg": 3.3,
      "apg": 4.6,
      "spg": 1,
      "bpg": 0.2,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 65,
      "rating": 71,
      "ratingRaw": 14.7
    },
    {
      "id": "debusschere_72",
      "name": "Dave DeBusschere",
      "pos": "PF",
      "ppg": 16,
      "rpg": 10,
      "apg": 2.7,
      "spg": 0.8,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 65,
      "rating": 76,
      "ratingRaw": 17
    },
    {
      "id": "lucas_72",
      "name": "Jerry Lucas",
      "pos": "PF",
      "ppg": 16.7,
      "rpg": 11,
      "apg": 2.6,
      "spg": 0.6,
      "bpg": 0.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Floor Spacer"
      ],
      "popularity": 60,
      "rating": 77,
      "ratingRaw": 17.6
    },
    {
      "id": "barnett_72",
      "name": "Dick Barnett",
      "pos": "SG",
      "ppg": 13.1,
      "rpg": 2.5,
      "apg": 3.2,
      "spg": 0.7,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 42,
      "rating": 63,
      "ratingRaw": 10.5
    }
  ],
  "Knicks_1990s": [
    {
      "id": "ewing_94",
      "name": "Patrick Ewing",
      "pos": "C",
      "ppg": 24.5,
      "rpg": 11.2,
      "apg": 2.3,
      "spg": 1,
      "bpg": 2.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 80,
      "rating": 89,
      "ratingRaw": 23.4
    },
    {
      "id": "starks_94",
      "name": "John Starks",
      "pos": "SG",
      "ppg": 15.5,
      "rpg": 3.2,
      "apg": 4.4,
      "spg": 1.5,
      "bpg": 0.2,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 58,
      "rating": 68,
      "ratingRaw": 13.3
    },
    {
      "id": "oakley_94",
      "name": "Charles Oakley",
      "pos": "PF",
      "ppg": 11.7,
      "rpg": 10.8,
      "apg": 2.5,
      "spg": 1.2,
      "bpg": 0.3,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 52,
      "rating": 75,
      "ratingRaw": 16.3
    },
    {
      "id": "houston_99",
      "name": "Allan Houston",
      "pos": "SG",
      "ppg": 21.7,
      "rpg": 3.6,
      "apg": 3,
      "spg": 0.9,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 58,
      "rating": 70,
      "ratingRaw": 14
    },
    {
      "id": "ewing_jr94",
      "name": "Anthony Mason",
      "pos": "PF",
      "ppg": 14,
      "rpg": 8.4,
      "apg": 3.5,
      "spg": 0.8,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 58,
      "rating": 73,
      "ratingRaw": 15.7
    },
    {
      "id": "doc_94",
      "name": "Doc Rivers",
      "pos": "PG",
      "ppg": 10,
      "rpg": 2.6,
      "apg": 5.3,
      "spg": 1.3,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Glue Guy"
      ],
      "popularity": 55,
      "rating": 65,
      "ratingRaw": 11.5
    },
    {
      "id": "ward_99",
      "name": "Charlie Ward",
      "pos": "PG",
      "ppg": 7.4,
      "rpg": 2.6,
      "apg": 4.5,
      "spg": 1.2,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Glue Guy"
      ],
      "popularity": 38,
      "rating": 62,
      "ratingRaw": 10.2
    }
  ],
  "Knicks_2000s": [
    {
      "id": "marbury_03",
      "name": "Stephon Marbury",
      "pos": "PG",
      "ppg": 20.9,
      "rpg": 3.6,
      "apg": 8.9,
      "spg": 1.4,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 62,
      "rating": 78,
      "ratingRaw": 17.7
    },
    {
      "id": "crawford_06",
      "name": "Jamal Crawford",
      "pos": "SG",
      "ppg": 17.4,
      "rpg": 2.6,
      "apg": 3.8,
      "spg": 1,
      "bpg": 0.2,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 55,
      "rating": 67,
      "ratingRaw": 12.5
    },
    {
      "id": "lee_09",
      "name": "David Lee",
      "pos": "PF",
      "ppg": 16.3,
      "rpg": 11.7,
      "apg": 1.7,
      "spg": 0.9,
      "bpg": 0.3,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 45,
      "rating": 77,
      "ratingRaw": 17.5
    },
    {
      "id": "thomas_05",
      "name": "Jamal Crawford",
      "pos": "SG",
      "ppg": 14.8,
      "rpg": 2.3,
      "apg": 3.5,
      "spg": 0.9,
      "bpg": 0.2,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 55,
      "rating": 64,
      "ratingRaw": 11.2
    },
    {
      "id": "curry_07",
      "name": "Eddy Curry",
      "pos": "C",
      "ppg": 19.5,
      "rpg": 7.3,
      "apg": 1.1,
      "spg": 0.4,
      "bpg": 1,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Volume Shooter"
      ],
      "popularity": 40,
      "rating": 73,
      "ratingRaw": 15.5
    },
    {
      "id": "james_07",
      "name": "Nate Robinson",
      "pos": "PG",
      "ppg": 14.2,
      "rpg": 2.7,
      "apg": 4.6,
      "spg": 1.3,
      "bpg": 0.2,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 48,
      "rating": 66,
      "ratingRaw": 12.4
    }
  ],
  "Knicks_2010s": [
    {
      "id": "melo_13",
      "name": "Carmelo Anthony",
      "pos": "SF",
      "ppg": 28.7,
      "rpg": 6.9,
      "apg": 2.6,
      "spg": 0.8,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 88,
      "rating": 79,
      "ratingRaw": 18.6
    },
    {
      "id": "amare_11",
      "name": "Amar'e Stoudemire",
      "pos": "PF",
      "ppg": 25.3,
      "rpg": 8.8,
      "apg": 2.2,
      "spg": 0.8,
      "bpg": 1,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 72,
      "rating": 81,
      "ratingRaw": 19.4
    },
    {
      "id": "chandler_12",
      "name": "Tyson Chandler",
      "pos": "C",
      "ppg": 10.1,
      "rpg": 10.8,
      "apg": 0.9,
      "spg": 0.7,
      "bpg": 1.3,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 58,
      "rating": 74,
      "ratingRaw": 15.8
    },
    {
      "id": "kidd_13",
      "name": "Jason Kidd",
      "pos": "PG",
      "ppg": 6,
      "rpg": 4.6,
      "apg": 5.5,
      "spg": 1.2,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Glue Guy"
      ],
      "popularity": 78,
      "rating": 65,
      "ratingRaw": 11.6
    },
    {
      "id": "jrsmith_13",
      "name": "J.R. Smith",
      "pos": "SG",
      "ppg": 18.1,
      "rpg": 3.8,
      "apg": 2.5,
      "spg": 1.1,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer",
        "Clutch"
      ],
      "popularity": 55,
      "rating": 68,
      "ratingRaw": 13.1
    },
    {
      "id": "felton_13",
      "name": "Raymond Felton",
      "pos": "PG",
      "ppg": 14.2,
      "rpg": 3.5,
      "apg": 6.1,
      "spg": 1,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Glue Guy"
      ],
      "popularity": 44,
      "rating": 68,
      "ratingRaw": 13.3
    }
  ],
  "Jazz_1980s": [
    {
      "id": "malone_88",
      "name": "Karl Malone",
      "pos": "PF",
      "ppg": 27.7,
      "rpg": 10.3,
      "apg": 2.9,
      "spg": 1.4,
      "bpg": 0.8,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 70,
      "rating": 86,
      "ratingRaw": 22
    },
    {
      "id": "stockton_88",
      "name": "John Stockton",
      "pos": "PG",
      "ppg": 14.7,
      "rpg": 2.8,
      "apg": 13.8,
      "spg": 3.2,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 78,
      "rating": 82,
      "ratingRaw": 20
    },
    {
      "id": "griffith_85",
      "name": "Darrell Griffith",
      "pos": "SG",
      "ppg": 22.6,
      "rpg": 4.6,
      "apg": 3,
      "spg": 1.4,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 48,
      "rating": 74,
      "ratingRaw": 15.9
    },
    {
      "id": "thurl_88",
      "name": "Thurl Bailey",
      "pos": "SF",
      "ppg": 17.5,
      "rpg": 5.7,
      "apg": 1.5,
      "spg": 0.7,
      "bpg": 1.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer"
      ],
      "popularity": 40,
      "rating": 72,
      "ratingRaw": 14.9
    },
    {
      "id": "eaton_88",
      "name": "Mark Eaton",
      "pos": "C",
      "ppg": 6.4,
      "rpg": 9.5,
      "apg": 1.3,
      "spg": 0.5,
      "bpg": 4,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 52,
      "rating": 78,
      "ratingRaw": 17.7
    },
    {
      "id": "bailey_87",
      "name": "Adrian Dantley",
      "pos": "SF",
      "ppg": 27.7,
      "rpg": 6,
      "apg": 3.5,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 62,
      "rating": 78,
      "ratingRaw": 18
    }
  ],
  "Jazz_1990s": [
    {
      "id": "malone_97",
      "name": "Karl Malone",
      "pos": "PF",
      "ppg": 27.4,
      "rpg": 9.9,
      "apg": 4.5,
      "spg": 1.4,
      "bpg": 0.7,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 70,
      "rating": 87,
      "ratingRaw": 22.4
    },
    {
      "id": "stockton_97",
      "name": "John Stockton",
      "pos": "PG",
      "ppg": 14.1,
      "rpg": 2.7,
      "apg": 10.5,
      "spg": 2.6,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 78,
      "rating": 76,
      "ratingRaw": 17.2
    },
    {
      "id": "hornacek_96",
      "name": "Jeff Hornacek",
      "pos": "SG",
      "ppg": 15,
      "rpg": 3.4,
      "apg": 4.3,
      "spg": 1.5,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 57,
      "rating": 68,
      "ratingRaw": 13.2
    },
    {
      "id": "ostertag_97",
      "name": "Greg Ostertag",
      "pos": "C",
      "ppg": 5.8,
      "rpg": 7.1,
      "apg": 0.8,
      "spg": 0.6,
      "bpg": 1.9,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 41,
      "rating": 67,
      "ratingRaw": 12.5
    },
    {
      "id": "eaton_97",
      "name": "Mark Eaton",
      "pos": "C",
      "ppg": 3.4,
      "rpg": 6.8,
      "apg": 0.9,
      "spg": 0.4,
      "bpg": 3,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 52,
      "rating": 68,
      "ratingRaw": 13.1
    },
    {
      "id": "benoit_96",
      "name": "David Benoit",
      "pos": "SF",
      "ppg": 7.3,
      "rpg": 5,
      "apg": 1.3,
      "spg": 0.5,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 38,
      "rating": 61,
      "ratingRaw": 9.6
    },
    {
      "id": "brown_97",
      "name": "Antoine Carr",
      "pos": "PF",
      "ppg": 9.4,
      "rpg": 4.5,
      "apg": 1.5,
      "spg": 0.5,
      "bpg": 0.9,
      "archetype": "Paint Beast",
      "traits": [
        "Glue Guy",
        "Rim Protector"
      ],
      "popularity": 40,
      "rating": 63,
      "ratingRaw": 10.6
    }
  ],
  "Jazz_2000s": [
    {
      "id": "boozer_08",
      "name": "Carlos Boozer",
      "pos": "PF",
      "ppg": 21.1,
      "rpg": 11.7,
      "apg": 2.4,
      "spg": 0.8,
      "bpg": 0.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 56,
      "rating": 81,
      "ratingRaw": 19.6
    },
    {
      "id": "deron_08",
      "name": "Deron Williams",
      "pos": "PG",
      "ppg": 19.5,
      "rpg": 3.4,
      "apg": 10.5,
      "spg": 1,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 68,
      "rating": 78,
      "ratingRaw": 17.7
    },
    {
      "id": "okur_07",
      "name": "Mehmet Okur",
      "pos": "C",
      "ppg": 17.4,
      "rpg": 8.4,
      "apg": 2.2,
      "spg": 0.5,
      "bpg": 1.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 48,
      "rating": 76,
      "ratingRaw": 16.8
    },
    {
      "id": "kirilenko_07",
      "name": "Andrei Kirilenko",
      "pos": "SF",
      "ppg": 15.6,
      "rpg": 7.9,
      "apg": 3.4,
      "spg": 2.1,
      "bpg": 2.9,
      "archetype": "Two-Way Star",
      "traits": [
        "Lockdown Defender",
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 63,
      "rating": 84,
      "ratingRaw": 20.8
    },
    {
      "id": "harpring_07",
      "name": "Matt Harpring",
      "pos": "SF",
      "ppg": 14.1,
      "rpg": 5.2,
      "apg": 2.2,
      "spg": 0.8,
      "bpg": 0.5,
      "archetype": "Slasher",
      "traits": [
        "Glue Guy",
        "Volume Shooter"
      ],
      "popularity": 44,
      "rating": 67,
      "ratingRaw": 12.7
    },
    {
      "id": "maynor_09",
      "name": "Eric Maynor",
      "pos": "PG",
      "ppg": 8.5,
      "rpg": 2.3,
      "apg": 4.2,
      "spg": 0.8,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Glue Guy"
      ],
      "popularity": 39,
      "rating": 60,
      "ratingRaw": 9.4
    }
  ],
  "Jazz_2010s": [
    {
      "id": "hayward_16",
      "name": "Gordon Hayward",
      "pos": "SF",
      "ppg": 21.9,
      "rpg": 5.4,
      "apg": 3.5,
      "spg": 1.1,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 60,
      "rating": 75,
      "ratingRaw": 16.3
    },
    {
      "id": "gobert_17",
      "name": "Rudy Gobert",
      "pos": "C",
      "ppg": 14,
      "rpg": 12.8,
      "apg": 1.3,
      "spg": 0.7,
      "bpg": 2.6,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 68,
      "rating": 84,
      "ratingRaw": 20.6
    },
    {
      "id": "mitchell_19",
      "name": "Donovan Mitchell",
      "pos": "SG",
      "ppg": 24.4,
      "rpg": 4.4,
      "apg": 4.2,
      "spg": 1.5,
      "bpg": 0.3,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 72,
      "rating": 76,
      "ratingRaw": 16.9
    },
    {
      "id": "ingles_18",
      "name": "Joe Ingles",
      "pos": "SF",
      "ppg": 13,
      "rpg": 4.4,
      "apg": 5,
      "spg": 1.4,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 50,
      "rating": 70,
      "ratingRaw": 13.9
    },
    {
      "id": "favors_16",
      "name": "Derrick Favors",
      "pos": "C",
      "ppg": 13.1,
      "rpg": 8.2,
      "apg": 1.1,
      "spg": 0.8,
      "bpg": 2,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 46,
      "rating": 74,
      "ratingRaw": 16.1
    },
    {
      "id": "crowder_18",
      "name": "Jae Crowder",
      "pos": "SF",
      "ppg": 10.5,
      "rpg": 4.2,
      "apg": 2,
      "spg": 1,
      "bpg": 0.4,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 44,
      "rating": 63,
      "ratingRaw": 10.8
    },
    {
      "id": "exum_16",
      "name": "Dante Exum",
      "pos": "PG",
      "ppg": 8.3,
      "rpg": 2,
      "apg": 3,
      "spg": 1.3,
      "bpg": 0.2,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 40,
      "rating": 60,
      "ratingRaw": 9.2
    }
  ],
  "Pistons_1980s": [
    {
      "id": "isiah_89",
      "name": "Isiah Thomas",
      "pos": "PG",
      "ppg": 19.5,
      "rpg": 3.6,
      "apg": 9.3,
      "spg": 1.9,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 94,
      "rating": 78,
      "ratingRaw": 18
    },
    {
      "id": "dumars_89",
      "name": "Joe Dumars",
      "pos": "SG",
      "ppg": 17.2,
      "rpg": 2.9,
      "apg": 4.4,
      "spg": 1.1,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 72,
      "rating": 68,
      "ratingRaw": 13.1
    },
    {
      "id": "laimbeer_89",
      "name": "Bill Laimbeer",
      "pos": "C",
      "ppg": 13.7,
      "rpg": 9.6,
      "apg": 2.5,
      "spg": 0.8,
      "bpg": 1.1,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 68,
      "rating": 76,
      "ratingRaw": 16.8
    },
    {
      "id": "rodman_89",
      "name": "Dennis Rodman",
      "pos": "PF",
      "ppg": 9,
      "rpg": 9.4,
      "apg": 1.1,
      "spg": 0.7,
      "bpg": 0.8,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 96,
      "rating": 69,
      "ratingRaw": 13.8
    },
    {
      "id": "dantley_87",
      "name": "Adrian Dantley",
      "pos": "SF",
      "ppg": 21.5,
      "rpg": 4.9,
      "apg": 2.4,
      "spg": 0.9,
      "bpg": 0.3,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 62,
      "rating": 71,
      "ratingRaw": 14.7
    },
    {
      "id": "johnson_89",
      "name": "Vinnie Johnson",
      "pos": "SG",
      "ppg": 15.5,
      "rpg": 3,
      "apg": 3.6,
      "spg": 0.9,
      "bpg": 0.3,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 52,
      "rating": 66,
      "ratingRaw": 12.2
    },
    {
      "id": "salley_89",
      "name": "John Salley",
      "pos": "PF",
      "ppg": 7.5,
      "rpg": 4.5,
      "apg": 1,
      "spg": 0.9,
      "bpg": 2.1,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 45,
      "rating": 66,
      "ratingRaw": 12
    },
    {
      "id": "mahorn_89",
      "name": "Rick Mahorn",
      "pos": "PF",
      "ppg": 10.2,
      "rpg": 8.1,
      "apg": 1.4,
      "spg": 0.7,
      "bpg": 0.9,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Lockdown Defender"
      ],
      "popularity": 46,
      "rating": 69,
      "ratingRaw": 13.6
    }
  ],
  "Pistons_1990s": [
    {
      "id": "hill_96",
      "name": "Grant Hill",
      "pos": "SF",
      "ppg": 21.6,
      "rpg": 7.9,
      "apg": 6.3,
      "spg": 1.6,
      "bpg": 0.7,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 78,
      "rating": 83,
      "ratingRaw": 20.4
    },
    {
      "id": "stackhouse_97",
      "name": "Jerry Stackhouse",
      "pos": "SG",
      "ppg": 19.4,
      "rpg": 3.4,
      "apg": 3.4,
      "spg": 1.1,
      "bpg": 0.5,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 57,
      "rating": 70,
      "ratingRaw": 14.1
    },
    {
      "id": "dumars_93",
      "name": "Joe Dumars",
      "pos": "SG",
      "ppg": 22.1,
      "rpg": 2.9,
      "apg": 4.8,
      "spg": 1,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 72,
      "rating": 71,
      "ratingRaw": 14.8
    },
    {
      "id": "thomas_95",
      "name": "Otis Thorpe",
      "pos": "PF",
      "ppg": 14.5,
      "rpg": 9.7,
      "apg": 2.1,
      "spg": 0.8,
      "bpg": 0.6,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 55,
      "rating": 74,
      "ratingRaw": 16.1
    },
    {
      "id": "long_95",
      "name": "Terry Mills",
      "pos": "PF",
      "ppg": 13.6,
      "rpg": 6.5,
      "apg": 1.8,
      "spg": 0.5,
      "bpg": 0.7,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 38,
      "rating": 68,
      "ratingRaw": 13.2
    }
  ],
  "Pistons_2000s": [
    {
      "id": "billups_04",
      "name": "Chauncey Billups",
      "pos": "PG",
      "ppg": 18.1,
      "rpg": 3.3,
      "apg": 5.7,
      "spg": 1.1,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 70,
      "rating": 71,
      "ratingRaw": 14.4
    },
    {
      "id": "rasheed_04",
      "name": "Rasheed Wallace",
      "pos": "PF",
      "ppg": 15.7,
      "rpg": 7,
      "apg": 1.7,
      "spg": 0.8,
      "bpg": 1.6,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 67,
      "rating": 74,
      "ratingRaw": 15.8
    },
    {
      "id": "hamilton_04",
      "name": "Richard Hamilton",
      "pos": "SG",
      "ppg": 17.6,
      "rpg": 3.2,
      "apg": 3.2,
      "spg": 0.9,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 63,
      "rating": 67,
      "ratingRaw": 12.6
    },
    {
      "id": "prince_04",
      "name": "Tayshaun Prince",
      "pos": "SF",
      "ppg": 13.5,
      "rpg": 5,
      "apg": 2.1,
      "spg": 0.7,
      "bpg": 0.9,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 57,
      "rating": 67,
      "ratingRaw": 12.8
    },
    {
      "id": "ben_04",
      "name": "Ben Wallace",
      "pos": "C",
      "ppg": 9.5,
      "rpg": 13.2,
      "apg": 1.9,
      "spg": 1.5,
      "bpg": 3,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 68,
      "rating": 85,
      "ratingRaw": 21.3
    },
    {
      "id": "hunter_04",
      "name": "Lindsey Hunter",
      "pos": "PG",
      "ppg": 6.9,
      "rpg": 2.2,
      "apg": 3,
      "spg": 1.3,
      "bpg": 0.1,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 41,
      "rating": 59,
      "ratingRaw": 8.8
    },
    {
      "id": "mcdyess_06",
      "name": "Antonio McDyess",
      "pos": "PF",
      "ppg": 12.4,
      "rpg": 8.3,
      "apg": 1.1,
      "spg": 0.7,
      "bpg": 1.2,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 52,
      "rating": 71,
      "ratingRaw": 14.7
    }
  ],
  "Magic_1990s": [
    {
      "id": "shaq_94",
      "name": "Shaquille O'Neal",
      "pos": "C",
      "ppg": 29.3,
      "rpg": 13.2,
      "apg": 3.4,
      "spg": 0.9,
      "bpg": 2.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 97,
      "rating": 96,
      "ratingRaw": 26.8
    },
    {
      "id": "penny_95",
      "name": "Anfernee Hardaway",
      "pos": "PG",
      "ppg": 22.9,
      "rpg": 7.2,
      "apg": 7.2,
      "spg": 2,
      "bpg": 0.8,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Clutch"
      ],
      "popularity": 72,
      "rating": 85,
      "ratingRaw": 21.5
    },
    {
      "id": "anderson_95",
      "name": "Nick Anderson",
      "pos": "SG",
      "ppg": 15,
      "rpg": 5.3,
      "apg": 2.7,
      "spg": 1.7,
      "bpg": 0.6,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 44,
      "rating": 71,
      "ratingRaw": 14.5
    },
    {
      "id": "horace_95",
      "name": "Horace Grant",
      "pos": "PF",
      "ppg": 12,
      "rpg": 9,
      "apg": 3,
      "spg": 1.5,
      "bpg": 1,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 56,
      "rating": 75,
      "ratingRaw": 16.7
    },
    {
      "id": "shaw_95",
      "name": "Brian Shaw",
      "pos": "PG",
      "ppg": 8.9,
      "rpg": 3.9,
      "apg": 5.5,
      "spg": 1,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Glue Guy"
      ],
      "popularity": 41,
      "rating": 66,
      "ratingRaw": 12
    },
    {
      "id": "scott_95",
      "name": "Dennis Scott",
      "pos": "SF",
      "ppg": 14.2,
      "rpg": 3.1,
      "apg": 1.7,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 43,
      "rating": 63,
      "ratingRaw": 10.8
    },
    {
      "id": "gabriel_95",
      "name": "Gabriel Hatcher",
      "pos": "PF",
      "ppg": 9.2,
      "rpg": 7.5,
      "apg": 1.3,
      "spg": 0.8,
      "bpg": 1.1,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 35,
      "rating": 68,
      "ratingRaw": 13.2
    }
  ],
  "Magic_2000s": [
    {
      "id": "tmac_03",
      "name": "Tracy McGrady",
      "pos": "SG",
      "ppg": 32.1,
      "rpg": 6.5,
      "apg": 5.5,
      "spg": 1.7,
      "bpg": 0.8,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 84,
      "rating": 88,
      "ratingRaw": 22.5
    },
    {
      "id": "dwight_09",
      "name": "Dwight Howard",
      "pos": "C",
      "ppg": 20.6,
      "rpg": 13.8,
      "apg": 1.4,
      "spg": 0.9,
      "bpg": 2.9,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 75,
      "rating": 91,
      "ratingRaw": 24
    },
    {
      "id": "turkoglu_08",
      "name": "Hedo Turkoglu",
      "pos": "SF",
      "ppg": 19.5,
      "rpg": 5.7,
      "apg": 5.6,
      "spg": 0.9,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 52,
      "rating": 75,
      "ratingRaw": 16.6
    },
    {
      "id": "lewis_09",
      "name": "Rashard Lewis",
      "pos": "PF",
      "ppg": 18.2,
      "rpg": 5.7,
      "apg": 2.1,
      "spg": 1,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 51,
      "rating": 71,
      "ratingRaw": 14.5
    },
    {
      "id": "arenas_04",
      "name": "Grant Hill",
      "pos": "SF",
      "ppg": 14.6,
      "rpg": 4.7,
      "apg": 3.5,
      "spg": 0.9,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 78,
      "rating": 68,
      "ratingRaw": 13.3
    },
    {
      "id": "bogans_09",
      "name": "Keith Bogans",
      "pos": "SG",
      "ppg": 8.3,
      "rpg": 2.7,
      "apg": 1.8,
      "spg": 1.1,
      "bpg": 0.3,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 38,
      "rating": 59,
      "ratingRaw": 8.9
    },
    {
      "id": "pietrus_09",
      "name": "Mickael Pietrus",
      "pos": "SF",
      "ppg": 10.2,
      "rpg": 3.8,
      "apg": 1.7,
      "spg": 1.4,
      "bpg": 0.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Floor Spacer"
      ],
      "popularity": 40,
      "rating": 63,
      "ratingRaw": 10.9
    }
  ],
  "Magic_2010s": [
    {
      "id": "dwight_11",
      "name": "Dwight Howard",
      "pos": "C",
      "ppg": 22.9,
      "rpg": 14.1,
      "apg": 1.9,
      "spg": 0.8,
      "bpg": 2.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 75,
      "rating": 92,
      "ratingRaw": 24.5
    },
    {
      "id": "vucevic_14",
      "name": "Nikola Vucevic",
      "pos": "C",
      "ppg": 16.3,
      "rpg": 10,
      "apg": 3.2,
      "spg": 0.7,
      "bpg": 1.1,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 55,
      "rating": 78,
      "ratingRaw": 18.1
    },
    {
      "id": "gordon_18",
      "name": "Aaron Gordon",
      "pos": "PF",
      "ppg": 16,
      "rpg": 7.6,
      "apg": 3.3,
      "spg": 0.9,
      "bpg": 0.8,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 58,
      "rating": 74,
      "ratingRaw": 16.2
    },
    {
      "id": "anderson_13",
      "name": "Ryan Anderson",
      "pos": "PF",
      "ppg": 16.1,
      "rpg": 7.9,
      "apg": 1.5,
      "spg": 0.5,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 46,
      "rating": 71,
      "ratingRaw": 14.5
    },
    {
      "id": "afflalo_14",
      "name": "Arron Afflalo",
      "pos": "SG",
      "ppg": 17.3,
      "rpg": 3.7,
      "apg": 2.3,
      "spg": 0.8,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer"
      ],
      "popularity": 42,
      "rating": 66,
      "ratingRaw": 12.4
    }
  ],
  "Suns_1970s": [
    {
      "id": "westphal_77",
      "name": "Paul Westphal",
      "pos": "SG",
      "ppg": 24,
      "rpg": 3.6,
      "apg": 5.6,
      "spg": 2,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 62,
      "rating": 77,
      "ratingRaw": 17.6
    },
    {
      "id": "adams_76",
      "name": "Alvan Adams",
      "pos": "C",
      "ppg": 19.2,
      "rpg": 9.2,
      "apg": 5.2,
      "spg": 1.5,
      "bpg": 1.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 52,
      "rating": 85,
      "ratingRaw": 21.1
    },
    {
      "id": "scott_76",
      "name": "Charlie Scott",
      "pos": "PG",
      "ppg": 24.3,
      "rpg": 4.3,
      "apg": 6.2,
      "spg": 1.8,
      "bpg": 0.3,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 55,
      "rating": 79,
      "ratingRaw": 18.3
    },
    {
      "id": "silas_76",
      "name": "Paul Silas",
      "pos": "PF",
      "ppg": 8.5,
      "rpg": 9.5,
      "apg": 1.9,
      "spg": 0.9,
      "bpg": 0.4,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 58,
      "rating": 69,
      "ratingRaw": 13.8
    },
    {
      "id": "hawkins_76",
      "name": "Connie Hawkins",
      "pos": "SF",
      "ppg": 16.3,
      "rpg": 8.3,
      "apg": 4.2,
      "spg": 1.1,
      "bpg": 1,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 63,
      "rating": 78,
      "ratingRaw": 17.8
    }
  ],
  "Suns_1990s": [
    {
      "id": "barkley_93",
      "name": "Charles Barkley",
      "pos": "PF",
      "ppg": 25.6,
      "rpg": 12.2,
      "apg": 5.1,
      "spg": 1.6,
      "bpg": 1,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 91,
      "rating": 92,
      "ratingRaw": 24.5
    },
    {
      "id": "kj_93",
      "name": "Kevin Johnson",
      "pos": "PG",
      "ppg": 20.4,
      "rpg": 4.3,
      "apg": 10.6,
      "spg": 1.7,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 68,
      "rating": 81,
      "ratingRaw": 19.5
    },
    {
      "id": "majerle_93",
      "name": "Dan Majerle",
      "pos": "SG",
      "ppg": 16.8,
      "rpg": 5.1,
      "apg": 3.5,
      "spg": 1.8,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 60,
      "rating": 73,
      "ratingRaw": 15.3
    },
    {
      "id": "manning_93",
      "name": "Danny Manning",
      "pos": "SF",
      "ppg": 18.9,
      "rpg": 6.8,
      "apg": 2.7,
      "spg": 1,
      "bpg": 0.7,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 58,
      "rating": 74,
      "ratingRaw": 16.1
    },
    {
      "id": "chambers_93",
      "name": "Tom Chambers",
      "pos": "PF",
      "ppg": 18.9,
      "rpg": 6.8,
      "apg": 3.1,
      "spg": 0.9,
      "bpg": 0.7,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 57,
      "rating": 74,
      "ratingRaw": 16.2
    },
    {
      "id": "ceballos_93",
      "name": "Cedric Ceballos",
      "pos": "SF",
      "ppg": 12.8,
      "rpg": 5.5,
      "apg": 1.4,
      "spg": 0.6,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 48,
      "rating": 65,
      "ratingRaw": 11.7
    },
    {
      "id": "johnson_93",
      "name": "Frank Johnson",
      "pos": "PG",
      "ppg": 7.3,
      "rpg": 1.8,
      "apg": 4.2,
      "spg": 0.8,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Glue Guy"
      ],
      "popularity": 38,
      "rating": 59,
      "ratingRaw": 8.7
    }
  ],
  "Suns_2000s": [
    {
      "id": "nash_06",
      "name": "Steve Nash",
      "pos": "PG",
      "ppg": 18.8,
      "rpg": 4.3,
      "apg": 10.5,
      "spg": 0.8,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 82,
      "rating": 77,
      "ratingRaw": 17.6
    },
    {
      "id": "amare_06",
      "name": "Amar'e Stoudemire",
      "pos": "PF",
      "ppg": 26,
      "rpg": 9,
      "apg": 1.9,
      "spg": 0.9,
      "bpg": 1.6,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 72,
      "rating": 84,
      "ratingRaw": 20.6
    },
    {
      "id": "marion_06",
      "name": "Shawn Marion",
      "pos": "SF",
      "ppg": 19,
      "rpg": 11.2,
      "apg": 2.5,
      "spg": 1.9,
      "bpg": 1.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 68,
      "rating": 85,
      "ratingRaw": 21.4
    },
    {
      "id": "barbosa_07",
      "name": "Leandro Barbosa",
      "pos": "SG",
      "ppg": 18.1,
      "rpg": 2.6,
      "apg": 4.2,
      "spg": 0.8,
      "bpg": 0.2,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 52,
      "rating": 67,
      "ratingRaw": 12.8
    },
    {
      "id": "richardson_06",
      "name": "Quentin Richardson",
      "pos": "SF",
      "ppg": 12.7,
      "rpg": 5.3,
      "apg": 2.2,
      "spg": 0.9,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 47,
      "rating": 66,
      "ratingRaw": 12.3
    },
    {
      "id": "jones_06",
      "name": "James Jones",
      "pos": "SF",
      "ppg": 7,
      "rpg": 2.7,
      "apg": 1.3,
      "spg": 0.5,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 40,
      "rating": 56,
      "ratingRaw": 7.4
    },
    {
      "id": "tmac_suns",
      "name": "Boris Diaw",
      "pos": "PF",
      "ppg": 13.3,
      "rpg": 6.7,
      "apg": 6.2,
      "spg": 0.9,
      "bpg": 0.6,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 55,
      "rating": 74,
      "ratingRaw": 16
    }
  ],
  "Suns_2020s": [
    {
      "id": "booker_22",
      "name": "Devin Booker",
      "pos": "SG",
      "ppg": 27.8,
      "rpg": 5,
      "apg": 4.7,
      "spg": 0.9,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 72,
      "rating": 78,
      "ratingRaw": 18
    },
    {
      "id": "durant_23",
      "name": "Kevin Durant",
      "pos": "SF",
      "ppg": 29.1,
      "rpg": 6.7,
      "apg": 5,
      "spg": 0.8,
      "bpg": 1.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 91,
      "rating": 85,
      "ratingRaw": 21.3
    },
    {
      "id": "beal_23",
      "name": "Bradley Beal",
      "pos": "SG",
      "ppg": 18.2,
      "rpg": 4.4,
      "apg": 5,
      "spg": 1,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 62,
      "rating": 72,
      "ratingRaw": 15
    },
    {
      "id": "bridges_22",
      "name": "Mikal Bridges",
      "pos": "SF",
      "ppg": 17.2,
      "rpg": 4.3,
      "apg": 2.6,
      "spg": 1.4,
      "bpg": 0.8,
      "archetype": "Two-Way Star",
      "traits": [
        "Lockdown Defender",
        "Floor Spacer"
      ],
      "popularity": 52,
      "rating": 71,
      "ratingRaw": 14.4
    },
    {
      "id": "ayton_22",
      "name": "Deandre Ayton",
      "pos": "C",
      "ppg": 17.2,
      "rpg": 10.2,
      "apg": 1.4,
      "spg": 0.7,
      "bpg": 1.4,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Volume Shooter"
      ],
      "popularity": 55,
      "rating": 78,
      "ratingRaw": 18
    },
    {
      "id": "cp3_22",
      "name": "Chris Paul",
      "pos": "PG",
      "ppg": 14.7,
      "rpg": 4.5,
      "apg": 8.9,
      "spg": 1.4,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Clutch",
        "Floor Spacer"
      ],
      "popularity": 78,
      "rating": 75,
      "ratingRaw": 16.4
    }
  ],
  "Nuggets_1980s": [
    {
      "id": "english_83",
      "name": "Alex English",
      "pos": "SF",
      "ppg": 28.4,
      "rpg": 6,
      "apg": 4,
      "spg": 1,
      "bpg": 0.6,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 62,
      "rating": 80,
      "ratingRaw": 19.1
    },
    {
      "id": "lever_88",
      "name": "Fat Lever",
      "pos": "PG",
      "ppg": 19.7,
      "rpg": 8.9,
      "apg": 8,
      "spg": 3.1,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 45,
      "rating": 88,
      "ratingRaw": 22.8
    },
    {
      "id": "rasmussen_88",
      "name": "Blair Rasmussen",
      "pos": "C",
      "ppg": 13,
      "rpg": 7.5,
      "apg": 1,
      "spg": 0.6,
      "bpg": 1.4,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 38,
      "rating": 71,
      "ratingRaw": 14.4
    },
    {
      "id": "vandeweghe_84",
      "name": "Kiki Vandeweghe",
      "pos": "SF",
      "ppg": 29.4,
      "rpg": 6,
      "apg": 2.5,
      "spg": 0.7,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer"
      ],
      "popularity": 52,
      "rating": 78,
      "ratingRaw": 18
    },
    {
      "id": "issel_85",
      "name": "Dan Issel",
      "pos": "C",
      "ppg": 21.6,
      "rpg": 8.6,
      "apg": 2.5,
      "spg": 0.8,
      "bpg": 0.9,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Volume Shooter"
      ],
      "popularity": 68,
      "rating": 79,
      "ratingRaw": 18.2
    },
    {
      "id": "dunn_87",
      "name": "T.R. Dunn",
      "pos": "SG",
      "ppg": 6.5,
      "rpg": 4.9,
      "apg": 2.5,
      "spg": 2.1,
      "bpg": 0.3,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 40,
      "rating": 65,
      "ratingRaw": 11.5
    }
  ],
  "Nuggets_2000s": [
    {
      "id": "melo_06",
      "name": "Carmelo Anthony",
      "pos": "SF",
      "ppg": 26.5,
      "rpg": 4.9,
      "apg": 2.8,
      "spg": 1,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 88,
      "rating": 76,
      "ratingRaw": 16.9
    },
    {
      "id": "iverson_07",
      "name": "Allen Iverson",
      "pos": "PG",
      "ppg": 26.4,
      "rpg": 3.8,
      "apg": 7.4,
      "spg": 1.8,
      "bpg": 0.1,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 98,
      "rating": 80,
      "ratingRaw": 19
    },
    {
      "id": "camby_07",
      "name": "Marcus Camby",
      "pos": "C",
      "ppg": 11,
      "rpg": 12.8,
      "apg": 1.9,
      "spg": 1.2,
      "bpg": 3.3,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 58,
      "rating": 86,
      "ratingRaw": 21.6
    },
    {
      "id": "martin_07",
      "name": "Kenyon Martin",
      "pos": "PF",
      "ppg": 13.2,
      "rpg": 7.2,
      "apg": 1.8,
      "spg": 0.8,
      "bpg": 1.2,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 54,
      "rating": 71,
      "ratingRaw": 14.7
    },
    {
      "id": "nene_06",
      "name": "Nene",
      "pos": "C",
      "ppg": 13.7,
      "rpg": 7.5,
      "apg": 2.1,
      "spg": 0.9,
      "bpg": 1.3,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 42,
      "rating": 73,
      "ratingRaw": 15.5
    },
    {
      "id": "boykins_04",
      "name": "Earl Boykins",
      "pos": "PG",
      "ppg": 13.2,
      "rpg": 2.2,
      "apg": 4,
      "spg": 0.8,
      "bpg": 0.1,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 44,
      "rating": 63,
      "ratingRaw": 10.7
    },
    {
      "id": "anthony_09",
      "name": "J.R. Smith",
      "pos": "SG",
      "ppg": 12.3,
      "rpg": 2.6,
      "apg": 2.7,
      "spg": 0.8,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer"
      ],
      "popularity": 55,
      "rating": 62,
      "ratingRaw": 10.1
    }
  ],
  "Nuggets_2010s": [
    {
      "id": "jokic_19",
      "name": "Nikola Jokic",
      "pos": "C",
      "ppg": 20.1,
      "rpg": 10.8,
      "apg": 6.9,
      "spg": 1.4,
      "bpg": 0.7,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 80,
      "rating": 87,
      "ratingRaw": 22.2
    },
    {
      "id": "murray_19",
      "name": "Jamal Murray",
      "pos": "PG",
      "ppg": 18.2,
      "rpg": 4.2,
      "apg": 4.8,
      "spg": 0.9,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 65,
      "rating": 71,
      "ratingRaw": 14.4
    },
    {
      "id": "melo_11",
      "name": "Carmelo Anthony",
      "pos": "SF",
      "ppg": 28.2,
      "rpg": 6.1,
      "apg": 3,
      "spg": 1.3,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 88,
      "rating": 79,
      "ratingRaw": 18.6
    },
    {
      "id": "faried_14",
      "name": "Kenneth Faried",
      "pos": "PF",
      "ppg": 13.9,
      "rpg": 9.6,
      "apg": 1,
      "spg": 0.8,
      "bpg": 0.7,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Volume Shooter"
      ],
      "popularity": 44,
      "rating": 73,
      "ratingRaw": 15.4
    },
    {
      "id": "lawson_14",
      "name": "Ty Lawson",
      "pos": "PG",
      "ppg": 16.7,
      "rpg": 3.1,
      "apg": 9.6,
      "spg": 1.2,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Clutch"
      ],
      "popularity": 48,
      "rating": 74,
      "ratingRaw": 16.2
    },
    {
      "id": "gallinari_13",
      "name": "Danilo Gallinari",
      "pos": "SF",
      "ppg": 16.2,
      "rpg": 4.8,
      "apg": 2.3,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 46,
      "rating": 68,
      "ratingRaw": 13
    }
  ],
  "Nuggets_2020s": [
    {
      "id": "jokic_23",
      "name": "Nikola Jokic",
      "pos": "C",
      "ppg": 26.4,
      "rpg": 12.4,
      "apg": 9,
      "spg": 1.3,
      "bpg": 0.7,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Clutch",
        "Floor Spacer"
      ],
      "popularity": 80,
      "rating": 95,
      "ratingRaw": 26.3
    },
    {
      "id": "murray_23",
      "name": "Jamal Murray",
      "pos": "PG",
      "ppg": 21.2,
      "rpg": 4.1,
      "apg": 6.2,
      "spg": 1,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 65,
      "rating": 75,
      "ratingRaw": 16.4
    },
    {
      "id": "porter_23",
      "name": "Michael Porter Jr.",
      "pos": "SF",
      "ppg": 16.7,
      "rpg": 7.4,
      "apg": 1.5,
      "spg": 0.7,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 52,
      "rating": 71,
      "ratingRaw": 14.6
    },
    {
      "id": "gordon_23",
      "name": "Aaron Gordon",
      "pos": "PF",
      "ppg": 13.9,
      "rpg": 6.4,
      "apg": 3.5,
      "spg": 0.9,
      "bpg": 0.6,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Glue Guy",
        "Lockdown Defender"
      ],
      "popularity": 58,
      "rating": 71,
      "ratingRaw": 14.5
    },
    {
      "id": "braun_24",
      "name": "Christian Braun",
      "pos": "SG",
      "ppg": 9.8,
      "rpg": 4,
      "apg": 1.9,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Glue Guy"
      ],
      "popularity": 38,
      "rating": 62,
      "ratingRaw": 10.2
    }
  ],
  "Sixers_1960s": [
    {
      "id": "chamberlain_67",
      "name": "Wilt Chamberlain",
      "pos": "C",
      "ppg": 24.1,
      "rpg": 24.2,
      "apg": 7.8,
      "spg": 0.7,
      "bpg": 2.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 92,
      "rating": 99,
      "ratingRaw": 35.3
    },
    {
      "id": "greer_67",
      "name": "Hal Greer",
      "pos": "SG",
      "ppg": 22.1,
      "rpg": 5.3,
      "apg": 4.4,
      "spg": 0.9,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 58,
      "rating": 75,
      "ratingRaw": 16.3
    },
    {
      "id": "walker_67",
      "name": "Chet Walker",
      "pos": "SF",
      "ppg": 19.3,
      "rpg": 8.1,
      "apg": 2.8,
      "spg": 0.7,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 52,
      "rating": 75,
      "ratingRaw": 16.4
    },
    {
      "id": "jones_67",
      "name": "Wali Jones",
      "pos": "SG",
      "ppg": 12.2,
      "rpg": 3.3,
      "apg": 4.2,
      "spg": 0.8,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 38,
      "rating": 64,
      "ratingRaw": 11.4
    },
    {
      "id": "cunningham_68",
      "name": "Billy Cunningham",
      "pos": "SF",
      "ppg": 18.5,
      "rpg": 9.4,
      "apg": 3.5,
      "spg": 0.8,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 68,
      "rating": 78,
      "ratingRaw": 17.8
    },
    {
      "id": "jackson_67",
      "name": "Luke Jackson",
      "pos": "PF",
      "ppg": 11.9,
      "rpg": 9.1,
      "apg": 2.4,
      "spg": 0.6,
      "bpg": 0.6,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 36,
      "rating": 71,
      "ratingRaw": 14.8
    }
  ],
  "Sixers_1980s": [
    {
      "id": "erving_83",
      "name": "Julius Erving",
      "pos": "SF",
      "ppg": 22.4,
      "rpg": 6.8,
      "apg": 5,
      "spg": 1.9,
      "bpg": 1.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 92,
      "rating": 84,
      "ratingRaw": 20.6
    },
    {
      "id": "malone_83",
      "name": "Moses Malone",
      "pos": "C",
      "ppg": 24.5,
      "rpg": 15.3,
      "apg": 1.3,
      "spg": 1.1,
      "bpg": 1.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 85,
      "rating": 91,
      "ratingRaw": 24.4
    },
    {
      "id": "cheeks_87",
      "name": "Maurice Cheeks",
      "pos": "PG",
      "ppg": 14,
      "rpg": 3.2,
      "apg": 7.7,
      "spg": 2.3,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 57,
      "rating": 73,
      "ratingRaw": 15.7
    },
    {
      "id": "toney_83",
      "name": "Andrew Toney",
      "pos": "SG",
      "ppg": 19.7,
      "rpg": 3,
      "apg": 4.5,
      "spg": 1.3,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 52,
      "rating": 71,
      "ratingRaw": 14.4
    },
    {
      "id": "toney_83b",
      "name": "Bobby Jones",
      "pos": "PF",
      "ppg": 9.4,
      "rpg": 5.5,
      "apg": 2,
      "spg": 1.3,
      "bpg": 1.3,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 52,
      "rating": 68,
      "ratingRaw": 13.1
    },
    {
      "id": "edwards_83",
      "name": "Franklin Edwards",
      "pos": "SG",
      "ppg": 9.5,
      "rpg": 1.6,
      "apg": 3.8,
      "spg": 0.7,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 38,
      "rating": 59,
      "ratingRaw": 8.9
    },
    {
      "id": "richardson_82",
      "name": "Clint Richardson",
      "pos": "SG",
      "ppg": 9.9,
      "rpg": 4.2,
      "apg": 4.1,
      "spg": 0.7,
      "bpg": 0.2,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 39,
      "rating": 64,
      "ratingRaw": 11.2
    }
  ],
  "Sixers_1990s": [
    {
      "id": "barkley_91",
      "name": "Charles Barkley",
      "pos": "PF",
      "ppg": 27.6,
      "rpg": 11.1,
      "apg": 4.4,
      "spg": 1.8,
      "bpg": 0.8,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 91,
      "rating": 90,
      "ratingRaw": 23.9
    },
    {
      "id": "iverson_99",
      "name": "Allen Iverson",
      "pos": "PG",
      "ppg": 26.8,
      "rpg": 4.9,
      "apg": 6.1,
      "spg": 2.3,
      "bpg": 0.2,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 98,
      "rating": 82,
      "ratingRaw": 19.9
    },
    {
      "id": "coleman_93",
      "name": "Derrick Coleman",
      "pos": "PF",
      "ppg": 20.2,
      "rpg": 10.7,
      "apg": 3.7,
      "spg": 1.1,
      "bpg": 1,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 55,
      "rating": 83,
      "ratingRaw": 20.4
    },
    {
      "id": "weatherspoon_95",
      "name": "Clarence Weatherspoon",
      "pos": "PF",
      "ppg": 17.4,
      "rpg": 10,
      "apg": 2.3,
      "spg": 1,
      "bpg": 0.9,
      "archetype": "Two-Way Star",
      "traits": [
        "Lockdown Defender",
        "Volume Shooter"
      ],
      "popularity": 42,
      "rating": 78,
      "ratingRaw": 18
    },
    {
      "id": "mashburn_98",
      "name": "Sharone Wright",
      "pos": "C",
      "ppg": 10.9,
      "rpg": 7.4,
      "apg": 0.8,
      "spg": 0.6,
      "bpg": 1.9,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 42,
      "rating": 70,
      "ratingRaw": 14.3
    }
  ],
  "Sixers_2000s": [
    {
      "id": "iverson_01",
      "name": "Allen Iverson",
      "pos": "PG",
      "ppg": 31.1,
      "rpg": 4.6,
      "apg": 4.6,
      "spg": 2.5,
      "bpg": 0.3,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 98,
      "rating": 83,
      "ratingRaw": 20.5
    },
    {
      "id": "webber_05",
      "name": "Chris Webber",
      "pos": "PF",
      "ppg": 20.2,
      "rpg": 9.7,
      "apg": 4.5,
      "spg": 1.2,
      "bpg": 0.9,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 76,
      "rating": 83,
      "ratingRaw": 20.1
    },
    {
      "id": "iguodala_09",
      "name": "Andre Iguodala",
      "pos": "SF",
      "ppg": 14.7,
      "rpg": 5.8,
      "apg": 6.3,
      "spg": 2,
      "bpg": 0.7,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 68,
      "rating": 77,
      "ratingRaw": 17.3
    },
    {
      "id": "mckinley_03",
      "name": "Eric Snow",
      "pos": "PG",
      "ppg": 8.7,
      "rpg": 2.9,
      "apg": 5.2,
      "spg": 1.5,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 40,
      "rating": 64,
      "ratingRaw": 11.4
    },
    {
      "id": "dalembrt_04",
      "name": "Samuel Dalembert",
      "pos": "C",
      "ppg": 8.6,
      "rpg": 9.9,
      "apg": 0.9,
      "spg": 0.6,
      "bpg": 2.3,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 41,
      "rating": 74,
      "ratingRaw": 16.1
    }
  ],
  "Sixers_2010s": [
    {
      "id": "embiid_19",
      "name": "Joel Embiid",
      "pos": "C",
      "ppg": 27.5,
      "rpg": 13.6,
      "apg": 3.7,
      "spg": 0.9,
      "bpg": 3.7,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 65,
      "rating": 99,
      "ratingRaw": 28.5
    },
    {
      "id": "simmons_19",
      "name": "Ben Simmons",
      "pos": "PG",
      "ppg": 16.9,
      "rpg": 8.8,
      "apg": 8.2,
      "spg": 1.8,
      "bpg": 0.8,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 68,
      "rating": 85,
      "ratingRaw": 21.1
    },
    {
      "id": "harris_19",
      "name": "Tobias Harris",
      "pos": "SF",
      "ppg": 19.6,
      "rpg": 7.5,
      "apg": 3.2,
      "spg": 0.7,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 55,
      "rating": 75,
      "ratingRaw": 16.5
    },
    {
      "id": "saric_18",
      "name": "Dario Saric",
      "pos": "PF",
      "ppg": 12.8,
      "rpg": 5.8,
      "apg": 1.9,
      "spg": 0.8,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 44,
      "rating": 66,
      "ratingRaw": 12.3
    },
    {
      "id": "covington_18",
      "name": "Robert Covington",
      "pos": "SF",
      "ppg": 12.5,
      "rpg": 6.3,
      "apg": 1.6,
      "spg": 2.1,
      "bpg": 1.1,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Floor Spacer"
      ],
      "popularity": 48,
      "rating": 72,
      "ratingRaw": 15
    },
    {
      "id": "redick_18",
      "name": "J.J. Redick",
      "pos": "SG",
      "ppg": 17.1,
      "rpg": 2.5,
      "apg": 3.2,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 78,
      "rating": 66,
      "ratingRaw": 12.1
    }
  ],
  "Rockets_1990s": [
    {
      "id": "hakeem_94",
      "name": "Hakeem Olajuwon",
      "pos": "C",
      "ppg": 27.3,
      "rpg": 11.9,
      "apg": 3.6,
      "spg": 1.6,
      "bpg": 3.7,
      "archetype": "Two-Way Star",
      "traits": [
        "Rim Protector",
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 88,
      "rating": 99,
      "ratingRaw": 28
    },
    {
      "id": "clyde_95",
      "name": "Clyde Drexler",
      "pos": "SG",
      "ppg": 21.4,
      "rpg": 7,
      "apg": 4.4,
      "spg": 1.6,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 78,
      "rating": 79,
      "ratingRaw": 18.2
    },
    {
      "id": "horry_95",
      "name": "Robert Horry",
      "pos": "PF",
      "ppg": 10.1,
      "rpg": 6.7,
      "apg": 2.9,
      "spg": 1.3,
      "bpg": 1.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch",
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 62,
      "rating": 71,
      "ratingRaw": 14.7
    },
    {
      "id": "cassell_95",
      "name": "Sam Cassell",
      "pos": "PG",
      "ppg": 14.3,
      "rpg": 3.5,
      "apg": 6.5,
      "spg": 1,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Clutch"
      ],
      "popularity": 62,
      "rating": 70,
      "ratingRaw": 13.9
    },
    {
      "id": "otis_95",
      "name": "Otis Thorpe",
      "pos": "PF",
      "ppg": 13.7,
      "rpg": 9.7,
      "apg": 2.1,
      "spg": 0.8,
      "bpg": 0.6,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 55,
      "rating": 74,
      "ratingRaw": 15.9
    }
  ],
  "Rockets_2000s": [
    {
      "id": "yao_06",
      "name": "Yao Ming",
      "pos": "C",
      "ppg": 25,
      "rpg": 9.4,
      "apg": 2.5,
      "spg": 0.6,
      "bpg": 2,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 90,
      "rating": 85,
      "ratingRaw": 21.2
    },
    {
      "id": "tmac_04",
      "name": "Tracy McGrady",
      "pos": "SF",
      "ppg": 24.4,
      "rpg": 5.3,
      "apg": 6.5,
      "spg": 1.5,
      "bpg": 0.9,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 84,
      "rating": 82,
      "ratingRaw": 19.7
    },
    {
      "id": "scola_07",
      "name": "Luis Scola",
      "pos": "PF",
      "ppg": 12.8,
      "rpg": 7.7,
      "apg": 1.4,
      "spg": 0.8,
      "bpg": 0.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 48,
      "rating": 69,
      "ratingRaw": 13.6
    },
    {
      "id": "alston_07",
      "name": "Rafer Alston",
      "pos": "PG",
      "ppg": 9,
      "rpg": 2.6,
      "apg": 4.6,
      "spg": 0.9,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Glue Guy"
      ],
      "popularity": 42,
      "rating": 62,
      "ratingRaw": 10.3
    },
    {
      "id": "hayes_07",
      "name": "Chuck Hayes",
      "pos": "C",
      "ppg": 7.3,
      "rpg": 8.5,
      "apg": 1.3,
      "spg": 0.8,
      "bpg": 1,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 38,
      "rating": 68,
      "ratingRaw": 13.2
    }
  ],
  "Rockets_2010s": [
    {
      "id": "harden_19",
      "name": "James Harden",
      "pos": "SG",
      "ppg": 36.1,
      "rpg": 6.6,
      "apg": 7.5,
      "spg": 2,
      "bpg": 0.7,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 65,
      "rating": 93,
      "ratingRaw": 25.1
    },
    {
      "id": "cp3_18",
      "name": "Chris Paul",
      "pos": "PG",
      "ppg": 18.6,
      "rpg": 5.4,
      "apg": 7.9,
      "spg": 1.7,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 78,
      "rating": 78,
      "ratingRaw": 18
    },
    {
      "id": "tucker_18",
      "name": "P.J. Tucker",
      "pos": "PF",
      "ppg": 8,
      "rpg": 5.8,
      "apg": 1.5,
      "spg": 1.1,
      "bpg": 0.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 48,
      "rating": 64,
      "ratingRaw": 11.2
    },
    {
      "id": "gordon_18b",
      "name": "Eric Gordon",
      "pos": "SG",
      "ppg": 16.2,
      "rpg": 2.5,
      "apg": 2.4,
      "spg": 0.7,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer"
      ],
      "popularity": 50,
      "rating": 64,
      "ratingRaw": 11
    },
    {
      "id": "capela_18",
      "name": "Clint Capela",
      "pos": "C",
      "ppg": 13.9,
      "rpg": 12.7,
      "apg": 1.2,
      "spg": 0.9,
      "bpg": 1.8,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 52,
      "rating": 81,
      "ratingRaw": 19.4
    }
  ],
  "Thunder_1970s": [
    {
      "id": "guswilliams_79",
      "name": "Gus Williams",
      "pos": "PG",
      "ppg": 22,
      "rpg": 4,
      "apg": 6.9,
      "spg": 2.4,
      "bpg": 0.2,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 55,
      "rating": 79,
      "ratingRaw": 18.3
    },
    {
      "id": "djohnson_79",
      "name": "Dennis Johnson",
      "pos": "SG",
      "ppg": 15.9,
      "rpg": 3.9,
      "apg": 4.7,
      "spg": 2.1,
      "bpg": 0.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 62,
      "rating": 72,
      "ratingRaw": 15.2
    },
    {
      "id": "brown_79",
      "name": "Fred Brown",
      "pos": "SG",
      "ppg": 15.3,
      "rpg": 2.7,
      "apg": 4.3,
      "spg": 1.3,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 50,
      "rating": 67,
      "ratingRaw": 12.6
    },
    {
      "id": "silas_79",
      "name": "Jack Sikma",
      "pos": "C",
      "ppg": 15.6,
      "rpg": 12.4,
      "apg": 3,
      "spg": 0.9,
      "bpg": 1,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Floor Spacer"
      ],
      "popularity": 60,
      "rating": 81,
      "ratingRaw": 19.6
    },
    {
      "id": "green_79",
      "name": "Lonnie Shelton",
      "pos": "PF",
      "ppg": 13.2,
      "rpg": 7.1,
      "apg": 2.2,
      "spg": 0.8,
      "bpg": 0.6,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 40,
      "rating": 70,
      "ratingRaw": 13.9
    }
  ],
  "Thunder_1990s": [
    {
      "id": "payton_96",
      "name": "Gary Payton",
      "pos": "PG",
      "ppg": 24.2,
      "rpg": 6.5,
      "apg": 8.9,
      "spg": 2.2,
      "bpg": 0.3,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 78,
      "rating": 86,
      "ratingRaw": 21.8
    },
    {
      "id": "kemp_96",
      "name": "Shawn Kemp",
      "pos": "PF",
      "ppg": 19.6,
      "rpg": 11.4,
      "apg": 2.4,
      "spg": 1.2,
      "bpg": 1.8,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 72,
      "rating": 85,
      "ratingRaw": 21.3
    },
    {
      "id": "schrempf_96",
      "name": "Detlef Schrempf",
      "pos": "SF",
      "ppg": 17.5,
      "rpg": 7.1,
      "apg": 5,
      "spg": 0.9,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Floor Spacer",
        "Elite Playmaker"
      ],
      "popularity": 57,
      "rating": 75,
      "ratingRaw": 16.6
    },
    {
      "id": "mcmillan_96",
      "name": "Nate McMillan",
      "pos": "PG",
      "ppg": 7,
      "rpg": 5.4,
      "apg": 7.2,
      "spg": 2.3,
      "bpg": 0.3,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Elite Playmaker",
        "Glue Guy"
      ],
      "popularity": 42,
      "rating": 72,
      "ratingRaw": 14.9
    },
    {
      "id": "gill_96",
      "name": "Kendall Gill",
      "pos": "SG",
      "ppg": 14,
      "rpg": 4.5,
      "apg": 3.2,
      "spg": 2.2,
      "bpg": 0.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Volume Shooter"
      ],
      "popularity": 48,
      "rating": 70,
      "ratingRaw": 14.3
    }
  ],
  "Thunder_2010s": [
    {
      "id": "durant_12",
      "name": "Kevin Durant",
      "pos": "SF",
      "ppg": 32,
      "rpg": 7.4,
      "apg": 5.5,
      "spg": 1.3,
      "bpg": 1.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch",
        "Volume Shooter",
        "Floor Spacer"
      ],
      "popularity": 91,
      "rating": 89,
      "ratingRaw": 23.1
    },
    {
      "id": "russ_17",
      "name": "Russell Westbrook",
      "pos": "PG",
      "ppg": 31.6,
      "rpg": 10.7,
      "apg": 10.4,
      "spg": 1.6,
      "bpg": 0.3,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter",
        "Elite Playmaker"
      ],
      "popularity": 93,
      "rating": 97,
      "ratingRaw": 27.2
    },
    {
      "id": "harden_12",
      "name": "James Harden",
      "pos": "SG",
      "ppg": 16.8,
      "rpg": 4.1,
      "apg": 3.7,
      "spg": 1,
      "bpg": 0.5,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter",
        "Floor Spacer"
      ],
      "popularity": 65,
      "rating": 69,
      "ratingRaw": 13.8
    },
    {
      "id": "ibaka_12",
      "name": "Serge Ibaka",
      "pos": "PF",
      "ppg": 13.7,
      "rpg": 8.8,
      "apg": 1,
      "spg": 0.8,
      "bpg": 3.7,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Floor Spacer"
      ],
      "popularity": 58,
      "rating": 81,
      "ratingRaw": 19.2
    },
    {
      "id": "perkins_12",
      "name": "Kendrick Perkins",
      "pos": "C",
      "ppg": 5.2,
      "rpg": 6.8,
      "apg": 1.6,
      "spg": 0.6,
      "bpg": 0.9,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 55,
      "rating": 64,
      "ratingRaw": 11.1
    }
  ],
  "Thunder_2020s": [
    {
      "id": "sga_24",
      "name": "Shai Gilgeous-Alexander",
      "pos": "PG",
      "ppg": 31.1,
      "rpg": 5.5,
      "apg": 6.2,
      "spg": 2,
      "bpg": 1.1,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 68,
      "rating": 88,
      "ratingRaw": 22.7
    },
    {
      "id": "williams_24",
      "name": "Jalen Williams",
      "pos": "SG",
      "ppg": 23.5,
      "rpg": 4.5,
      "apg": 5.8,
      "spg": 1.3,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Volume Shooter",
        "Elite Playmaker"
      ],
      "popularity": 52,
      "rating": 78,
      "ratingRaw": 17.7
    },
    {
      "id": "dort_24",
      "name": "Lu Dort",
      "pos": "SG",
      "ppg": 14,
      "rpg": 4.3,
      "apg": 2.3,
      "spg": 1.3,
      "bpg": 0.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy",
        "Clutch"
      ],
      "popularity": 42,
      "rating": 67,
      "ratingRaw": 12.6
    },
    {
      "id": "holmgren_24",
      "name": "Chet Holmgren",
      "pos": "C",
      "ppg": 16.5,
      "rpg": 7.9,
      "apg": 2.4,
      "spg": 0.9,
      "bpg": 2.3,
      "archetype": "Two-Way Star",
      "traits": [
        "Rim Protector",
        "Floor Spacer"
      ],
      "popularity": 55,
      "rating": 79,
      "ratingRaw": 18.2
    }
  ],
  "Bucks_1970s": [
    {
      "id": "kareem_71",
      "name": "Kareem Abdul-Jabbar",
      "pos": "C",
      "ppg": 34.8,
      "rpg": 16.6,
      "apg": 4.6,
      "spg": 1.2,
      "bpg": 3.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 90,
      "rating": 99,
      "ratingRaw": 33.4
    },
    {
      "id": "oscar_71",
      "name": "Oscar Robertson",
      "pos": "PG",
      "ppg": 19.4,
      "rpg": 5.7,
      "apg": 8.2,
      "spg": 1.2,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 90,
      "rating": 78,
      "ratingRaw": 18.1
    },
    {
      "id": "dandridge_71",
      "name": "Bob Dandridge",
      "pos": "SF",
      "ppg": 18.4,
      "rpg": 7.6,
      "apg": 3.1,
      "spg": 1,
      "bpg": 0.7,
      "archetype": "Two-Way Star",
      "traits": [
        "Lockdown Defender",
        "Clutch"
      ],
      "popularity": 58,
      "rating": 76,
      "ratingRaw": 16.8
    },
    {
      "id": "mcghee_71",
      "name": "Luol McCarter",
      "pos": "PG",
      "ppg": 9,
      "rpg": 2.2,
      "apg": 5.5,
      "spg": 1.1,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Glue Guy"
      ],
      "popularity": 36,
      "rating": 63,
      "ratingRaw": 10.6
    },
    {
      "id": "allen_71",
      "name": "Jon McGlocklin",
      "pos": "SG",
      "ppg": 11.4,
      "rpg": 2.5,
      "apg": 2.6,
      "spg": 0.6,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 42,
      "rating": 60,
      "ratingRaw": 9.3
    }
  ],
  "Bucks_1980s": [
    {
      "id": "moncrief_82",
      "name": "Sidney Moncrief",
      "pos": "SG",
      "ppg": 22.5,
      "rpg": 6.7,
      "apg": 4.5,
      "spg": 1.5,
      "bpg": 0.3,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 62,
      "rating": 78,
      "ratingRaw": 18.1
    },
    {
      "id": "mjohnson_79",
      "name": "Marques Johnson",
      "pos": "SF",
      "ppg": 20.3,
      "rpg": 7.2,
      "apg": 3.5,
      "spg": 1.2,
      "bpg": 0.3,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 59,
      "rating": 76,
      "ratingRaw": 16.9
    },
    {
      "id": "pressey_82",
      "name": "Paul Pressey",
      "pos": "PG",
      "ppg": 11.5,
      "rpg": 4.8,
      "apg": 7,
      "spg": 1.7,
      "bpg": 0.8,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Lockdown Defender"
      ],
      "popularity": 42,
      "rating": 74,
      "ratingRaw": 15.8
    },
    {
      "id": "pierce_82",
      "name": "Terry Cummings",
      "pos": "PF",
      "ppg": 23.6,
      "rpg": 9.5,
      "apg": 2.2,
      "spg": 1.1,
      "bpg": 0.5,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 58,
      "rating": 80,
      "ratingRaw": 19
    },
    {
      "id": "lanier_82",
      "name": "Bob Lanier",
      "pos": "C",
      "ppg": 14.4,
      "rpg": 7.6,
      "apg": 2.9,
      "spg": 1.1,
      "bpg": 1.8,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Volume Shooter"
      ],
      "popularity": 68,
      "rating": 76,
      "ratingRaw": 17.2
    }
  ],
  "Bucks_2000s": [
    {
      "id": "rallen_01",
      "name": "Ray Allen",
      "pos": "SG",
      "ppg": 22,
      "rpg": 5.2,
      "apg": 4.6,
      "spg": 0.9,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 82,
      "rating": 74,
      "ratingRaw": 16
    },
    {
      "id": "redd_06",
      "name": "Michael Redd",
      "pos": "SG",
      "ppg": 26.7,
      "rpg": 5.1,
      "apg": 2.3,
      "spg": 0.8,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 57,
      "rating": 75,
      "ratingRaw": 16.3
    },
    {
      "id": "cassell_01",
      "name": "Sam Cassell",
      "pos": "PG",
      "ppg": 19,
      "rpg": 3.6,
      "apg": 6.6,
      "spg": 1.1,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Clutch"
      ],
      "popularity": 62,
      "rating": 73,
      "ratingRaw": 15.4
    },
    {
      "id": "mason_01",
      "name": "Anthony Mason",
      "pos": "PF",
      "ppg": 10.8,
      "rpg": 7.1,
      "apg": 3.4,
      "spg": 0.8,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 58,
      "rating": 69,
      "ratingRaw": 13.7
    },
    {
      "id": "mobley_06",
      "name": "Desmond Mason",
      "pos": "SF",
      "ppg": 13.6,
      "rpg": 4.7,
      "apg": 2.3,
      "spg": 1,
      "bpg": 0.5,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 45,
      "rating": 67,
      "ratingRaw": 12.5
    }
  ],
  "Bucks_2020s": [
    {
      "id": "giannis_20",
      "name": "Giannis Antetokounmpo",
      "pos": "PF",
      "ppg": 31.1,
      "rpg": 11.8,
      "apg": 5.7,
      "spg": 1,
      "bpg": 1.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Rim Protector",
        "Volume Shooter"
      ],
      "popularity": 92,
      "rating": 95,
      "ratingRaw": 26.2
    },
    {
      "id": "dame_23",
      "name": "Damian Lillard",
      "pos": "PG",
      "ppg": 24.3,
      "rpg": 4.4,
      "apg": 7,
      "spg": 0.9,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 89,
      "rating": 78,
      "ratingRaw": 17.8
    },
    {
      "id": "middleton_22",
      "name": "Khris Middleton",
      "pos": "SF",
      "ppg": 19.1,
      "rpg": 5.3,
      "apg": 4.4,
      "spg": 1.1,
      "bpg": 0.2,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Floor Spacer",
        "Lockdown Defender"
      ],
      "popularity": 62,
      "rating": 73,
      "ratingRaw": 15.4
    },
    {
      "id": "portis_22",
      "name": "Bobby Portis",
      "pos": "PF",
      "ppg": 14.6,
      "rpg": 9.1,
      "apg": 1.9,
      "spg": 0.6,
      "bpg": 0.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 48,
      "rating": 72,
      "ratingRaw": 15.2
    },
    {
      "id": "brook_22",
      "name": "Brook Lopez",
      "pos": "C",
      "ppg": 12.7,
      "rpg": 5.5,
      "apg": 1.8,
      "spg": 0.5,
      "bpg": 2.2,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Floor Spacer"
      ],
      "popularity": 55,
      "rating": 71,
      "ratingRaw": 14.4
    }
  ],
  "Mavericks_1980s": [
    {
      "id": "aguirre_83",
      "name": "Mark Aguirre",
      "pos": "SF",
      "ppg": 25.7,
      "rpg": 5.9,
      "apg": 3.1,
      "spg": 0.9,
      "bpg": 0.3,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 60,
      "rating": 76,
      "ratingRaw": 17.1
    },
    {
      "id": "blackman_87",
      "name": "Rolando Blackman",
      "pos": "SG",
      "ppg": 22.4,
      "rpg": 4,
      "apg": 2.7,
      "spg": 0.9,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 57,
      "rating": 70,
      "ratingRaw": 14.2
    },
    {
      "id": "harper_89",
      "name": "Derek Harper",
      "pos": "PG",
      "ppg": 14.4,
      "rpg": 3.3,
      "apg": 6.5,
      "spg": 1.9,
      "bpg": 0.2,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Elite Playmaker"
      ],
      "popularity": 58,
      "rating": 71,
      "ratingRaw": 14.7
    },
    {
      "id": "perkins_88",
      "name": "James Donaldson",
      "pos": "C",
      "ppg": 7,
      "rpg": 9,
      "apg": 1.3,
      "spg": 0.5,
      "bpg": 1.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 42,
      "rating": 69,
      "ratingRaw": 13.8
    }
  ],
  "Mavericks_2000s": [
    {
      "id": "dirk_07",
      "name": "Dirk Nowitzki",
      "pos": "PF",
      "ppg": 26.6,
      "rpg": 9,
      "apg": 2.8,
      "spg": 0.9,
      "bpg": 0.8,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 94,
      "rating": 83,
      "ratingRaw": 20.1
    },
    {
      "id": "nash_02",
      "name": "Steve Nash",
      "pos": "PG",
      "ppg": 17.7,
      "rpg": 3.3,
      "apg": 7.3,
      "spg": 0.7,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 82,
      "rating": 71,
      "ratingRaw": 14.6
    },
    {
      "id": "finley_02",
      "name": "Michael Finley",
      "pos": "SG",
      "ppg": 21,
      "rpg": 4.7,
      "apg": 3.8,
      "spg": 1.2,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer"
      ],
      "popularity": 56,
      "rating": 74,
      "ratingRaw": 15.8
    },
    {
      "id": "walker_02",
      "name": "Antawn Jamison",
      "pos": "PF",
      "ppg": 18.1,
      "rpg": 8,
      "apg": 2.2,
      "spg": 1,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer"
      ],
      "popularity": 52,
      "rating": 74,
      "ratingRaw": 16.1
    },
    {
      "id": "terry_07",
      "name": "Jason Terry",
      "pos": "SG",
      "ppg": 14.9,
      "rpg": 2.9,
      "apg": 3.8,
      "spg": 0.9,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch",
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 57,
      "rating": 65,
      "ratingRaw": 11.9
    }
  ],
  "Mavericks_2010s": [
    {
      "id": "dirk_11",
      "name": "Dirk Nowitzki",
      "pos": "PF",
      "ppg": 23,
      "rpg": 7,
      "apg": 2.2,
      "spg": 0.7,
      "bpg": 0.6,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 94,
      "rating": 76,
      "ratingRaw": 16.8
    },
    {
      "id": "kidd_12",
      "name": "Jason Kidd",
      "pos": "PG",
      "ppg": 9,
      "rpg": 6.2,
      "apg": 8.9,
      "spg": 1.7,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 78,
      "rating": 74,
      "ratingRaw": 16.2
    },
    {
      "id": "terry_11",
      "name": "Jason Terry",
      "pos": "SG",
      "ppg": 15.8,
      "rpg": 3,
      "apg": 4,
      "spg": 0.8,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch",
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 57,
      "rating": 66,
      "ratingRaw": 12.2
    },
    {
      "id": "marion_11",
      "name": "Shawn Marion",
      "pos": "SF",
      "ppg": 12.6,
      "rpg": 7.8,
      "apg": 2,
      "spg": 1.5,
      "bpg": 0.8,
      "archetype": "Two-Way Star",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 68,
      "rating": 72,
      "ratingRaw": 15.2
    },
    {
      "id": "chandler_11",
      "name": "Tyson Chandler",
      "pos": "C",
      "ppg": 10.1,
      "rpg": 10.7,
      "apg": 1,
      "spg": 0.7,
      "bpg": 0.9,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 58,
      "rating": 72,
      "ratingRaw": 15.2
    }
  ],
  "Mavericks_2020s": [
    {
      "id": "luka_24",
      "name": "Luka Doncic",
      "pos": "PG",
      "ppg": 33.9,
      "rpg": 9.2,
      "apg": 9.8,
      "spg": 1.4,
      "bpg": 0.5,
      "archetype": "Playmaker",
      "traits": [
        "Clutch",
        "Elite Playmaker",
        "Volume Shooter"
      ],
      "popularity": 92,
      "rating": 96,
      "ratingRaw": 26.6
    },
    {
      "id": "kyrie_23",
      "name": "Kyrie Irving",
      "pos": "SG",
      "ppg": 25.6,
      "rpg": 3.9,
      "apg": 5.2,
      "spg": 1.2,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 85,
      "rating": 77,
      "ratingRaw": 17.3
    },
    {
      "id": "washington_24",
      "name": "P.J. Washington",
      "pos": "PF",
      "ppg": 12.4,
      "rpg": 5.3,
      "apg": 1.8,
      "spg": 0.7,
      "bpg": 0.7,
      "archetype": "Two-Way Star",
      "traits": [
        "Floor Spacer",
        "Lockdown Defender"
      ],
      "popularity": 41,
      "rating": 66,
      "ratingRaw": 12.2
    },
    {
      "id": "dinwiddie_24",
      "name": "Spencer Dinwiddie",
      "pos": "PG",
      "ppg": 13.1,
      "rpg": 3.5,
      "apg": 4.4,
      "spg": 0.6,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Clutch"
      ],
      "popularity": 43,
      "rating": 65,
      "ratingRaw": 11.9
    }
  ],
  "Cavaliers_1980s": [
    {
      "id": "price_89",
      "name": "Mark Price",
      "pos": "PG",
      "ppg": 19.6,
      "rpg": 2,
      "apg": 8.4,
      "spg": 1.5,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 62,
      "rating": 74,
      "ratingRaw": 15.8
    },
    {
      "id": "daugherty_89",
      "name": "Brad Daugherty",
      "pos": "C",
      "ppg": 21.6,
      "rpg": 10.4,
      "apg": 3.4,
      "spg": 0.8,
      "bpg": 0.9,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 55,
      "rating": 82,
      "ratingRaw": 20
    },
    {
      "id": "free_88",
      "name": "World B. Free",
      "pos": "SG",
      "ppg": 22.9,
      "rpg": 3.2,
      "apg": 4,
      "spg": 1,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 53,
      "rating": 71,
      "ratingRaw": 14.8
    },
    {
      "id": "ehlo_89",
      "name": "Craig Ehlo",
      "pos": "SG",
      "ppg": 11.5,
      "rpg": 5,
      "apg": 3.7,
      "spg": 1.4,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 40,
      "rating": 68,
      "ratingRaw": 13.3
    },
    {
      "id": "nance_88",
      "name": "Larry Nance",
      "pos": "PF",
      "ppg": 18.5,
      "rpg": 8.5,
      "apg": 2.5,
      "spg": 1,
      "bpg": 2.3,
      "archetype": "Two-Way Star",
      "traits": [
        "Rim Protector",
        "Lockdown Defender"
      ],
      "popularity": 48,
      "rating": 81,
      "ratingRaw": 19.5
    }
  ],
  "Cavaliers_1990s": [
    {
      "id": "price_94",
      "name": "Mark Price",
      "pos": "PG",
      "ppg": 18.2,
      "rpg": 2,
      "apg": 8,
      "spg": 1.3,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 62,
      "rating": 72,
      "ratingRaw": 14.9
    },
    {
      "id": "nance_90",
      "name": "Larry Nance",
      "pos": "PF",
      "ppg": 19.2,
      "rpg": 8.6,
      "apg": 2,
      "spg": 1,
      "bpg": 2.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 48,
      "rating": 82,
      "ratingRaw": 19.8
    },
    {
      "id": "ferry_94",
      "name": "Danny Ferry",
      "pos": "SF",
      "ppg": 7.3,
      "rpg": 4.2,
      "apg": 2.3,
      "spg": 0.6,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 38,
      "rating": 61,
      "ratingRaw": 9.6
    },
    {
      "id": "kemp_97",
      "name": "Shawn Kemp",
      "pos": "PF",
      "ppg": 17.8,
      "rpg": 9.3,
      "apg": 2.1,
      "spg": 1.3,
      "bpg": 1.6,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Volume Shooter"
      ],
      "popularity": 72,
      "rating": 80,
      "ratingRaw": 18.9
    },
    {
      "id": "ilgauskas_99",
      "name": "Zydrunas Ilgauskas",
      "pos": "C",
      "ppg": 14.9,
      "rpg": 8.7,
      "apg": 1.9,
      "spg": 0.8,
      "bpg": 2.1,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Floor Spacer"
      ],
      "popularity": 48,
      "rating": 77,
      "ratingRaw": 17.6
    }
  ],
  "Cavaliers_2000s": [
    {
      "id": "lebron_06",
      "name": "LeBron James",
      "pos": "SF",
      "ppg": 30,
      "rpg": 7.9,
      "apg": 7.2,
      "spg": 1.8,
      "bpg": 1.1,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 99,
      "rating": 91,
      "ratingRaw": 24.4
    },
    {
      "id": "ilg_06",
      "name": "Zydrunas Ilgauskas",
      "pos": "C",
      "ppg": 16.4,
      "rpg": 8.7,
      "apg": 1.6,
      "spg": 0.7,
      "bpg": 1.8,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Floor Spacer"
      ],
      "popularity": 48,
      "rating": 77,
      "ratingRaw": 17.4
    },
    {
      "id": "hughes_07",
      "name": "Larry Hughes",
      "pos": "SG",
      "ppg": 13.2,
      "rpg": 5.5,
      "apg": 3.8,
      "spg": 2,
      "bpg": 0.7,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Volume Shooter"
      ],
      "popularity": 42,
      "rating": 72,
      "ratingRaw": 15.2
    },
    {
      "id": "gooden_07",
      "name": "Drew Gooden",
      "pos": "PF",
      "ppg": 12.4,
      "rpg": 7.5,
      "apg": 1.4,
      "spg": 0.7,
      "bpg": 0.7,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 41,
      "rating": 69,
      "ratingRaw": 13.5
    }
  ],
  "Cavaliers_2010s": [
    {
      "id": "lebron_16",
      "name": "LeBron James",
      "pos": "SF",
      "ppg": 27.5,
      "rpg": 8.6,
      "apg": 9.1,
      "spg": 1.9,
      "bpg": 1,
      "archetype": "Playmaker",
      "traits": [
        "Clutch",
        "Elite Playmaker",
        "Lockdown Defender"
      ],
      "popularity": 99,
      "rating": 93,
      "ratingRaw": 25.1
    },
    {
      "id": "kyrie_16",
      "name": "Kyrie Irving",
      "pos": "PG",
      "ppg": 25.2,
      "rpg": 3.3,
      "apg": 5.8,
      "spg": 1.2,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 85,
      "rating": 76,
      "ratingRaw": 17.1
    },
    {
      "id": "love_16",
      "name": "Kevin Love",
      "pos": "PF",
      "ppg": 19,
      "rpg": 11.1,
      "apg": 2.4,
      "spg": 0.6,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 68,
      "rating": 78,
      "ratingRaw": 18.1
    },
    {
      "id": "thompson_16",
      "name": "Tristan Thompson",
      "pos": "C",
      "ppg": 8.1,
      "rpg": 7.9,
      "apg": 1,
      "spg": 0.5,
      "bpg": 0.8,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 52,
      "rating": 66,
      "ratingRaw": 12.2
    },
    {
      "id": "shumpert_16",
      "name": "Iman Shumpert",
      "pos": "SG",
      "ppg": 7,
      "rpg": 3.5,
      "apg": 2,
      "spg": 1.5,
      "bpg": 0.4,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 43,
      "rating": 61,
      "ratingRaw": 9.8
    },
    {
      "id": "jrsmith_16",
      "name": "J.R. Smith",
      "pos": "SG",
      "ppg": 12.4,
      "rpg": 3.8,
      "apg": 2.3,
      "spg": 1.2,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 55,
      "rating": 65,
      "ratingRaw": 11.5
    }
  ],
  "Cavaliers_2020s": [
    {
      "id": "mitchell_23",
      "name": "Donovan Mitchell",
      "pos": "SG",
      "ppg": 28.3,
      "rpg": 4.3,
      "apg": 6.1,
      "spg": 1.5,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 72,
      "rating": 80,
      "ratingRaw": 19.1
    },
    {
      "id": "garland_24",
      "name": "Darius Garland",
      "pos": "PG",
      "ppg": 21.6,
      "rpg": 3.4,
      "apg": 7.8,
      "spg": 1.1,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 58,
      "rating": 76,
      "ratingRaw": 16.8
    },
    {
      "id": "mobley_24",
      "name": "Evan Mobley",
      "pos": "C",
      "ppg": 14,
      "rpg": 9.4,
      "apg": 3,
      "spg": 1,
      "bpg": 1.7,
      "archetype": "Two-Way Star",
      "traits": [
        "Rim Protector",
        "Floor Spacer"
      ],
      "popularity": 57,
      "rating": 78,
      "ratingRaw": 18.1
    },
    {
      "id": "allen_24",
      "name": "Jarrett Allen",
      "pos": "C",
      "ppg": 13.2,
      "rpg": 10.8,
      "apg": 1.4,
      "spg": 0.7,
      "bpg": 1.4,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 52,
      "rating": 76,
      "ratingRaw": 17.2
    }
  ],
  "Blazers_1970s": [
    {
      "id": "walton_77",
      "name": "Bill Walton",
      "pos": "C",
      "ppg": 18.6,
      "rpg": 14.4,
      "apg": 5,
      "spg": 0.8,
      "bpg": 3.2,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 80,
      "rating": 95,
      "ratingRaw": 26.2
    },
    {
      "id": "lucas_77",
      "name": "Maurice Lucas",
      "pos": "PF",
      "ppg": 20.2,
      "rpg": 11.4,
      "apg": 2.2,
      "spg": 1.1,
      "bpg": 0.6,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 52,
      "rating": 81,
      "ratingRaw": 19.5
    },
    {
      "id": "hollins_77",
      "name": "Lionel Hollins",
      "pos": "PG",
      "ppg": 16,
      "rpg": 3.8,
      "apg": 5.5,
      "spg": 2.1,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 48,
      "rating": 73,
      "ratingRaw": 15.3
    },
    {
      "id": "gross_77",
      "name": "Bob Gross",
      "pos": "SF",
      "ppg": 14.1,
      "rpg": 5.4,
      "apg": 3.7,
      "spg": 1.4,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 40,
      "rating": 70,
      "ratingRaw": 14.2
    },
    {
      "id": "twarren_77",
      "name": "Terry Porter",
      "pos": "SG",
      "ppg": 10.8,
      "rpg": 3.2,
      "apg": 2.9,
      "spg": 1.2,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 51,
      "rating": 63,
      "ratingRaw": 10.7
    },
    {
      "id": "steele_77",
      "name": "Larry Steele",
      "pos": "SG",
      "ppg": 9.8,
      "rpg": 3.1,
      "apg": 3.4,
      "spg": 2.7,
      "bpg": 0.3,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 40,
      "rating": 66,
      "ratingRaw": 12.4
    },
    {
      "id": "twarren_77b",
      "name": "Dave Twardzik",
      "pos": "PG",
      "ppg": 11,
      "rpg": 2.3,
      "apg": 3.9,
      "spg": 1.7,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Glue Guy"
      ],
      "popularity": 40,
      "rating": 64,
      "ratingRaw": 11.2
    }
  ],
  "Warriors_1970s": [
    {
      "id": "barry_75",
      "name": "Rick Barry",
      "pos": "SF",
      "ppg": 30.6,
      "rpg": 6.2,
      "apg": 6.2,
      "spg": 2.9,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 82,
      "rating": 89,
      "ratingRaw": 23.1
    },
    {
      "id": "jwilkes_75",
      "name": "Jamaal Wilkes",
      "pos": "SF",
      "ppg": 16.5,
      "rpg": 8.2,
      "apg": 3.2,
      "spg": 1.2,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 56,
      "rating": 75,
      "ratingRaw": 16.4
    },
    {
      "id": "psmith_75",
      "name": "Phil Smith",
      "pos": "SG",
      "ppg": 17.5,
      "rpg": 3.3,
      "apg": 3.5,
      "spg": 1.6,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 42,
      "rating": 69,
      "ratingRaw": 13.6
    },
    {
      "id": "cray_75",
      "name": "Clifford Ray",
      "pos": "C",
      "ppg": 9.5,
      "rpg": 9.7,
      "apg": 2,
      "spg": 0.8,
      "bpg": 1.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 41,
      "rating": 74,
      "ratingRaw": 15.8
    },
    {
      "id": "bbutts_75",
      "name": "Butch Beard",
      "pos": "PG",
      "ppg": 11.5,
      "rpg": 3.8,
      "apg": 5.4,
      "spg": 1.7,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 40,
      "rating": 68,
      "ratingRaw": 13.1
    },
    {
      "id": "cassell_75",
      "name": "Charles Dudley",
      "pos": "PG",
      "ppg": 8.1,
      "rpg": 3,
      "apg": 5.2,
      "spg": 1.3,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Glue Guy"
      ],
      "popularity": 38,
      "rating": 63,
      "ratingRaw": 10.9
    },
    {
      "id": "dickey_75",
      "name": "George Johnson",
      "pos": "C",
      "ppg": 6.8,
      "rpg": 7.2,
      "apg": 0.8,
      "spg": 0.5,
      "bpg": 2.1,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 38,
      "rating": 68,
      "ratingRaw": 13.1
    },
    {
      "id": "ray_75b",
      "name": "Charles Johnson",
      "pos": "SG",
      "ppg": 12.3,
      "rpg": 3.4,
      "apg": 3.2,
      "spg": 1.5,
      "bpg": 0.3,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 38,
      "rating": 65,
      "ratingRaw": 11.9
    }
  ],
  "Raptors_2010s": [
    {
      "id": "kawhi_19",
      "name": "Kawhi Leonard",
      "pos": "SF",
      "ppg": 26.6,
      "rpg": 7.3,
      "apg": 3.3,
      "spg": 1.8,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 80,
      "rating": 82,
      "ratingRaw": 19.7
    },
    {
      "id": "siakam_19",
      "name": "Pascal Siakam",
      "pos": "PF",
      "ppg": 16.9,
      "rpg": 6.9,
      "apg": 3.1,
      "spg": 1,
      "bpg": 0.5,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 63,
      "rating": 73,
      "ratingRaw": 15.5
    },
    {
      "id": "lowry_19",
      "name": "Kyle Lowry",
      "pos": "PG",
      "ppg": 14.2,
      "rpg": 4.7,
      "apg": 8.7,
      "spg": 1.4,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 65,
      "rating": 75,
      "ratingRaw": 16.4
    },
    {
      "id": "mgasol_19",
      "name": "Marc Gasol",
      "pos": "C",
      "ppg": 15.5,
      "rpg": 7.8,
      "apg": 4,
      "spg": 0.7,
      "bpg": 1.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 68,
      "rating": 76,
      "ratingRaw": 17.2
    },
    {
      "id": "dgreen_19",
      "name": "Danny Green",
      "pos": "SG",
      "ppg": 10.3,
      "rpg": 3.7,
      "apg": 1.9,
      "spg": 1.2,
      "bpg": 0.3,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 52,
      "rating": 62,
      "ratingRaw": 10.4
    },
    {
      "id": "derozan_16",
      "name": "DeMar DeRozan",
      "pos": "SG",
      "ppg": 23.5,
      "rpg": 4,
      "apg": 3.9,
      "spg": 1.1,
      "bpg": 0.3,
      "archetype": "Slasher",
      "traits": [
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 65,
      "rating": 73,
      "ratingRaw": 15.7
    },
    {
      "id": "ibaka_19",
      "name": "Serge Ibaka",
      "pos": "C",
      "ppg": 15,
      "rpg": 8,
      "apg": 2.5,
      "spg": 0.8,
      "bpg": 1.8,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Floor Spacer"
      ],
      "popularity": 58,
      "rating": 76,
      "ratingRaw": 17.1
    },
    {
      "id": "vvanvleet_19",
      "name": "Fred VanVleet",
      "pos": "PG",
      "ppg": 11,
      "rpg": 3.3,
      "apg": 6,
      "spg": 1.9,
      "bpg": 0.2,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Floor Spacer",
        "Clutch"
      ],
      "popularity": 55,
      "rating": 68,
      "ratingRaw": 13.3
    }
  ],
  "Nets_2000s": [
    {
      "id": "kidd_j_03",
      "name": "Jason Kidd",
      "pos": "PG",
      "ppg": 14.8,
      "rpg": 6.8,
      "apg": 9.2,
      "spg": 2,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "Floor General",
        "Defensive Stopper"
      ],
      "popularity": 78,
      "rating": 80,
      "ratingRaw": 19.1
    },
    {
      "id": "carter_v_05",
      "name": "Vince Carter",
      "pos": "SG",
      "ppg": 21.2,
      "rpg": 5.2,
      "apg": 4.2,
      "spg": 1,
      "bpg": 0.6,
      "archetype": "Slasher",
      "traits": [
        "Clutch Assassin",
        "Volume Shooter",
        "Slasher"
      ],
      "popularity": 35,
      "rating": 75,
      "ratingRaw": 16.4
    },
    {
      "id": "jefferson_r_04",
      "name": "Richard Jefferson",
      "pos": "SF",
      "ppg": 18,
      "rpg": 5.4,
      "apg": 2.8,
      "spg": 0.8,
      "bpg": 0.6,
      "archetype": "Slasher",
      "traits": [
        "Slasher",
        "3-and-D"
      ],
      "popularity": 55,
      "rating": 71,
      "ratingRaw": 14.5
    },
    {
      "id": "martin_k_03",
      "name": "Kenyon Martin",
      "pos": "PF",
      "ppg": 14.8,
      "rpg": 7.8,
      "apg": 1.8,
      "spg": 1.1,
      "bpg": 1.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Rim Protector",
        "Hustle Player"
      ],
      "popularity": 54,
      "rating": 74,
      "ratingRaw": 16.2
    },
    {
      "id": "lopez_br_09",
      "name": "Brook Lopez",
      "pos": "C",
      "ppg": 18,
      "rpg": 7.8,
      "apg": 1.8,
      "spg": 0.5,
      "bpg": 1.8,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Rim Protector",
        "Volume Shooter"
      ],
      "popularity": 55,
      "rating": 76,
      "ratingRaw": 17.1
    }
  ],
  "Kings_2000s": [
    {
      "id": "cwebber_02",
      "name": "Chris Webber",
      "pos": "PF",
      "ppg": 24.5,
      "rpg": 10.5,
      "apg": 4.8,
      "spg": 1.5,
      "bpg": 1,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 76,
      "rating": 88,
      "ratingRaw": 22.7
    },
    {
      "id": "peja_02",
      "name": "Peja Stojakovic",
      "pos": "SF",
      "ppg": 24.2,
      "rpg": 5.4,
      "apg": 2.6,
      "spg": 1.1,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 65,
      "rating": 74,
      "ratingRaw": 16.1
    },
    {
      "id": "bibby_02",
      "name": "Mike Bibby",
      "pos": "PG",
      "ppg": 16,
      "rpg": 3.5,
      "apg": 5.9,
      "spg": 1.5,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer"
      ],
      "popularity": 58,
      "rating": 71,
      "ratingRaw": 14.4
    },
    {
      "id": "divac_02",
      "name": "Vlade Divac",
      "pos": "C",
      "ppg": 13,
      "rpg": 9.5,
      "apg": 4.2,
      "spg": 0.9,
      "bpg": 1.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch",
        "Lockdown Defender"
      ],
      "popularity": 62,
      "rating": 78,
      "ratingRaw": 18.1
    },
    {
      "id": "christie_02",
      "name": "Doug Christie",
      "pos": "SG",
      "ppg": 14.5,
      "rpg": 4.7,
      "apg": 4.4,
      "spg": 2.6,
      "bpg": 0.4,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 52,
      "rating": 73,
      "ratingRaw": 15.6
    },
    {
      "id": "pollard_02",
      "name": "Scot Pollard",
      "pos": "C",
      "ppg": 5.4,
      "rpg": 6.2,
      "apg": 0.7,
      "spg": 0.7,
      "bpg": 0.9,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 40,
      "rating": 62,
      "ratingRaw": 10.4
    },
    {
      "id": "turkoglu_02",
      "name": "Hedo Turkoglu",
      "pos": "SF",
      "ppg": 8.5,
      "rpg": 4.3,
      "apg": 2.1,
      "spg": 0.8,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 52,
      "rating": 62,
      "ratingRaw": 10.3
    },
    {
      "id": "jackson_02",
      "name": "Bobby Jackson",
      "pos": "PG",
      "ppg": 13.1,
      "rpg": 3.6,
      "apg": 4.8,
      "spg": 1.7,
      "bpg": 0.2,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 48,
      "rating": 68,
      "ratingRaw": 13.3
    }
  ],
  "Knicks_1960s": [
    {
      "id": "reed_69",
      "name": "Willis Reed",
      "pos": "C",
      "ppg": 21.1,
      "rpg": 13.9,
      "apg": 1.8,
      "spg": 0.7,
      "bpg": 1.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Clutch",
        "Rebounding Machine"
      ],
      "popularity": 72,
      "rating": 87,
      "ratingRaw": 22.2
    },
    {
      "id": "frazier_69",
      "name": "Walt Frazier",
      "pos": "PG",
      "ppg": 17.5,
      "rpg": 5.9,
      "apg": 7,
      "spg": 2.1,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Elite Playmaker",
        "Clutch Assassin",
        "Lockdown Defender"
      ],
      "popularity": 78,
      "rating": 79,
      "ratingRaw": 18.3
    },
    {
      "id": "debusschere_knk_69",
      "name": "Dave DeBusschere",
      "pos": "PF",
      "secondaryPos": [
        "SF"
      ],
      "ppg": 16.1,
      "rpg": 11,
      "apg": 2.9,
      "spg": 1.1,
      "bpg": 0.7,
      "archetype": "Lockdown Defender",
      "traits": [
        "Glue Guy",
        "Hustle Player"
      ],
      "popularity": 65,
      "rating": 79,
      "ratingRaw": 18.5
    }
  ],
  "Pistons_1960s": [
    {
      "id": "bing_68",
      "name": "Dave Bing",
      "pos": "PG",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 23.4,
      "rpg": 4.5,
      "apg": 6.4,
      "spg": 1.7,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Volume Shooter",
        "Elite Playmaker",
        "Clutch"
      ],
      "popularity": 65,
      "rating": 79,
      "ratingRaw": 18.2
    },
    {
      "id": "debusschere_pis_65",
      "name": "Dave DeBusschere",
      "pos": "PF",
      "secondaryPos": [
        "SF"
      ],
      "ppg": 14.7,
      "rpg": 11.4,
      "apg": 3,
      "spg": 1,
      "bpg": 0.7,
      "archetype": "Lockdown Defender",
      "traits": [
        "Glue Guy",
        "Hustle Player"
      ],
      "popularity": 65,
      "rating": 79,
      "ratingRaw": 18.3
    },
    {
      "id": "howell_64",
      "name": "Bailey Howell",
      "pos": "PF",
      "ppg": 19.8,
      "rpg": 11.9,
      "apg": 2.3,
      "spg": 0.8,
      "bpg": 0.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Volume Shooter"
      ],
      "popularity": 48,
      "rating": 81,
      "ratingRaw": 19.3
    }
  ],
  "Warriors_1960s": [
    {
      "id": "chamberlain_war_63",
      "name": "Wilt Chamberlain",
      "pos": "C",
      "ppg": 44.8,
      "rpg": 24.3,
      "apg": 2.4,
      "spg": 0.7,
      "bpg": 3,
      "archetype": "Paint Beast",
      "traits": [
        "Volume Shooter",
        "Rim Protector",
        "Rebounding Machine"
      ],
      "popularity": 92,
      "rating": 99,
      "ratingRaw": 39.4
    },
    {
      "id": "thurmond_67",
      "name": "Nate Thurmond",
      "pos": "C",
      "secondaryPos": [
        "PF"
      ],
      "ppg": 20.4,
      "rpg": 22,
      "apg": 2.8,
      "spg": 1,
      "bpg": 4,
      "archetype": "Lockdown Defender",
      "traits": [
        "Rim Protector",
        "Rebounding Machine"
      ],
      "popularity": 68,
      "rating": 99,
      "ratingRaw": 32.3
    },
    {
      "id": "rbarry_67",
      "name": "Rick Barry",
      "pos": "SF",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 25.7,
      "rpg": 8.8,
      "apg": 4.3,
      "spg": 2.5,
      "bpg": 0.6,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer",
        "Elite Playmaker"
      ],
      "popularity": 82,
      "rating": 87,
      "ratingRaw": 22.1
    }
  ],
  "Bulls_1960s": [
    {
      "id": "sloan_69",
      "name": "Jerry Sloan",
      "pos": "SG",
      "secondaryPos": [
        "SF"
      ],
      "ppg": 14.7,
      "rpg": 7.5,
      "apg": 2.7,
      "spg": 2.5,
      "bpg": 0.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Hustle Player",
        "Glue Guy"
      ],
      "popularity": 62,
      "rating": 75,
      "ratingRaw": 16.7
    },
    {
      "id": "rodgers_67",
      "name": "Guy Rodgers",
      "pos": "PG",
      "ppg": 11.3,
      "rpg": 3.8,
      "apg": 11.1,
      "spg": 1.2,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor General"
      ],
      "popularity": 48,
      "rating": 73,
      "ratingRaw": 15.7
    },
    {
      "id": "boozer_67",
      "name": "Bob Boozer",
      "pos": "PF",
      "ppg": 18.1,
      "rpg": 10.5,
      "apg": 2,
      "spg": 0.8,
      "bpg": 0.6,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Volume Shooter"
      ],
      "popularity": 44,
      "rating": 78,
      "ratingRaw": 17.7
    }
  ],
  "Rockets_1960s": [
    {
      "id": "hayes_69",
      "name": "Elvin Hayes",
      "pos": "C",
      "secondaryPos": [
        "PF"
      ],
      "ppg": 28.4,
      "rpg": 17.1,
      "apg": 1.5,
      "spg": 0.8,
      "bpg": 1.8,
      "archetype": "Paint Beast",
      "traits": [
        "Volume Shooter",
        "Rebounding Machine",
        "Rim Protector"
      ],
      "popularity": 75,
      "rating": 97,
      "ratingRaw": 27.1
    },
    {
      "id": "kojis_68",
      "name": "Don Kojis",
      "pos": "SF",
      "secondaryPos": [
        "PF"
      ],
      "ppg": 17,
      "rpg": 7.5,
      "apg": 2.5,
      "spg": 1.3,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Hustle Player",
        "Glue Guy"
      ],
      "popularity": 40,
      "rating": 74,
      "ratingRaw": 16
    },
    {
      "id": "awilliams_69",
      "name": "Art Williams",
      "pos": "PG",
      "ppg": 12.1,
      "rpg": 4.5,
      "apg": 6.7,
      "spg": 1.9,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor General"
      ],
      "popularity": 37,
      "rating": 72,
      "ratingRaw": 14.9
    }
  ],
  "Thunder_1960s": [
    {
      "id": "rule_69",
      "name": "Bob Rule",
      "pos": "C",
      "secondaryPos": [
        "PF"
      ],
      "ppg": 24,
      "rpg": 14,
      "apg": 1.6,
      "spg": 0.8,
      "bpg": 1.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Volume Shooter",
        "Rebounding Machine"
      ],
      "popularity": 41,
      "rating": 89,
      "ratingRaw": 23.2
    },
    {
      "id": "hazzard_68",
      "name": "Walt Hazzard",
      "pos": "PG",
      "ppg": 17.2,
      "rpg": 4.1,
      "apg": 7.5,
      "spg": 1.5,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor General"
      ],
      "popularity": 46,
      "rating": 74,
      "ratingRaw": 16.2
    },
    {
      "id": "meschery_68",
      "name": "Tom Meschery",
      "pos": "PF",
      "secondaryPos": [
        "C"
      ],
      "ppg": 11,
      "rpg": 7.8,
      "apg": 1.9,
      "spg": 0.7,
      "bpg": 0.5,
      "archetype": "Paint Beast",
      "traits": [
        "Glue Guy",
        "Hustle Player"
      ],
      "popularity": 43,
      "rating": 68,
      "ratingRaw": 13.3
    }
  ],
  "Suns_1960s": [
    {
      "id": "vanarsdale_69",
      "name": "Dick Van Arsdale",
      "pos": "SF",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 21,
      "rpg": 4,
      "apg": 3,
      "spg": 1.8,
      "bpg": 0.3,
      "archetype": "Two-Way Star",
      "traits": [
        "Volume Shooter",
        "Clutch",
        "Hustle Player"
      ],
      "popularity": 50,
      "rating": 73,
      "ratingRaw": 15.3
    },
    {
      "id": "goodrich_69",
      "name": "Gail Goodrich",
      "pos": "SG",
      "ppg": 18.6,
      "rpg": 3.8,
      "apg": 4.7,
      "spg": 1.7,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter",
        "Clutch Assassin"
      ],
      "popularity": 65,
      "rating": 72,
      "ratingRaw": 15.1
    },
    {
      "id": "silas_69",
      "name": "Paul Silas",
      "pos": "PF",
      "secondaryPos": [
        "C"
      ],
      "ppg": 9,
      "rpg": 12.5,
      "apg": 2.1,
      "spg": 0.7,
      "bpg": 0.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Glue Guy",
        "Hustle Player"
      ],
      "popularity": 58,
      "rating": 74,
      "ratingRaw": 16.2
    }
  ],
  "Bucks_1960s": [
    {
      "id": "mcglocklin_69",
      "name": "Jon McGlocklin",
      "pos": "SG",
      "ppg": 19.6,
      "rpg": 3.8,
      "apg": 3.6,
      "spg": 1.1,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter",
        "Glue Guy"
      ],
      "popularity": 42,
      "rating": 70,
      "ratingRaw": 13.9
    },
    {
      "id": "chappell_69",
      "name": "Len Chappell",
      "pos": "PF",
      "ppg": 15,
      "rpg": 8.5,
      "apg": 1.8,
      "spg": 0.7,
      "bpg": 0.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Glue Guy"
      ],
      "popularity": 39,
      "rating": 72,
      "ratingRaw": 15
    },
    {
      "id": "embry_69",
      "name": "Wayne Embry",
      "pos": "C",
      "ppg": 11.6,
      "rpg": 8.9,
      "apg": 1.5,
      "spg": 0.7,
      "bpg": 0.5,
      "archetype": "Paint Beast",
      "traits": [
        "Glue Guy",
        "Rim Protector"
      ],
      "popularity": 44,
      "rating": 70,
      "ratingRaw": 14.1
    }
  ],
  "Bulls_1970s": [
    {
      "id": "blove_72",
      "name": "Bob Love",
      "pos": "SF",
      "ppg": 25.8,
      "rpg": 7.5,
      "apg": 2.1,
      "spg": 1.3,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer",
        "Clutch"
      ],
      "popularity": 57,
      "rating": 79,
      "ratingRaw": 18.4
    },
    {
      "id": "vanlier_74",
      "name": "Norm Van Lier",
      "pos": "PG",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 14.1,
      "rpg": 4.7,
      "apg": 7,
      "spg": 2.7,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Elite Playmaker",
        "Lockdown Defender",
        "Glue Guy"
      ],
      "popularity": 55,
      "rating": 76,
      "ratingRaw": 17.1
    },
    {
      "id": "gilmore_77",
      "name": "Artis Gilmore",
      "pos": "C",
      "ppg": 23.7,
      "rpg": 16.7,
      "apg": 2,
      "spg": 1,
      "bpg": 3,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Rebounding Machine"
      ],
      "popularity": 72,
      "rating": 98,
      "ratingRaw": 27.7
    }
  ],
  "Spurs_1970s": [
    {
      "id": "gervin_79",
      "name": "George Gervin",
      "pos": "SG",
      "secondaryPos": [
        "SF"
      ],
      "ppg": 27.8,
      "rpg": 5.3,
      "apg": 2.7,
      "spg": 1.3,
      "bpg": 0.7,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Clutch Assassin",
        "Floor Spacer"
      ],
      "popularity": 85,
      "rating": 78,
      "ratingRaw": 18.1
    },
    {
      "id": "silas_jm_77",
      "name": "James Silas",
      "pos": "PG",
      "ppg": 23.5,
      "rpg": 3.5,
      "apg": 8.1,
      "spg": 1.4,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Clutch Assassin"
      ],
      "popularity": 42,
      "rating": 78,
      "ratingRaw": 17.9
    },
    {
      "id": "kenon_78",
      "name": "Larry Kenon",
      "pos": "SF",
      "secondaryPos": [
        "PF"
      ],
      "ppg": 21,
      "rpg": 9.2,
      "apg": 2.9,
      "spg": 2.1,
      "bpg": 0.5,
      "archetype": "Slasher",
      "traits": [
        "Hustle Player",
        "Volume Shooter"
      ],
      "popularity": 45,
      "rating": 81,
      "ratingRaw": 19.5
    }
  ],
  "Jazz_1970s": [
    {
      "id": "maravich_78",
      "name": "Pete Maravich",
      "pos": "PG",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 27.9,
      "rpg": 4.6,
      "apg": 5.5,
      "spg": 1.5,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "Volume Shooter",
        "Clutch Assassin"
      ],
      "popularity": 82,
      "rating": 80,
      "ratingRaw": 18.9
    },
    {
      "id": "trobinson_78",
      "name": "Truck Robinson",
      "pos": "PF",
      "secondaryPos": [
        "C"
      ],
      "ppg": 24.2,
      "rpg": 15.7,
      "apg": 2.8,
      "spg": 0.9,
      "bpg": 0.7,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Volume Shooter"
      ],
      "popularity": 44,
      "rating": 91,
      "ratingRaw": 24
    },
    {
      "id": "goodrich_jaz_77",
      "name": "Gail Goodrich",
      "pos": "SG",
      "ppg": 17.8,
      "rpg": 3.5,
      "apg": 4,
      "spg": 1.5,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 65,
      "rating": 70,
      "ratingRaw": 14
    }
  ],
  "Pistons_1970s": [
    {
      "id": "lanier_74",
      "name": "Bob Lanier",
      "pos": "C",
      "ppg": 24.5,
      "rpg": 14.4,
      "apg": 3.3,
      "spg": 0.9,
      "bpg": 2.1,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Volume Shooter",
        "Rebounding Machine"
      ],
      "popularity": 68,
      "rating": 94,
      "ratingRaw": 25.5
    },
    {
      "id": "bing_73",
      "name": "Dave Bing",
      "pos": "PG",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 22.6,
      "rpg": 4.5,
      "apg": 6.3,
      "spg": 1.9,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 65,
      "rating": 78,
      "ratingRaw": 18.1
    },
    {
      "id": "kporter_79",
      "name": "Kevin Porter",
      "pos": "PG",
      "ppg": 15.4,
      "rpg": 3.7,
      "apg": 10,
      "spg": 1.4,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor General"
      ],
      "popularity": 43,
      "rating": 75,
      "ratingRaw": 16.5
    }
  ],
  "Sixers_1970s": [
    {
      "id": "erving_77",
      "name": "Julius Erving",
      "pos": "SF",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 24.2,
      "rpg": 8.5,
      "apg": 4.1,
      "spg": 2,
      "bpg": 1.6,
      "archetype": "Slasher",
      "traits": [
        "Clutch Assassin",
        "Volume Shooter",
        "Slasher"
      ],
      "popularity": 92,
      "rating": 87,
      "ratingRaw": 22.2
    },
    {
      "id": "dcollins_77",
      "name": "Doug Collins",
      "pos": "SG",
      "ppg": 20.7,
      "rpg": 3.7,
      "apg": 4.4,
      "spg": 1.6,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 55,
      "rating": 73,
      "ratingRaw": 15.5
    },
    {
      "id": "mcginnis_77",
      "name": "George McGinnis",
      "pos": "PF",
      "secondaryPos": [
        "C"
      ],
      "ppg": 22,
      "rpg": 12.7,
      "apg": 3.6,
      "spg": 2.1,
      "bpg": 0.6,
      "archetype": "Two-Way Star",
      "traits": [
        "Volume Shooter",
        "Rebounding Machine"
      ],
      "popularity": 58,
      "rating": 88,
      "ratingRaw": 22.9
    }
  ],
  "Rockets_1970s": [
    {
      "id": "cmurphy_75",
      "name": "Calvin Murphy",
      "pos": "PG",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 21,
      "rpg": 2.5,
      "apg": 4.5,
      "spg": 2,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Clutch Assassin",
        "Floor Spacer"
      ],
      "popularity": 60,
      "rating": 72,
      "ratingRaw": 15.1
    },
    {
      "id": "rtomjanovich_77",
      "name": "Rudy Tomjanovich",
      "pos": "SF",
      "secondaryPos": [
        "PF"
      ],
      "ppg": 25,
      "rpg": 9.7,
      "apg": 2,
      "spg": 0.8,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Rebounding Machine",
        "Clutch"
      ],
      "popularity": 58,
      "rating": 80,
      "ratingRaw": 18.8
    },
    {
      "id": "mmalone_79",
      "name": "Moses Malone",
      "pos": "C",
      "ppg": 17.8,
      "rpg": 13.1,
      "apg": 1.2,
      "spg": 0.9,
      "bpg": 1.8,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Rim Protector"
      ],
      "popularity": 85,
      "rating": 84,
      "ratingRaw": 20.9
    }
  ],
  "Nuggets_1970s": [
    {
      "id": "dthompson_78",
      "name": "David Thompson",
      "pos": "SG",
      "secondaryPos": [
        "SF"
      ],
      "ppg": 27.2,
      "rpg": 4.3,
      "apg": 3.3,
      "spg": 1,
      "bpg": 0.5,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Clutch Assassin",
        "Slasher"
      ],
      "popularity": 75,
      "rating": 76,
      "ratingRaw": 16.9
    },
    {
      "id": "issel_78",
      "name": "Dan Issel",
      "pos": "C",
      "secondaryPos": [
        "PF"
      ],
      "ppg": 22.6,
      "rpg": 9.3,
      "apg": 3.1,
      "spg": 0.7,
      "bpg": 0.5,
      "archetype": "Paint Beast",
      "traits": [
        "Volume Shooter",
        "Rebounding Machine"
      ],
      "popularity": 68,
      "rating": 79,
      "ratingRaw": 18.6
    },
    {
      "id": "bjones_nug_78",
      "name": "Bobby Jones",
      "pos": "SF",
      "secondaryPos": [
        "PF"
      ],
      "ppg": 10.3,
      "rpg": 7,
      "apg": 1.5,
      "spg": 1.8,
      "bpg": 1.1,
      "archetype": "Lockdown Defender",
      "traits": [
        "Glue Guy",
        "Hustle Player",
        "Rim Protector"
      ],
      "popularity": 52,
      "rating": 71,
      "ratingRaw": 14.4
    }
  ],
  "Cavaliers_1970s": [
    {
      "id": "acarr_74",
      "name": "Austin Carr",
      "pos": "SG",
      "ppg": 21.2,
      "rpg": 3.5,
      "apg": 3.3,
      "spg": 1.2,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer",
        "Clutch"
      ],
      "popularity": 48,
      "rating": 70,
      "ratingRaw": 14.3
    },
    {
      "id": "crussell_77",
      "name": "Campy Russell",
      "pos": "SF",
      "ppg": 19.7,
      "rpg": 6,
      "apg": 3.5,
      "spg": 1.2,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 42,
      "rating": 74,
      "ratingRaw": 16
    },
    {
      "id": "chones_77",
      "name": "Jim Chones",
      "pos": "C",
      "ppg": 15,
      "rpg": 10,
      "apg": 2.3,
      "spg": 0.7,
      "bpg": 1.3,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Glue Guy"
      ],
      "popularity": 40,
      "rating": 77,
      "ratingRaw": 17.5
    }
  ],
  "Warriors_1980s": [
    {
      "id": "wbfree_82",
      "name": "World B. Free",
      "pos": "SG",
      "secondaryPos": [
        "PG"
      ],
      "ppg": 27.1,
      "rpg": 3.5,
      "apg": 5.1,
      "spg": 1.5,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Clutch Assassin"
      ],
      "popularity": 53,
      "rating": 77,
      "ratingRaw": 17.5
    },
    {
      "id": "pshort_84",
      "name": "Purvis Short",
      "pos": "SF",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 20.9,
      "rpg": 4.6,
      "apg": 2.5,
      "spg": 1,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer",
        "Clutch"
      ],
      "popularity": 44,
      "rating": 71,
      "ratingRaw": 14.6
    },
    {
      "id": "jbcarroll_83",
      "name": "Joe Barry Carroll",
      "pos": "C",
      "ppg": 20.4,
      "rpg": 9.5,
      "apg": 2.1,
      "spg": 0.8,
      "bpg": 1.6,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Volume Shooter"
      ],
      "popularity": 47,
      "rating": 81,
      "ratingRaw": 19.3
    }
  ],
  "Knicks_1980s": [
    {
      "id": "bking_85",
      "name": "Bernard King",
      "pos": "SF",
      "ppg": 24.6,
      "rpg": 5.9,
      "apg": 3.4,
      "spg": 1.3,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Clutch Assassin",
        "Floor Spacer"
      ],
      "popularity": 62,
      "rating": 78,
      "ratingRaw": 17.7
    },
    {
      "id": "ewing_89",
      "name": "Patrick Ewing",
      "pos": "C",
      "ppg": 22,
      "rpg": 10.5,
      "apg": 2.5,
      "spg": 0.9,
      "bpg": 2.7,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Rebounding Machine",
        "Volume Shooter"
      ],
      "popularity": 80,
      "rating": 87,
      "ratingRaw": 22.4
    },
    {
      "id": "mjackson_88",
      "name": "Mark Jackson",
      "pos": "PG",
      "ppg": 14.5,
      "rpg": 4.5,
      "apg": 10.6,
      "spg": 1.6,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor General"
      ],
      "popularity": 55,
      "rating": 77,
      "ratingRaw": 17.5
    }
  ],
  "Suns_1980s": [
    {
      "id": "wdavis_83",
      "name": "Walter Davis",
      "pos": "SG",
      "ppg": 23.5,
      "rpg": 3.5,
      "apg": 3.7,
      "spg": 1.2,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer",
        "Clutch Assassin"
      ],
      "popularity": 53,
      "rating": 73,
      "ratingRaw": 15.4
    },
    {
      "id": "lnance_86",
      "name": "Larry Nance",
      "pos": "PF",
      "secondaryPos": [
        "SF"
      ],
      "ppg": 17.1,
      "rpg": 7.7,
      "apg": 2.1,
      "spg": 1.3,
      "bpg": 2.2,
      "archetype": "Two-Way Star",
      "traits": [
        "Rim Protector",
        "Hustle Player"
      ],
      "popularity": 48,
      "rating": 79,
      "ratingRaw": 18.4
    },
    {
      "id": "kjohnson_89",
      "name": "Kevin Johnson",
      "pos": "PG",
      "ppg": 20.4,
      "rpg": 4.1,
      "apg": 9.3,
      "spg": 1.9,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "Elite Playmaker",
        "Clutch"
      ],
      "popularity": 68,
      "rating": 80,
      "ratingRaw": 18.8
    }
  ],
  "Rockets_1980s": [
    {
      "id": "hakeem_89",
      "name": "Hakeem Olajuwon",
      "pos": "C",
      "ppg": 23.5,
      "rpg": 13,
      "apg": 2.5,
      "spg": 2.1,
      "bpg": 3.3,
      "archetype": "Two-Way Star",
      "traits": [
        "Rim Protector",
        "Rebounding Machine",
        "Clutch Assassin"
      ],
      "popularity": 88,
      "rating": 97,
      "ratingRaw": 26.9
    },
    {
      "id": "rsampson_86",
      "name": "Ralph Sampson",
      "pos": "C",
      "secondaryPos": [
        "PF"
      ],
      "ppg": 21,
      "rpg": 10.9,
      "apg": 2.8,
      "spg": 0.8,
      "bpg": 2.4,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Rebounding Machine",
        "Volume Shooter"
      ],
      "popularity": 58,
      "rating": 86,
      "ratingRaw": 22
    },
    {
      "id": "rreid_84",
      "name": "Robert Reid",
      "pos": "SF",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 14,
      "rpg": 5,
      "apg": 3,
      "spg": 1.5,
      "bpg": 0.7,
      "archetype": "Lockdown Defender",
      "traits": [
        "Glue Guy",
        "Lockdown Defender"
      ],
      "popularity": 41,
      "rating": 70,
      "ratingRaw": 14.1
    }
  ],
  "Thunder_1980s": [
    {
      "id": "gwilliams_82",
      "name": "Gus Williams",
      "pos": "PG",
      "ppg": 19.2,
      "rpg": 4.5,
      "apg": 6.8,
      "spg": 2.4,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Lockdown Defender",
        "Clutch"
      ],
      "popularity": 55,
      "rating": 78,
      "ratingRaw": 17.7
    },
    {
      "id": "jsikma_85",
      "name": "Jack Sikma",
      "pos": "C",
      "ppg": 17.8,
      "rpg": 10.9,
      "apg": 3.1,
      "spg": 1.1,
      "bpg": 0.9,
      "archetype": "Two-Way Star",
      "traits": [
        "Rebounding Machine",
        "Volume Shooter"
      ],
      "popularity": 60,
      "rating": 81,
      "ratingRaw": 19.3
    },
    {
      "id": "dellis_88",
      "name": "Dale Ellis",
      "pos": "SG",
      "ppg": 25.8,
      "rpg": 4.8,
      "apg": 2,
      "spg": 1,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 48,
      "rating": 74,
      "ratingRaw": 16
    }
  ],
  "Nuggets_1990s": [
    {
      "id": "mutombo_95",
      "name": "Dikembe Mutombo",
      "pos": "C",
      "ppg": 12,
      "rpg": 12.3,
      "apg": 1.2,
      "spg": 0.9,
      "bpg": 3.9,
      "archetype": "Lockdown Defender",
      "traits": [
        "Rim Protector",
        "Rebounding Machine",
        "Glue Guy"
      ],
      "popularity": 78,
      "rating": 86,
      "ratingRaw": 21.7
    },
    {
      "id": "abdrauf_95",
      "name": "Mahmoud Abdul-Rauf",
      "pos": "PG",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 15.6,
      "rpg": 2.7,
      "apg": 4.4,
      "spg": 1.1,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer",
        "Clutch Assassin"
      ],
      "popularity": 52,
      "rating": 66,
      "ratingRaw": 12.4
    },
    {
      "id": "lellis_96",
      "name": "LaPhonso Ellis",
      "pos": "PF",
      "secondaryPos": [
        "SF"
      ],
      "ppg": 18,
      "rpg": 8.7,
      "apg": 2.4,
      "spg": 1.3,
      "bpg": 1.1,
      "archetype": "Two-Way Star",
      "traits": [
        "Volume Shooter",
        "Hustle Player"
      ],
      "popularity": 41,
      "rating": 78,
      "ratingRaw": 18
    }
  ],
  "Bucks_1990s": [
    {
      "id": "grobinson_98",
      "name": "Glenn Robinson",
      "pos": "SF",
      "ppg": 20.1,
      "rpg": 6.4,
      "apg": 2.5,
      "spg": 0.9,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer",
        "Clutch"
      ],
      "popularity": 62,
      "rating": 73,
      "ratingRaw": 15.7
    },
    {
      "id": "rallen_99",
      "name": "Ray Allen",
      "pos": "SG",
      "ppg": 21,
      "rpg": 4,
      "apg": 4,
      "spg": 1.4,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter",
        "Clutch Assassin"
      ],
      "popularity": 82,
      "rating": 72,
      "ratingRaw": 15.2
    },
    {
      "id": "vbaker_96",
      "name": "Vin Baker",
      "pos": "PF",
      "ppg": 19,
      "rpg": 9.2,
      "apg": 2.3,
      "spg": 1,
      "bpg": 1.3,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Volume Shooter"
      ],
      "popularity": 52,
      "rating": 79,
      "ratingRaw": 18.5
    }
  ],
  "Mavericks_1990s": [
    {
      "id": "jkidd_96",
      "name": "Jason Kidd",
      "pos": "PG",
      "ppg": 14.1,
      "rpg": 6.1,
      "apg": 8.7,
      "spg": 2,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "Elite Playmaker",
        "Clutch Assassin"
      ],
      "popularity": 78,
      "rating": 78,
      "ratingRaw": 18.1
    },
    {
      "id": "mashburn_96",
      "name": "Jamal Mashburn",
      "pos": "SF",
      "secondaryPos": [
        "PF"
      ],
      "ppg": 19.2,
      "rpg": 5.1,
      "apg": 3,
      "spg": 1.2,
      "bpg": 0.5,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Slasher"
      ],
      "popularity": 55,
      "rating": 72,
      "ratingRaw": 15.1
    },
    {
      "id": "jjackson_95",
      "name": "Jim Jackson",
      "pos": "SG",
      "secondaryPos": [
        "SF"
      ],
      "ppg": 22.4,
      "rpg": 5.8,
      "apg": 4.4,
      "spg": 1.5,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 42,
      "rating": 77,
      "ratingRaw": 17.6
    }
  ],
  "Thunder_2000s": [
    {
      "id": "rallen_son_05",
      "name": "Ray Allen",
      "pos": "SG",
      "ppg": 21.7,
      "rpg": 4,
      "apg": 3.9,
      "spg": 1.3,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter",
        "Clutch Assassin"
      ],
      "popularity": 82,
      "rating": 73,
      "ratingRaw": 15.3
    },
    {
      "id": "rlewis_06",
      "name": "Rashard Lewis",
      "pos": "SF",
      "secondaryPos": [
        "PF"
      ],
      "ppg": 19,
      "rpg": 6.9,
      "apg": 2.3,
      "spg": 0.8,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 51,
      "rating": 73,
      "ratingRaw": 15.5
    },
    {
      "id": "gpayton_02",
      "name": "Gary Payton",
      "pos": "PG",
      "ppg": 22.1,
      "rpg": 4.8,
      "apg": 8.3,
      "spg": 1.8,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Elite Playmaker",
        "Lockdown Defender",
        "Clutch Assassin"
      ],
      "popularity": 78,
      "rating": 81,
      "ratingRaw": 19.3
    }
  ],
  "Pistons_2010s": [
    {
      "id": "drummond_16",
      "name": "Andre Drummond",
      "pos": "C",
      "ppg": 15.4,
      "rpg": 15.8,
      "apg": 1.6,
      "spg": 0.8,
      "bpg": 1.6,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Rim Protector"
      ],
      "popularity": 55,
      "rating": 86,
      "ratingRaw": 21.9
    },
    {
      "id": "bgriffin_pis_18",
      "name": "Blake Griffin",
      "pos": "PF",
      "secondaryPos": [
        "SF"
      ],
      "ppg": 24.5,
      "rpg": 7.4,
      "apg": 5.4,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Clutch Assassin",
        "Volume Shooter",
        "Slasher"
      ],
      "popularity": 68,
      "rating": 80,
      "ratingRaw": 19.1
    },
    {
      "id": "rjackson_17",
      "name": "Reggie Jackson",
      "pos": "PG",
      "ppg": 16.7,
      "rpg": 3.9,
      "apg": 5.5,
      "spg": 1.3,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Volume Shooter"
      ],
      "popularity": 44,
      "rating": 71,
      "ratingRaw": 14.7
    }
  ],
  "Suns_2010s": [
    {
      "id": "booker_19",
      "name": "Devin Booker",
      "pos": "SG",
      "ppg": 26.1,
      "rpg": 4,
      "apg": 6.3,
      "spg": 0.9,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Clutch Assassin",
        "Floor Spacer"
      ],
      "popularity": 72,
      "rating": 78,
      "ratingRaw": 17.7
    },
    {
      "id": "gdragic_14",
      "name": "Goran Dragic",
      "pos": "PG",
      "ppg": 20.3,
      "rpg": 3.3,
      "apg": 5.9,
      "spg": 1.5,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 55,
      "rating": 74,
      "ratingRaw": 15.8
    },
    {
      "id": "ebledsoe_15",
      "name": "Eric Bledsoe",
      "pos": "PG",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 19.6,
      "rpg": 5.3,
      "apg": 5.6,
      "spg": 1.8,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Lockdown Defender",
        "Elite Playmaker"
      ],
      "popularity": 50,
      "rating": 77,
      "ratingRaw": 17.5
    }
  ],
  "Bucks_2010s": [
    {
      "id": "giannis_19",
      "name": "Giannis Antetokounmpo",
      "pos": "PF",
      "secondaryPos": [
        "C"
      ],
      "ppg": 27.7,
      "rpg": 12.5,
      "apg": 5.9,
      "spg": 1.3,
      "bpg": 1.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Rim Protector",
        "Clutch Assassin",
        "Lob Threat"
      ],
      "popularity": 92,
      "rating": 95,
      "ratingRaw": 26.2
    },
    {
      "id": "middleton_19",
      "name": "Khris Middleton",
      "pos": "SF",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 20,
      "rpg": 5.5,
      "apg": 4.5,
      "spg": 1.3,
      "bpg": 0.3,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch Assassin",
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 62,
      "rating": 75,
      "ratingRaw": 16.3
    },
    {
      "id": "brogdon_18",
      "name": "Malcolm Brogdon",
      "pos": "PG",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 15.6,
      "rpg": 4.8,
      "apg": 4.7,
      "spg": 1,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor Spacer",
        "Glue Guy"
      ],
      "popularity": 52,
      "rating": 70,
      "ratingRaw": 14.1
    }
  ],
  "Bulls_2020s": [
    {
      "id": "lavine_21",
      "name": "Zach LaVine",
      "pos": "SG",
      "ppg": 27.4,
      "rpg": 4.4,
      "apg": 4.5,
      "spg": 0.7,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer",
        "Clutch Assassin"
      ],
      "popularity": 65,
      "rating": 77,
      "ratingRaw": 17.3
    },
    {
      "id": "derozan_bulls_22",
      "name": "DeMar DeRozan",
      "pos": "SF",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 27.9,
      "rpg": 4.7,
      "apg": 5.4,
      "spg": 1,
      "bpg": 0.3,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch Assassin",
        "Volume Shooter",
        "Mid-Range Maestro"
      ],
      "popularity": 65,
      "rating": 79,
      "ratingRaw": 18.3
    },
    {
      "id": "vucevic_21",
      "name": "Nikola Vucevic",
      "pos": "C",
      "secondaryPos": [
        "PF"
      ],
      "ppg": 17.6,
      "rpg": 11,
      "apg": 3.2,
      "spg": 0.7,
      "bpg": 0.7,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Floor Spacer",
        "Post Scorer"
      ],
      "popularity": 55,
      "rating": 79,
      "ratingRaw": 18.6
    }
  ],
  "Spurs_2020s": [
    {
      "id": "wembanyama_24",
      "name": "Victor Wembanyama",
      "pos": "C",
      "secondaryPos": [
        "PF"
      ],
      "ppg": 21.4,
      "rpg": 10.6,
      "apg": 3.9,
      "spg": 1.2,
      "bpg": 3.6,
      "archetype": "Two-Way Star",
      "traits": [
        "Rim Protector",
        "Floor Spacer",
        "Franchise Player"
      ],
      "popularity": 88,
      "rating": 92,
      "ratingRaw": 24.8
    },
    {
      "id": "dmurray_22",
      "name": "Dejounte Murray",
      "pos": "PG",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 21.1,
      "rpg": 8.3,
      "apg": 9.2,
      "spg": 2,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Lockdown Defender",
        "Elite Playmaker",
        "Hustle Player"
      ],
      "popularity": 57,
      "rating": 87,
      "ratingRaw": 22.4
    },
    {
      "id": "derozan_spurs_21",
      "name": "DeMar DeRozan",
      "pos": "SF",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 21.6,
      "rpg": 4.4,
      "apg": 5.3,
      "spg": 0.9,
      "bpg": 0.3,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch Assassin",
        "Mid-Range Maestro",
        "Volume Shooter"
      ],
      "popularity": 65,
      "rating": 74,
      "ratingRaw": 16
    }
  ],
  "Knicks_2020s": [
    {
      "id": "brunson_24",
      "name": "Jalen Brunson",
      "pos": "PG",
      "ppg": 28.7,
      "rpg": 3.6,
      "apg": 6.7,
      "spg": 1,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Clutch Assassin",
        "Volume Shooter"
      ],
      "popularity": 90,
      "rating": 79,
      "ratingRaw": 18.4
    },
    {
      "id": "randle_21",
      "name": "Julius Randle",
      "pos": "PF",
      "secondaryPos": [
        "C"
      ],
      "ppg": 24.1,
      "rpg": 10.2,
      "apg": 6,
      "spg": 0.8,
      "bpg": 0.3,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Post Scorer",
        "Volume Shooter"
      ],
      "popularity": 57,
      "rating": 85,
      "ratingRaw": 21.2
    },
    {
      "id": "rjbarrett_23",
      "name": "RJ Barrett",
      "pos": "SG",
      "secondaryPos": [
        "SF"
      ],
      "ppg": 21.8,
      "rpg": 5.9,
      "apg": 4,
      "spg": 0.7,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Volume Shooter",
        "Slasher",
        "Defensive Stopper"
      ],
      "popularity": 53,
      "rating": 75,
      "ratingRaw": 16.3
    }
  ],
  "Jazz_2020s": [
    {
      "id": "dmitchell_22",
      "name": "Donovan Mitchell",
      "pos": "SG",
      "ppg": 26.4,
      "rpg": 4.4,
      "apg": 5.9,
      "spg": 1.5,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch Assassin",
        "Volume Shooter",
        "Floor Spacer"
      ],
      "popularity": 72,
      "rating": 79,
      "ratingRaw": 18.5
    },
    {
      "id": "rgobert_21",
      "name": "Rudy Gobert",
      "pos": "C",
      "ppg": 15.1,
      "rpg": 14.7,
      "apg": 1.3,
      "spg": 0.8,
      "bpg": 2.1,
      "archetype": "Lockdown Defender",
      "traits": [
        "Rim Protector",
        "Rebounding Machine",
        "Lob Threat"
      ],
      "popularity": 68,
      "rating": 86,
      "ratingRaw": 21.6
    },
    {
      "id": "markkanen_23",
      "name": "Lauri Markkanen",
      "pos": "PF",
      "secondaryPos": [
        "C"
      ],
      "ppg": 25.6,
      "rpg": 8.6,
      "apg": 1.9,
      "spg": 0.6,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter",
        "Stretch Big"
      ],
      "popularity": 55,
      "rating": 79,
      "ratingRaw": 18.3
    }
  ],
  "Pistons_2020s": [
    {
      "id": "cunningham_23",
      "name": "Cade Cunningham",
      "pos": "PG",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 22.7,
      "rpg": 4.4,
      "apg": 7.5,
      "spg": 1.5,
      "bpg": 0.4,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Volume Shooter",
        "Floor Spacer"
      ],
      "popularity": 58,
      "rating": 79,
      "ratingRaw": 18.4
    },
    {
      "id": "duren_23",
      "name": "Jalen Duren",
      "pos": "C",
      "ppg": 13.6,
      "rpg": 12.6,
      "apg": 1.5,
      "spg": 0.9,
      "bpg": 1.4,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Rim Protector",
        "Lob Threat"
      ],
      "popularity": 44,
      "rating": 80,
      "ratingRaw": 18.9
    },
    {
      "id": "sbey_22",
      "name": "Saddiq Bey",
      "pos": "SF",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 16.2,
      "rpg": 5,
      "apg": 2.3,
      "spg": 0.9,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "3-and-D",
        "Volume Shooter"
      ],
      "popularity": 40,
      "rating": 68,
      "ratingRaw": 13.1
    }
  ],
  "Magic_2020s": [
    {
      "id": "banchero_23",
      "name": "Paolo Banchero",
      "pos": "PF",
      "secondaryPos": [
        "SF"
      ],
      "ppg": 22.6,
      "rpg": 6.9,
      "apg": 5.4,
      "spg": 1,
      "bpg": 0.7,
      "archetype": "Slasher",
      "traits": [
        "Slasher",
        "Clutch Assassin",
        "Volume Shooter"
      ],
      "popularity": 60,
      "rating": 80,
      "ratingRaw": 18.8
    },
    {
      "id": "fwagner_23",
      "name": "Franz Wagner",
      "pos": "SF",
      "secondaryPos": [
        "SG"
      ],
      "ppg": 19.4,
      "rpg": 4.8,
      "apg": 3.6,
      "spg": 0.8,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Volume Shooter",
        "Slasher"
      ],
      "popularity": 50,
      "rating": 71,
      "ratingRaw": 14.8
    },
    {
      "id": "canthony_22",
      "name": "Cole Anthony",
      "pos": "PG",
      "ppg": 15.2,
      "rpg": 5.1,
      "apg": 5.6,
      "spg": 0.9,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 44,
      "rating": 71,
      "ratingRaw": 14.7
    }
  ],
  "Sixers_2020s": [
    {
      "id": "embiid_24",
      "name": "Joel Embiid",
      "pos": "C",
      "ppg": 33.1,
      "rpg": 10.2,
      "apg": 4.2,
      "spg": 1,
      "bpg": 1.7,
      "archetype": "Two-Way Star",
      "traits": [
        "Post Scorer",
        "Rim Protector",
        "Clutch Assassin"
      ],
      "popularity": 65,
      "rating": 93,
      "ratingRaw": 25.2
    },
    {
      "id": "maxey_24",
      "name": "Tyrese Maxey",
      "pos": "PG",
      "ppg": 25.9,
      "rpg": 3.7,
      "apg": 6.2,
      "spg": 1.2,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter",
        "Clutch Assassin"
      ],
      "popularity": 62,
      "rating": 78,
      "ratingRaw": 18
    },
    {
      "id": "tharris_21",
      "name": "Tobias Harris",
      "pos": "PF",
      "secondaryPos": [
        "SF"
      ],
      "ppg": 18.4,
      "rpg": 6.9,
      "apg": 2.7,
      "spg": 0.8,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Floor Spacer",
        "Defensive Stopper",
        "Volume Shooter"
      ],
      "popularity": 55,
      "rating": 73,
      "ratingRaw": 15.5
    }
  ],
  "Rockets_2020s": [
    {
      "id": "jgreen_23",
      "name": "Jalen Green",
      "pos": "SG",
      "ppg": 22,
      "rpg": 4.1,
      "apg": 3.8,
      "spg": 0.9,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer",
        "Clutch Assassin"
      ],
      "popularity": 56,
      "rating": 72,
      "ratingRaw": 15.1
    },
    {
      "id": "sengun_24",
      "name": "Alperen Sengun",
      "pos": "C",
      "secondaryPos": [
        "PF"
      ],
      "ppg": 21.1,
      "rpg": 9.3,
      "apg": 5,
      "spg": 1.3,
      "bpg": 0.9,
      "archetype": "Two-Way Star",
      "traits": [
        "Post Scorer",
        "Elite Playmaker",
        "Rim Protector"
      ],
      "popularity": 42,
      "rating": 83,
      "ratingRaw": 20.5
    },
    {
      "id": "jsmith_23",
      "name": "Jabari Smith Jr.",
      "pos": "PF",
      "secondaryPos": [
        "C"
      ],
      "ppg": 16.6,
      "rpg": 7.3,
      "apg": 1.6,
      "spg": 1.3,
      "bpg": 0.9,
      "archetype": "Lockdown Defender",
      "traits": [
        "Defensive Stopper",
        "Floor Spacer",
        "3-and-D"
      ],
      "popularity": 40,
      "rating": 74,
      "ratingRaw": 15.8
    }
  ],
  "Hawks_1960s": [
    {
      "id": "pettit_63",
      "name": "Bob Pettit",
      "pos": "PF",
      "ppg": 26.4,
      "rpg": 16.2,
      "apg": 3,
      "spg": 0.8,
      "bpg": 1,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Volume Scorer",
        "Clutch"
      ],
      "popularity": 52,
      "rating": 94,
      "ratingRaw": 25.5
    },
    {
      "id": "hagan_63",
      "name": "Cliff Hagan",
      "pos": "SF",
      "ppg": 21.4,
      "rpg": 7.5,
      "apg": 3.8,
      "spg": 0.7,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Mid-Range Maestro",
        "Clutch"
      ],
      "popularity": 44,
      "rating": 76,
      "ratingRaw": 17.2
    },
    {
      "id": "wilkens_63",
      "name": "Lenny Wilkens",
      "pos": "PG",
      "ppg": 16.2,
      "rpg": 4.6,
      "apg": 6.7,
      "spg": 1.2,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Elite Playmaker"
      ],
      "popularity": 35,
      "rating": 73,
      "ratingRaw": 15.5
    },
    {
      "id": "caldwell_68",
      "name": "Joe Caldwell",
      "pos": "SG",
      "ppg": 18.8,
      "rpg": 6.2,
      "apg": 3.5,
      "spg": 1.5,
      "bpg": 0.3,
      "archetype": "Slasher",
      "traits": [
        "Defensive Stopper",
        "Slasher"
      ],
      "popularity": 37,
      "rating": 74,
      "ratingRaw": 16.1
    },
    {
      "id": "beaty_68",
      "name": "Zelmo Beaty",
      "pos": "C",
      "ppg": 17.4,
      "rpg": 12.3,
      "apg": 1.8,
      "spg": 0.6,
      "bpg": 1.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Post Scorer"
      ],
      "popularity": 37,
      "rating": 82,
      "ratingRaw": 19.8
    }
  ],
  "Hawks_1970s": [
    {
      "id": "maravich_73",
      "name": "Pete Maravich",
      "pos": "PG",
      "ppg": 24.8,
      "rpg": 4.2,
      "apg": 5.8,
      "spg": 1.3,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Volume Shooter",
        "Point God",
        "Clutch Assassin"
      ],
      "popularity": 82,
      "rating": 77,
      "ratingRaw": 17.4
    },
    {
      "id": "hudson_73",
      "name": "Lou Hudson",
      "pos": "SG",
      "ppg": 22.4,
      "rpg": 4.8,
      "apg": 3.2,
      "spg": 1,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Mid-Range Maestro",
        "Volume Shooter"
      ],
      "popularity": 43,
      "rating": 73,
      "ratingRaw": 15.5
    },
    {
      "id": "drew_78",
      "name": "John Drew",
      "pos": "SF",
      "ppg": 20.7,
      "rpg": 6.2,
      "apg": 2,
      "spg": 1.1,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Slasher"
      ],
      "popularity": 39,
      "rating": 73,
      "ratingRaw": 15.5
    },
    {
      "id": "roundfield_78",
      "name": "Dan Roundfield",
      "pos": "PF",
      "ppg": 12.8,
      "rpg": 9.2,
      "apg": 2.1,
      "spg": 1.4,
      "bpg": 1.6,
      "archetype": "Two-Way Star",
      "traits": [
        "Rebounding Machine",
        "Defensive Stopper"
      ],
      "popularity": 35,
      "rating": 77,
      "ratingRaw": 17.4
    },
    {
      "id": "bellamy_71",
      "name": "Walt Bellamy",
      "pos": "C",
      "ppg": 14.6,
      "rpg": 12.4,
      "apg": 2.8,
      "spg": 0.7,
      "bpg": 1.2,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Post Scorer"
      ],
      "popularity": 35,
      "rating": 81,
      "ratingRaw": 19.2
    }
  ],
  "Hawks_1980s": [
    {
      "id": "wilkins_85",
      "name": "Dominique Wilkins",
      "pos": "SF",
      "ppg": 27.4,
      "rpg": 7.9,
      "apg": 2.5,
      "spg": 1.1,
      "bpg": 0.7,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Clutch Assassin",
        "Slasher"
      ],
      "popularity": 53,
      "rating": 81,
      "ratingRaw": 19.5
    },
    {
      "id": "rivers_85",
      "name": "Doc Rivers",
      "pos": "PG",
      "ppg": 11.9,
      "rpg": 3.8,
      "apg": 5.8,
      "spg": 1.8,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Defensive Stopper"
      ],
      "popularity": 55,
      "rating": 69,
      "ratingRaw": 13.7
    },
    {
      "id": "willis_85",
      "name": "Kevin Willis",
      "pos": "PF",
      "ppg": 12.8,
      "rpg": 9.8,
      "apg": 1.2,
      "spg": 0.8,
      "bpg": 0.9,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Post Scorer"
      ],
      "popularity": 35,
      "rating": 73,
      "ratingRaw": 15.6
    },
    {
      "id": "webb_85",
      "name": "Spud Webb",
      "pos": "PG",
      "ppg": 11.4,
      "rpg": 2.4,
      "apg": 5.2,
      "spg": 1.4,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Glue Guy"
      ],
      "popularity": 35,
      "rating": 65,
      "ratingRaw": 11.7
    },
    {
      "id": "rollins_83",
      "name": "Tree Rollins",
      "pos": "C",
      "ppg": 7.8,
      "rpg": 8.9,
      "apg": 0.9,
      "spg": 0.9,
      "bpg": 2.7,
      "archetype": "Lockdown Defender",
      "traits": [
        "Rim Protector",
        "Defensive Stopper",
        "Hustle Player"
      ],
      "popularity": 35,
      "rating": 74,
      "ratingRaw": 16
    }
  ],
  "Hawks_1990s": [
    {
      "id": "wilkins_92",
      "name": "Dominique Wilkins",
      "pos": "SF",
      "ppg": 24.8,
      "rpg": 7.2,
      "apg": 2.8,
      "spg": 1,
      "bpg": 0.6,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Clutch",
        "Slasher"
      ],
      "popularity": 44,
      "rating": 78,
      "ratingRaw": 18.1
    },
    {
      "id": "blaylock_95",
      "name": "Mookie Blaylock",
      "pos": "PG",
      "ppg": 13.8,
      "rpg": 4.2,
      "apg": 7.1,
      "spg": 2.5,
      "bpg": 0.2,
      "archetype": "Lockdown Defender",
      "traits": [
        "Defensive Stopper",
        "Floor General",
        "Lockdown Defender"
      ],
      "popularity": 37,
      "rating": 74,
      "ratingRaw": 16.1
    },
    {
      "id": "mutombo_97",
      "name": "Dikembe Mutombo",
      "pos": "C",
      "ppg": 12.8,
      "rpg": 12.1,
      "apg": 1.2,
      "spg": 0.5,
      "bpg": 3.3,
      "archetype": "Lockdown Defender",
      "traits": [
        "Rim Protector",
        "Rebounding Machine",
        "Defensive Stopper"
      ],
      "popularity": 78,
      "rating": 83,
      "ratingRaw": 20.4
    },
    {
      "id": "smith_s_96",
      "name": "Steve Smith",
      "pos": "SG",
      "ppg": 17.2,
      "rpg": 4.2,
      "apg": 4.1,
      "spg": 1.2,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Mid-Range Maestro"
      ],
      "popularity": 39,
      "rating": 70,
      "ratingRaw": 14.2
    },
    {
      "id": "augmon_92",
      "name": "Stacey Augmon",
      "pos": "SF",
      "ppg": 12,
      "rpg": 4.9,
      "apg": 2.8,
      "spg": 1.7,
      "bpg": 0.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "Defensive Stopper",
        "Glue Guy"
      ],
      "popularity": 35,
      "rating": 68,
      "ratingRaw": 13.2
    }
  ],
  "Hawks_2000s": [
    {
      "id": "johnson_j_06",
      "name": "Joe Johnson",
      "pos": "SG",
      "ppg": 21.2,
      "rpg": 4.6,
      "apg": 5,
      "spg": 0.9,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Mid-Range Maestro",
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 44,
      "rating": 74,
      "ratingRaw": 15.8
    },
    {
      "id": "smith_j_05",
      "name": "Josh Smith",
      "pos": "PF",
      "ppg": 14.8,
      "rpg": 8.4,
      "apg": 2.8,
      "spg": 1.5,
      "bpg": 2.1,
      "archetype": "Two-Way Star",
      "traits": [
        "Rim Protector",
        "Slasher",
        "Defensive Stopper"
      ],
      "popularity": 35,
      "rating": 80,
      "ratingRaw": 18.7
    },
    {
      "id": "horford_08",
      "name": "Al Horford",
      "pos": "C",
      "ppg": 13.2,
      "rpg": 9.8,
      "apg": 2.4,
      "spg": 0.8,
      "bpg": 1.4,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Post Scorer"
      ],
      "popularity": 62,
      "rating": 76,
      "ratingRaw": 17.1
    },
    {
      "id": "bibby_08",
      "name": "Mike Bibby",
      "pos": "PG",
      "ppg": 15,
      "rpg": 3.1,
      "apg": 5.5,
      "spg": 1,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor General",
        "Floor Spacer"
      ],
      "popularity": 58,
      "rating": 68,
      "ratingRaw": 13
    },
    {
      "id": "terry_02",
      "name": "Jason Terry",
      "pos": "SG",
      "ppg": 17.8,
      "rpg": 2.8,
      "apg": 5.4,
      "spg": 1.2,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch",
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 57,
      "rating": 70,
      "ratingRaw": 13.9
    }
  ],
  "Hawks_2010s": [
    {
      "id": "horford_13",
      "name": "Al Horford",
      "pos": "C",
      "ppg": 15.4,
      "rpg": 7.8,
      "apg": 3.4,
      "spg": 0.8,
      "bpg": 1.2,
      "archetype": "Two-Way Star",
      "traits": [
        "Floor General",
        "Post Scorer",
        "Rim Protector"
      ],
      "popularity": 62,
      "rating": 75,
      "ratingRaw": 16.7
    },
    {
      "id": "millsap_14",
      "name": "Paul Millsap",
      "pos": "PF",
      "ppg": 17.6,
      "rpg": 8.4,
      "apg": 3.2,
      "spg": 1.4,
      "bpg": 1.2,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Clutch",
        "Hustle Player"
      ],
      "popularity": 37,
      "rating": 79,
      "ratingRaw": 18.3
    },
    {
      "id": "korver_14",
      "name": "Kyle Korver",
      "pos": "SG",
      "ppg": 11.5,
      "rpg": 3.2,
      "apg": 1.8,
      "spg": 0.7,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "3-and-D"
      ],
      "popularity": 35,
      "rating": 61,
      "ratingRaw": 9.7
    },
    {
      "id": "teague_13",
      "name": "Jeff Teague",
      "pos": "PG",
      "ppg": 15.8,
      "rpg": 2.9,
      "apg": 7.2,
      "spg": 1.4,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Elite Playmaker"
      ],
      "popularity": 35,
      "rating": 71,
      "ratingRaw": 14.8
    },
    {
      "id": "schroeder_16",
      "name": "Dennis Schröder",
      "pos": "PG",
      "ppg": 16.5,
      "rpg": 3.2,
      "apg": 6.4,
      "spg": 1.2,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Elite Playmaker",
        "Slasher"
      ],
      "popularity": 35,
      "rating": 71,
      "ratingRaw": 14.5
    }
  ],
  "Hawks_2020s": [
    {
      "id": "young_t_22",
      "name": "Trae Young",
      "pos": "PG",
      "ppg": 27.8,
      "rpg": 3.9,
      "apg": 9.4,
      "spg": 1,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "Floor General",
        "Clutch Assassin"
      ],
      "popularity": 54,
      "rating": 82,
      "ratingRaw": 19.7
    },
    {
      "id": "murray_d_23",
      "name": "Dejounte Murray",
      "pos": "SG",
      "ppg": 21.2,
      "rpg": 5.4,
      "apg": 6.1,
      "spg": 1.5,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Elite Playmaker",
        "Slasher"
      ],
      "popularity": 57,
      "rating": 78,
      "ratingRaw": 17.9
    },
    {
      "id": "capela_22",
      "name": "Clint Capela",
      "pos": "C",
      "ppg": 13.4,
      "rpg": 13.1,
      "apg": 1.2,
      "spg": 0.6,
      "bpg": 1.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Rebounding Machine",
        "Hustle Player"
      ],
      "popularity": 52,
      "rating": 80,
      "ratingRaw": 18.8
    },
    {
      "id": "collins_j_22",
      "name": "John Collins",
      "pos": "PF",
      "ppg": 17.2,
      "rpg": 7.4,
      "apg": 1.5,
      "spg": 0.7,
      "bpg": 0.7,
      "archetype": "Slasher",
      "traits": [
        "Slasher",
        "Floor Spacer",
        "Clutch"
      ],
      "popularity": 35,
      "rating": 72,
      "ratingRaw": 15
    },
    {
      "id": "hunter_d_22",
      "name": "De Andre Hunter",
      "pos": "SF",
      "ppg": 13,
      "rpg": 3.8,
      "apg": 2.2,
      "spg": 1.1,
      "bpg": 0.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "3-and-D",
        "Defensive Stopper"
      ],
      "popularity": 35,
      "rating": 65,
      "ratingRaw": 11.7
    }
  ],
  "Nets_1970s": [
    {
      "id": "erving_75",
      "name": "Julius Erving",
      "pos": "SF",
      "ppg": 28.7,
      "rpg": 12.1,
      "apg": 4.8,
      "spg": 1.8,
      "bpg": 1.8,
      "archetype": "Slasher",
      "traits": [
        "Slasher",
        "Clutch Assassin",
        "Volume Shooter"
      ],
      "popularity": 92,
      "rating": 96,
      "ratingRaw": 26.6
    },
    {
      "id": "paultz_75",
      "name": "Billy Paultz",
      "pos": "C",
      "ppg": 16.2,
      "rpg": 10.8,
      "apg": 2.4,
      "spg": 0.8,
      "bpg": 1.2,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Rebounding Machine"
      ],
      "popularity": 35,
      "rating": 79,
      "ratingRaw": 18.5
    },
    {
      "id": "williamson_j_75",
      "name": "John Williamson",
      "pos": "SG",
      "ppg": 18.8,
      "rpg": 3.2,
      "apg": 3.2,
      "spg": 1.2,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 35,
      "rating": 68,
      "ratingRaw": 13.3
    },
    {
      "id": "taylor_b_75",
      "name": "Brian Taylor",
      "pos": "PG",
      "ppg": 13.4,
      "rpg": 3.8,
      "apg": 5.8,
      "spg": 2,
      "bpg": 0.2,
      "archetype": "Lockdown Defender",
      "traits": [
        "Defensive Stopper",
        "Floor General"
      ],
      "popularity": 35,
      "rating": 71,
      "ratingRaw": 14.4
    },
    {
      "id": "kenon_75",
      "name": "Larry Kenon",
      "pos": "SF",
      "ppg": 15.8,
      "rpg": 8.2,
      "apg": 2.8,
      "spg": 1.4,
      "bpg": 0.6,
      "archetype": "Two-Way Star",
      "traits": [
        "Rebounding Machine",
        "Slasher"
      ],
      "popularity": 45,
      "rating": 75,
      "ratingRaw": 16.5
    }
  ],
  "Nets_1980s": [
    {
      "id": "williams_bu_84",
      "name": "Buck Williams",
      "pos": "PF",
      "ppg": 16.4,
      "rpg": 12.5,
      "apg": 1.8,
      "spg": 0.8,
      "bpg": 0.8,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Hustle Player",
        "Post Scorer"
      ],
      "popularity": 38,
      "rating": 80,
      "ratingRaw": 18.8
    },
    {
      "id": "richardson_mr_83",
      "name": "Micheal Ray Richardson",
      "pos": "PG",
      "ppg": 17.8,
      "rpg": 6.2,
      "apg": 7.8,
      "spg": 2.8,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Floor General",
        "Defensive Stopper",
        "Elite Playmaker"
      ],
      "popularity": 44,
      "rating": 82,
      "ratingRaw": 19.8
    },
    {
      "id": "dawkins_d_84",
      "name": "Darryl Dawkins",
      "pos": "C",
      "ppg": 14.2,
      "rpg": 8.8,
      "apg": 1.4,
      "spg": 0.6,
      "bpg": 1.4,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Rim Protector"
      ],
      "popularity": 35,
      "rating": 74,
      "ratingRaw": 15.9
    },
    {
      "id": "gminski_85",
      "name": "Mike Gminski",
      "pos": "C",
      "ppg": 13.2,
      "rpg": 8.4,
      "apg": 1.2,
      "spg": 0.5,
      "bpg": 1.2,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Post Scorer"
      ],
      "popularity": 35,
      "rating": 71,
      "ratingRaw": 14.8
    },
    {
      "id": "cook_d_83",
      "name": "Darwin Cook",
      "pos": "SG",
      "ppg": 12.4,
      "rpg": 3.8,
      "apg": 4.8,
      "spg": 1.6,
      "bpg": 0.3,
      "archetype": "Lockdown Defender",
      "traits": [
        "Defensive Stopper",
        "3-and-D"
      ],
      "popularity": 35,
      "rating": 68,
      "ratingRaw": 13.3
    }
  ],
  "Nets_1990s": [
    {
      "id": "petrovic_93",
      "name": "Drazen Petrovic",
      "pos": "SG",
      "ppg": 22.3,
      "rpg": 3.4,
      "apg": 3.2,
      "spg": 0.9,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Mid-Range Maestro",
        "Clutch Assassin"
      ],
      "popularity": 45,
      "rating": 70,
      "ratingRaw": 14.2
    },
    {
      "id": "coleman_d_93",
      "name": "Derrick Coleman",
      "pos": "PF",
      "ppg": 20.2,
      "rpg": 10.3,
      "apg": 3,
      "spg": 0.9,
      "bpg": 1.2,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Volume Shooter",
        "Post Scorer"
      ],
      "popularity": 55,
      "rating": 82,
      "ratingRaw": 19.8
    },
    {
      "id": "anderson_k_95",
      "name": "Kenny Anderson",
      "pos": "PG",
      "ppg": 16.2,
      "rpg": 3.8,
      "apg": 8.2,
      "spg": 1.5,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Elite Playmaker"
      ],
      "popularity": 39,
      "rating": 74,
      "ratingRaw": 16.1
    },
    {
      "id": "vanhorn_98",
      "name": "Keith Van Horn",
      "pos": "PF",
      "ppg": 19.8,
      "rpg": 8.2,
      "apg": 2.4,
      "spg": 0.8,
      "bpg": 0.8,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 43,
      "rating": 76,
      "ratingRaw": 17.1
    },
    {
      "id": "kittles_97",
      "name": "Kerry Kittles",
      "pos": "SG",
      "ppg": 14.6,
      "rpg": 4.2,
      "apg": 2.4,
      "spg": 1.8,
      "bpg": 0.4,
      "archetype": "Lockdown Defender",
      "traits": [
        "Defensive Stopper",
        "3-and-D"
      ],
      "popularity": 47,
      "rating": 68,
      "ratingRaw": 13.2
    }
  ],
  "Nets_2010s": [
    {
      "id": "williams_de_13",
      "name": "Deron Williams",
      "pos": "PG",
      "ppg": 19.4,
      "rpg": 3.8,
      "apg": 8.7,
      "spg": 0.9,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "Floor General",
        "Volume Shooter"
      ],
      "popularity": 68,
      "rating": 76,
      "ratingRaw": 16.8
    },
    {
      "id": "lopez_br_14",
      "name": "Brook Lopez",
      "pos": "C",
      "ppg": 20.4,
      "rpg": 7.4,
      "apg": 2.2,
      "spg": 0.6,
      "bpg": 2.1,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Rim Protector",
        "Volume Shooter"
      ],
      "popularity": 55,
      "rating": 79,
      "ratingRaw": 18.3
    },
    {
      "id": "pierce_p_14",
      "name": "Paul Pierce",
      "pos": "SF",
      "ppg": 15.8,
      "rpg": 5.6,
      "apg": 3.4,
      "spg": 0.9,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch Assassin",
        "Mid-Range Maestro",
        "Post Scorer"
      ],
      "popularity": 85,
      "rating": 70,
      "ratingRaw": 14.3
    },
    {
      "id": "garnett_k_14",
      "name": "Kevin Garnett",
      "pos": "PF",
      "ppg": 13.8,
      "rpg": 8.2,
      "apg": 3.2,
      "spg": 1,
      "bpg": 1.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Rim Protector",
        "Hustle Player"
      ],
      "popularity": 88,
      "rating": 76,
      "ratingRaw": 16.9
    },
    {
      "id": "johnson_jo_14",
      "name": "Joe Johnson",
      "pos": "SG",
      "ppg": 16.4,
      "rpg": 4.2,
      "apg": 4.4,
      "spg": 0.8,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Mid-Range Maestro",
        "Clutch"
      ],
      "popularity": 35,
      "rating": 69,
      "ratingRaw": 13.5
    }
  ],
  "Nets_2020s": [
    {
      "id": "durant_bk_22",
      "name": "Kevin Durant",
      "pos": "SF",
      "ppg": 29.1,
      "rpg": 7.2,
      "apg": 5.4,
      "spg": 0.8,
      "bpg": 1.4,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Clutch Assassin",
        "Elite Playmaker"
      ],
      "popularity": 91,
      "rating": 86,
      "ratingRaw": 21.9
    },
    {
      "id": "irving_bk_22",
      "name": "Kyrie Irving",
      "pos": "PG",
      "ppg": 26.8,
      "rpg": 4.4,
      "apg": 5.8,
      "spg": 1.4,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch Assassin",
        "Mid-Range Maestro",
        "Floor Spacer"
      ],
      "popularity": 85,
      "rating": 79,
      "ratingRaw": 18.6
    },
    {
      "id": "harden_bk_21",
      "name": "James Harden",
      "pos": "PG",
      "ppg": 24.6,
      "rpg": 7.8,
      "apg": 10.4,
      "spg": 1.2,
      "bpg": 0.6,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "Volume Shooter",
        "Floor General"
      ],
      "popularity": 65,
      "rating": 89,
      "ratingRaw": 23
    },
    {
      "id": "bridges_mi_23",
      "name": "Mikal Bridges",
      "pos": "SF",
      "ppg": 20.2,
      "rpg": 4.4,
      "apg": 3.4,
      "spg": 1.2,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "3-and-D",
        "Defensive Stopper",
        "Clutch"
      ],
      "popularity": 52,
      "rating": 72,
      "ratingRaw": 15.1
    },
    {
      "id": "claxton_n_23",
      "name": "Nic Claxton",
      "pos": "C",
      "ppg": 12.4,
      "rpg": 8.8,
      "apg": 2.4,
      "spg": 1.2,
      "bpg": 2.2,
      "archetype": "Lockdown Defender",
      "traits": [
        "Rim Protector",
        "Defensive Stopper",
        "Hustle Player"
      ],
      "popularity": 35,
      "rating": 78,
      "ratingRaw": 17.8
    }
  ],
  "Hornets_1990s": [
    {
      "id": "mourning_93",
      "name": "Alonzo Mourning",
      "pos": "C",
      "ppg": 21,
      "rpg": 10.3,
      "apg": 1.8,
      "spg": 0.9,
      "bpg": 3.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "Rim Protector",
        "Defensive Stopper",
        "Post Scorer"
      ],
      "popularity": 75,
      "rating": 88,
      "ratingRaw": 22.8
    },
    {
      "id": "johnson_l_93",
      "name": "Larry Johnson",
      "pos": "PF",
      "ppg": 19.2,
      "rpg": 9.8,
      "apg": 3.6,
      "spg": 0.8,
      "bpg": 0.6,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Rebounding Machine",
        "Clutch"
      ],
      "popularity": 38,
      "rating": 79,
      "ratingRaw": 18.5
    },
    {
      "id": "bogues_93",
      "name": "Muggsy Bogues",
      "pos": "PG",
      "ppg": 8.6,
      "rpg": 3.8,
      "apg": 7.6,
      "spg": 1.5,
      "bpg": 0,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Glue Guy"
      ],
      "popularity": 35,
      "rating": 68,
      "ratingRaw": 13.1
    },
    {
      "id": "rice_g_95",
      "name": "Glen Rice",
      "pos": "SG",
      "ppg": 21.6,
      "rpg": 4.4,
      "apg": 2.4,
      "spg": 0.8,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter",
        "3-and-D"
      ],
      "popularity": 55,
      "rating": 70,
      "ratingRaw": 14.1
    },
    {
      "id": "curry_d_95",
      "name": "Dell Curry",
      "pos": "SG",
      "ppg": 15.4,
      "rpg": 2.8,
      "apg": 2.4,
      "spg": 0.7,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "3-and-D"
      ],
      "popularity": 35,
      "rating": 63,
      "ratingRaw": 10.9
    }
  ],
  "Hornets_2000s": [
    {
      "id": "wallace_g_06",
      "name": "Gerald Wallace",
      "pos": "SF",
      "ppg": 16.2,
      "rpg": 7.8,
      "apg": 2.6,
      "spg": 2.1,
      "bpg": 1.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Hustle Player",
        "Slasher"
      ],
      "popularity": 37,
      "rating": 79,
      "ratingRaw": 18.2
    },
    {
      "id": "okafor_e_05",
      "name": "Emeka Okafor",
      "pos": "C",
      "ppg": 12.8,
      "rpg": 10.2,
      "apg": 1,
      "spg": 0.8,
      "bpg": 2.2,
      "archetype": "Lockdown Defender",
      "traits": [
        "Rim Protector",
        "Rebounding Machine",
        "Defensive Stopper"
      ],
      "popularity": 35,
      "rating": 78,
      "ratingRaw": 17.7
    },
    {
      "id": "jackson_s_07",
      "name": "Stephen Jackson",
      "pos": "SG",
      "ppg": 17.8,
      "rpg": 5.4,
      "apg": 3.8,
      "spg": 1.4,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Volume Shooter",
        "Defensive Stopper",
        "Clutch"
      ],
      "popularity": 50,
      "rating": 73,
      "ratingRaw": 15.4
    },
    {
      "id": "diaw_07",
      "name": "Boris Diaw",
      "pos": "SF",
      "ppg": 12.4,
      "rpg": 6.8,
      "apg": 4.6,
      "spg": 0.8,
      "bpg": 0.8,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Glue Guy"
      ],
      "popularity": 55,
      "rating": 72,
      "ratingRaw": 15.1
    },
    {
      "id": "felton_06",
      "name": "Raymond Felton",
      "pos": "PG",
      "ppg": 12.8,
      "rpg": 3.4,
      "apg": 6.4,
      "spg": 1.1,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Elite Playmaker"
      ],
      "popularity": 44,
      "rating": 68,
      "ratingRaw": 13.3
    }
  ],
  "Hornets_2010s": [
    {
      "id": "walker_k_15",
      "name": "Kemba Walker",
      "pos": "PG",
      "ppg": 21.8,
      "rpg": 3.8,
      "apg": 5.8,
      "spg": 1.2,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch Assassin",
        "Volume Shooter",
        "Floor General"
      ],
      "popularity": 40,
      "rating": 75,
      "ratingRaw": 16.3
    },
    {
      "id": "batum_15",
      "name": "Nicolas Batum",
      "pos": "SF",
      "ppg": 14.4,
      "rpg": 5.8,
      "apg": 4.6,
      "spg": 1.2,
      "bpg": 0.6,
      "archetype": "Two-Way Star",
      "traits": [
        "3-and-D",
        "Floor General",
        "Defensive Stopper"
      ],
      "popularity": 35,
      "rating": 72,
      "ratingRaw": 15.2
    },
    {
      "id": "jefferson_al_14",
      "name": "Al Jefferson",
      "pos": "C",
      "ppg": 18.4,
      "rpg": 10.2,
      "apg": 2.2,
      "spg": 0.6,
      "bpg": 1.2,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Rebounding Machine"
      ],
      "popularity": 38,
      "rating": 79,
      "ratingRaw": 18.4
    },
    {
      "id": "lamb_j_17",
      "name": "Jeremy Lamb",
      "pos": "SG",
      "ppg": 13.4,
      "rpg": 4.8,
      "apg": 2.2,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Clutch"
      ],
      "popularity": 35,
      "rating": 66,
      "ratingRaw": 12
    },
    {
      "id": "williams_ma_16",
      "name": "Marvin Williams",
      "pos": "PF",
      "ppg": 11.2,
      "rpg": 5.8,
      "apg": 1.6,
      "spg": 0.8,
      "bpg": 0.6,
      "archetype": "Two-Way Star",
      "traits": [
        "Floor Spacer",
        "3-and-D"
      ],
      "popularity": 35,
      "rating": 66,
      "ratingRaw": 12
    }
  ],
  "Hornets_2020s": [
    {
      "id": "ball_lm_22",
      "name": "LaMelo Ball",
      "pos": "PG",
      "ppg": 22.4,
      "rpg": 5.4,
      "apg": 7.8,
      "spg": 1.6,
      "bpg": 0.4,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "Floor General",
        "Clutch Assassin"
      ],
      "popularity": 41,
      "rating": 81,
      "ratingRaw": 19.3
    },
    {
      "id": "bridges_mi_22",
      "name": "Miles Bridges",
      "pos": "SF",
      "ppg": 20.2,
      "rpg": 7,
      "apg": 3.8,
      "spg": 1,
      "bpg": 0.6,
      "archetype": "Slasher",
      "traits": [
        "Slasher",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 36,
      "rating": 76,
      "ratingRaw": 17.1
    },
    {
      "id": "rozier_22",
      "name": "Terry Rozier",
      "pos": "SG",
      "ppg": 21,
      "rpg": 4.4,
      "apg": 4.8,
      "spg": 1.2,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch Assassin",
        "Volume Shooter",
        "Floor Spacer"
      ],
      "popularity": 45,
      "rating": 74,
      "ratingRaw": 15.9
    },
    {
      "id": "washington_pj_22",
      "name": "P.J. Washington",
      "pos": "PF",
      "ppg": 14.2,
      "rpg": 6.4,
      "apg": 2.4,
      "spg": 0.8,
      "bpg": 0.8,
      "archetype": "Two-Way Star",
      "traits": [
        "Floor Spacer",
        "3-and-D"
      ],
      "popularity": 41,
      "rating": 70,
      "ratingRaw": 14.1
    },
    {
      "id": "williams_mk_22",
      "name": "Mark Williams",
      "pos": "C",
      "ppg": 10.8,
      "rpg": 9.2,
      "apg": 1.2,
      "spg": 0.4,
      "bpg": 2.2,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Rebounding Machine"
      ],
      "popularity": 35,
      "rating": 74,
      "ratingRaw": 16
    }
  ],
  "Pacers_1970s": [
    {
      "id": "daniels_m_71",
      "name": "Mel Daniels",
      "pos": "C",
      "ppg": 20.1,
      "rpg": 15,
      "apg": 2.4,
      "spg": 0.7,
      "bpg": 1.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Post Scorer"
      ],
      "popularity": 41,
      "rating": 89,
      "ratingRaw": 23
    },
    {
      "id": "brown_r_71",
      "name": "Roger Brown",
      "pos": "SF",
      "ppg": 17.8,
      "rpg": 6.4,
      "apg": 3.6,
      "spg": 1,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 35,
      "rating": 73,
      "ratingRaw": 15.6
    },
    {
      "id": "netolicky_71",
      "name": "Bob Netolicky",
      "pos": "PF",
      "ppg": 16.4,
      "rpg": 9.8,
      "apg": 2.6,
      "spg": 0.8,
      "bpg": 0.6,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Post Scorer"
      ],
      "popularity": 36,
      "rating": 76,
      "ratingRaw": 17.1
    },
    {
      "id": "buse_77",
      "name": "Don Buse",
      "pos": "PG",
      "ppg": 10.8,
      "rpg": 4.2,
      "apg": 6.2,
      "spg": 2.6,
      "bpg": 0.2,
      "archetype": "Lockdown Defender",
      "traits": [
        "Defensive Stopper",
        "Floor General"
      ],
      "popularity": 35,
      "rating": 71,
      "ratingRaw": 14.8
    },
    {
      "id": "keller_71",
      "name": "Billy Keller",
      "pos": "PG",
      "ppg": 12.2,
      "rpg": 3.2,
      "apg": 5.8,
      "spg": 1.2,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Floor General"
      ],
      "popularity": 35,
      "rating": 67,
      "ratingRaw": 12.6
    }
  ],
  "Pacers_1980s": [
    {
      "id": "person_87",
      "name": "Chuck Person",
      "pos": "SF",
      "ppg": 18.8,
      "rpg": 7.2,
      "apg": 2.8,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter",
        "Mid-Range Maestro"
      ],
      "popularity": 48,
      "rating": 74,
      "ratingRaw": 15.8
    },
    {
      "id": "tisdale_87",
      "name": "Wayman Tisdale",
      "pos": "PF",
      "ppg": 17.2,
      "rpg": 7.4,
      "apg": 1.8,
      "spg": 0.6,
      "bpg": 0.8,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Volume Shooter"
      ],
      "popularity": 35,
      "rating": 72,
      "ratingRaw": 15.2
    },
    {
      "id": "fleming_85",
      "name": "Vern Fleming",
      "pos": "PG",
      "ppg": 14.8,
      "rpg": 4.8,
      "apg": 6.2,
      "spg": 1.4,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Floor General",
        "Defensive Stopper"
      ],
      "popularity": 35,
      "rating": 73,
      "ratingRaw": 15.4
    },
    {
      "id": "kellogg_83",
      "name": "Clark Kellogg",
      "pos": "PF",
      "ppg": 19.4,
      "rpg": 10.2,
      "apg": 3,
      "spg": 1,
      "bpg": 0.6,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Post Scorer"
      ],
      "popularity": 35,
      "rating": 80,
      "ratingRaw": 18.7
    },
    {
      "id": "williams_h_85",
      "name": "Herb Williams",
      "pos": "C",
      "ppg": 14.6,
      "rpg": 8.4,
      "apg": 1.8,
      "spg": 0.6,
      "bpg": 2.1,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Post Scorer"
      ],
      "popularity": 35,
      "rating": 76,
      "ratingRaw": 17
    }
  ],
  "Pacers_1990s": [
    {
      "id": "miller_r_95",
      "name": "Reggie Miller",
      "pos": "SG",
      "ppg": 22.4,
      "rpg": 3.2,
      "apg": 3,
      "spg": 1.1,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch Assassin",
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 36,
      "rating": 70,
      "ratingRaw": 14.2
    },
    {
      "id": "smits_95",
      "name": "Rik Smits",
      "pos": "C",
      "ppg": 15.8,
      "rpg": 7.2,
      "apg": 1.8,
      "spg": 0.5,
      "bpg": 1.4,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Rim Protector"
      ],
      "popularity": 35,
      "rating": 73,
      "ratingRaw": 15.4
    },
    {
      "id": "jackson_mk_96",
      "name": "Mark Jackson",
      "pos": "PG",
      "ppg": 12.8,
      "rpg": 4.2,
      "apg": 9.6,
      "spg": 1.2,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "Floor General"
      ],
      "popularity": 55,
      "rating": 74,
      "ratingRaw": 15.8
    },
    {
      "id": "davis_d_97",
      "name": "Dale Davis",
      "pos": "PF",
      "ppg": 10.4,
      "rpg": 10.8,
      "apg": 1.2,
      "spg": 0.8,
      "bpg": 1.6,
      "archetype": "Lockdown Defender",
      "traits": [
        "Rim Protector",
        "Rebounding Machine",
        "Hustle Player"
      ],
      "popularity": 35,
      "rating": 75,
      "ratingRaw": 16.6
    },
    {
      "id": "rose_j_97",
      "name": "Jalen Rose",
      "pos": "SF",
      "ppg": 16.8,
      "rpg": 4.6,
      "apg": 4.2,
      "spg": 0.8,
      "bpg": 0.3,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Slasher"
      ],
      "popularity": 35,
      "rating": 70,
      "ratingRaw": 13.9
    }
  ],
  "Pacers_2000s": [
    {
      "id": "oneal_j_03",
      "name": "Jermaine O'Neal",
      "pos": "C",
      "ppg": 20.8,
      "rpg": 10,
      "apg": 2.2,
      "spg": 0.8,
      "bpg": 2.4,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Post Scorer",
        "Rebounding Machine"
      ],
      "popularity": 40,
      "rating": 84,
      "ratingRaw": 21
    },
    {
      "id": "miller_r_03",
      "name": "Reggie Miller",
      "pos": "SG",
      "ppg": 16.8,
      "rpg": 2.8,
      "apg": 2.8,
      "spg": 0.9,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch Assassin",
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 35,
      "rating": 65,
      "ratingRaw": 11.8
    },
    {
      "id": "artest_03",
      "name": "Ron Artest",
      "pos": "SF",
      "ppg": 18.2,
      "rpg": 5.8,
      "apg": 3.2,
      "spg": 2.2,
      "bpg": 0.6,
      "archetype": "Lockdown Defender",
      "traits": [
        "Defensive Stopper",
        "Lockdown Defender",
        "Volume Shooter"
      ],
      "popularity": 37,
      "rating": 75,
      "ratingRaw": 16.7
    },
    {
      "id": "granger_07",
      "name": "Danny Granger",
      "pos": "SF",
      "ppg": 18.4,
      "rpg": 5,
      "apg": 2,
      "spg": 1.2,
      "bpg": 0.8,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter",
        "3-and-D"
      ],
      "popularity": 35,
      "rating": 71,
      "ratingRaw": 14.7
    },
    {
      "id": "jackson_s_04",
      "name": "Stephen Jackson",
      "pos": "SG",
      "ppg": 14.8,
      "rpg": 4.6,
      "apg": 3.2,
      "spg": 1.2,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Volume Shooter",
        "Defensive Stopper"
      ],
      "popularity": 50,
      "rating": 69,
      "ratingRaw": 13.4
    }
  ],
  "Pacers_2010s": [
    {
      "id": "george_p_14",
      "name": "Paul George",
      "pos": "SF",
      "ppg": 22.4,
      "rpg": 6.8,
      "apg": 3.6,
      "spg": 2,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 43,
      "rating": 79,
      "ratingRaw": 18.4
    },
    {
      "id": "hibbert_13",
      "name": "Roy Hibbert",
      "pos": "C",
      "ppg": 13.8,
      "rpg": 8.4,
      "apg": 1.4,
      "spg": 0.5,
      "bpg": 2.6,
      "archetype": "Lockdown Defender",
      "traits": [
        "Rim Protector",
        "Defensive Stopper"
      ],
      "popularity": 35,
      "rating": 76,
      "ratingRaw": 17.2
    },
    {
      "id": "west_d_14",
      "name": "David West",
      "pos": "PF",
      "ppg": 14.8,
      "rpg": 7.4,
      "apg": 3.2,
      "spg": 0.8,
      "bpg": 0.8,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Mid-Range Maestro",
        "Hustle Player"
      ],
      "popularity": 43,
      "rating": 73,
      "ratingRaw": 15.5
    },
    {
      "id": "stephenson_14",
      "name": "Lance Stephenson",
      "pos": "SF",
      "ppg": 13.8,
      "rpg": 7.2,
      "apg": 5,
      "spg": 1.6,
      "bpg": 0.6,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Slasher",
        "Elite Playmaker"
      ],
      "popularity": 35,
      "rating": 75,
      "ratingRaw": 16.7
    },
    {
      "id": "oladipo_18",
      "name": "Victor Oladipo",
      "pos": "SG",
      "ppg": 23.1,
      "rpg": 5.2,
      "apg": 4.3,
      "spg": 2.4,
      "bpg": 0.8,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Volume Shooter",
        "Clutch Assassin"
      ],
      "popularity": 45,
      "rating": 80,
      "ratingRaw": 18.9
    }
  ],
  "Pacers_2020s": [
    {
      "id": "haliburton_23",
      "name": "Tyrese Haliburton",
      "pos": "PG",
      "ppg": 21.4,
      "rpg": 4,
      "apg": 10.9,
      "spg": 1.5,
      "bpg": 0.6,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "Floor General",
        "Elite Playmaker"
      ],
      "popularity": 44,
      "rating": 82,
      "ratingRaw": 19.9
    },
    {
      "id": "turner_m_23",
      "name": "Myles Turner",
      "pos": "C",
      "ppg": 14.8,
      "rpg": 7.2,
      "apg": 1.8,
      "spg": 0.8,
      "bpg": 2.8,
      "archetype": "Lockdown Defender",
      "traits": [
        "Rim Protector",
        "Defensive Stopper",
        "Floor Spacer"
      ],
      "popularity": 35,
      "rating": 77,
      "ratingRaw": 17.5
    },
    {
      "id": "siakam_24",
      "name": "Pascal Siakam",
      "pos": "PF",
      "ppg": 22,
      "rpg": 7.4,
      "apg": 3.8,
      "spg": 1,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Slasher",
        "Elite Playmaker",
        "Defensive Stopper"
      ],
      "popularity": 63,
      "rating": 78,
      "ratingRaw": 17.8
    },
    {
      "id": "hield_23",
      "name": "Buddy Hield",
      "pos": "SG",
      "ppg": 16.4,
      "rpg": 4.2,
      "apg": 3,
      "spg": 0.8,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "3-and-D",
        "Volume Shooter"
      ],
      "popularity": 35,
      "rating": 67,
      "ratingRaw": 12.7
    },
    {
      "id": "mathurin_23",
      "name": "Bennedict Mathurin",
      "pos": "SG",
      "ppg": 17.8,
      "rpg": 4.4,
      "apg": 2.2,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Slasher",
        "Clutch"
      ],
      "popularity": 35,
      "rating": 68,
      "ratingRaw": 13.1
    }
  ],
  "Clippers_1970s": [
    {
      "id": "mcadoo_74",
      "name": "Bob McAdoo",
      "pos": "PF",
      "ppg": 30.6,
      "rpg": 13.2,
      "apg": 2.8,
      "spg": 0.8,
      "bpg": 2,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Clutch Assassin",
        "Rebounding Machine"
      ],
      "popularity": 63,
      "rating": 95,
      "ratingRaw": 26
    },
    {
      "id": "smith_r_75",
      "name": "Randy Smith",
      "pos": "SG",
      "ppg": 19.8,
      "rpg": 4.6,
      "apg": 5.4,
      "spg": 1.6,
      "bpg": 0.2,
      "archetype": "Two-Way Star",
      "traits": [
        "Volume Shooter",
        "Defensive Stopper"
      ],
      "popularity": 44,
      "rating": 75,
      "ratingRaw": 16.3
    },
    {
      "id": "smith_el_73",
      "name": "Elmore Smith",
      "pos": "C",
      "ppg": 14.8,
      "rpg": 12.4,
      "apg": 1.8,
      "spg": 0.6,
      "bpg": 3,
      "archetype": "Lockdown Defender",
      "traits": [
        "Rim Protector",
        "Rebounding Machine"
      ],
      "popularity": 35,
      "rating": 85,
      "ratingRaw": 21.3
    },
    {
      "id": "mcmillian_74",
      "name": "Jim McMillian",
      "pos": "SG",
      "ppg": 16.4,
      "rpg": 5.2,
      "apg": 2.8,
      "spg": 0.8,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Mid-Range Maestro",
        "Floor Spacer"
      ],
      "popularity": 36,
      "rating": 68,
      "ratingRaw": 13.3
    },
    {
      "id": "heard_75",
      "name": "Garfield Heard",
      "pos": "SF",
      "ppg": 11.8,
      "rpg": 7.4,
      "apg": 2.4,
      "spg": 1.2,
      "bpg": 0.6,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Hustle Player"
      ],
      "popularity": 35,
      "rating": 70,
      "ratingRaw": 14.3
    }
  ],
  "Clippers_1980s": [
    {
      "id": "free_82",
      "name": "World B. Free",
      "pos": "SG",
      "ppg": 23.6,
      "rpg": 3.8,
      "apg": 5,
      "spg": 1.2,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Mid-Range Maestro",
        "Clutch"
      ],
      "popularity": 53,
      "rating": 74,
      "ratingRaw": 16.2
    },
    {
      "id": "cummings_83",
      "name": "Terry Cummings",
      "pos": "PF",
      "ppg": 22.4,
      "rpg": 9.8,
      "apg": 2.2,
      "spg": 0.8,
      "bpg": 0.6,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Slasher",
        "Post Scorer"
      ],
      "popularity": 58,
      "rating": 80,
      "ratingRaw": 18.7
    },
    {
      "id": "nixon_83",
      "name": "Norm Nixon",
      "pos": "PG",
      "ppg": 16.8,
      "rpg": 3.2,
      "apg": 8.4,
      "spg": 1.4,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Elite Playmaker"
      ],
      "popularity": 41,
      "rating": 74,
      "ratingRaw": 15.8
    },
    {
      "id": "johnson_mq_84",
      "name": "Marques Johnson",
      "pos": "SF",
      "ppg": 18.2,
      "rpg": 6.8,
      "apg": 3.6,
      "spg": 1.2,
      "bpg": 0.6,
      "archetype": "Two-Way Star",
      "traits": [
        "Slasher",
        "Mid-Range Maestro"
      ],
      "popularity": 59,
      "rating": 75,
      "ratingRaw": 16.5
    },
    {
      "id": "smith_dk_85",
      "name": "Derek Smith",
      "pos": "SG",
      "ppg": 16.8,
      "rpg": 4.6,
      "apg": 3.8,
      "spg": 1.4,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Slasher"
      ],
      "popularity": 38,
      "rating": 71,
      "ratingRaw": 14.5
    }
  ],
  "Clippers_1990s": [
    {
      "id": "manning_d_93",
      "name": "Danny Manning",
      "pos": "PF",
      "ppg": 20.8,
      "rpg": 7.8,
      "apg": 2.8,
      "spg": 1.2,
      "bpg": 1.2,
      "archetype": "Two-Way Star",
      "traits": [
        "Post Scorer",
        "Mid-Range Maestro",
        "Slasher"
      ],
      "popularity": 58,
      "rating": 79,
      "ratingRaw": 18.4
    },
    {
      "id": "harper_r_92",
      "name": "Ron Harper",
      "pos": "PG",
      "ppg": 18.4,
      "rpg": 5.4,
      "apg": 5.2,
      "spg": 2.2,
      "bpg": 0.8,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Slasher",
        "Floor General"
      ],
      "popularity": 39,
      "rating": 78,
      "ratingRaw": 17.9
    },
    {
      "id": "vaught_94",
      "name": "Loy Vaught",
      "pos": "PF",
      "ppg": 14.8,
      "rpg": 10.2,
      "apg": 1.4,
      "spg": 0.6,
      "bpg": 0.8,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Post Scorer"
      ],
      "popularity": 35,
      "rating": 74,
      "ratingRaw": 16.2
    },
    {
      "id": "murray_lm_96",
      "name": "Lamond Murray",
      "pos": "SF",
      "ppg": 14.6,
      "rpg": 5.6,
      "apg": 2.2,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer"
      ],
      "popularity": 35,
      "rating": 68,
      "ratingRaw": 13
    },
    {
      "id": "piatkowski_96",
      "name": "Eric Piatkowski",
      "pos": "SG",
      "ppg": 10.8,
      "rpg": 3.2,
      "apg": 1.8,
      "spg": 0.6,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "3-and-D"
      ],
      "popularity": 35,
      "rating": 60,
      "ratingRaw": 9.4
    }
  ],
  "Clippers_2000s": [
    {
      "id": "brand_e_03",
      "name": "Elton Brand",
      "pos": "PF",
      "ppg": 20.4,
      "rpg": 10,
      "apg": 2.8,
      "spg": 0.8,
      "bpg": 2,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Rebounding Machine",
        "Rim Protector"
      ],
      "popularity": 55,
      "rating": 84,
      "ratingRaw": 20.6
    },
    {
      "id": "maggette_04",
      "name": "Corey Maggette",
      "pos": "SF",
      "ppg": 20.2,
      "rpg": 5.8,
      "apg": 2.4,
      "spg": 1.2,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Slasher"
      ],
      "popularity": 43,
      "rating": 73,
      "ratingRaw": 15.4
    },
    {
      "id": "cassell_s_04",
      "name": "Sam Cassell",
      "pos": "PG",
      "ppg": 17.8,
      "rpg": 3.6,
      "apg": 7.2,
      "spg": 1.2,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Clutch Assassin",
        "Floor General",
        "Mid-Range Maestro"
      ],
      "popularity": 62,
      "rating": 73,
      "ratingRaw": 15.5
    },
    {
      "id": "kaman_06",
      "name": "Chris Kaman",
      "pos": "C",
      "ppg": 14.8,
      "rpg": 9.8,
      "apg": 1.4,
      "spg": 0.6,
      "bpg": 1.8,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Rebounding Machine"
      ],
      "popularity": 35,
      "rating": 77,
      "ratingRaw": 17.4
    },
    {
      "id": "livingston_s_06",
      "name": "Shaun Livingston",
      "pos": "PG",
      "ppg": 11.2,
      "rpg": 4.8,
      "apg": 5.8,
      "spg": 1.2,
      "bpg": 0.4,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Mid-Range Maestro"
      ],
      "popularity": 44,
      "rating": 70,
      "ratingRaw": 13.9
    }
  ],
  "Clippers_2010s": [
    {
      "id": "paul_c_13",
      "name": "Chris Paul",
      "pos": "PG",
      "ppg": 19.2,
      "rpg": 4.4,
      "apg": 9.8,
      "spg": 2.4,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "Floor General",
        "Defensive Stopper"
      ],
      "popularity": 78,
      "rating": 81,
      "ratingRaw": 19.4
    },
    {
      "id": "griffin_b_14",
      "name": "Blake Griffin",
      "pos": "PF",
      "ppg": 22.6,
      "rpg": 8.8,
      "apg": 4.4,
      "spg": 0.8,
      "bpg": 0.6,
      "archetype": "Slasher",
      "traits": [
        "Slasher",
        "Volume Shooter",
        "Clutch Assassin"
      ],
      "popularity": 68,
      "rating": 81,
      "ratingRaw": 19.3
    },
    {
      "id": "jordan_da_14",
      "name": "DeAndre Jordan",
      "pos": "C",
      "ppg": 12.4,
      "rpg": 14.5,
      "apg": 1.2,
      "spg": 0.6,
      "bpg": 2.2,
      "archetype": "Lockdown Defender",
      "traits": [
        "Rim Protector",
        "Rebounding Machine",
        "Hustle Player"
      ],
      "popularity": 35,
      "rating": 83,
      "ratingRaw": 20.5
    },
    {
      "id": "redick_14",
      "name": "J.J. Redick",
      "pos": "SG",
      "ppg": 15.8,
      "rpg": 2.8,
      "apg": 2.4,
      "spg": 0.8,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "3-and-D"
      ],
      "popularity": 78,
      "rating": 64,
      "ratingRaw": 11.2
    },
    {
      "id": "crawford_j_14",
      "name": "Jamal Crawford",
      "pos": "SG",
      "ppg": 18.4,
      "rpg": 2.8,
      "apg": 3.8,
      "spg": 1,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Mid-Range Maestro",
        "Volume Shooter",
        "Clutch Assassin"
      ],
      "popularity": 55,
      "rating": 68,
      "ratingRaw": 13
    }
  ],
  "Clippers_2020s": [
    {
      "id": "leonard_k_21",
      "name": "Kawhi Leonard",
      "pos": "SF",
      "ppg": 24.8,
      "rpg": 6.4,
      "apg": 3.8,
      "spg": 1.8,
      "bpg": 0.8,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Clutch Assassin",
        "Lockdown Defender"
      ],
      "popularity": 80,
      "rating": 81,
      "ratingRaw": 19.3
    },
    {
      "id": "george_p_21",
      "name": "Paul George",
      "pos": "SF",
      "ppg": 20.4,
      "rpg": 6.4,
      "apg": 4,
      "spg": 1.8,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 44,
      "rating": 77,
      "ratingRaw": 17.5
    },
    {
      "id": "powell_n_22",
      "name": "Norman Powell",
      "pos": "SG",
      "ppg": 18.2,
      "rpg": 3.8,
      "apg": 2.4,
      "spg": 1,
      "bpg": 0.3,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Clutch",
        "3-and-D"
      ],
      "popularity": 36,
      "rating": 68,
      "ratingRaw": 13
    },
    {
      "id": "zubac_21",
      "name": "Ivica Zubac",
      "pos": "C",
      "ppg": 11.4,
      "rpg": 9.8,
      "apg": 2.2,
      "spg": 0.4,
      "bpg": 1.4,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Rim Protector"
      ],
      "popularity": 35,
      "rating": 74,
      "ratingRaw": 16
    },
    {
      "id": "jackson_rg_22",
      "name": "Reggie Jackson",
      "pos": "PG",
      "ppg": 16.8,
      "rpg": 3.4,
      "apg": 5.8,
      "spg": 0.8,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch",
        "Volume Shooter",
        "Floor General"
      ],
      "popularity": 44,
      "rating": 69,
      "ratingRaw": 13.8
    }
  ],
  "Timberwolves_1990s": [
    {
      "id": "garnett_k_98",
      "name": "Kevin Garnett",
      "pos": "PF",
      "ppg": 20.8,
      "rpg": 10.4,
      "apg": 4.2,
      "spg": 1.6,
      "bpg": 2,
      "archetype": "Two-Way Star",
      "traits": [
        "Rim Protector",
        "Defensive Stopper",
        "Rebounding Machine"
      ],
      "popularity": 88,
      "rating": 88,
      "ratingRaw": 22.7
    },
    {
      "id": "marbury_s_98",
      "name": "Stephon Marbury",
      "pos": "PG",
      "ppg": 21.8,
      "rpg": 4.4,
      "apg": 8.6,
      "spg": 1.4,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Volume Shooter",
        "Floor General",
        "Point God"
      ],
      "popularity": 62,
      "rating": 79,
      "ratingRaw": 18.3
    },
    {
      "id": "gugliotta_97",
      "name": "Tom Gugliotta",
      "pos": "SF",
      "ppg": 17.8,
      "rpg": 8.4,
      "apg": 4.4,
      "spg": 1.4,
      "bpg": 0.6,
      "archetype": "Two-Way Star",
      "traits": [
        "Floor General",
        "Rebounding Machine",
        "Hustle Player"
      ],
      "popularity": 42,
      "rating": 79,
      "ratingRaw": 18.2
    },
    {
      "id": "rider_94",
      "name": "Isaiah Rider",
      "pos": "SG",
      "ppg": 18.6,
      "rpg": 3.8,
      "apg": 2.8,
      "spg": 1,
      "bpg": 0.2,
      "archetype": "Slasher",
      "traits": [
        "Slasher",
        "Volume Shooter"
      ],
      "popularity": 35,
      "rating": 68,
      "ratingRaw": 13.2
    },
    {
      "id": "laettner_94",
      "name": "Christian Laettner",
      "pos": "PF",
      "ppg": 14.6,
      "rpg": 8.2,
      "apg": 2.8,
      "spg": 0.8,
      "bpg": 0.8,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Mid-Range Maestro"
      ],
      "popularity": 35,
      "rating": 74,
      "ratingRaw": 15.8
    }
  ],
  "Timberwolves_2000s": [
    {
      "id": "garnett_k_04",
      "name": "Kevin Garnett",
      "pos": "PF",
      "ppg": 24.2,
      "rpg": 13.9,
      "apg": 5,
      "spg": 1.6,
      "bpg": 2.2,
      "archetype": "Two-Way Star",
      "traits": [
        "Rim Protector",
        "Rebounding Machine",
        "Defensive Stopper"
      ],
      "popularity": 88,
      "rating": 97,
      "ratingRaw": 27
    },
    {
      "id": "cassell_s_04",
      "name": "Sam Cassell",
      "pos": "PG",
      "ppg": 19.8,
      "rpg": 3.4,
      "apg": 7.2,
      "spg": 1.2,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Clutch Assassin",
        "Floor General",
        "Mid-Range Maestro"
      ],
      "popularity": 62,
      "rating": 74,
      "ratingRaw": 16
    },
    {
      "id": "sprewell_04",
      "name": "Latrell Sprewell",
      "pos": "SF",
      "ppg": 16.8,
      "rpg": 4.4,
      "apg": 3.2,
      "spg": 1.2,
      "bpg": 0.2,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Slasher",
        "Clutch"
      ],
      "popularity": 63,
      "rating": 69,
      "ratingRaw": 13.5
    },
    {
      "id": "szczerbiak_03",
      "name": "Wally Szczerbiak",
      "pos": "SG",
      "ppg": 15.4,
      "rpg": 4.4,
      "apg": 2.4,
      "spg": 0.6,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "3-and-D"
      ],
      "popularity": 35,
      "rating": 66,
      "ratingRaw": 12
    },
    {
      "id": "hassell_04",
      "name": "Trenton Hassell",
      "pos": "SF",
      "ppg": 9.2,
      "rpg": 4.8,
      "apg": 2.6,
      "spg": 1.8,
      "bpg": 0.4,
      "archetype": "Lockdown Defender",
      "traits": [
        "Defensive Stopper",
        "Glue Guy"
      ],
      "popularity": 35,
      "rating": 66,
      "ratingRaw": 12.1
    }
  ],
  "Timberwolves_2010s": [
    {
      "id": "love_k_12",
      "name": "Kevin Love",
      "pos": "PF",
      "ppg": 23.2,
      "rpg": 12.8,
      "apg": 2.8,
      "spg": 0.8,
      "bpg": 0.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Volume Shooter",
        "Floor Spacer"
      ],
      "popularity": 68,
      "rating": 85,
      "ratingRaw": 21.2
    },
    {
      "id": "rubio_r_13",
      "name": "Ricky Rubio",
      "pos": "PG",
      "ppg": 11,
      "rpg": 5.2,
      "apg": 8.8,
      "spg": 2,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Defensive Stopper",
        "Elite Playmaker"
      ],
      "popularity": 35,
      "rating": 75,
      "ratingRaw": 16.4
    },
    {
      "id": "towns_kat_17",
      "name": "Karl-Anthony Towns",
      "pos": "C",
      "ppg": 21.8,
      "rpg": 11.8,
      "apg": 2.8,
      "spg": 0.6,
      "bpg": 1.2,
      "archetype": "Paint Beast",
      "traits": [
        "Floor Spacer",
        "Rebounding Machine",
        "Post Scorer"
      ],
      "popularity": 42,
      "rating": 84,
      "ratingRaw": 20.9
    },
    {
      "id": "wiggins_a_17",
      "name": "Andrew Wiggins",
      "pos": "SG",
      "ppg": 19.4,
      "rpg": 4.2,
      "apg": 2.4,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Slasher"
      ],
      "popularity": 52,
      "rating": 69,
      "ratingRaw": 13.6
    },
    {
      "id": "lavine_z_16",
      "name": "Zach LaVine",
      "pos": "SG",
      "ppg": 18.9,
      "rpg": 3.4,
      "apg": 3,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Slasher",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 65,
      "rating": 68,
      "ratingRaw": 13.2
    }
  ],
  "Timberwolves_2020s": [
    {
      "id": "edwards_a_23",
      "name": "Anthony Edwards",
      "pos": "SG",
      "ppg": 25.8,
      "rpg": 5.4,
      "apg": 5,
      "spg": 1.4,
      "bpg": 0.5,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Slasher",
        "Clutch Assassin"
      ],
      "popularity": 54,
      "rating": 80,
      "ratingRaw": 18.7
    },
    {
      "id": "towns_kat_23",
      "name": "Karl-Anthony Towns",
      "pos": "C",
      "ppg": 22.8,
      "rpg": 10.8,
      "apg": 3.8,
      "spg": 0.8,
      "bpg": 0.8,
      "archetype": "Paint Beast",
      "traits": [
        "Floor Spacer",
        "Rebounding Machine",
        "Post Scorer"
      ],
      "popularity": 49,
      "rating": 84,
      "ratingRaw": 20.7
    },
    {
      "id": "gobert_r_23",
      "name": "Rudy Gobert",
      "pos": "C",
      "ppg": 14,
      "rpg": 13.2,
      "apg": 1.4,
      "spg": 0.8,
      "bpg": 2.1,
      "archetype": "Lockdown Defender",
      "traits": [
        "Rim Protector",
        "Rebounding Machine",
        "Defensive Stopper"
      ],
      "popularity": 68,
      "rating": 83,
      "ratingRaw": 20.3
    },
    {
      "id": "conley_m_23",
      "name": "Mike Conley",
      "pos": "PG",
      "ppg": 13.8,
      "rpg": 3.2,
      "apg": 6.2,
      "spg": 1.2,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Defensive Stopper",
        "Glue Guy"
      ],
      "popularity": 35,
      "rating": 69,
      "ratingRaw": 13.4
    },
    {
      "id": "mcdaniels_j_23",
      "name": "Jaden McDaniels",
      "pos": "SF",
      "ppg": 13.8,
      "rpg": 4.4,
      "apg": 1.8,
      "spg": 1,
      "bpg": 0.6,
      "archetype": "Lockdown Defender",
      "traits": [
        "3-and-D",
        "Defensive Stopper"
      ],
      "popularity": 35,
      "rating": 66,
      "ratingRaw": 12.2
    }
  ],
  "Pelicans_2000s": [
    {
      "id": "paul_c_08",
      "name": "Chris Paul",
      "pos": "PG",
      "ppg": 20.4,
      "rpg": 4.4,
      "apg": 10.8,
      "spg": 2.6,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "Floor General",
        "Defensive Stopper"
      ],
      "popularity": 78,
      "rating": 83,
      "ratingRaw": 20.5
    },
    {
      "id": "davis_b_03",
      "name": "Baron Davis",
      "pos": "PG",
      "ppg": 20.2,
      "rpg": 5.2,
      "apg": 7.8,
      "spg": 2.1,
      "bpg": 0.6,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Slasher",
        "Elite Playmaker"
      ],
      "popularity": 65,
      "rating": 81,
      "ratingRaw": 19.4
    },
    {
      "id": "stojakovic_p_07",
      "name": "Peja Stojakovic",
      "pos": "SF",
      "ppg": 18.8,
      "rpg": 4.6,
      "apg": 2.2,
      "spg": 0.8,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "3-and-D",
        "Volume Shooter"
      ],
      "popularity": 65,
      "rating": 68,
      "ratingRaw": 13.3
    },
    {
      "id": "mashburn_03",
      "name": "Jamal Mashburn",
      "pos": "SF",
      "ppg": 19.6,
      "rpg": 6.8,
      "apg": 3.8,
      "spg": 1,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Mid-Range Maestro",
        "Volume Shooter"
      ],
      "popularity": 55,
      "rating": 75,
      "ratingRaw": 16.5
    },
    {
      "id": "west_d_07",
      "name": "David West",
      "pos": "PF",
      "ppg": 16.4,
      "rpg": 7.6,
      "apg": 2.8,
      "spg": 0.8,
      "bpg": 0.6,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Mid-Range Maestro"
      ],
      "popularity": 43,
      "rating": 73,
      "ratingRaw": 15.6
    }
  ],
  "Pelicans_2010s": [
    {
      "id": "davis_ad_16",
      "name": "Anthony Davis",
      "pos": "C",
      "ppg": 24.4,
      "rpg": 10.8,
      "apg": 2.4,
      "spg": 1.4,
      "bpg": 2.8,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Rebounding Machine",
        "Volume Shooter"
      ],
      "popularity": 80,
      "rating": 91,
      "ratingRaw": 24.1
    },
    {
      "id": "cousins_dm_17",
      "name": "DeMarcus Cousins",
      "pos": "C",
      "ppg": 25.2,
      "rpg": 12.9,
      "apg": 5.4,
      "spg": 1.5,
      "bpg": 1.6,
      "archetype": "Paint Beast",
      "traits": [
        "Volume Shooter",
        "Post Scorer",
        "Rebounding Machine"
      ],
      "popularity": 63,
      "rating": 94,
      "ratingRaw": 25.8
    },
    {
      "id": "holiday_j_16",
      "name": "Jrue Holiday",
      "pos": "PG",
      "ppg": 19.2,
      "rpg": 5,
      "apg": 6.8,
      "spg": 1.6,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Floor General",
        "Elite Playmaker"
      ],
      "popularity": 63,
      "rating": 77,
      "ratingRaw": 17.5
    },
    {
      "id": "gordon_e_15",
      "name": "Eric Gordon",
      "pos": "SG",
      "ppg": 20.4,
      "rpg": 3.4,
      "apg": 3.2,
      "spg": 0.8,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Floor Spacer",
        "3-and-D"
      ],
      "popularity": 50,
      "rating": 69,
      "ratingRaw": 13.5
    },
    {
      "id": "anderson_r_14",
      "name": "Ryan Anderson",
      "pos": "PF",
      "ppg": 17.2,
      "rpg": 7.8,
      "apg": 1.8,
      "spg": 0.4,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "3-and-D"
      ],
      "popularity": 46,
      "rating": 71,
      "ratingRaw": 14.7
    }
  ],
  "Pelicans_2020s": [
    {
      "id": "williamson_z_22",
      "name": "Zion Williamson",
      "pos": "PF",
      "ppg": 26,
      "rpg": 7,
      "apg": 4.6,
      "spg": 0.8,
      "bpg": 0.6,
      "archetype": "Slasher",
      "traits": [
        "Slasher",
        "Volume Shooter",
        "Clutch Assassin"
      ],
      "popularity": 48,
      "rating": 80,
      "ratingRaw": 19.1
    },
    {
      "id": "ingram_b_22",
      "name": "Brandon Ingram",
      "pos": "SF",
      "ppg": 24.3,
      "rpg": 5.8,
      "apg": 5.2,
      "spg": 0.8,
      "bpg": 0.6,
      "archetype": "Slasher",
      "traits": [
        "Slasher",
        "Volume Shooter",
        "Mid-Range Maestro"
      ],
      "popularity": 53,
      "rating": 78,
      "ratingRaw": 18.1
    },
    {
      "id": "mccollum_cj_22",
      "name": "CJ McCollum",
      "pos": "SG",
      "ppg": 20.4,
      "rpg": 4.4,
      "apg": 4.8,
      "spg": 0.8,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Mid-Range Maestro",
        "Clutch Assassin",
        "Volume Shooter"
      ],
      "popularity": 39,
      "rating": 72,
      "ratingRaw": 15.1
    },
    {
      "id": "jones_h_23",
      "name": "Herb Jones",
      "pos": "SF",
      "ppg": 13.4,
      "rpg": 4.6,
      "apg": 2.8,
      "spg": 1.6,
      "bpg": 0.8,
      "archetype": "Lockdown Defender",
      "traits": [
        "Defensive Stopper",
        "3-and-D",
        "Lockdown Defender"
      ],
      "popularity": 35,
      "rating": 69,
      "ratingRaw": 13.7
    },
    {
      "id": "valanciunas_22",
      "name": "Jonas Valanciunas",
      "pos": "C",
      "ppg": 14.8,
      "rpg": 11.6,
      "apg": 2.4,
      "spg": 0.4,
      "bpg": 0.8,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Post Scorer"
      ],
      "popularity": 35,
      "rating": 77,
      "ratingRaw": 17.6
    }
  ],
  "Blazers_1980s": [
    {
      "id": "drexler_87",
      "name": "Clyde Drexler",
      "pos": "SG",
      "ppg": 23.8,
      "rpg": 6.2,
      "apg": 5.8,
      "spg": 2.4,
      "bpg": 0.8,
      "archetype": "Two-Way Star",
      "traits": [
        "Slasher",
        "Defensive Stopper",
        "Volume Shooter"
      ],
      "popularity": 78,
      "rating": 84,
      "ratingRaw": 20.7
    },
    {
      "id": "vandeweghe_84",
      "name": "Kiki Vandeweghe",
      "pos": "SF",
      "ppg": 24.8,
      "rpg": 5.8,
      "apg": 2.8,
      "spg": 0.6,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Mid-Range Maestro"
      ],
      "popularity": 52,
      "rating": 75,
      "ratingRaw": 16.4
    },
    {
      "id": "porter_t_87",
      "name": "Terry Porter",
      "pos": "PG",
      "ppg": 14.8,
      "rpg": 3.8,
      "apg": 7.8,
      "spg": 1.6,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Floor Spacer"
      ],
      "popularity": 51,
      "rating": 73,
      "ratingRaw": 15.5
    },
    {
      "id": "kersey_86",
      "name": "Jerome Kersey",
      "pos": "SF",
      "ppg": 14.2,
      "rpg": 7.8,
      "apg": 2.4,
      "spg": 1.4,
      "bpg": 0.8,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Hustle Player",
        "Slasher"
      ],
      "popularity": 35,
      "rating": 74,
      "ratingRaw": 15.8
    },
    {
      "id": "duckworth_88",
      "name": "Kevin Duckworth",
      "pos": "C",
      "ppg": 15.8,
      "rpg": 7.4,
      "apg": 1.4,
      "spg": 0.4,
      "bpg": 0.8,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Rebounding Machine"
      ],
      "popularity": 35,
      "rating": 70,
      "ratingRaw": 14.3
    }
  ],
  "Blazers_1990s": [
    {
      "id": "drexler_92",
      "name": "Clyde Drexler",
      "pos": "SG",
      "ppg": 22.8,
      "rpg": 6.8,
      "apg": 5.4,
      "spg": 2.2,
      "bpg": 0.6,
      "archetype": "Two-Way Star",
      "traits": [
        "Slasher",
        "Defensive Stopper",
        "Clutch Assassin"
      ],
      "popularity": 78,
      "rating": 83,
      "ratingRaw": 20.1
    },
    {
      "id": "sabonis_97",
      "name": "Arvydas Sabonis",
      "pos": "C",
      "ppg": 14.6,
      "rpg": 9.8,
      "apg": 3.6,
      "spg": 0.8,
      "bpg": 2.1,
      "archetype": "Paint Beast",
      "traits": [
        "Floor General",
        "Post Scorer",
        "Rim Protector"
      ],
      "popularity": 35,
      "rating": 81,
      "ratingRaw": 19.3
    },
    {
      "id": "wallace_r_98",
      "name": "Rasheed Wallace",
      "pos": "PF",
      "ppg": 17.4,
      "rpg": 7.8,
      "apg": 2.2,
      "spg": 0.8,
      "bpg": 1.8,
      "archetype": "Two-Way Star",
      "traits": [
        "Rim Protector",
        "Volume Shooter",
        "Defensive Stopper"
      ],
      "popularity": 67,
      "rating": 77,
      "ratingRaw": 17.5
    },
    {
      "id": "robinson_c_95",
      "name": "Cliff Robinson",
      "pos": "SF",
      "ppg": 18.2,
      "rpg": 5.8,
      "apg": 2.8,
      "spg": 1.2,
      "bpg": 1.2,
      "archetype": "Two-Way Star",
      "traits": [
        "Volume Shooter",
        "Defensive Stopper"
      ],
      "popularity": 38,
      "rating": 74,
      "ratingRaw": 16.2
    },
    {
      "id": "stoudamire_99",
      "name": "Damon Stoudamire",
      "pos": "PG",
      "ppg": 16.8,
      "rpg": 3.6,
      "apg": 7.8,
      "spg": 1.4,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Volume Shooter"
      ],
      "popularity": 37,
      "rating": 74,
      "ratingRaw": 15.8
    }
  ],
  "Blazers_2000s": [
    {
      "id": "roy_b_08",
      "name": "Brandon Roy",
      "pos": "SG",
      "ppg": 21.2,
      "rpg": 4.8,
      "apg": 5.2,
      "spg": 1,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Mid-Range Maestro",
        "Clutch Assassin",
        "Volume Shooter"
      ],
      "popularity": 45,
      "rating": 74,
      "ratingRaw": 16.2
    },
    {
      "id": "aldridge_la_09",
      "name": "LaMarcus Aldridge",
      "pos": "PF",
      "ppg": 18,
      "rpg": 8.4,
      "apg": 1.8,
      "spg": 0.6,
      "bpg": 1.2,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Mid-Range Maestro"
      ],
      "popularity": 63,
      "rating": 76,
      "ratingRaw": 16.8
    },
    {
      "id": "pippen_s_01",
      "name": "Scottie Pippen",
      "pos": "SF",
      "ppg": 14.6,
      "rpg": 7.2,
      "apg": 5.6,
      "spg": 2,
      "bpg": 0.8,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Floor General",
        "Elite Playmaker"
      ],
      "popularity": 92,
      "rating": 78,
      "ratingRaw": 18
    },
    {
      "id": "randolph_z_04",
      "name": "Zach Randolph",
      "pos": "PF",
      "ppg": 18.4,
      "rpg": 11.2,
      "apg": 2.4,
      "spg": 0.6,
      "bpg": 0.4,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Rebounding Machine"
      ],
      "popularity": 36,
      "rating": 78,
      "ratingRaw": 18
    },
    {
      "id": "stoudamire_d_02",
      "name": "Damon Stoudamire",
      "pos": "PG",
      "ppg": 14.8,
      "rpg": 3.4,
      "apg": 7.2,
      "spg": 1.2,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Volume Shooter"
      ],
      "popularity": 35,
      "rating": 71,
      "ratingRaw": 14.5
    }
  ],
  "Blazers_2010s": [
    {
      "id": "lillard_d_15",
      "name": "Damian Lillard",
      "pos": "PG",
      "ppg": 24.5,
      "rpg": 4.2,
      "apg": 6.8,
      "spg": 0.9,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch Assassin",
        "Volume Shooter",
        "Point God"
      ],
      "popularity": 89,
      "rating": 77,
      "ratingRaw": 17.6
    },
    {
      "id": "aldridge_la_14",
      "name": "LaMarcus Aldridge",
      "pos": "PF",
      "ppg": 22.4,
      "rpg": 10.8,
      "apg": 2.4,
      "spg": 0.6,
      "bpg": 1.8,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Mid-Range Maestro",
        "Rebounding Machine"
      ],
      "popularity": 63,
      "rating": 84,
      "ratingRaw": 21
    },
    {
      "id": "mccollum_cj_16",
      "name": "CJ McCollum",
      "pos": "SG",
      "ppg": 21.8,
      "rpg": 4.2,
      "apg": 3.4,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Mid-Range Maestro",
        "Volume Shooter"
      ],
      "popularity": 36,
      "rating": 72,
      "ratingRaw": 14.9
    },
    {
      "id": "nurkic_j_18",
      "name": "Jusuf Nurkic",
      "pos": "C",
      "ppg": 14.4,
      "rpg": 10.8,
      "apg": 3.2,
      "spg": 0.6,
      "bpg": 1.2,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Rebounding Machine"
      ],
      "popularity": 35,
      "rating": 78,
      "ratingRaw": 18.1
    },
    {
      "id": "batum_n_14",
      "name": "Nicolas Batum",
      "pos": "SF",
      "ppg": 12.8,
      "rpg": 6.2,
      "apg": 4.8,
      "spg": 1.4,
      "bpg": 0.8,
      "archetype": "Two-Way Star",
      "traits": [
        "3-and-D",
        "Floor General",
        "Defensive Stopper"
      ],
      "popularity": 35,
      "rating": 73,
      "ratingRaw": 15.6
    }
  ],
  "Blazers_2020s": [
    {
      "id": "lillard_d_22",
      "name": "Damian Lillard",
      "pos": "PG",
      "ppg": 28.2,
      "rpg": 4.4,
      "apg": 7.4,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch Assassin",
        "Volume Shooter",
        "Point God"
      ],
      "popularity": 89,
      "rating": 81,
      "ratingRaw": 19.2
    },
    {
      "id": "simons_a_23",
      "name": "Anfernee Simons",
      "pos": "SG",
      "ppg": 21.8,
      "rpg": 3.8,
      "apg": 4.6,
      "spg": 0.8,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter",
        "3-and-D"
      ],
      "popularity": 40,
      "rating": 72,
      "ratingRaw": 15
    },
    {
      "id": "grant_j_23",
      "name": "Jerami Grant",
      "pos": "PF",
      "ppg": 20.8,
      "rpg": 4.8,
      "apg": 2.4,
      "spg": 1,
      "bpg": 1,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Volume Shooter",
        "Slasher"
      ],
      "popularity": 35,
      "rating": 73,
      "ratingRaw": 15.6
    },
    {
      "id": "nurkic_j_22",
      "name": "Jusuf Nurkic",
      "pos": "C",
      "ppg": 15.2,
      "rpg": 11.8,
      "apg": 3.4,
      "spg": 0.6,
      "bpg": 1.1,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Rebounding Machine"
      ],
      "popularity": 36,
      "rating": 80,
      "ratingRaw": 19.1
    },
    {
      "id": "henderson_s_24",
      "name": "Scoot Henderson",
      "pos": "PG",
      "ppg": 14.6,
      "rpg": 4.2,
      "apg": 6.2,
      "spg": 1,
      "bpg": 0.4,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Slasher",
        "Elite Playmaker"
      ],
      "popularity": 35,
      "rating": 71,
      "ratingRaw": 14.5
    }
  ],
  "Kings_1960s": [
    {
      "id": "robertson_o_63",
      "name": "Oscar Robertson",
      "pos": "PG",
      "ppg": 30.8,
      "rpg": 10.4,
      "apg": 11.4,
      "spg": 1.2,
      "bpg": 0.3,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "Floor General",
        "Volume Shooter"
      ],
      "popularity": 90,
      "rating": 97,
      "ratingRaw": 26.9
    },
    {
      "id": "lucas_j_66",
      "name": "Jerry Lucas",
      "pos": "PF",
      "ppg": 19.8,
      "rpg": 20,
      "apg": 3.8,
      "spg": 0.8,
      "bpg": 0.8,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Post Scorer"
      ],
      "popularity": 60,
      "rating": 95,
      "ratingRaw": 26.3
    },
    {
      "id": "twyman_62",
      "name": "Jack Twyman",
      "pos": "SG",
      "ppg": 22.8,
      "rpg": 7.2,
      "apg": 2.4,
      "spg": 0.6,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Mid-Range Maestro"
      ],
      "popularity": 39,
      "rating": 74,
      "ratingRaw": 16.2
    },
    {
      "id": "embry_63",
      "name": "Wayne Embry",
      "pos": "C",
      "ppg": 15.8,
      "rpg": 12.4,
      "apg": 1.8,
      "spg": 0.6,
      "bpg": 0.8,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Rebounding Machine"
      ],
      "popularity": 44,
      "rating": 79,
      "ratingRaw": 18.3
    },
    {
      "id": "smith_a_66",
      "name": "Adrian Smith",
      "pos": "SG",
      "ppg": 18.8,
      "rpg": 3.8,
      "apg": 4.2,
      "spg": 0.8,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 36,
      "rating": 69,
      "ratingRaw": 13.8
    }
  ],
  "Kings_1970s": [
    {
      "id": "archibald_73",
      "name": "Nate Archibald",
      "pos": "PG",
      "ppg": 28.2,
      "rpg": 4.6,
      "apg": 11.4,
      "spg": 1.8,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "Floor General",
        "Volume Shooter"
      ],
      "popularity": 52,
      "rating": 88,
      "ratingRaw": 22.5
    },
    {
      "id": "birdsong_78",
      "name": "Otis Birdsong",
      "pos": "SG",
      "ppg": 22.4,
      "rpg": 4.2,
      "apg": 3.8,
      "spg": 1.2,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Mid-Range Maestro"
      ],
      "popularity": 38,
      "rating": 73,
      "ratingRaw": 15.5
    },
    {
      "id": "lacey_75",
      "name": "Sam Lacey",
      "pos": "C",
      "ppg": 12.8,
      "rpg": 11.8,
      "apg": 4.2,
      "spg": 1,
      "bpg": 1.8,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Rim Protector"
      ],
      "popularity": 35,
      "rating": 83,
      "ratingRaw": 20.3
    },
    {
      "id": "wedman_77",
      "name": "Scott Wedman",
      "pos": "SF",
      "ppg": 18.2,
      "rpg": 7.2,
      "apg": 2.8,
      "spg": 1,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 41,
      "rating": 74,
      "ratingRaw": 15.8
    },
    {
      "id": "ford_p_79",
      "name": "Phil Ford",
      "pos": "PG",
      "ppg": 13.8,
      "rpg": 3.2,
      "apg": 8.8,
      "spg": 1.6,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Elite Playmaker"
      ],
      "popularity": 35,
      "rating": 73,
      "ratingRaw": 15.4
    }
  ],
  "Kings_1980s": [
    {
      "id": "theus_84",
      "name": "Reggie Theus",
      "pos": "PG",
      "ppg": 20.4,
      "rpg": 4.8,
      "apg": 7.8,
      "spg": 1.2,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Volume Shooter",
        "Floor General",
        "Mid-Range Maestro"
      ],
      "popularity": 46,
      "rating": 77,
      "ratingRaw": 17.5
    },
    {
      "id": "johnson_e_87",
      "name": "Eddie Johnson",
      "pos": "SG",
      "ppg": 18.2,
      "rpg": 4.2,
      "apg": 3.2,
      "spg": 0.8,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Mid-Range Maestro",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 35,
      "rating": 69,
      "ratingRaw": 13.4
    },
    {
      "id": "birdsong_82",
      "name": "Otis Birdsong",
      "pos": "SG",
      "ppg": 19.8,
      "rpg": 3.8,
      "apg": 3.6,
      "spg": 1,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Mid-Range Maestro"
      ],
      "popularity": 37,
      "rating": 70,
      "ratingRaw": 14
    },
    {
      "id": "thompson_la_86",
      "name": "LaSalle Thompson",
      "pos": "C",
      "ppg": 12.8,
      "rpg": 10.4,
      "apg": 2.2,
      "spg": 0.8,
      "bpg": 2.2,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Rebounding Machine"
      ],
      "popularity": 35,
      "rating": 79,
      "ratingRaw": 18.5
    },
    {
      "id": "mccray_r_87",
      "name": "Rodney McCray",
      "pos": "SF",
      "ppg": 10.8,
      "rpg": 6.8,
      "apg": 4.8,
      "spg": 1.2,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Glue Guy"
      ],
      "popularity": 35,
      "rating": 71,
      "ratingRaw": 14.6
    }
  ],
  "Kings_1990s": [
    {
      "id": "richmond_m_95",
      "name": "Mitch Richmond",
      "pos": "SG",
      "ppg": 23.4,
      "rpg": 4,
      "apg": 4.2,
      "spg": 1.5,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Mid-Range Maestro",
        "Clutch Assassin",
        "Volume Shooter"
      ],
      "popularity": 47,
      "rating": 74,
      "ratingRaw": 16.2
    },
    {
      "id": "divac_v_98",
      "name": "Vlade Divac",
      "pos": "C",
      "ppg": 13,
      "rpg": 9.2,
      "apg": 3.8,
      "spg": 0.8,
      "bpg": 1.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Floor General",
        "Post Scorer"
      ],
      "popularity": 62,
      "rating": 77,
      "ratingRaw": 17.4
    },
    {
      "id": "williams_j_99",
      "name": "Jason Williams",
      "pos": "PG",
      "ppg": 12.4,
      "rpg": 3.2,
      "apg": 7.8,
      "spg": 1.6,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Elite Playmaker"
      ],
      "popularity": 35,
      "rating": 71,
      "ratingRaw": 14.4
    },
    {
      "id": "grant_b_98",
      "name": "Brian Grant",
      "pos": "PF",
      "ppg": 12.8,
      "rpg": 8.4,
      "apg": 1.8,
      "spg": 0.6,
      "bpg": 1,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Hustle Player"
      ],
      "popularity": 44,
      "rating": 72,
      "ratingRaw": 14.9
    },
    {
      "id": "webb_s_96",
      "name": "Spud Webb",
      "pos": "PG",
      "ppg": 13.4,
      "rpg": 2.8,
      "apg": 6.4,
      "spg": 1.2,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Glue Guy"
      ],
      "popularity": 35,
      "rating": 68,
      "ratingRaw": 13
    }
  ],
  "Kings_2010s": [
    {
      "id": "cousins_dm_15",
      "name": "DeMarcus Cousins",
      "pos": "C",
      "ppg": 22.8,
      "rpg": 11.4,
      "apg": 3.2,
      "spg": 1.4,
      "bpg": 1.6,
      "archetype": "Paint Beast",
      "traits": [
        "Volume Shooter",
        "Post Scorer",
        "Rebounding Machine"
      ],
      "popularity": 63,
      "rating": 88,
      "ratingRaw": 22.7
    },
    {
      "id": "thomas_i_13",
      "name": "Isaiah Thomas",
      "pos": "PG",
      "ppg": 20.2,
      "rpg": 3.2,
      "apg": 6.8,
      "spg": 1.1,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch Assassin",
        "Volume Shooter",
        "Floor General"
      ],
      "popularity": 36,
      "rating": 73,
      "ratingRaw": 15.5
    },
    {
      "id": "gay_r_14",
      "name": "Rudy Gay",
      "pos": "SF",
      "ppg": 19.8,
      "rpg": 6.4,
      "apg": 2.8,
      "spg": 1.4,
      "bpg": 0.8,
      "archetype": "Slasher",
      "traits": [
        "Volume Shooter",
        "Slasher",
        "Mid-Range Maestro"
      ],
      "popularity": 35,
      "rating": 76,
      "ratingRaw": 16.8
    },
    {
      "id": "cauley_stein_16",
      "name": "Willie Cauley-Stein",
      "pos": "C",
      "ppg": 12.4,
      "rpg": 7.8,
      "apg": 1.8,
      "spg": 0.8,
      "bpg": 1.2,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Rebounding Machine"
      ],
      "popularity": 35,
      "rating": 71,
      "ratingRaw": 14.8
    },
    {
      "id": "mclemore_14",
      "name": "Ben McLemore",
      "pos": "SG",
      "ppg": 10.8,
      "rpg": 3.2,
      "apg": 1.4,
      "spg": 0.6,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "3-and-D"
      ],
      "popularity": 35,
      "rating": 60,
      "ratingRaw": 9.1
    }
  ],
  "Kings_2020s": [
    {
      "id": "fox_da_23",
      "name": "De'Aaron Fox",
      "pos": "PG",
      "ppg": 25.2,
      "rpg": 4.6,
      "apg": 6.1,
      "spg": 1.5,
      "bpg": 0.5,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Slasher",
        "Volume Shooter"
      ],
      "popularity": 48,
      "rating": 80,
      "ratingRaw": 18.7
    },
    {
      "id": "sabonis_d_23",
      "name": "Domantas Sabonis",
      "pos": "C",
      "ppg": 18.8,
      "rpg": 12.4,
      "apg": 6.2,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Paint Beast",
      "traits": [
        "Floor General",
        "Rebounding Machine",
        "Post Scorer"
      ],
      "popularity": 39,
      "rating": 85,
      "ratingRaw": 21.4
    },
    {
      "id": "monk_m_23",
      "name": "Malik Monk",
      "pos": "SG",
      "ppg": 18.4,
      "rpg": 3.8,
      "apg": 4.2,
      "spg": 1,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 35,
      "rating": 70,
      "ratingRaw": 14.1
    },
    {
      "id": "barnes_h_23",
      "name": "Harrison Barnes",
      "pos": "SF",
      "ppg": 14.8,
      "rpg": 5.8,
      "apg": 2.2,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Floor Spacer",
        "3-and-D",
        "Mid-Range Maestro"
      ],
      "popularity": 35,
      "rating": 68,
      "ratingRaw": 13.2
    },
    {
      "id": "murray_kg_23",
      "name": "Keegan Murray",
      "pos": "SF",
      "ppg": 14.8,
      "rpg": 4.8,
      "apg": 1.8,
      "spg": 0.6,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "3-and-D"
      ],
      "popularity": 35,
      "rating": 66,
      "ratingRaw": 12
    }
  ],
  "Raptors_1990s": [
    {
      "id": "raptors_90s_1",
      "name": "Damon Stoudamire",
      "pos": "PG",
      "ppg": 19,
      "rpg": 3.8,
      "apg": 8.8,
      "spg": 1.6,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "Floor General",
        "Elite Playmaker"
      ],
      "popularity": 45,
      "rating": 76,
      "ratingRaw": 17.2
    },
    {
      "id": "raptors_90s_2",
      "name": "Tracy McGrady",
      "pos": "SG",
      "ppg": 15.4,
      "rpg": 6.3,
      "apg": 3,
      "spg": 1.6,
      "bpg": 1.3,
      "archetype": "Slasher",
      "traits": [
        "Slasher",
        "Clutch"
      ],
      "popularity": 84,
      "rating": 75,
      "ratingRaw": 16.4
    },
    {
      "id": "raptors_90s_3",
      "name": "Marcus Camby",
      "pos": "C",
      "ppg": 8.1,
      "rpg": 8.6,
      "apg": 1.1,
      "spg": 1,
      "bpg": 3,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Rebounding Machine"
      ],
      "popularity": 58,
      "rating": 75,
      "ratingRaw": 16.6
    },
    {
      "id": "raptors_90s_4",
      "name": "Doug Christie",
      "pos": "SG",
      "ppg": 12.5,
      "rpg": 4.6,
      "apg": 3.5,
      "spg": 2.2,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "3-and-D"
      ],
      "popularity": 52,
      "rating": 70,
      "ratingRaw": 14.1
    },
    {
      "id": "raptors_90s_5",
      "name": "Walt Williams",
      "pos": "SF",
      "ppg": 12.3,
      "rpg": 3.8,
      "apg": 2.3,
      "spg": 1.1,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 35,
      "rating": 64,
      "ratingRaw": 11.4
    },
    {
      "id": "raptors_90s_6",
      "name": "Alvin Williams",
      "pos": "PG",
      "ppg": 9.1,
      "rpg": 2.6,
      "apg": 5.5,
      "spg": 1.4,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Glue Guy"
      ],
      "popularity": 35,
      "rating": 64,
      "ratingRaw": 11.4
    },
    {
      "id": "raptors_90s_7",
      "name": "Oliver Miller",
      "pos": "C",
      "ppg": 7.2,
      "rpg": 7.4,
      "apg": 3.1,
      "spg": 0.9,
      "bpg": 1.8,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Hustle Player"
      ],
      "popularity": 35,
      "rating": 71,
      "ratingRaw": 14.7
    }
  ],
  "Raptors_2000s": [
    {
      "id": "raptors_00s_1",
      "name": "Vince Carter",
      "pos": "SG",
      "ppg": 23.4,
      "rpg": 5,
      "apg": 3.8,
      "spg": 1.3,
      "bpg": 0.9,
      "archetype": "Slasher",
      "traits": [
        "Clutch Assassin",
        "Slasher",
        "Volume Shooter"
      ],
      "popularity": 39,
      "rating": 77,
      "ratingRaw": 17.5
    },
    {
      "id": "raptors_00s_2",
      "name": "Chris Bosh",
      "pos": "PF",
      "ppg": 21,
      "rpg": 9.8,
      "apg": 2,
      "spg": 0.9,
      "bpg": 1.1,
      "archetype": "Two-Way Star",
      "traits": [
        "Post Scorer",
        "Rebounding Machine"
      ],
      "popularity": 72,
      "rating": 80,
      "ratingRaw": 19
    },
    {
      "id": "raptors_00s_3",
      "name": "Tracy McGrady",
      "pos": "SF",
      "ppg": 25.6,
      "rpg": 7.5,
      "apg": 4.4,
      "spg": 1.8,
      "bpg": 1.3,
      "archetype": "Two-Way Star",
      "traits": [
        "Clutch Assassin",
        "Slasher",
        "Floor Spacer"
      ],
      "popularity": 84,
      "rating": 85,
      "ratingRaw": 21.4
    },
    {
      "id": "raptors_00s_4",
      "name": "Jose Calderon",
      "pos": "PG",
      "ppg": 9.5,
      "rpg": 2.8,
      "apg": 8.1,
      "spg": 0.9,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Floor Spacer"
      ],
      "popularity": 35,
      "rating": 66,
      "ratingRaw": 12.4
    },
    {
      "id": "raptors_00s_5",
      "name": "Morris Peterson",
      "pos": "SG",
      "ppg": 11.4,
      "rpg": 3.4,
      "apg": 1.4,
      "spg": 0.9,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "3-and-D",
        "Floor Spacer"
      ],
      "popularity": 35,
      "rating": 61,
      "ratingRaw": 9.9
    },
    {
      "id": "raptors_00s_6",
      "name": "Jalen Rose",
      "pos": "SF",
      "ppg": 14.9,
      "rpg": 3.7,
      "apg": 3.4,
      "spg": 0.9,
      "bpg": 0.3,
      "archetype": "Slasher",
      "traits": [
        "Slasher",
        "Mid-Range Maestro"
      ],
      "popularity": 35,
      "rating": 66,
      "ratingRaw": 12.4
    },
    {
      "id": "raptors_00s_7",
      "name": "Antonio Davis",
      "pos": "C",
      "ppg": 10.1,
      "rpg": 9.2,
      "apg": 1.2,
      "spg": 0.5,
      "bpg": 1.1,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Hustle Player"
      ],
      "popularity": 35,
      "rating": 70,
      "ratingRaw": 14.3
    }
  ],
  "Raptors_2020s": [
    {
      "id": "raptors_20s_1",
      "name": "Pascal Siakam",
      "pos": "PF",
      "ppg": 24.2,
      "rpg": 7.8,
      "apg": 5.3,
      "spg": 1.1,
      "bpg": 0.7,
      "archetype": "Two-Way Star",
      "traits": [
        "Slasher",
        "Floor Spacer",
        "Clutch"
      ],
      "popularity": 63,
      "rating": 82,
      "ratingRaw": 20
    },
    {
      "id": "raptors_20s_2",
      "name": "OG Anunoby",
      "pos": "SF",
      "ppg": 17,
      "rpg": 5.3,
      "apg": 1.9,
      "spg": 1.8,
      "bpg": 0.7,
      "archetype": "Two-Way Star",
      "traits": [
        "Lockdown Defender",
        "3-and-D",
        "Defensive Stopper"
      ],
      "popularity": 35,
      "rating": 72,
      "ratingRaw": 14.9
    },
    {
      "id": "raptors_20s_3",
      "name": "Scottie Barnes",
      "pos": "SF",
      "ppg": 15.3,
      "rpg": 7.5,
      "apg": 4.8,
      "spg": 1.2,
      "bpg": 0.9,
      "archetype": "Two-Way Star",
      "traits": [
        "Glue Guy",
        "Hustle Player",
        "Floor General"
      ],
      "popularity": 38,
      "rating": 76,
      "ratingRaw": 17.2
    },
    {
      "id": "raptors_20s_4",
      "name": "Fred VanVleet",
      "pos": "PG",
      "ppg": 19.3,
      "rpg": 3.8,
      "apg": 6.7,
      "spg": 1.8,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "3-and-D",
        "Clutch"
      ],
      "popularity": 55,
      "rating": 75,
      "ratingRaw": 16.5
    },
    {
      "id": "raptors_20s_5",
      "name": "Jakob Poeltl",
      "pos": "C",
      "ppg": 12.5,
      "rpg": 9.1,
      "apg": 3.1,
      "spg": 0.9,
      "bpg": 2,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Rebounding Machine"
      ],
      "popularity": 35,
      "rating": 78,
      "ratingRaw": 17.8
    },
    {
      "id": "raptors_20s_6",
      "name": "Gary Trent Jr.",
      "pos": "SG",
      "ppg": 18.1,
      "rpg": 2.6,
      "apg": 2,
      "spg": 1.2,
      "bpg": 0.2,
      "archetype": "Sharpshooter",
      "traits": [
        "3-and-D",
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 35,
      "rating": 66,
      "ratingRaw": 12
    },
    {
      "id": "raptors_20s_7",
      "name": "RJ Barrett",
      "pos": "SG",
      "ppg": 21.1,
      "rpg": 5.5,
      "apg": 3.8,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Slasher",
        "Mid-Range Maestro",
        "Clutch"
      ],
      "popularity": 53,
      "rating": 74,
      "ratingRaw": 15.8
    }
  ],
  "Grizzlies_1990s": [
    {
      "id": "grizzlies_90s_1",
      "name": "Shareef Abdur-Rahim",
      "pos": "PF",
      "ppg": 20.8,
      "rpg": 8.7,
      "apg": 2.3,
      "spg": 1,
      "bpg": 0.8,
      "archetype": "Two-Way Star",
      "traits": [
        "Post Scorer",
        "Rebounding Machine"
      ],
      "popularity": 43,
      "rating": 78,
      "ratingRaw": 18
    },
    {
      "id": "grizzlies_90s_2",
      "name": "Mike Bibby",
      "pos": "PG",
      "ppg": 13.7,
      "rpg": 2.7,
      "apg": 5.8,
      "spg": 1.1,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Clutch"
      ],
      "popularity": 58,
      "rating": 67,
      "ratingRaw": 12.6
    },
    {
      "id": "grizzlies_90s_3",
      "name": "Bryant Reeves",
      "pos": "C",
      "ppg": 12.7,
      "rpg": 6.7,
      "apg": 1.7,
      "spg": 0.7,
      "bpg": 1.2,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Rebounding Machine"
      ],
      "popularity": 35,
      "rating": 70,
      "ratingRaw": 14
    },
    {
      "id": "grizzlies_90s_4",
      "name": "Blue Edwards",
      "pos": "SG",
      "ppg": 11.2,
      "rpg": 3.2,
      "apg": 2.1,
      "spg": 1.2,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Slasher",
        "Glue Guy"
      ],
      "popularity": 35,
      "rating": 63,
      "ratingRaw": 10.6
    },
    {
      "id": "grizzlies_90s_5",
      "name": "Lawrence Moten",
      "pos": "SG",
      "ppg": 8.6,
      "rpg": 2.1,
      "apg": 2.5,
      "spg": 0.9,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Volume Shooter"
      ],
      "popularity": 35,
      "rating": 58,
      "ratingRaw": 8.5
    },
    {
      "id": "grizzlies_90s_6",
      "name": "Othella Harrington",
      "pos": "C",
      "ppg": 7.4,
      "rpg": 5.8,
      "apg": 0.9,
      "spg": 0.4,
      "bpg": 1,
      "archetype": "Paint Beast",
      "traits": [
        "Hustle Player",
        "Rebounding Machine"
      ],
      "popularity": 35,
      "rating": 63,
      "ratingRaw": 10.6
    }
  ],
  "Grizzlies_2000s": [
    {
      "id": "grizzlies_00s_1",
      "name": "Pau Gasol",
      "pos": "C",
      "ppg": 19.2,
      "rpg": 8.9,
      "apg": 3.1,
      "spg": 0.8,
      "bpg": 1.9,
      "archetype": "Two-Way Star",
      "traits": [
        "Post Scorer",
        "Rim Protector",
        "Floor General"
      ],
      "popularity": 74,
      "rating": 81,
      "ratingRaw": 19.5
    },
    {
      "id": "grizzlies_00s_2",
      "name": "Shane Battier",
      "pos": "SF",
      "ppg": 10.2,
      "rpg": 4.3,
      "apg": 2.5,
      "spg": 1.5,
      "bpg": 0.9,
      "archetype": "Lockdown Defender",
      "traits": [
        "3-and-D",
        "Defensive Stopper",
        "Lockdown Defender"
      ],
      "popularity": 35,
      "rating": 66,
      "ratingRaw": 12.4
    },
    {
      "id": "grizzlies_00s_3",
      "name": "Mike Miller",
      "pos": "SF",
      "ppg": 13.3,
      "rpg": 4.5,
      "apg": 2.6,
      "spg": 0.8,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "3-and-D"
      ],
      "popularity": 41,
      "rating": 65,
      "ratingRaw": 11.9
    },
    {
      "id": "grizzlies_00s_4",
      "name": "Jason Williams",
      "pos": "PG",
      "ppg": 11,
      "rpg": 2.8,
      "apg": 6.2,
      "spg": 1.4,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor General"
      ],
      "popularity": 35,
      "rating": 66,
      "ratingRaw": 12.4
    },
    {
      "id": "grizzlies_00s_5",
      "name": "Lorenzen Wright",
      "pos": "C",
      "ppg": 9,
      "rpg": 7.5,
      "apg": 1,
      "spg": 0.6,
      "bpg": 1.1,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Hustle Player"
      ],
      "popularity": 35,
      "rating": 67,
      "ratingRaw": 12.7
    },
    {
      "id": "grizzlies_00s_6",
      "name": "James Posey",
      "pos": "SF",
      "ppg": 8.5,
      "rpg": 4.1,
      "apg": 1.7,
      "spg": 1.3,
      "bpg": 0.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "Defensive Stopper",
        "3-and-D"
      ],
      "popularity": 41,
      "rating": 63,
      "ratingRaw": 10.5
    },
    {
      "id": "grizzlies_00s_7",
      "name": "Stromile Swift",
      "pos": "PF",
      "ppg": 12.1,
      "rpg": 5.9,
      "apg": 0.8,
      "spg": 0.8,
      "bpg": 2.4,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Slasher"
      ],
      "popularity": 35,
      "rating": 71,
      "ratingRaw": 14.6
    }
  ],
  "Grizzlies_2010s": [
    {
      "id": "grizzlies_10s_1",
      "name": "Marc Gasol",
      "pos": "C",
      "ppg": 16.5,
      "rpg": 7.8,
      "apg": 3.7,
      "spg": 1.4,
      "bpg": 1.6,
      "archetype": "Two-Way Star",
      "traits": [
        "Rim Protector",
        "Floor General",
        "Post Scorer"
      ],
      "popularity": 68,
      "rating": 79,
      "ratingRaw": 18.4
    },
    {
      "id": "grizzlies_10s_2",
      "name": "Zach Randolph",
      "pos": "PF",
      "ppg": 17.9,
      "rpg": 11.2,
      "apg": 2,
      "spg": 0.8,
      "bpg": 0.4,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Rebounding Machine",
        "Clutch"
      ],
      "popularity": 35,
      "rating": 78,
      "ratingRaw": 17.9
    },
    {
      "id": "grizzlies_10s_3",
      "name": "Mike Conley",
      "pos": "PG",
      "ppg": 14.5,
      "rpg": 2.9,
      "apg": 5.9,
      "spg": 1.6,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "Defensive Stopper",
        "Clutch"
      ],
      "popularity": 35,
      "rating": 69,
      "ratingRaw": 13.7
    },
    {
      "id": "grizzlies_10s_4",
      "name": "Tony Allen",
      "pos": "SG",
      "ppg": 9.5,
      "rpg": 3.5,
      "apg": 1.8,
      "spg": 1.9,
      "bpg": 0.3,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Defensive Stopper",
        "Hustle Player"
      ],
      "popularity": 35,
      "rating": 63,
      "ratingRaw": 10.8
    },
    {
      "id": "grizzlies_10s_5",
      "name": "Rudy Gay",
      "pos": "SF",
      "ppg": 17.6,
      "rpg": 6,
      "apg": 2.6,
      "spg": 1.2,
      "bpg": 0.9,
      "archetype": "Slasher",
      "traits": [
        "Slasher",
        "Mid-Range Maestro"
      ],
      "popularity": 35,
      "rating": 73,
      "ratingRaw": 15.6
    },
    {
      "id": "grizzlies_10s_6",
      "name": "Courtney Lee",
      "pos": "SG",
      "ppg": 9.9,
      "rpg": 2.8,
      "apg": 1.6,
      "spg": 1,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "3-and-D",
        "Floor Spacer"
      ],
      "popularity": 35,
      "rating": 60,
      "ratingRaw": 9.3
    },
    {
      "id": "grizzlies_10s_7",
      "name": "Vince Carter",
      "pos": "SG",
      "ppg": 10.2,
      "rpg": 3.5,
      "apg": 1.6,
      "spg": 0.7,
      "bpg": 0.5,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Clutch"
      ],
      "popularity": 35,
      "rating": 61,
      "ratingRaw": 9.8
    }
  ],
  "Grizzlies_2020s": [
    {
      "id": "grizzlies_20s_1",
      "name": "Ja Morant",
      "pos": "PG",
      "ppg": 25.1,
      "rpg": 5.8,
      "apg": 7.9,
      "spg": 1.1,
      "bpg": 0.4,
      "archetype": "Slasher",
      "traits": [
        "Point God",
        "Clutch Assassin",
        "Elite Playmaker"
      ],
      "popularity": 50,
      "rating": 82,
      "ratingRaw": 19.9
    },
    {
      "id": "grizzlies_20s_2",
      "name": "Jaren Jackson Jr.",
      "pos": "C",
      "ppg": 20.2,
      "rpg": 6,
      "apg": 2.1,
      "spg": 1.2,
      "bpg": 3,
      "archetype": "Two-Way Star",
      "traits": [
        "Rim Protector",
        "Floor Spacer",
        "Defensive Stopper"
      ],
      "popularity": 42,
      "rating": 81,
      "ratingRaw": 19.2
    },
    {
      "id": "grizzlies_20s_3",
      "name": "Desmond Bane",
      "pos": "SG",
      "ppg": 21.5,
      "rpg": 4.4,
      "apg": 4.1,
      "spg": 1,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "3-and-D",
        "Clutch"
      ],
      "popularity": 43,
      "rating": 73,
      "ratingRaw": 15.6
    },
    {
      "id": "grizzlies_20s_4",
      "name": "Dillon Brooks",
      "pos": "SF",
      "ppg": 14.8,
      "rpg": 3.5,
      "apg": 1.9,
      "spg": 1.1,
      "bpg": 0.3,
      "archetype": "Lockdown Defender",
      "traits": [
        "Lockdown Defender",
        "Defensive Stopper",
        "Slasher"
      ],
      "popularity": 35,
      "rating": 65,
      "ratingRaw": 11.6
    },
    {
      "id": "grizzlies_20s_5",
      "name": "Brandon Clarke",
      "pos": "PF",
      "ppg": 10.8,
      "rpg": 5.6,
      "apg": 1.5,
      "spg": 0.7,
      "bpg": 1.4,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Hustle Player"
      ],
      "popularity": 35,
      "rating": 67,
      "ratingRaw": 12.8
    },
    {
      "id": "grizzlies_20s_6",
      "name": "Tyus Jones",
      "pos": "PG",
      "ppg": 9.2,
      "rpg": 2.2,
      "apg": 6.4,
      "spg": 1.1,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Glue Guy"
      ],
      "popularity": 35,
      "rating": 64,
      "ratingRaw": 11.2
    },
    {
      "id": "grizzlies_20s_7",
      "name": "Xavier Tillman",
      "pos": "C",
      "ppg": 7.1,
      "rpg": 6.3,
      "apg": 1.5,
      "spg": 0.7,
      "bpg": 1,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Defensive Stopper"
      ],
      "popularity": 35,
      "rating": 65,
      "ratingRaw": 11.6
    }
  ],
  "Wizards_1960s": [
    {
      "id": "wizards_60s_1",
      "name": "Earl Monroe",
      "pos": "SG",
      "ppg": 23.7,
      "rpg": 4,
      "apg": 4.4,
      "spg": 0.9,
      "bpg": 0.2,
      "archetype": "Slasher",
      "traits": [
        "Mid-Range Maestro",
        "Clutch Assassin"
      ],
      "popularity": 65,
      "rating": 73,
      "ratingRaw": 15.7
    },
    {
      "id": "wizards_60s_2",
      "name": "Wes Unseld",
      "pos": "C",
      "ppg": 10.8,
      "rpg": 13.8,
      "apg": 2.5,
      "spg": 0.7,
      "bpg": 0.9,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Rim Protector",
        "Glue Guy"
      ],
      "popularity": 35,
      "rating": 79,
      "ratingRaw": 18.4
    },
    {
      "id": "wizards_60s_3",
      "name": "Gus Johnson",
      "pos": "PF",
      "ppg": 16.7,
      "rpg": 12.7,
      "apg": 2,
      "spg": 0.8,
      "bpg": 0.8,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Hustle Player"
      ],
      "popularity": 35,
      "rating": 81,
      "ratingRaw": 19.2
    },
    {
      "id": "wizards_60s_4",
      "name": "Kevin Loughery",
      "pos": "SG",
      "ppg": 18,
      "rpg": 3.1,
      "apg": 3.8,
      "spg": 0.8,
      "bpg": 0.1,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Mid-Range Maestro"
      ],
      "popularity": 35,
      "rating": 67,
      "ratingRaw": 12.7
    },
    {
      "id": "wizards_60s_5",
      "name": "Bob Ferry",
      "pos": "PF",
      "ppg": 10.9,
      "rpg": 7.2,
      "apg": 1.8,
      "spg": 0.6,
      "bpg": 0.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Glue Guy"
      ],
      "popularity": 35,
      "rating": 67,
      "ratingRaw": 12.7
    }
  ],
  "Wizards_1970s": [
    {
      "id": "wizards_70s_1",
      "name": "Elvin Hayes",
      "pos": "PF",
      "ppg": 21,
      "rpg": 12.5,
      "apg": 1.8,
      "spg": 1.1,
      "bpg": 2.4,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Post Scorer",
        "Rim Protector"
      ],
      "popularity": 75,
      "rating": 88,
      "ratingRaw": 22.9
    },
    {
      "id": "wizards_70s_2",
      "name": "Wes Unseld",
      "pos": "C",
      "ppg": 9.5,
      "rpg": 12,
      "apg": 3.5,
      "spg": 0.8,
      "bpg": 1,
      "archetype": "Two-Way Star",
      "traits": [
        "Rebounding Machine",
        "Rim Protector",
        "Floor General"
      ],
      "popularity": 35,
      "rating": 77,
      "ratingRaw": 17.6
    },
    {
      "id": "wizards_70s_3",
      "name": "Phil Chenier",
      "pos": "SG",
      "ppg": 18.2,
      "rpg": 3.1,
      "apg": 3.5,
      "spg": 1.5,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Clutch"
      ],
      "popularity": 38,
      "rating": 69,
      "ratingRaw": 13.7
    },
    {
      "id": "wizards_70s_4",
      "name": "Kevin Porter",
      "pos": "PG",
      "ppg": 12.7,
      "rpg": 2.9,
      "apg": 8,
      "spg": 1.6,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Floor General"
      ],
      "popularity": 43,
      "rating": 70,
      "ratingRaw": 14.2
    },
    {
      "id": "wizards_70s_5",
      "name": "Bob Dandridge",
      "pos": "SF",
      "ppg": 19.3,
      "rpg": 5.8,
      "apg": 3.1,
      "spg": 1.6,
      "bpg": 0.8,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Mid-Range Maestro"
      ],
      "popularity": 58,
      "rating": 75,
      "ratingRaw": 16.6
    },
    {
      "id": "wizards_70s_6",
      "name": "Tom Henderson",
      "pos": "PG",
      "ppg": 9.4,
      "rpg": 2.5,
      "apg": 5.2,
      "spg": 1.2,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Glue Guy"
      ],
      "popularity": 35,
      "rating": 63,
      "ratingRaw": 10.9
    }
  ],
  "Wizards_1980s": [
    {
      "id": "wizards_80s_1",
      "name": "Jeff Ruland",
      "pos": "C",
      "ppg": 18.3,
      "rpg": 12.3,
      "apg": 3.6,
      "spg": 0.8,
      "bpg": 1.8,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Rebounding Machine"
      ],
      "popularity": 39,
      "rating": 86,
      "ratingRaw": 21.8
    },
    {
      "id": "wizards_80s_2",
      "name": "Gus Williams",
      "pos": "PG",
      "ppg": 19.3,
      "rpg": 2.7,
      "apg": 5.2,
      "spg": 1.9,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "Slasher"
      ],
      "popularity": 55,
      "rating": 72,
      "ratingRaw": 15
    },
    {
      "id": "wizards_80s_3",
      "name": "Frank Johnson",
      "pos": "PG",
      "ppg": 10.4,
      "rpg": 2.5,
      "apg": 6.4,
      "spg": 1.6,
      "bpg": 0.1,
      "archetype": "Playmaker",
      "traits": [
        "Floor General",
        "Elite Playmaker"
      ],
      "popularity": 38,
      "rating": 66,
      "ratingRaw": 12.3
    },
    {
      "id": "wizards_80s_4",
      "name": "Rick Mahorn",
      "pos": "PF",
      "ppg": 9.4,
      "rpg": 8.1,
      "apg": 1.6,
      "spg": 0.9,
      "bpg": 1.5,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Defensive Stopper"
      ],
      "popularity": 46,
      "rating": 71,
      "ratingRaw": 14.6
    },
    {
      "id": "wizards_80s_5",
      "name": "Greg Ballard",
      "pos": "SF",
      "ppg": 14.6,
      "rpg": 7.8,
      "apg": 2.1,
      "spg": 0.9,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "Rebounding Machine",
        "3-and-D"
      ],
      "popularity": 35,
      "rating": 71,
      "ratingRaw": 14.6
    },
    {
      "id": "wizards_80s_6",
      "name": "Darrell Walker",
      "pos": "SG",
      "ppg": 10.7,
      "rpg": 4.3,
      "apg": 5.1,
      "spg": 1.8,
      "bpg": 0.3,
      "archetype": "Lockdown Defender",
      "traits": [
        "Defensive Stopper",
        "Hustle Player"
      ],
      "popularity": 35,
      "rating": 69,
      "ratingRaw": 13.5
    }
  ],
  "Wizards_1990s": [
    {
      "id": "wizards_90s_1",
      "name": "Chris Webber",
      "pos": "PF",
      "ppg": 23,
      "rpg": 9.6,
      "apg": 3.8,
      "spg": 1.7,
      "bpg": 2.1,
      "archetype": "Two-Way Star",
      "traits": [
        "Post Scorer",
        "Rebounding Machine",
        "Floor General"
      ],
      "popularity": 76,
      "rating": 88,
      "ratingRaw": 22.9
    },
    {
      "id": "wizards_90s_2",
      "name": "Juwan Howard",
      "pos": "PF",
      "ppg": 19.8,
      "rpg": 7.2,
      "apg": 2.3,
      "spg": 0.8,
      "bpg": 0.7,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Mid-Range Maestro"
      ],
      "popularity": 42,
      "rating": 74,
      "ratingRaw": 16.2
    },
    {
      "id": "wizards_90s_3",
      "name": "Rod Strickland",
      "pos": "PG",
      "ppg": 16.1,
      "rpg": 4.3,
      "apg": 9.6,
      "spg": 1.4,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Elite Playmaker",
        "Point God"
      ],
      "popularity": 40,
      "rating": 76,
      "ratingRaw": 17.1
    },
    {
      "id": "wizards_90s_4",
      "name": "Mitch Richmond",
      "pos": "SG",
      "ppg": 16.3,
      "rpg": 3.2,
      "apg": 3.1,
      "spg": 1.2,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Clutch Assassin",
        "Volume Shooter"
      ],
      "popularity": 35,
      "rating": 67,
      "ratingRaw": 12.6
    },
    {
      "id": "wizards_90s_5",
      "name": "Ben Wallace",
      "pos": "C",
      "ppg": 4.9,
      "rpg": 8.2,
      "apg": 0.7,
      "spg": 1.2,
      "bpg": 1.8,
      "archetype": "Lockdown Defender",
      "traits": [
        "Rim Protector",
        "Rebounding Machine",
        "Defensive Stopper"
      ],
      "popularity": 68,
      "rating": 69,
      "ratingRaw": 13.5
    },
    {
      "id": "wizards_90s_6",
      "name": "Harvey Grant",
      "pos": "SF",
      "ppg": 12,
      "rpg": 5.7,
      "apg": 1.8,
      "spg": 1,
      "bpg": 0.6,
      "archetype": "Two-Way Star",
      "traits": [
        "Defensive Stopper",
        "Glue Guy"
      ],
      "popularity": 35,
      "rating": 67,
      "ratingRaw": 12.6
    }
  ],
  "Wizards_2000s": [
    {
      "id": "wizards_00s_1",
      "name": "Gilbert Arenas",
      "pos": "PG",
      "ppg": 28.4,
      "rpg": 4.8,
      "apg": 6,
      "spg": 1.7,
      "bpg": 0.5,
      "archetype": "Playmaker",
      "traits": [
        "Clutch Assassin",
        "Point God",
        "Volume Shooter"
      ],
      "popularity": 50,
      "rating": 82,
      "ratingRaw": 20
    },
    {
      "id": "wizards_00s_2",
      "name": "Caron Butler",
      "pos": "SF",
      "ppg": 19.1,
      "rpg": 5.7,
      "apg": 2.8,
      "spg": 1.5,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Slasher",
        "Mid-Range Maestro"
      ],
      "popularity": 35,
      "rating": 73,
      "ratingRaw": 15.7
    },
    {
      "id": "wizards_00s_3",
      "name": "Antawn Jamison",
      "pos": "PF",
      "ppg": 21.3,
      "rpg": 8.5,
      "apg": 2.2,
      "spg": 1,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Rebounding Machine"
      ],
      "popularity": 52,
      "rating": 77,
      "ratingRaw": 17.3
    },
    {
      "id": "wizards_00s_4",
      "name": "Larry Hughes",
      "pos": "SG",
      "ppg": 15.1,
      "rpg": 4.9,
      "apg": 3.9,
      "spg": 2.9,
      "bpg": 0.8,
      "archetype": "Lockdown Defender",
      "traits": [
        "Defensive Stopper",
        "Slasher"
      ],
      "popularity": 42,
      "rating": 75,
      "ratingRaw": 16.6
    },
    {
      "id": "wizards_00s_5",
      "name": "Brendan Haywood",
      "pos": "C",
      "ppg": 7.7,
      "rpg": 7.3,
      "apg": 0.9,
      "spg": 0.5,
      "bpg": 1.7,
      "archetype": "Paint Beast",
      "traits": [
        "Rim Protector",
        "Rebounding Machine"
      ],
      "popularity": 35,
      "rating": 68,
      "ratingRaw": 12.9
    },
    {
      "id": "wizards_00s_6",
      "name": "DeShawn Stevenson",
      "pos": "SG",
      "ppg": 9.2,
      "rpg": 3.4,
      "apg": 1.9,
      "spg": 1.5,
      "bpg": 0.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "3-and-D",
        "Defensive Stopper"
      ],
      "popularity": 35,
      "rating": 63,
      "ratingRaw": 10.5
    }
  ],
  "Wizards_2010s": [
    {
      "id": "wizards_10s_1",
      "name": "John Wall",
      "pos": "PG",
      "ppg": 19.9,
      "rpg": 4.2,
      "apg": 10.1,
      "spg": 1.9,
      "bpg": 0.6,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "Elite Playmaker",
        "Slasher"
      ],
      "popularity": 45,
      "rating": 81,
      "ratingRaw": 19.6
    },
    {
      "id": "wizards_10s_2",
      "name": "Bradley Beal",
      "pos": "SG",
      "ppg": 25.6,
      "rpg": 4.7,
      "apg": 5.5,
      "spg": 1.4,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Clutch Assassin",
        "Floor Spacer"
      ],
      "popularity": 62,
      "rating": 79,
      "ratingRaw": 18.3
    },
    {
      "id": "wizards_10s_3",
      "name": "Otto Porter Jr.",
      "pos": "SF",
      "ppg": 13.3,
      "rpg": 6.3,
      "apg": 1.6,
      "spg": 1.4,
      "bpg": 0.4,
      "archetype": "Two-Way Star",
      "traits": [
        "3-and-D",
        "Floor Spacer",
        "Defensive Stopper"
      ],
      "popularity": 35,
      "rating": 69,
      "ratingRaw": 13.4
    },
    {
      "id": "wizards_10s_4",
      "name": "Marcin Gortat",
      "pos": "C",
      "ppg": 11.1,
      "rpg": 9.9,
      "apg": 1.6,
      "spg": 0.7,
      "bpg": 1,
      "archetype": "Paint Beast",
      "traits": [
        "Rebounding Machine",
        "Rim Protector"
      ],
      "popularity": 35,
      "rating": 73,
      "ratingRaw": 15.4
    },
    {
      "id": "wizards_10s_5",
      "name": "Nenê",
      "pos": "C",
      "ppg": 14.5,
      "rpg": 6.9,
      "apg": 2.8,
      "spg": 0.7,
      "bpg": 1.5,
      "archetype": "Paint Beast",
      "traits": [
        "Post Scorer",
        "Rim Protector"
      ],
      "popularity": 35,
      "rating": 73,
      "ratingRaw": 15.7
    },
    {
      "id": "wizards_10s_6",
      "name": "Trevor Ariza",
      "pos": "SF",
      "ppg": 12.9,
      "rpg": 5.8,
      "apg": 2,
      "spg": 2.1,
      "bpg": 0.5,
      "archetype": "Lockdown Defender",
      "traits": [
        "3-and-D",
        "Lockdown Defender"
      ],
      "popularity": 35,
      "rating": 70,
      "ratingRaw": 14.1
    }
  ],
  "Wizards_2020s": [
    {
      "id": "wizards_20s_1",
      "name": "Bradley Beal",
      "pos": "SG",
      "ppg": 31.3,
      "rpg": 4.7,
      "apg": 4.4,
      "spg": 1.2,
      "bpg": 0.4,
      "archetype": "Sharpshooter",
      "traits": [
        "Volume Shooter",
        "Clutch Assassin",
        "Mid-Range Maestro"
      ],
      "popularity": 62,
      "rating": 81,
      "ratingRaw": 19.2
    },
    {
      "id": "wizards_20s_2",
      "name": "Kyle Kuzma",
      "pos": "PF",
      "ppg": 21.2,
      "rpg": 8.7,
      "apg": 3.5,
      "spg": 0.8,
      "bpg": 0.5,
      "archetype": "Two-Way Star",
      "traits": [
        "Slasher",
        "Rebounding Machine",
        "Mid-Range Maestro"
      ],
      "popularity": 37,
      "rating": 78,
      "ratingRaw": 18.1
    },
    {
      "id": "wizards_20s_3",
      "name": "Kristaps Porzingis",
      "pos": "C",
      "ppg": 22.2,
      "rpg": 8.4,
      "apg": 2,
      "spg": 0.8,
      "bpg": 2.7,
      "archetype": "Two-Way Star",
      "traits": [
        "Floor Spacer",
        "Rim Protector"
      ],
      "popularity": 65,
      "rating": 84,
      "ratingRaw": 20.6
    },
    {
      "id": "wizards_20s_4",
      "name": "Jordan Poole",
      "pos": "SG",
      "ppg": 17,
      "rpg": 2.7,
      "apg": 4.5,
      "spg": 0.9,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "Clutch",
        "Volume Shooter"
      ],
      "popularity": 60,
      "rating": 68,
      "ratingRaw": 12.9
    },
    {
      "id": "wizards_20s_5",
      "name": "Tyus Jones",
      "pos": "PG",
      "ppg": 15.7,
      "rpg": 3.4,
      "apg": 8.4,
      "spg": 1.4,
      "bpg": 0.2,
      "archetype": "Playmaker",
      "traits": [
        "Point God",
        "Floor General",
        "Clutch"
      ],
      "popularity": 38,
      "rating": 73,
      "ratingRaw": 15.6
    },
    {
      "id": "wizards_20s_6",
      "name": "Corey Kispert",
      "pos": "SF",
      "ppg": 10.7,
      "rpg": 2.9,
      "apg": 1.3,
      "spg": 0.4,
      "bpg": 0.3,
      "archetype": "Sharpshooter",
      "traits": [
        "Floor Spacer",
        "3-and-D"
      ],
      "popularity": 35,
      "rating": 59,
      "ratingRaw": 8.8
    }
  ]
};
