# Can You Go 82-0? — Free 82-0 NBA Team Generator & All-Time Roster Builder

**▶ Play now: [canyougo820.com](https://canyougo820.com/)**

**Can You Go 82-0?** is a free **82-0 NBA team generator** and **all-time roster builder**
that runs entirely in your browser. Spin the draft wheel — a random **NBA team generator**
that deals you a franchise and an era on every spin — draft legends from every decade,
build team chemistry, pick your coach, then run the **82-game season simulator** with one
question on the line: **can you go 82-0?**

No sign-up, no download, no build step.

## How to play

1. **Spin the wheel** — the generator lands on a team + era combo (say, '90s Bulls or 2010s Warriors) and shows you that squad's players.
2. **Draft your starting five** — pick one player per round across all five positions (PG, SG, SF, PF, C). Skips are limited, so spend them wisely.
3. **Build chemistry** — balance eras, positions, and playstyles; the roster's chemistry affects your results.
4. **Pick your coach** — each coach brings a different system and strategic bonus.
5. **Simulate 82 games** — run the season simulator and chase a perfect **82-0** record.
6. **Make a run** — advance to the playoffs, win the title, and collect legends in your trophy room.

## Features

- 🎲 **82-0 NBA team generator** — a randomized draft wheel; no two runs deal the same board
- 🏀 **All-time roster builder** — hundreds of legends from every decade
- 📊 **Season simulator** — full 82-game simulation with playoffs
- 🧪 **Team chemistry engine** — era, position, and playstyle fit all matter
- 📅 **Daily Challenge** — one shared draft board and special rule per day, with streaks and a global leaderboard
- 🏆 **Trophy room & leaderboard** — track your best runs (local, plus an optional global leaderboard)
- 🌗 **Light / dark themes**, fully responsive on desktop, tablet, and mobile
- ⚡ **100% client-side** — vanilla JS ES modules, no backend

## FAQ

**What is Can You Go 82-0?**
A free NBA team generator, roster builder, and season simulator. You draft an all-time team
of legends from every era using a randomized draft wheel, then simulate an 82-game season.
The goal — and the name — is finishing a perfect 82-0.

**How does the 82-0 NBA team generator work?**
Every spin randomly generates a franchise and a decade (like '80s Celtics or 2000s Spurs),
and you draft one player from that combination. Repeat until all five starting spots are filled.

**Is it free?**
Yes — completely free, no download, no sign-up. It runs in your browser on any device.

## Run it locally

Serve the repo root over HTTP (ES modules don't load reliably over `file://`):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Any static file server works.

## Tech

Vanilla JavaScript (ES modules), HTML, and CSS — no backend and no build step to play.
Tailwind is compiled ahead of time into the committed `css/tailwind.css`; re-run
`scripts/build_tailwind.sh` after changing Tailwind classes. Firebase powers an optional
global leaderboard/analytics and degrades gracefully if unavailable.

Generated assets have regeneration scripts: `scripts/build_favicon.sh` (favicon.ico from
`favicon.svg`) and `scripts/build_og_image.sh` (og-image.png from `og-image.svg`).

## Keywords

82-0 · can you go 82-0 · canyougo820 · 82-0 team generator · 82-0 NBA team generator ·
NBA team generator · NBA simulator · NBA season simulator · NBA all-time roster builder ·
all-time NBA team · basketball simulator · fantasy NBA draft game

---

*Disclaimer: This is an unofficial fan-made game and is **not affiliated with, endorsed by,
or sponsored by the NBA** or the National Basketball Association. All team and player names
are the property of their respective owners and are used for identification purposes only.*
