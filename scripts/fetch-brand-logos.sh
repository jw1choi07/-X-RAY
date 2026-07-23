#!/usr/bin/env bash
# Downloads each featured site's own favicon from its real domain into
# public/logos/<site.id>.ico, used by BrandMark in floating-sites-section.tsx
# instead of an emoji placeholder. Re-run after adding a new FEATURED_SITES
# entry or if a brand refreshes its favicon.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/logos

declare -A urls=(
  [kakaot]="https://kakaomobility.com/favicon.ico"
  [melon]="https://www.melon.com/favicon.ico"
  [toss]="https://toss.im/favicon.ico"
  [netflix]="https://www.netflix.com/favicon.ico"
  [spotify]="https://www.spotify.com/favicon.ico"
)

for id in "${!urls[@]}"; do
  url="${urls[$id]}"
  echo "fetching $id from $url"
  curl -sL -A "Mozilla/5.0" -o "public/logos/${id}.ico" "$url"
done
