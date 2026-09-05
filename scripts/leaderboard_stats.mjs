/**
 * scripts/leaderboard_stats.mjs — leaderboard export and roster analytics
 *
 * Dumps the two public Firestore boards to CSV and prints the aggregates the
 * GA4 console cannot answer: average team chemistry on championship rosters
 * broken down by era, and whether star power (avgPopularity / fansM) actually
 * correlates with wins.
 *
 * Why this exists rather than a BigQuery export: GA4's own event stream never
 * carries chemScore, avgPopularity or fansM — logAnalyticsEvent() in
 * js/ui/events.js sends wins/losses/coach/era/mode and nothing else. Those
 * three numbers only ever reach the network inside a leaderboard submission
 * (buildGlobalScorePayload()), so the board IS the dataset for any question
 * about roster construction. Linking BigQuery would cost a Blaze upgrade and
 * still not have the columns.
 *
 * Reads over the Firestore REST API with plain fetch and no credentials:
 * leaderboard and dailyLeaderboard are `allow read: if true` (firestore.rules),
 * so a public GET is exactly what the game itself does on the results screen.
 * Nothing here writes, and both collections are `allow update, delete: if
 * false` regardless.
 *
 * Run:  node scripts/leaderboard_stats.mjs
 *       node scripts/leaderboard_stats.mjs --out /tmp/board --project other-id
 *       node scripts/leaderboard_stats.mjs --no-csv        # stats only
 */

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Firestore caps a page at 300 documents regardless of what we ask for, so
 * this is the ceiling rather than a tuning knob — the pageToken loop below is
 * what actually gets the whole collection.
 */
const PAGE_SIZE = 300;

/**
 * A Pearson r over a handful of rows is noise dressed up as a finding. Below
 * this the correlation still prints, flagged, because hiding it entirely is
 * how someone ends up rerunning the query by hand and trusting it more.
 */
const MIN_CORRELATION_N = 10;

// ── Firestore REST ────────────────────────────────────────────────────────────

/**
 * The projectId is read out of the shipped client config rather than pinned
 * here, so this script cannot drift from whatever database the game actually
 * writes to. Regex rather than an import: js/utils/firebase.js is a browser
 * module that reaches for window/document on load.
 */
function projectIdFromClient() {
  const src   = readFileSync(join(ROOT, 'js/utils/firebase.js'), 'utf8');
  const match = src.match(/projectId:\s*'([^']+)'/);
  if (!match) throw new Error('Could not find projectId in js/utils/firebase.js');
  return match[1];
}

/** Unwraps one Firestore REST typed value into a plain JS value. */
export function decodeValue(v) {
  if ('stringValue'    in v) return v.stringValue;
  if ('integerValue'   in v) return Number(v.integerValue);   // arrives as a string
  if ('doubleValue'    in v) return Number(v.doubleValue);
  if ('booleanValue'   in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue'      in v) return null;
  if ('mapValue'       in v) return decodeFields(v.mapValue.fields ?? {});
  if ('arrayValue'     in v) return (v.arrayValue.values ?? []).map(decodeValue);
  return null;
}

function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decodeValue(v)]));
}

/**
 * Fetches an entire public collection, following nextPageToken to the end.
 * A collection with no documents comes back as a bare {} rather than an empty
 * array, which is why the documents key is defaulted rather than trusted.
 */
