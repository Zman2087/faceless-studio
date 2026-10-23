#!/usr/bin/env bash
# Makes stand-in media for the example specs (so `npm test` works before you have any real clips).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p assets
[ -s assets/stand-in-clip.mp4 ] || ffmpeg -y -loglevel error -f lavfi -i "testsrc2=size=1080x1920:rate=30:duration=8" \
  -f lavfi -i "sine=frequency=220:duration=8" -shortest -c:v libx264 -pix_fmt yuv420p -c:a aac assets/stand-in-clip.mp4
[ -s assets/stand-in-photo.jpg ] || ffmpeg -y -loglevel error -f lavfi -i "gradients=size=1080x1920:duration=1:c0=0x1d3b6e:c1=0x0b1530" -frames:v 1 assets/stand-in-photo.jpg
[ -s assets/stand-in-voice.mp3 ] || ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=180:duration=10" -af "volume=0.15" assets/stand-in-voice.mp3
# illustrated parts: a soft rain/city ambience and a low drone music bed (stand-ins for the asset library)
[ -s assets/stand-in-ambience.mp3 ] || ffmpeg -y -loglevel error -f lavfi -i "anoisesrc=color=pink:duration=12:amplitude=0.6" -af "lowpass=f=1800,highpass=f=120,volume=0.8" assets/stand-in-ambience.mp3
[ -s assets/stand-in-music.mp3 ] || ffmpeg -y -loglevel error -f lavfi -i "sine=frequency=55:duration=12" -f lavfi -i "sine=frequency=82.4:duration=12" -f lavfi -i "sine=frequency=110:duration=12" \
  -filter_complex "[0][1][2]amix=inputs=3,tremolo=f=0.25:d=0.5,volume=1.5" assets/stand-in-music.mp3
echo "test assets ready"
