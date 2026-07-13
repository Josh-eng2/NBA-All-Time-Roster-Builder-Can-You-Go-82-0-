/**
 * js/ui/shareCard.js — Canvas-rendered shareable result card
 *
 * Exports:
 *   buildShareCardBlob(data) — draws a branded PNG, resolves a Blob
 *   buildShareCaption(data)  — plain-text caption for the same result
 *
 * `data` shape (built by events.js buildResultCardData()):
 *   { wins, losses, winPct, chemScore, longestStreak, tierLabel, tierEmoji,
 *     isChampion, starters: [{ pos, name, team, decade }], dailyLabel? }
 */

const W = 1080, H = 1200;

const TIER_COLORS = {
  '🏆': { text: '#fcd34d', bg: 'rgba(251,191,36,0.16)', border: 'rgba(252,211,77,0.55)' },
  '🔥': { text: '#fbbf24', bg: 'rgba(251,191,36,0.13)', border: 'rgba(251,191,36,0.45)' },
  '⚡': { text: '#4ade80', bg: 'rgba(34,197,94,0.13)',  border: 'rgba(74,222,128,0.45)' },
  '✅': { text: '#60a5fa', bg: 'rgba(59,130,246,0.13)', border: 'rgba(96,165,250,0.45)' },
  '😬': { text: '#f87171', bg: 'rgba(239,68,68,0.13)',  border: 'rgba(248,113,113,0.45)' },
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Manual per-character advance — ctx.letterSpacing isn't supported on older
// Safari, and this project's other share/branding assets (og-image.svg) all
// use tracked-out uppercase headers, so the card needs to match that look.
function fillTextTracked(ctx, text, x, y, spacing, align = 'left') {
  const chars  = [...text];
  const widths = chars.map(ch => ctx.measureText(ch).width);
  const total  = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((ch, i) => { ctx.fillText(ch, cx, y); cx += widths[i] + spacing; });
  ctx.textAlign = prevAlign;
  return total;
}

function trackedWidth(ctx, text, spacing) {
  const chars = [...text];
  return chars.reduce((w, ch) => w + ctx.measureText(ch).width, 0) + spacing * (chars.length - 1);
}

function truncateToWidth(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1);
  return t + '…';
}

// Shared layout math for the "22 – 60" score line, used by both the auto-fit
// width probe and the actual draw so they can never drift apart. The dash
// renders at a fraction of the digit size — at full fontPx an Arial Black
// en-dash is basically a solid slab, not a readable separator.
function scoreLayout(ctx, wins, losses, fontPx) {
  const dashFontPx = Math.round(fontPx * 0.42);
  const winsText = String(wins), lossText = String(losses), dashText = '–';
  ctx.font = `900 ${fontPx}px 'Arial Black', Arial, sans-serif`;
  const wW  = ctx.measureText(winsText).width;
  const lW  = ctx.measureText(lossText).width;
  const gap = fontPx * 0.32;
  ctx.font = `900 ${dashFontPx}px 'Arial Black', Arial, sans-serif`;
  const dW  = ctx.measureText(dashText).width;
  return { winsText, lossText, dashText, wW, lW, dW, gap, dashFontPx, total: wW + gap + dW + gap + lW };
}

function measureScoreWidth(ctx, wins, losses, fontPx) {
  return scoreLayout(ctx, wins, losses, fontPx).total;
}

function drawScoreRecord(ctx, wins, losses, cx, y, fontPx, winsColor) {
  const L = scoreLayout(ctx, wins, losses, fontPx);
  let x = cx - L.total / 2;
  ctx.textAlign = 'left';

  ctx.font = `900 ${fontPx}px 'Arial Black', Arial, sans-serif`;
  ctx.fillStyle = winsColor;
  ctx.fillText(L.winsText, x, y); x += L.wW + L.gap;

  ctx.font = `900 ${L.dashFontPx}px 'Arial Black', Arial, sans-serif`;
  ctx.fillStyle = 'rgba(226,232,240,0.6)';
  ctx.fillText(L.dashText, x, y); x += L.dW + L.gap;

  ctx.font = `900 ${fontPx}px 'Arial Black', Arial, sans-serif`;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(L.lossText, x, y);
}

