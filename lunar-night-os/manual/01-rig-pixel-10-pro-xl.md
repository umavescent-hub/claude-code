# The Rig: Pixel 10 Pro XL

One phone shoots everything. This chapter is the phone itself: the three lenses and what each is for, the sensors on the bar, the mics, how the sensor behaves when you push it, Blackmagic Camera set up tab by tab, the stock Pixel Camera as the fallback, and the pre-flight you run before the first take. The Rig module carries the same numbers with a confidence label on each.

The laws in bold are the 2-minute read for the study block at the end.

## The three lenses

**Law 1: Pick the lens before you roll. Switching mid-take stutters, and 0.5x never touches a face or a night reel.**

| | 0.5x ultrawide | 1x main | 2x | 5x periscope |
|---|---|---|---|---|
| Sensor | 48 MP Quad PD, autofocus | 50 MP Octa PD, 1/1.3" | centre crop of the 1x sensor | 48 MP Quad PD, folded periscope |
| Aperture | ƒ/1.7 | ƒ/1.68 | ƒ/1.68 | ƒ/2.8 |
| Field of view | 123° | 82° | about 41° | 22° |
| Focal length | about 12 mm | about 24–25 mm | about 48 mm | about 110–113 mm |
| Stabilization | none; brace it | OIS + EIS | OIS + EIS | OIS |
| Close focus | about 2 cm (Macro Focus) | not published | not published | about 30 cm with manual lens and focus; about 57 cm in auto |
| Job | texture, Macro Focus, a whole station in a tight kitchen | the plate, the pass, the monologue, every night reel | plating, overheads, a tighter sign | hero plates across the pass, the 5x squeeze from 6 ft |

- **1x is the default for anything dark.** The biggest sensor and the brightest glass. Google's own troubleshooting says 1x does best in low light.
- **2x is the same glass**, flatter, so round plates stay round. Google calls the crop "optical quality".
- **5x needs light and distance.** In auto the phone hands 5x off to a crop of the main camera closer than about 57 cm, and may in dim light. Lock the lens and focus by hand for tele-macro at 30 cm. ƒ/2.8 is dim: skip it at night unless the sign is bright.
- **0.5x is for Macro Focus.** It switches on at about 3–4 cm and focuses to about 2 cm. No OIS, and it bends buildings and faces.
- **10x is a crop of the 5x.** Video zoom stops at 20x; the 100x Pro Zoom is photos only.
- **The front camera** is 42 MP, ƒ/2.2, 103°, autofocus, 4K at 30 or 60. It shoots the bite and the verdict.

> [!VERIFY] Lens order and lens lock
> Research disagrees whether the ultrawide or the wide sits leftmost on the bar; the 5x beside the flash is likely. Check: in Video, cover one lens at a time with a fingertip while you switch .5 / 1 / 5. Then open `Settings (bottom left) › Pro › Lens Selection › Manual`, confirmed for photos only, swipe to Video and see whether the UW / W / T buttons stay. If not, the phone may swap 5x for a crop on its own: stay past about 57 cm, or use the lens dial in Blackmagic Camera.

## The sensors on the bar

**Law 2: Keep your fingers and the side towel off the right end of the bar.**

| Part | What it is | On set |
|---|---|---|
| LDAF | Multi-zone laser autofocus, Class 1, near the flash | Measures distance instead of reading contrast, so focus lands on a white plate, steel or a glossy sauce. In the dark it still hunts: lock focus by hand. |
| Spectral and flicker sensor | Present on the rear; Google does not say what it does | Sensors of this class read 50/60 Hz mains flicker and the colour of the light, and can steer auto exposure. Once you fix a shutter by hand it cannot help you. No user anti-flicker setting; no 25 or 50 fps. |
| LED flash | Single or dual, disputed | Off, always. A light on the lens axis flattens food and lifts the black floor. |
| Temperature sensor | Pro and Pro XL only, beside the flash | Not a camera part. |
| Rear mic | Beside the cameras, near the LDAF | Faces whatever the main camera sees. |

The bar is a rounded pill. A smaller black glass window holds the three lenses, offset left; the flash, LDAF, flicker sensor and rear mic are on the right end.

