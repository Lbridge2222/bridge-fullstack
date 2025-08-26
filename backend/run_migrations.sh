#!/usr/bin/env bash
# macOS-friendly, POSIX-leaning script (no GNU-only flags)
set -e
set -u
set -o pipefail

# Check if DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
  echo "Error: DATABASE_URL environment variable is not set"
  echo "Please set it first: export DATABASE_URL='your_connection_string'"
  exit 1
fi

echo "Discovering migrations in db/migrations ..."
# Use shell globbing and regular sort (filenames are zero-padded, so lex sort works)
MIGRATIONS_LIST=$(ls -1 db/migrations/*.sql 2>/dev/null | sort)

if [ -z "$MIGRATIONS_LIST" ]; then
  echo "No migration files found in db/migrations"; exit 1
fi

echo "Migrations to run (in order):"
echo "$MIGRATIONS_LIST" | sed 's/^/ - /'

# Fix: Use here-string instead of pipe to avoid subshell issues
# This ensures set -e works properly and errors are caught
while IFS= read -r f; do
  [ -z "$f" ] && continue
  echo "Running $(basename "$f") ..."
  
  # Run migration with proper error handling
  if psql -v ON_ERROR_STOP=1 "$DATABASE_URL" -f "$f"; then
    echo "✅ $(basename "$f") completed successfully"
  else
    echo "❌ $(basename "$f") failed with exit code $?"
    echo "Stopping migrations due to error"
    exit 1
  fi
done <<< "$MIGRATIONS_LIST"

echo "Refreshing materialized views (best-effort)..."
# Try CONCURRENTLY first; fallback to non-concurrent; ignore if views don't exist
psql "$DATABASE_URL" -c "refresh materialized view concurrently vw_board_applications;" 2>/dev/null || \
psql "$DATABASE_URL" -c "refresh materialized view vw_board_applications;" 2>/dev/null || true

psql "$DATABASE_URL" -c "refresh materialized view concurrently vw_people_enriched;" 2>/dev/null || \
psql "$DATABASE_URL" -c "refresh materialized view vw_people_enriched;" 2>/dev/null || true

echo "🎉 All migrations completed successfully!"
