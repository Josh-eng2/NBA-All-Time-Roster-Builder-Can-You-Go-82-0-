#!/usr/bin/env bash
# Regenerates css/tailwind.css (the committed static Tailwind build) from
# tailwind.config.js + css/tailwind.in.css, scanning index.html and js/**.
#
# Run after adding/removing Tailwind classes anywhere in the app:
#   bash scripts/build_tailwind.sh
#
# Uses npx (no package.json needed — same "generated file is committed"
# pattern as scripts/inline_players.js). Pinned to Tailwind v3 to match
# the behavior of the old cdn.tailwindcss.com runtime this replaced.
set -e
cd "$(dirname "$0")/.."
npx -y tailwindcss@3.4.17 -c tailwind.config.js -i css/tailwind.in.css -o css/tailwind.css --minify
ls -la css/tailwind.css