## Three microphones

**Law 3: Know where your hands are. The Pro XL moved the bottom mic to the left of the USB-C port.**

| Mic | Where | What to do |
|---|---|---|
| Top | The hole on the top edge | Camera video records from it. In vertical it faces up: fine for a room, weak for a pan below you. |
| Bottom | Left of the USB-C port, swapped from the 9 Pro XL | A right-hand landscape grip covers it: muffled, uneven sound, gain spikes. Turn the phone 180° so the port faces left. |
| Rear | On the back, beside the cameras | For sizzle, point the back of the phone at the pan and keep both short edges clear. |

The spec lists stereo recording, Speech enhancement, wind noise reduction and Audio zoom. Speech enhancement goes ON for a monologue and OFF for sizzle, knife work, pours and every night reel: it treats sizzle as noise and thins it. Audio zoom narrows the mics toward a zoomed subject; try it on a 5x sizzle, leave it off for a room.

Your DJI mic is the other input. Voice peaks at −6 to −3 dB; music sits at −18 to −12 dB under it, ducked when you speak. The DJI signal is already clean, so resist over-processing.

> [!VERIFY] DJI receiver
> Which input the camera apps record with the receiver plugged in was not researched. Check: plug it in, record 5 s while you rub the transmitter, play it back. If you hear the rub, the app is using the DJI mic.

## How the sensor behaves

**Law 4: Google's processing is built for photos. For the look, you switch it off.**

