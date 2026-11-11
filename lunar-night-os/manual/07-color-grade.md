# Colour: the LunarNight look

Black is black. Paper white sits low. The shadows lean violet or blue. The practical lights stay pure.

## The spec

**LAW: protect the black floor and the practicals; everything else serves them.**

- Black floor at 0. Paper white 0.30–0.48.
- Shadows Lab a +12 to +16, b −15 to −28: violet near 289° hue or blue near 226–238°.
- Capture at 3200K (violet) or 2800K (blue), 360° shutter, −1.5 to −2 EV.
- Sky check: grey sky → colder 2800K; cyan sky → warmer 3600K.

## Three routes to the look

**LAW: import the LUT if your build has it; otherwise bake or use sliders.**

1. **LUT import** (CapCut Desktop: `Adjustment › LUT › Import`). Use LunarNight v2 Violet, Blue, Soft or Kitchen at 38–62% intensity.
2. **Bake**: Kubrick's Bake tab applies the LUT to your clip in the browser and hands back a graded MP4.
3. **Sliders**: the CapCut recipe below.

> [!VERIFY] LUT import on Mobile
> In CapCut Mobile look for `Adjust › LUT`. If there is no import button, use Bake or the sliders.

## CapCut slider recipe

| Control | Value |
|---|---|
| Exposure | −15 |
| Contrast | +25 |
| Shadows | −40 |
| Highlights | −10 |
| Saturation | +15 |
| Temp | −30 |
| Tint | +15 |
| Fade | 0 |
| Vignette | +10 |
| HSL Blue | hue +15, sat +10 |
| HSL Green | sat +10 |
| HSL Orange | sat +10 |
| HSL Yellow | sat −10 |
| Glow | 25 |
| Grain | 20 |

## Other looks

- **Dreamcore**: milky lavender blacks, warm rose-gold whites, halation strong and warm.
- **VHS**: lifted blacks, 0.063–0.920 range, olive shadows, pink highlights, 4:3.

## Order of operations

Exposure and white balance first, then the LUT or sliders, then HSL, then glow and grain, then halation on an overlay. Export with 10-bit HDR off: the LUTs assume Rec.709 SDR.

> [!RECALL] Where does paper white sit? :: 0.30–0.48
> [!RECALL] Capture white balance for violet and blue nights? :: 3200K violet, 2800K blue
> [!RECALL] LUT intensity range? :: 38–62%
> [!RECALL] Shadows slider in the recipe? :: −40
> [!RECALL] HDR on or off for LUT work? :: Off, Rec.709 SDR
> [!RECALL] What never gets graded away? :: The black floor and the practical lights
