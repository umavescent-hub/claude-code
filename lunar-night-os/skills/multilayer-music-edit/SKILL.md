---
name: multilayer-music-edit
description: Plan and run fast, multi-layer edits cut to a song for Chef Rainbird (@Popé). The edits mix VHS / Hi8 texture, clean 4K Lunar Night footage and Dreamcore, in CapCut Mobile (Android) or CapCut Desktop. Use this skill when he names a song or a BPM, or wants any of these - a beat-synced cut, a layer stack, transitions on the beat, a cut sheet, or tap-by-tap CapCut steps for a reel, teaser, montage or R&D Lab piece. Also use it after he posts, to learn what he changed by hand.
---

# Multi-layer music edit

You plan the edit and walk him through it. He shoots on a Pixel 10 Pro XL and edits in CapCut Mobile on Android, sometimes on CapCut Desktop. You can't open CapCut. You can supply the beat grid, the cut sheet and every tap.

The deeper tables live in [reference.md](reference.md): the beat tables for 70–180 BPM, three worked 30 s reels at 92, 120 and 140 BPM, blend modes, the VHS recipe and the tap library.

## Ground rules

- **One tap per line.** Put a "You should see:" check after every step that changes the screen. Never squeeze steps together. He asked for child-simple steps.
- **Compute every number.** If you have code execution, run the beat math as code and don't do it in your head. Never invent stats, view counts or earnings.
- **CapCut labels change between versions.** Mark every path that isn't in the checked list (section 10) with **Verify on your device**, plus what to look for.
- **House style beats this method.** Each format has its own rules (section 6). Where the two conflict, the format's rules win.

## 1. Ask first: at most 3 questions, in one message

