# Lunar Night OS: module contract

The OS is one HTML page, built from plain files by `node lunar-night-os/build.mjs`. It ships two ways:

- **claude.ai Artifact** (`dist/artifact.html`): runs in a locked-down frame. Files reach the viewer only through the `downloads` capability. Claude (Fable 5.1) is reachable through the `sample` capability. `core.js` wraps both.
- **Standalone/offline copy** (`dist/lunar-night-os.html`): there is no `window.claude`, so `LN.save` falls back to a normal browser download.

The user is a working chef who shoots on an **Obsidian Black Pixel 10 Pro XL**, edits only in **CapCut Mobile (Android)**, and uses **Claude** and **Fable 5.1**. Fable 5.1 is a Claude model: text and images go in, text comes out. So "Fable makes an asset" always means one of two things:

- Fable writes the code or parameters, and the phone's browser renders the file.
- The OS's own built-in renderers make the file.

Never claim Fable outputs video or audio files directly. Never recommend desktop NLEs, external cameras, gimbals or microphones.


## Canon: the LunarNight v2 runbook (the user's own reference, wins on conflicts)

The full text is in `$SCRATCH/research/runbook.md`. Read it if your module touches look, shooting, grading, text or delivery. In short:

**The look in numbers.**
- Black floor: 0 (30–80% of the frame under 3%). Crush; never lift; never use Fade.
- Paper white: 0.30–0.44; only light cores reach 0.94 or more.
- Shadow tone: Lab a +12 to +18, b −17 to −28, so violet-blue darks.
- Sky: violet 270–276° (green-house reel), or deep blue 220–236° (small-town reel).
- Practicals kept pure: green 120°, orange 20°, neon blue 230°, red 0°.
- A dead-still frame and a slow 360° shutter (1/24 s at 24 fps) that streaks lights.
- Glow is about 2% of the frame width, so an edit glow of 20–30.
- About 70% of the look is made in camera: 3200K WB (2800K for the blue variant) and −1.5 to −2 stops.

**LUTs.** Three 33-point v2 files, Rec.709 in and out:
- `LunarNight_v2_Violet.cube` (default): under 2.5% in goes to 0; dark neutrals go violet (hue ~275°); blues rotate 14° toward purple; greens, oranges and blues gain 6–12% saturation; paper white lands at 0.94.
- `LunarNight_v2_Blue.cube`: the same crush and white point, but darks go deep blue (~224°) and purples pull toward blue.
- `LunarNight_v2_Soft.cube`: 60% Violet and 40% identity; blacks reach 1.6%, leaving room to grade in CapCut.

LUT QA:
- no NaN, and a monotonic grey axis;
- largest neighbour step about 0.10 (banding risk starts around 0.20);
- no patch pinned at saturation 1.00.

The brief's other looks (Lunar Night Kitchen, Dreamcore, VHS) stay as extra looks.

**Capture.**
- Path A, the runbook default, is the Blackmagic Camera app on the Pixel:
  - vertical video on; stabilization off; noise reduction and sharpening off; WB locked on record;
  - 4K, HEVC Max, Rec.709 with HDR off;
  - zebras at 95% and focus assist on;
  - import the LUT with Display LUT on. Turn Record LUT to Clip on when editing in CapCut, since CapCut can't load .cube files.
  - Dials: 24 fps, 360°, ISO 400, WB 3200K tint 0, manual focus, 1x lens.
- Path B is the stock Pixel Camera, where Pro controls work in video:
  - Video Boost off, Night Sight video off;
  - 24 fps, 4K, 10-bit HDR off;
  - in the Pro tab: WB 3200K, the slowest shutter, ISO 400, manual focus, Shadows all the way down; tap and hold to lock.
- Night exteriors are braced dead-still: car roof, post or wall, or the Osmo locked as a stand.
- The kitchen and documentary work keeps the brief's handheld techniques.

