/**
 * scripts/build_team_pages.mjs — franchise and era roster pages
 *
 * Generates one page per franchise (teams/<slug>.html) and one per decade
 * (eras/<decade>.html) straight from the player DB, so the pages can never
 * drift from what the game actually deals.
 *
 * Why not one page per Team_Decade bucket: there are 178 of them, but the
 * biggest holds 9 players and the median holds 5. Every one of those pages
 * would be a near-duplicate shell around a handful of names — thin content at
 * scale, which is a penalty rather than a strategy. Rolling up to the franchise
 * (15–50 players each) and the decade (58–176) gives 37 pages that each carry a
 * real roster, a computed all-time five, and per-era breakdowns nothing else on
 * the site duplicates. It also matches how people actually search: "Lakers
 * all-time starting five", "best 90s NBA team".
 *
 * Every page is genuinely distinct — the five, the leaders, the era table and
 * the depth callouts are all derived per page from that page's own players.
 *
 * Run:  node scripts/build_team_pages.mjs
 * Or import buildTeamPages() — build_challenge_pages.mjs does, so that one
 * script stays the single writer of sitemap.xml.
 */

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, ORIGIN, esc, slugify, writeIfChanged, loadPlayerDb,
} from './lib/seo-utils.mjs';

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
const POS_NAME = { PG: 'Point Guard', SG: 'Shooting Guard', SF: 'Small Forward', PF: 'Power Forward', C: 'Center' };

/** Franchises with fewer players than this get no page rather than a thin one. */
const MIN_FRANCHISE_PLAYERS = 12;

const DECADE_CONTEXT = {
  '1960s': 'The league was smaller and the pace enormous, so the raw rebounding and scoring numbers here dwarf anything modern — read them in the context of their era, which is exactly what the game\'s era-adjusted ratings do.',
  '1970s': 'A decade of transition: the ABA merger widened the talent pool, and the game\'s bigs still dominated the interior while guards took on more creation.',
  '1980s': 'The rivalry decade. Pace and star power both peaked, and the era\'s best teams were built around a dominant creator plus an interior anchor.',
  '1990s': 'The deepest era in the database, and the most physical. Wings and centers are abundant; genuine point guards are the scarce resource when you draft from it.',
  '2000s': 'Defense-first basketball with hand-checking on the way out. The decade skews big and defensive, which makes outside shooting the thing worth paying for.',
  '2010s': 'Spacing takes over. The pool is shooting-rich and rim-protection-poor, so a real center is the pick that gets scarce late.',
  '2020s': 'Positionless offense and huge individual scoring seasons. Plenty of star power, but the era is still filling out compared with the 1990s and 2000s.',
};

const num = n => (n == null ? '—' : (Math.round(n * 10) / 10).toFixed(1));
const teamOf = key => key.split('_')[0];
const decadeOf = key => key.split('_')[1];

/** Distinct players (by id) matching a bucket-key predicate, richest first. */
function collect(DB, keep) {
  const seen = new Map();
  for (const [key, list] of Object.entries(DB)) {
    if (!keep(key)) continue;
    for (const p of list) {
      if (seen.has(p.id)) continue;
      seen.set(p.id, { ...p, team: teamOf(key), decade: decadeOf(key) });
    }
  }
  return [...seen.values()].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0));
}

/**
 * Best available player at each position by era-adjusted overall. This is the
 * single most-searched thing about any franchise ("Lakers all-time starting
 * five"), and it is computed rather than written, so it stays correct through
 * any data regeneration.
 */
function bestFive(players) {
  return POSITIONS.map(pos => {
    const best = players.filter(p => p.pos === pos)[0] || null;
    return { pos, player: best };
  });
}

/** Leader in a counting stat, for the "what this pool gives you" facts. */
function leader(players, key) {
  return players.reduce((a, b) => ((b[key] ?? 0) > (a?.[key] ?? -1) ? b : a), null);
}

