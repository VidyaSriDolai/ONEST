#!/usr/bin/env bash
# Render postdeploy: apply migrations and seed demo data on the production
# database. Idempotent — safe on every deploy.
#
# The committed migration SQL is provider-neutral (TEXT/BOOLEAN/INTEGER +
# CURRENT_TIMESTAMP), so PostgreSQL accepts it unchanged. The seed script
# upserts by unique keys, so re-running it on an existing database never
# duplicates records.
set -euo pipefail

cd "$(dirname "$0")/.." # apps/api

npx prisma migrate deploy
echo "postdeploy: migrations applied"

npm run db:seed
echo "postdeploy: seed complete"
