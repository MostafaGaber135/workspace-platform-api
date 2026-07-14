#!/usr/bin/env bash
#
# Produce a clean source archive of the repository.
#
# Excludes dependencies, build outputs, coverage, generated reports, VCS
# metadata, and — importantly — every real environment file (only *.env.example
# templates are kept). Prefers `git archive` when the tree is a git repo, since
# it inherently respects .gitignore and never ships untracked artifacts; falls
# back to a hardened `tar` otherwise.
#
# Usage: ./scripts/archive.sh [output-file.tar.gz]

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT="${1:-developeros-source.tar.gz}"

cd "$ROOT_DIR"

if git rev-parse --verify HEAD >/dev/null 2>&1; then
  # git archive only includes tracked files; env files are gitignored so they
  # are never included. Guarantees no node_modules/dist/.next/.env leakage.
  git archive --format=tar.gz --prefix=developeros/ -o "$OUTPUT" HEAD
  echo "Created $OUTPUT via git archive (tracked files only)."
else
  tar \
    --exclude-vcs \
    --exclude='./.git' \
    --exclude='*/node_modules' \
    --exclude='./node_modules' \
    --exclude='*/dist' \
    --exclude='*/.next' \
    --exclude='*/.turbo' \
    --exclude='./.turbo' \
    --exclude='*/coverage' \
    --exclude='*/playwright-report' \
    --exclude='*/test-results' \
    --exclude='*.tsbuildinfo' \
    --exclude='**/.env' \
    --exclude='**/.env.local' \
    --exclude='**/.env.*.local' \
    --exclude='**/.env.development' \
    --exclude='**/.env.production' \
    --exclude='**/.env.test' \
    -czf "$OUTPUT" \
    --transform='s,^\.,developeros,' \
    .
  echo "Created $OUTPUT via tar (hardened excludes)."
fi