function statTable(players, { showTeam = false, showDecade = true } = {}) {
  const rows = players.map(p => `        <tr>
          <td>${esc(p.name)}</td>
          <td>${esc(p.pos)}</td>${showTeam ? `\n          <td>${esc(p.team)}</td>` : ''}${showDecade ? `\n          <td>${esc(p.decade)}</td>` : ''}
          <td class="tp-num">${p.overall ?? '—'}</td>
          <td class="tp-num">${num(p.ppg)}</td>
          <td class="tp-num">${num(p.rpg)}</td>
          <td class="tp-num">${num(p.apg)}</td>
          <td>${esc(p.archetype || '—')}</td>
        </tr>`).join('\n');
  return `      <div class="tp-scroll">
      <table class="tp-table">
        <thead><tr>
          <th>Player</th><th>Pos</th>${showTeam ? '<th>Team</th>' : ''}${showDecade ? '<th>Era</th>' : ''}
          <th class="tp-num">OVR</th><th class="tp-num">PPG</th><th class="tp-num">RPG</th><th class="tp-num">APG</th><th>Archetype</th>
        </tr></thead>
        <tbody>
${rows}
        </tbody>
      </table>
      </div>`;
}

function fiveList(five) {
  return `      <ol class="tp-five">
${five.map(({ pos, player }) => player
    ? `        <li><b>${esc(POS_NAME[pos])}</b> — ${esc(player.name)} <span class="tp-five__meta">(${esc(player.decade)}${player.teamLabel ? ` · ${esc(player.teamLabel)}` : ''}) · ${player.overall ?? '—'} OVR · ${num(player.ppg)} pts, ${num(player.rpg)} reb, ${num(player.apg)} ast</span></li>`
    : `        <li><b>${esc(POS_NAME[pos])}</b> — <span class="tp-five__meta">no eligible player in this pool</span></li>`).join('\n')}
      </ol>`;
}

/** Shared <head>. `depth` is how many directories deep the page sits. */
function head({ title, desc, url, jsonLd, depth = 1 }) {
  const up = '../'.repeat(depth);
  if (desc.length > 158) throw new Error(`meta description too long (${desc.length}): ${desc}`);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="canonical" href="${url}" />
  <link rel="icon" href="${up}favicon.ico" sizes="48x48" />
  <link rel="icon" href="${up}favicon.svg" type="image/svg+xml" />
  <!-- max-image-preview:none — same Google-search-thumbnail-suppression
       policy as index.html (see the comment there for the Discover
       tradeoff). og:image / twitter:image below are untouched — social
       share cards only. -->
  <meta name="robots" content="max-image-preview:none" />

  <meta property="og:type"        content="article" />
  <meta property="og:site_name"   content="Can You Go 82-0?" />
  <meta property="og:url"         content="${url}" />
  <meta property="og:title"       content="${esc(title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:image"       content="${ORIGIN}/og-image.png" />
  <meta name="twitter:card"       content="summary_large_image" />
  <meta name="twitter:title"      content="${esc(title)}" />
  <meta name="twitter:description" content="${esc(desc)}" />
  <meta name="twitter:image"      content="${ORIGIN}/og-image.png" />

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;600;700;900&display=swap" rel="stylesheet" />
  <script>
    try { if (localStorage.getItem('nba820_theme') === 'dark') document.documentElement.setAttribute('data-theme', 'dark'); } catch(e){}
  </script>
  <link rel="stylesheet" href="${up}css/styles.css" />

  <script type="application/ld+json">
${JSON.stringify(jsonLd, null, 2).split('\n').map(l => '  ' + l).join('\n')}
  </script>
</head>
<body>
`;
}

function jsonLdFor(title, url, desc) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    url,
    description: desc,
    inLanguage: 'en',
    isPartOf: { '@type': 'WebSite', name: 'Can You Go 82-0?', url: ORIGIN + '/' },
    about: {
      '@type': 'VideoGame',
      name: 'Can You Go 82-0?',
      url: ORIGIN + '/',
      applicationCategory: 'GameApplication',
      gamePlatform: 'Web Browser',
    },
  };
}

// ── Franchise page ───────────────────────────────────────────────────────────

function renderTeamPage(team, players, decades, allTeams) {
  const slug = slugify(team);
  const url = `${ORIGIN}/teams/${slug}.html`;
  const title = `${team} All-Time Roster — Every Era, Rated`;
  const desc = `All ${players.length} ${team} legends in the 82-0 draft pool, rated and split by decade, plus the franchise's all-time starting five.`;
  const five = bestFive(players);
  const byDecade = decades
    .map(d => ({ decade: d, list: players.filter(p => p.decade === d) }))
    .filter(g => g.list.length);
  const deepest = byDecade.slice().sort((a, b) => b.list.length - a.list.length)[0];
  const topPpg = leader(players, 'ppg');
  const topRpg = leader(players, 'rpg');
  const topApg = leader(players, 'apg');
  const best = players[0];
  const others = allTeams.filter(t => t !== team).slice(0, 12);

  return head({ title, desc, url, jsonLd: jsonLdFor(title, url, desc) }) + `
  <section class="seo-content cp-page tp-page">
    <div class="seo-inner">
      <p class="cp-crumb"><a href="../teams.html">← All franchises &amp; eras</a></p>

      <h1>${esc(team)} all-time roster</h1>
      <p><strong>${players.length} ${esc(team)} legends across ${byDecade.length} decades are in the draft pool.</strong>
         Spin into ${esc(team)} in any of those eras and this is the board you are picking from.</p>
      <p><a class="seo-cta" href="../">▶ Draft a ${esc(team)} legend now</a></p>

      <h2>The all-time ${esc(team)} starting five</h2>
      <p>Best available at each position by era-adjusted overall rating — the same number the game drafts on.</p>
${fiveList(five)}

      <h2>What this franchise gives you</h2>
      <dl class="cp-facts">
        <div><dt>Best rated</dt><dd>${esc(best.name)} (${esc(best.decade)}) — ${best.overall} overall</dd></div>
        <div><dt>Deepest era</dt><dd>${esc(deepest.decade)}, with ${deepest.list.length} draftable players</dd></div>
        <div><dt>Top scorer</dt><dd>${esc(topPpg.name)} — ${num(topPpg.ppg)} points per game</dd></div>
        <div><dt>Top rebounder</dt><dd>${esc(topRpg.name)} — ${num(topRpg.rpg)} rebounds per game</dd></div>
        <div><dt>Top playmaker</dt><dd>${esc(topApg.name)} — ${num(topApg.apg)} assists per game</dd></div>
      </dl>

      <h2>Every ${esc(team)} player, by era</h2>
${byDecade.map(g => `      <h3>${esc(g.decade)} ${esc(team)} — ${g.list.length} player${g.list.length === 1 ? '' : 's'}</h3>
${statTable(g.list, { showDecade: false })}
      <p class="tp-era-link"><a href="../eras/${g.decade}.html">See the full ${esc(g.decade)} all-time pool →</a></p>`).join('\n\n')}

      <h2>How the ratings work</h2>
      <p>OVR is a real NBA 2K peak rating, normalised across eras so a 1960s
         center and a 2020s guard can sit on the same board without the older
         player being punished for the league he played in. PPG, RPG and APG are
         peak-season averages. Both feed the season simulator directly, so the
         numbers on this page are the numbers your roster plays with.</p>

      <h2>Other franchises</h2>
      <p class="tp-links">${others.map(t => `<a href="${slugify(t)}.html">${esc(t)}</a>`).join(' · ')}</p>

      <p class="seo-links">
        <a href="../">← Back to the game</a> &middot;
        <a href="../teams.html">All franchises &amp; eras</a> &middot;
        <a href="../daily.html">Daily challenges</a> &middot;
        <a href="../privacy.html">Privacy</a>
      </p>
    </div>
  </section>

</body>
</html>
`;
}

