'use strict';

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  GAME CONFIGURATION                                                         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const TEAMS   = ['Lakers','Bulls','Warriors','Celtics','Heat','Spurs','Knicks',
                 'Jazz','Pistons','Magic','Suns','Nuggets','Sixers'];
const DECADES = ['1960s','1970s','1980s','1990s','2000s','2010s','2020s'];

const POSITIONS       = ['PG','SG','SF','PF','C'];
const BENCH_POSITIONS = ['B1','B2','B3'];
const ALL_POSITIONS   = [...POSITIONS, ...BENCH_POSITIONS];
const TOTAL_ROUNDS    = 8;

const ERA_DESC = {
  '1960s': 'Chamberlain · West · Russell',
  '1970s': 'Kareem · Erving · Frazier',
  '1980s': 'Bird · Magic · Jordan',
  '1990s': 'Jordan · Shaq · Barkley',
  '2000s': 'Kobe · AI · T-Mac',
  '2010s': 'LeBron · Curry · Durant',
  '2020s': 'Jokic · LeBron · Booker',
};

const TEAM_COLORS = {
  Lakers:   { bg:'#552583', accent:'#FDB927' },
  Bulls:    { bg:'#CE1141', accent:'#ffffff' },
  Warriors: { bg:'#1D428A', accent:'#FFC72C' },
  Celtics:  { bg:'#007A33', accent:'#ffffff' },
  Heat:     { bg:'#98002E', accent:'#F9A01B' },
  Spurs:    { bg:'#C4CED4', accent:'#000000' },
  Knicks:   { bg:'#006BB6', accent:'#F58426' },
  Jazz:     { bg:'#002B5C', accent:'#F9A01B' },
  Pistons:  { bg:'#C8102E', accent:'#1D428A' },
  Magic:    { bg:'#0077C0', accent:'#C4CED4' },
  Suns:     { bg:'#1D1160', accent:'#E56020' },
  Nuggets:  { bg:'#0E2240', accent:'#FEC524' },
  Sixers:   { bg:'#006BB6', accent:'#ED174C' },
};

const ARCHETYPE_STYLE = {
  'Playmaker':         { bg:'#1e3a5f', text:'#60a5fa' },
  'Sharpshooter':      { bg:'#451a03', text:'#fbbf24' },
  'Lockdown Defender': { bg:'#3b0764', text:'#e879f9' },
  'Slasher':           { bg:'#2e1065', text:'#c084fc' },
  'Paint Beast':       { bg:'#052e16', text:'#4ade80' },
  'Two-Way Star':      { bg:'#431407', text:'#fb923c' },
};


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  GAME STATE                                                                 ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const CPU_TEAMS = [
  { name: "96 Bulls",         strength: 1.38 },
  { name: "17 Warriors",      strength: 1.34 },
  { name: "86 Celtics",       strength: 1.30 },
  { name: "87 Lakers",        strength: 1.28 },
  { name: "01 Lakers",        strength: 1.26 },
  { name: "13 Heat",          strength: 1.24 },
  { name: "14 Spurs",         strength: 1.22 },
  { name: "04 Pistons",       strength: 1.18 },
  { name: "16 Cavaliers",     strength: 1.16 },
  { name: "94 Rockets",       strength: 1.14 },
  { name: "11 Mavericks",     strength: 1.12 },
  { name: "08 Celtics",       strength: 1.10 },
  { name: "05 Spurs",         strength: 1.08 },
  { name: "03 Spurs",         strength: 1.06 },
  { name: "89 Pistons",       strength: 1.04 },
];

function getPlayerSeed(wins) {
  if (wins >= 70) return 1;
  if (wins >= 60) return 2;
  if (wins >= 50) return 3;
  if (wins >= 41) return 4;
  return 8;
}

function buildBracket(playerSeed, playerStrength) {
  const cpuSorted = [...CPU_TEAMS].sort((a, b) => b.strength - a.strength);
  const seeds = [null, null, null, null, null, null, null, null]; // index = seed-1
  seeds[playerSeed - 1] = { name: 'Your Team', strength: playerStrength, isPlayer: true };

  let cpuIdx = 0;
  for (let i = 0; i < 8; i++) {
    if (!seeds[i]) {
      seeds[i] = { ...cpuSorted[cpuIdx++], isPlayer: false };
    }
  }
  // Matchups: 1v8, 2v7, 3v6, 4v5
  return [
    [seeds[0], seeds[7]],
    [seeds[1], seeds[6]],
    [seeds[2], seeds[5]],
    [seeds[3], seeds[4]],
  ];
}

let S = {
  phase:       'era-select', // 'era-select' | 'drafting' | 'results' | 'playoffs'
  selectedEra: null,
};


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  HELPERS                                                                    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

function getPlayers(team, decade) {
  return (DB[`${team}_${decade}`] || []).slice();
}

function getAvailablePlayers(team, decade) {
  return getPlayers(team, decade).filter(p => !S.usedPlayerIds.includes(p.id));
}

function availableDecades() {
  if (S.selectedEra && S.selectedEra !== 'all') return [S.selectedEra];
  const remaining = DECADES.filter(d => !S.usedDecades.includes(d));
  return remaining.length > 0 ? remaining : DECADES.slice();
}

function spinResult(fixedTeam = null, fixedDecade = null) {
  const decadePool = availableDecades();
  if (!decadePool.length) return null;

  let decade = fixedDecade || pick(decadePool);
  let team   = fixedTeam   || pick(TEAMS);

  for (let i = 0; i < 60 && !getAvailablePlayers(team, decade).length; i++) {
    team   = pick(TEAMS);
    if (!fixedDecade) decade = pick(decadePool);
  }

  if (!getAvailablePlayers(team, decade).length) {
    for (const d of (fixedDecade ? [fixedDecade] : decadePool)) {
      for (const t of TEAMS) {
        if (getAvailablePlayers(t, d).length > 0) return { team: t, decade: d };
      }
    }
    return null;
  }

  return { team, decade };
}

