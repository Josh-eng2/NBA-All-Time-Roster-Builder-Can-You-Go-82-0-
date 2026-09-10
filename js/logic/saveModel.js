// Pure persistence invariants, shared by local writers and cloud merging.
export const count = value => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
};
const map = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
export function normalizeProgress(value) {
  const p = map(value);
  const credits = {};
  for (const [id, n] of Object.entries(map(p.credits))) {
    if (/^[a-zA-Z0-9_-]{1,80}$/.test(id)) credits[id] = count(n);
  }
  const earned = Object.values(credits).reduce((a, b) => a + b, 0);
  // Old clients know only xp. Preserve their total without adding the shared
  // pre-migration history once for every device.
  const base = Math.max(count(p.base), count(p.xp) - earned);
  return { xp: base + earned, base, credits,
    rewards: [...new Set((Array.isArray(p.rewards) ? p.rewards : []).filter(x => typeof x === 'string'))] };
}
export function mergeProgress(a, b) {
  const x = normalizeProgress(a), y = normalizeProgress(b);
  const credits = { ...x.credits };
  for (const [id, n] of Object.entries(y.credits)) credits[id] = Math.max(credits[id] || 0, n);
  return normalizeProgress({ base: Math.max(x.base, y.base), credits, rewards: [...x.rewards, ...y.rewards] });
}
export function normalizeStreak(value) {
  const s = map(value);
  return { streak: count(s.streak), lastPassDate: /^\d{4}-\d{2}-\d{2}$/.test(s.lastPassDate || '') ? s.lastPassDate : null };
}
export const dailyBin = wins => wins < 40 ? '0-39' : wins < 50 ? '40-49' : wins < 60 ? '50-59' : wins < 70 ? '60-69' : wins < 80 ? '70-79' : '80-82';
const bins = ['0-39', '40-49', '50-59', '60-69', '70-79', '80-82'];
function legacyStats(value) {
  const s = map(value), distribution = {};
  for (const bin of bins) distribution[bin] = count(map(s.distribution)[bin]);
  const histogram = Object.values(distribution).reduce((a, b) => a + b, 0);
  return { played: Math.max(count(s.played), histogram), wins: Math.min(count(s.wins), Math.max(count(s.played), histogram)),
    distribution, lastPlayedDate: s.lastPlayedDate || null, maxStreak: count(s.maxStreak) };
}
export function mergeDailyHistory(a, b) {
  const x = map(a), y = map(b);
  const bx = legacyStats(x.baseline || (x.attempts ? {} : x));
  const by = legacyStats(y.baseline || (y.attempts ? {} : y));
  // Aggregate-only legacy history cannot be deduplicated by date. Keep a
  // conservative shared baseline; every newly played date is identifiable.
  const baseline = legacyStats({ played: Math.max(bx.played, by.played), wins: Math.max(bx.wins, by.wins),
    maxStreak: Math.max(bx.maxStreak, by.maxStreak), lastPlayedDate: [bx.lastPlayedDate, by.lastPlayedDate].filter(Boolean).sort().pop() || null,
    distribution: Object.fromEntries(bins.map(bin => [bin, Math.max(bx.distribution[bin], by.distribution[bin])])) });
  const attempts = {};
  for (const src of [map(x.attempts), map(y.attempts)]) {
    for (const [date, raw] of Object.entries(src)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date <= (baseline.lastPlayedDate || '')) continue;
      const r = map(raw), next = { at: count(r.at), wins: Math.min(82, count(r.wins)), passed: r.passed === true };
      const old = attempts[date];
      if (!old || next.at < old.at || (next.at === old.at && JSON.stringify(next) < JSON.stringify(old))) attempts[date] = next;
    }
  }
  const out = { ...baseline, distribution: { ...baseline.distribution }, baseline, attempts,
    currentStreak: Math.max(count(x.currentStreak), count(y.currentStreak)), maxStreak: Math.max(baseline.maxStreak, count(x.maxStreak), count(y.maxStreak)) };
  for (const date of Object.keys(attempts).sort()) {
    const r = attempts[date]; out.played++; if (r.passed) out.wins++;
    out.distribution[dailyBin(r.wins)]++; out.lastPlayedDate = date;
  }
  return out;
}
