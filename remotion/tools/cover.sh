#!/usr/bin/env bash
# Grab a 1080x1920 cover frame from a video (default 1.2 s in).
#   tools/cover.sh video.mp4 cover.png [seconds]
set -euo pipefail
ffmpeg -y -loglevel error -ss "${3:-1.2}" -i "$1" -frames:v 1 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" "$2"
echo "COVER $2"