export async function fetchCollection(projectId, collection) {
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}`
             + `/databases/(default)/documents/${collection}`;
  const rows = [];
  let pageToken = '';

  do {
    const url = `${base}?pageSize=${PAGE_SIZE}${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Firestore returned ${res.status} ${res.statusText} for ${collection}\n`
                      + `${(await res.text()).slice(0, 400)}`);
    }
    const body = await res.json();
    for (const doc of body.documents ?? []) {
      rows.push({ id: doc.name.split('/').pop(), ...decodeFields(doc.fields ?? {}) });
    }
    pageToken = body.nextPageToken ?? '';
    process.stderr.write(`\r  ${collection}: ${rows.length} documents`.padEnd(48));
  } while (pageToken);

  process.stderr.write('\n');
  return rows;
}

// ── CSV ───────────────────────────────────────────────────────────────────────

/** `starters` is a comma-joined name list, so quoting here is load-bearing. */
export function csvCell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

/** Column set is the union across rows: avgPopularity/fansM are optional in the rules. */
export function toCsv(rows) {
  if (!rows.length) return '';
  const columns = [...new Set(rows.flatMap(Object.keys))];
  return [
    columns.join(','),
    ...rows.map(r => columns.map(c => csvCell(r[c])).join(',')),
  ].join('\n') + '\n';
}

// ── Stats ─────────────────────────────────────────────────────────────────────

const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Pearson r over the pairs where BOTH values are present and numeric — a run
 * submitted before avgPopularity/fansM were added to the payload has neither,
 * and scoring those as 0 would invent a cluster at the origin.
 */
export function correlation(rows, xKey, yKey) {
  const pairs = rows
    .map(r => [Number(r[xKey]), Number(r[yKey])])
    .filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (pairs.length < 2) return { r: null, n: pairs.length };

  const xs = pairs.map(p => p[0]);
  const ys = pairs.map(p => p[1]);
  const mx = mean(xs);
  const my = mean(ys);

  let num = 0, dx2 = 0, dy2 = 0;
  for (const [x, y] of pairs) {
    num += (x - mx) * (y - my);
    dx2 += (x - mx) ** 2;
    dy2 += (y - my) ** 2;
  }
  // Zero variance on either axis (every run the same era, say) has no
  // defined correlation — report it as absent rather than dividing by zero.
  const denom = Math.sqrt(dx2 * dy2);
  return { r: denom === 0 ? null : num / denom, n: pairs.length };
}

function groupBy(rows, key) {
  const out = new Map();
  for (const r of rows) {
    const k = r[key] || '(none)';
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(r);
  }
  return out;
}

const fixed = (n, places = 1) => (Number.isFinite(n) ? n.toFixed(places) : '—');

/** Left-aligns the first column and right-aligns the rest, sized to content. */
function printTable(headers, rows) {
  if (!rows.length) { console.log('  (no rows)\n'); return; }
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => String(r[i]).length)));
  const line = (cells) => '  ' + cells
    .map((c, i) => (i === 0 ? String(c).padEnd(widths[i]) : String(c).padStart(widths[i])))
    .join('  ');
  console.log(line(headers));
  console.log('  ' + widths.map(w => '─'.repeat(w)).join('  '));
  for (const r of rows) console.log(line(r));
  console.log('');
}

/**
 * Champion rate and chemistry per bucket. The champions-only chemistry column
 * is the one the question is actually about; the all-runs column sits next to
 * it because "88 on winners" means nothing without knowing the field averaged
 * 86 too.
 */
function breakdown(rows, key, label) {
  console.log(`Chemistry and championships by ${label}`);
  const table = [...groupBy(rows, key).entries()]
    .map(([bucket, group]) => {
      const champs = group.filter(r => r.champion === true);
      const chem      = group.map(r => Number(r.chemScore)).filter(Number.isFinite);
      const champChem = champs.map(r => Number(r.chemScore)).filter(Number.isFinite);
      return [
        bucket,
        group.length,
        champs.length,
        `${fixed((champs.length / group.length) * 100)}%`,
        champChem.length ? fixed(mean(champChem)) : '—',
        chem.length      ? fixed(mean(chem))      : '—',
        fixed(mean(group.map(r => Number(r.wins)).filter(Number.isFinite))),
      ];
    })
    .sort((a, b) => b[1] - a[1]);
  printTable(['bucket', 'runs', 'champs', 'champ%', 'chem(champs)', 'chem(all)', 'avg wins'], table);
}

function reportCorrelation(rows, xKey, yKey, blurb) {
  const { r, n } = correlation(rows, xKey, yKey);
  if (r === null) {
    console.log(`  ${xKey} ↔ ${yKey}: not computable (n=${n})`);
    return;
  }
  const strength = Math.abs(r) < 0.1 ? 'essentially none'
                 : Math.abs(r) < 0.3 ? 'weak'
                 : Math.abs(r) < 0.5 ? 'moderate'
                 : 'strong';
  const caveat = n < MIN_CORRELATION_N ? `  ⚠ n=${n} is too small to read into` : '';
  console.log(`  ${xKey} ↔ ${yKey}: r = ${fixed(r, 3)} (${strength}, n=${n}) — ${blurb}${caveat}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { out: join(ROOT, 'leaderboard-export'), project: null, csv: true };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--out'     && argv[i + 1]) args.out     = argv[++i];
    else if (argv[i] === '--project' && argv[i + 1]) args.project = argv[++i];
    else if (argv[i] === '--no-csv') args.csv = false;
    else if (argv[i] === '--help' || argv[i] === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${argv[i]}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log('Usage: node scripts/leaderboard_stats.mjs [--out DIR] [--project ID] [--no-csv]');
    return;
  }

  const projectId = args.project ?? projectIdFromClient();
  console.log(`Reading Firestore project ${projectId}\n`);

  const global = await fetchCollection(projectId, 'leaderboard');
  const daily  = await fetchCollection(projectId, 'dailyLeaderboard');

  if (args.csv) {
    mkdirSync(args.out, { recursive: true });
    writeFileSync(join(args.out, 'leaderboard.csv'), toCsv(global));
    writeFileSync(join(args.out, 'dailyLeaderboard.csv'), toCsv(daily));
    console.log(`\nCSV written to ${args.out}/`);
  }

  console.log(`\n${'═'.repeat(64)}\nGLOBAL LEADERBOARD — ${global.length} runs\n${'═'.repeat(64)}\n`);

  if (!global.length) {
    console.log('No documents in the leaderboard collection yet — nothing to analyse.\n');
    return;
  }

  const champions = global.filter(r => r.champion === true);
  const chemAll   = global.map(r => Number(r.chemScore)).filter(Number.isFinite);
  console.log(`Champions:      ${champions.length} of ${global.length} `
            + `(${fixed((champions.length / global.length) * 100)}%)`);
  console.log(`Average wins:   ${fixed(mean(global.map(r => Number(r.wins)).filter(Number.isFinite)))}`);
  console.log(`Average chem:   ${chemAll.length ? fixed(mean(chemAll)) : '—'}\n`);

  breakdown(global, 'era', 'era');
  breakdown(global, 'coachName', 'coach');

  console.log('Correlations with wins');
  reportCorrelation(global, 'chemScore',     'wins', 'does chemistry win games?');
  reportCorrelation(global, 'avgPopularity', 'wins', 'do star-studded rosters win?');
  reportCorrelation(global, 'fansM',         'wins', 'do popular rosters win?');
  console.log('');

  if (daily.length) {
    console.log(`${'═'.repeat(64)}\nDAILY LEADERBOARD — ${daily.length} runs\n${'═'.repeat(64)}\n`);
    const passed = daily.filter(r => r.passed === true);
    console.log(`Passed the challenge: ${passed.length} of ${daily.length} `
              + `(${fixed((passed.length / daily.length) * 100)}%)\n`);

    console.log('Pass rate by challenge');
    const table = [...groupBy(daily, 'challengeId').entries()]
      .map(([id, group]) => {
        const pass = group.filter(r => r.passed === true).length;
        const chem = group.map(r => Number(r.chemScore)).filter(Number.isFinite);
        return [
          id,
          group.length,
          pass,
          `${fixed((pass / group.length) * 100)}%`,
          chem.length ? fixed(mean(chem)) : '—',
          fixed(mean(group.map(r => Number(r.wins)).filter(Number.isFinite))),
        ];
      })
      .sort((a, b) => b[1] - a[1]);
    printTable(['challenge', 'runs', 'passed', 'pass%', 'avg chem', 'avg wins'], table);
  }
}

// Import-safe: the CLI only runs when this file is the entry point, so tests
// and other scripts can pull the helpers above without triggering a fetch.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(err => {
    console.error(`\n${err.message}`);
    process.exit(1);
  });
}