- **Pixels.** The 50 MP main sensor has 1.2 µm pixels and normally delivers 12 MP photos (the kit's Photo size), 50 MP only in good light when you plan to crop. 4K is 3840 × 2160, about 8.3 million pixels, so video always has pixels to spare and 2x stays sharp.
- **Multi-frame processing.** The stock app's HDR+ pipeline and its video processing hold a bright window and a plate together with less noise. That is the one reason the kit reaches for Pixel Camera. At night the same processing turns your blacks grey.
- **10-bit HDR.** Native 10-bit HDR tops out at 4K30; 4K60 HDR likely needs Video Boost. There is no log profile. Keep HDR off: every LUT expects Rec.709 and HDR clips wash out in CapCut. The sensor can do 12-bit 4K, but only in third-party apps such as Blackmagic Camera.
- **Video Boost and Night Sight Video.** Both run in Google's cloud. The on-device copy is 1080p30 SDR until processing finishes; each recording caps at 10 minutes; backup must be on with Storage saver off. Both OFF for the look: they brighten the night.
- **Optimize FPS.** Switches 60 to 30 by light and motion. OFF before any 4K60 in a dark room.
- **Stabilization.** OIS on the wide and tele, EIS on top. Modes: Standard, Locked, Active (1080p only, likely 30 fps) and the separate Cinematic Pan mode. The master switch is `Settings › More settings › Video stabilization`. Chapter 3 says which to use when.
- **Thermal.** Google publishes no limits. One 10-minute 4K60 test read 34.8 °C at 5 minutes and 37.1 °C at 10, no shutdown, and not beside a flat-top. The kit's rule: short takes, phone off the pass between them; 4K in a 30 °C-plus kitchen under heat lamps can throttle or stop a recording. Case off on a hot line. Blackmagic Cloud off: background uploads heat the phone for no CapCut benefit.
- **Storage.** One test measured about 550 MB per minute of 4K60 in AVC and 440 MB in AV1. MB per minute ≈ Mbps × 7.5. 25 GB holds roughly 45 minutes of 4K60.
- **Codecs.** Pixel Camera offers H.264, HEVC and AV1 under Video format. Slow Motion records 1080p at 120 (the 1/4x setting) or 240 fps (1/8x).
- **Display.** 6.8", 1344 × 2992, 1–120 Hz, up to 3,300 nits peak. You judge exposure on it, so lock its brightness.
- **Body.** 162.8 × 76.6 × 8.5 mm, 232 g, IP68, Gorilla Glass Victus 2 both sides. Light enough to shake: that is Chapter 3.

> [!VERIFY] Codec labels and file size
> The Video format labels (AVC, HEVC, AV1) are unverified; older builds say "Store videos efficiently", on = HEVC. Check: open `Settings (gear) › More settings › Video format` and write down the options; record 1 minute of 4K60 and read the file size in Files.

## Blackmagic Camera, end to end

**Law 5: Set it once at home, in this order, and save it as a preset. On location you touch only the HUD.**

Blackmagic Camera is Path A, the default. It holds a fixed shutter and white balance, shows a LUT while you shoot, and can bake that LUT into the clip. Version 3.5 has a settings search box: if a path below differs on your phone, type the setting name.

### Settings › Camera

| Setting | Value | Why |
|---|---|---|
| Enable Vertical Video | ON | Native 2160 × 3840; nothing to crop later. |
| Lock Current Orientation | ON | Stops the image flipping when you tilt down over a plate. |
| Stabilization | OFF braced; ON handheld; Optical (or OFF) on 5x or a mount | Braced, stabilization only crops and wobbles. |
| Reduce Noise, Increase Sharpening | OFF, OFF | They smear the dark areas and halo the edges. |
| Lock White Balance on Record | ON | WB cannot drift mid-take. |
| Flicker Free Shutter Based On | 60 Hz | US mains. LEDs and signs pulse 120 times a second. Never the 50 Hz value. |
| Shutter Measurement | Shutter Angle at night; Shutter Speed in the kitchen | The night reel is written as 360°, the kitchen as 1/60. |

### Settings › Record

| Setting | Value | Why |
|---|---|---|
| Resolution | 4K (3840 × 2160) | Room to punch in and still deliver a sharp 1080 × 1920. 1080p only for 120 fps. |
| Codec | HEVC (H.265) | Smaller than H.264 at the same quality. ProRes is iPhone-only. |
| Quality or Bitrate | Max, the highest option | Low bitrate breaks steam, oil shimmer, grain and crumb into blocks. |
| Color space | Rec.709, HDR OFF | The Pixel offers Rec.709 or HLG, no log. No HDR badge on the viewfinder. |
| Frame rate | 24 night; 30 kitchen and review; Off Speed 60 at 4K or 120 at 1080p for pours | Export at the rate you shot. Off-speed clips may record no audio: grab the sizzle at normal speed too. |

### Settings › Monitor

| Setting | Value | Why |
|---|---|---|
| Zebras | ON, 95% | Night: stripes only inside the brightest bulb. Kitchen: fine on oil glints, never on the plate. |
| Focus Assist | ON; Colored Lines in Blue if offered | Blue never blends into gold batter, lemon or peas. |
| Histogram | ON | On a lit line, raise ISO until the hump sits mid-frame. |
| Guides | Thirds grid, safe area 80% | A rough check; the final one is in CapCut. |
| Display 3D LUT | ON for the night reel; OFF in the kitchen | At night the LUT preview is the review. A baked look cannot be undone on a plate. |
| Display Audio Meters | ON | Peaks around −12 dBFS, never above −6. |

### Settings › LUTs

1. Tap `Settings › LUTs › LUT Selection › Import LUT`.
2. Pick `LunarNight_v2_Violet.cube` from Downloads (unzip it first: Files by Google, tap the zip, Extract).
3. Display LUT ON. You should see the viewfinder turn dark and violet.
4. Record LUT to Clip ON when you edit in CapCut, because CapCut Mobile likely cannot load a .cube. For a lighter bake pick `LunarNight_v2_Soft.cube`: blacks reach 1.6% instead of 0, so CapCut's Shadows slider finishes the crush.
5. Record LUT to Clip OFF for the kitchen and the review. Those grade from a clean file.

### Function buttons, audio and media

- **False colour** on a function button, on only while you set exposure: red is clipped, yellow just below clipping, pink lighter skin, green middle grey, blue or purple near black. More honest than a bright phone screen. `Settings › Function Buttons`.
- **Audio format:** AAC 48 kHz, the safest in CapCut Mobile. `Settings › Audio`.
- **Save Clips To:** Gallery / DCIM, so CapCut sees them at once. `Settings › Media › Save Clips To`.
- **Blackmagic Cloud:** OFF. `Settings › Media`.

### The HUD, left to right

Six dials on the record screen: FPS, Shutter, ISO, WB, Focus, Lens.

| Format | FPS | Shutter | ISO | WB | Focus | Lens |
|---|---|---|---|---|---|---|
| Night Reel, violet | 24 | 360° (1/24 s) | 400, never past 1600 | 3200K, tint 0 | tap the lit wall, then manual | 1x |
| Night Reel, blue | 24 | 360° | 400 | 2800K, tint 0 | manual | 1x |
| Marketplace Review | 30 | 180° (1/60 s) | lowest that still looks bright | 5600K window, 4000K LED, locked | manual | 1x; 0.5x macro; 5x from 6 ft |
| KITCHEN 30 | 30 | 1/60 | 100 lit line; 400–800 dim room | 4000K LED; tint +10 if the plate looks green | tap the food, then manual | 1x |
| POUR 60 | Off Speed 60 | 1/120 | 200 | same locked WB | manual | 1x |
| Monologue | 24 | 1/60 under LEDs; 1/48 elsewhere | 50–400 | 3200K lamp or 5600K window | tap your face, lock | 1x |

Save them as presets, NIGHT 24, KITCHEN 30 and POUR 60: tap left of the HUD, then Presets.

> [!VERIFY] Blackmagic labels and the device list
> The runbook puts Stabilization under `Settings › Camera`, the kit under `Settings › Record`. The runbook calls bitrate Quality (Max or Extreme), the kit Bitrate (Max). The zebra level, peaking colour and false-colour button come from the kit only. One review says a fixed shutter forces ISO to manual on this phone: set 180°, put ISO on Auto, and see whether it locks to a number. The Pixel 10 Pro XL is not yet on Blackmagic's device list, so record and play back a 5-second test clip after every app update.

## Pixel Camera Pro controls

**Law 6: Path B is the fallback. It has no LUT preview, and the auto modes fight you.**

Pro Controls exist on the 10 Pro and 10 Pro XL, not the base Pixel 10. Since version 10.1 the app has one Settings list, with More settings behind three dots at the top right.

**Video settings** (bottom left in Video, or swipe up):

| Setting | Value | Why |
|---|---|---|
| Resolution | 4K | Never 8K: it only exists through Video Boost. |
| Frames/sec | 24 night; 30 review; 60 only for the slow-mo pull | 24, 30 and 60 are the choices. |
| 10-bit HDR | OFF | LUTs and CapCut expect SDR. |
| Video Boost | OFF | Cloud wait, grey blacks. Night Sight Video rides on it. |
| Stabilization | Standard, or Locked when braced | Chapter 3. |
| Speech enhancement | ON for talking, OFF for sizzle | Its place on the 10 Pro is unverified. |

**More settings** (three dots): `Video format` HEVC; `Video stabilization` on, off for a stuttering 5x; `Optimize FPS` off; `Composition › Grid type` 3 x 3 and `Framing hints` on; `Fast access › Quick access controls` on, which puts white balance on the left of the viewfinder and brightness and shadows on the right.

**Pro controls** (the sliders icon, bottom right): White balance with a Kelvin readout, right is warmer; Brightness; Shadows; Focus, with peaking and a magnified peaking viewfinder; Shutter speed and ISO, which sources disagree about in Video.

The night values: White balance 3200K, dragged toward blue. Shutter the slowest offered, 1/24 or 1/30. ISO 400, raised until only the bulbs show as bright. Focus manual until peaking outlines the building. Shadows all the way down. No shutter or ISO in Video on your build means Brightness −1.5 to −2 instead. Then tap the lit wall and tap Lock at the top right; a lock icon should appear.

Macro Focus is the flower icon at the top right of the viewfinder: Auto, On, Off. Off for plating, so the lens never jumps mid-take; On for texture.

> [!VERIFY] Pixel Camera in Video
> Settle four things. In Video, tap the sliders icon and list what appears: Brightness, Shadows, WB, Focus, Shutter, ISO. If Shutter shows, step through 24, 30 and 60 fps and see whether 1/60 and 1/120 are offered and hold while recording. Lock is a tap on the Lock button per Google, a touch and hold per the runbook and the kit: keep whichever shows a lock icon. Drag the White balance slider to each end and note the Kelvin. The stock app has no zebras and no histogram in any source.

## Pre-flight

**Law 7: Run it before the first take, the same way every night.**

| Group | Check | Why |
|---|---|---|
| Clean | Wipe all three lenses and the bar | Microfibre, small circles from the centre out. Kitchen air turns every highlight into haze. |
| Clean | Wipe the screen | Grease reads as soft focus. |
| Quiet | Do Not Disturb on | A buzz mid-take shakes a held frame. |
| Quiet | Airplane mode on, night exteriors | No calls, no vibration. Boost and backup wait. |
| Storage | 25 GB free or more | About 45 minutes of 4K60. |
| Thermal | Case off on a hot line; short takes | Let the glass breathe. |
| Display | Adaptive brightness off | Otherwise the screen drifts with the room and you misread exposure. |
| Display | Brightness locked near 75% | The same screen every night. Zebras still have the last word. |
| Look | LUT loaded in Blackmagic, Display LUT on | The LUT preview is the review. |
| Look | Zebras on at 95%, Focus Assist on | Stripes only inside the brightest bulb. |
| Look | White balance set in Kelvin and locked | Blackmagic: Lock White Balance on Record. Pixel: tap, then Lock. |
| Look | Focus manual and locked | Peaking on the edges. |
| Audio | 5 s test clip, played back | Listen for the hood fan and for your hand over the bottom mic. |

> [!TIP] The 30-second version
> Wipe. DND. 25 GB. Case off. Screen locked. LUT on. Zebras 95%. WB locked. Focus locked. Five seconds of audio. Roll.

> [!VERIFY] Android paths
> The Do Not Disturb, Airplane mode and Adaptive brightness paths were not researched, and recent Pixels call the menu Display & touch. Check: swipe down twice for the quick tiles; open `Settings › Display` and look for Adaptive brightness.

> [!RULE] Never mix formats
> Night Reel, Marketplace Review, Kitchen and Documentary each have their own sheet in the Rig. Pick tonight's format, load its preset, and leave it alone until you wrap.

## Drill: the 15-minute block

Timer on, phone face down except for the camera apps.

1. **2 min: law lines.** Read only Laws 1–7 in bold above.
2. **8 min: drill.** Build the NIGHT 24 preset in Blackmagic from memory: 24, 360°, 400, 3200K, manual focus, 1x, zebras 95%, LUT on. Save it. Run the pre-flight top to bottom and tick each box in the Rig. Record 5 s, play it back, listen for your hand.
3. **5 min: recall.** Answer this chapter's cards without scrolling up. Wrong means reading that one line again, nothing else.

> [!RECALL] Which lens for a night reel, and which never? :: 1x, or 2x for a tighter sign; never the 0.5x ultrawide

> [!RECALL] Closer than what distance does 5x hand off to a crop of the main camera in auto? :: About 57 cm; manual lens and manual focus reach about 30 cm

> [!RECALL] Where is the bottom mic on the Pro XL, and what do you do? :: Left of the USB-C port; turn the phone 180° so the port faces left

> [!RECALL] What do Video Boost and Night Sight Video do to the night look? :: They brighten it in the cloud and turn the blacks grey; both off

> [!RECALL] The six Blackmagic HUD dials for the violet night reel? :: 24 fps, 360°, ISO 400, 3200K tint 0, manual focus, 1x

> [!RECALL] Record LUT to Clip: when on, and which file for a lighter bake? :: On when you edit in CapCut; LunarNight_v2_Soft.cube

> [!RECALL] Zebra level and where the stripes may appear at night? :: 95%; only inside the brightest bulb

> [!RECALL] How much storage, and what does it hold? :: 25 GB free; about 45 minutes of 4K60 at roughly 550 MB a minute

> [!RECALL] Why lock the screen brightness? :: You judge exposure on the screen; adaptive brightness drifts with the room

> [!RECALL] Native 10-bit HDR frame-rate cap, and what you set anyway? :: 4K30; HDR off, Rec.709, because the LUTs and CapCut expect SDR
