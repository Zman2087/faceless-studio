#!/usr/bin/env bash
# Zip every skill in .claude/skills into dist/skills/<name>.zip
# so it can be uploaded to the Claude app (Settings → Capabilities → Skills → Upload skill).
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p dist/skills
for d in .claude/skills/*/; do
  n=$(basename "$d"); [ -f "$d/SKILL.md" ] || continue
  rm -f "dist/skills/$n.zip"
  ( cd .claude/skills && zip -qr "../../dist/skills/$n.zip" "$n" -x "*/node_modules/*" "*/.git/*" "*.mp4" "*.mov" )
  echo "SKILL $n -> dist/skills/$n.zip"
done
