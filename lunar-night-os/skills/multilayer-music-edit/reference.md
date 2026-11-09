# Multi-layer music edit: reference

These are the deep tables behind SKILL.md. Every beat number here was computed by a script: beat = 60 ÷ BPM, and frame = round(beat index × fps × 60 ÷ BPM). Every CapCut path marked **Verify** comes from research that couldn't be checked against CapCut's own pages, so check it on the device.

Contents:

1. Beat tables
2. Three 30 s templates (92, 120 and 140 BPM)
3. Blend-mode cheat sheet
4. VHS recipe
5. Grade routes per style
6. Tap library: Mobile and Desktop
7. 15-minute verify checklist
8. Full beat table, 70–180 BPM

## 1. Beat tables

### 1a. Note lengths in whole frames

These are ready to cut. For a run of cuts, compute each cut from its beat index. Don't add these rounded lengths together.

At 24 fps (Lunar Night, docs):

| BPM | ¼ beat | ½ beat | beat | 2 beats | bar | 2 bars |
| --- | --- | --- | --- | --- | --- | --- |
| 80 | 5 | 9 | 18 | 36 | 72 | 144 |
| 90 | 4 | 8 | 16 | 32 | 64 | 128 |
| 92 | 4 | 8 | 16 | 31 | 63 | 125 |
| 100 | 4 | 7 | 14 | 29 | 58 | 115 |
| 110 | 3 | 7 | 13 | 26 | 52 | 105 |
| 120 | 3 | 6 | 12 | 24 | 48 | 96 |
| 128 | 3 | 6 | 11 | 23 | 45 | 90 |
| 130 | 3 | 6 | 11 | 22 | 44 | 89 |
| 140 | 3 | 5 | 10 | 21 | 41 | 82 |
| 150 | 2 | 5 | 10 | 19 | 38 | 77 |
| 160 | 2 | 5 | 9 | 18 | 36 | 72 |
| 174 | 2 | 4 | 8 | 17 | 33 | 66 |

At 30 fps (reviews, most reels):

| BPM | ¼ beat | ½ beat | beat | 2 beats | bar | 2 bars |
| --- | --- | --- | --- | --- | --- | --- |
| 80 | 6 | 11 | 23 | 45 | 90 | 180 |
| 90 | 5 | 10 | 20 | 40 | 80 | 160 |
| 92 | 5 | 10 | 20 | 39 | 78 | 157 |
| 100 | 5 | 9 | 18 | 36 | 72 | 144 |
| 110 | 4 | 8 | 16 | 33 | 65 | 131 |
| 120 | 4 | 8 | 15 | 30 | 60 | 120 |
| 128 | 4 | 7 | 14 | 28 | 56 | 113 |
| 130 | 3 | 7 | 14 | 28 | 55 | 111 |
| 140 | 3 | 6 | 13 | 26 | 51 | 103 |
| 150 | 3 | 6 | 12 | 24 | 48 | 96 |
| 160 | 3 | 6 | 11 | 23 | 45 | 90 |
| 174 | 3 | 5 | 10 | 21 | 41 | 83 |

At 60 fps:

| BPM | ¼ beat | ½ beat | beat | 2 beats | bar | 2 bars |
| --- | --- | --- | --- | --- | --- | --- |
| 80 | 11 | 23 | 45 | 90 | 180 | 360 |
| 90 | 10 | 20 | 40 | 80 | 160 | 320 |
| 92 | 10 | 20 | 39 | 78 | 157 | 313 |
| 100 | 9 | 18 | 36 | 72 | 144 | 288 |
| 110 | 8 | 16 | 33 | 65 | 131 | 262 |
| 120 | 8 | 15 | 30 | 60 | 120 | 240 |
| 128 | 7 | 14 | 28 | 56 | 113 | 225 |
| 130 | 7 | 14 | 28 | 55 | 111 | 222 |
| 140 | 6 | 13 | 26 | 51 | 103 | 206 |
| 150 | 6 | 12 | 24 | 48 | 96 | 192 |
| 160 | 6 | 11 | 23 | 45 | 90 | 180 |
| 174 | 5 | 10 | 21 | 41 | 83 | 166 |

### 1b. The formula, for any BPM

Run this if you have code execution. It prints the beat-marker list.

```
bpm, fps, offset, beats = 92, 24, 0.0, 46
for n in range(0, beats + 1, 4):  # step 1 for every beat
    t = offset + n * 60 / bpm
    f = int(t * fps + 0.5)  # half up, like the tables
    print(f"{n//4+1}.{n%4+1}  beat {n}  {t:.2f} s  "
          f"{f//fps//60}:{f//fps%60:02d}:{f%fps:02d}")
```

### 1c. House lengths turned into beats

- **3 s law:** the most whole beats before something must change.
- **Lunar hold:** whole-beat holds inside the runbook's 3–5 s.
- **Doc montage and doc emotion:** the beat counts nearest the Road to Three Stars targets of about 1.8 s and 4.5 s.

| BPM | 3 s law: max beats | Lunar hold 3–5 s | doc montage ~1.8 s | doc emotion ~4.5 s |
| --- | --- | --- | --- | --- |
| 80 | 4 (3.00 s) | 4 (3.00 s), 5 (3.75 s), 6 (4.50 s) | 2 (1.50 s) | 6 (4.50 s) |
| 90 | 4 (2.67 s) | 5 (3.33 s), 6 (4.00 s), 7 (4.67 s) | 3 (2.00 s) | 7 (4.67 s) |
| 92 | 4 (2.61 s) | 5 (3.26 s), 6 (3.91 s), 7 (4.57 s) | 3 (1.96 s) | 7 (4.57 s) |
| 100 | 5 (3.00 s) | 5 (3.00 s), 6 (3.60 s), 7 (4.20 s), 8 (4.80 s) | 3 (1.80 s) | 8 (4.80 s) |
| 110 | 5 (2.73 s) | 6 (3.27 s), 7 (3.82 s), 8 (4.36 s), 9 (4.91 s) | 3 (1.64 s) | 8 (4.36 s) |
| 120 | 6 (3.00 s) | 6 (3.00 s), 7 (3.50 s), 8 (4.00 s), 9 (4.50 s), 10 (5.00 s) | 4 (2.00 s) | 9 (4.50 s) |
| 128 | 6 (2.81 s) | 7 (3.28 s), 8 (3.75 s), 9 (4.22 s), 10 (4.69 s) | 4 (1.88 s) | 10 (4.69 s) |
| 130 | 6 (2.77 s) | 7 (3.23 s), 8 (3.69 s), 9 (4.15 s), 10 (4.62 s) | 4 (1.85 s) | 10 (4.62 s) |
| 140 | 7 (3.00 s) | 7 (3.00 s), 8 (3.43 s), 9 (3.86 s), 10 (4.29 s), 11 (4.71 s) | 4 (1.71 s) | 11 (4.71 s) |
| 150 | 7 (2.80 s) | 8 (3.20 s), 9 (3.60 s), 10 (4.00 s), 11 (4.40 s), 12 (4.80 s) | 5 (2.00 s) | 11 (4.40 s) |
| 160 | 8 (3.00 s) | 8 (3.00 s), 9 (3.38 s), 10 (3.75 s), 11 (4.13 s), 12 (4.50 s), 13 (4.88 s) | 5 (1.88 s) | 12 (4.50 s) |
| 174 | 8 (2.76 s) | 9 (3.10 s), 10 (3.45 s), 11 (3.79 s), 12 (4.14 s), 13 (4.48 s), 14 (4.83 s) | 5 (1.72 s) | 13 (4.48 s) |

