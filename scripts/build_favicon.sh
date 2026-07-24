#!/usr/bin/env bash
# Rasterizes favicon.svg into favicon.ico (16/32/48px, PNG-in-ICO) so search
# engines and crawlers that don't support SVG favicons — Google Search's
# favicon fetcher included — have a supported fallback at the conventional
# /favicon.ico location. Re-run after editing favicon.svg.
# Requires a Chromium/Chrome binary; pass its path as $1 or have `chromium`
# on PATH.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="${1:-$(command -v chromium || command -v chromium-browser || command -v google-chrome)}"
SIZES=(16 32 48)

TMPDIR="$(mktemp -d)"
trap 'rm -rf "$TMPDIR"' EXIT

cat > "$TMPDIR/render.html" <<HTML
<!DOCTYPE html><html><head><style>
html,body{margin:0;padding:0;background:transparent}
img{display:block;width:100vw;height:100vh}
</style></head><body><img src="$(pwd)/favicon.svg"></body></html>
HTML

for SIZE in "${SIZES[@]}"; do
  "$CHROME" --headless --no-sandbox --disable-gpu \
    --window-size="${SIZE},${SIZE}" \
    --default-background-color=00000000 \
    --screenshot="$TMPDIR/favicon-${SIZE}.png" \
    "file://$TMPDIR/render.html" >/dev/null 2>&1
done

node - "$TMPDIR" "${SIZES[@]}" <<'NODE'
const fs = require('fs');
const path = require('path');

const [dir, ...sizeArgs] = process.argv.slice(2);
const sizes = sizeArgs.map(Number);
const pngBuffers = sizes.map(s => fs.readFileSync(path.join(dir, `favicon-${s}.png`)));

pngBuffers.forEach((buf, i) => {
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  if (w !== sizes[i] || h !== sizes[i]) {
    throw new Error(`favicon-${sizes[i]}.png reports ${w}x${h}, expected ${sizes[i]}x${sizes[i]}`);
  }
});

const headerSize = 6 + 16 * pngBuffers.length;
let offset = headerSize;
const dirEntries = [];
sizes.forEach((s, i) => {
  const data = pngBuffers[i];
  const entry = Buffer.alloc(16);
  entry.writeUInt8(s === 256 ? 0 : s, 0);
  entry.writeUInt8(s === 256 ? 0 : s, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(data.length, 8);
  entry.writeUInt32LE(offset, 12);
  dirEntries.push(entry);
  offset += data.length;
});

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngBuffers.length, 4);

fs.writeFileSync('favicon.ico', Buffer.concat([header, ...dirEntries, ...pngBuffers]));
NODE

echo "Wrote favicon.ico ($(du -h favicon.ico | cut -f1), sizes: ${SIZES[*]})"