// ── Era page ─────────────────────────────────────────────────────────────────

function renderEraPage(decade, players, teamsInDecade, allDecades) {
  const url = `${ORIGIN}/eras/${decade}.html`;
  const label = `${decade}`;
  const title = `The ${label} All-Time NBA Team — Every Player, Rated`;
  const desc = `All ${players.length} ${label} legends in the 82-0 draft pool across ${teamsInDecade.length} franchises, rated, with the decade's all-time starting five.`;
  const five = bestFive(players);
  const top = players.slice(0, 20);
  const byTeam = teamsInDecade
    .map(t => ({ team: t, list: players.filter(p => p.team === t) }))
    .filter(g => g.list.length)
    .sort((a, b) => b.list.length - a.list.length);
  const topPpg = leader(players, 'ppg');
  const topRpg = leader(players, 'rpg');
  const topApg = leader(players, 'apg');
  const topBpg = leader(players, 'bpg');

  return head({ title, desc, url, jsonLd: jsonLdFor(title, url, desc) }) + `
  <section class="seo-content cp-page tp-page">
    <div class="seo-inner">
      <p class="cp-crumb"><a href="../teams.html">← All franchises &amp; eras</a></p>

      <h1>The ${esc(label)} all-time team</h1>
      <p><strong>${players.length} players from the ${esc(label)} across ${teamsInDecade.length} franchises are in the draft pool.</strong>
         ${esc(DECADE_CONTEXT[decade] || '')}</p>
      <p><a class="seo-cta" href="../?ref=era#/era?d=${decade}">▶ Draft a ${esc(label)}-only team</a></p>

      <h2>The all-time ${esc(label)} starting five</h2>
      <p>Best available at each position by era-adjusted overall rating.</p>
${fiveList(five.map(f => ({ ...f, player: f.player && { ...f.player, teamLabel: f.player.team } })))}

      <h2>${esc(label)} leaders</h2>
      <dl class="cp-facts">
        <div><dt>Top scorer</dt><dd>${esc(topPpg.name)} (${esc(topPpg.team)}) — ${num(topPpg.ppg)} points per game</dd></div>
        <div><dt>Top rebounder</dt><dd>${esc(topRpg.name)} (${esc(topRpg.team)}) — ${num(topRpg.rpg)} rebounds per game</dd></div>
        <div><dt>Top playmaker</dt><dd>${esc(topApg.name)} (${esc(topApg.team)}) — ${num(topApg.apg)} assists per game</dd></div>
        <div><dt>Top rim protector</dt><dd>${esc(topBpg.name)} (${esc(topBpg.team)}) — ${num(topBpg.bpg)} blocks per game</dd></div>
        <div><dt>Deepest franchise</dt><dd>${esc(byTeam[0].team)}, with ${byTeam[0].list.length} draftable ${esc(label)} players</dd></div>
      </dl>

      <h2>Top 20 ${esc(label)} players by rating</h2>
${statTable(top, { showTeam: true, showDecade: false })}

      <h2>Every franchise in the ${esc(label)}</h2>
${byTeam.map(g => `      <h3>${esc(g.team)} — ${g.list.length} player${g.list.length === 1 ? '' : 's'}</h3>
${statTable(g.list, { showDecade: false })}
      <p class="tp-era-link"><a href="../teams/${slugify(g.team)}.html">All-time ${esc(g.team)} roster →</a></p>`).join('\n\n')}

      <h2>Other eras</h2>
      <p class="tp-links">${allDecades.filter(d => d !== decade).map(d => `<a href="${d}.html">${esc(d)}</a>`).join(' · ')}</p>

      <p class="seo-links">
        <a href="../">← Back to the game</a> &middot;
        <a href="../teams.html">All franchises &amp; eras</a> &middot;
        <a href="../daily.html">Daily challenges</a> &middot;
        <a href="../privacy.html">Privacy</a>
      </p>
    </div>
  </section>

</body>
</html>
`;
}