### 1d. Slow-motion floors

The slowest speed that still shows a new source frame on every output frame is timeline fps ÷ source fps. Below it, CapCut repeats or invents frames.

| timeline fps | source fps | slowest clean speed |
| --- | --- | --- |
| 24 | 24 | 1.0x |
| 24 | 30 | 0.8x |
| 24 | 60 | 0.4x |
| 30 | 30 | 1.0x |
| 30 | 60 | 0.5x |
| 60 | 60 | 1.0x |

The source you need = the slot's seconds × the speed. For example, a 4-beat slot at 92 BPM is 2.61 s, so at 0.4x it needs 1.04 s of 60 fps footage.

## 2. Three 30 s templates

How to read them:

- Beat 0 is the downbeat trimmed to 0:00. A beat written as 22.5 is half a beat.
- **V1 must cover every beat with no gap.** CapCut's main track is magnetic. The generator checks this.
- **V2 sits above V1.** A VHS window over a 4K bed shows the crushed-black night above and below the tape.
- **Clip names are slots** (`4K1`, `VHS3`, `DC2`). Fill them with his tagged clips.
- **Shots needing 60 fps:** any row that says Impact Drop or slow-mo.
- **Kicks and snares are assumed:** kick on beats 1 and 3, snare on 2 and 4. Move flashes and whips if his song differs.

### Song A: 92 BPM, memory to hero (Road to Three Stars teaser)

A slow memory piece. Dreamcore opens it, VHS confessions float over a held 4K night shot, and the build accelerates into a tape snap to 4K on bar 7. Half-time slow-mo follows, then a Dreamcore outro. The 8-beat intro hold is 5.22 s, so the title text changes at beat 4 (2.61 s) to keep the 3 s law.

**Grid:** 92 BPM · 24 fps · 1 beat = 0.652 s = 15.65 frames · 46 beats = 30.00 s (720 frames)

**Sections**

| Section | Pattern | Beats | Seconds |
| --- | --- | --- | --- |
| Intro | hold | 0–8 | 0.00–5.22 |
| Verse | standard (VHS on V2) | 8–16 | 5.22–10.43 |
| Build | acceleration + stutter | 16–24 | 10.43–15.65 |
| Drop | drop switch VHS→4K | 24–32 | 15.65–20.87 |
| Post-drop | half-time | 32–40 | 20.87–26.09 |
| Outro | hold | 40–46 | 26.09–30.00 |

**Beat markers** (every downbeat)

| Bar.beat | Beat # | Seconds | TC @24 |
| --- | --- | --- | --- |
| 1.1 | 0 | 0.00 | 0:00:00 |
| 2.1 | 4 | 2.61 | 0:02:15 |
| 3.1 | 8 | 5.22 | 0:05:05 |
| 4.1 | 12 | 7.83 | 0:07:20 |
| 5.1 | 16 | 10.43 | 0:10:10 |
| 6.1 | 20 | 13.04 | 0:13:01 |
| 7.1 | 24 | 15.65 | 0:15:16 |
| 8.1 | 28 | 18.26 | 0:18:06 |
| 9.1 | 32 | 20.87 | 0:20:21 |
| 10.1 | 36 | 23.48 | 0:23:11 |
| 11.1 | 40 | 26.09 | 0:26:02 |
| 12.1 | 44 | 28.70 | 0:28:17 |
| end | 46 | 30.00 | 0:30:00 |

**Cut list** (frames: in–out at the export fps; a cut lands on the in frame)

| # | Beats | Seconds | Frames | Track | Treatment |
| --- | --- | --- | --- | --- | --- |
| 1 | 0–8 | 0.00–5.22 | 0–125 | V1 DC1 | Dreamcore; push 100→108% |
| 2 | 8–24 | 5.22–15.65 | 125–376 | V1 4K1 | 4K bed under the VHS window |
| 3 | 8–10 | 5.22–6.52 | 125–157 | V2 VHS1 | 4:3 window, Normal 100 |
| 4 | 10–12 | 6.52–7.83 | 157–188 | V2 VHS2 | 4:3 window |
| 5 | 12–14 | 7.83–9.13 | 188–219 | V2 VHS3 | 4:3 window |
| 6 | 14–16 | 9.13–10.43 | 219–250 | V2 VHS4 | 4:3 window |
| 7 | 16–18 | 10.43–11.74 | 250–282 | V2 VHS5 | build: 2 beats |
| 8 | 18–20 | 11.74–13.04 | 282–313 | V2 VHS6 | 2 beats |
| 9 | 20–21 | 13.04–13.70 | 313–329 | V2 VHS7 | 1 beat |
| 10 | 21–22 | 13.70–14.35 | 329–344 | V2 VHS8 | 1 beat |
| 11 | 22–22.5 | 14.35–14.67 | 344–352 | V2 VHS8 | stutter ½ beat ×4, tape snap on the last |
| 12 | 22.5–23 | 14.67–15.00 | 352–360 | V2 VHS8 | stutter: same in point |
| 13 | 23–23.5 | 15.00–15.33 | 360–368 | V2 VHS8 | stutter: same in point |
| 14 | 23.5–24 | 15.33–15.65 | 368–376 | V2 VHS8 | stutter: same in point |
| 15 | 24–28 | 15.65–18.26 | 376–438 | V1 4K2 | drop: flash 2 f; Impact Drop 1x→0.4x→1x (60 fps source) |
| 16 | 28–30 | 18.26–19.57 | 438–470 | V1 4K3 | flash 2 f on the kick |
| 17 | 30–32 | 19.57–20.87 | 470–501 | V1 4K4 | zoom punch 110% on the kick |
| 18 | 32–36 | 20.87–23.48 | 501–563 | V1 4K5 | half-time: 0.4x slow-mo (60 fps source) |
| 19 | 36–40 | 23.48–26.09 | 563–626 | V1 DC2 | Dreamcore + V2 halation copy |
| 20 | 40–46 | 26.09–30.00 | 626–720 | V1 DC3 | outro hold; push 100→108% |

**Plates, text and sound**

