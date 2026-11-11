# Night capture: the LunarNight v2 runbook

This is the runbook, in full, as a chapter: the look in numbers, what to hunt and when, the exact dials in Blackmagic Camera and in the stock Pixel Camera, the 8-step routine for every setup, the car pass, the bracing, and the reel structures the footage is cut into. About 70% of the look is made here, on the lot, with the phone. The grade only crushes what you underexposed and pushes the darks violet. Nothing in CapCut puts colour into a sky you shot black.

The laws in bold are the 2-minute read for the study block at the end.

## The look in numbers

**Law 1: Black floor 0, paper white 0.30–0.48, darks violet-blue. Expose for the lights; nothing else may be bright.**

These were measured from the two reference reels and from the three frames the Grade module was fitted to. They are the test for every clip you bring home.

| What | Number | What it means on the lot |
|---|---|---|
| Black floor | 0; 30–80% of every frame under 3% | True black. Underexpose at capture, crush in the grade. Never lift, never Fade. |
| Paper white | 0.30–0.44 in the reels; 0.36–0.48 on the fitted frames; only light cores reach 0.94 or more | Only the bulbs and signs are bright. Walls, cars and road sit in the dark. |
| Shadow tone | Lab a +12 to +18, b −17 to −28; measured shadow hues 289°, 226° and 238° | Darks are violet or deep blue, never grey. |
| Sky | violet 270–276° at saturation 0.75–0.87; or deep blue 220–236° at 0.80–0.98 | Cold white balance plus light pollution, shot before the sky goes black. |
| Practicals | green 120° sat 0.95; orange 20° sat 0.93; neon blue 230°; red 0° | Real coloured bulbs and signs, kept pure. Never painted in. |
| Camera motion | 0 px drift over 3 s, every shot | Braced dead-still. No handheld, no float. |
| Shutter | 360° at 24 fps, 1/24 s | Tail lights smear into streaks. |
| Glow | about 2% of the frame width around a bulb | Added in the edit, Glow 20–30. |
| Text | lime #D6DB05, condensed sans, lowercase, upper third | Chapter on Type. |
| Rhythm | 3–5 s static holds, hard cuts, one car pass as the hero | The light does the work. |

Capture does four things the grade cannot: cold white balance turns the sky and the ambient blue-violet; underexposure of −1.5 to −2 stops drops the unlit walls to black; the 360° shutter streaks moving lights; the brace gives the dead-still frame. The grade does the rest: crushes everything under 2.5% to pure black, pushes dark neutrals violet or blue, adds 6–12% saturation to blues, greens and oranges, adds glow and a little grain.

> [!RULE] The three numbers
> Read any night clip in 30 seconds: black floor (0 or lifted?), paper white (where do the brightest non-light surfaces stop?), shadow tone (what colour are the darks pushed toward?). Those three plus the capture white balance are the look. Everything else is decoration.

## What to shoot

**Law 2: One coloured light on one plain building, with a lot of dark sky around it. Pick the subject before you pick a setting.**

The shot is a single light source, real and coloured, on a plain wall, with empty sky or black above. You need at least one of these per frame:

- A house with a green, red or blue porch bulb, plus warm light in a window. The green-house reel is exactly this.
- Neon or LED signs: water and ice kiosks, motels, liquor stores, laundromats, car washes, pawn shops.
- Orange sodium streetlight hitting a wall.
- Red traffic lights or tail lights at the end of the street.
- The moon low in the sky, placed in a corner.

Where: Cerrillos Road motels and signs in Santa Fe, Riverside Drive in Española, gas stations after dark, the back of any strip mall. Small-town, empty, a little eerie. No people in frame.

Framing, from the reference:

- Phone vertical, 9:16. Subject in the middle third, horizon in the lower third, sky or black above.
- Straight on or a slight angle. No tilting the phone up or down.
- Nothing moves except a car passing.
- Stand far enough back that the whole building fits with air around it. 1x, or 2x for a tighter sign. Never the 0.5x ultrawide: it bends the building.
- Check the edges for stray bright lights and move until they are gone.

What to skip: a pitch-black sky (it will not turn violet, whatever you do), a scene with two or three competing light colours, a wall lit flat by a white floodlight, anything with a person in it, and the ultrawide.

## When

**Law 3: 30–75 minutes after sunset. In Santa Fe this November that is 5:30–6:30 pm. Clear or thin-cloud nights only.**

Sunset is about 5:00 pm now, so the window is 5:30 to 6:30. The sky still holds colour then. Ten setups in an hour is a good night, so plan the drive before you leave: the sign, the sodium wall, the porch bulb, the tail-light street, in an order that doesn't double back.

| Minutes after sunset | Sky | What to shoot |
|---|---|---|
| 0–30 | Too bright: paper white rises, blacks go grey | Drive, park, plant, test the first frame |
| 30–75 | Deep blue, turns violet at 3200K | Everything. The whole reel. |
| 75+ | Black; no colour to pull | The moon shot, a sign that fills the frame |