// ── Hub page ─────────────────────────────────────────────────────────────────

/**
 * teams.html — the index every franchise and era page links back to, and the
 * one page index.html links forward to. Without it the 37 roster pages would
 * be orphans reachable only from the sitemap, which is the fastest way to have
 * them crawled once and then ignored.
 */
function renderHubPage(teams, eras) {
  const url = `${ORIGIN}/teams.html`;
  const title = 'All-Time NBA Rosters by Franchise & Era';
  const totalPlayers = new Set(teams.flatMap(t => t.players.map(p => p.id))).size;
  const desc = `Every one of the ${totalPlayers} legends in the 82-0 draft pool, indexed by all ${teams.length} franchises and ${eras.length} decades, with all-time starting fives.`;

  return head({ title, desc, url, jsonLd: jsonLdFor(title, url, desc), depth: 0 }) + `
  <section class="seo-content cp-page tp-page">
    <div class="seo-inner">
      <p class="cp-crumb"><a href="./">← Back to the game</a></p>

      <h1>All-time rosters by franchise and era</h1>
      <p><strong>${totalPlayers} legends across ${teams.length} franchises and ${eras.length} decades</strong>
         make up the draft pool. Every player below is one you can actually draft — the pages are
         generated from the game's own database, so the ratings and stats are the ones the season
         simulator plays with.</p>
      <p><a class="seo-cta" href="./">▶ Play Can You Go 82-0?</a></p>

      <h2>By franchise</h2>
      <p>Each page lists that franchise's full pool split by decade, plus its all-time starting five.</p>
      <div class="tp-scroll">
      <table class="tp-table">
        <thead><tr><th>Franchise</th><th class="tp-num">Players</th><th>Best rated</th><th>Deepest era</th></tr></thead>
        <tbody>
${teams.map(t => {
  const best = t.players[0];
  const deepest = eras
    .map(e => ({ decade: e.decade, n: t.players.filter(p => p.decade === e.decade).length }))
    .sort((a, b) => b.n - a.n)[0];
  return `        <tr>
          <td><a href="teams/${slugify(t.team)}.html">${esc(t.team)}</a></td>
          <td class="tp-num">${t.players.length}</td>
          <td>${esc(best.name)} (${best.overall})</td>
          <td>${esc(deepest.decade)} (${deepest.n})</td>
        </tr>`;
}).join('\n')}
        </tbody>
      </table>
      </div>

      <h2>By era</h2>
      <p>Each page ranks the whole decade, breaks it down by franchise, and links straight into a draft locked to that era.</p>
      <div class="tp-scroll">
      <table class="tp-table">
        <thead><tr><th>Decade</th><th class="tp-num">Players</th><th>Best rated</th><th>Draft it</th></tr></thead>
        <tbody>
${eras.map(e => `        <tr>
          <td><a href="eras/${e.decade}.html">${esc(e.decade)}</a></td>
          <td class="tp-num">${e.players.length}</td>
          <td>${esc(e.players[0].name)} (${e.players[0].overall})</td>
          <td><a href="./?ref=era#/era?d=${e.decade}">${esc(e.decade)}-only draft →</a></td>
        </tr>`).join('\n')}
        </tbody>
      </table>
      </div>

      <p class="seo-links">
        <a href="./">← Back to the game</a> &middot;
        <a href="daily.html">Daily challenges</a> &middot;
        <a href="privacy.html">Privacy</a>
      </p>
    </div>
  </section>

</body>
</html>
`;
}