**CapCut slider recipe (Lunar Night v2).**
- Adjust: Exposure −15 (or Brightness −15), Contrast +25, Shadows −40, Highlights −10, Saturation +15, Temperature −30, Tint +15 (0 for the blue variant), Fade 0, Vignette +10.
- HSL: Blue hue +15 and sat +10; Green sat +10; Orange sat +10; Yellow sat −10.
- Then Apply to all.
- Effects: Glow 25 at a small size, over the whole video; Grain 20.
- If it looks grey: Shadows −50 and Exposure −20.

**Reels.**
- Text: lime #D6DB05 in a condensed sans (Oswald / Antonio / the chef's Estrella Early), lowercase, two short lines, no punctuation, centred in the upper third, small black shadow, no box, outline or animation, on screen for the first 3 s.
- Cuts: 3–5 s static holds and hard cuts. A single-shot reel runs 5–7 s and loops; a montage is 5–7 shots with the car-pass shot third or last.
- Sound: an ambient track at 20–30 or the night sound at 100. No voice, no SFX.
- Cover: the most colourful frame, with 4 words max.
- Export: 1080p at 24 fps, higher bitrate.
- Keep these clear of text: top 130 px, right 140 px, bottom 484 px.

**What to shoot (night exteriors).**
- Timing: 30–75 min after sunset (Santa Fe in November: 5:30–6:30 pm).
- One coloured light on one plain building, with lots of dark sky.
- Places: Cerrillos Road motels and signs, Riverside Drive in Española, gas stations, the backs of strip malls. No people.
- Framing: 9:16, subject in the middle third, horizon in the lower third, 1x or 2x, never the ultrawide.

**The 8-step routine.** Plant → frame → expose for the lights (ISO only, zebras inside the brightest bulb, stay under ISO 1600) → check colour (grey sky means go colder, 2800K; cyan means warmer, 3600K) → focus and lock → hands off, roll 8 s → wait for the car pass → move on.

**Reading a grade.** Three numbers: black floor, paper white and shadow tone, plus the capture white balance.

## Canon: the Creator Playbook and house style (the user's own, Nov 2026)

Sources: `$SCRATCH/research/playbook.txt` and `$SCRATCH/research/capcut-skill.md`. Read them if your module touches editing, colour order, type, captions, money or learning.

The user is Chef Rainbird (@Popé). The OS supports four **formats**, each with its own house style. Never mix them.

| Format | Length | Cuts | Type | Sound | Colour |
|---|---|---|---|---|---|
| **Marketplace Review**, the TikTok main series reviewing home-cook plates | 25–40 s for reach; 65–90 s when chasing Creator Rewards (verdict after 60 s) | every 1–3 s; every pause cut; hard cuts; ≤2 transitions (~0.2 s); 2–3 zooms of 8–15% on the bite, money shot and verdict | **Hook card**: white box, black Inter Bold, lowercase, ≤8 words, below the top safe band, about 2 s, no animation. **Captions**: Inter Bold, white with black outline, no box, 3–4 words per line, always on. **Title and cover**: Estrella Early, ≤4 words | voice 100, music 10–20, one SFX per big moment at 30–60 | subtle filter 20–40 + Adjust, or bake Dreamcore (happy) or LunarNight (dark) |
| **Lunar Night Reel** | per the runbook | 3–5 s static holds | lime condensed lowercase | ambient or night sound; no voice or SFX | per the runbook |
| **Road to Three Stars**, the documentary | — | hook 0–3 s; montage cuts about 1.8 s; emotional beats about 4.5 s; Dreamcore for memory and heritage; VHS 4:3 for confessions and failures | editorial serif + mono data lines | voice-first audio spine | — |
| **R&D Lab** | — | speed ramps | mono data cards | — | macro and plating shot bible |

- Marketplace Review ends on the verdict plus a rating card held 1.5 s, with no goodbye.
- Marketplace Review exports 1080p at 30 fps, or 60 if shot at 60.
- Safe zone on 1080×1920: keep the top 130 px, right 140 px and bottom 484 px clear. The playbook adds: keep text out of the bottom 20% and the right 12%.

