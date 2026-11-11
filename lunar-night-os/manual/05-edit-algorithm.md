# The edit algorithm

The Cut is the one place the four formats meet CapCut Mobile. This chapter is the order of operations for that page: the 12 steps you never reorder, the laws that decide every cut, the first three seconds, the structure timelines, the two speed-ramp presets with their output timecodes, the audio spine with its ducking plan, the caption rules per format, the clap habit that feeds Auto-Cut, and the loop that makes every Fable 5.1 plan better than the last. Every number here is the number The Cut uses.

Pick the format first. Everything else on the page follows it.

## The 12 steps

**LAW: Edit in a fixed order, every time. Never skip, never reorder.**

The order is the playbook's Module 3. The decisions are already made, so there is nothing to negotiate with at 1 a.m.

| # | Step | The law | Where in CapCut |
|---|---|---|---|
| 1 | Dump and tag | Import everything. Delete the obvious junk first, so the timeline only holds candidates. | `New project › pick the clips › Add` |
| 2 | Hook | The one shot that stops a stranger goes at 0:00. You have about 1.5 s before the swipe. | Touch and hold the hook clip, drag it to the start |
| 3 | Rough cut to the beat | Drop the music, let Beats mark it, split and trim so cuts land on the dots. A review averages 1.5–3 s a shot; hold longer only on the hero plate. | `Audio › Sounds › pick a track › Add`, then `tap the music › Beats › Auto generate`, then `playhead on a dot › tap the clip › Split` |
| 4 | Structure | Hook 0–3 → what and where 3–10 → cook or plate 10–45 → verdict 45–60 → payoff 60–75. | Arrange on the main track |
| 5 | Motion | One slow punch-in per shot: 100% to 108% over a 3 s hold. Two reads as cheap. | `tap the clip › playhead at its start › keyframe diamond`, then `playhead 3 s later › pinch to 108%` |
| 6 | Masks | Linear or Mirror for text reveals and split grades. | `tap the clip › Mask › Linear or Mirror` |
| 7 | Speed | Curve ramps on pours and knife work. Never below 0.5x without a 60 fps source. | `tap the clip › Speed › Curve` |
| 8 | Audio | Voice peaks −6 to −3 dB. Music −18 to −12 dB, ducked with volume keyframes while you speak. | `tap the clip › Volume`; `tap the music › keyframe diamond › Volume` |
| 9 | Captions | Auto captions, then fix every line. 2–4 words a card, inside the safe zones. | `Captions › Auto captions › English › Generate` |
| 10 | Text and titles | Two fonts max. Out of the bottom 20% and the right 12%. | `Text › Add text › Font › Import` |
| 11 | Colour | One grade across the timeline: correct, match, grade on one layer, look at 50–70%, finish. | `Filters or Adjust › set the values › Apply to all` |
| 12 | Export | 1080×1920, the frame rate you shot, the highest bitrate, H.264. Upload the file, never re-record the screen. | `1080P chip › Resolution 1080p › Frame rate › Code rate: Higher › Export` |

The Algorithm tab tracks these 12 as a checklist per project and remembers where you stopped.

> [!VERIFY] Labels on steps 1, 3, 6 and 12
> The import button may read Add or show a check mark. Beats › Auto generate comes from memory: tap a music clip and look for Beats (older builds: Match cut), then the Auto generate switch; if it is missing or Pro, tap Add beat by hand on each kick. Mask sits in the clip toolbar; scroll it sideways. Export says Code rate on older builds and may say Bit rate on newer ones; no H.264 choice is known on mobile, so Higher bitrate is the setting that matters.

> [!WARN] Pro badges block exports
> Reduce noise is Pro on mobile. So are Smooth slow-mo, Enhance voice and many caption styles. Your DJI mic track is already clean; skip the processing and skip anything with a badge.

## The three laws of the cut

**LAW: Cut on motion or on sound, never on nothing. Every 3 seconds something changes.**

- **Cut on motion or on sound.** A cut hides inside a hand lifting, a pan ending, or a beat. A cut in a static moment is visible and reads amateur. The one exception is the Lunar Night Reel: static holds, and the rhythm comes from the music, so you may cut on nothing.
- **The 3-second law.** Every 3 s something must change: shot, scale, text, sound or colour. Retention is measured per second, and Creator Rewards pays on it.
- **Save the skeleton.** Once an episode structure works, duplicate the project, strip the media, keep the text, timing, effects and grade. That file is next week's speed-run and a CapCut template.

How the 3-second law gets paid in each format:

