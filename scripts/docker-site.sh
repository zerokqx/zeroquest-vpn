#!/bin/sh
set -eu

COMPOSE_FILE="compose.site.yml"

case "${1:-up}" in
  up)
    docker compose -f "$COMPOSE_FILE" build --no-cache app
    exec docker compose -f "$COMPOSE_FILE" up -d --force-recreate app
    ;;
  down)
    exec docker compose -f "$COMPOSE_FILE" down
    ;;
  logs)
    exec docker compose -f "$COMPOSE_FILE" logs -f app
    ;;
  config)
    exec docker compose -f "$COMPOSE_FILE" config
    ;;
  *)
    echo "Usage: sh scripts/docker-site.sh [up|down|logs|config]" >&2
    exit 1
    ;;
esac
