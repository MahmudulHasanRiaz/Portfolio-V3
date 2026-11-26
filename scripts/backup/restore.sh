#!/usr/bin/env bash
# Restore a Portfolio V3 database backup (pg_dump custom format) into a
# target Postgres database.
#
# Usage:
#   scripts/backup/restore.sh <dump-file> <target-database-url> [--yes]
#
# The target is usually a FRESH database (a new Neon branch, or a local
# Postgres) — pg_restore --clean drops existing objects first, so NEVER
# point it at production unless you mean to replace the data. The script
# prints the target host (password masked) and refuses to run without
# --yes, so a stray invocation cannot wipe anything.
#
# Requires: pg_restore (PostgreSQL client 18+, same major or newer than
# the server the dump came from).
set -euo pipefail

DUMP="${1:-}"
TARGET="${2:-}"
CONFIRM="${3:-}"

if [ -z "$DUMP" ] || [ -z "$TARGET" ]; then
  echo "usage: restore.sh <dump-file> <target-database-url> [--yes]" >&2
  exit 2
fi
if [ ! -f "$DUMP" ]; then
  echo "error: dump file not found: $DUMP" >&2
  exit 2
fi

# Show the target host (password masked) before touching anything.
HOST="$(printf '%s' "$TARGET" | sed -E 's#^postgres(ql)?://[^@]*@#postgres://***@#')"
echo "Dump:   $DUMP"
echo "Target: $HOST"
echo "This REPLACES the target database's objects (--clean --if-exists)."
if [ "$CONFIRM" != "--yes" ]; then
  echo "Refusing to run without --yes. Re-run with --yes to confirm." >&2
  exit 1
fi

# --no-owner --no-acl: the dump was taken with the same flags, so objects
# land owned by the restoring user instead of the original roles.
pg_restore -d "$TARGET" --clean --if-exists --no-owner --no-acl --exit-on-error "$DUMP"
echo "Restore complete."