| Track | Beats | Seconds | What | Blend / level |
| --- | --- | --- | --- | --- |
| V2 | 36–40 | 23.48–26.09 | DC2 halation copy (blurred, warm) | Screen 25–45 |
| V3 | 0–8 | 0.00–5.22 | Forge leak, Dreamcore rose | Screen 50 |
| V3 | 8–24 | 5.22–15.65 | Forge VHS, Found tape | Screen 30 → 40 across the build |
| V3 | 23.5–24 | 15.33–15.65 | tape snap: same VHS plate | Screen → 100 over the last 4 f |
| V3 | 24–40 | 15.65–26.09 | Forge grain, Night stock | Overlay 25 |
| V3 | 40–46 | 26.09–30.00 | Forge leak, Tungsten drift | Screen 55 |
| T1 | 0–4 | 0.00–2.61 | title, editorial serif | top third |
| T1 | 4–8 | 2.61–5.22 | mono data line (place, year) | top third |
| T1 | 8–24 | 5.22–15.65 | confession captions in the top bar | y 130–555 |
| T1 | 40–46 | 26.09–30.00 | end title, ≤4 words | top third |
| A2 | 23.5–24 | 15.33–15.65 | tape stop, ends on the drop | 30–60 |
| A2 | 24–25 | 15.65–16.30 | sub drop under the first 4K frame | 30–60 |
| A1 | 44–46 | 28.70–30.00 | music fade out (Fades) | last 2 beats |

### Song B: 120 BPM, speed-ramp build (R&D Lab)

A lab piece built on two layers interleaving. V1 4K cuts every 4 beats, and a V2 VHS window drops in on the off 2 beats, so something changes every second. Then comes the build, the snap, an Impact Drop, one bar of double-time and a half-time slow-mo. The bridge whips land on the snares (beats 51 and 53).

**Grid:** 120 BPM · 30 fps · 1 beat = 0.500 s = 15.00 frames · 60 beats = 30.00 s (900 frames)

**Sections**

| Section | Pattern | Beats | Seconds |
| --- | --- | --- | --- |
| Intro | hold | 0–8 | 0.00–4.00 |
| Verse | standard, two layers interleaved | 8–24 | 4.00–12.00 |
| Build | acceleration + stutter | 24–32 | 12.00–16.00 |
| Drop | drop switch + double-time | 32–40 | 16.00–20.00 |
| Post-drop | half-time | 40–48 | 20.00–24.00 |
| Bridge | standard on the snares | 48–56 | 24.00–28.00 |
| Outro | hold | 56–60 | 28.00–30.00 |

**Beat markers** (every downbeat)

| Bar.beat | Beat # | Seconds | TC @30 |
| --- | --- | --- | --- |
| 1.1 | 0 | 0.00 | 0:00:00 |
| 2.1 | 4 | 2.00 | 0:02:00 |
| 3.1 | 8 | 4.00 | 0:04:00 |
| 4.1 | 12 | 6.00 | 0:06:00 |
| 5.1 | 16 | 8.00 | 0:08:00 |
| 6.1 | 20 | 10.00 | 0:10:00 |
| 7.1 | 24 | 12.00 | 0:12:00 |
| 8.1 | 28 | 14.00 | 0:14:00 |
| 9.1 | 32 | 16.00 | 0:16:00 |
| 10.1 | 36 | 18.00 | 0:18:00 |
| 11.1 | 40 | 20.00 | 0:20:00 |
| 12.1 | 44 | 22.00 | 0:22:00 |
| 13.1 | 48 | 24.00 | 0:24:00 |
| 14.1 | 52 | 26.00 | 0:26:00 |
| 15.1 | 56 | 28.00 | 0:28:00 |
| end | 60 | 30.00 | 0:30:00 |

**Cut list** (frames: in–out at the export fps; a cut lands on the in frame)

| # | Beats | Seconds | Frames | Track | Treatment |
| --- | --- | --- | --- | --- | --- |
| 1 | 0–8 | 0.00–4.00 | 0–120 | V1 4K1 | macro hold; push 100→108% |
| 2 | 8–12 | 4.00–6.00 | 120–180 | V1 4K2 | 4K; changes every 2 beats with V2 |
| 3 | 10–12 | 5.00–6.00 | 150–180 | V2 VHS1 | 4:3 window over 4K2 |
| 4 | 12–16 | 6.00–8.00 | 180–240 | V1 4K3 | 4K |
| 5 | 14–16 | 7.00–8.00 | 210–240 | V2 VHS2 | 4:3 window |
| 6 | 16–20 | 8.00–10.00 | 240–300 | V1 4K4 | 4K |
| 7 | 18–20 | 9.00–10.00 | 270–300 | V2 VHS3 | 4:3 window |
| 8 | 20–24 | 10.00–12.00 | 300–360 | V1 4K5 | 4K |
| 9 | 22–24 | 11.00–12.00 | 330–360 | V2 VHS4 | 4:3 window |
| 10 | 24–32 | 12.00–16.00 | 360–480 | V1 4K6 | 4K bed under the build |
| 11 | 24–26 | 12.00–13.00 | 360–390 | V2 VHS5 | build: 2 beats |
| 12 | 26–28 | 13.00–14.00 | 390–420 | V2 VHS6 | 2 beats |
| 13 | 28–29 | 14.00–14.50 | 420–435 | V2 VHS7 | 1 beat |
| 14 | 29–30 | 14.50–15.00 | 435–450 | V2 VHS8 | 1 beat |
| 15 | 30–30.5 | 15.00–15.25 | 450–458 | V2 VHS8 | stutter ½ beat ×4, tape snap on the last |
| 16 | 30.5–31 | 15.25–15.50 | 458–465 | V2 VHS8 | stutter: same in point |
| 17 | 31–31.5 | 15.50–15.75 | 465–473 | V2 VHS8 | stutter: same in point |
| 18 | 31.5–32 | 15.75–16.00 | 473–480 | V2 VHS8 | stutter: same in point |
| 19 | 32–36 | 16.00–18.00 | 480–540 | V1 4K7 | drop: flash 2 f; Impact Drop 1x→0.5x→1x (60 fps source) |
| 20 | 36–36.5 | 18.00–18.25 | 540–548 | V1 4K7 | double-time: alternate the two shots |
| 21 | 36.5–37 | 18.25–18.50 | 548–555 | V1 4K6 | double-time |
| 22 | 37–37.5 | 18.50–18.75 | 555–563 | V1 4K7 | double-time |
| 23 | 37.5–38 | 18.75–19.00 | 563–570 | V1 4K6 | double-time |
| 24 | 38–38.5 | 19.00–19.25 | 570–578 | V1 4K7 | double-time |
| 25 | 38.5–39 | 19.25–19.50 | 578–585 | V1 4K6 | double-time |
| 26 | 39–39.5 | 19.50–19.75 | 585–593 | V1 4K7 | double-time |
| 27 | 39.5–40 | 19.75–20.00 | 593–600 | V1 4K6 | double-time |
| 28 | 40–44 | 20.00–22.00 | 600–660 | V1 4K8 | half-time: 0.5x slow-mo (60 fps source) |
| 29 | 44–48 | 22.00–24.00 | 660–720 | V1 DC1 | Dreamcore + V2 halation copy |
| 30 | 48–51 | 24.00–25.50 | 720–765 | V1 4K9 | zoom punch 110% on 50 |
| 31 | 51–53 | 25.50–26.50 | 765–795 | V1 DC2 | whip in, centred on the snare |
| 32 | 53–56 | 26.50–28.00 | 795–840 | V1 4K10 | whip in, centred on the snare |
| 33 | 56–60 | 28.00–30.00 | 840–900 | V1 4K11 | outro hold; data card |