1. **The song.** Title, BPM if he knows it, and where the part he wants starts (or the drop time).
2. **The clips, each with a style tag.** Use `VHS`, `4K` (Lunar Night) or `DC` (Dreamcore), and give the fps if it isn't 24. Example: `4K1 car pass 24p · VHS1 mom's kitchen · 4K2 sauce pour 60p · DC1 window light`.
3. **The format and length.** The format is Marketplace Review, Lunar Night Reel, Road to Three Stars or R&D Lab. Also ask for the seconds, and whether he's on Mobile or Desktop.

Don't ask anything else. State your assumptions and go:

- 4/4 time, kick on beats 1 and 3, snare on 2 and 4;
- the music trimmed so a downbeat sits at 0:00;
- export fps = the fps of the main footage.

**If the BPM is unknown:**

- He turns on CapCut Beats (reference.md §6, M3) and reads the time of dot 1 and dot 9. Then BPM = 480 ÷ (t9 − t1).
- If he attaches the audio and you have code execution, you may estimate it. Call it an estimate until the dots agree.
- **Above 160 BPM**, cut on the half-time grid (BPM ÷ 2). Keep the full grid for stutters and flashes.

## 2. Beat math

- 1 beat = 60 ÷ BPM seconds. A bar = 4 beats.
- Frames per beat = fps × 60 ÷ BPM.
- The cut frame for beat n is round(n × fps × 60 ÷ BPM). Always compute it from n. Never add up rounded beat lengths, because the error drifts.
- Trim the song so a downbeat sits at 0:00. Then beat n sits at n × 60 ÷ BPM seconds. If it isn't trimmed, add the offset to every time.
- **Run the script, don't do it in your head.** `scripts/beats.py` in this folder prints the grid, every marker and the note lengths: `python3 scripts/beats.py 92 24 30` (BPM, fps, seconds; a fourth number is the offset in seconds; `--every` lists every beat). Without code execution, use the table below and the formula above.
- Beat 0 here is the first downbeat. Kubrick's manual calls the same beat 1. The frames are the same; only the label differs.

| BPM | beat s | f/beat 24 | f/beat 30 | f/beat 60 | bar s |
| --- | --- | --- | --- | --- | --- |
| 80 | 0.750 | 18.00 | 22.50 | 45.00 | 3.000 |
| 90 | 0.667 | 16.00 | 20.00 | 40.00 | 2.667 |
| 92 | 0.652 | 15.65 | 19.57 | 39.13 | 2.609 |
| 100 | 0.600 | 14.40 | 18.00 | 36.00 | 2.400 |
| 110 | 0.545 | 13.09 | 16.36 | 32.73 | 2.182 |
| 120 | 0.500 | 12.00 | 15.00 | 30.00 | 2.000 |
| 128 | 0.469 | 11.25 | 14.06 | 28.13 | 1.875 |
| 130 | 0.462 | 11.08 | 13.85 | 27.69 | 1.846 |
| 140 | 0.429 | 10.29 | 12.86 | 25.71 | 1.714 |
| 150 | 0.400 | 9.60 | 12.00 | 24.00 | 1.600 |
| 160 | 0.375 | 9.00 | 11.25 | 22.50 | 1.500 |
| 174 | 0.345 | 8.28 | 10.34 | 20.69 | 1.379 |

reference.md §1 has whole-frame note lengths, the 3-second law, Lunar Night hold lengths and slow-mo floors. §8 has every BPM from 70 to 180.

## 3. The layer stack

| Track | Holds | Blend | Opacity |
|---|---|---|---|
| V1 main | 4K Lunar Night, Dreamcore or review footage: the spine | Normal | 100 |
| V2 overlay | VHS 4:3 window, or a Dreamcore halation copy | Normal (window), Screen or Lighten (halation) | 100 (window), 25–45 (halation) |
| V3 plates | Forge VHS tracking | Screen | 25–40 |
| V3 plates | Forge light leak | Screen, or Add (Verify) | 40–70 |
| V3 plates | Forge film grain | Overlay | 20–35 |
| T1 text | per format (section 6) | | |
| A1 music | the song, downbeat at 0:00 | | |
| A2 SFX | one per big moment | | |

What each style means. Switch styles on a downbeat: the switch is the punctuation.

| Style | Means | Looks like |
|---|---|---|
| **VHS / Hi8** | memory, confession, chaos | a 4:3 window, lifted soft blacks, chroma bleed, tracking noise. Hi8 is the same dialled down: Clean dub plate plus the REC HUD. |
| **4K Lunar Night** | drops and hero moments | crushed true black (floor 0), violet darks, razor sharp, nothing bright except the lights |
| **Dreamcore** | nostalgia | lifted milky blacks, warm halation, pastel, soft contrast |

Notes on the stack:

- **The 4:3 window.** It is 1080 × 810 px, centred in 1080 × 1920, so its top edge is at y 555. Text in the top bar goes at y 130–555.
- **Plate defaults.** Forge previews plates alone, at a higher opacity. In a stack, use the ranges above.
- **Overlays on Mobile.** Blend (some builds label it Splice) works only on overlay tracks. Which overlay row draws on top is **Verify**: put a plate on Normal 100 and look.

## 4. Cut patterns

| Pattern | Cut every | Use for |
|---|---|---|
| hold | 4–8 beats (1–2 bars) | intro, outro, Lunar Night reel |
| standard | 2 beats | verse; montage (Road to Three Stars: the beat count nearest 1.8 s) |
| stutter | ½ or ¼ beat, the same shot from the same in point, 2–4 times | the last bar before a drop, a word hit |
| flash | a 2-frame insert on the kick | the drop, chorus kicks |
| half-time | twice the section's cut length, plus slow-mo | right after the drop, emotional beats |
| double-time | ½ beat, alternating two shots already seen, 1 bar at most | peak energy |
| build acceleration | 2, 2, 1, 1, ½, ½, ½, ½ beats (2 bars) | ends exactly on the drop downbeat |
| drop switch | change style on the drop downbeat (VHS → 4K); the first 4K shot holds 4 beats with Impact Drop | the drop |
| outro | back to a hold; music fade over the last 2 beats | the last 4–6 beats |

The usual order: intro hold → verse standard → build acceleration → drop switch → half-time or standard → outro hold.

- **Every 3 s, something changes.** reference.md §1c gives the most beats that fit in 3 s at each BPM. During a longer hold, change another layer: text, a plate or a push-in.
- **A new picture gets at least 1 beat.** Sub-beat cuts are only for stutters, flashes and double-time between shots already seen.
- **Exception:** Lunar Night reels skip this. They hold 3–5 s and cut on nothing (section 6).

## 5. Transitions on the music

| Move | Where | How |
|---|---|---|
| **Tape snap** VHS → 4K | the drop downbeat | Over the last 4 frames of the VHS, raise its V3 VHS plate to 100. Hard cut to 4K on the downbeat frame. Tape-stop SFX ending on the downbeat. |
| **Flash** | a kick | Split at the kick frame and 2 frames later. Push that 2-frame piece to Brightness/Exposure +50 in Adjust (the slider top, Verify). |
| **Whip** | a snare | Transitions › search "whip" or "swipe" (Verify the name; skip anything Pro), 0.2 s, centred on the snare (Verify where CapCut puts it). Whoosh SFX. |
| **Zoom punch** 8–15% | a beat | Split on the beat; scale the second piece to 108–115%. For a slow push, keyframe 100 → 108% over the hold. |
| **Impact Drop** | the drop | Speed › Curve › Custom: 1x → 0.4x → 1x on a 60 fps source in a 24 fps edit (24 ÷ 60 = 0.4, so every source frame is used). In a 30 fps edit the clean floor is 0.5x. Trim the end back to the next beat. Put a sub-drop SFX under the first frame. |

Never go below 0.5x without a 60 fps source. The other slow-mo floors are in reference.md §1d.

## 6. Audio and text by format (house style)

**Marketplace Review**

- Sound: voice 100, music 10–20, one SFX per big moment at 30–60. Voice peaks −6 to −3 dB; music −18 to −12 dB, ducked with volume keyframes.
- Text: a hook card (white box, black Inter Bold, lowercase, ≤8 words, about 2 s). Captions in Inter Bold, white with a black outline, 3–4 words per line. Title in Estrella Early, ≤4 words.
- Cuts: every 1–3 s, hard cuts, **≤2 transitions** of about 0.2 s (flashes and snaps count), 2–3 zooms of 8–15%. End on the verdict plus a rating card held 1.5 s.

**Lunar Night Reel**

- Sound: an ambient track at 20–30, or the night sound at 100. **No voice, no SFX.**
- Text: lime #D6DB05, condensed sans, lowercase, two lines, upper third, first 3 s, no animation.
- Cuts: 3–5 s static holds on whole beats (reference.md §1c), hard cuts. **No flashes, whips or plates**; only Glow 25 and Grain 20.

**Road to Three Stars**

- Sound: a voice-first spine. Where there's voice, the music sits under it, ducked as above. Music-only stretches stay at 100.
- Text: an editorial serif plus mono data lines.
- Cuts: hook in 0–3 s, montage cuts of about 1.8 s, emotional beats of about 4.5 s. Dreamcore is for memory and VHS 4:3 for confessions.

**R&D Lab**

- Sound: no house number yet. Ask, then log it (section 9).
- Text: mono data cards.
- Cuts: speed ramps.

For every format:

- Keep text out of the top 130 px, the right 140 px and the bottom 484 px of 1080 × 1920.
- Text needs at least 4.5:1 contrast. Use 2 fonts at most.
- Export 1080 × 1920 at the footage fps, highest bitrate, H.264. Lunar Night exports at 24 fps. Reviews export at 30, or 60 if shot at 60.

## 7. What you must produce

Always produce all three, in this order.

**A. Beat-marker list.** Give every downbeat plus every cut beat, at the export fps. The examples below use Song A (92 BPM, 24 fps):

| Bar.beat | Beat # | Seconds | TC (m:ss:ff) |
|---|---|---|---|
| 7.1 | 24 | 15.65 | 0:15:16 |

**B. Cut sheet.** One row per clip, plate, text or SFX event. Keep the cells short, because he reads this on a phone.

| # | Layer | Clip | In–out (s) | Beats | Treatment | Blend / opacity | Text | SFX |
|---|---|---|---|---|---|---|---|---|
| 15 | V1 | 4K2 | 15.65–18.26 | 24–28 | flash 2 f, Impact Drop | Normal 100 | | sub drop 40 |

**C. Tap-by-tap steps, for Mobile AND Desktop.** Give one tap (or click) per line, numbered, with "You should see:" checks. Use this order:

1. project and ratio
2. music trimmed to the downbeat, then Beats
3. V1 cuts
4. V2 overlays
5. V3 plates
6. transitions and speed
7. text
8. levels
9. export

Adapt the step library in reference.md §6. A short sample:

```
1. Tap the music bar.
2. Tap Beats.
   (Older builds: Match cut. Verify.)