// ── Build ────────────────────────────────────────────────────────────────────

/**
 * Writes every franchise and era page.
 * @returns {Promise<Array<{loc:string, rel:string, changed:boolean}>>} sitemap
 *   entries for the caller to merge — build_challenge_pages.mjs owns the write.
 */
export async function buildTeamPages() {
  const DB = await loadPlayerDb();
  const { TEAMS, DECADES } = await import('../js/logic/state.js');

  mkdirSync(join(ROOT, 'teams'), { recursive: true });
  mkdirSync(join(ROOT, 'eras'), { recursive: true });

  const entries = [];

  const eligibleTeams = TEAMS.filter(t => collect(DB, k => teamOf(k) === t).length >= MIN_FRANCHISE_PLAYERS);
  const skipped = TEAMS.filter(t => !eligibleTeams.includes(t));

  const teamGroups = [];
  for (const team of eligibleTeams) {
    const players = collect(DB, k => teamOf(k) === team);
    teamGroups.push({ team, players });
    const rel = `teams/${slugify(team)}.html`;
    const changed = writeIfChanged(join(ROOT, rel), renderTeamPage(team, players, DECADES, eligibleTeams));
    entries.push({ loc: `${ORIGIN}/${rel}`, rel, changed, label: team, n: players.length });
  }

  const eraGroups = [];
  for (const decade of DECADES) {
    const players = collect(DB, k => decadeOf(k) === decade);
    if (!players.length) continue;
    eraGroups.push({ decade, players });
    const teamsInDecade = eligibleTeams.filter(t => players.some(p => p.team === t));
    const rel = `eras/${decade}.html`;
    const changed = writeIfChanged(join(ROOT, rel), renderEraPage(decade, players, teamsInDecade, DECADES));
    entries.push({ loc: `${ORIGIN}/${rel}`, rel, changed, label: decade, n: players.length });
  }

  const hubChanged = writeIfChanged(
    join(ROOT, 'teams.html'),
    renderHubPage(teamGroups, eraGroups.map(g => ({ ...g, decade: g.decade }))),
  );
  entries.push({
    loc: `${ORIGIN}/teams.html`, rel: 'teams.html', changed: hubChanged,
    label: 'hub', n: new Set(teamGroups.flatMap(t => t.players.map(p => p.id))).size,
  });

  if (skipped.length) {
    console.log(`Skipped ${skipped.length} franchise(s) under ${MIN_FRANCHISE_PLAYERS} players: ${skipped.join(', ')}`);
  }
  return entries;
}

// Run standalone for a quick local build (sitemap untouched — that's
// build_challenge_pages.mjs's job, so run that to publish).
if (import.meta.url === `file://${process.argv[1]}`) {
  const entries = await buildTeamPages();
  const changed = entries.filter(e => e.changed).length;
  console.log(`\n${entries.length} team/era pages (${changed} changed this run):`);
  for (const e of entries) {
    console.log(`  ${e.rel}`.padEnd(34) + `${String(e.n).padStart(3)} players` + (e.changed ? '   [updated]' : ''));
  }
  console.log('\nNote: sitemap.xml is written by build_challenge_pages.mjs — run that to publish.');
}
