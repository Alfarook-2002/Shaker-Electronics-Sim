#!/usr/bin/env bash
set -euo pipefail

flavor=${1:-}
if [[ "$flavor" != "dev" && "$flavor" != "release" ]]; then
  echo "Usage: $0 <dev|release>" >&2
  exit 2
fi

if [[ ! -d site ]]; then
  echo "site/ does not exist; build the site before finalizing it." >&2
  exit 1
fi

echo "No $flavor-specific finalization is needed yet."
