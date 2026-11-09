/* Tests for src/engines/lut-engine.js (the Grade colour engine).
   Run: cd /home/user/claude-code && bun test lunar-night-os/tests */
import { describe, expect, test } from 'bun:test'

await import(new URL('../src/engines/lut-engine.js', import.meta.url).href)
const L = globalThis.LN_LUT

/* ------------------------------------------------------------ helpers */
const dec = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
/** Independent OKLCh (Ottosson) for checking the looks from outside. */
function oklch(r, g, b) {
  const R = dec(r)
  const G = dec(g)
  const B = dec(b)
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B)
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B)
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B)
  const Lk = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const h = (Math.atan2(bb, a) * 180) / Math.PI
  return { L: Lk, C: Math.hypot(a, bb), h: h < 0 ? h + 360 : h }
}
const hueDelta = (a, b) => {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}
const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b
const lunar = (r, g, b) => L.transform('lunar', {}, r, g, b)
const LOOK_IDS = ['lunar', 'dream', 'vhs']
// Build each default 33³ table once and reuse it below.
const built = {}
const buildMs = {}
for (const id of LOOK_IDS) {
  const t0 = performance.now()
  built[id] = L.build(id, {}, 33)
  buildMs[id] = performance.now() - t0
}

/* ------------------------------------------------------------ API shape */
describe('LOOKS', () => {
  test('has the three looks with the agreed ids, names and files', () => {
    expect(Object.keys(L.LOOKS)).toEqual(LOOK_IDS)
    expect(L.LOOKS.lunar.name).toBe('Lunar Night')
    expect(L.LOOKS.dream.name).toBe('Dreamcore')
    expect(L.LOOKS.vhs.name).toBe('VHS')
    expect(L.LOOKS.lunar.file).toBe('LunarNight_Master.cube')
    expect(L.LOOKS.dream.file).toBe('Dreamcore_Halation.cube')
    expect(L.LOOKS.vhs.file).toBe('VHS_Tape_Grade.cube')
  })

  test('every param is complete and its default sits inside its range', () => {
    for (const id of LOOK_IDS) {
      const look = L.LOOKS[id]
      expect(look.id).toBe(id)
      expect(typeof look.tagline).toBe('string')
      for (const p of look.params) {
        for (const k of ['key', 'label', 'help'])
          expect(typeof p[k]).toBe('string')
        for (const k of ['min', 'max', 'step', 'default'])
          expect(Number.isFinite(p[k])).toBe(true)
        expect(p.min).toBeLessThan(p.max)
        expect(p.default).toBeGreaterThanOrEqual(p.min)
        expect(p.default).toBeLessThanOrEqual(p.max)
      }
    }
  })

  test('the spec params and defaults are present', () => {
    expect(L.defaults('lunar')).toEqual({
      exposure: 0,
      contrast: 1,
      blackLift: 6,
      highlightRoll: 242,
      shadowCool: 16,
      highlightWarm: 14,
      foodPop: 1,
      greenTame: 1,
      blueCrush: 1,
      saturation: 0.88,
    })
    expect(L.defaults('dream')).toEqual({
      fade: 0.1,
      warmth: 1,
      magenta: 1,
      contrast: 0.85,
      halationTint: 1,
      saturation: 0.9,
    })
    expect(L.defaults('vhs')).toEqual({
      blackLevel: 0.063,
      whiteLevel: 0.92,
      chroma: 0.85,
      redBleed: 1,
      shadowTint: 1,
      highlightTint: 1,
    })
  })

  test('unknown look ids throw a clear error', () => {
    expect(() => L.build('sepia', {}, 9)).toThrow(/Unknown look "sepia"/)
    expect(() => L.defaults('nope')).toThrow(/lunar, dream, vhs/)
  })

  test('partial params merge with defaults', () => {
    const a = L.transform('lunar', { exposure: 0 }, 0.3, 0.5, 0.7)
    const b = L.transform('lunar', {}, 0.3, 0.5, 0.7)
    expect(a).toEqual(b)
    // More shadow cool, bluer shadows; out-of-range values are clamped.
    const base = L.transform('lunar', {}, 0.1, 0.1, 0.1)
    const cold = L.transform('lunar', { shadowCool: 40 }, 0.1, 0.1, 0.1)
    expect(cold[2] - cold[0]).toBeGreaterThan(base[2] - base[0])
    expect(L.transform('lunar', { shadowCool: 999 }, 0.1, 0.1, 0.1)).toEqual(
      cold,
    )
    expect(L.transform('lunar', { exposure: 'x' }, 0.3, 0.5, 0.7)).toEqual(b)
  })
})

