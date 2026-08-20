#!/usr/bin/env bash
# purge-git-history.sh — remove a secret that was accidentally committed.
#
# IMPORTANT: rewriting history does NOT undo exposure. If a real secret (API
# key, password, token) was ever pushed to a remote, treat it as compromised
# and ROTATE IT first — revoke/reissue in the provider's dashboard — then use
# this script to clean the repo so it stops showing up in clones/CI logs.
set -euo pipefail

if ! command -v git-filter-repo >/dev/null 2>&1; then
  echo "Install git-filter-repo first: pip install --break-system-packages git-filter-repo"
  exit 1
fi

# Example: purge a specific file that held secrets (e.g. an old .env commit)
# git filter-repo --path backend/.env --invert-paths

# Example: purge a specific known secret string wherever it appears
# echo 'REPLACE_WITH_LEAKED_SECRET==>REDACTED' > /tmp/replacements.txt
# git filter-repo --replace-text /tmp/replacements.txt

echo "Edit this script to target the specific file or string to purge, then:"
echo "  1. git filter-repo ... (rewrite local history)"
echo "  2. git push --force --all && git push --force --tags"
echo "  3. Have every collaborator re-clone (their old clones still have the secret)"
echo "  4. Confirm the leaked secret was ROTATED, not just deleted from history"
