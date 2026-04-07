#!/bin/sh
set -eu

COMPOSE_FILE="compose.db.yml"

case "${1:-up}" in
  up)
    exec docker compose -f "$COMPOSE_FILE" up -d
    ;;
  down)
    exec docker compose -f "$COMPOSE_FILE" down
    ;;
  logs)
    exec docker compose -f "$COMPOSE_FILE" logs -f postgres
    ;;
  config)
    exec docker compose -f "$COMPOSE_FILE" config
    ;;
  *)
    echo "Usage: sh scripts/docker-db.sh [up|down|logs|config]" >&2
    exit 1
    ;;
esac
