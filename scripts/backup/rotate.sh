#!/usr/bin/env bash
# Retention for R2 database backups: keep the newest N objects under a
# prefix, delete the rest. Used by .github/workflows/backup-db.yml.
#
# Usage: rotate.sh <bucket> <prefix> <keep-count>
#   e.g. rotate.sh portfolio-v3-backups backups/db 30
#
# Requires: aws CLI (v2) and jq (both preinstalled on GitHub-hosted
# Ubuntu runners) with R2 credentials in env (AWS_ACCESS_KEY_ID /
# AWS_SECRET_ACCESS_KEY). The endpoint defaults to this account's R2
# S3 endpoint; override with R2_ENDPOINT_URL.
set -euo pipefail

BUCKET="${1:?usage: rotate.sh <bucket> <prefix> <keep-count>}"
PREFIX="${2:?usage: rotate.sh <bucket> <prefix> <keep-count>}"
KEEP="${3:?usage: rotate.sh <bucket> <prefix> <keep-count>}"
ENDPOINT="${R2_ENDPOINT_URL:-https://b5c9281cd6a0b13348413d683a2bcc31.r2.cloudflarestorage.com}"

# Keys sorted oldest-first (daily names sort chronologically:
# backups/db/portfolio-YYYY-MM-DD.dump). An empty prefix yields no keys.
RAW="$(aws s3api list-objects-v2 --bucket "$BUCKET" --prefix "$PREFIX/" \
  --endpoint-url "$ENDPOINT" --max-items 1000 \
  --query 'Contents[].Key' --output text)"
mapfile -t KEYS < <(printf '%s' "$RAW" | tr '\t' '\n' | grep -v '^$' | sort)

TOTAL="${#KEYS[@]}"
if [ "$TOTAL" -le "$KEEP" ]; then
  echo "Retention: $TOTAL object(s), keeping all (keep=$KEEP). Nothing to delete."
  exit 0
fi

DELETE_COUNT=$((TOTAL - KEEP))
echo "Retention: $TOTAL object(s), keeping newest $KEEP, deleting $DELETE_COUNT:"
TO_DELETE=("${KEYS[@]:0:$DELETE_COUNT}")
printf '  %s\n' "${TO_DELETE[@]}"

# Build the delete-objects JSON payload with jq.
DELETE_JSON="$(printf '%s\n' "${TO_DELETE[@]}" | jq -R . | jq -s '{Objects: map({Key: .})}')"
aws s3api delete-objects --bucket "$BUCKET" --endpoint-url "$ENDPOINT" \
  --delete "$DELETE_JSON" --query 'Deleted[].Key' --output text