function drawCard(ctx, data) {
  const { wins, losses, winPct, chemScore, longestStreak, tierLabel, tierEmoji, isChampion, starters, dailyLabel } = data;
  const tc = isChampion ? TIER_COLORS['🏆'] : (TIER_COLORS[tierEmoji] || TIER_COLORS['✅']);
  const hasStreak = longestStreak >= 5;

  // ── Background ──
  const bg = ctx.createRadialGradient(W * 0.68, H * 0.3, 60, W * 0.5, H * 0.5, 1000);
  bg.addColorStop(0, '#1e293b');
  bg.addColorStop(1, '#0a1120');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(249,115,22,0.65)';
  ctx.fillRect(0, 0, W, 5);
  ctx.fillRect(0, H - 5, W, 5);

  // Fixed-height slots stacked with a running cursor, then the whole block
  // is vertically centered by choosing the starting cursor position — avoids
  // hand-tuning absolute Y coordinates for two different content heights
  // (streak chip present or not).
  const BRAND = 96, PILL = 116, SCORE = 238, META = 40;
  const GAP_META_PANEL = 26, GAP_META_STREAK = 14, STREAK = 60, GAP_STREAK_PANEL = 26;
  const PANEL_HEAD = 56, ROW_H = 50, PANEL_PAD_BOTTOM = 26, GAP_PANEL_FOOTER = 34;
  const FOOTER = 92;

  const panelH  = PANEL_HEAD + starters.length * ROW_H + PANEL_PAD_BOTTOM;
  const contentH = BRAND + PILL + SCORE + META
    + (hasStreak ? GAP_META_STREAK + STREAK + GAP_STREAK_PANEL : GAP_META_PANEL)
    + panelH + GAP_PANEL_FOOTER + FOOTER;
  let cy = Math.max(40, Math.round((H - contentH) / 2));

  // ── Brand row ──
  const brandMidY = cy + 36;
  ctx.beginPath(); ctx.arc(116, brandMidY, 36, 0, Math.PI * 2);
  ctx.fillStyle = '#243357'; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = '#f97316'; ctx.stroke();
  ctx.font = '32px Arial, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🏀', 116, brandMidY + 2);

  ctx.font = "900 28px 'Arial Black', Arial, sans-serif";
  ctx.fillStyle = '#f97316';
  fillTextTracked(ctx, 'CAN YOU GO 82-0?', 172, brandMidY, 3, 'left');

  if (dailyLabel) {
    // Fixed short badge regardless of the full caption text — dailyLabel can be
    // an arbitrary-length "Daily Challenge — Jul 13, 2026" string, which is
    // fine for the caption but would overflow this corner at title width.
    ctx.font = "900 19px 'Arial Black', Arial, sans-serif";
    ctx.fillStyle = '#93c5fd';
    fillTextTracked(ctx, '🗓️ DAILY CHALLENGE', W - 80, brandMidY, 2, 'right');
  } else if (isChampion) {
    ctx.font = "900 19px 'Arial Black', Arial, sans-serif";
    ctx.fillStyle = '#fcd34d';
    fillTextTracked(ctx, '🏆 CHAMPION', W - 80, brandMidY, 2, 'right');
  }
  cy += BRAND;

  // ── Tier pill ──
  ctx.font = "900 32px 'Arial Black', Arial, sans-serif";
  const pillText = `${tierEmoji}  ${(isChampion ? 'NBA CHAMPIONS' : tierLabel).toUpperCase()}`;
  const pillW = trackedWidth(ctx, pillText, 2) + 80;
  roundRect(ctx, W / 2 - pillW / 2, cy, pillW, 76, 38);
  ctx.fillStyle = tc.bg; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = tc.border; ctx.stroke();
  ctx.fillStyle = tc.text;
  ctx.textBaseline = 'middle';
  fillTextTracked(ctx, pillText, W / 2, cy + 76 / 2 + 2, 2, 'center');
  cy += PILL;

  // ── Score ──
  let fontPx = 220;
  while (measureScoreWidth(ctx, wins, losses, fontPx) > 900 && fontPx > 120) fontPx -= 8;
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 8;
  ctx.textBaseline = 'middle';
  drawScoreRecord(ctx, wins, losses, W / 2, cy + SCORE / 2, fontPx, tc.text);
  ctx.shadowColor = 'transparent'; ctx.shadowOffsetY = 0;
  cy += SCORE;

  // ── Meta line ──
  ctx.font = '600 27px Arial, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const metaBits = [`Win% ${winPct}%`, chemScore != null ? `Chemistry ${Math.round(chemScore)}%` : null].filter(Boolean);
  ctx.fillText(metaBits.join('    ·    '), W / 2, cy + META / 2);
  cy += META;

  // ── Streak chip (only when the run actually had a notable streak) ──
  if (hasStreak) {
    cy += GAP_META_STREAK;
    const streakText = `🔥 ${longestStreak}-GAME WIN STREAK`;
    ctx.font = "900 23px 'Arial Black', Arial, sans-serif";
    const sw = trackedWidth(ctx, streakText, 1.5) + 56;
    roundRect(ctx, W / 2 - sw / 2, cy, sw, STREAK, STREAK / 2);
    ctx.fillStyle = 'rgba(239,68,68,0.14)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(248,113,113,0.5)'; ctx.stroke();
    ctx.fillStyle = '#f87171'; ctx.textBaseline = 'middle';
    fillTextTracked(ctx, streakText, W / 2, cy + STREAK / 2 + 1, 1.5, 'center');
    cy += STREAK + GAP_STREAK_PANEL;
  } else {
    cy += GAP_META_PANEL;
  }

  // ── Starters panel ──
  const panelX = 90, panelW = W - 180;
  roundRect(ctx, panelX, cy, panelW, panelH, 26);
  ctx.fillStyle = 'rgba(255,255,255,0.045)'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(249,115,22,0.28)'; ctx.stroke();

  ctx.font = "900 21px 'Arial Black', Arial, sans-serif";
  ctx.fillStyle = '#f97316';
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  fillTextTracked(ctx, 'STARTING FIVE', panelX + 40, cy + 38, 3, 'left');
  ctx.strokeStyle = 'rgba(148,163,184,0.18)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(panelX + 40, cy + 56); ctx.lineTo(panelX + panelW - 40, cy + 56); ctx.stroke();

  let rowY = cy + PANEL_HEAD + ROW_H / 2;
  starters.forEach(s => {
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '900 21px Arial, sans-serif';
    ctx.fillStyle = '#f97316';
    ctx.fillText(s.pos, panelX + 40, rowY);

    const teamLabel = [s.team, s.decade].filter(Boolean).join(' ');
    ctx.font = '500 21px Arial, sans-serif';
    const teamW = teamLabel ? ctx.measureText(teamLabel).width : 0;
    const nameMaxW = panelW - 80 - 108 - (teamW ? teamW + 28 : 0);

    ctx.font = '700 29px Arial, sans-serif';
    ctx.fillStyle = '#f1f5f9';
    ctx.fillText(truncateToWidth(ctx, s.name, nameMaxW), panelX + 108, rowY);

    if (teamLabel) {
      ctx.font = '500 21px Arial, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'right';
      ctx.fillText(teamLabel, panelX + panelW - 40, rowY);
    }
    rowY += ROW_H;
  });
  cy += panelH + GAP_PANEL_FOOTER;

  // ── Footer ──
  ctx.strokeStyle = 'rgba(249,115,22,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(panelX, cy); ctx.lineTo(panelX + panelW, cy); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = "900 29px 'Arial Black', Arial, sans-serif";
  ctx.fillStyle = '#f5efe1';
  fillTextTracked(ctx, 'canyougo820.com', W / 2, cy + 44, 2, 'center');
  ctx.font = '500 19px Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Can you beat this record? Play free →', W / 2, cy + 72);
}

/** @returns {Promise<Blob>} a PNG blob of the rendered result card */
export function buildShareCardBlob(data) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Canvas unavailable'));
  drawCard(ctx, data);
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

/** @returns {string} plain-text caption to pair with the image (or stand alone) */
export function buildShareCaption(data) {
  const { wins, losses, tierLabel, tierEmoji, chemScore, isChampion, starters, dailyLabel } = data;
  const headline = isChampion
    ? `🏆 ${wins}-${losses} — NBA CHAMPIONS`
    : `${tierEmoji} ${wins}-${losses} — ${tierLabel}`;
  const starterLines = starters
    .map(s => `🌟 ${s.name}${s.team ? ` (${[s.team, s.decade].filter(Boolean).join(' ')})` : ''}`)
    .join('\n');
  const chemLine = chemScore != null ? `\nChemistry: ${Math.round(chemScore)}%` : '';
  return [
    dailyLabel || null,
    headline,
    '',
    'Starting 5:',
    starterLines,
    chemLine,
    '',
    'Can you beat it? → canyougo820.com',
  ].filter(l => l !== null).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