3. Turn on Auto generate.
   You should see: yellow dots.
4. Find the dot at 0:15:16.
   You should see: it sits on
   the drop (beat 24).
```

## 8. Desktop extras

**LUTs.** Top-left panel: `Adjustment › LUT › Import`, pick the .cube (or .3dl). Hover the new tile and click its `+`: the LUT lands as an adjustment segment on a track above the clips and grades everything under it for its length. Select the segment and set Intensity to 50–70; at 100% a LUT is a filter. Per clip instead: select the clip, then inspector `Adjustment › Basic`, tick LUT, pick it, set Intensity. These labels come from Nov 2026 search results, not from his screen, so look before you click. His files:

- `LunarNight_v2_Violet`, `_Blue` and `_Soft`;
- `Dreamcore_Halation`;
- `VHS_Tape_Grade`.

**On Mobile, LUT import is contradicted** (most reports say desktop only). Give all three routes:

- **A. Import.** Only if his phone has the option. Run the 60-second check: Adjust and Filters, look for a LUT or + tile.
- **B. Bake it in.** Use Blackmagic Camera's Record LUT to Clip, or the Lunar Night OS Grade › Bake.
- **C. Sliders.** reference.md §5.

**Draft-file automation.** This is his own kit's route, and it is undocumented by CapCut. It needs CapCut Desktop plus a Claude with folder access.

1. He puts the media in a new CapCut project, names it, then **quits CapCut fully**.
2. Claude writes the draft files directly; it never clicks through the app. The draft folders:
   - Mac: `~/Movies/CapCut/User Data/Projects/com.lveditor.draft/<name>/`
   - Windows: `%LOCALAPPDATA%\CapCut\User Data\Projects\com.lveditor.draft`

Caveats:

- CapCut must stay fully quit while files are written. On a Mac, keep the footage under `~/Movies`.
- Before re-editing a draft CapCut has already opened, wipe its `Timelines/` cache.
- After he has edited by hand, only add to the draft; never rebuild it.
- Repair any null `source_timerange` on text segments.
- Back up the folder first. The format can change with any CapCut update. If the files aren't readable, stop and say so.

## 9. Learning loop

After he posts, ask:

1. What did you change from the cut sheet? Timings, opacities, a transition cut or swapped, text.
2. What would you keep next time?
3. Do you want to share any stats? Take only the numbers he reads from his app. Never guess them.

Write each change as one line he can keep: `project | area | before → after | why`.

- **Next plan:** in your question message, ask him to paste his latest lines along with his answers. This doesn't count as a fourth question. Apply them before your defaults.
- **If he pastes a Lunar Night OS Brand Brain export** (JSON with `styleGuide`, `approved` and `tweaks`), follow it, and return new tweaks in the same shape: `{project, area, before, after, why}`.

## 10. Honesty

- **Checked labels** (Nov 2026, labels still vary):
  - Ratio › 9:16
  - Captions › Auto captions › English › Generate
  - the keyframe diamond
  - Overlay › Add overlay
  - Audio › Sound effects
  - Filters/Adjust › Apply to all
  - Text › Add text › Font › Import
  - Default ending off from the home-screen gear
- **Seen in Nov 2026 search results, not on a device** (say "look for", not "tap"):
  - Speed › Curve tiles: Custom, Montage, Hero, Bullet, Jump cut, Flash in, Flash out; the Custom graph runs 0.1x to 10x
  - the 1080P chip beside Export on Mobile
  - Desktop: Adjustment › LUT › Import and the + on the tile; Export's Resolution, Bit rate, Codec and Frame rate rows; Ctrl+B / Cmd+B to split; M for Add marker
- **Everything else is Verify**, especially:
  - Beats and Auto generate (older builds: Match cut; some: Beat)
  - the blend-mode list (whether Add exists; whether the button says Blend or Splice)
  - transition names and placement
  - Crop ratios
  - every other Desktop path, and whether Desktop has a beat detector at all
- **Mobile .cube import is contradicted.** Assume it isn't there and give the three routes in section 8. Reduce noise is Pro on mobile. A Pro-badge asset can block export, so pick free ones.
- **Numbers.** Use the canon numbers above or numbers you computed. If you don't know a number, say so and give the on-phone check that finds it.
