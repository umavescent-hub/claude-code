#!/usr/bin/env python3
"""Beat math for the multilayer-music-edit skill.

usage: python3 beats.py BPM FPS SECONDS [OFFSET] [--every]

Prints the grid, the note lengths in whole frames, the 3 s law in beats, and
one marker row per downbeat (every beat with --every): bar.beat, beat index
(0 = the first downbeat), seconds, frame, timecode m:ss:ff.

Every frame is computed from its beat index, frame(n) = round(n * fps * 60 / bpm),
never by adding rounded beat lengths, so nothing drifts. Rounding is half up,
the same as the tables in reference.md.
"""

import math
import sys


def frame_at(n, bpm, fps, offset=0.0):
    return math.floor((offset + n * 60 / bpm) * fps + 0.5)


def timecode(frames, fps):
    s, ff = divmod(frames, fps)
    m, s = divmod(s, 60)
    return f"{m}:{s:02d}:{ff:02d}"


def bar_beat(n):
    return f"{int(n) // 4 + 1}.{int(n) % 4 + 1}"


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    every = "--every" in argv
    if len(args) < 3:
        sys.exit(__doc__.strip())
    bpm, fps, seconds = float(args[0]), int(args[1]), float(args[2])
    offset = float(args[3]) if len(args) > 3 else 0.0
    if bpm <= 0 or fps <= 0 or seconds <= 0:
        sys.exit("BPM, fps and seconds must be above 0")
    beat = 60 / bpm
    fpb = fps * beat
    total = int(math.floor((seconds - offset) / beat + 1e-9))
    bpm_txt = f"{bpm:g}"
    print(
        f"grid: {bpm_txt} BPM · {fps} fps · 1 beat = {beat:.3f} s = {fpb:.2f} frames"
        f" · bar = {4 * beat:.3f} s · offset {offset:.2f} s"
    )
    notes = [("1/4", 0.25), ("1/2", 0.5), ("beat", 1), ("2 beats", 2), ("bar", 4), ("2 bars", 8)]
    print("frames: " + " · ".join(f"{k} {math.floor(v * fpb + 0.5)}" for k, v in notes))
    law = int(math.floor(3 / beat + 1e-9))
    holds = [n for n in range(1, 17) if 3 - 1e-9 <= n * beat <= 5 + 1e-9]
    print(
        f"3 s law: {law} beats max between changes ({law * beat:.2f} s)"
        f" · Lunar hold 3–5 s: beats {', '.join(map(str, holds)) or 'none'}"
    )
    print(f"{total} whole beats fit in {seconds:g} s; the last downbeat is beat {total - total % 4}")
    print()
    print("| Bar.beat | Beat # | Seconds | Frame | TC |")
    print("| --- | --- | --- | --- | --- |")
    step = 1 if every else 4
    rows = list(range(0, total + 1, step))
    if rows[-1] != total:
        rows.append(total)
    for n in rows:
        label = "end" if n == total and total % 4 else bar_beat(n)
        f = frame_at(n, bpm, fps, offset)
        t = offset + n * beat
        print(f"| {label} | {n} | {t:.2f} | {f} | {timecode(f, fps)} |")


if __name__ == "__main__":
    main(sys.argv[1:])
