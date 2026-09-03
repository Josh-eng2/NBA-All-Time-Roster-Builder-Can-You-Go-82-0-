#!/usr/bin/env bash
# Rasterizes og-image.html into the 1200x630 og-image.png referenced by the
# og:image / twitter:image meta tags (social crawlers don't render SVG or
# HTML, only the PNG). Requires a Chromium/Chrome binary; pass its path as $1
# or have `chromium` on PATH. Re-run after editing og-image.html.
#
# The card is a full HTML page rather than a lone SVG because the crest is
# raster artwork and Chromium will not decode an SVG that wraps a raster
# <image>; og-image.html layers logo-crest.png over the same inline SVG that
# draws the background and every piece of type.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="${1:-$(command -v chromium || command -v chromium-browser || command -v google-chrome)}"

"$CHROME" --headless --no-sandbox --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=1200,630 \
  --screenshot="$(pwd)/og-image.png" "file://$(pwd)/og-image.html"

echo "Wrote og-image.png ($(du -h og-image.png | cut -f1))"
