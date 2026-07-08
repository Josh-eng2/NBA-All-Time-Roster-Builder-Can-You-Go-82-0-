#!/usr/bin/env bash
# Rasterizes og-image.svg into the 1200x630 og-image.png referenced by the
# og:image / twitter:image meta tags (social crawlers don't render SVG).
# Requires a Chromium/Chrome binary; pass its path as $1 or have `chromium`
# on PATH. Re-run after editing og-image.svg.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="${1:-$(command -v chromium || command -v chromium-browser || command -v google-chrome)}"

cat > _og_tmp.html <<'HTML'
<!DOCTYPE html><html><head><style>*{margin:0;padding:0}body{width:1200px;height:630px;overflow:hidden}img{display:block;width:1200px;height:630px}</style></head>
<body><img src="og-image.svg"></body></html>
HTML
trap 'rm -f _og_tmp.html' EXIT

"$CHROME" --headless --no-sandbox --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 \
  --screenshot="$(pwd)/og-image.png" "file://$(pwd)/_og_tmp.html"

echo "Wrote og-image.png ($(du -h og-image.png | cut -f1))"
