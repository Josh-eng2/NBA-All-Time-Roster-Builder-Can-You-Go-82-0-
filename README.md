# Can You Go 82-0? — NBA All-Time Roster Builder & Season Simulator

**▶ Play now: [canyougo820.com](https://canyougo820.com/)**

**Can You Go 82-0?** is a free browser game and **NBA season simulator**. Draft an
**all-time NBA roster** from legends across every era, build team chemistry, pick your
coach, and simulate a full 82-game season with one question on the line: **can you go 82-0?**

No sign-up, no download, no build step — it runs entirely in your browser.

## How to play

1. **Draft your roster** — spin the decade wheel and pick seven all-time greats across positions (PG, SG, SF, PF, C).
2. **Build chemistry** — balance eras, positions, and playstyles; the roster's chemistry affects your results.
3. **Pick your coach** — each coach brings a different system and strategic bonus.
4. **Simulate 82 games** — run the season simulator and chase a perfect **82-0** record.
5. **Make a run** — advance to the playoffs, win the title, and collect legends in your trophy room.

## Features

- 🏀 **All-time NBA roster builder** — hundreds of legends from every decade
- 📊 **Season simulator** — full 82-game simulation with playoffs
- 🧪 **Team chemistry engine** — era, position, and playstyle fit all matter
- 🏆 **Trophy room & leaderboard** — track your best runs (local, plus an optional global leaderboard)
- 🌗 **Light / dark themes**
- ⚡ **100% client-side** — vanilla JS ES modules, no backend, no build

## Run it locally

Serve the repo root over HTTP (ES modules don't load reliably over `file://`):

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

Any static file server works.

## Tech

Vanilla JavaScript (ES modules), HTML, and CSS. Tailwind is loaded via CDN for styling;
Firebase powers an optional global leaderboard/analytics and degrades gracefully if unavailable.

## Keywords

Can you go 82-0 · NBA simulator · NBA season simulator · NBA all-time roster builder ·
all-time NBA team · basketball simulator · fantasy NBA draft game

---

*Disclaimer: This is an unofficial fan-made game and is **not affiliated with, endorsed by,
or sponsored by the NBA** or the National Basketball Association. All team and player names
are the property of their respective owners and are used for identification purposes only.*