/* ------------------------------------------------------------ lattice */
describe('build', () => {
  test('uses the .cube index formula, red fastest', () => {
    const n = 5
    const t = L.identity(n)
    expect(t.length).toBe(n * n * n * 3)
    for (const [r, g, b] of [
      [0, 0, 0],
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
      [3, 1, 4],
      [4, 4, 4],
    ]) {
      const i = ((b * n + g) * n + r) * 3
      expect(t[i]).toBeCloseTo(r / (n - 1), 6)
      expect(t[i + 1]).toBeCloseTo(g / (n - 1), 6)
      expect(t[i + 2]).toBeCloseTo(b / (n - 1), 6)
    }
    // build() writes transform() results at the same index.
    const tl = L.build('lunar', {}, n)
    const i = ((4 * n + 1) * n + 3) * 3
    const want = L.transform('lunar', {}, 3 / 4, 1 / 4, 1)
    for (let c = 0; c < 3; c++) expect(tl[i + c]).toBeCloseTo(want[c], 6)
  })

  test('every value of every look is finite and inside [0, 1]', () => {
    for (const id of LOOK_IDS) {
      const t = built[id]
      expect(t).toBeInstanceOf(Float32Array)
      expect(t.length).toBe(33 * 33 * 33 * 3)
      for (let i = 0; i < t.length; i++) {
        if (!(Number.isFinite(t[i]) && t[i] >= 0 && t[i] <= 1))
          throw new Error(`${id}[${i}] = ${t[i]}`)
      }
    }
  })

  test('adjacent lattice entries differ by at most 0.12 (smooth)', () => {
    const n = 33
    for (const id of LOOK_IDS) {
      const t = built[id]
      let worst = 0
      for (let b = 0; b < n; b++)
        for (let g = 0; g < n; g++)
          for (let r = 0; r < n; r++) {
            const i = ((b * n + g) * n + r) * 3
            const steps = [
              r + 1 < n ? i + 3 : -1,
              g + 1 < n ? i + n * 3 : -1,
              b + 1 < n ? i + n * n * 3 : -1,
            ]
            for (const j of steps) {
              if (j < 0) continue
              for (let c = 0; c < 3; c++)
                worst = Math.max(worst, Math.abs(t[i + c] - t[j + c]))
            }
          }
      expect(worst).toBeLessThanOrEqual(0.12)
    }
  })

  test('build(33) runs in under 500 ms', () => {
    for (const id of LOOK_IDS) expect(buildMs[id]).toBeLessThan(500)
  })

  test('rejects sizes outside 2..256', () => {
    expect(() => L.build('lunar', {}, 1)).toThrow(/2 to 256/)
    expect(() => L.identity(2.5)).toThrow(/2 to 256/)
  })

  test('lutStats reports min, max and mean', () => {
    const s = L.lutStats(L.identity(3))
    expect(s.min).toBe(0)
    expect(s.max).toBe(1)
    expect(s.mean).toBeCloseTo(0.5, 6)
  })
})

