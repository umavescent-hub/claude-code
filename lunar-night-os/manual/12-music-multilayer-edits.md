# Music edits in layers

This chapter is for the fast, stacked edits: VHS and Hi8 texture, clean 4K Lunar Night footage and Dreamcore, all cut to a song you pick. The song is the clock. Every cut, plate and title sits on a beat you can count, so you can plan the edit before you open CapCut and build it fast once you do.

The laws in bold are the 2-minute read for the study block at the end.

## Beat math

**Law 1: The song is the clock. Count in beats and bars, then convert to frames.**

A bar is four beats. The first beat of a bar is the downbeat, where the kick usually lands. Every number in this chapter comes from three lines:

```text
seconds per beat  = 60 ÷ BPM
frames per beat   = fps × 60 ÷ BPM
frame of beat n   = round((n − 1) × frames per beat)
beats in a hold   = seconds × BPM ÷ 60
```

Count from the song's first downbeat, not from 0:00. If the track has a lead-in, trim it so beat 1 sits at the start of the timeline, or add the offset to every number.

| BPM | 1 beat | 1 bar | Frames per beat at 24 fps | at 30 fps | at 60 fps |
|---|---|---|---|---|---|
| 80 | 0.750 s | 3.000 s | 18 | 22.5 | 45 |
| 90 | 0.667 s | 2.667 s | 16 | 20 | 40 |
| 100 | 0.600 s | 2.400 s | 14.4 | 18 | 36 |
| 110 | 0.545 s | 2.182 s | 13.09 | 16.36 | 32.73 |
| 120 | 0.500 s | 2.000 s | 12 | 15 | 30 |
| 128 | 0.469 s | 1.875 s | 11.25 | 14.06 | 28.13 |
| 140 | 0.429 s | 1.714 s | 10.29 | 12.86 | 25.71 |
| 150 | 0.400 s | 1.600 s | 9.6 | 12 | 24 |
| 160 | 0.375 s | 1.500 s | 9 | 11.25 | 22.5 |

When the frames per beat isn't a whole number, never add rounded beats one after another, because the error piles up and the cuts slide off the beat. Work out every cut from beat 1 with the third line. At 128 BPM and 24 fps a beat is 11.25 frames, but four bars is exactly 180 frames.

Use the frame rate you will export at: 24 for a Lunar Night Reel, 30 for a Marketplace Review (60 only if you shot at 60).

> [!TIP] Half time and double time
> A song can feel like 70 or like 140. Pick the count that makes your holds land inside the house rule. Beat Forge offers the detected tempo, half and double, so you can choose.

## The layer stack

**Law 2: One job per layer. The main track tells the story; plates only add texture.**

| Layer | Where in CapCut Mobile | What sits there |
|---|---|---|
| **V1 main** | The main track | The picture: 4K Lunar Night, VHS 4:3 and Dreamcore clips. Every style switch happens here. |
| **V2 overlay** | First overlay track | A duplicate for halation, or a second picture. |
| **V3 FX plates** | Overlay track above | Grain, VHS tracking, light leak, a white flash. |
| **T1 text** | Text track | The hook card or the lime reel title. |
| **A1 music** | Audio track | The song: the clock. |
| **A2 SFX** | Second audio track | Marketplace, documentary and R&D only. Never in a Lunar Night Reel. |

Transitions only work between clips on the main track, and Blend only works on overlay items. That is why style switches live on V1 and texture lives on V2 and V3.

> [!VERIFY] Overlays and Blend
> `Overlay › Add overlay` is confirmed. Select the overlay, then `Blend`: research recalls 11 modes and an Opacity slider from 0 to 100, Blend only on overlay items, and transitions only on the main track. Check all three once, and check which overlay row draws on top.

### What each style means in the story

| Style | How it looks | What it says |
|---|---|---|
| **4K Lunar Night** | Black floor at 0, violet darks, pure practicals, paper white 0.30–0.44 | Now. The place, tonight, as it is. The payoff. |
| **VHS / Hi8, 4:3** | A 4:3 box, tape texture, tracking lines | The record: proof, a confession, a failure, the past. |
| **Dreamcore** | Lifted milky blacks, low contrast, pastel warm highlights, heavy warm bloom | Memory, heritage, the happy feeling. |

