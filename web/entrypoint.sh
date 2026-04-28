#!/bin/sh
set -e

# node_modules live in a named volume mounted at /app/node_modules.
# On first `docker compose up` the volume is empty — install deps now.
if [ ! -f /app/node_modules/.bin/next ]; then
  echo "[web] node_modules missing — running npm install..."
  cd /app
  npm install --legacy-peer-deps
  echo "[web] npm install done."
fi

exec "$@"