function rosterFull() {
  return ALL_POSITIONS.every(p => S.roster[p] !== null);
}


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  RENDERING                                                                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const $app = document.getElementById('app');

function render() {
  if      (S.phase === 'era-select') $app.innerHTML = renderEraSelect();
  else if (S.phase === 'drafting')   $app.innerHTML = renderDrafting();
  else if (S.phase === 'results')    $app.innerHTML = renderResults();
  else if (S.phase === 'playoffs')   $app.innerHTML = renderPlayoffs();
  bindEvents();
}

// ── SVG icons ──────────────────────────────────────────────────────────────────
function iconBall(cls='') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M4.93 4.93a14.5 14.5 0 0 1 0 14.14"/>
    <path d="M19.07 4.93a14.5 14.5 0 0 0 0 14.14"/>
    <path d="M2 12h20"/><path d="M12 2v20"/>
  </svg>`;
}
function iconCheck(cls='') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg>`;
}
function iconPlus(cls='') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16m8-8H4"/></svg>`;
}

// ── Archetype badge ────────────────────────────────────────────────────────────
function archetypeBadge(arch) {
  if (!arch) return '';
  const c = ARCHETYPE_STYLE[arch] || { bg:'#27272a', text:'#a1a1aa' };
  return `<span class="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full mt-0.5" style="background:${c.bg};color:${c.text}">${arch}</span>`;
}

// ── Shared chrome ──────────────────────────────────────────────────────────────
function renderHeader(showRestart = false) {
  const eraLabel = S.selectedEra && S.selectedEra !== 'all'
    ? `Classic · ${S.selectedEra}` : 'Classic Mode';
  return `
  <header class="sticky top-0 z-50 w-full border-b border-border" style="background:rgba(9,9,11,0.92);backdrop-filter:blur(10px)">
    <div class="mx-auto flex h-12 max-w-2xl items-center justify-between px-4">
      <div class="flex items-center gap-2 font-bold text-base">
        ${iconBall('h-6 w-6 text-primary')}
        <span class="text-foreground">82-0</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs px-2.5 py-1 rounded-full font-semibold bg-card2 text-muted-fg border border-border">${eraLabel}</span>
        ${showRestart ? `<button data-action="restart" class="text-xs px-3 py-1.5 rounded-full border border-border text-muted-fg hover:text-foreground hover:border-primary/60 transition-all cursor-pointer">Restart</button>` : ''}
      </div>
    </div>
  </header>`;
}

function renderFooter() {
  return `
  <footer class="w-full py-3 text-center border-t border-border mt-auto">
    <p class="text-xs text-muted-fg/60">82-0.com is an independent fan project — not affiliated with the NBA.</p>
  </footer>`;
}

