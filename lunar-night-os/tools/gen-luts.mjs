#!/usr/bin/env node
/* Writes the house LUTs from the colour engine, then reads every file back
   with parseCube and checks it before reporting.
     node lunar-night-os/tools/gen-luts.mjs [--out dir]
   Output (default lunar-night-os/luts/):
     LunarNight_Master.cube, Dreamcore_Halation.cube, VHS_Tape_Grade.cube (33³)
     the same names with _17 (17³), and README.md. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outIdx = process.argv.indexOf('--out')
const OUT =
  outIdx > 0 && process.argv[outIdx + 1]
    ? path.resolve(process.argv[outIdx + 1])
    : path.join(ROOT, 'luts')

await import(pathToFileURL(path.join(ROOT, 'src/engines/lut-engine.js')).href)
const L = globalThis.LN_LUT
if (!L) throw new Error('lut-engine.js did not register globalThis.LN_LUT')

const SIZES = [33, 17]
const fileFor = (look, size) =>
  size === 33 ? look.file : look.file.replace(/\.cube$/, `_${size}.cube`)

function comments(look, size) {
  const p = L.defaults(look.id)
  return [
    `${look.name} - Lunar Night OS colour engine`,
    look.tagline,
    `${size}-point 3D LUT, default settings.`,
    'Input: Rec.709 SDR, gamma-encoded (record with 10-bit HDR off).',
    'Output: Rec.709 SDR. Use at 38-62% intensity in CapCut.',
    `Params: ${Object.entries(p)
      .map(([k, v]) => `${k}=${v}`)
      .join(' ')}`,
  ]
}

function check(file, table, size) {
  const parsed = L.parseCube(fs.readFileSync(file, 'utf8'))
  if (parsed.size !== size)
    throw new Error(`${file}: LUT_3D_SIZE ${parsed.size}, expected ${size}`)
  if (parsed.table.length !== table.length)
    throw new Error(
      `${file}: ${parsed.table.length} values, expected ${table.length}`,
    )
  let worst = 0
  for (let i = 0; i < table.length; i++) {
    const v = parsed.table[i]
    if (!(v >= 0 && v <= 1))
      throw new Error(`${file}: value ${v} at ${i} is outside 0..1`)
    worst = Math.max(worst, Math.abs(v - table[i]))
  }
  if (worst > 1e-6) throw new Error(`${file}: round trip off by ${worst}`)
  return parsed
}

fs.mkdirSync(OUT, { recursive: true })
const rows = []
for (const look of Object.values(L.LOOKS)) {
  for (const size of SIZES) {
    const t0 = performance.now()
    const table = L.build(look.id, {}, size)
    const text = L.toCube(table, size, {
      title: look.name,
      comments: comments(look, size),
    })
    const name = fileFor(look, size)
    const file = path.join(OUT, name)
    fs.writeFileSync(file, text)
    const parsed = check(file, table, size)
    const s = L.lutStats(parsed.table)
    rows.push({
      file: name,
      size,
      bytes: Buffer.byteLength(text),
      ms: Math.round(performance.now() - t0),
      min: s.min.toFixed(4),
      max: s.max.toFixed(4),
      mean: s.mean.toFixed(4),
    })
  }
}

const readme = `# Lunar Night OS LUTs

Three colour looks for the night documentary, as standard \`.cube\` 3D LUTs.
They are made by the colour engine in \`src/engines/lut-engine.js\` at its
default settings. The same engine runs inside Lunar Night OS, so the Grade
page can rebuild each look with different settings.

| File | Grid | Look |
|---|---|---|
${Object.values(L.LOOKS)
  .map(l => `| \`${l.file}\` / \`${fileFor(l, 17)}\` | 33³ / 17³ | ${l.name} |`)
  .join('\n')}

Use the 33-point files. The 17-point files are smaller and coarser; keep them
for apps that refuse a 33-point LUT.

## What each look is for

**Lunar Night** (\`LunarNight_Master.cube\`), the master grade for the series.
A cold obsidian world with warm food. Blacks print at about #08080A with a
cobalt lean in the shadows, whites roll off at about 242/255 with a lunar
silver lean, and greys stay clean. Reds go toward sear crimson (#9E2A2B),
crust, fat and yolk keep their glow, highlights on warm food turn tungsten
champagne, and greens, cyans, blues and purples are darkened and quieted
into the night. Skin is protected. Use it for service, plating, the pass and
interviews.

**Dreamcore** (\`Dreamcore_Halation.cube\`), for memory, origin and
reflection scenes. Milky lifted blacks, soft contrast, pastel colour, mint
greens, a lavender lean in the shadows and a warm rose-gold cast in the
highlights. A LUT changes colour only, so it can tint highlights the colour
of film halation but cannot make them glow or bloom.

**VHS** (\`VHS_Tape_Grade.cube\`), for archive-style inserts and
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
> cannot import custom \`.cube\` LUTs. If your version has no import option,
> use one of these instead:
>
> - **Bake** on the Grade page of Lunar Night OS: it applies the look to a
>   clip on the phone and saves a graded file that you then edit in CapCut.
> - **Slider recipes** on the Grade page: CapCut Adjust settings that get
>   close to each look with the built-in sliders.

**CapCut desktop** (for reference): Adjustment › LUT › Import, then pick the
\`.cube\` file and set the intensity.

## Rebuilding

\`\`\`
node lunar-night-os/tools/gen-luts.mjs
\`\`\`

This rewrites the six \`.cube\` files above and this README, then reads each
LUT back and checks its size, its value range and the round trip to within
1e-6. Other folders here (such as \`v2/\`) are left alone.

## Format

Adobe/IRIDAS \`.cube\`: \`#\` comments, \`TITLE\`, \`LUT_3D_SIZE\`,
\`DOMAIN_MIN 0.0 0.0 0.0\`, \`DOMAIN_MAX 1.0 1.0 1.0\`, then one \`r g b\`
line per lattice point with 6 decimals, red changing fastest.

| File | Size | Min | Max | Mean |
|---|---|---|---|---|
${rows.map(r => `| \`${r.file}\` | ${(r.bytes / 1024).toFixed(0)} KB | ${r.min} | ${r.max} | ${r.mean} |`).join('\n')}
`
fs.writeFileSync(path.join(OUT, 'README.md'), readme)

for (const r of rows)
  console.log(
    `${r.file.padEnd(30)} ${String(r.size).padStart(2)}³  ${(r.bytes / 1024).toFixed(0).padStart(5)} KB  ${String(r.ms).padStart(4)} ms  min ${r.min} max ${r.max} mean ${r.mean}  ok`,
  )
console.log(
  `wrote ${rows.length} LUTs + README.md to ${path.relative(process.cwd(), OUT) || '.'}`,
)