/* ------------------------------------------------------------ .cube I/O */
describe('toCube / parseCube', () => {
  test('writes the header in order with 6-decimal data lines', () => {
    const text = L.toCube(L.identity(2), 2, {
      title: 'Test "LUT"',
      comments: ['first', 'second'],
    })
    const lines = text.split('\n')
    expect(lines.slice(0, 6)).toEqual([
      '# first',
      '# second',
      'TITLE "Test \'LUT\'"',
      'LUT_3D_SIZE 2',
      'DOMAIN_MIN 0.0 0.0 0.0',
      'DOMAIN_MAX 1.0 1.0 1.0',
    ])
    expect(lines[6]).toBe('0.000000 0.000000 0.000000')
    expect(lines[7]).toBe('1.000000 0.000000 0.000000')
    expect(text.endsWith('1.000000 1.000000 1.000000\n')).toBe(true)
    expect(text.includes('\r')).toBe(false)
    expect(lines.length).toBe(6 + 8 + 1)
  })

  test('round trip toCube → parseCube is within 1e-6', () => {
    const t = built.lunar
    const p = L.parseCube(L.toCube(t, 33, { title: 'Lunar Night' }))
    expect(p.title).toBe('Lunar Night')
    expect(p.size).toBe(33)
    expect(p.domainMin).toEqual([0, 0, 0])
    expect(p.domainMax).toEqual([1, 1, 1])
    let worst = 0
    for (let i = 0; i < t.length; i++)
      worst = Math.max(worst, Math.abs(t[i] - p.table[i]))
    expect(worst).toBeLessThanOrEqual(1e-6)
  })

  test('tolerates CRLF, comments, blank lines and keyword order', () => {
    const text = [
      '# made elsewhere',
      '',
      'DOMAIN_MAX 1 1 1',
      'LUT_3D_SIZE 2',
      '   # indented comment',
      'TITLE "Odd order"',
      'DOMAIN_MIN 0 0 0',
      'LUT_IN_VIDEO_RANGE',
      '',
      '0 0 0',
      '1 0 0',
      '0 1 0',
      '1 1 0',
      '0 0 1',
      '1 0 1',
      '0 1 1',
      '1 1 1',
      '',
    ].join('\r\n')
    const p = L.parseCube(String.fromCharCode(0xfeff) + text) // with a BOM
    expect(p.title).toBe('Odd order')
    expect(p.size).toBe(2)
    expect(Array.from(p.table)).toEqual(Array.from(L.identity(2)))
  })

  test('throws a clear error for 1D LUTs and wrong data counts', () => {
    expect(() => L.parseCube('LUT_1D_SIZE 4\n0 0 0\n')).toThrow(/1D LUT/)
    expect(() => L.parseCube('LUT_3D_SIZE 2\n0 0 0\n1 1 1\n')).toThrow(
      /Expected 8 data lines for LUT_3D_SIZE 2, found 2/,
    )
    expect(() => L.parseCube('0 0 0\n')).toThrow(/before LUT_3D_SIZE/)
    expect(() => L.parseCube('TITLE "x"\n')).toThrow(/LUT_3D_SIZE/)
    expect(() => L.parseCube('LUT_3D_SIZE 2\n0 0\n')).toThrow(/three numbers/)
  })
})

/* ------------------------------------------------------------ sampling */
describe('sample', () => {
  test('is exact at lattice points', () => {
    const n = 33
    const t = built.lunar
    for (const [r, g, b] of [
      [0, 0, 0],
      [32, 32, 32],
      [5, 17, 29],
      [31, 0, 12],
    ]) {
      const i = ((b * n + g) * n + r) * 3
      const o = L.sample(t, n, r / 32, g / 32, b / 32)
      for (let c = 0; c < 3; c++)
        expect(Math.abs(o[c] - t[i + c])).toBeLessThan(1e-6)
    }
  })

  test('the identity LUT reproduces its input, and inputs are clamped', () => {
    const id = L.identity(17)
    for (const rgb of [
      [0.3, 0.6, 0.9],
      [0.01, 0.99, 0.5],
      [0.123, 0.456, 0.789],
    ]) {
      const o = L.sample(id, 17, ...rgb)
      for (let c = 0; c < 3; c++)
        expect(Math.abs(o[c] - rgb[c])).toBeLessThan(1e-6)
    }
    const out = [9, 9, 9]
    const o = L.sample(id, 17, -1, 2, 0.5, out)
    expect(o).toBe(out)
    expect(o[0]).toBeCloseTo(0, 6)
    expect(o[1]).toBeCloseTo(1, 6)
    expect(o[2]).toBeCloseTo(0.5, 6)
  })

  test('applyToImageData mixes by intensity and leaves alpha alone', () => {
    const t = built.lunar
    const px = [
      [0, 0, 0, 255],
      [200, 120, 60, 128],
      [255, 255, 255, 7],
    ]
    const img = { data: new Uint8ClampedArray(px.flat()) }
    L.applyToImageData(img, t, 33, 0.5)
    px.forEach(([r, g, b, a], k) => {
      const want = L.sample(t, 33, r / 255, g / 255, b / 255)
      const rgb = [r, g, b]
      for (let c = 0; c < 3; c++)
        expect(
          Math.abs(
            img.data[k * 4 + c] - (rgb[c] + (want[c] * 255 - rgb[c]) * 0.5),
          ),
        ).toBeLessThanOrEqual(0.5001)
      expect(img.data[k * 4 + 3]).toBe(a)
    })
    const same = { data: new Uint8ClampedArray([10, 20, 30, 40]) }
    L.applyToImageData(same, t, 33, 0)
    expect(Array.from(same.data)).toEqual([10, 20, 30, 40])
  })
})

