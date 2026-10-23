#!/usr/bin/env bash
# One-command setup for Faceless Studio.
#   ./setup.sh              # install everything, run a test render, then start onboarding
#   ./setup.sh --no-test    # skip the test render
#   ./setup.sh --no-onboard # don't launch the first-channel prompt at the end
#   ./setup.sh --global-skills  # also copy the skills to ~/.claude/skills (use them in every project)
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(pwd)"

TEST=1; ONBOARD=1; GLOBAL=0
for a in "$@"; do case "$a" in
  --no-test) TEST=0;; --no-onboard) ONBOARD=0;; --global-skills) GLOBAL=1;;
  -h|--help) sed -n 2,7p "$0"; exit 0;;
esac; done

bold() { printf "\033[1m%s\033[0m\n" "$*"; }
ok()   { printf "  \033[32m✓\033[0m %s\n" "$*"; }
warn() { printf "  \033[33m!\033[0m %s\n" "$*"; }
die()  { printf "  \033[31m✗\033[0m %s\n" "$*"; exit 1; }
OS="$(uname -s)"

bold "1/6  Checking tools"
need_hint() {
  case "$1" in
    node) [ "$OS" = Darwin ] && echo "brew install node" || echo "install Node 20+ from https://nodejs.org (or: curl -fsSL https://fnm.vercel.app/install | bash && fnm install 22)";;
    ffmpeg) [ "$OS" = Darwin ] && echo "brew install ffmpeg" || echo "sudo apt-get install -y ffmpeg";;
    git) [ "$OS" = Darwin ] && echo "xcode-select --install" || echo "sudo apt-get install -y git";;
    python3) [ "$OS" = Darwin ] && echo "brew install python" || echo "sudo apt-get install -y python3 python3-pip";;
  esac
}
for t in git node npm ffmpeg; do
  command -v "$t" >/dev/null 2>&1 && ok "$t $( ($t --version 2>/dev/null || $t -version 2>/dev/null) | head -1 | cut -c1-40)" || die "$t is missing — run: $(need_hint $t)"
done
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 20 ] || die "Node $NODE_MAJOR is too old; need 20+ ($(need_hint node))"
command -v python3 >/dev/null 2>&1 && ok "python3 (optional: local caption timing with faster-whisper)" || warn "python3 not found (optional)"
if command -v claude >/dev/null 2>&1; then ok "Claude Code $(claude --version 2>/dev/null | head -1)"; else
  warn "Claude Code not found. Install it: npm install -g @anthropic-ai/claude-code   (or use the Claude desktop app with this folder)"; fi

bold "2/6  Installing the Remotion engine"
( cd remotion && npm ci --no-audit --no-fund --silent ) && ok "remotion/ dependencies installed"

bold "3/6  Downloading Remotion skills"
VENDOR="$ROOT/.vendor"; mkdir -p "$VENDOR"
fetch() { # repo dir
  if [ -d "$VENDOR/$2/.git" ]; then git -C "$VENDOR/$2" pull -q --ff-only || true; else git clone -q --depth 1 "$1" "$VENDOR/$2"; fi
}
fetch https://github.com/remotion-dev/skills remotion-skills && ok "remotion-dev/skills (Remotion best practices, captions, maps, render…)"
SK="$ROOT/.claude/skills"
for d in "$VENDOR"/remotion-skills/skills/*/; do n=$(basename "$d"); rm -rf "$SK/$n"; cp -R "$d" "$SK/$n"; done
ok "$(ls -d "$SK"/*/ | wc -l | tr -d ' ') skills ready in .claude/skills"
if [ "$GLOBAL" = 1 ]; then mkdir -p "$HOME/.claude/skills"; cp -R "$SK"/* "$HOME/.claude/skills/"; ok "also copied to ~/.claude/skills"; fi
bash scripts/package-skills.sh >/dev/null && ok "skill zips for the Claude app in dist/skills/ (Settings → Capabilities → Skills → Upload)"

bold "4/6  Connectors (MCP)"
ok ".mcp.json lists higgsfield (required) and elevenlabs (optional voice)"
echo "     Claude Code: run /mcp inside claude and authenticate each one."
echo "     Claude app:  Settings → Connectors → Add custom connector → https://mcp.higgsfield.ai/mcp"
echo "                  (ElevenLabs: https://api.elevenlabs.io/v1/mcp)"

bold "5/6  Test render"
if [ "$TEST" = 1 ]; then
  ( cd remotion && npm test --silent 2>&1 | grep -E "VIDEO|PREVIEW|done|INVALID|Error" ) && ok "rendered remotion/out/explainer.mp4 and talking-clip.mp4 — open them to see the engine" \
    || warn "test render failed — run: cd remotion && npm test   (set REMOTION_BROWSER to a Chrome path if Chrome can't download)"
else warn "skipped (--no-test)"; fi

bold "6/6  Your first channel"
node scripts/doctor.mjs --quiet || true
if [ "$ONBOARD" = 0 ]; then echo "Run 'claude' here, then type /new-channel"; exit 0; fi
if command -v claude >/dev/null 2>&1; then
  echo; echo "Starting Claude with /new-channel — it will ask you about your first channel."
  echo "(Connect Higgsfield with /mcp if it asks.)"; echo
  exec claude "/new-channel"
else
  echo; echo "Claude Code isn't installed, so here's the quick version in the terminal."
  echo "Afterwards open this folder in Claude and run /new-channel <slug> to generate the look, voice, tracker and agents."; echo
  node scripts/new-channel.mjs
fi