// ── Era selection ──────────────────────────────────────────────────────────────
function renderEraSelect() {
  return `
  <div class="flex flex-col min-h-screen main-gradient">
    ${renderHeader(false)}
    <main class="flex-1 flex flex-col items-center px-4 pt-4 pb-8">
      <div class="w-full max-w-2xl flex flex-col gap-4 animate-fade-up">

        <div class="text-center py-4">
          <p class="text-xs font-bold uppercase tracking-widest text-primary mb-2">Draft Setup</p>
          <h1 class="text-2xl font-black text-foreground mb-2">Choose Your Era</h1>
          <p class="text-sm text-muted-fg">Pick a decade — your 8 draft picks come from that era's pool. Or let fate decide.</p>
        </div>

        <button data-action="era-all" class="era-card w-full rounded-2xl border p-5 text-left cursor-pointer"
          style="background:#f9731610;border-color:#f9731650">
          <div class="flex items-start justify-between gap-3">
            <div class="flex-1 min-w-0">
              <p class="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Recommended</p>
              <p class="font-black text-xl text-foreground mb-1">All Eras</p>
              <p class="text-sm text-muted-fg">Random decade each spin — full 7-era gauntlet across every NBA generation</p>
            </div>
            <div class="flex-shrink-0 mt-1">${iconBall('h-8 w-8 text-primary/60')}</div>
          </div>
        </button>

        <div class="grid grid-cols-2 gap-3">
          ${DECADES.map(d => `
            <button data-action="era-${d}" class="era-card rounded-xl border border-border bg-card p-4 text-left cursor-pointer hover:border-primary/50 hover:bg-card2">
              <p class="font-black text-lg text-foreground mb-1">${d}</p>
              <p class="text-xs text-muted-fg">${ERA_DESC[d]}</p>
            </button>
          `).join('')}
        </div>

      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

// ── Drafting screen ────────────────────────────────────────────────────────────
function renderDrafting() {
  const full = rosterFull();
  return `
  <div class="flex flex-col min-h-screen main-gradient">
    ${renderHeader(true)}
    <main class="flex-1 flex flex-col items-center px-4 pt-4 pb-8">
      <div class="w-full max-w-2xl flex flex-col gap-4">
        ${renderRoundBar()}
        ${full ? renderSimulateCard() : renderSlotMachine()}
        ${S.spinState === 'done' ? renderPlayerPool() : ''}
        ${renderChemDashboard()}
        ${renderRoster()}
      </div>
    </main>
  </div>`;
}

function renderRoundBar() {
  const filled         = ALL_POSITIONS.filter(p => S.roster[p]).length;
  const startersFilled = POSITIONS.filter(p => S.roster[p]).length;
  const benchFilled    = BENCH_POSITIONS.filter(p => S.roster[p]).length;
  const roleLabel = S.round < 5
    ? `Filling starter · ${startersFilled}/5`
    : `Filling bench · ${benchFilled}/3`;
  return `
  <div class="flex items-center justify-between">
    <div>
      <p class="text-sm font-bold text-foreground">Round ${S.round + 1} <span class="text-muted-fg font-normal">/ ${TOTAL_ROUNDS}</span></p>
      <p class="text-xs text-muted-fg mt-0.5">${filled} / 8 spots filled &nbsp;·&nbsp; ${roleLabel}</p>
    </div>
    <div class="flex gap-1 items-center">
      ${Array.from({length: TOTAL_ROUNDS}, (_, i) => {
        const isStarter = i < 5;
        const active    = i < S.round || i === S.round;
        return `<div class="rounded-full transition-all" style="width:7px;height:7px;background:${active ? (isStarter ? '#f97316' : '#a1a1aa') : '#27272a'};opacity:${active ? 1 : 0.4}"></div>`;
      }).join('')}
    </div>
  </div>`;
}

function renderSlotMachine() {
  const isDone    = S.spinState === 'done';
  const isSpin    = S.spinState === 'spinning';
  const tc        = isDone ? TEAM_COLORS[S.currentSpin.team] : null;
  const eraLocked = S.selectedEra && S.selectedEra !== 'all';

  return `
  <div class="rounded-2xl border border-border bg-card p-4 animate-scale-in">
    <div class="flex items-center gap-2 mb-3">
      <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Draft Slot — Round ${S.round + 1}</p>
      <div class="ml-auto flex gap-2">
        ${isDone && S.teamSkips > 0 ? `<button data-action="skip-team" class="text-xs px-2.5 py-1 rounded-full border border-border text-muted-fg hover:text-foreground hover:border-primary/60 transition-all cursor-pointer">Skip Team (${S.teamSkips})</button>` : ''}
        ${isDone && S.decadeSkips > 0 && !eraLocked ? `<button data-action="skip-decade" class="text-xs px-2.5 py-1 rounded-full border border-border text-muted-fg hover:text-foreground hover:border-primary/60 transition-all cursor-pointer">Skip Era (${S.decadeSkips})</button>` : ''}
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 mb-4 ${isSpin ? 'slot-spinning' : ''}">
      <div class="rounded-xl border p-4 flex flex-col items-center justify-center min-h-[88px] transition-all"
        style="background:${isDone && tc ? tc.bg+'22' : '#1f1f23'};border-color:${isDone && tc ? tc.bg+'88' : '#27272a'}">
        <span class="text-[10px] font-bold uppercase tracking-widest mb-2" style="color:${isDone && tc ? tc.accent : '#71717a'}">TEAM</span>
        <span class="slot-badge text-lg font-black text-foreground" id="slot-team">
          ${isDone ? S.currentSpin.team : isSpin ? pick(TEAMS) : '?'}
        </span>
        ${isDone ? `<span class="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white uppercase tracking-wider">LOCKED</span>` : ''}
      </div>
      <div class="rounded-xl border p-4 flex flex-col items-center justify-center min-h-[88px] transition-all"
        style="background:${isDone ? '#f9731611' : '#1f1f23'};border-color:${isDone ? '#f9731655' : '#27272a'}">
        <span class="text-[10px] font-bold uppercase tracking-widest mb-2" style="color:${isDone ? '#f97316' : '#71717a'}">ERA</span>
        <span class="slot-badge text-lg font-black text-foreground" id="slot-decade">
          ${isDone ? S.currentSpin.decade : isSpin ? (eraLocked ? S.selectedEra : pick(availableDecades())) : '?'}
        </span>
        ${isDone ? `<span class="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-white uppercase tracking-wider">LOCKED</span>` : ''}
      </div>
    </div>

    ${S.spinState === 'idle' ? `
      <button data-action="spin" class="w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest bg-primary text-white hover:bg-primary/90 transition-all cursor-pointer animate-pulse-glow">
        SPIN
      </button>
    ` : S.spinState === 'spinning' ? `
      <button disabled class="w-full py-3 rounded-xl font-black text-sm uppercase tracking-widest bg-primary/70 text-white cursor-not-allowed">
        SPINNING...
      </button>
    ` : `
      <p class="text-center text-xs text-muted-fg py-1">Select a player below, then tap a roster slot to place them</p>
    `}
  </div>`;
}

// ── Player pool ────────────────────────────────────────────────────────────────
function renderPlayerPool() {
  if (!S.availablePlayers.length) return '';
  const team   = S.currentSpin?.team;
  const decade = S.currentSpin?.decade;
  const tc     = team ? TEAM_COLORS[team] : null;
  return `
  <div class="animate-fade-up">
    <div class="flex items-center gap-2 mb-3">
      ${tc ? `<span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${tc.bg}"></span>` : ''}
      <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">${team} · ${decade}</p>
    </div>
    <div class="flex flex-col gap-2">
      ${S.availablePlayers.map(p => renderPlayerCard(p)).join('')}
    </div>
  </div>`;
}

function renderPlayerCard(p) {
  const sel = S.selectedPlayer?.id === p.id;
  return `
  <div data-action="pick-${p.id}" class="player-card rounded-xl border cursor-pointer p-3 ${sel ? 'selected' : ''}"
    style="background:${sel?'#f9731615':'#18181b'};border-color:${sel?'#f97316':'#27272a'}">
    <div class="flex items-center gap-3">
      <div class="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border"
        style="background:${sel?'#f9731622':'#1f1f23'};border-color:${sel?'#f97316':'#27272a'};color:${sel?'#f97316':'#a1a1aa'}">
        ${p.pos}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm text-foreground truncate">${p.name}</p>
        ${archetypeBadge(p.archetype)}
        <div class="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
          ${[['PPG',p.ppg],['RPG',p.rpg],['APG',p.apg],['SPG',p.spg],['BPG',p.bpg]].map(([l,v])=>`
            <span class="text-xs text-muted-fg"><span class="font-semibold text-foreground/80">${v}</span> ${l}</span>
          `).join('')}
        </div>
      </div>
      <div class="flex-shrink-0">
        ${sel
          ? `<div class="h-6 w-6 rounded-full bg-primary flex items-center justify-center">${iconCheck('h-3.5 w-3.5 text-white')}</div>`
          : `<div class="h-6 w-6 rounded-full border border-border flex items-center justify-center">${iconPlus('h-3.5 w-3.5 text-muted-fg')}</div>`
        }
      </div>
    </div>
  </div>`;
}

// ── Roster ─────────────────────────────────────────────────────────────────────
function renderRoster() {
  const hasSelected = !!S.selectedPlayer;
  const filledCount = ALL_POSITIONS.filter(p => S.roster[p]).length;
  return `
  <div>
    <div class="flex items-center justify-between mb-2">
      <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Your Roster <span class="text-primary">${filledCount}/8</span></p>
      ${hasSelected ? `<p class="text-xs text-primary animate-fade-up font-medium">Tap a slot to place ${S.selectedPlayer.name}</p>` : ''}
    </div>

    <p class="text-[10px] font-bold uppercase tracking-wider text-muted-fg/50 mb-1.5">Starters</p>
    <div class="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
      ${POSITIONS.map(pos => renderRosterSlot(pos, hasSelected, false)).join('')}
    </div>

    <p class="text-[10px] font-bold uppercase tracking-wider text-muted-fg/50 mb-1.5">Bench</p>
    <div class="grid grid-cols-3 gap-2">
      ${BENCH_POSITIONS.map(pos => renderRosterSlot(pos, hasSelected, true)).join('')}
    </div>
  </div>`;
}

function renderRosterSlot(pos, canPlace, isBench) {
  const p       = S.roster[pos];
  const canDrop = canPlace && !p;
  const canSwap = canPlace && !!p;
  const label   = isBench ? 'BN' : pos;
  const filledBorderColor = isBench ? '#3f3f46' : '#f97316';
  const filledLabelColor  = isBench ? '#a1a1aa' : '#f97316';

  if (p) {
    return `
    <div data-action="swap-${pos}"
      class="rounded-xl border p-2 flex flex-col items-center gap-1 text-center overflow-hidden transition-all ${canSwap ? 'cursor-pointer hover:border-yellow-500/70' : ''}"
      style="background:#18181b;border-color:${filledBorderColor};" title="${canSwap ? 'Tap to replace' : p.name}">
      <span class="text-[10px] font-black uppercase leading-none" style="color:${filledLabelColor}">${label}</span>
      <span class="text-[11px] font-semibold text-foreground leading-tight w-full text-center truncate px-0.5">${p.name.split(' ').pop()}</span>
      <span class="text-[10px] text-muted-fg leading-none">${p.ppg}pt</span>
    </div>`;
  }

  return `
  <div data-action="${canDrop ? 'place-'+pos : ''}"
    class="rounded-xl border-2 border-dashed p-2 flex flex-col items-center gap-1 text-center transition-all ${canDrop ? 'slot-empty droppable' : ''}"
    style="background:${canDrop?'#f9731608':'#18181b'};border-color:${canDrop?'#f9731688':'#27272a'}">
    <span class="text-[10px] font-black uppercase" style="color:${canDrop?'#f97316':'#3f3f46'}">${label}</span>
    <span class="text-xs" style="color:${canDrop?'#a1a1aa':'#3f3f46'}">${canDrop ? 'Place' : 'Empty'}</span>
  </div>`;
}

// ── Live Chemistry Dashboard ───────────────────────────────────────────────────
function renderChemDashboard() {
  const starters = POSITIONS.map(p => S.roster[p]).filter(Boolean);
  const bench    = BENCH_POSITIONS.map(p => S.roster[p]).filter(Boolean);
  if (starters.length === 0 && bench.length === 0) {
    return `
    <div class="rounded-2xl border border-border bg-card p-4">
      <p class="text-xs font-bold uppercase tracking-widest text-muted-fg mb-2">Live Chemistry</p>
      <p class="text-xs text-muted-fg">Draft your first player to see team chemistry.</p>
    </div>`;
  }
  const { chemScore, chemReport } = calculateChemistry(starters, bench);
  const scoreColor = chemScore >= 70 ? '#22c55e' : chemScore >= 45 ? '#f97316' : '#ef4444';
  const scoreLabel = chemScore >= 70 ? 'Strong' : chemScore >= 45 ? 'Neutral' : 'Weak';
  return `
  <div class="rounded-2xl border border-border bg-card p-4">
    <div class="flex items-center justify-between mb-3">
      <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Live Chemistry</p>
      <span class="text-xs font-bold px-2 py-0.5 rounded-full" style="background:${scoreColor}22;color:${scoreColor}">${scoreLabel}</span>
    </div>
    <div class="flex items-center gap-3 mb-3">
      <div class="flex-1 h-2 rounded-full overflow-hidden" style="background:#27272a">
        <div class="h-full rounded-full transition-all duration-500" style="width:${chemScore}%;background:${scoreColor}"></div>
      </div>
      <span class="text-sm font-black flex-shrink-0" style="color:${scoreColor}">${chemScore}%</span>
    </div>
    ${chemReport.length > 0 ? `
    <div class="flex flex-col gap-1.5">
      ${chemReport.map(item => {
        const isGood = item.startsWith('🟢');
        return `<div class="rounded-lg px-2.5 py-1.5 text-xs font-medium"
          style="background:${isGood?'#14532d33':'#450a0a33'};color:${isGood?'#4ade80':'#f87171'}">${item}</div>`;
      }).join('')}
    </div>` : `<p class="text-xs text-muted-fg">No synergies yet — keep drafting.</p>`}
  </div>`;
}

// ── Simulate card ──────────────────────────────────────────────────────────────
function renderSimulateCard() {
  return `
  <div class="rounded-2xl border border-primary/50 bg-card p-5 text-center animate-scale-in" style="box-shadow:0 0 30px rgba(249,115,22,0.12)">
    <div class="flex justify-center mb-3">${iconBall('h-10 w-10 text-primary')}</div>
    <p class="font-black text-lg text-foreground mb-1">Roster Complete!</p>
    <p class="text-sm text-muted-fg mb-5">All 8 spots locked in — starters and bench. Time to find out.</p>
    <button data-action="simulate" class="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-widest bg-primary text-white hover:bg-primary/90 transition-all cursor-pointer animate-pulse-glow">
      Simulate 82 Games →
    </button>
  </div>`;
}

// ── Results screen ─────────────────────────────────────────────────────────────
function renderResults() {
  const r = S.result;
  const isPerfect  = r.wins === 82;
  const isHistoric = r.wins >= 73;
  const isElite    = r.wins >= 65;
  const isPlayoff  = r.wins >= 50;

  let label, labelColor, emoji;
  if (isPerfect)       { label = 'PERFECT SEASON!';        labelColor = '#f97316'; emoji = '🏆'; }
  else if (isHistoric) { label = 'Historic Season';        labelColor = '#eab308'; emoji = '🔥'; }
  else if (isElite)    { label = 'Championship Contender'; labelColor = '#22c55e'; emoji = '🌟'; }
  else if (isPlayoff)  { label = 'Playoff Contender';      labelColor = '#3b82f6'; emoji = '✅'; }
  else                 { label = 'Back to the Draft';      labelColor = '#ef4444'; emoji = '💀'; }

  const maxes = { ppg:280, rpg:120, apg:75, spg:22, bpg:18 };
  const statBar = (key, lbl, val) => {
    const pct   = Math.min(100, (val / maxes[key]) * 100);
    const color = pct >= 70 ? '#f97316' : pct >= 45 ? '#eab308' : '#3b82f6';
    return `
    <div>
      <div class="flex justify-between text-xs mb-1">
        <span class="text-muted-fg font-medium">${lbl}</span>
        <span class="font-bold text-foreground">${val.toFixed(1)}</span>
      </div>
      <div class="h-1.5 rounded-full bg-muted/40 overflow-hidden">
        <div class="h-full rounded-full stat-bar-fill" style="width:${pct}%;background:${color}"></div>
      </div>
    </div>`;
  };

  const rosterRow = (p, posLabel, labelColorRow) => {
    if (!p) return '';
    return `
    <div class="flex items-center gap-3 py-2.5">
      <span class="text-xs font-black w-8 flex-shrink-0" style="color:${labelColorRow}">${posLabel}</span>
      <div class="flex-1 min-w-0">
        <p class="font-semibold text-sm text-foreground truncate">${p.name}</p>
        <div class="flex items-center gap-2 mt-0.5">
          <p class="text-xs text-muted-fg">${p.team || ''} ${p.decade || ''}</p>
          ${p.archetype ? archetypeBadge(p.archetype) : ''}
        </div>
      </div>
      <div class="flex gap-3 text-xs text-muted-fg flex-shrink-0">
        <span><span class="font-semibold text-foreground/80">${p.ppg}</span> PPG</span>
        <span><span class="font-semibold text-foreground/80">${p.rpg}</span> RPG</span>
        <span class="hidden sm:inline"><span class="font-semibold text-foreground/80">${p.apg}</span> APG</span>
      </div>
    </div>`;
  };

  const chemReportHtml = r.chemReport && r.chemReport.length > 0
    ? r.chemReport.map(item => {
        const isGood = item.startsWith('🟢');
        return `<div class="rounded-xl px-3 py-2.5 text-sm font-medium"
          style="background:${isGood?'#14532d33':'#450a0a33'};border:1px solid ${isGood?'#22c55e44':'#ef444444'};color:${isGood?'#4ade80':'#f87171'}">${item}</div>`;
      }).join('')
    : `<p class="text-sm text-muted-fg py-1">No synergies or penalties — balanced roster.</p>`;

  return `
  <div class="flex flex-col min-h-screen main-gradient">
    ${renderHeader(false)}
    <main class="flex-1 flex flex-col items-center px-4 py-6">
      <div class="w-full max-w-2xl flex flex-col gap-4 animate-fade-up">

        <div class="rounded-2xl border bg-card p-6 text-center ${isPerfect ? 'perfect-glow' : ''}"
          style="border-color:${isPerfect?'#f97316':'#27272a'}">
          <p class="text-xs font-bold uppercase tracking-widest text-muted-fg mb-3">Projected Record</p>
          <div class="text-6xl sm:text-7xl font-black mb-3 flex items-center justify-center gap-2">
            <span style="color:${labelColor}">${r.wins}</span>
            <span class="text-muted/60 text-4xl">—</span>
            <span class="text-muted-fg">${r.losses}</span>
          </div>
          <p class="font-black text-xl mb-1" style="color:${labelColor}">${emoji} ${label}</p>
          <p class="text-sm text-muted-fg">Win% ${r.winPct}% &nbsp;·&nbsp; Strength ${r.strength}</p>
        </div>

        <div class="rounded-2xl border border-border bg-card p-4">
          <div class="flex items-center justify-between mb-3">
            <p class="text-xs font-bold uppercase tracking-widest text-muted-fg">Chemistry Report</p>
            ${r.chemScore !== undefined ? (() => {
              const sc = r.chemScore;
              const scColor = sc >= 70 ? '#22c55e' : sc >= 45 ? '#f97316' : '#ef4444';
              const scLabel = sc >= 70 ? 'Strong' : sc >= 45 ? 'Neutral' : 'Weak';
              return `<span class="text-xs font-bold px-2 py-0.5 rounded-full" style="background:${scColor}22;color:${scColor}">${scLabel} · ${sc}%</span>`;
            })() : ''}
          </div>
          <div class="flex flex-col gap-2">${chemReportHtml}</div>
        </div>

        <div class="rounded-2xl border border-border bg-card p-4">
          <p class="text-xs font-bold uppercase tracking-widest text-muted-fg mb-4">Team Statistics</p>
          <div class="flex flex-col gap-3">
            ${statBar('ppg', 'Points Per Game',   r.totals.ppg)}
            ${statBar('rpg', 'Rebounds Per Game', r.totals.rpg)}
            ${statBar('apg', 'Assists Per Game',  r.totals.apg)}
            ${statBar('spg', 'Steals Per Game',   r.totals.spg)}
            ${statBar('bpg', 'Blocks Per Game',   r.totals.bpg)}
          </div>
        </div>

        <div class="rounded-2xl border border-border bg-card p-4">
          <p class="text-xs font-bold uppercase tracking-widest text-muted-fg mb-3">Final Roster</p>
          <p class="text-[10px] font-bold uppercase tracking-wider text-primary mb-1.5">Starters</p>
          <div class="flex flex-col divide-y mb-4" style="divide-color:#27272a">
            ${POSITIONS.map(pos => rosterRow(S.roster[pos], pos, '#f97316')).join('')}
          </div>
          <p class="text-[10px] font-bold uppercase tracking-wider text-muted-fg mb-1.5">Bench</p>
          <div class="flex flex-col divide-y" style="divide-color:#27272a">
            ${BENCH_POSITIONS.map(pos => rosterRow(S.roster[pos], S.roster[pos]?.pos || 'BN', '#a1a1aa')).join('')}
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <button data-action="advance-to-playoffs" class="py-3 rounded-xl font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-all cursor-pointer text-center">
            Advance to NBA Playoffs 🏆
          </button>
          <div class="grid grid-cols-2 gap-3">
            <button data-action="restart" class="py-3 rounded-xl font-bold text-sm border border-border bg-card text-foreground hover:border-primary/60 hover:bg-card2 transition-all cursor-pointer">
              Build Another
            </button>
            <button data-action="share" class="py-3 rounded-xl font-bold text-sm border border-border bg-card text-foreground hover:border-primary/60 hover:bg-card2 transition-all cursor-pointer">
              Share Result
            </button>
          </div>
        </div>

      </div>
    </main>
    ${renderFooter()}
  </div>`;
}


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  EVENT HANDLING                                                             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function bindEvents() {
  $app.addEventListener('click', handleClick, { once: true });
}

function handleClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) { bindEvents(); return; }
  dispatch(btn.dataset.action);
}

function dispatch(action) {
  if (action.startsWith('era-'))   { startGame(action.slice(4)); return; }
  if (action === 'restart')        { confirmLeave(() => { S.phase = 'era-select'; render(); }); return; }
  if (action === 'spin')           { doSpin();       return; }
  if (action === 'skip-team')      { doSkipTeam();   return; }
  if (action === 'skip-decade')    { doSkipDecade(); return; }
  if (action === 'simulate')           { doSimulate();        return; }
  if (action === 'share')              { doShare();           return; }
  if (action === 'advance-to-playoffs'){ doAdvanceToPlayoffs();return; }
  if (action === 'sim-next-round')     { doSimNextRound();    return; }
  if (action === 'draft-new-roster')   { S.phase='era-select'; render(); return; }

  if (action.startsWith('pick-')) {
    const id = action.slice(5);
    const p  = S.availablePlayers.find(x => x.id === id);
    if (!p) { render(); return; }
    S.selectedPlayer = S.selectedPlayer?.id === id ? null : p;
    render(); return;
  }
  if (action.startsWith('place-')) { placePlayer(action.slice(6)); return; }
  if (action.startsWith('swap-')) {
    if (S.selectedPlayer) placePlayer(action.slice(5));
    else render();
    return;
  }

  render();
}


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  GAME ACTIONS                                                               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function confirmLeave(fn) {
  if (S.phase === 'era-select' || S.phase === 'results' || S.phase === 'playoffs') { fn(); return; }
  if (confirm('Leave this game? Your progress will be lost.')) fn();
  else render();
}

function startGame(era = 'all') {
  S = {
    phase: 'drafting',
    selectedEra: era,
    round: 0,
    usedDecades:   [],
    usedPlayerIds: [],
    teamSkips:   1,
    decadeSkips: 1,
    spinState:   'idle',
    currentSpin: null,
    availablePlayers: [],
    selectedPlayer:   null,
    roster: { PG:null, SG:null, SF:null, PF:null, C:null, B1:null, B2:null, B3:null },
    result: null,
  };
  render();
}

function doSpin() {
  S.spinState = 'spinning';
  S.selectedPlayer = null;
  render();

  const eraLocked = S.selectedEra && S.selectedEra !== 'all';
  let ticks = 0;
  const total    = 14;
  const interval = setInterval(() => {
    ticks++;
    const teamEl   = document.getElementById('slot-team');
    const decadeEl = document.getElementById('slot-decade');
    if (teamEl)   teamEl.textContent   = pick(TEAMS);
    if (decadeEl) decadeEl.textContent = eraLocked
      ? S.selectedEra
      : pick(availableDecades().length ? availableDecades() : DECADES);

    if (ticks >= total) {
      clearInterval(interval);
      const spin = spinResult();
      if (!spin) { render(); return; }
      S.currentSpin      = spin;
      S.spinState        = 'done';
      S.availablePlayers = getAvailablePlayers(spin.team, spin.decade);
      S.selectedPlayer   = null;
      render();
    }
  }, 90);
}

function doSkipTeam() {
  if (S.teamSkips <= 0 || !S.currentSpin) { render(); return; }
  S.teamSkips--;
  const spin = spinResult(null, S.currentSpin.decade);
  if (spin) {
    S.currentSpin      = spin;
    S.availablePlayers = getAvailablePlayers(spin.team, spin.decade);
    S.selectedPlayer   = null;
  }
  render();
}

function doSkipDecade() {
  if (S.selectedEra !== 'all') { render(); return; }
  if (S.decadeSkips <= 0 || !S.currentSpin) { render(); return; }
  S.decadeSkips--;
  const pool = availableDecades().filter(d => d !== S.currentSpin.decade);
  if (!pool.length) { render(); return; }
  const spin = spinResult(S.currentSpin.team, pick(pool));
  if (spin) {
    S.currentSpin      = spin;
    S.availablePlayers = getAvailablePlayers(spin.team, spin.decade);
    S.selectedPlayer   = null;
  }
  render();
}

function placePlayer(pos) {
  if (!S.selectedPlayer) { render(); return; }
  const spin   = S.currentSpin;
  const player = { ...S.selectedPlayer, team: spin?.team, decade: spin?.decade };

  S.roster[pos]  = player;
  S.usedDecades.push(spin?.decade);
  S.usedPlayerIds.push(player.id);
  S.round++;
  S.spinState        = 'idle';
  S.currentSpin      = null;
  S.availablePlayers = [];
  S.selectedPlayer   = null;
  render();
}

function doSimulate() {
  const starters = POSITIONS.map(p => S.roster[p]).filter(Boolean);
  const bench    = BENCH_POSITIONS.map(p => S.roster[p]).filter(Boolean);
  S.result = simulateSeason(starters, bench);
  S.phase  = 'results';
  render();
}

function doShare() {
  const r = S.result;
  if (!r) return;
  const starters = POSITIONS.map(p => S.roster[p]?.name || '—').join(', ');
  const bench    = BENCH_POSITIONS.map(p => S.roster[p]?.name || '—').join(', ');
  const chem     = r.chemReport?.length ? '\n' + r.chemReport.join('\n') : '';
  const text = `I went ${r.wins}-${r.losses} in 82-0! 🏀\nStarters: ${starters}\nBench: ${bench}${chem}\nCan you beat it? https://82-0.com`;
  if (navigator.share) {
    navigator.share({ title: '82-0', text }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text)
      .then(() => alert('Result copied to clipboard! 🏀'))
      .catch(() => prompt('Copy this:', text));
  }
}


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  PLAYOFF ACTIONS                                                            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function doAdvanceToPlayoffs() {
  const playerStrength = S.result.strength;
  const playerSeed     = getPlayerSeed(S.result.wins);
  const bracket        = buildBracket(playerSeed, playerStrength);

  S.playoffs = {
    playerSeed,
    playerStrength,
    initialBracket: bracket.map(pair => pair.map(t => ({ ...t }))),
    rounds: [],       // completed rounds: array of arrays of series results
    currentRound: 0,  // 0=QF, 1=SF, 2=Finals
    bracket,          // current round matchups
    eliminated: false,
    champion: false,
    roundNames: ['Conference Quarterfinals', 'Conference Semifinals', 'NBA Finals'],
  };
  S.phase = 'playoffs';
  render();
}