| Format | What changes every 3 s |
|---|---|
| Marketplace Review | The shot. Cuts land every 1–3 s, every pause cut, 2 transitions max at about 0.2 s. |
| Lunar Night Reel | Exempt. 3–5 s static holds, hard cuts, no transitions. |
| Road to Three Stars | Montage cuts about every 1.8 s; an emotional beat holds about 4.5 s, so text or sound changes inside it. |
| R&D Lab | The speed. A ramp changes the scale of time inside one shot. |

## Hook architecture, 0–3 s

**LAW: Frame 0 carries three layers at once: a visual shock, a hard transient, and a title.**

The swipe comes at about 1.5 s. All three layers start on frame 0, not after a fade. The Algorithm tab draws this as three lanes on a 3 s ruler.

| Layer | Lane | Marketplace Review | Lunar Night Reel | Road to Three Stars | R&D Lab |
|---|---|---|---|---|---|
| Visual shock | 0–1.5 s | The plate landing, the knife into the meat, or the first-bite face | The most colourful frame of the night: one coloured light on one plain building | The strongest action apex of the episode, out of order if needed | The impact frame of the ramp: the pour landing, the blade through |
| Hard transient | 0–0.12 s | One SFX with a sharp attack (crunch, pop, sizzle) at 30–60 | No SFX. Start the music on a downbeat, or let the night sound carry it at 100 | Foley close and loud: the knife hit, the sear, the pan | The impact sound right on the speed drop |
| Title | 0–2 s (0–3 s outside Marketplace) | Hook card: white box, black Inter Bold, lowercase, 8 words max, about 2 s, no animation | Lime #D6DB05, condensed, lowercase, two short lines, upper third, first 3 s | Editorial serif chapter title with one mono data line under it | Mono data card: the one number that matters (°C, g, s) |

Hook card rules that do not bend: lowercase, 8 words or fewer, below the top 130 px, no animation. Lowercase hooks read like a friend. Lead with the most novel real image from this episode, never a logo or an intro.

> [!RULE] Three hooks before you shoot
> Plan with Claude: 3 hooks of 8 words max and an 8-shot list with seconds. Film only what is on the list. The hook is picked before the camera comes out, and confirmed at step 2.

## Format structure timelines

**LAW: One format per video. The hook, the levels, the captions and the plan all follow the format you pick.**

### Marketplace Review, reach cut (25–40 s)

Drawn at 35 s on the Formats tab. The section lengths are the playbook order squeezed down, a starting point, not a playbook number.

| Section | Time | Notes |
|---|---|---|
| Hook | 0–3 s | Hook card on for about the first 2 s |
| Where | 3–7 s | The meetup, the hand-off, the price |
| Cook / plate | 7–25 s | Cuts every 1–3 s; the push-ins on the money shot |
| Verdict | 25–33.5 s | The bite, the score, why |
| Rating card | 33.5–35 s | Held 1.5 s. No goodbye |

The example cut points at 1.5, 4.5, 9, 11.5, 14, 16.5, 19, 21.5, 23, 27 and 30 s: eleven cuts, none more than 3 s apart after the hook.

### Marketplace Review, Rewards cut (65–90 s)

| Section | Time |
|---|---|
| Hook | 0–3 s |
| What and where | 3–10 s |
| Cook / plate | 10–45 s |
| Verdict | 45–60 s |
| Payoff: score and rating card | 60–75 s |
| End window | 65–90 s |

Only videos over 1 minute earn Creator Rewards. The playbook says two things: Module 3 puts the verdict at 45–60 s, and Module 4 says the verdict lands after 60 s. This plan keeps the verdict talk at 45–60 and holds the score and the 1.5 s rating card until after 60, so the payoff crosses the line. If the talk runs long, slide the whole verdict past 60. Creator Rewards gates and RPM figures are creator-reported; never plan on an earnings number.

### Lunar Night Reel

- **Single shot:** one braced 6 s hold inside the 5–7 s rule. Lime text 0–3 s, off at 3 s. It loops, so end on the frame you began on.
- **Montage:** 6 shots × 4 s is the drawn example; the rule is 5–7 shots, each a 3–5 s static hold, hard cuts, no transitions. The car pass goes third or last. Text on the first 3 s only.

### Road to Three Stars, documentary rhythm (30 s example)

| Section | Time | Cuts |
|---|---|---|
| Hook | 0–3 s | Three layers on frame 0 |
| Montage 5 × 1.8 s | 3–12 s | Cuts at 4.8, 6.6, 8.4, 10.2 |
| Emotional beat | 12–16.5 s | One 4.5 s hold |
| Montage 4 × 1.8 s | 16.5–23.7 s | Cuts at 18.3, 20.1, 21.9 |
| Emotional beat | 23.7–28.2 s | One 4.5 s hold |