**Plates, text and sound**

| Track | Beats | Seconds | What | Blend / level |
| --- | --- | --- | --- | --- |
| V2 | 44–48 | 22.00–24.00 | DC1 halation copy | Screen 25–45 |
| V3 | 8–32 | 4.00–16.00 | Forge VHS, Clean dub | Screen 25 → 40 across the build |
| V3 | 31.5–32 | 15.75–16.00 | tape snap: same VHS plate | Screen → 100 over the last 4 f |
| V3 | 32–60 | 16.00–30.00 | Forge grain, Whisper | Overlay 20 |
| V3 | 44–48 | 22.00–24.00 | Forge leak, Tungsten drift | Screen 45 |
| T1 | 0–4 | 0.00–2.00 | mono data card 1 | top third |
| T1 | 4–8 | 2.00–4.00 | mono data card 2 | top third |
| T1 | 56–60 | 28.00–30.00 | mono end card | top third |
| A2 | 31.5–32 | 15.75–16.00 | tape stop, ends on the drop | 30–60 |
| A2 | 32–33 | 16.00–16.50 | sub drop under the first 4K frame | 30–60 |
| A2 | 51–51.5 | 25.50–25.75 | whoosh on the whip | 30–60 |
| A2 | 53–53.5 | 26.50–26.75 | whoosh on the whip | 30–60 |
| A1 | 58–60 | 29.00–30.00 | music fade out (Fades) | last 2 beats |

### Song C: 140 BPM, service montage (Road to Three Stars)

Fast tempo, documentary rules. The montage cuts every 4 beats (1.71 s, the nearest to the house 1.8 s). The drop gets kick flashes and a zoom punch, then half-time, then one bar of double-time between the two half-time shots. The whips land on the snares at 59 and 61. 70 beats end mid-bar at exactly 30.00 s, and the music fades over the last 2 beats.

**Grid:** 140 BPM · 30 fps · 1 beat = 0.429 s = 12.86 frames · 70 beats = 30.00 s (900 frames)

**Sections**

| Section | Pattern | Beats | Seconds |
| --- | --- | --- | --- |
| Intro | hold (VHS confession) | 0–8 | 0.00–3.43 |
| Montage | 4-beat cuts (~1.8 s house rule) | 8–24 | 3.43–10.29 |
| Build | acceleration + stutter | 24–32 | 10.29–13.71 |
| Drop | drop switch + standard | 32–44 | 13.71–18.86 |
| Post-drop | half-time, then double-time | 44–56 | 18.86–24.00 |
| Bridge | standard on the snares | 56–64 | 24.00–27.43 |
| Outro | hold | 64–70 | 27.43–30.00 |

**Beat markers** (every downbeat)

| Bar.beat | Beat # | Seconds | TC @30 |
| --- | --- | --- | --- |
| 1.1 | 0 | 0.00 | 0:00:00 |
| 2.1 | 4 | 1.71 | 0:01:21 |
| 3.1 | 8 | 3.43 | 0:03:13 |
| 4.1 | 12 | 5.14 | 0:05:04 |
| 5.1 | 16 | 6.86 | 0:06:26 |
| 6.1 | 20 | 8.57 | 0:08:17 |
| 7.1 | 24 | 10.29 | 0:10:09 |
| 8.1 | 28 | 12.00 | 0:12:00 |
| 9.1 | 32 | 13.71 | 0:13:21 |
| 10.1 | 36 | 15.43 | 0:15:13 |
| 11.1 | 40 | 17.14 | 0:17:04 |
| 12.1 | 44 | 18.86 | 0:18:26 |
| 13.1 | 48 | 20.57 | 0:20:17 |
| 14.1 | 52 | 22.29 | 0:22:09 |
| 15.1 | 56 | 24.00 | 0:24:00 |
| 16.1 | 60 | 25.71 | 0:25:21 |
| 17.1 | 64 | 27.43 | 0:27:13 |
| 18.1 | 68 | 29.14 | 0:29:04 |
| end | 70 | 30.00 | 0:30:00 |

**Cut list** (frames: in–out at the export fps; a cut lands on the in frame)

