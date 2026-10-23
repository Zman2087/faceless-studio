#!/usr/bin/env python3
"""Free, code-generated tension score for story parts: a low ambient bed that intensifies.
   python3 tools/score.py out.wav --dur 59.3 --cues 9.4:drop,39.2:hit,56.1:end [--key D] [--seed 1]
Cue kinds: drop (music cuts out ~1.2 s then a low boom), hit (boom + metallic swell), end (big hit, then a held drone to the end).
Intensity rises from start to the 'end' cue: the heartbeat pulse speeds up, a ticking clock and a rising string pad come in."""
import argparse, numpy as np
from scipy.signal import butter, sosfilt
p = argparse.ArgumentParser(); p.add_argument("out"); p.add_argument("--dur", type=float, required=True)
p.add_argument("--cues", default=""); p.add_argument("--key", default="D"); p.add_argument("--seed", type=int, default=1)
a = p.parse_args(); SR = 44100; N = int(a.dur * SR); t = np.arange(N) / SR; rng = np.random.default_rng(a.seed)
cues = [(float(c.split(":")[0]), c.split(":")[1]) for c in a.cues.split(",") if c]
end_t = next((c for c, k in cues if k == "end"), a.dur - 2)
root = {"C": 32.70, "D": 36.71, "E": 41.20, "F": 43.65, "G": 49.00, "A": 55.00, "B": 61.74}[a.key[0].upper()]
lp = lambda x, f: sosfilt(butter(2, f, "low", fs=SR, output="sos"), x)
hp = lambda x, f: sosfilt(butter(2, f, "high", fs=SR, output="sos"), x)
bp = lambda x, f1, f2: sosfilt(butter(2, [f1, f2], "band", fs=SR, output="sos"), x)
inten = np.clip(t / end_t, 0, 1) ** 1.3                     # 0 → 1 build to the vote card
saw = lambda f: 2 * ((t * f) % 1) - 1
# 1) drone: sub + detuned saws in the minor, low-passed, slow swell
drone = 0.55 * np.sin(2 * np.pi * root * t) + sum(0.18 * saw(root * 2 * m * (1 + d)) for m in (1, 1.5) for d in (-0.004, 0.0, 0.005))
drone = (lp(drone, 260) * (1 - inten) + lp(drone, 760) * inten) * (0.55 + 0.25 * np.sin(2 * np.pi * t / 9) ** 2)
# 2) heartbeat pulse: interval 1.4 s → 0.42 s
pulse = np.zeros(N); x = 0.6
def thump(at, amp):
    i = int(at * SR); L = int(0.35 * SR); k = np.arange(min(L, N - i)) / SR
    if i < N: pulse[i:i + len(k)] += amp * np.sin(2 * np.pi * (52 + 30 * np.exp(-k * 18)) * k) * np.exp(-k * 9)
while x < a.dur:
    iv = 1.4 - 0.98 * float(np.clip(x / end_t, 0, 1)); thump(x, 0.9); thump(x + 0.17, 0.5); x += max(iv, 0.42)
# 3) ticking clock from 40 % of the build
tick = np.zeros(N); x = end_t * 0.4
while x < end_t:
    i = int(x * SR); L = int(0.03 * SR); k = np.arange(min(L, N - i)); tick[i:i + len(k)] += rng.standard_normal(len(k)) * np.exp(-k / (0.004 * SR)); x += 0.5 - 0.25 * (x / end_t)
tick = bp(tick, 2500, 6000) * 0.25 * np.clip((t / end_t - 0.4) / 0.2, 0, 1)
# 4) rising string pad (minor triad, slowly sliding up a semitone) from 55 %
slide = 2 ** ((np.clip(t / end_t, 0, 1) ** 3) / 12)
pad = sum(0.12 * saw(root * 8 * r * slide * (1 + d)) for r in (1, 1.189, 1.498) for d in (-0.003, 0.003))
pad = lp(hp(pad, 200), 1800) * np.clip((t / end_t - 0.55) / 0.3, 0, 1) * (1 + 0.15 * np.sin(2 * np.pi * 5.5 * t))
# 5) noise riser into each hit / end
riser = np.zeros(N)
for c, k in cues:
    if k in ("hit", "end"):
        L = 4.0 if k == "end" else 2.5; m = (t > c - L) & (t < c); env = np.where(m, ((t - (c - L)) / L) ** 3, 0)
        riser += bp(rng.standard_normal(N), 800, 5000) * env * (0.35 if k == "end" else 0.22)
mix = drone * 0.9 + pulse * 0.55 + tick + pad + riser
# cues: drops, hits, end
def boom(at, amp):
    i = int(at * SR); k = np.arange(min(int(2.5 * SR), N - i)) / SR
    return i, amp * (np.sin(2 * np.pi * (38 + 40 * np.exp(-k * 6)) * k) * np.exp(-k * 2.2) + 0.3 * bp(rng.standard_normal(len(k)), 200, 1200) * np.exp(-k * 7))
gate = np.ones(N)
for c, k in cues:
    if k == "drop":
        a0, a1 = int(c * SR), int((c + 1.2) * SR); gate[a0:a1] = 0.0; gate[a1:a1 + int(0.8 * SR)] = np.linspace(0, 1, len(gate[a1:a1 + int(0.8 * SR)]))
mix *= gate
for c, k in cues:
    if k in ("drop", "hit", "end"):
        i, b = boom(c + (1.2 if k == "drop" else 0), 1.0 if k == "end" else 0.7); mix[i:i + len(b)] += b
    if k == "end":  # after the end hit only a held low drone, fading out
        i = int(c * SR); fade = np.ones(N); fade[i:] = 0.35 * np.linspace(1, 0.4, N - i)
        mix = mix * fade + np.where(t >= c, 0.35 * lp(drone, 200), 0)
mix[: int(0.3 * SR)] *= np.linspace(0, 1, int(0.3 * SR))
mix[-int(0.8 * SR):] *= np.linspace(1, 0, int(0.8 * SR))
st = np.stack([mix, np.roll(mix, int(0.012 * SR))], 1)  # a touch of width
st /= np.max(np.abs(st)) + 1e-9; st *= 0.89
import wave
with wave.open(a.out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype("<i2").tobytes())
print("SCORE", a.out, f"{a.dur:.1f}s", "cues", cues)