Montage cuts land on action apexes. Dreamcore for memory and heritage, VHS 4:3 for confessions and failures. Voice first: the edit follows the words.

### R&D Lab

No fixed length. Speed ramps carry the pace, mono data cards carry the numbers (grams, degrees, minutes), and the shots come from the R&D cards in the Shot Bible. Export 1080×1920 at the source frame rate.

## Speed ramps

**LAW: Speed › Curve on pours and knife work. Never below 0.5x without a 60 fps source.**

A ramp node is a clip time and a speed. Between nodes the Speed Ramps tab eases on a log scale (the default), or runs straight on the log scale if you switch to linear. Output time is the integral of clip time over speed, which is why a 2.1 s clip can run 4 s. Two presets ship; both are editable, and the copy block hands you the node list for CapCut.

### Impact Drop

Fast in, an instant drop at 0.35 s, a 0.4x hold to 1.8 s, then out at 5.5x. The drop is the impact frame: the pour landing, the blade through.

| Node | Clip time | Speed | Output time (eased) |
|---|---|---|---|
| 1 | 0.00 s | 4.5x | 0.000 s |
| 2 | 0.20 s | 5.0x | 0.042 s |
| 3 | 0.35 s | 5.0x, then drop to 0.4x | 0.072 s (impact) |
| 4 | 1.80 s | 0.4x | 3.697 s |
| 5 | 2.10 s | 5.5x | 3.993 s |

Clip span 2.10 s → output 3.99 s, average speed 0.53x.

| fps | Impact timecode | Frame | Output frames |
|---|---|---|---|
| 24 | 00:00:00:02 | 2 | 96 |
| 30 | 00:00:00:02 | 2 | 120 |
| 60 | 00:00:00:04 | 4 | 240 |

The 0.4x hold needs a 60 fps source. A 24 or 30 fps clip at 0.4x repeats frames and stutters. Shoot the Slow-mo pull at 4K60.

### Whip-Pulse

6.0x, down to 0.8x for 1.2 s, back to 6.0x. The 0.2 s edges are a starting point; drag them.

| Node | Clip time | Speed | Output time (eased) |
|---|---|---|---|
| 1 | 0.00 s | 6.0x | 0.000 s |
| 2 | 0.20 s | 0.8x | 0.115 s (impact) |
| 3 | 1.40 s | 0.8x | 1.615 s |
| 4 | 1.60 s | 6.0x | 1.730 s |

Clip span 1.60 s → output 1.73 s, average speed 0.92x. Every node stays above 0.5x, so a 30 fps source holds.

| fps | Impact timecode | Frame | Output frames |
|---|---|---|---|
| 24 | 00:00:00:03 | 3 | 42 |
| 30 | 00:00:00:03 | 3 | 52 |
| 60 | 00:00:00:07 | 7 | 104 |

### Putting a ramp into CapCut

1. `tap the clip › Speed › Curve › Custom`. You should see a flat line at 1x with five points.
2. Tap Custom again (it reads Edit) to open the graph. The axis runs 0.1x at the bottom, 1x in the middle, 10x at the top.
3. Drag the playhead to each clip time, tap Add beat, then drag the point up or down to the speed.
4. For the Impact Drop's instant drop, put two beats as close as CapCut allows at 0.35 s: one at 5.0x, the next at 0.4x.
5. Cut the clip so the impact frame lands on the beat or the SFX. Use the frame numbers above at your export fps.

> [!VERIFY] The curve editor
> Preset names (None, Custom, Montage, Hero, Bullet, Jump cut, Flash in, Flash out), the Add beat and Delete beat buttons and the 0.1x–10x axis are recalled, not checked. There is no per-node numeric readout in the notes, only the total duration before → after at the top. Whether nodes pin to source frames or output time is not established. Build one ramp, read the duration line, and compare it with the output above. Smooth slow-mo may be Pro or desktop only: open Speed on a slowed clip and note whether the toggle exists and whether it carries a badge.

## The audio spine

**LAW: Voice peaks at −6 to −3 dB. Music under the voice at −18 to −12 dB, ducked while you speak.**

CapCut shows volume as 0–1000 with 100 as the clip as recorded, not dB. If that scale is linear, dB = 20·log10(v ÷ 100): 50 is about −6 dB, 20 is −14 dB, 10 is −20 dB, 75 is −2.5 dB, 18 is −14.9 dB, and +4 dB is volume 158. There is no level meter on mobile, so judge voice peaks on the export.

