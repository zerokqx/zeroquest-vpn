#!/usr/bin/env bash
set -euo pipefail

if [ -z "${PRISMA_SCHEMA_ENGINE_BINARY:-}" ]; then
  if [ -x "/nix/store/zkzscr40ghn5hfkaqccbrq0ihl7vyal7-devenv-profile/bin/schema-engine" ]; then
    export PRISMA_SCHEMA_ENGINE_BINARY="/nix/store/zkzscr40ghn5hfkaqccbrq0ihl7vyal7-devenv-profile/bin/schema-engine"
  else
    DETECTED_SCHEMA_ENGINE="$(find /nix/store -path '*/bin/schema-engine' 2>/dev/null | tail -n 1 || true)"

    if [ -n "${DETECTED_SCHEMA_ENGINE}" ]; then
      export PRISMA_SCHEMA_ENGINE_BINARY="${DETECTED_SCHEMA_ENGINE}"
    fi
  fi
fi

if [ -n "${PRISMA_SCHEMA_ENGINE_BINARY:-}" ]; then
  export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
fi

exec ./node_modules/.bin/prisma "$@"
