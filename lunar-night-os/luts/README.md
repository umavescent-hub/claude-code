# Lunar Night OS LUTs

Three colour looks for the night documentary, as standard `.cube` 3D LUTs.
They are made by the colour engine in `src/engines/lut-engine.js` at its
default settings. The same engine runs inside Lunar Night OS, so the Grade
page can rebuild each look with different settings.

| File | Grid | Look |
|---|---|---|
| `LunarNight_Master.cube` / `LunarNight_Master_17.cube` | 33³ / 17³ | Lunar Night |
| `Dreamcore_Halation.cube` / `Dreamcore_Halation_17.cube` | 33³ / 17³ | Dreamcore |
| `VHS_Tape_Grade.cube` / `VHS_Tape_Grade_17.cube` | 33³ / 17³ | VHS |

Use the 33-point files. The 17-point files are smaller and coarser; keep them
for apps that refuse a 33-point LUT.

## What each look is for

**Lunar Night** (`LunarNight_Master.cube`), the master grade for the series.
A cold obsidian world with warm food. Blacks print at about #08080A with a
cobalt lean in the shadows, whites roll off at about 242/255 with a lunar
silver lean, and greys stay clean. Reds go toward sear crimson (#9E2A2B),
crust, fat and yolk keep their glow, highlights on warm food turn tungsten
champagne, and greens, cyans, blues and purples are darkened and quieted
into the night. Skin is protected. Use it for service, plating, the pass and
interviews.

**Dreamcore** (`Dreamcore_Halation.cube`), for memory, origin and
reflection scenes. Milky lifted blacks, soft contrast, pastel colour, mint
greens, a lavender lean in the shadows and a warm rose-gold cast in the
highlights. A LUT changes colour only, so it can tint highlights the colour
of film halation but cannot make them glow or bloom.

**VHS** (`VHS_Tape_Grade.cube`), for archive-style inserts and
family-video texture. Blacks sit at about 16/255 and whites at about
235/255, like consumer tape. Blues and cyans are tired, reds run hot toward
orange, shadows go green-yellow and highlights pink. It does not add the
smear, noise or wobble of tape; those come from texture and blur.

## Intensity

Apply each LUT at **38-62%** in CapCut. Start at 50%. The looks are built to
stay recognisable across that whole range, and to hold up at 100% when you
want the full effect.

## Input: Rec.709 SDR only

All three LUTs expect Rec.709 SDR, gamma-encoded footage: what the phone
records when 10-bit HDR is off. On a 10-bit HDR clip (HLG, BT.2020) the
colours and contrast come out wrong. For any clip you plan to grade with
these LUTs, switch it off first: Pixel Camera › Video settings › 10-bit HDR
(off).

## Importing

**CapCut Mobile (Android).** Open a clip and look in Edit › Adjust for a LUT
or "Import LUT" option.

> **To verify on your device:** most 2025-26 reports say CapCut Mobile
> cannot import custom `.cube` LUTs. If your version has no import option,
> use one of these instead:
>
> - **Bake** on the Grade page of Lunar Night OS: it applies the look to a
>   clip on the phone and saves a graded file that you then edit in CapCut.
> - **Slider recipes** on the Grade page: CapCut Adjust settings that get
>   close to each look with the built-in sliders.

**CapCut desktop** (for reference): Adjustment › LUT › Import, then pick the
`.cube` file and set the intensity.

## Rebuilding

```
node lunar-night-os/tools/gen-luts.mjs
```

This rewrites the six `.cube` files above and this README, then reads each
LUT back and checks its size, its value range and the round trip to within
1e-6. Other folders here (such as `v2/`) are left alone.

## Format

Adobe/IRIDAS `.cube`: `#` comments, `TITLE`, `LUT_3D_SIZE`,
`DOMAIN_MIN 0.0 0.0 0.0`, `DOMAIN_MAX 1.0 1.0 1.0`, then one `r g b`
line per lattice point with 6 decimals, red changing fastest.

| File | Size | Min | Max | Mean |
|---|---|---|---|---|
| `LunarNight_Master.cube` | 948 KB | 0.0000 | 1.0000 | 0.4334 |
| `LunarNight_Master_17.cube` | 130 KB | 0.0000 | 0.9999 | 0.4350 |
| `Dreamcore_Halation.cube` | 948 KB | 0.0796 | 1.0000 | 0.5995 |
| `Dreamcore_Halation_17.cube` | 130 KB | 0.0840 | 1.0000 | 0.6023 |
| `VHS_Tape_Grade.cube` | 948 KB | 0.0630 | 0.9200 | 0.5607 |
| `VHS_Tape_Grade_17.cube` | 130 KB | 0.0630 | 0.9200 | 0.5621 |