| # | Beats | Seconds | Frames | Track | Treatment |
| --- | --- | --- | --- | --- | --- |
| 1 | 0–8 | 0.00–3.43 | 0–103 | V1 4K1 | 4K bed: the kitchen at night |
| 2 | 0–8 | 0.00–3.43 | 0–103 | V2 VHS1 | confession, 4:3 window |
| 3 | 8–12 | 3.43–5.14 | 103–154 | V1 4K2 | montage |
| 4 | 12–16 | 5.14–6.86 | 154–206 | V1 4K3 | montage |
| 5 | 16–20 | 6.86–8.57 | 206–257 | V1 DC1 | Dreamcore memory insert |
| 6 | 20–24 | 8.57–10.29 | 257–309 | V1 4K4 | montage |
| 7 | 24–32 | 10.29–13.71 | 309–411 | V1 4K5 | 4K bed under the build |
| 8 | 24–26 | 10.29–11.14 | 309–334 | V2 VHS2 | build: 2 beats |
| 9 | 26–28 | 11.14–12.00 | 334–360 | V2 VHS3 | 2 beats |
| 10 | 28–29 | 12.00–12.43 | 360–373 | V2 VHS4 | 1 beat |
| 11 | 29–30 | 12.43–12.86 | 373–386 | V2 VHS5 | 1 beat |
| 12 | 30–30.5 | 12.86–13.07 | 386–392 | V2 VHS5 | stutter ½ beat ×4, tape snap on the last |
| 13 | 30.5–31 | 13.07–13.29 | 392–399 | V2 VHS5 | stutter: same in point |
| 14 | 31–31.5 | 13.29–13.50 | 399–405 | V2 VHS5 | stutter: same in point |
| 15 | 31.5–32 | 13.50–13.71 | 405–411 | V2 VHS5 | stutter: same in point |
| 16 | 32–36 | 13.71–15.43 | 411–463 | V1 4K6 | drop: flash 2 f; Impact Drop 1x→0.5x→1x (60 fps source) |
| 17 | 36–38 | 15.43–16.29 | 463–489 | V1 4K7 | flash 2 f on the kick |
| 18 | 38–40 | 16.29–17.14 | 489–514 | V1 4K8 | zoom punch 112% on the kick |
| 19 | 40–42 | 17.14–18.00 | 514–540 | V1 4K9 | flash 2 f on the kick |
| 20 | 42–44 | 18.00–18.86 | 540–566 | V1 4K10 | standard |
| 21 | 44–48 | 18.86–20.57 | 566–617 | V1 4K11 | half-time: 0.5x slow-mo (60 fps source) |
| 22 | 48–52 | 20.57–22.29 | 617–669 | V1 DC2 | Dreamcore + V2 halation copy |
| 23 | 52–52.5 | 22.29–22.50 | 669–675 | V1 4K11 | double-time: alternate the two shots |
| 24 | 52.5–53 | 22.50–22.71 | 675–681 | V1 DC2 | double-time |
| 25 | 53–53.5 | 22.71–22.93 | 681–688 | V1 4K11 | double-time |
| 26 | 53.5–54 | 22.93–23.14 | 688–694 | V1 DC2 | double-time |
| 27 | 54–54.5 | 23.14–23.36 | 694–701 | V1 4K11 | double-time |
| 28 | 54.5–55 | 23.36–23.57 | 701–707 | V1 DC2 | double-time |
| 29 | 55–55.5 | 23.57–23.79 | 707–714 | V1 4K11 | double-time |
| 30 | 55.5–56 | 23.79–24.00 | 714–720 | V1 DC2 | double-time |
| 31 | 56–59 | 24.00–25.29 | 720–759 | V1 4K12 | standard |
| 32 | 59–61 | 25.29–26.14 | 759–784 | V1 DC3 | whip in, centred on the snare |
| 33 | 61–64 | 26.14–27.43 | 784–823 | V1 4K13 | whip in, centred on the snare |
| 34 | 64–70 | 27.43–30.00 | 823–900 | V1 DC4 | outro hold; push 100→108% |

**Plates, text and sound**

| Track | Beats | Seconds | What | Blend / level |
| --- | --- | --- | --- | --- |
| V2 | 48–52 | 20.57–22.29 | DC2 halation copy | Screen 25–45 |
| V3 | 0–8 | 0.00–3.43 | Forge VHS, Found tape | Screen 30 |
| V3 | 24–32 | 10.29–13.71 | Forge VHS, Archive chaos | Screen 25 → 40 across the build |
| V3 | 31.5–32 | 13.50–13.71 | tape snap: same VHS plate | Screen → 100 over the last 4 f |
| V3 | 32–64 | 13.71–27.43 | Forge grain, Night stock | Overlay 30 |
| V3 | 64–70 | 27.43–30.00 | Forge leak, Dreamcore rose | Screen 60 |
| T1 | 0–4 | 0.00–1.71 | title, editorial serif | top bar, y 130–555 |
| T1 | 4–8 | 1.71–3.43 | mono data line | top bar |
| T1 | 64–70 | 27.43–30.00 | end title, ≤4 words | top third |
| A2 | 31.5–32 | 13.50–13.71 | tape stop, ends on the drop | 30–60 |
| A2 | 32–33 | 13.71–14.14 | sub drop under the first 4K frame | 30–60 |
| A2 | 59–59.5 | 25.29–25.50 | whoosh on the whip | 30–60 |
| A2 | 61–61.5 | 26.14–26.36 | whoosh on the whip | 30–60 |
| A1 | 68–70 | 29.14–30.00 | music fade out (Fades) | last 2 beats |

## 3. Blend-mode cheat sheet

CapCut Mobile: select an overlay, then Blend. The recalled list is Normal, Darken, Screen, Overlay, Multiply, Lighten, Hard light, Soft light, Linear burn, Color burn and Color dodge, with Opacity 0–100. Whether **Add** exists is not established, so **Verify** it. On Desktop, Blend sits in the inspector (**Verify**).

| Mode | What drops out | Use it for | Stack range |
|---|---|---|---|
| Normal | nothing: it covers | the VHS 4:3 window on V2 | 100 |
| Screen | black | VHS tracking, light leak, dust, REC HUD, black scanline plate, halation copy | VHS 25–40 · leak 40–70 · halation 25–45 |
| Add | black (and brighter than Screen; clips sooner) | light leak when Screen is too polite | 40–70 (Verify it exists) |
| Lighten | anything darker than the picture | halation copy (an alternative to Screen) | 25–45 |
| Overlay | 50% grey | film grain | 20–35 |
| Soft light | 50% grey, gentler | grain on faces or food | 20–35 |
| Multiply | white | white scanline / CRT plate | start at Forge's number |
| Darken | anything lighter | rarely | |
| Hard light, Color dodge, Color burn, Linear burn | | heavy looks; they shift skin and food, so avoid them on the plate | |

Forge previews each plate alone, at VHS 70, leak 80 and grain 60. Stacked, use the ranges above. Dust, scanlines and REC have no stack rule yet. Start at Forge's number, lower it until the plate stops pulling focus, then log the number (SKILL.md §9).

## 4. VHS recipe

### 4a. The 4:3 matte (the window)

- A 4:3 window across the full 1080 px width is 1080 × 810 px.
- Centred in 1080 × 1920, it runs from y 555 to y 1365. That clears the bottom no-text band, which starts at y 1436.
- The top black bar (y 130–555) is where VHS captions and data lines go.

Mobile, VHS over a 4K bed (the template way):