| Format | Voice | Music bed | Foley | SFX | Duck |
|---|---|---|---|---|---|
| Marketplace Review | 100, every pause cut | 10–20 (−20 to −14 dB) | 100, sizzles +4 dB (158) | 30–60, one per big moment: bite, money shot, verdict | 20 → 10 |
| Lunar Night Reel | off | Ambient track 20–30, or the night sound at 100 | — | off | none |
| Road to Three Stars | 100, voice first | 75 → 18 under speech | 100, close and loud | Sparingly: Sound Forge hits on chapter turns | 75 → 18 |
| R&D Lab | 100, short data lines | 75 → 18 under speech | 100, the pour, the blade, the sear | 30–60, the impact on the ramp's drop | 75 → 18 |

Foley comes from the 60 fps clips: `tap the clip › Extract audio`, then `tap the new audio bar › Volume › 158`.

### The ducking plan

The Audio Spine tab turns your speech regions into volume keyframes. Type the stretches where you talk, one per line, as `0.4-2.6`. The planner:

- merges regions closer than two ramps apart;
- puts a keyframe one ramp before the voice starts (music up), one on the first word (music down), one on the last word (still down) and one a ramp after (back up);
- starts ducked if the first voice begins within a ramp of 0.

The ramp is 6 frames by default: 0.2 s at 30 fps, 0.25 s at 24. In CapCut: `tap the music › playhead on the keyframe time › keyframe diamond › Volume › the value`. The first keyframe sets the music to 20 (or 75), the next, 6 frames later, sets it to 10 (or 18). Auto-keyframe adds the rest once the first diamond exists. Copy keyframes hands you the whole list with frame numbers.

> [!VERIFY] Volume scale and keyframes
> The 0–1000 slider, 100 as unity and the dB maths all come from memory. Check once: set a clip to 50 and listen for a clear drop, about −6 dB. Then put the playhead on a music clip, tap the diamond-with-plus above the timeline, change Volume, move the playhead and change it again; you should see a second diamond appear by itself.

## Captions per format

**LAW: Auto captions, then fix every line. 2–4 words a card, inside the safe zones, two fonts max.**

Safe zone on 1080×1920: the top 130 px, the right 140 px and the bottom 484 px stay clear. Text contrast must be at least 4.5:1. Never pure yellow on food.

| Format | Font | Colour | Line | Place |
|---|---|---|---|---|
| Marketplace Review | Inter Bold | White, black outline, no box | 3–4 words, always on, no bouncing; natural casing | Low, under your face, above the bottom quarter |
| Lunar Night Reel | Condensed sans: Oswald, Antonio or Estrella Early | Lime #D6DB05, small black shadow; no box, outline or animation | Two short lines, lowercase, no punctuation | Centred in the upper third, first 3 s only |
| Road to Three Stars | The pairing's workhorse, Medium (pairing 10 Merriweather, pairing 1 Inter), 80–100 px | Off-white #F2EDE4, 60% black shadow | 2–4 words a card, light punctuation | Middle third |
| R&D Lab | Workhorse Medium; mono for data cards, 80–100 px | Off-white #F2EDE4, 60% black shadow | 2–4 words a card; numbers and units exact (180 °C, 12 g) | Middle third; data cards clear of the right 140 px |

The Captions tab splits a transcript into cards of 4 words or fewer and applies your glossary spellings (Ohkay Owingeh, Española, chile). It does not fix misheard words or write the hook; Polish with Fable 5.1 does. Fonts load from `Text › Add text › Font › Import`, .ttf or .otf only.

> [!VERIFY] Auto captions
> On some versions Auto captions sits under Text instead of Captions, and some caption styles are Pro. Open the Captions row, confirm Auto captions › English › Generate, and note whether a badge sits on the style you pick. If it is missing or locked, type the cards from the Captions tab with Text › Add text.

## The Auto-Cut clap habit

**LAW: Fluffed a line? Pause, clap twice, restart the sentence.**

House style for the Marketplace Review is every pause cut. Auto-Cut does that pass for you, and the clap habit lets it find the bad takes too.

On set: take, pause, clap clap, restart. Auto-Cut removes from the start of the fluffed take through the claps and keeps the restart. A third clap right after belongs to the same marker.

The engine's defaults:

| Setting | Default | What it means |
|---|---|---|
| Threshold | Noise floor + 8 dB (or −42 dBFS absolute) | Below this is silence |
| Min silence | 0.45 s | Shorter gaps stay |
| Lead / tail | 0.12 s / 0.18 s | Air kept around each kept piece |
| Min keep | 0.25 s | Shorter pieces are dropped |
| Clap to cut | on | Double claps mark a bad take |
| Clap tail | 0.3 s | Cut runs this far past the second clap |
| Crossfade | 3 frames | On the rendered jump cut |

