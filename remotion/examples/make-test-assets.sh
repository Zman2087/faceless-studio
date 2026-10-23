#!/usr/bin/env bash
# Makes stand-in media for the example specs (so `npm test` works before you have any real clips).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p assets
[ -s assets/stand-in-clip.mp4 ] || ffmpeg -y -loglevel error -f lavfi -i "testsrc2=size=1080x1920:rate=30:duration=8" \
  -f lavfi -i "sine=frequency=220:duration=8" -shortest -c:v libx264 -pix_fmt yuv420p -c:a aac assets/stand-in-clip.mp4
[ -s assets/stand-in-photo.jpg ] || ffmpeg -y -loglevel error -f lavfi -i "gradients=size=1080x1920:duration=1:c0=0x1d3b6e:c1=0x0b1530" -frames:v 1 assets/stand-in-photo.jpg
[ -s assets/stand-in-voice.mp3 ] || ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=180:duration=10" -af "volume=0.15" assets/stand-in-voice.mp3
echo "test assets ready"
