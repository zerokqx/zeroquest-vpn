#!/bin/sh
set -eu

echo "Waiting for Postgres..."
until bun run scripts/init-db.ts >/tmp/vpn-shop-init.log 2>&1; do
  cat /tmp/vpn-shop-init.log
  echo "Postgres is not ready yet, retrying in 2s..."
  sleep 2
done
cat /tmp/vpn-shop-init.log

echo "Seeding database..."
bun run scripts/seed.ts

APP_PORT="${PORT:-3000}"

echo "Starting app on 0.0.0.0:${APP_PORT}..."
exec bunx next start --hostname 0.0.0.0 --port "${APP_PORT}"
