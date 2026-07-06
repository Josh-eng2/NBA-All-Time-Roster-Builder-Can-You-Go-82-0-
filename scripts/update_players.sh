#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
node scripts/add_popularity.js
node scripts/add_rating.js
node scripts/inline_players.js