## Blackmagic Camera, the night sheet

**Law 4: 24 fps, 360°, ISO 400, 3200K tint 0, manual focus, 1x. Stabilization off. LUT on the display.**

Chapter 1 sets the app up tab by tab and saves NIGHT 24 as a preset. This is the sheet for tonight, so you can check it against the HUD in the dark.

### Settings, once at home

| Tab | Setting | Value |
|---|---|---|
| Camera | Enable Vertical Video | ON. The viewfinder becomes tall, 9:16. |
| Camera | Stabilization | OFF. You are braced; stabilization only crops and wobbles. |
| Camera | Reduce Noise, Increase Sharpening | OFF, OFF. They smear the dark areas and sharpen the grain. |
| Camera | Lock White Balance on Record | ON. |
| Camera | Shutter Measurement | Shutter Angle. |
| Camera | Flicker Free Shutter Based On | 60 Hz. |
| Record | Resolution | 4K, 3840 × 2160. |
| Record | Codec, Quality | HEVC, Max (or Extreme). |
| Record | Color space | Rec.709. Not HLG. HDR OFF. No HDR badge on the viewfinder. |
| Monitor | Zebras | ON, 95%. |
| Monitor | Focus Assist | ON. |
| LUTs | LUT Selection › Import LUT | `LunarNight_v2_Violet.cube` from Downloads. |
| LUTs | Display LUT | ON. The viewfinder turns dark and violet. |
| LUTs | Record LUT to Clip | ON when you edit in CapCut. `LunarNight_v2_Soft.cube` for a lighter bake. |

### The HUD, left to right

| Dial | Violet (green-house) | Blue (small-town) |
|---|---|---|
| FPS | 24 | 24 |
| Shutter | 360°. If it shows a speed, 1/24. | 360° |
| ISO | 400 to start. Never past 1600. | 400 |
| WB | Manual, 3200K, tint 0 | Manual, 2800K, tint 0 |
| Focus | Tap the lit building, then lock it manual | the same |
| Lens | 1x main | 1x main |

You should see: a dark violet picture, the coloured lights popping, and no zebra stripes except inside the brightest bulb. If the whole sky is grey-purple you are too bright: lower ISO.

Why 360° is safe under US mains: lights pulse 120 times a second, and 1/24 s holds exactly five pulses, so there is no rolling band. The same rule puts the kitchen at 1/60. Never the 50 Hz value: that is Europe.

> [!VERIFY] Shutter on this phone
> One review of the app on a Pixel 10 Pro says shutter and ISO cannot be set alone: switching AUTO off puts both into full manual. Check: tap SHUTTER, set 360°, then tap ISO and see whether it reads a number or AUTO. If both go manual, that is what you want tonight. Also confirm the WB panel runs to 2500K; the runbook's source says 2500–10,000K.

> [!VERIFY] Record LUT to Clip and CapCut
> Your playbook lists `Adjust › LUT › Import` on CapCut Mobile; the runbook says it cannot load a .cube. Check once on the phone. No import means Record LUT to Clip ON, or the slider recipe in Grade. A baked LUT cannot be undone, so bake Soft when you are unsure.

## The stock Pixel Camera, the fallback

**Law 5: Path B only when Blackmagic isn't on the phone. No LUT preview, and the auto modes fight you.**

Pro controls exist in Video on the 10 Pro XL, but there is no LUT on the viewfinder, no zebras and no histogram. You are exposing by eye and by the Shadows slider.

1. Open Pixel Camera. Swipe to Video.
2. `Video settings` (bottom left, or swipe up): Video Boost OFF. Night Sight video OFF. Both run in Google's cloud, brighten the night and turn your blacks grey.
3. Resolution 4K. FPS 24. 10-bit HDR OFF.
4. Stabilization Standard, or Locked. You are braced anyway.
5. `Sliders icon (bottom right)`: White balance dragged to 3200K, toward blue. 2800K for the blue variant.
6. Shutter speed: the slowest offered, 1/24 or 1/30.
7. ISO: 400 to start. Raise until only the bulbs show as bright.
8. Focus: manual. Drag until peaking outlines the building edges.
9. Shadows: all the way down. If your build shows no shutter or ISO in Video, Brightness −1.5 to −2 instead.
10. Tap the lit wall, then lock. A lock icon should appear.
11. Record. Colour comes later, with the slider recipe.

> [!VERIFY] Pro controls in Video, and the lock
> Sources disagree on whether Shutter and ISO appear in Video on the stock app. In Video, tap the sliders icon and list what shows: Brightness, Shadows, White balance, Focus, Shutter, ISO. The lock is a tap on the Lock button at the top right per Google, a touch and hold per the runbook: keep whichever shows the lock icon. Google's own page says 1x does best in low light; stay on it.