function doSimNextRound() {
  const po = S.playoffs;
  const matchups = po.bracket;
  const results  = matchups.map(([teamA, teamB]) => {
    const series = simulateSeries(teamA.strength, teamB.strength);
    return { teamA, teamB, ...series };
  });
  po.rounds.push(results);

  // Find player's series result
  const playerResult = results.find(r => r.teamA.isPlayer || r.teamB.isPlayer);
  if (playerResult) {
    const playerWon = (playerResult.teamA.isPlayer && playerResult.won) ||
                      (playerResult.teamB.isPlayer && !playerResult.won);
    if (!playerWon) {
      po.eliminated = true;
      po.eliminatedIn = po.roundNames[po.currentRound];
      render(); return;
    }
  }

  // Advance winners
  const winners = results.map(r => r.won ? r.teamA : r.teamB);

  po.currentRound++;

  if (po.currentRound === 3) {
    po.champion = true;
    render(); return;
  }

  // Build next round bracket (pair winners: 0v1, 2v3 → then 0v1 in finals)
  const nextBracket = [];
  for (let i = 0; i < winners.length; i += 2) {
    nextBracket.push([winners[i], winners[i + 1]]);
  }
  po.bracket = nextBracket;
  render();
}


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  PLAYOFF RENDERING                                                          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

