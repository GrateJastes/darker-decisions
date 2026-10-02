#!/usr/bin/env bash
set -euo pipefail

TARGET="${DEPLOY_TARGET:?set DEPLOY_TARGET to the rsync destination, e.g. user@host:/path/}"
SITE="${DEPLOY_SITE:-https://darker-decisions.com}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$REPO"

echo "==> [1/3] checking and building"
pnpm check
pnpm build

echo "==> [2/3] syncing dist/ to $TARGET"
rsync -rlt --delete --chmod=D755,F644 -e "ssh -o BatchMode=yes -o ConnectTimeout=8" dist/ "$TARGET"

echo "==> [3/3] verifying $SITE"
ENTRY="$(grep -o '/assets/index-[^"]*\.js' dist/index.html | head -n1)"
SEEN=""
for _ in 1 2 3 4 5 6; do
  if curl -fs -m 15 "$SITE/" | grep -qF "$ENTRY"; then
    SEEN="yes"
    break
  fi
  sleep 5
done
if [ -z "$SEEN" ]; then
  echo "!! $SITE/ does not reference $ENTRY" >&2
  exit 1
fi
for path in "$ENTRY" /mdb-vs-magpen; do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' -m 15 "$SITE$path")"
  if [ "$CODE" != "200" ]; then
    echo "!! $SITE$path returned $CODE" >&2
    exit 1
  fi
done
echo "OK — $SITE serving $ENTRY"