## The 8-step routine

**Law 6: Plant, frame, expose with ISO only, check the sky, focus and lock, hands off for 8 s, wait for the car, move on.**

The same routine every setup. Do not improvise it.

1. **Plant.** The Osmo on its stand with the motors locked, or the phone braced on the car roof, a post or a wall. The reference has zero movement; any sway reads as amateur.
2. **Frame.** Building in the middle third, horizon low, big dark sky above. Check the edges for stray bright lights and move until they are gone.
3. **Expose for the lights.** Raise or lower ISO only. Target: zebra stripes only inside the brightest bulb or sign. The sky looks dark violet on screen; the walls that are not lit look nearly black. Stay under ISO 1600.
4. **Check colour.** Sky violet or blue, warm windows orange, the green or neon light its own pure colour. Grey sky: go colder, 2800K. Cyan sky: go warmer, 3600K.
5. **Focus and lock.** Tap the lit wall, lock focus. Confirm peaking on the building edges.
6. **Hands off.** Press record, take your hand away, count 8 seconds. You will cut it to 3–5 s later.
7. **Wait for the car.** If a street is in frame, record a second take through a full car pass. The streaked tail lights are the hero shot.
8. **Move on.** One or two takes per setup, then the next light. Do not review on the spot; the LUT preview is the review.

> [!TIP] The sky check, in one line
> At 3200K: grey means 2800K, cyan means 3600K. The Rig module draws this on its white-balance strip so you can glance at it in the dark.

> [!WARN] ISO is the only exposure dial tonight
> The shutter is pinned at 360° for the streaks and the aperture is fixed. If zebras spread past the bulb onto the wall, you are overexposed: ISO down. If the bulb has no zebra at all, ISO up, stopping at 1600. Never open the shutter angle, never lift Shadows in the app, never touch exposure compensation while recording.

## The car pass

**Law 7: Keep rolling through the whole pass. The streak is the hero shot, third or last in the montage.**

At 360° every frame is exposed for the full 1/24 s, so a moving tail light leaves a continuous streak with no gaps between frames. At 180° the streak would be half as long and broken. That is the whole reason for the 360° shutter.

- Pick a setup where the street runs across the frame, not at the camera. Headlights coming at the lens blow out and put zebras everywhere; tail lights going away stay red and streak.
- Plant and expose for the building first, with no car in frame. The pass must not change the exposure: Blackmagic holds it manual, and on the Pixel you locked it.
- Roll before the car enters, and keep rolling until it has fully left and the sky settles. Cut later.
- One car is enough. Two cars crossing muddle the streaks.
- If no car comes in two minutes, take the static and move on. A reel needs one pass, not one per shot.

## Bracing

**Law 8: Nothing moves. Car roof, post, wall, or the Osmo locked as a stand. Then take your hand off.**

The reference measures 0 px of drift over 3 s. A phone in two hands cannot do that at 1/24 s: every tremor blurs the bulb into a smear that reads as fog. Chapter 3 is about handheld physics; tonight it is about not being handheld at all.

| Brace | How | Watch for |
|---|---|---|
| Car roof | Phone flat on the roof edge or against the door frame; your engine off | Engine vibration, and the roof flexing when you lean on it |
| Post or pole | Press the long edge of the phone into the post, both hands pinning it | Wind on a thin pole |
| Wall or ledge | Lay the phone on the ledge, lens past the edge; a folded towel sets the tilt | The ledge is lower than the horizon rule wants |
| The Osmo as a stand | Motors locked, legs out, on the ground or the hood | Never let it float: it is a stand tonight, not a stabilizer |

Press record, take your hand away, then count. Any touch during the 8 s shows as a wobble at 1/24 s. If the phone sits on the car, stand still: your weight on the door moves the roof.

Blackmagic stabilization is OFF for all of this. On the Pixel, Standard or Locked.

## Reel structures

**Law 9: 3–5 s holds, hard cuts, no transitions. A single shot runs 5–7 s and loops; a montage is 5–7 shots with the car pass third or last.**

| Reel | Shots | Length | Cut | Where the car pass goes |
|---|---|---|---|---|
| Single shot (the green house) | 1 | 5–7 s, looping | None. Cut it so the loop point is on a still moment | If it is the car pass, the whole reel is the pass |
| Montage | 5–7 | 5–7 holds of 3–5 s | Hard cuts only, on nothing | Third, or last |
| Music edit | 5–7 | Per the beat math in the music chapter | Hard cuts on downbeats | On the drop |

The rest of the finish, so the capture matches it:

- **Text:** lime #D6DB05, a condensed sans (Oswald, Antonio, or your Estrella Early), lowercase, two short lines, no punctuation, centred in the upper third just above the building, a small black shadow, no box, outline or animation, on screen for the first 3 s. So leave air above the building for the text.
- **Sound:** a slowed or ambient track at 20–30, or the night sound of the clip at 100. No voice. No SFX. Braced dead-still, the mics hear cars and wind, not your hands, which is why the night sound is a real choice.
- **Cover:** the frame with the most colour, the green wall or the neon sign, with a title of 4 words max in the same lime.
- **Export:** 1080p, 24 fps (30 if you shot 30), higher bitrate.
- **Safe zone:** keep the top 130 px, the right 140 px and the bottom 484 px clear of text.

It is the one format where you may cut on nothing. There is no action; the rhythm comes from the music.

## Grade, in one glance

The grade is the next chapters' work, but you shoot for it, so here is what it will do to tonight's clips.

| Route | What | When |
|---|---|---|
| A | A LunarNight v2 .cube on the clip | On the Blackmagic display tonight; in CapCut only if your phone can import it |
| B | Bake: Record LUT to Clip ON in Blackmagic, or the Bake tab in Grade | When you edit in CapCut Mobile |
| C | The slider recipe: Exposure −15, Contrast +25, Shadows −40, Highlights −10, Saturation +15, Temperature −30, Tint +15 (0 for blue), Fade 0, Vignette +10; HSL Blue hue +15 sat +10, Green sat +10, Orange sat +10, Yellow sat −10; Apply to all; Glow 25 small; Grain 20 | When you have a clean clip and no LUT |

The three files: `LunarNight_v2_Violet.cube` (default, darks to about 275°), `LunarNight_v2_Blue.cube` (darks to about 224°), `LunarNight_v2_Soft.cube` (60% Violet, blacks reach 1.6% so CapCut's Shadows slider finishes the crush). All are 33-point, Rec.709 in and out. They expect footage shot as above. On daylight footage they only look cool and dense.

If the result looks grey instead of black, Shadows to −50 and Exposure to −20. If it still looks grey, the capture was too bright: that is tonight's fault, not the grade's.

## End-of-night check

Before you drive home, three questions on the phone, in the gallery, with the screen at the brightness you locked:

1. Are the blacks black, not grey? If grey, tomorrow starts at a lower ISO.
2. Can you count the colours in every frame on one hand? More than five means the frame is busy; pick plainer walls.
3. Did you get one full car pass? If not, that is the first setup tomorrow.

> [!OK] A good night
> Ten setups between 5:30 and 6:30, every one braced and hands-off for 8 s, one full car pass, zebras only ever inside a bulb, and nothing reviewed on the lot.

## Drill: the 15-minute block

Timer on, phone face down except for the camera apps.

1. **2 min: law lines.** Read only Laws 1–9 in bold above.
2. **8 min: drill.** In the garage or the lot with one lamp: load NIGHT 24, brace the phone on the car roof, run the 8 steps out loud, expose until zebras sit only inside the lamp, run the sky check in both directions (2800K, then 3600K, then back to 3200K), record 8 s hands-off, then record a second take while someone walks a flashlight across the frame for the streak. Play it back once, for the blacks only.
3. **5 min: recall.** Answer this chapter's cards without scrolling up. Wrong means reading that one line again, nothing else.

> [!RECALL] The three numbers that define a Lunar Night grade? :: Black floor 0, paper white 0.30–0.48, shadow tone violet-blue (Lab a +12 to +18, b −17 to −28), plus the capture white balance

> [!RECALL] How many stops under, and with which dial on the lot? :: −1.5 to −2 stops, using ISO only; shutter stays at 360°

> [!RECALL] When is the window in Santa Fe this November? :: 30–75 minutes after a 5:00 pm sunset: 5:30–6:30 pm, clear or thin-cloud nights

> [!RECALL] Violet or blue: which white balance for each? :: 3200K tint 0 for the violet green-house look; 2800K tint 0 for the deep-blue small-town look

> [!RECALL] The sky check at 3200K? :: Grey sky means go colder to 2800K; cyan sky means go warmer to 3600K

> [!RECALL] Why 360° at 24 fps? :: 1/24 s streaks the tail lights with no gaps between frames, and holds exactly five 120 Hz pulses so US mains light doesn't band

> [!RECALL] Where may zebras appear, and what is the ISO ceiling? :: Only inside the brightest bulb or sign; never past ISO 1600

> [!RECALL] The 8 steps, in order? :: Plant, frame, expose for the lights, check colour, focus and lock, hands off for 8 s, wait for the car, move on

> [!RECALL] Montage structure and where the car pass sits? :: 5–7 shots, 3–5 s static holds, hard cuts, no transitions; the car pass third or last

> [!RECALL] Which lens, which brace, which stabilization? :: 1x (2x for a tighter sign), never 0.5x; car roof, post, wall or the Osmo locked as a stand; Blackmagic stabilization OFF