This follows your documentary rules: Dreamcore for memory and heritage, VHS 4:3 for confessions and failures.

> [!RULE] Never lift a Lunar Night black
> Dreamcore lifts the black point; Lunar Night crushes it and never uses Fade. Keep each look on its own clips. A Lunar Night clip never gets a Dreamcore grade, and never gets a plate that lifts its floor.

## Section patterns

**Law 3: Switch styles only on a downbeat. Long holds where the music breathes, short ones where it hits.**

Your house rule sets the hold in seconds. Convert it to beats with the last line of the beat math, then let the section move you inside that range.

| Format | House rule | Beats at 120 BPM |
|---|---|---|
| Lunar Night Reel | 3–5 s static holds, hard cuts | 6–10 |
| Marketplace Review | a cut every 1–3 s | 2–6 |
| Road to Three Stars | montage about 1.8 s, emotional beats about 4.5 s | about 4, and about 9 |
| R&D Lab | speed ramps carry the pace | set by the ramp |

| Section | What the music does | Hold | Night Reel at 120 | Marketplace at 120 | Beat Forge's first style |
|---|---|---|---|---|---|
| **Intro** | Sparse, sets the mood | Long end; cut on bar lines | 8–10 beats | 4–6 beats | Dreamcore |
| **Build** | Energy rises | Step shorter toward the drop | 8 beats | 4, then 2 beats | VHS |
| **Drop** | Full kit, the payoff | Switch on beat 1 | 8 beats | 2–4 beats | 4K Lunar |
| **Break** | Energy falls away | Long end; one held image | 8–10 beats | 6 beats | Dreamcore |
| **Outro** | Resolves | Long end; end on a bar line | 8–10 beats | 4–6 beats | VHS |

A Lunar Night Reel stays inside its 3–5 s whatever the section does. Its rhythm comes from the music, so it is the one format where you may cut on nothing. Everywhere else, cut on motion or on sound, and change something every 3 s.

## The drop switch

**Law 4: The drop is one hard cut on V1, from VHS 4:3 to full-frame 4K, on the downbeat frame.**

The VHS box makes the frame small and old, and the drop opens it up into now. In CapCut Mobile:

1. Put the song on A1 and turn on beat markers.
2. Zoom the timeline in until the playhead steps frame by frame. Park it on the drop's downbeat marker and check the frame against your beat math.
3. Split V1 there. Everything left of the split is VHS, everything right of it is 4K.
4. Split every V3 VHS plate at the same frame and delete the right-hand part. No tape texture survives into the drop.
5. Leave the white square between the clips empty: no transition.
6. Start the 4K clip on its strongest frame. In a Night Reel that is the car pass, so the light streak arrives with the kick.

To make the box, scale the VHS clip down to full width on a black background. On a 1080 × 1920 frame a 4:3 box is 1080 × 810, which leaves 555 px of black above and below.

> [!VERIFY] Beats and the 4:3 box
> Research recalls `Beats › Auto generate` on a selected music clip (older builds: Match cut), with yellow beat dots, and `Background › Color` (older builds: Canvas). A crop with a 4:3 preset may also exist under the clip's edit tools. None of this was confirmed: check the labels, and whether Auto generate has a Pro badge.

## Transitions on beats

- **Lunar Night Reel:** none. Hard cuts only.
- **Marketplace Review:** two at most, about 0.2 s each: 6 frames at 30 fps. Put the middle of the transition on the beat.
- **Documentary and R&D:** speed ramps do the work. Use `Speed › Curve` so the fast part ends on the downbeat. Never go below 0.5x without a 60 fps source.
- **Zooms as accents** (Marketplace): 2–3 push-ins of 8–15% on the bite, the money shot and the verdict. Put the second keyframe diamond on the beat.

> [!VERIFY] Transitions and speed
> Research recalls tapping the white square between two clips to open Transitions, a 0.5 s default, 0.1 s minimum and Apply to all, plus Curve presets such as Montage, Hero, Bullet, Jump cut, Flash in and Flash out. Check the names and the slider range.

## Blend modes and opacity for plates