Playbook laws:
- **Grading order:** Correct (Basic, per clip: exposure, a white napkin reads white, tint) → Match (Color Match / copy adjustments) → Grade on one adjustment layer (Curves, HSL, Wheels) → Look (LUT 50–70%; at 100% it's a filter) → Finish (halation, grain, vignette).
- **HSL food recipe:** Orange and Red saturation +8 to +15 and luminance +5; Green saturation −5 to −15; Blue hue toward teal and saturation +10; never touch the Orange hue.
- **Curves:** a gentle S as the base. Lift the black point for Dreamcore; drop the black point and pull the shadows for the dark look. Blue up in the shadows and down in the highlights gives teal/orange.
- **Halation:** duplicate the clip onto an overlay, Screen or Lighten, Blur 20–40, warm the Temp, Opacity 25–45%.
- **Check on a second screen** at 50% brightness.
- **Edit order (12 steps):** dump & tag → hook (about 1.5 s before the swipe) → rough cut to the beat (Beats auto-detect; reviews 1.5–3 s per shot) → structure (hook 0–3 → what/where 3–10 → cook/plate 10–45 → verdict 45–60 → payoff 60–75) → motion (one move per shot, 100%→108% over 3 s) → masks → speed (never below 0.5x without a 60 fps source) → audio (voice peaks −6 to −3 dB; music −18 to −12 dB, ducked) → captions (auto, then fix every line; 2–4 words per card; middle third) → text (2 fonts max) → colour → export (1080×1920, matching fps, highest bitrate, H.264; never re-record the screen).
- **Edit laws:**
  - Cut on motion or sound, never on nothing. Exception: Lunar Night reels, whose rhythm comes from the music.
  - Every 3 s something changes.
  - Save the skeleton as a CapCut template.
- **Colour science:**
  - The skin-tone line sits 10–20° off red; grade around it, never across it.
  - Warm food sells, and blue suppresses appetite. Keep reds and oranges honest, not neon.
  - Text contrast must be at least 4.5:1.
- **Font pairings (Google Fonts unless noted):**

  | # | Display | Workhorse |
  |---|---|---|
  | 1 | Estrella Early (licensed) | Inter |
  | 2 | Playfair Display | Source Sans 3 |
  | 3 | Bebas Neue | Lora |
  | 4 | Cormorant Garamond | Montserrat |
  | 5 | Anton | Work Sans |
  | 6 | DM Serif Display | DM Sans |
  | 7 | Fraunces | Inter Tight |
  | 8 | Space Grotesk | IBM Plex Mono |
  | 9 | Cinzel | Raleway |
  | 10 | Oswald | Merriweather |
  | 11 | Unbounded | Space Mono |

  - One pairing per series.
  - Captions are a Medium-weight workhorse at 4–5% of frame height (80–100 px at 1080×1920), off-white #F2EDE4 with a 60% black shadow. Never pure yellow on food.
- **Money:** TikTok Creator Rewards (18+, 10k followers, 100k views in 30 days, videos over 1 min; RPM roughly $0.40–$1.00 per 1k qualified views, as **creator-reported**; a qualified view is For You and 5+ s, and often 50–70% of views qualify), CapCut Template Creator Program (paid per use and export, plus referrals), TikTok Shop affiliate, LIVE gifts, local brand deals and freelance edits.
  - Label every money number as creator-reported or unofficial, exactly as the playbook does. Never promise earnings.
- **Learning:** 15-minute blocks (2 min law lines, 8 min drill in CapCut, 5 min recall), two modules a day max, and spaced recall on day 2 and day 7.
- **CapCut mobile facts** (checked Nov 2026; labels vary):
  - Ratio → 9:16.
  - Captions → Auto captions → English → Generate.
  - The keyframe is the diamond icon.
  - Overlay → Add overlay.
  - Audio → Sound effects.
  - Filters/Adjust → Apply to all.
  - Text → Add text → Font → Import (.ttf/.otf).
  - Default ending: turn it off from the home-screen gear.
  - **Mobile cannot import .cube LUTs; desktop only.** The playbook claims Adjust › LUT › Import; treat that as unverified and show the 60-second on-phone check.
  - Reduce noise is Pro on mobile.
  - Avoid Pro-badge assets, since they can block export.

On LUT import, CapCut mobile is **contradicted**. Every module that mentions it shows Route A (LUT import, if the phone has it, with a verify callout), Route B (bake: Blackmagic Record LUT to Clip, or the OS Bake) and Route C (sliders).

## Files

```
lunar-night-os/
  build.mjs            builder (markdown converter for manual/*.md lives here)
  src/manifest.json    load order of css/js
  src/core.css         design tokens + shared components (read it before styling)
  src/core.js          LN runtime (read it; this file documents it)
  src/boot.js          calls LN.boot() last
  src/data/*.js        content data (sets LN.data.*)
  src/engines/*.js     pure engines (no DOM), also loadable in Node via import()
  src/modules/<id>.js  one file per module or sub-module, plus optional <id>.css
  manual/NN-slug.md    manual chapters (rendered by modules/manual.js)
  tools/check.mjs      Playwright QA harness
  tests/*.test.js      bun tests for engines
```

## Writing a module file

Each JS file is a **classic script** with no `import` or `export`, written as an IIFE. The build wraps it in try/catch and syntax-checks it, and a syntax error drops only that file. Communicate only through `window.LN`.

```js
/* modules/example.js */
;(() => {
  const { h, ui } = LN
  LN.register({
    id: 'example',           // ascii slug = the #hash route
    num: 9,                  // pipeline order (see table below)
    title: 'Example',        // big serif page title
    short: 'Example',        // label in the top rail (keep ≤ 10 chars)
    kicker: 'STAGE NAME',    // mono eyebrow
    blurb: 'One sentence for the home pipeline card.',
    lede: 'One paragraph: what this page does for the chef, plainly.',
    outputs: ['3 .cube LUTs', 'PNG title cards'],   // chips: real things this page produces
    mount(el) {              // runs once, on first visit; el has class m-example
      el.append(ui.section({ eyebrow: 'Part', title: 'Heading', lede: '…' }, h('p', null, '…')))
    },
  })
})()
```

Module ids and pipeline numbers (fixed):

| num | id | title | owner file(s) |
|---|---|---|---|
| 1 | `rig` | Rig | modules/rig.js |
| 2 | `shots` | Shot Bible | data/shots.js, modules/shots.js |
| 3 | `edit` | The Cut | modules/edit.js, modules/autocut.js |
| 4 | `fx` | Transitions | modules/fx.js |
| 5 | `grade` | Grade | engines/lut-engine.js, modules/grade.js, modules/bake.js |
| 6 | `type` | Type & HUD | modules/type.js |
| 7 | `forge` | Forge | modules/forge.js (shell), forge-motion.js, forge-video.js, forge-audio.js, fable.js |
| 8 | `aura` | Aura | modules/aura.js |
| 9 | `manual` | Manual | modules/manual.js, manual/*.md |

Sub-modules register mount functions instead of pages:

- `LN.bake = { mount(el) }`, mounted inside Grade.
- `LN.forgeVideo = { mount(el) }`, `LN.forgeAudio = { mount(el) }` and `LN.fableStudio = { mount(el) }`, mounted as tabs inside Forge.
- `LN.forgeMotion = { mount(el) }`, the Motion Forge tab inside Forge: Fable 5.1 writes a scene as JSON and the phone renders it to MP4.
- `LN.autocut = { mount(el) }`, the Auto-Cut tab inside The Cut: silence and bad-take removal that exports a jump-cut MP4 and a cut list.

Forge tab order: Fable 5.1 Studio, Motion Forge, Overlay Forge, Sound Forge.
The Cut tab order: Algorithm, Speed Ramps, Audio Spine, Auto-Cut, Captions, Edit Plan.

Always guard: `if (LN.bake) LN.bake.mount(x)`.

## Core API (window.LN)

DOM

- `LN.h(tag, props, ...children)` creates an element. Props:
  - `class`, `style` (object; `--vars` OK), `text`, `dataset`, `ref(fn)`, `onClick`/`onInput`/… listeners, boolean attrs, and `value`/`checked`.
  - `html` sets innerHTML. Use it **only for trusted build-time strings, never for user input or AI output**; use `text` for those.
- `LN.s(tag, props, ...children)` is the same builder for SVG elements.
- `LN.$(sel, root)`, `LN.$$(sel, root)` and `LN.uid(prefix)`.
- `LN.reducedMotion()` returns a boolean. When true, skip or minimise animation.

UI kit (`LN.ui`, all return elements or `{el, get, set}`):

- `ui.section({eyebrow, title, lede, id}, ...children)` gives standard section spacing and heading.
- `ui.btn(label, onClick, {kind:'ghost'|'quiet'|'danger', small, block, id, disabled})`. The default is the primary amber button. Use one primary per panel.
- `ui.chip(text, 'amber'|'crimson'|'sage'|'')`.
- `ui.path('Edit','Speed','Curve')` draws a tap-path breadcrumb. Use it for every CapCut or Pixel menu path.
- `ui.callout('tip'|'warn'|'verify'|'rule'|'ok', content, title?)`. Use `verify` for any fact the research marked unverified. Its title reads "Verify on your device".
- `ui.kv([[k, v], …])` for a definition list; `ui.table(headers, rows)` for a scrollable table; `ui.steps([node|string…])` for a numbered step list; `ui.stat(value, label)`.
- `ui.copyBlock(text, {title, button})` gives a pre block with a Copy button. `.setText(t)` updates it.
- Form controls:
  - `ui.slider({id,label,min,max,step,value,unit,format,onInput,onChange})` returns `{el,input,get,set}`.
  - `ui.seg({label, options:[{value,label}], value, onChange})` returns `{el,get,set}`.
  - `ui.toggle({id,label,checked,onChange})`, `ui.select({id,label,options,value,onChange})` and `ui.field({id,label,value,placeholder,multiline,rows,onInput})`.
  - `ui.filePick({accept:'image/*'|'video/*', label, onFile(file)})` is a styled file-input button. Use it for camera-roll images and video.
- `ui.tabs([{id,label,render(el)}], {key})` gives sub-tabs. Each panel renders lazily, and the chosen tab is remembered per viewer.
- `ui.empty(text)` is a muted empty-state line.

Feedback (`alert`, `confirm` and `prompt` never show in the viewer, so never use them):

- `LN.toast(msg, {kind:'ok'|'warn'|'err', ms})`.
- `LN.sheet({title, body, actions:[{label, kind, onClick(close)}]})` is an in-page dialog. Use it for confirmations.
- `LN.copy(text, {label})` copies text. Call it inside a click handler; if the clipboard is blocked it falls back to a select-to-copy sheet.

Files:

- `LN.save({filename, data, mime})` saves a file and resolves `'saved' | 'declined' | 'unavailable' | code`. `data` may be a string, Blob, ArrayBuffer or typed array.
  - Inside the viewer, the user confirms every save. Call `LN.save` only from a click, one file per click.
  - Allowed extensions: `gif png jpg jpeg webp mp4 webm mov txt json md docx pptx epub csv ttf html svg pdf xlsx zip fig`. Any other extension (`.cube`, `.wav`) is wrapped automatically into `<name>.zip`.
  - Prefer building one `.zip` yourself for a set of files: `await LN.zip([{name, data}])` returns a Blob. Then tell the user in the UI how to extract it: Files by Google › tap the zip › Extract.
- `LN.canSave()` resolves to a boolean.

Claude (Fable 5.1):

- `LN.ai.ask(prompt, {json, onText, signal, images, effort, cache})` uses the model `claude-fable-5-1` and falls back to the most capable tier.
  - Call it only from a click. Use `json:true` for data, and say the exact JSON shape in the prompt.
  - It rejects `{code}`. Show `LN.ai.explain(e)`, and on a rejection keep the UI working.
  - The prompt must carry all context, because each call is memoryless.
- `await LN.ai.available()` tells you whether Claude is reachable; when it isn't, hide or disable the live button. Always also offer the prompt as copyable text so the chef can paste it into a Fable 5.1 chat.

Media helpers (`src/media.js`, owned by core):

- `LN.media.renderCanvasVideo({width, height, fps, duration, draw(ctx, t, i, n), canvas?, bitrate?, signal?, onProgress?(done, total)})` resolves `{blob, ext, codec, via, frames}`.
  - It is frame-accurate MP4 (H.264) through Mediabunny + WebCodecs when available. Otherwise it falls back to a real-time MediaRecorder capture, which can drop frames.
  - `draw` may be async. Abort with an `AbortController` signal.
- `LN.media.wav(channels: Float32Array[], sampleRate, bitDepth=24)` returns a `Uint8Array` WAV file.
- `LN.media.decodeAudio(file, sampleRate=48000)` resolves the decoded `AudioBuffer` of a video or audio file.
- `LN.media.hasWebCodecs()` and `LN.media.recorderMime()`.

Brand Brain (`LN.brain`), the chef's style memory ("train your personal editor"):

- `get()` returns `{styleGuide, approved[], tweaks[]}`. `setStyle(text)` updates the style guide.
- `addApproved({title, format, hook, pacing, music, look, whatWorked, notes})` logs an approved edit.
- `addTweak({project, area, before, after, why})` logs a manual change made in CapCut after an AI pass, so the next pass learns from it.
- `remove(kind, id)`, `reset()`, `export()` (a JSON string) and `import(json)`.
- `context()` returns the text block that `LN.ai.ask` prepends to every string prompt automatically. Pass `brain:false` to skip it.
- Use `LN.ai.compose(prompt)` to build "copy into a Fable 5.1 chat" text that includes the Brand Brain. Listen with `LN.bus.on('brain', fn)`.

Shared state:

- `LN.store.get(key, fallback)` and `LN.store.set(key, value)` keep per-viewer conveniences, wrapped in try/catch. Prefix keys with your module id, e.g. `grade.params`.
- `LN.bus.on(evt, fn)` returns an unsubscribe function; `LN.bus.emit(evt, data)` fires events. Core emits `route` (the new view id) when the view changes. Pause animations when your view is hidden.
- `LN.shotlist` is the kitchen ticket rail, shared by every module and persisted:
  - Methods: `all()`, `add({shotId?, name, lens, fps, ois, notes, duration})`, `addMany([...])`, `update(tid, patch)`, `remove(tid)`, `move(tid, ±1)`, `clear()` and `onChange(fn)`.
  - Ticket statuses: `'queued' | 'fired' | 'pass' | '86'` (86 = cut from tonight).
- Pre-flight progress: the rig module writes `LN.store.set('preflight.v1', {checked:{id:true}, total:N})` and emits `LN.bus.emit('preflight')`. The home view reads it.

Helpers:

- `LN.math`: `{clamp, lerp, mix, smoothstep, fract, round}`.
- `LN.fmt`:
  - `tc(sec,fps)` gives `HH:MM:SS:FF`; `frames(sec,fps)` and `seconds(frames,fps)` convert between the two.
  - `shutter(fps, angle=180)` gives a string like `'1/48'`.
  - Also `bytes(n)`, `dur(s)`, `signed(x,d)`, `num(x,d)`, `pad` and `slug`.
- `LN.color`: `{hex2rgb, rgb2hex, srgb2lin, lin2srgb}`.
- `LN.palette` holds the UI and grade colours. `LN.fonts` names the families loaded from Google Fonts:
  - UI: Instrument Serif, Newsreader and JetBrains Mono.
  - Title cards: Cormorant Garamond, Playfair Display, Space Mono and Courier Prime.
- `await LN.fontsReady(['600 64px "Cormorant Garamond"'])` before drawing fonts on a canvas.
- `await LN.lib.mediabunny()` loads the Mediabunny ESM bundle (v1.62.1) from jsDelivr. The local copy for reading its API is in `$SCRATCH/vendor/package` (`dist/modules/src/*.d.ts`). It is only available in the artifact or a networked browser; handle rejection with a clear message.

## Style rules

- **Tokens only.** Use the `var(--…)` colours from core.css: `--obsidian --graphite --graphite-2 --line --line-2 --silver --silver-2 --silver-3 --bone --amber --amber-soft --amber-line --crimson --crimson-text --sage --cobalt`. Canvas drawing may use `LN.palette` hexes.
- **Scope every CSS selector under `.m-<id>`.** For a sub-module, use a root class such as `.m-grade .bake-…`. Reuse core classes (`ln-card`, `ln-grid`, `ln-split`, `ln-stack`, `ln-row`, `ln-prose`, `ln-eyebrow`, `ln-h2`, `ln-h3`, `ln-kv`, `ln-table`, `ln-muted`, `ln-num`) before writing new CSS.
- **Phone first.** The phone width is 412 CSS px, and the page body must never scroll sideways.
  - Give flex and grid children that hold text `min-width: 0`.
  - Wide tables and diagrams go inside `.ln-scroll` or their own `overflow-x: auto` box.
  - SVG uses `viewBox` and width 100%.
  - Tap targets are at least 40px.
- **Fonts:** display headings use `var(--f-display)`, prose `var(--f-body)`, and UI, labels and data `var(--f-mono)`. Don't load other fonts.
- **Motion:** CSS keyframes or `requestAnimationFrame`. Respect `LN.reducedMotion()`, and stop rAF loops when your view is hidden (`LN.bus.on('route', id => …)`).
- **Copy:** write plainly, from the chef's side of the screen. Use active voice and short sentences. Kitchen vernacular fits the brand: fire, 86, all day, on the pass, mise. Don't use emoji or exclamation-mark hype.
  - Name real units: mm, f-stops, fps, `1/48 s`, Kelvin, frames, dB, LUFS.
- **Truth:** don't invent statistics, reviews, view counts or "studies show". Put CapCut and Pixel menu paths in `ui.path(...)`. Any path or number that research marked unverified gets a `ui.callout('verify', …)` that says what to check.
- **Page complete at rest.** The first frame of every module shows real content: example data, a loaded sample or a working preview, never an empty shell.
- **Accessibility:** use `<button type="button">` for actions and give controls labels. Keep focus visible (core does this). Use `aria-pressed` and `aria-selected` where relevant.
- **No network** except `LN.lib.*` and Google Fonts. No `fetch` to other hosts, no iframes, no `window.open`, and no `<a download>`.

## Build, test and format

```bash
# Several agents build at once: ALWAYS build into your own folder and point check.mjs at it.
node lunar-night-os/build.mjs --out $LN_SCRATCH/build-grade
LN_SCRATCH=$LN_SCRATCH/qa-grade node lunar-night-os/tools/check.mjs --file $LN_SCRATCH/build-grade/lunar-night-os.html --views grade --widths 412,1280 --shots --claude
LN_SCRATCH=$LN_SCRATCH/qa-grade node lunar-night-os/tools/check.mjs --file $LN_SCRATCH/build-grade/lunar-night-os.html --views grade --script /path/to/my-interactions.mjs --claude
bunx biome format --write lunar-night-os/src/modules/grade.js && bunx biome lint lunar-night-os/src/modules/grade.js
```

- `$LN_SCRATCH` is `/tmp/claude-0/-home-user-claude-code/0b1f30e1-effb-5e9c-80a8-0d4607fcb614/scratchpad`. When you override `LN_SCRATCH` for check.mjs, the Mediabunny vendor copy is still looked up under that folder, so copy or symlink `vendor/` into your QA folder first (`ln -s $LN_SCRATCH/vendor $LN_SCRATCH/qa-grade/vendor`), or keep the default `LN_SCRATCH` and only change `--file`.
- `check.mjs` prints JSON: console errors, page errors, horizontal-overflow offenders, `LN.failed`, and saves/asks recorded by the `--claude` stub. Screenshots go to `$LN_SCRATCH/shots/<view>-<width>.png`. Open them with the Read tool and look at them.
- A `--script` module exports `default async (page, {view, width, log, shot})`. Use it to click through your controls; `shot('name')` saves an extra screenshot.
- Fonts are stubbed in tests (the sandbox blocks Google Fonts), so serif fallbacks render. That's expected.
- Biome style: single quotes, no semicolons, 2-space indent, 80-column lines (formatter enforced), trailing commas. Run the formatter on your files, then fix any `biome lint` errors.
- Don't edit `core.js`, `core.css`, `build.mjs`, `manifest.json` or another agent's files. If you need a core change, describe it in your final report.
