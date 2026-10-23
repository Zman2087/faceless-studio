#!/usr/bin/env bash
# Join rendered blocks (same size/fps) into one video, re-encoding so cuts are clean.
#   tools/stitch.sh out.mp4 block01.mp4 block02.mp4 ...
set -euo pipefail
out="$1"; shift
list=$(mktemp); for f in "$@"; do echo "file '$(realpath "$f")'" >> "$list"; done
ffmpeg -y -loglevel error -f concat -safe 0 -i "$list" -c:v libx264 -pix_fmt yuv420p -r 30 -c:a aac -ar 48000 -movflags +faststart "$out"
rm -f "$list"; echo "STITCHED $out"