| Plate | Blend | Opacity | Source |
|---|---|---|---|
| Halation (a blurred duplicate, Temp warmed, Blur 20–40) | Screen or Lighten | 25–45% | Your playbook |
| Light leak | Screen | 30–40% | Your notes |
| Grain plate | Overlay or Soft light | 20–30% | Your notes |
| VHS tracking or scanlines | Screen | Start in the light-leak range and judge it | Kubrick plate |

The blend maths protects the black floor. Over a black pixel, Overlay, Soft light and Multiply leave black alone. Screen and Lighten lift it wherever the plate isn't pure black. So:

- Grain on Overlay is safe over Lunar Night.
- A Screen plate must be pure black wherever it should do nothing.
- Scale a Screen plate to the VHS box. A plate that spills onto the black bars turns them grey.
- On the 4K sections, use the runbook's finish instead: the Glow effect at 20–30 with a small size, and Grain at 20.

> [!VERIFY] VHS effects
> Search `Effects › Video effects` for VHS, DV, retro or tape. The names weren't confirmed, and many carry a Pro badge, which can block export. A rendered plate from Forge, added as an overlay, avoids that risk.

## Audio rules per format

| Format | Music | Voice | SFX |
|---|---|---|---|
| **Lunar Night Reel** | Ambient track at 20–30, or the night sound at 100 | None | None |
| **Marketplace Review** | 10–20, at −18 to −12 dB, ducked under the voice | 100, peaks at −6 to −3 dB | One per big moment, at 30–60 |
| **Road to Three Stars** | Under the voice | Voice-first: the voice is the spine | Allowed |
| **R&D Lab** | Music-led | Optional | Allowed |

- End the song on a bar line so a looping reel loops cleanly.
- On a monetized video, use no copyrighted music: pick from the Commercial Sounds library.

> [!VERIFY] Importing your song
> Research recalls `Audio › Sounds` with a From device option, MP3, M4A and WAV support, and a Volume slider from 0 to 1000 where 100 is the original level. Check the import path and test your file type once.

## Export

| Format | Resolution | Frame rate | Bitrate |
|---|---|---|---|
| Lunar Night Reel | 1080p | 24 fps (30 if you shot 30) | Higher |
| Marketplace Review | 1080 × 1920 | 30 fps, or 60 if shot at 60 | Highest offered |
| Everything | H.264 | Match the source | Highest offered |

Before you export, turn the default ending off: the home-screen gear, then **Add default ending** off. Upload the file itself; never screen-record it. Keep text clear of the top 130 px, the right 140 px and the bottom 484 px.

> [!VERIFY] Export panel
> Research recalls a resolution chip such as `1080P` next to Export, with frame rates 24, 25, 30, 50 and 60, and a Code rate or Bit rate choice of Lower, Recommended and Higher. Check the labels and whether any codec choice exists.

## CapCut Desktop, when you're at a computer

- **Real LUTs.** Desktop can load the .cube looks: `Adjustment › LUT › Import`, then drag the LUT onto a track above the clips so it grades everything under it.
- **Claude can build the draft.** Put the media in a new project, name it, quit CapCut fully, and Claude writes the timeline into the draft files directly. Never edit while CapCut is open, and after you've made hand edits, only add.
- The same layer stack, beat math and Beat Forge build sheet apply. The sheet has a Desktop column.

> [!VERIFY] Desktop paths
> The LUT import path, whether 33-point files load, and whether it is free weren't confirmed. Import one LUT before you rely on it.

## Worked example: a 30 s Night Reel at 120 BPM

At 120 BPM and 24 fps: 1 beat is 12 frames, 1 bar is 48 frames (2 s), and 30 s is 15 bars, 60 beats or 720 frames. Seven shots, every hold between 3 and 5 s, hard cuts only, and the car pass third, on the drop.