/* ------------------------------------------------------------ Lunar Night */
describe('Lunar Night', () => {
  test('black lands within 2.5/255 of #08080A', () => {
    const k = lunar(0, 0, 0).map(x => x * 255)
    expect(Math.abs(k[0] - 8)).toBeLessThanOrEqual(2.5)
    expect(Math.abs(k[1] - 8)).toBeLessThanOrEqual(2.5)
    expect(Math.abs(k[2] - 10)).toBeLessThanOrEqual(2.5)
  })

  test('white rolls to luma 242 ± 6 and leans silver (B ≥ R)', () => {
    const w = lunar(1, 1, 1)
    expect(Math.abs(luma(w) * 255 - 242)).toBeLessThanOrEqual(6)
    expect(w[2]).toBeGreaterThanOrEqual(w[0])
  })

  test('the neutral ramp is strictly increasing', () => {
    let prev = [-1, -1, -1]
    for (let i = 0; i <= 64; i++) {
      const v = i / 64
      const o = lunar(v, v, v)
      for (let c = 0; c < 3; c++) expect(o[c]).toBeGreaterThan(prev[c])
      prev = o
    }
  })

  test('0.8 grey leans cold (B > R)', () => {
    const o = lunar(0.8, 0.8, 0.8)
    expect(o[2]).toBeGreaterThan(o[0])
  })

  test('Maillard orange keeps its chroma and hue', () => {
    const a = oklch(0.75, 0.42, 0.18)
    const b = oklch(...lunar(0.75, 0.42, 0.18))
    expect(b.C).toBeGreaterThanOrEqual(a.C)
    expect(hueDelta(a.h, b.h)).toBeLessThanOrEqual(12)
  })

  test('herb green, blue and purple lose chroma', () => {
    const cut = rgb => 1 - oklch(...lunar(...rgb)).C / oklch(...rgb).C
    expect(cut([0.25, 0.55, 0.2])).toBeGreaterThanOrEqual(0.2)
    expect(cut([0.2, 0.35, 0.8])).toBeGreaterThanOrEqual(0.35)
    expect(cut([0.5, 0.2, 0.6])).toBeGreaterThanOrEqual(0.4)
  })

  test('skin stays natural: hue within 6°, chroma at least 90%', () => {
    for (const rgb of [
      [0.85, 0.62, 0.5],
      [0.72, 0.5, 0.38],
      [0.45, 0.3, 0.22],
    ]) {
      const a = oklch(...rgb)
      const b = oklch(...lunar(...rgb))
      expect(hueDelta(a.h, b.h)).toBeLessThanOrEqual(6)
      expect(b.C / a.C).toBeGreaterThanOrEqual(0.9)
    }
  })
})

/* ------------------------------------------------------------ Dreamcore, VHS */
describe('Dreamcore', () => {
  test('blacks are milky (≥ 0.07) and the mids are soft (slope < 1)', () => {
    const k = L.transform('dream', {}, 0, 0, 0)
    for (const c of k) expect(c).toBeGreaterThanOrEqual(0.07)
    const lo = luma(L.transform('dream', {}, 0.4, 0.4, 0.4))
    const hi = luma(L.transform('dream', {}, 0.6, 0.6, 0.6))
    expect((hi - lo) / 0.2).toBeLessThan(1)
  })

  test('highlights carry the warm cast (R > B at white)', () => {
    const w = L.transform('dream', {}, 1, 1, 1)
    expect(w[0]).toBeGreaterThan(w[2])
  })
})

describe('VHS', () => {
  test('every output sits inside the legal-range window [14, 238]/255', () => {
    const t = built.vhs
    const s = L.lutStats(t)
    expect(s.min).toBeGreaterThanOrEqual(14 / 255)
    expect(s.max).toBeLessThanOrEqual(238 / 255)
  })

  test('reds run hot toward orange, blues go quiet', () => {
    const red = oklch(0.8, 0.1, 0.1)
    const redOut = oklch(...L.transform('vhs', {}, 0.8, 0.1, 0.1))
    expect(redOut.h).toBeGreaterThan(red.h)
    const blue = oklch(0.2, 0.35, 0.8)
    const blueOut = oklch(...L.transform('vhs', {}, 0.2, 0.35, 0.8))
    expect(blueOut.C / blue.C).toBeLessThan(0.6)
  })
})
