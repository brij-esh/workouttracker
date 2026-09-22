#!/usr/bin/env bash
set -euo pipefail
export PATH="/root/.local/bin:$PATH"
cd /mnt/c/Projects/workout-tracker

git add -A

if git diff --cached --name-only | grep -qi 'service-account'; then
  echo "ERROR: service-account file still staged" >&2
  exit 1
fi

if git diff --cached --name-only | grep -E '\.env$' >/dev/null; then
  echo "ERROR: .env file still staged" >&2
  exit 1
fi

git -c user.email="workout-tracker@local" -c user.name="Workout Tracker" commit -m "Initial commit"
echo "COMMIT_OK"
git log -1 --oneline

# Create Cursor-hosted repo and push
CREATE_OUT=$(origin repo create workout-tracker 2>&1) || {
  echo "$CREATE_OUT"
  # retry with alternate name if taken
  CREATE_OUT=$(origin repo create workout-tracker-app 2>&1) || {
    echo "$CREATE_OUT"
    exit 1
  }
}
echo "$CREATE_OUT"

# Extract clone URL from create output
CLONE_URL=$(echo "$CREATE_OUT" | grep -Eo 'https://origin\.cursor\.com[^[:space:]]+' | head -1)
if [ -z "$CLONE_URL" ]; then
  echo "Could not parse clone URL from create output" >&2
  exit 1
fi
echo "CLONE_URL=$CLONE_URL"

git remote remove origin 2>/dev/null || true
git remote add origin "$CLONE_URL"
git push -u origin main
echo "PUSH_OK"
git remote -v