function renderPlayoffs() {
  const po = S.playoffs;
  const r  = S.result;

  if (po.champion) return renderChampionship();
  if (po.eliminated) return renderEliminated();

  const roundName = po.roundNames[po.currentRound];
  const completedRounds = po.rounds;

  const renderTeamCard = (team, seriesScore = null, won = null) => {
    const isPlayer = team.isPlayer;
    const border   = isPlayer ? 'border-primary' : 'border-border';
    const bg       = isPlayer ? 'bg-primary/10' : 'bg-card';
    const badge    = won === true ? '✅' : won === false ? '❌' : '';
    return `
      <div class="flex items-center gap-2 px-3 py-2 rounded-lg border ${border} ${bg}">
        <span class="text-xs font-bold ${isPlayer ? 'text-primary' : 'text-foreground'} flex-1 truncate">
          ${isPlayer ? '⭐ ' : ''}${team.name}
        </span>
        ${seriesScore !== null ? `<span class="text-xs font-mono text-muted-fg">${seriesScore}</span>` : ''}
        ${badge ? `<span class="text-xs">${badge}</span>` : ''}
      </div>`;
  };

  const renderMatchup = (teamA, teamB, seriesA = null, seriesB = null) => {
    const wonA = seriesA !== null ? (seriesA > seriesB) : null;
    const wonB = seriesB !== null ? (seriesB > seriesA) : null;
    return `
      <div class="flex flex-col gap-1">
        ${renderTeamCard(teamA, seriesA, wonA)}
        <div class="text-center text-[10px] text-muted-fg font-bold">vs</div>
        ${renderTeamCard(teamB, seriesB, wonB)}
      </div>`;
  };

  let bracketHTML = '';

  // Show completed rounds
  for (let ri = 0; ri < completedRounds.length; ri++) {
    const round = completedRounds[ri];
    bracketHTML += `
      <div class="mb-4">
        <p class="text-[10px] font-bold uppercase tracking-widest text-muted-fg mb-2">${po.roundNames[ri]}</p>
        <div class="grid grid-cols-2 gap-3">
          ${round.map(sr => renderMatchup(sr.teamA, sr.teamB, sr.playerWins, sr.oppWins)).join('')}
        </div>
      </div>`;
  }

  // Show current round matchups (not yet simulated)
  bracketHTML += `
    <div class="mb-4">
      <p class="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">${roundName} — Up Next</p>
      <div class="grid grid-cols-2 gap-3">
        ${po.bracket.map(([a, b]) => renderMatchup(a, b)).join('')}
      </div>
    </div>`;

  return `
  <div class="min-h-screen flex flex-col" style="background:#09090b">
    <main class="flex-1 flex flex-col items-center px-4 py-8">
      <div class="w-full max-w-lg flex flex-col gap-5">

        <div class="text-center">
          <p class="text-xs font-bold uppercase tracking-widest text-primary mb-1">NBA Playoffs</p>
          <h1 class="text-2xl font-black text-foreground">Playoff Bracket</h1>
          <p class="text-sm text-muted-fg mt-1">Regular Season: ${r.wins}–${r.losses} · Seed #${po.playerSeed}</p>
        </div>

        <div class="rounded-2xl border border-border bg-card p-4">
          ${bracketHTML}
        </div>

        <button data-action="sim-next-round"
          class="py-4 rounded-xl font-black text-base bg-primary text-white hover:bg-primary/90 transition-all cursor-pointer text-center">
          Simulate ${roundName} →
        </button>

        <button data-action="draft-new-roster"
          class="py-3 rounded-xl font-bold text-sm border border-border bg-card text-foreground hover:border-primary/60 hover:bg-card2 transition-all cursor-pointer text-center">
          Draft New Roster
        </button>

      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

function renderChampionship() {
  const po = S.playoffs;
  const r  = S.result;

  const finalsResult = po.rounds[po.rounds.length - 1].find(
    sr => sr.teamA.isPlayer || sr.teamB.isPlayer
  );
  const oppTeam = finalsResult.teamA.isPlayer ? finalsResult.teamB : finalsResult.teamA;
  const score   = finalsResult.teamA.isPlayer
    ? `${finalsResult.playerWins}–${finalsResult.oppWins}`
    : `${finalsResult.oppWins}–${finalsResult.playerWins}`;

  const roundSummary = po.rounds.map((round, i) => {
    const sr = round.find(s => s.teamA.isPlayer || s.teamB.isPlayer);
    if (!sr) return '';
    const opp = sr.teamA.isPlayer ? sr.teamB : sr.teamA;
    const w   = sr.teamA.isPlayer ? sr.playerWins : sr.oppWins;
    const l   = sr.teamA.isPlayer ? sr.oppWins : sr.playerWins;
    return `<p class="text-sm text-muted-fg">${po.roundNames[i]}: <span class="text-foreground font-semibold">def. ${opp.name} ${w}–${l}</span></p>`;
  }).join('');

  return `
  <div class="min-h-screen flex flex-col" style="background:#09090b">
    <main class="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div class="w-full max-w-lg flex flex-col gap-5 items-center text-center">

        <div class="text-6xl mb-2">🏆</div>
        <h1 class="text-3xl font-black text-primary">WORLD CHAMPIONS!</h1>
        <p class="text-base text-foreground">Your team conquered the NBA Playoffs!</p>

        <div class="rounded-2xl border border-primary/40 bg-primary/10 p-5 w-full">
          <p class="text-xs font-bold uppercase tracking-widest text-primary mb-3">Championship Run</p>
          ${roundSummary}
          <p class="text-base font-black text-primary mt-3">NBA Finals: def. ${oppTeam.name} ${score}</p>
          <p class="text-sm text-muted-fg mt-2">Regular Season: ${r.wins}–${r.losses} · Seed #${po.playerSeed}</p>
        </div>

        <div class="flex flex-col gap-3 w-full">
          <button data-action="share" class="py-3 rounded-xl font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-all cursor-pointer">
            Share Championship 🏆
          </button>
          <button data-action="draft-new-roster" class="py-3 rounded-xl font-bold text-sm border border-border bg-card text-foreground hover:border-primary/60 hover:bg-card2 transition-all cursor-pointer">
            Draft New Roster
          </button>
        </div>

      </div>
    </main>
    ${renderFooter()}
  </div>`;
}

function renderEliminated() {
  const po = S.playoffs;
  const r  = S.result;

  const lastRound = po.rounds[po.rounds.length - 1];
  const elimSr    = lastRound.find(sr => sr.teamA.isPlayer || sr.teamB.isPlayer);
  const oppTeam   = elimSr.teamA.isPlayer ? elimSr.teamB : elimSr.teamA;
  const playerW   = elimSr.teamA.isPlayer ? elimSr.playerWins : elimSr.oppWins;
  const playerL   = elimSr.teamA.isPlayer ? elimSr.oppWins : elimSr.playerWins;

  const roundSummary = po.rounds.map((round, i) => {
    const sr = round.find(s => s.teamA.isPlayer || s.teamB.isPlayer);
    if (!sr) return '';
    const opp = sr.teamA.isPlayer ? sr.teamB : sr.teamA;
    const w   = sr.teamA.isPlayer ? sr.playerWins : sr.oppWins;
    const l   = sr.teamA.isPlayer ? sr.oppWins : sr.playerWins;
    const won = w > l;
    return `<p class="text-sm ${won ? 'text-muted-fg' : 'text-red-400'}">${po.roundNames[i]}: <span class="${won ? 'text-foreground' : 'text-red-300'} font-semibold">${won ? `def. ${opp.name} ${w}–${l}` : `lost to ${opp.name} ${w}–${l}`}</span></p>`;
  }).join('');

  return `
  <div class="min-h-screen flex flex-col" style="background:#09090b">
    <main class="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div class="w-full max-w-lg flex flex-col gap-5 items-center text-center">

        <div class="text-5xl mb-2">💔</div>
        <h1 class="text-2xl font-black text-foreground">Eliminated</h1>
        <p class="text-sm text-muted-fg">in the <span class="text-foreground font-semibold">${po.eliminatedIn}</span></p>

        <div class="rounded-2xl border border-border bg-card p-5 w-full text-left">
          <p class="text-xs font-bold uppercase tracking-widest text-muted-fg mb-3">Playoff Run</p>
          ${roundSummary}
          <p class="text-sm text-muted-fg mt-3">Regular Season: ${r.wins}–${r.losses} · Seed #${po.playerSeed}</p>
        </div>

        <div class="flex flex-col gap-3 w-full">
          <button data-action="draft-new-roster" class="py-3 rounded-xl font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-all cursor-pointer">
            Draft New Roster
          </button>
          <button data-action="share" class="py-3 rounded-xl font-bold text-sm border border-border bg-card text-foreground hover:border-primary/60 hover:bg-card2 transition-all cursor-pointer">
            Share Result
          </button>
        </div>

      </div>
    </main>
    ${renderFooter()}
  </div>`;
}


// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║  BOOT                                                                       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

render();