1. Put the VHS clip on V2 with `Overlay › Add overlay`.
2. Crop it to 4:3 (**Verify**: look for Crop with a 4:3 preset under the clip's Edit tools).
3. Pinch it until its left and right edges touch the frame edges.
4. Centre it: the gaps above and below should match.

Mobile, VHS alone: put the clip on V1, crop it to 4:3, then `Background › Color › black` (**Verify** the label; older builds say Canvas).

Desktop: drag the clip to the track above V1. Crop to 4:3 in the player or inspector (**Verify**). Drag the corners to the frame edges.

### 4b. Texture: Forge plates (Lunar Night OS › Forge › Overlay Forge)

| Plate | Presets | Blend | In the stack |
|---|---|---|---|
| VHS tracking & noise | Clean dub (Hi8), Found tape, Archive chaos | Screen | 25–40; 100 for the 4-frame tape snap |
| Light leak & halation | Tungsten drift, Dreamcore rose, Gate burn | Screen | 40–70 |
| Film grain (Fine / Medium / Coarse) | Whisper, Night stock, Rough | Overlay or Soft light | 20–35 |
| Dust & scratches | Clean print, Tired print, Dragged print | Screen | start at Forge's 75 and lower |
| Scanlines & CRT | Monitor, Soft raster, Phosphor glow; white plate or black plate | Multiply (white), Screen (black) | start at Forge's 60 and lower |
| Camcorder REC | Handycam, Low battery, Clean OSD | Screen | 100 |

Rendering:

- **Sizes:** 9:16 at 1080 × 1920 to cover the whole frame, or 4:3 at 1440 × 1080 to sit exactly on the window (shown at 75% of its width).
- **Frame rate:** 24 or 30 fps, the same as the edit.
- **Loop length:** 3, 5, 10 or 15 s. Plates loop seamlessly, so stretch one across a section by adding it twice, end to end.
- **One plate per job.** Use one VHS plate per section and one grain plate across the whole post-drop.

### 4c. Texture: CapCut effects (Mobile, all **Verify**; skip anything Pro)

`Effects › Video effects`, then search:

- **Tape:** "VHS", "DV", "retro", "camcorder", "tape"
- **Scanlines:** "scan", "line", "TV"
- **Chroma bleed:** "chromatic", "RGB", "split"
- **Glitch for the snap:** "glitch", "noise", "jitter"
- **Grain:** "grain", "film". The Adjust panel may also have a Grain slider.

Then:

- Drag the effect's ends to the section's beats.
- Set **Object** (or "Apply to") to the overlay when only the V2 window should be taped (**Verify**).

### 4d. Colour: VHS

Use the same three routes as every LUT:

- **A. LUT, Desktop only** (Mobile is contradicted). Apply `VHS_Tape_Grade.cube` at 50–70%. What it does: blacks sit at about 16/255 and whites at about 235/255; blues and cyans go tired, reds run hot toward orange, shadows go green-yellow and highlights pink.
- **B. Bake it on the phone** with Lunar Night OS › Grade › Bake, then edit the baked clip.
- **C. Sliders.** There are no measured numbers for VHS, so go by direction and log what works:
  - Fade up a little (blacks lift off zero).
  - Highlights down (whites stop short of full).
  - Saturation down.
  - HSL: Red and Orange saturation up, Blue saturation down.
  - Sharpen 0.

Then add one of these for softness: a light blur effect (**Verify**), or the grain plate.

## 5. Grade routes per style

**4K Lunar Night** uses the runbook slider recipe, on the clip or on an adjustment layer:

1. Adjust:
   - Exposure −15 (or Brightness −15)
   - Contrast +25
   - Shadows −40
   - Highlights −10
   - Saturation +15
   - Temperature −30
   - Tint +15 (0 for the blue variant)
   - Fade 0
   - Vignette +10
2. HSL:
   - Blue: Hue +15, Saturation +10
   - Green: Saturation +10
   - Orange: Saturation +10
   - Yellow: Saturation −10
3. Tap Apply to all.
4. Add a Glow effect at 25, small size, over the 4K sections. Add Grain at 20.
5. If it looks grey: Shadows −50 and Exposure −20.

Never use Fade on Lunar Night. Desktop: `LunarNight_v2_Violet.cube` (default), `_Blue` or `_Soft`.

**Dreamcore**, from the playbook:

- **Curves:** lift the black point, then a gentle S. Push the red channel up in the highlights only.
- **Halation:**
  1. Duplicate the clip onto V2.
  2. Set Blend to Screen or Lighten.
  3. Add Blur 20–40.
  4. Warm the Temperature.
  5. Set Opacity to 25–45%.
- **Starting point from the OS Dreamcore LUT notes:** about Temp +12, about Tint +10, blacks lifted to about 26/255, softer contrast and pastel saturation.
- Desktop: `Dreamcore_Halation.cube` at 50–70%. A LUT only tints; the bloom still comes from the halation copy or a leak plate.

**Grading order, every time:** Correct per clip → Match → Grade on one adjustment layer → Look (LUT 50–70%) → Finish (halation, grain, vignette).

## 6. Tap library

Copy the blocks you need into the plan with his times filled in. Keep one tap per line.

### Mobile (CapCut Android)

**M1. Project and ratio**

1. Open CapCut.
2. Tap New project.
3. Tap the V1 clips in cut-sheet order.
   You should see: numbers 1, 2, 3 on the thumbnails.
4. Tap Add.
   You should see: the clips in one row on the timeline.
5. Tap an empty spot on the timeline, so nothing is selected.
6. Tap Ratio. (Some builds: Aspect ratio or Format.)
7. Tap 9:16.
   You should see: the preview turns tall.
8. Tap the check mark.

**M2. Music on the downbeat**

1. Tap Audio.
2. Tap Sounds.
3. Find his song (**Verify**: the device tab may say Device, From device or Your sounds).
4. Tap the song, then tap + (or Use).
   You should see: a music bar under the clips.
5. Pinch the timeline open. Drag until the playhead sits on the first downbeat he wants.
6. Tap the music bar.
7. Tap Split.
8. Tap the left piece.
9. Tap Delete.
10. Press and hold the music bar, then drag it to the start.
   You should see: the music starts at 00:00.

**M3. Beats (Verify every label)**

1. Tap the music bar.
2. Tap Beats. (Older builds: Match cut.)
3. Turn on Auto generate. If it shows a Pro badge, skip it and use the beat-marker list.
   You should see: yellow dots under the music.
4. Check three dots against the marker list: bar 1, the drop and the last bar.
   You should see: each dot within a frame or two of the list time.
5. Tap the check mark.

**M4. Cut V1 on a beat**

1. Drag the timeline until the playhead sits on the cut time (on a beat dot).
2. Tap the clip.
3. Tap Split.
   You should see: a cut line at the playhead.
4. Tap the piece you don't want.
5. Tap Delete.

Repeat for each V1 row.

**M5. V2 overlay (VHS window or halation copy)**

1. Tap an empty spot on the timeline.
2. Tap Overlay.
3. Tap Add overlay.
4. Tap the clip.
5. Tap Add.
   You should see: the clip as a box over the picture, with its own bar under the main track.
6. Make the 4:3 window (§4a), or for halation: Blend › Screen, Opacity 35, then a blur effect.
7. Drag the bar so its left end sits on the in beat. Drag its right end to the out beat.

**M6. V3 plate**

1. Tap an empty spot on the timeline.
2. Tap Overlay.
3. Tap Add overlay.
4. Tap the Forge plate MP4.
5. Tap Add.
6. Pinch it to fill the frame (a 9:16 plate) or the window (a 4:3 plate).
7. Tap Blend.
8. Tap Screen (VHS, leak) or Overlay (grain).
9. Drag Opacity to the cut-sheet number.
   You should see: the plate's black (or grey) vanishes and only the texture stays.
10. Tap the check mark.
11. Drag the bar's ends to the section's beats.

**M7. Flash on a kick**

1. Put the playhead on the kick frame.
2. Tap the clip.
3. Tap Split.
4. Pinch the timeline fully open. Move the playhead 2 frames right (**Verify**: whether the ruler shows frames).
5. Tap Split.
6. Tap the 2-frame piece.
7. Tap Adjust.
8. Drag Brightness (or Exposure) to the top.
   You should see: a white pop on that frame.
9. Tap the check mark.

**M8. Zoom punch**

1. Split on the beat (M4 steps 1–3).
2. Tap the second piece.
3. Pinch out on the preview to about 110% (**Verify**: whether a scale number shows while you pinch).
   You should see: the picture jumps in on the beat.

**M9. Impact Drop**

1. Tap the 60 fps clip.
2. Tap Speed.
3. Tap Curve.
4. Tap Custom.
5. Tap Edit.
   You should see: a graph with points on a line at 1x.
6. Drag the middle point down to 0.4x (in a 24 fps edit) or 0.5x (in a 30 fps edit).
7. Leave the first and last points at 1x.
8. Tap the check mark.
9. Drag the clip's right end back to the next beat dot.
   You should see: the clip ends on the dot.

Smooth slow-mo may show a Pro badge; leave it off.

**M10. Whip on a snare (Verify the names)**

1. Tap the small white square between the two clips.
2. Look in Camera or Slide, or search "whip" or "swipe". Skip anything with Pro.
3. Drag the duration to 0.2 s.
4. Tap the check mark.
   You should see: the move straddles the snare.

**M11. Text**

1. Put the playhead on the in beat.
2. Tap Text.
3. Tap Add text.
4. Type the words.
5. Tap Font. To use Inter or Estrella Early, tap Import (.ttf or .otf).
6. Set the style for the format (SKILL.md §6).
7. Drag the text into place, inside the safe zone.
8. Drag the text bar's ends to the in and out beats.

**M12. Levels, fades and export**

1. Tap the music bar.
2. Tap Volume. Set the format's level.
3. Tap Fades (older builds: Fade). Set Fade out to the last 2 beats.
4. Tap Audio, then Sound effects. Add each SFX on its beat at 30–60.
5. Tap the resolution chip at the top right (for example, 1080P).
6. Set 1080p, the frame rate of the footage, and the highest bitrate (labelled Bit rate or Code rate).
7. Tap Export.
   You should see: a progress ring, then the share screen.

Turn the default ending off once: home-screen gear › Add default ending › off.

### Desktop (CapCut for Windows or Mac; every label is Verify)

**D1. Project and ratio**

1. Open CapCut.
2. Click Create project.
3. Click Import. Pick the clips, the song and the Forge plates.
4. Drag the V1 clips onto the main track in cut-sheet order.
5. Under the player, click Ratio. Pick 9:16.
   You should see: a tall player.

**D2. Music and beats**

1. Drag the song onto the audio track.
2. Put the playhead on the first downbeat he wants.
3. Press Ctrl+B (Cmd+B on Mac) to split.
4. Delete the left piece. Drag the music to 00:00.
5. With the music selected, click the beat-marking button on the timeline toolbar (Auto beat or similar).
   You should see: beat markers on the music.

**D3. Cuts, overlays and plates**

1. Move the playhead with the arrow keys, one frame per press (**Verify**).
2. Split with Ctrl+B or Cmd+B.
3. Drag V2 and V3 media onto new tracks above the main track. The upper track draws on top (**Verify**).
4. Select a plate. In the inspector, open Video › Basic and set Blend mode and Opacity.

**D4. LUT**

1. In the top-left panel, click Adjustment.
2. Click LUT.
3. Click Import. Pick the .cube file.
   You should see: a LUT tile.
4. Select the clip. In the inspector, open Adjustment and pick the LUT.
5. Set Intensity to 50–70.

**D5. Speed, text and export**

1. Select the clip. In the inspector, click Speed › Curve › Custom.
2. Drag the middle point to 0.4x or 0.5x.
3. Trim back to the next beat marker.
4. Add text from Text › Default text.
5. Click Export at the top right.
6. Set 1080p, the footage frame rate and the highest bitrate. Pick H.264 if it is offered.
7. Click Export.

## 7. 15-minute verify checklist (do it once, then log the answers)

1. **Version.** Android Settings › Apps › CapCut. Note the version.
2. **Beats.** Find the panel name and Auto generate. Is it Pro? What colour are the dots?
3. **Blend.** List every mode in order. Is **Add** there? Does Blend appear on a main-track clip?
4. **Overlay order.** Two plates on Normal 100: which row draws on top?
5. **Ruler.** Pinch fully open. Does the ruler show frames? Can you move one frame at a time?
6. **Adjust.** What value is at the top of Brightness and Exposure? Is HSL Pro?
7. **Speed.** In Curve, what are the preset names? Does Custom › Edit work? What are the axis labels? Is Smooth slow-mo Pro?
8. **Transitions.** Is there a whip or swipe? What is the shortest duration? Does it sit centred on the cut?
9. **Crop and Background.** Is there a 4:3 crop preset? Does Background › Color offer black?
10. **LUT.** The 60-second check: look in Adjust and Filters for a LUT or + tile.
11. **Export.** Note the resolution, fps and bitrate wording, and any codec option.
12. **Desktop.** Check Adjustment › LUT › Import, where Blend lives, the split shortcut, beat marking and frame stepping.

## 8. Full beat table, 70–180 BPM

f = frames per beat at that fps. To get the frame of beat n, use round(n × f).

| BPM | beat s | f 24 | f 30 | f 60 |
| --- | --- | --- | --- | --- |
| 70 | 0.857 | 20.57 | 25.71 | 51.43 |
| 71 | 0.845 | 20.28 | 25.35 | 50.70 |
| 72 | 0.833 | 20.00 | 25.00 | 50.00 |
| 73 | 0.822 | 19.73 | 24.66 | 49.32 |
| 74 | 0.811 | 19.46 | 24.32 | 48.65 |
| 75 | 0.800 | 19.20 | 24.00 | 48.00 |
| 76 | 0.789 | 18.95 | 23.68 | 47.37 |
| 77 | 0.779 | 18.70 | 23.38 | 46.75 |
| 78 | 0.769 | 18.46 | 23.08 | 46.15 |
| 79 | 0.759 | 18.23 | 22.78 | 45.57 |
| 80 | 0.750 | 18.00 | 22.50 | 45.00 |
| 81 | 0.741 | 17.78 | 22.22 | 44.44 |
| 82 | 0.732 | 17.56 | 21.95 | 43.90 |
| 83 | 0.723 | 17.35 | 21.69 | 43.37 |
| 84 | 0.714 | 17.14 | 21.43 | 42.86 |
| 85 | 0.706 | 16.94 | 21.18 | 42.35 |
| 86 | 0.698 | 16.74 | 20.93 | 41.86 |
| 87 | 0.690 | 16.55 | 20.69 | 41.38 |
| 88 | 0.682 | 16.36 | 20.45 | 40.91 |
| 89 | 0.674 | 16.18 | 20.22 | 40.45 |
| 90 | 0.667 | 16.00 | 20.00 | 40.00 |
| 91 | 0.659 | 15.82 | 19.78 | 39.56 |
| 92 | 0.652 | 15.65 | 19.57 | 39.13 |
| 93 | 0.645 | 15.48 | 19.35 | 38.71 |
| 94 | 0.638 | 15.32 | 19.15 | 38.30 |
| 95 | 0.632 | 15.16 | 18.95 | 37.89 |
| 96 | 0.625 | 15.00 | 18.75 | 37.50 |
| 97 | 0.619 | 14.85 | 18.56 | 37.11 |
| 98 | 0.612 | 14.69 | 18.37 | 36.73 |
| 99 | 0.606 | 14.55 | 18.18 | 36.36 |
| 100 | 0.600 | 14.40 | 18.00 | 36.00 |
| 101 | 0.594 | 14.26 | 17.82 | 35.64 |
| 102 | 0.588 | 14.12 | 17.65 | 35.29 |
| 103 | 0.583 | 13.98 | 17.48 | 34.95 |
| 104 | 0.577 | 13.85 | 17.31 | 34.62 |
| 105 | 0.571 | 13.71 | 17.14 | 34.29 |
| 106 | 0.566 | 13.58 | 16.98 | 33.96 |
| 107 | 0.561 | 13.46 | 16.82 | 33.64 |
| 108 | 0.556 | 13.33 | 16.67 | 33.33 |
| 109 | 0.550 | 13.21 | 16.51 | 33.03 |
| 110 | 0.545 | 13.09 | 16.36 | 32.73 |
| 111 | 0.541 | 12.97 | 16.22 | 32.43 |
| 112 | 0.536 | 12.86 | 16.07 | 32.14 |
| 113 | 0.531 | 12.74 | 15.93 | 31.86 |
| 114 | 0.526 | 12.63 | 15.79 | 31.58 |
| 115 | 0.522 | 12.52 | 15.65 | 31.30 |
| 116 | 0.517 | 12.41 | 15.52 | 31.03 |
| 117 | 0.513 | 12.31 | 15.38 | 30.77 |
| 118 | 0.508 | 12.20 | 15.25 | 30.51 |
| 119 | 0.504 | 12.10 | 15.13 | 30.25 |
| 120 | 0.500 | 12.00 | 15.00 | 30.00 |
| 121 | 0.496 | 11.90 | 14.88 | 29.75 |
| 122 | 0.492 | 11.80 | 14.75 | 29.51 |
| 123 | 0.488 | 11.71 | 14.63 | 29.27 |
| 124 | 0.484 | 11.61 | 14.52 | 29.03 |
| 125 | 0.480 | 11.52 | 14.40 | 28.80 |
| 126 | 0.476 | 11.43 | 14.29 | 28.57 |
| 127 | 0.472 | 11.34 | 14.17 | 28.35 |
| 128 | 0.469 | 11.25 | 14.06 | 28.13 |
| 129 | 0.465 | 11.16 | 13.95 | 27.91 |
| 130 | 0.462 | 11.08 | 13.85 | 27.69 |
| 131 | 0.458 | 10.99 | 13.74 | 27.48 |
| 132 | 0.455 | 10.91 | 13.64 | 27.27 |
| 133 | 0.451 | 10.83 | 13.53 | 27.07 |
| 134 | 0.448 | 10.75 | 13.43 | 26.87 |
| 135 | 0.444 | 10.67 | 13.33 | 26.67 |
| 136 | 0.441 | 10.59 | 13.24 | 26.47 |
| 137 | 0.438 | 10.51 | 13.14 | 26.28 |
| 138 | 0.435 | 10.43 | 13.04 | 26.09 |
| 139 | 0.432 | 10.36 | 12.95 | 25.90 |
| 140 | 0.429 | 10.29 | 12.86 | 25.71 |
| 141 | 0.426 | 10.21 | 12.77 | 25.53 |
| 142 | 0.423 | 10.14 | 12.68 | 25.35 |
| 143 | 0.420 | 10.07 | 12.59 | 25.17 |
| 144 | 0.417 | 10.00 | 12.50 | 25.00 |
| 145 | 0.414 | 9.93 | 12.41 | 24.83 |
| 146 | 0.411 | 9.86 | 12.33 | 24.66 |
| 147 | 0.408 | 9.80 | 12.24 | 24.49 |
| 148 | 0.405 | 9.73 | 12.16 | 24.32 |
| 149 | 0.403 | 9.66 | 12.08 | 24.16 |
| 150 | 0.400 | 9.60 | 12.00 | 24.00 |
| 151 | 0.397 | 9.54 | 11.92 | 23.84 |
| 152 | 0.395 | 9.47 | 11.84 | 23.68 |
| 153 | 0.392 | 9.41 | 11.76 | 23.53 |
| 154 | 0.390 | 9.35 | 11.69 | 23.38 |
| 155 | 0.387 | 9.29 | 11.61 | 23.23 |
| 156 | 0.385 | 9.23 | 11.54 | 23.08 |
| 157 | 0.382 | 9.17 | 11.46 | 22.93 |
| 158 | 0.380 | 9.11 | 11.39 | 22.78 |
| 159 | 0.377 | 9.06 | 11.32 | 22.64 |
| 160 | 0.375 | 9.00 | 11.25 | 22.50 |
| 161 | 0.373 | 8.94 | 11.18 | 22.36 |
| 162 | 0.370 | 8.89 | 11.11 | 22.22 |
| 163 | 0.368 | 8.83 | 11.04 | 22.09 |
| 164 | 0.366 | 8.78 | 10.98 | 21.95 |
| 165 | 0.364 | 8.73 | 10.91 | 21.82 |
| 166 | 0.361 | 8.67 | 10.84 | 21.69 |
| 167 | 0.359 | 8.62 | 10.78 | 21.56 |
| 168 | 0.357 | 8.57 | 10.71 | 21.43 |
| 169 | 0.355 | 8.52 | 10.65 | 21.30 |
| 170 | 0.353 | 8.47 | 10.59 | 21.18 |
| 171 | 0.351 | 8.42 | 10.53 | 21.05 |
| 172 | 0.349 | 8.37 | 10.47 | 20.93 |
| 173 | 0.347 | 8.32 | 10.40 | 20.81 |
| 174 | 0.345 | 8.28 | 10.34 | 20.69 |
| 175 | 0.343 | 8.23 | 10.29 | 20.57 |
| 176 | 0.341 | 8.18 | 10.23 | 20.45 |
| 177 | 0.339 | 8.14 | 10.17 | 20.34 |
| 178 | 0.337 | 8.09 | 10.11 | 20.22 |
| 179 | 0.335 | 8.04 | 10.06 | 20.11 |
| 180 | 0.333 | 8.00 | 10.00 | 20.00 |