| Shot | Beats | Bar.beat | Time | Frames | V1 | V2 / V3 | Section |
|---|---|---|---|---|---|---|---|
| 1 | 1–8 | 1.1 | 0.0–4.0 s | 0–95 | VHS 4:3, the sign | VHS plate in the box, Screen | Intro |
| 2 | 9–16 | 3.1 | 4.0–8.0 s | 96–191 | VHS 4:3, the lot | VHS plate in the box, Screen | Build |
| 3 | 17–24 | 5.1 | 8.0–12.0 s | 192–287 | **4K Lunar, car pass** | Glow and Grain effects | **Drop** |
| 4 | 25–32 | 7.1 | 12.0–16.0 s | 288–383 | 4K Lunar, the building | Glow and Grain effects | Drop |
| 5 | 33–40 | 9.1 | 16.0–20.0 s | 384–479 | 4K Lunar, one light | Glow and Grain effects | Drop |
| 6 | 41–50 | 11.1 | 20.0–25.0 s | 480–599 | Dreamcore | Halation duplicate, Screen | Break |
| 7 | 51–60 | 13.3 | 25.0–30.0 s | 600–719 | VHS 4:3 | VHS plate in the box, Screen | Outro |

- **T1:** the lime title for beats 1–6 (frames 0–71, the first 3 s), in the upper third. On shots 1 and 2 it sits on the black bar above the 4:3 box, so it reads without a box or outline.
- **A1:** the song at 20–30, cut so its bar 16 starts the loop. No A2.
- The drop switch is the cut at frame 192. Shot 7 cuts on beat 3 of bar 13, which is still on the beat.

## Beat Forge in Kubrick

Beat Forge is the Music Edit tab in The Cut. It does the counting for you.

1. **Analyse.** Pick the song (an audio file or a video). It decodes on the phone and finds the tempo (detected, half and double), the beat grid, the downbeats, and the sections labelled intro, build, drop, break and outro. Nothing is uploaded.
2. **Plan.** Choose the format and list your clips by style: 4K Lunar, VHS, Dreamcore or B-roll. The rules engine lays out V1, V2, V3, T1, A1 and A2 in seconds, frames, beats and bars, within that format's house rules. Fable 5.1 can draft the plan instead; Kubrick checks it and snaps it to the grid. Every Fable panel also shows its prompt, ready to paste into a Fable 5.1 chat.
3. **Preview.** A live sketch plays against the song, so you can see a cut that lands late before you build it.
4. **Build sheet.** Save the CapCut steps (Mobile and Desktop) and the beat-marker list. Build in CapCut from the sheet, one line at a time.
5. **Render.** An experimental rough cut as an MP4, for checking timing. It's frame-accurate when the phone has a connection; offline it records in real time and can drop frames. The finished edit is always the CapCut export.

After you post, log what you changed in CapCut in the Brand Brain, so the next plan starts closer to your taste.

## Drill: the 15-minute block

Timer on, phone face down except for CapCut.

1. **2 min: law lines.** Read only Laws 1–4 in bold above.
2. **8 min: drill in CapCut.** Pick a song and a 120 BPM count, or run it through Beat Forge. Build the first 12 s of the worked example: two VHS 4:3 shots of 8 beats, then the drop switch to 4K at frame 192. Put the lime title on beats 1–6. Export at 1080p, 24 fps, and watch the drop three times. If the cut lands late or early, move it to the marker and note how far it was off.
3. **5 min: recall.** Answer this chapter's cards without scrolling up. Wrong means reading that one line again, nothing else.

> [!RECALL] How many frames is one beat at 120 BPM and 24 fps? :: 12 frames (24 × 60 ÷ 120); a bar is 48 frames, or 2 s

> [!RECALL] The frames per beat isn't a whole number. How do you place cuts? :: Work out every cut from beat 1, round((n − 1) × frames per beat), never by adding rounded beats

> [!RECALL] A Lunar Night Reel holds 3–5 s. How many beats is that at 120 BPM? :: 6–10 beats

> [!RECALL] What is the drop switch? :: One hard cut on V1 from VHS 4:3 to full-frame 4K, on the downbeat frame, with every VHS plate split off at the same frame

> [!RECALL] What does each style mean in the story? :: 4K Lunar Night is now and the place; VHS 4:3 is the record, confessions and failures; Dreamcore is memory and heritage

> [!RECALL] Which blend modes leave a black floor at 0? :: Overlay, Soft light and Multiply; Screen and Lighten lift it wherever the plate isn't pure black

> [!RECALL] Audio for a Lunar Night Reel? :: Ambient track at 20–30 or the night sound at 100; no voice, no SFX

> [!RECALL] What are the five Beat Forge steps? :: Analyse, plan, preview, build sheet, render