A clap counts when it rises at least 15 dB above the 7.5–20 ms before it, peaks at −30 dBFS or louder, decays at least 10 dB within 40–60 ms, and is broadband (flatness 0.18 or more). Two claps 0.15–0.7 s apart pair into a marker. Speech vowels fail the decay or the flatness test.

Two exports:

- **Jump-cut MP4** through Mediabunny and WebCodecs, with the 3-frame crossfade. Needs a connection.
- **Cut list (.txt or .csv)** in source timecode at your fps. Cuts are listed last-first so the earlier times never move. Each line reads `Split at 00:00:12:08 · Split at 00:00:13:22 → delete`.

Work the list from the bottom up in CapCut: `playhead at the time › tap the clip › Split`, twice, then Delete. Pinch the timeline wide until single frames show; the playhead readout may show minutes and seconds only.

## The Fable Edit Plan loop

**LAW: Fable writes the plan, you do every tap, and every change you make by hand teaches the next plan.**

Fable 5.1 cannot open your project. It writes a cut sheet; you execute it. The Edit Plan tab builds the prompt from the format's rules, your clips, your verdict and the Brand Brain, and asks for JSON in one fixed shape.

**You give it:** the format; a target length (30 s Marketplace, 7 s Reel, 60 s documentary, 30 s Lab by default, within 10%); the music BPM if any; each clip as `name - seconds - what happens`; your verdict in your words.

**It returns:**

- **hook:** text, clip, in and out seconds.
- **rows:** one per kept piece in timeline order; row 1 is the hook; `keep_in` and `keep_out` inside the clip; on-screen text in the house style; SFX as sound and CapCut volume (`crunch 45`); zoom as `108% push-in over 3 s`; a final rating-card row where the format calls for one.
- **steps:** child-simple, one tap per line, every line ending in "You should see:" naming what appears. Start on the home screen, end after Export. Any step without that check is flagged on the page; ask for one before you trust it.
- **cover:** clip and second, plus a title of 4 words max.

With a BPM, shot lengths come in 2, 4 or 8 beats so cuts land on the dots. Without one, cut on motion or sound. The page checks the plan against the format: length within 10%, hook 8 words and lowercase, cuts inside the house range, the ending on the verdict with no goodbye. Save the plan as Markdown or copy the prompt into a Fable 5.1 chat when Claude is out of reach.

The loop closes in **Log it to the Brand Brain**: project, what you changed (hook, pacing, captions, on-screen text, audio, zoom, colour, cover), what the plan said, what you did, and why. The last five tweaks show on the page and ride along with every Fable request, so the next plan applies them and does not repeat the mistake. The first tweak you log teaches the next plan.

> [!TIP] The 6-minute drill
> Take any 20 clips, set a 6-minute timer, do steps 1–4 only, export. Speed under a clock, not beauty.

> [!OK] Before you upload
> Default ending off from the home-screen gear. 1080p, the frame rate you shot, Higher bitrate. Text clear of the top 130, right 140 and bottom 484 px. Ends on the verdict and a 1.5 s rating card. The file itself goes up, never a screen recording.

> [!RECALL] What comes immediately after the rough cut to the beat? :: Structure: hook → what and where → cook or plate → verdict → payoff

> [!RECALL] How long before the swipe, and what sits on frame 0? :: About 1.5 s; a visual shock, a hard transient and a title, all starting on frame 0

> [!RECALL] The 3-second law :: Every 3 s something changes: shot, scale, text, sound or colour. Only the Lunar Night Reel is exempt

> [!RECALL] Where do the verdict and the rating card sit in a Rewards cut? :: Verdict talk 45–60 s; score and the 1.5 s rating card after 60 s, ending between 65 and 90 s

> [!RECALL] Impact Drop: where is the impact frame at 30 fps, and what source does the 0.4x hold need? :: Output frame 2, 00:00:00:02; a 60 fps source

> [!RECALL] Marketplace levels: voice, music, SFX :: Voice 100, music 10–20, one SFX per big moment at 30–60

> [!RECALL] Ducking plan for the documentary :: 75 up, 18 under speech, 6-frame ramps on volume keyframes

> [!RECALL] The clap habit :: Fluffed a line? Pause, clap twice, restart the sentence. Auto-Cut removes through the claps

> [!RECALL] Which way do you work an Auto-Cut list in CapCut? :: From the last cut up to the first, so the earlier times never move

> [!RECALL] What closes the Edit Plan loop? :: Log the hand change to the Brand Brain: what the plan said, what you did, why
